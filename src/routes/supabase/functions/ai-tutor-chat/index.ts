// Edge Function: ai-tutor-chat
//
// Recebe a pergunta do aluno + as últimas mensagens da conversa, monta um
// contexto com os erros recentes dele (tabela user_answers + questions) e
// chama o Gemini pra gerar a resposta do "IA Professor".
//
// Segue o mesmo padrão da função `explain-question` já existente no
// projeto: mesma chave de ambiente (GEMINI_API_KEY) e mesmo jeito de
// autenticar o usuário a partir do header Authorization.
//
// Deploy: supabase functions deploy ai-tutor-chat

import { createClient } from "jsr:@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const GEMINI_MODEL = "gemini-2.0-flash"; // ajuste aqui se explain-question usa outro modelo
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ChatHistoryItem = { role: "user" | "ai"; text: string };

type RequestBody = {
  message: string;
  history?: ChatHistoryItem[];
};

type RecentMistakeRow = {
  question_id: string;
  answered_at: string;
  questions: { discipline: string | null; subject: string | null; topic: string | null } | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY não configurada nas secrets da function.");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cliente autenticado como o próprio usuário (respeita RLS) — mesmo
    // padrão de explain-question: usa o JWT que o front manda.
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Não autenticado." }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: RequestBody = await req.json();
    const message = body.message?.trim();
    if (!message) {
      return new Response(JSON.stringify({ error: "Mensagem vazia." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const history = body.history ?? [];

    // Busca os erros recentes do aluno (últimas 48h) pra dar contexto real
    // pra IA, igual à saudação que o front mostra.
    const since = new Date();
    since.setDate(since.getDate() - 2);

    const { data: mistakeRows } = await supabase
      .from("user_answers")
      .select("question_id, answered_at, questions(discipline, subject, topic)")
      .eq("user_id", user.id)
      .eq("is_correct", false)
      .gte("answered_at", since.toISOString())
      .order("answered_at", { ascending: false })
      .limit(10)
      .returns<RecentMistakeRow[]>();

    const mistakesSummary =
      mistakeRows && mistakeRows.length > 0
        ? mistakeRows
            .filter((r) => r.questions)
            .map((r) => `- ${r.questions?.subject ?? r.questions?.discipline}: ${r.questions?.topic}`)
            .join("\n")
        : "Nenhum erro recente registrado.";

    const systemPrompt = `Você é o "IA Professor" do AprovaIA, um app de preparação para o ENEM.
Seu papel é agir como um professor particular, paciente e direto, ajudando o aluno a entender
conteúdo do ensino médio para o ENEM. Responda sempre em português do Brasil.

Contexto do aluno — questões que ele errou nas últimas 48h:
${mistakesSummary}

Use esse contexto quando fizer sentido (por exemplo, se o aluno pedir pra você explicar "isso" ou
"o que eu errei", refira-se ao conteúdo acima). Não invente erros que não estão na lista. Seja
didático, use exemplos concretos, e mantenha as respostas objetivas (evite textos enormes).`;

    const contents = [
      { role: "user", parts: [{ text: systemPrompt }] },
      { role: "model", parts: [{ text: "Entendido. Vou agir como o IA Professor do AprovaIA." }] },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: message }] },
    ];

    const geminiRes = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`Erro na chamada ao Gemini: ${errText}`);
    }

    const geminiData = await geminiRes.json();
    const reply: string | undefined = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!reply) {
      throw new Error("O Gemini não retornou nenhuma resposta.");
    }

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-tutor-chat error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
