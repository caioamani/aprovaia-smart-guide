// Edge Function: generate-study-plan
//
// Gera um cronograma de estudos com IA (Gemini), baseado no desempenho real
// do aluno (user_answers + question_subjects + subjects) E nas preferências
// de estudo dele (study_preferences: horários disponíveis, ritmo e data da
// prova), e grava em study_plans / study_sessions.
//
// Mesmo padrão das functions existentes (explain-question / ai-tutor-chat):
// mesma secret GEMINI_API_KEY, mesma autenticação via header Authorization
// (client autenticado como o usuário, respeitando RLS) e mesmo formato de
// erro ({ error: string }).
//
// Deploy no SEU projeto Supabase:
//   copie esta pasta para supabase/functions/generate-study-plan/
//   e rode: supabase functions deploy generate-study-plan

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const GEMINI_MODEL = "gemini-3.1-flash-lite";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const DEFAULT_PLAN_DAYS = 30;
const MIN_PLAN_DAYS = 3;
const MAX_PLAN_DAYS = 30;

const WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type Pace = "leve" | "moderado" | "intenso";

const PACE_CONFIG: Record<Pace, { sessionsPerDay: number; minDuration: number; maxDuration: number }> = {
  leve: { sessionsPerDay: 1, minDuration: 30, maxDuration: 60 },
  moderado: { sessionsPerDay: 2, minDuration: 30, maxDuration: 75 },
  intenso: { sessionsPerDay: 3, minDuration: 30, maxDuration: 90 },
};

type SubjectRow = { id: string; name: string; slug: string; discipline: string };

type AnswerRow = { question_id: string; is_correct: boolean; answered_at: string };

type AvailabilitySlot = { day: number; start: string; end: string };

type StudyPreferencesRow = {
  availability: AvailabilitySlot[] | null;
  exam_date: string | null;
  pace: Pace | null;
};

type AiSession = {
  day: number;
  subject_slug: string;
  scheduled_time: string;
  duration_minutes: number;
  objective: string;
  kind: string;
  content: string[];
};

type StudyDay = {
  offset: number;
  date: string;
  weekdayLabel: string;
  slotStart: string;
  slotEnd: string;
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Duas sessões se sobrepõem se um intervalo começa antes do outro terminar. */
function intervalsOverlap(
  aStart: number,
  aDuration: number,
  bStart: number,
  bDuration: number,
): boolean {
  const aEnd = aStart + aDuration;
  const bEnd = bStart + bDuration;
  return aStart < bEnd && bStart < aEnd;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

// 0 = segunda ... 6 = domingo (mesma convenção usada no front-end)
function weekdayIndexMonday0(date: Date): number {
  return (date.getDay() + 6) % 7;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada nas secrets da function.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return json({ error: "Não autenticado." }, 401);

    // ------------------------------------------------------------------
    // 1) Matérias disponíveis (slugs válidos)
    // ------------------------------------------------------------------
    const { data: subjects, error: subjectsError } = await supabase
      .from("subjects")
      .select("id, name, slug, discipline")
      .returns<SubjectRow[]>();

    if (subjectsError) throw new Error(`Erro ao buscar matérias: ${subjectsError.message}`);
    if (!subjects || subjects.length === 0) {
      return json({ error: "Nenhuma matéria cadastrada no banco." }, 500);
    }

    const subjectBySlug = new Map(subjects.map((s) => [s.slug, s]));

    // ------------------------------------------------------------------
    // 2) Preferências de estudo (horários, ritmo, data da prova)
    // ------------------------------------------------------------------
    let preferences: StudyPreferencesRow | null = null;
    try {
      const { data: prefsData, error: prefsError } = await supabase
        .from("study_preferences")
        .select("availability, exam_date, pace")
        .eq("user_id", user.id)
        .maybeSingle();
      if (prefsError) {
        console.error("Erro ao buscar study_preferences:", JSON.stringify(prefsError));
      } else {
        preferences = prefsData as StudyPreferencesRow | null;
      }
    } catch (e) {
      // Tabela pode não existir ainda em ambientes que não rodaram a
      // migração — nesse caso seguimos com o comportamento antigo (sem
      // restrição de horário/ritmo), em vez de derrubar a geração inteira.
      console.error("study_preferences indisponível:", e);
    }

    const pace: Pace =
      preferences?.pace && preferences.pace in PACE_CONFIG ? preferences.pace : "moderado";
    const paceCfg = PACE_CONFIG[pace];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let planDays = DEFAULT_PLAN_DAYS;
    let examNote = "";
    if (preferences?.exam_date) {
      const examDate = new Date(`${preferences.exam_date}T00:00:00`);
      const diffDays = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        planDays = Math.min(MAX_PLAN_DAYS, Math.max(MIN_PLAN_DAYS, diffDays));
        examNote = `A prova do aluno é em ${diffDays} dia(s) (${preferences.exam_date}). ${
          diffDays <= 14
            ? "A prova está próxima: priorize revisão dos pontos fracos e inclua simulados com mais frequência."
            : "Distribua teoria e prática de forma equilibrada, com revisões espaçadas ao longo do período."
        }`;
      } else {
        examNote = "A data de prova informada já passou — ignore-a e monte um plano padrão.";
      }
    }

    // Availability: um horário por dia da semana (0=segunda...6=domingo).
    // Se o aluno não configurou nada, mantemos o comportamento antigo:
    // todos os dias são candidatos e o horário é livre (fallback 19h–21h
    // só como sugestão pro Gemini, sem clamp rígido na validação).
    const availabilityMap = new Map<number, { start: string; end: string }>();
    for (const slot of preferences?.availability ?? []) {
      if (!availabilityMap.has(slot.day)) {
        availabilityMap.set(slot.day, { start: slot.start, end: slot.end });
      }
    }
    const hasAvailability = availabilityMap.size > 0;

    const studyDays: StudyDay[] = [];
    for (let offset = 1; offset <= planDays; offset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + offset);
      const weekday = weekdayIndexMonday0(date);

      if (hasAvailability) {
        const slot = availabilityMap.get(weekday);
        if (!slot) continue; // aluno não estuda nesse dia da semana
        studyDays.push({
          offset,
          date: addDays(today, offset),
          weekdayLabel: WEEKDAY_LABELS[weekday],
          slotStart: slot.start,
          slotEnd: slot.end,
        });
      } else {
        studyDays.push({
          offset,
          date: addDays(today, offset),
          weekdayLabel: WEEKDAY_LABELS[weekday],
          slotStart: "19:00",
          slotEnd: "21:00",
        });
      }
    }

    if (studyDays.length === 0) {
      return json(
        {
          error:
            "Você não marcou nenhum horário disponível em Preferências de estudo. Configure ao menos um dia antes de gerar o cronograma.",
        },
        400,
      );
    }

    // ------------------------------------------------------------------
    // 3) Desempenho real do aluno (última tentativa por questão)
    // ------------------------------------------------------------------
    const { data: answers, error: answersError } = await supabase
      .from("user_answers")
      .select("question_id, is_correct, answered_at")
      .eq("user_id", user.id)
      .order("answered_at", { ascending: false })
      .returns<AnswerRow[]>();

    if (answersError) {
      console.error("Erro ao buscar respostas:", JSON.stringify(answersError));
    }

    // Veio do mais recente pro mais antigo: a primeira ocorrência de cada
    // question_id já é a última tentativa.
    const lastAttempt = new Map<string, boolean>();
    for (const row of answers ?? []) {
      if (!lastAttempt.has(row.question_id)) lastAttempt.set(row.question_id, row.is_correct);
    }

    let performanceSummary = "";
    if (lastAttempt.size === 0) {
      performanceSummary =
        "O aluno ainda não respondeu nenhuma questão. Não há ponto fraco identificado: monte um plano equilibrado, cobrindo todas as matérias de forma parecida.";
    } else {
      const questionIds = [...lastAttempt.keys()];
      const stats = new Map<string, { total: number; correct: number }>();

      const CHUNK = 200;
      for (let i = 0; i < questionIds.length; i += CHUNK) {
        const chunk = questionIds.slice(i, i + CHUNK);
        const { data: links, error: linksError } = await supabase
          .from("question_subjects")
          .select("question_id, subjects(slug)")
          .in("question_id", chunk)
          .returns<{ question_id: string; subjects: { slug: string } | null }[]>();

        if (linksError) {
          console.error("Erro ao buscar question_subjects:", JSON.stringify(linksError));
          continue;
        }

        for (const link of links ?? []) {
          const slug = link.subjects?.slug;
          if (!slug) continue;
          const isCorrect = lastAttempt.get(link.question_id);
          if (isCorrect === undefined) continue;
          const acc = stats.get(slug) ?? { total: 0, correct: 0 };
          acc.total += 1;
          if (isCorrect) acc.correct += 1;
          stats.set(slug, acc);
        }
      }

      if (stats.size === 0) {
        performanceSummary =
          "O aluno respondeu questões, mas elas ainda não estão classificadas por matéria. Monte um plano equilibrado, cobrindo todas as matérias de forma parecida.";
      } else {
        const lines = [...stats.entries()]
          .map(([slug, s]) => ({
            name: subjectBySlug.get(slug)?.name ?? slug,
            slug,
            total: s.total,
            pct: Math.round((s.correct / s.total) * 100),
          }))
          .sort((a, b) => a.pct - b.pct)
          .map((s) => `- ${s.name} (${s.slug}): ${s.pct}% de acerto em ${s.total} questões`);

        performanceSummary = `Desempenho do aluno por matéria (do pior para o melhor — priorize as primeiras da lista, que são onde ele mais erra):\n${lines.join("\n")}\n\nMatérias que não aparecem acima ainda não foram praticadas: inclua um mínimo delas também.`;
      }
    }

    // ------------------------------------------------------------------
    // 4) Prompt + Gemini (JSON puro)
    // ------------------------------------------------------------------
    const slugList = subjects
      .map((s) => `- ${s.slug} (${s.name}, área: ${s.discipline})`)
      .join("\n");

    const daysList = studyDays
      .map(
        (d) =>
          `- day=${d.offset} (${d.weekdayLabel}, ${d.date}): estudar entre ${d.slotStart} e ${d.slotEnd}`,
      )
      .join("\n");

    const prompt = `Você é um planejador de estudos especialista no ENEM. Monte um cronograma para um aluno brasileiro, usando SOMENTE os dias e horários abaixo — não invente outros dias.

${performanceSummary}

${examNote}

Ritmo escolhido pelo aluno: ${pace}. Isso significa até ${paceCfg.sessionsPerDay} sessão(ões) por dia de estudo, com duração entre ${paceCfg.minDuration} e ${paceCfg.maxDuration} minutos cada, sempre dentro da janela de horário do dia.

Dias e horários disponíveis para estudo (o campo "day" deve ser EXATAMENTE um destes números, e "scheduled_time" deve cair dentro da janela indicada):
${daysList}

Matérias válidas (use EXATAMENTE um destes slugs no campo subject_slug, nunca invente outro):
${slugList}

Regras obrigatórias:
- Dê mais sessões para as matérias com pior desempenho (topo da lista de desempenho), mas cubra as 4 áreas do ENEM ao longo do período. Nenhuma área deve ficar totalmente de fora.
- No máximo ${paceCfg.sessionsPerDay} sessão(ões) por dia listado acima. Nem todo dia precisa ter o máximo.
- Dentro de um mesmo dia, as sessões NUNCA podem se sobrepor no horário — a próxima sessão só pode começar depois que a anterior termina (scheduled_time + duration_minutes).
- duration_minutes entre ${paceCfg.minDuration} e ${paceCfg.maxDuration}.
- scheduled_time no formato "HH:MM", dentro da janela de cada dia.
- kind: algo como "Teoria + exercícios", "Revisão" ou "Simulado".
- objective: uma frase curta em português do que estudar.
- content: array com 2 a 5 tópicos curtos (bullets) do que estudar naquela sessão.
- Inclua revisões espaçadas e pelo menos 1 simulado ao longo do período (2 se o período tiver mais de 20 dias).

Responda SOMENTE com JSON puro no formato:
{"sessions":[{"day":1,"subject_slug":"matematica","scheduled_time":"19:00","duration_minutes":60,"objective":"...","kind":"...","content":["...","..."]}]}`;

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json",
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Erro na chamada ao Gemini: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const raw: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!raw) throw new Error("O Gemini não retornou nenhuma resposta.");

    let parsed: { sessions?: AiSession[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Resposta não-JSON do Gemini:", raw.slice(0, 500));
      return json(
        { error: "Gemini não conseguiu gerar um cronograma válido, tente novamente." },
        502,
      );
    }

    // ------------------------------------------------------------------
    // 5) Validação — só aceita dias/horários dentro do que o aluno liberou
    // ------------------------------------------------------------------
    const dayInfo = new Map(studyDays.map((d) => [d.offset, d]));
    const perDay = new Map<number, number>();
    const acceptedByDay = new Map<number, { start: number; duration: number }[]>();
    const valid: (AiSession & { subject_id: string; order_index: number })[] = [];

    for (const s of parsed.sessions ?? []) {
      const day = Number(s?.day);
      const info = dayInfo.get(day);
      if (!info) continue; // dia fora da disponibilidade do aluno

      const subject = subjectBySlug.get(String(s?.subject_slug));
      if (!subject) continue;

      const used = perDay.get(day) ?? 0;
      if (used >= paceCfg.sessionsPerDay) continue;

      const duration = Math.min(
        paceCfg.maxDuration,
        Math.max(paceCfg.minDuration, Number(s?.duration_minutes) || paceCfg.minDuration),
      );

      let time = /^\d{2}:\d{2}$/.test(String(s?.scheduled_time))
        ? String(s.scheduled_time)
        : info.slotStart;
      // Só força o horário pra dentro da janela quando o aluno de fato
      // configurou disponibilidade real (senão a janela é só sugestão).
      if (hasAvailability && (time < info.slotStart || time >= info.slotEnd)) {
        time = info.slotStart;
      }

      // Nunca aceita duas sessões com horário sobreposto no mesmo dia —
      // se a IA sugeriu um horário que esbarra em outra sessão já aceita
      // pra esse dia, descarta essa sessão em vez de ajustar o horário
      // (ajustar poderia empurrar pra fora da janela de disponibilidade).
      const startMin = toMinutes(time);
      const dayAccepted = acceptedByDay.get(day) ?? [];
      const overlaps = dayAccepted.some((a) =>
        intervalsOverlap(startMin, duration, a.start, a.duration),
      );
      if (overlaps) continue;

      const objective = String(s?.objective ?? "").trim();
      const kind = String(s?.kind ?? "").trim() || "Teoria + exercícios";
      const content = Array.isArray(s?.content)
        ? s.content.filter((c) => typeof c === "string" && c.trim()).slice(0, 5)
        : [];

      if (!objective || content.length < 2) continue;

      perDay.set(day, used + 1);
      dayAccepted.push({ start: startMin, duration });
      acceptedByDay.set(day, dayAccepted);
      valid.push({
        day,
        subject_slug: subject.slug,
        subject_id: subject.id,
        scheduled_time: time,
        duration_minutes: duration,
        objective,
        kind,
        content,
        order_index: used,
      });
    }

    const minValidSessions = Math.max(3, Math.min(10, studyDays.length));
    if (valid.length < minValidSessions) {
      return json(
        { error: "Gemini não conseguiu gerar um cronograma válido, tente novamente." },
        502,
      );
    }

    // ------------------------------------------------------------------
    // 6) Gravação (RLS do próprio usuário)
    // ------------------------------------------------------------------
    const { data: existingPlans, error: existingError } = await supabase
      .from("study_plans")
      .select("id, status")
      .eq("user_id", user.id)
      .returns<{ id: string; status: string }[]>();

    if (existingError) throw new Error(`Erro ao buscar planos: ${existingError.message}`);

    const hadPrevious = (existingPlans ?? []).length > 0;

    if ((existingPlans ?? []).some((p) => p.status === "active")) {
      const { error: archiveError } = await supabase
        .from("study_plans")
        .update({ status: "archived" })
        .eq("user_id", user.id)
        .eq("status", "active");
      if (archiveError) throw new Error(`Erro ao arquivar plano: ${archiveError.message}`);
    }

    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        status: "active",
        generation_source: hadPrevious ? "ai_regenerated" : "ai_initial",
        valid_from: addDays(today, 0),
        valid_until: addDays(today, planDays),
      })
      .select("id")
      .single<{ id: string }>();

    if (planError || !plan) {
      throw new Error(`Erro ao criar plano: ${planError?.message ?? "sem retorno"}`);
    }

    const rows = valid.map((s) => ({
      plan_id: plan.id,
      user_id: user.id,
      subject_id: s.subject_id,
      scheduled_date: addDays(today, s.day),
      scheduled_time: s.scheduled_time,
      duration_minutes: s.duration_minutes,
      objective: s.objective,
      kind: s.kind,
      content: s.content,
      status: "todo",
      order_index: s.order_index,
    }));

    const { error: sessionsError } = await supabase.from("study_sessions").insert(rows);
    if (sessionsError) throw new Error(`Erro ao gravar sessões: ${sessionsError.message}`);

    return json({ planId: plan.id, sessionsCreated: rows.length });
  } catch (err) {
    console.error("generate-study-plan falhou:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return json({ error: message }, 500);
  }
});
