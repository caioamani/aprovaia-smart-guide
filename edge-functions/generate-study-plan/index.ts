// Edge Function: generate-study-plan
//
// Gera o cronograma de estudos de UMA SEMANA com IA (Gemini), baseado no
// desempenho real do aluno (user_answers + question_subjects + subjects) e
// nas preferências de estudo (study_preferences: horários, ritmo, data da
// prova), e grava em study_plans / study_sessions.
//
// Mudanças importantes desta versão:
// - Gera apenas a semana pedida pelo front-end (body { weekStart: "YYYY-MM-DD" }),
//   para a IA conseguir focar em 7 dias em vez de 30.
// - Os HORÁRIOS não são mais inventados pela IA: a function fatia a janela
//   de disponibilidade de cada dia em blocos e entrega os blocos prontos.
//   Assim, se o aluno marcou 14:00–18:00, a janela inteira é ocupada e
//   nunca sobra "uma matéria só no dia".
// - A IA só decide QUAL matéria/objetivo/conteúdo entra em cada bloco.
//   Blocos que a IA deixar vazios são preenchidos deterministicamente com
//   as matérias de pior desempenho.
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

const WEEKDAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type Pace = "leve" | "moderado" | "intenso";

// preferredDuration = tamanho "ideal" de um bloco de estudo nesse ritmo.
// breakMinutes = intervalo entre blocos no mesmo dia.
// maxSessionsPerDay = teto de segurança, mesmo em janelas muito longas.
const PACE_CONFIG: Record<
  Pace,
  {
    preferredDuration: number;
    minDuration: number;
    maxDuration: number;
    breakMinutes: number;
    maxSessionsPerDay: number;
  }
> = {
  leve: {
    preferredDuration: 50,
    minDuration: 30,
    maxDuration: 70,
    breakMinutes: 15,
    maxSessionsPerDay: 3,
  },
  moderado: {
    preferredDuration: 60,
    minDuration: 30,
    maxDuration: 80,
    breakMinutes: 10,
    maxSessionsPerDay: 5,
  },
  intenso: {
    preferredDuration: 70,
    minDuration: 35,
    maxDuration: 90,
    breakMinutes: 10,
    maxSessionsPerDay: 6,
  },
};

type SubjectRow = { id: string; name: string; slug: string; discipline: string };

type AnswerRow = { question_id: string; is_correct: boolean; answered_at: string };

type AvailabilitySlot = { day: number; start: string; end: string };

type StudyPreferencesRow = {
  availability: AvailabilitySlot[] | null;
  exam_date: string | null;
  pace: Pace | null;
};

type Slot = {
  slotId: string;
  date: string;
  weekdayLabel: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  durationMinutes: number;
  orderIndex: number;
};

type AiSession = {
  slot_id: string;
  subject_slug: string;
  objective: string;
  kind: string;
  content: string[];
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
}

function fromMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

function parseISODate(s: string): Date {
  const d = new Date(`${s}T00:00:00`);
  d.setHours(0, 0, 0, 0);
  return d;
}

// 0 = segunda ... 6 = domingo (mesma convenção usada no front-end)
function weekdayIndexMonday0(date: Date): number {
  return (date.getDay() + 6) % 7;
}

function mondayOf(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - weekdayIndexMonday0(d));
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Fatia a janela [start, end] do dia em blocos de estudo que ocupam a
 * janela inteira, respeitando o ritmo escolhido. Ex.: 14:00–18:00 no ritmo
 * moderado (bloco ideal 60min + 10min de intervalo) vira 3 blocos de ~73min
 * — cobrindo até as 18:00, em vez de parar às 16:00.
 */
function buildDaySlots(
  date: string,
  weekdayLabel: string,
  start: string,
  end: string,
  cfg: (typeof PACE_CONFIG)[Pace],
): Slot[] {
  const startMin = toMinutes(start);
  const endMin = toMinutes(end);
  const window = endMin - startMin;
  if (window < cfg.minDuration) return [];

  // Número de blocos que melhor preenche a janela com o tamanho ideal.
  let count = Math.round((window + cfg.breakMinutes) / (cfg.preferredDuration + cfg.breakMinutes));
  count = Math.max(1, Math.min(cfg.maxSessionsPerDay, count));

  // Garante que os blocos não fiquem menores que o mínimo nem maiores que
  // o máximo permitidos pelo ritmo.
  while (count > 1) {
    const dur = Math.floor((window - (count - 1) * cfg.breakMinutes) / count);
    if (dur >= cfg.minDuration) break;
    count -= 1;
  }
  while (
    Math.floor((window - (count - 1) * cfg.breakMinutes) / count) > cfg.maxDuration &&
    count < cfg.maxSessionsPerDay
  ) {
    count += 1;
  }

  const duration = Math.min(
    cfg.maxDuration,
    Math.max(cfg.minDuration, Math.floor((window - (count - 1) * cfg.breakMinutes) / count)),
  );

  const slots: Slot[] = [];
  let cursor = startMin;
  for (let i = 0; i < count; i++) {
    if (cursor + duration > endMin + 1) break;
    slots.push({
      slotId: `${date}#${i}`,
      date,
      weekdayLabel,
      start: fromMinutes(cursor),
      end: fromMinutes(cursor + duration),
      durationMinutes: duration,
      orderIndex: i,
    });
    cursor += duration + cfg.breakMinutes;
  }
  return slots;
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
    // 0) Semana pedida pelo front-end
    // ------------------------------------------------------------------
    let requestedWeekStart: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.weekStart === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.weekStart)) {
        requestedWeekStart = body.weekStart;
      }
    } catch {
      // sem body -> semana atual
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekStart = mondayOf(requestedWeekStart ? parseISODate(requestedWeekStart) : today);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

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
      console.error("study_preferences indisponível:", e);
    }

    const pace: Pace =
      preferences?.pace && preferences.pace in PACE_CONFIG ? preferences.pace : "moderado";
    const paceCfg = PACE_CONFIG[pace];

    let examNote = "";
    if (preferences?.exam_date) {
      const examDate = parseISODate(preferences.exam_date);
      const diffDays = Math.floor((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) {
        examNote = `A prova do aluno é em ${diffDays} dia(s) (${preferences.exam_date}). ${
          diffDays <= 14
            ? "A prova está próxima: priorize revisão dos pontos fracos e inclua simulados."
            : "Equilibre teoria, prática e revisões espaçadas."
        }`;
      }
    }

    // Availability: um horário por dia da semana (0=segunda...6=domingo).
    const availabilityMap = new Map<number, { start: string; end: string }>();
    for (const slot of preferences?.availability ?? []) {
      if (!availabilityMap.has(slot.day)) {
        availabilityMap.set(slot.day, { start: slot.start, end: slot.end });
      }
    }
    const hasAvailability = availabilityMap.size > 0;

    // ------------------------------------------------------------------
    // 3) Blocos de estudo da semana (horários já fatiados aqui)
    // ------------------------------------------------------------------
    const slots: Slot[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      if (date.getTime() < today.getTime()) continue; // não agenda no passado

      const weekday = weekdayIndexMonday0(date);
      const window = hasAvailability
        ? availabilityMap.get(weekday)
        : { start: "19:00", end: "21:00" };
      if (!window) continue; // aluno não estuda nesse dia

      slots.push(
        ...buildDaySlots(isoDate(date), WEEKDAY_LABELS[weekday], window.start, window.end, paceCfg),
      );
    }

    if (slots.length === 0) {
      return json(
        {
          error: hasAvailability
            ? "Não há dias disponíveis nessa semana (verifique seus horários em Preferências de estudo, ou escolha uma semana futura)."
            : "Você não marcou nenhum horário disponível em Preferências de estudo. Configure ao menos um dia antes de gerar o cronograma.",
        },
        400,
      );
    }

    // ------------------------------------------------------------------
    // 4) Desempenho real do aluno (última tentativa por questão)
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

    const lastAttempt = new Map<string, boolean>();
    for (const row of answers ?? []) {
      if (!lastAttempt.has(row.question_id)) lastAttempt.set(row.question_id, row.is_correct);
    }

    let performanceSummary = "";
    // Ordem de prioridade das matérias — usada tanto no prompt quanto no
    // preenchimento automático de blocos que a IA deixar vazios.
    let prioritySlugs: string[] = subjects.map((s) => s.slug);

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
        const ranked = [...stats.entries()]
          .map(([slug, s]) => ({
            name: subjectBySlug.get(slug)?.name ?? slug,
            slug,
            total: s.total,
            pct: Math.round((s.correct / s.total) * 100),
          }))
          .sort((a, b) => a.pct - b.pct);

        prioritySlugs = [
          ...ranked.map((r) => r.slug),
          ...subjects.map((s) => s.slug).filter((slug) => !stats.has(slug)),
        ];

        performanceSummary = `Desempenho do aluno por matéria (do pior para o melhor — priorize as primeiras da lista, que são onde ele mais erra):\n${ranked
          .map((s) => `- ${s.name} (${s.slug}): ${s.pct}% de acerto em ${s.total} questões`)
          .join(
            "\n",
          )}\n\nMatérias que não aparecem acima ainda não foram praticadas: inclua um mínimo delas também.`;
      }
    }

    // ------------------------------------------------------------------
    // 5) Prompt + Gemini (só escolhe matéria/objetivo/conteúdo por bloco)
    // ------------------------------------------------------------------
    const slugList = subjects
      .map((s) => `- ${s.slug} (${s.name}, área: ${s.discipline})`)
      .join("\n");

    const slotsList = slots
      .map(
        (s) =>
          `- slot_id="${s.slotId}" (${s.weekdayLabel} ${s.date}, ${s.start}–${s.end}, ${s.durationMinutes} min)`,
      )
      .join("\n");

    const weekLabel = `${isoDate(weekStart)} a ${isoDate(weekEnd)}`;

    const prompt = `Você é um planejador de estudos especialista no ENEM. Monte o cronograma de UMA semana (${weekLabel}) para um aluno brasileiro.

${performanceSummary}

${examNote}

Ritmo escolhido pelo aluno: ${pace}.

Os horários JÁ ESTÃO DEFINIDOS. Existem exatamente ${slots.length} blocos de estudo nesta semana e você deve preencher TODOS eles, um objeto por slot_id, sem repetir nem inventar slot_id:
${slotsList}

Matérias válidas (use EXATAMENTE um destes slugs no campo subject_slug, nunca invente outro):
${slugList}

Regras obrigatórias:
- Retorne exatamente ${slots.length} sessões, uma para cada slot_id acima.
- Dê mais blocos para as matérias com pior desempenho, mas cubra as 4 áreas do ENEM ao longo da semana. Nenhuma área deve ficar totalmente de fora.
- Em um mesmo dia, NÃO repita a mesma matéria em blocos seguidos: varie as matérias dentro do dia (ex.: manhã Matemática, depois Biologia, depois Redação/revisão).
- kind: "Teoria + exercícios", "Revisão" ou "Simulado".
- objective: uma frase curta em português do que estudar naquele bloco.
- content: array com 2 a 5 tópicos curtos (bullets) daquele bloco.
- Inclua pelo menos 1 revisão e 1 simulado na semana.

Responda SOMENTE com JSON puro no formato:
{"sessions":[{"slot_id":"${slots[0].slotId}","subject_slug":"matematica","objective":"...","kind":"...","content":["...","..."]}]}`;

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
    // 6) Casamento IA -> blocos + preenchimento dos blocos que sobraram
    // ------------------------------------------------------------------
    type Filled = {
      slot: Slot;
      subject_id: string;
      subject_slug: string;
      objective: string;
      kind: string;
      content: string[];
    };

    const bySlotId = new Map<string, Slot>(slots.map((s) => [s.slotId, s]));
    const filled = new Map<string, Filled>();

    for (const s of parsed.sessions ?? []) {
      const slot = bySlotId.get(String(s?.slot_id));
      if (!slot || filled.has(slot.slotId)) continue;

      const subject = subjectBySlug.get(String(s?.subject_slug));
      if (!subject) continue;

      const objective = String(s?.objective ?? "").trim();
      const content = Array.isArray(s?.content)
        ? s.content.filter((c) => typeof c === "string" && c.trim()).slice(0, 5)
        : [];
      if (!objective || content.length < 2) continue;

      filled.set(slot.slotId, {
        slot,
        subject_id: subject.id,
        subject_slug: subject.slug,
        objective,
        kind: String(s?.kind ?? "").trim() || "Teoria + exercícios",
        content,
      });
    }

    if (filled.size === 0) {
      return json(
        { error: "Gemini não conseguiu gerar um cronograma válido, tente novamente." },
        502,
      );
    }

    // Blocos vazios são preenchidos com as matérias prioritárias, evitando
    // repetir a mesma matéria em sequência no mesmo dia. Assim a janela do
    // aluno nunca fica com buracos.
    let priorityCursor = 0;
    for (const slot of slots) {
      if (filled.has(slot.slotId)) continue;

      const sameDay = slots
        .filter((s) => s.date === slot.date && filled.has(s.slotId))
        .map((s) => filled.get(s.slotId)!.subject_slug);

      let chosen = subjectBySlug.get(prioritySlugs[priorityCursor % prioritySlugs.length]);
      for (let i = 0; i < prioritySlugs.length; i++) {
        const candidate = subjectBySlug.get(
          prioritySlugs[(priorityCursor + i) % prioritySlugs.length],
        );
        if (candidate && !sameDay.includes(candidate.slug)) {
          chosen = candidate;
          priorityCursor += i + 1;
          break;
        }
      }
      if (!chosen) continue;

      filled.set(slot.slotId, {
        slot,
        subject_id: chosen.id,
        subject_slug: chosen.slug,
        objective: `Estudo dirigido de ${chosen.name}: teoria essencial + exercícios do ENEM.`,
        kind: "Teoria + exercícios",
        content: [
          `Revisar os conceitos-chave de ${chosen.name}`,
          "Resolver questões do ENEM sobre o tema",
          "Anotar erros e dúvidas para revisão",
        ],
      });
    }

    const finalSessions = slots
      .map((s) => filled.get(s.slotId))
      .filter((f): f is Filled => Boolean(f));

    // ------------------------------------------------------------------
    // 7) Gravação — substitui apenas as sessões DESSA semana
    // ------------------------------------------------------------------
    const weekStartISO = isoDate(weekStart);
    const weekEndISO = isoDate(weekEnd);

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

    // Limpa o que já existia nessa semana (evita cronograma duplicado ao
    // regerar a mesma semana). Semanas passadas/futuras ficam intactas.
    const { error: deleteError } = await supabase
      .from("study_sessions")
      .delete()
      .eq("user_id", user.id)
      .gte("scheduled_date", weekStartISO)
      .lte("scheduled_date", weekEndISO);
    if (deleteError) throw new Error(`Erro ao limpar a semana: ${deleteError.message}`);

    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        status: "active",
        generation_source: hadPrevious ? "ai_regenerated" : "ai_initial",
        valid_from: weekStartISO,
        valid_until: weekEndISO,
      })
      .select("id")
      .single<{ id: string }>();

    if (planError || !plan) {
      throw new Error(`Erro ao criar plano: ${planError?.message ?? "sem retorno"}`);
    }

    const rows = finalSessions.map((s) => ({
      plan_id: plan.id,
      user_id: user.id,
      subject_id: s.subject_id,
      scheduled_date: s.slot.date,
      scheduled_time: s.slot.start,
      duration_minutes: s.slot.durationMinutes,
      objective: s.objective,
      kind: s.kind,
      content: s.content,
      status: "todo",
      order_index: s.slot.orderIndex,
    }));

    const { error: sessionsError } = await supabase.from("study_sessions").insert(rows);
    if (sessionsError) throw new Error(`Erro ao gravar sessões: ${sessionsError.message}`);

    return json({
      planId: plan.id,
      sessionsCreated: rows.length,
      weekStart: weekStartISO,
      weekEnd: weekEndISO,
    });
  } catch (err) {
    console.error("generate-study-plan falhou:", err);
    const message = err instanceof Error ? err.message : "Erro inesperado.";
    return json({ error: message }, 500);
  }
});
