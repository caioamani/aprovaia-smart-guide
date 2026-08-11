// Edge Function: generate-study-plan
//
// Gera um cronograma de estudos de 30 dias com IA (Gemini), baseado no
// desempenho real do aluno (user_answers + question_subjects + subjects),
// e grava em study_plans / study_sessions.
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

const PLAN_DAYS = 30;
const MIN_VALID_SESSIONS = 10;
const MAX_SESSIONS_PER_DAY = 2;

type SubjectRow = { id: string; name: string; slug: string; discipline: string };

type AnswerRow = { question_id: string; is_correct: boolean; answered_at: string };

type AiSession = {
  day: number;
  subject_slug: string;
  scheduled_time: string;
  duration_minutes: number;
  objective: string;
  kind: string;
  content: string[];
};

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
    // 2) Desempenho real do aluno (última tentativa por questão)
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

        performanceSummary = `Desempenho do aluno por matéria (do pior para o melhor):\n${lines.join("\n")}\n\nMatérias que não aparecem acima ainda não foram praticadas: inclua um mínimo delas também.`;
      }
    }

    // ------------------------------------------------------------------
    // 3) Prompt + Gemini (JSON puro)
    // ------------------------------------------------------------------
    const slugList = subjects
      .map((s) => `- ${s.slug} (${s.name}, área: ${s.discipline})`)
      .join("\n");

    const prompt = `Você é um planejador de estudos especialista no ENEM. Monte um cronograma de ${PLAN_DAYS} dias para um aluno brasileiro.

${performanceSummary}

Matérias válidas (use EXATAMENTE um destes slugs no campo subject_slug, nunca invente outro):
${slugList}

Regras obrigatórias:
- Dê mais sessões para as matérias com pior desempenho, mas cubra as 4 áreas do ENEM ao longo dos 30 dias. Nenhuma área deve ficar totalmente de fora.
- No máximo ${MAX_SESSIONS_PER_DAY} sessões por dia.
- day é um inteiro de 1 a ${PLAN_DAYS}.
- duration_minutes entre 30 e 90.
- scheduled_time no formato "HH:MM" (ex: "19:00").
- kind: algo como "Teoria + exercícios", "Revisão" ou "Simulado".
- objective: uma frase curta em português do que estudar.
- content: array com 2 a 5 tópicos curtos (bullets) do que estudar naquela sessão.
- Inclua revisões espaçadas e pelo menos 2 simulados ao longo do mês.

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
    // 4) Validação
    // ------------------------------------------------------------------
    const perDay = new Map<number, number>();
    const valid: (AiSession & { subject_id: string; order_index: number })[] = [];

    for (const s of parsed.sessions ?? []) {
      const day = Number(s?.day);
      if (!Number.isInteger(day) || day < 1 || day > PLAN_DAYS) continue;

      const subject = subjectBySlug.get(String(s?.subject_slug));
      if (!subject) continue;

      const used = perDay.get(day) ?? 0;
      if (used >= MAX_SESSIONS_PER_DAY) continue;

      const duration = Math.min(90, Math.max(30, Number(s?.duration_minutes) || 60));
      const time = /^\d{2}:\d{2}$/.test(String(s?.scheduled_time))
        ? String(s.scheduled_time)
        : "19:00";
      const objective = String(s?.objective ?? "").trim();
      const kind = String(s?.kind ?? "").trim() || "Teoria + exercícios";
      const content = Array.isArray(s?.content)
        ? s.content.filter((c) => typeof c === "string" && c.trim()).slice(0, 5)
        : [];

      if (!objective || content.length < 2) continue;

      perDay.set(day, used + 1);
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

    if (valid.length < MIN_VALID_SESSIONS) {
      return json(
        { error: "Gemini não conseguiu gerar um cronograma válido, tente novamente." },
        502,
      );
    }

    // ------------------------------------------------------------------
    // 5) Gravação (RLS do próprio usuário)
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

    const today = new Date();
    const { data: plan, error: planError } = await supabase
      .from("study_plans")
      .insert({
        user_id: user.id,
        status: "active",
        generation_source: hadPrevious ? "ai_regenerated" : "ai_initial",
        valid_from: addDays(today, 0),
        valid_until: addDays(today, PLAN_DAYS),
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
