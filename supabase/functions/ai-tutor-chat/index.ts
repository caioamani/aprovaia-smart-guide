// Edge Function: ai-tutor-chat
//
// Recebe a pergunta do aluno + as últimas mensagens da conversa, monta um
// contexto com os erros recentes dele (tabela user_answers + questions) e
// chama o Gemini pra gerar a resposta da "Elo IA".
//
// Segue o mesmo padrão da função `explain-question` já existente no
// projeto: mesma chave de ambiente (GEMINI_API_KEY) e mesmo jeito de
// autenticar o usuário a partir do header Authorization.
//
// Deploy: supabase functions deploy ai-tutor-chat

import { createClient } from "jsr:@supabase/supabase-js@2";

// Usa o AI Gateway da Lovable (não depende de quota da conta Google).
// Configure a secret LOVABLE_API_KEY nas Edge Function secrets do Supabase.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const AI_MODEL = "google/gemini-3.6-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

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
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada nas secrets da function.");
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

    const systemPrompt = `Você é a Elo IA, a professora particular do AprovaIA, um app de preparação para o ENEM.
Quando fizer sentido se apresentar, diga "Eu sou a Elo IA". Nunca use o nome "IA Professor".
Sua personalidade: simpática, inteligente, calma e acolhedora, sempre incentivando o aluno a
estudar. Você é especialista no ENEM e explica de forma clara, objetiva e didática, com
linguagem natural. Responda sempre em português do Brasil.

Contexto do aluno — questões que ele errou nas últimas 48h:
${mistakesSummary}

Use esse contexto quando fizer sentido (por exemplo, se o aluno pedir pra você explicar "isso" ou
"o que eu errei", refira-se ao conteúdo acima). Não invente erros que não estão na lista. Seja
didático, use exemplos concretos, e mantenha as respostas objetivas (evite textos enormes).`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    const aiRes = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({ model: AI_MODEL, messages, temperature: 0.6 }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) {
        throw new Error("Muitas requisições agora. Tenta de novo em alguns segundos.");
      }
      if (aiRes.status === 402) {
        throw new Error("Créditos de IA esgotados. Adicione créditos no seu workspace Lovable.");
      }
      throw new Error(`Erro na chamada à IA: ${errText}`);
    }

    const aiData = await aiRes.json();
    const reply: string | undefined = aiData?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("A IA não retornou nenhuma resposta.");
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
