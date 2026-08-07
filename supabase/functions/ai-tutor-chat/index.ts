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

// Tudo passa pelo Lovable AI Gateway — a cota gratuita direta da API do
// Google (generativelanguage) está zerada, então chamadas diretas voltam 429.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const GATEWAY_CHAT_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GATEWAY_IMAGE_URL = "https://ai.gateway.lovable.dev/v1/images/generations";
const CHAT_MODEL = "google/gemini-3.6-flash";
const IMAGE_MODEL = "openai/gpt-image-2";


// Prefixo usado pra marcar, dentro da coluna "content" (texto simples), que
// uma mensagem é uma imagem gerada — o valor depois do prefixo é a URL
// pública no Storage, não a imagem em si. Mantém o banco leve.
const IMAGE_PREFIX = "IMG::";

// Tag que a IA usa pra sinalizar "quero gerar uma imagem" em vez de
// responder em texto — ver instrução no systemPrompt logo abaixo.
const IMAGE_TAG_REGEX = /^\s*\[IMAGEM:\s*([\s\S]+?)\]\s*$/;

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

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
  // A tabela "questions" não tem colunas "subject"/"topic" — esses nomes
  // só existem no frontend (ver mapRowToQuestion em supabase-questions.ts).
  // As colunas reais são "discipline" e "title".
  questions: { discipline: string | null; title: string | null } | null;
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

    const { data: mistakeRows, error: mistakesError } = await supabase
      .from("user_answers")
      .select("question_id, answered_at, questions(discipline, title)")
      .eq("user_id", user.id)
      .eq("is_correct", false)
      .gte("answered_at", since.toISOString())
      .order("answered_at", { ascending: false })
      .limit(10)
      .returns<RecentMistakeRow[]>();

    // Loga em vez de derrubar a resposta: se a busca de erros falhar, a IA
    // ainda responde (só sem esse contexto) — mas o motivo fica visível
    // nos logs da function em vez de virar um "nenhum erro" enganoso.
    if (mistakesError) {
      console.error("Erro ao buscar erros recentes:", JSON.stringify(mistakesError));
    }
    console.log(`Erros recentes encontrados para ${user.id}: ${mistakeRows?.length ?? 0}`);

    const mistakesSummary =
      mistakeRows && mistakeRows.length > 0
        ? mistakeRows
            .filter((r) => r.questions)
            .map((r) => `- ${r.questions?.discipline}: ${r.questions?.title}`)
            .join("\n")
        : "Nenhum erro recente registrado.";

    const systemPrompt = `Você é o "IA Professor" do AprovaIA, um app de preparação para o ENEM.
Seu papel é agir como um professor particular, paciente e direto, ajudando o aluno a entender
conteúdo do ensino médio para o ENEM. Responda sempre em português do Brasil.

Contexto do aluno — questões que ele errou nas últimas 48h:
${mistakesSummary}

Use esse contexto quando fizer sentido (por exemplo, se o aluno pedir pra você explicar "isso" ou
"o que eu errei", refira-se ao conteúdo acima). Não invente erros que não estão na lista. Seja
didático, use exemplos concretos, e mantenha as respostas objetivas (evite textos enormes).

Formatação da resposta (muito importante): escreva em texto simples, sem NENHUMA marcação
markdown. Não use **negrito**, *itálico*, títulos com # ou ###, nem linhas separadoras como ---.
Para listas, use números (1., 2., 3.) ou hífen seguido de espaço (- item), nunca asterisco. Para
fórmulas ou expressões matemáticas, escreva direto em texto comum, sem cifrão (ex: f(x) = ax + b,
nunca $f(x) = ax + b$). Se precisar destacar um termo importante, use apenas aspas ou dois-pontos,
nunca símbolos de markdown.

Geração de imagem: se o aluno pedir explicitamente algo visual — um desenho, uma ilustração, um
diagrama, "mostra uma imagem de", "gera uma imagem", "desenha", etc. — não responda em texto.
Responda SOMENTE com uma linha no formato exato: [IMAGEM: <descrição detalhada em inglês do que
desenhar, pensada para um gerador de imagens>], sem mais nada antes ou depois. Se o pedido for só
uma dúvida de conteúdo (mesmo que sobre algo visual, tipo "como funciona a fotossíntese"), responda
normalmente em texto — só use a tag [IMAGEM: ...] quando o aluno realmente quiser ver uma imagem
gerada.`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...history.map((h) => ({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      })),
      { role: "user", content: message },
    ];

    const chatRes = await fetch(GATEWAY_CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: CHAT_MODEL,
        messages,
        temperature: 0.6,
        max_tokens: 800,
      }),
    });

    if (!chatRes.ok) {
      const errText = await chatRes.text();
      throw new Error(`Erro na chamada à IA: ${errText}`);
    }

    const chatData = await chatRes.json();
    const reply: string | undefined = chatData?.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("A IA não retornou nenhuma resposta.");
    }

    // Se a IA sinalizou que quer gerar uma imagem em vez de responder em
    // texto, faz uma segunda chamada — agora pro modelo de imagem — sobe o
    // resultado pro Storage e devolve a URL pública (não o base64 direto).
    const imageMatch = reply.match(IMAGE_TAG_REGEX);
    if (imageMatch) {
      const imagePrompt = imageMatch[1].trim();
      console.log(`Gerando imagem para ${user.id}: ${imagePrompt}`);

      const imageRes = await fetch(GATEWAY_IMAGE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "fetch",
        },
        body: JSON.stringify({
          model: IMAGE_MODEL,
          prompt: imagePrompt,
          quality: "low",
        }),
      });

      if (!imageRes.ok) {
        const errText = await imageRes.text();
        throw new Error(`Erro na chamada à IA (imagem): ${errText}`);
      }

      const imageData = await imageRes.json();
      const b64: string | undefined =
        imageData?.data?.[0]?.b64_json ??
        imageData?.data?.[0]?.image_base64 ??
        undefined;

      if (!b64) {
        throw new Error("A IA não retornou nenhuma imagem.");
      }

      const mimeType = "image/png";
      const extension = "png";
      const path = `${user.id}/${crypto.randomUUID()}.${extension}`;


      // Sobe a imagem pro Storage (bucket "tutor-images") em vez de
      // devolver base64 — assim o banco só guarda a URL, bem mais leve.
      const { error: uploadError } = await supabase.storage
        .from("tutor-images")
        .upload(path, base64ToUint8Array(imagePart.inlineData.data), {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Erro ao salvar imagem no Storage: ${uploadError.message}`);
      }

      const { data: publicUrlData } = supabase.storage.from("tutor-images").getPublicUrl(path);

      // isImage: true avisa o front que essa resposta é uma imagem (URL),
      // não texto — ver isTutorImageMessage() em src/lib/ai-tutor.ts.
      return new Response(
        JSON.stringify({ reply: `${IMAGE_PREFIX}${publicUrlData.publicUrl}`, isImage: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ reply, isImage: false }), {
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
