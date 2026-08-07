import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Question, KnowledgeArea, Language } from "./mock-questions";
import { applyQuestionOverrides } from "./question-overrides";

// A tabela "questions" guarda "discipline" com os valores crus da API do
// ENEM. Aqui a gente traduz pra área usada nos filtros da interface.
const disciplineToArea: Record<string, KnowledgeArea> = {
  linguagens: "Linguagens e Códigos",
  matematica: "Matemática e suas Tecnologias",
  "ciencias-humanas": "Ciências Humanas",
  "ciencias-natureza": "Ciências da Natureza",
};

const languageMap: Record<string, Language> = {
  ingles: "Inglês",
  espanhol: "Espanhol",
};

type SupabaseAlternative = {
  letter: "A" | "B" | "C" | "D" | "E";
  text: string;
  file?: string | null;
  isCorrect?: boolean;
};

type SupabaseQuestionRow = {
  id: string;
  exam_year: number;
  index: number;
  title: string | null;
  discipline: string | null;
  language: string | null;
  // Colunas pesadas: só vêm na busca de UMA questão (tela de resolução).
  // Na listagem elas são omitidas pra reduzir drasticamente o payload.
  context?: string | null;
  files?: string[] | null;
  alternatives_introduction: string | null;
  alternatives?: SupabaseAlternative[] | null;
  correct_alternative: string | null;
};


// Um bom número de imagens da API do ENEM aponta pra esse placeholder
// genérico quando a imagem real não foi capturada — nesse caso específico
// não tem o que mostrar, então tratamos como "sem imagem".
function isBrokenImage(url: string | null | undefined): boolean {
  return !url || url.includes("broken-image.svg");
}

function realImagesOnly(urls: (string | null | undefined)[]): string[] {
  return urls.filter((u): u is string => !isBrokenImage(u));
}

// Os textos que vêm da API do ENEM às vezes trazem marcação em Markdown
// (imagens em formato markdown, **negrito**, colchetes escapados de provas
// antigas) que o site não interpreta como texto — aqui a gente limpa isso,
// já que as imagens de verdade são tratadas à parte (ver contextImages e
// alternative.image) e renderizadas como <img>, não como texto.
function cleanQuestionText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    // Negrito/itálico em markdown -> mantém só o texto, sem os asteriscos
    // nem os underscores.
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    // Colchetes escapados que sobram em algumas provas mais antigas.
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    // Várias linhas em branco seguidas (que sobram depois de remover as
    // imagens) viram só uma.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Divide o contexto cru em blocos de texto/imagem preservando a ordem
// original — assim a imagem que vem no meio do texto (ex: entre "Texto I"
// e a legenda da obra) aparece exatamente onde o enunciado colocou.
function buildContextBlocks(raw: string | null | undefined): import("./mock-questions").ContextBlock[] | undefined {
  if (!raw) return undefined;
  const blocks: import("./mock-questions").ContextBlock[] = [];
  const imgRegex = /!\[[^\]]*\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let hasImage = false;
  while ((match = imgRegex.exec(raw)) !== null) {
    const textChunk = raw.slice(lastIndex, match.index);
    const cleaned = cleanQuestionText(textChunk);
    if (cleaned) blocks.push({ type: "text", value: cleaned });
    if (!isBrokenImage(match[1])) {
      blocks.push({ type: "image", value: match[1] });
      hasImage = true;
    }
    lastIndex = match.index + match[0].length;
  }
  if (!hasImage) return undefined; // sem imagem inline: usa render antigo
  const tail = cleanQuestionText(raw.slice(lastIndex));
  if (tail) blocks.push({ type: "text", value: tail });
  return blocks;
}

function mapRowToQuestion(row: SupabaseQuestionRow): Question {
  return {
    id: row.id,
    number: row.index,
    year: row.exam_year,
    area: disciplineToArea[row.discipline ?? ""] ?? "Linguagens e Códigos",
    subject: row.discipline ?? "Geral",
    topic: cleanQuestionText(row.title),
    language: languageMap[row.language ?? ""] ?? "Português",
    context: cleanQuestionText(row.context),
    contextImages: realImagesOnly(row.files ?? []),
    contextBlocks: buildContextBlocks(row.context),
    statement: cleanQuestionText(row.alternatives_introduction ?? row.title),
    alternatives: (row.alternatives ?? []).map((a) => ({
      letter: a.letter,
      text: cleanQuestionText(a.text),
      image: realImagesOnly([a.file])[0],
    })),
    correct: (row.correct_alternative as Question["correct"]) ?? "A",
    // Vem da tabela ai_explanations — ainda não conectada nesta etapa.
    explanation: "",
    // Aqui sempre entra "unanswered" — o status real (acertou/errou) é
    // sobreposto depois, cruzando com a tabela user_answers (ver
    // useUserAnswers mais abaixo e o merge em questions-store.ts).
    status: "unanswered",
    // Feature de favoritos ainda não tem coluna/tabela própria no banco.
    favorite: false,
  };
}

const PAGE_SIZE = 1000; // limite padrão de linhas por requisição do Supabase

async function fetchQuestions(): Promise<Question[]> {
  const allRows: SupabaseQuestionRow[] = [];
  let from = 0;

  // O Supabase/PostgREST devolve no máximo 1000 linhas por chamada, então
  // buscamos em páginas até não sobrar mais nada.
  while (true) {
    const { data, error } = await supabase
      .from("questions")
      .select(
        "id, exam_year, index, title, discipline, language, context, files, alternatives_introduction, alternatives, correct_alternative",
      )
      .order("exam_year", { ascending: false })
      .order("index", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...(data as SupabaseQuestionRow[]));

    if (data.length < PAGE_SIZE) break; // última página
    from += PAGE_SIZE;
  }

  // Antes a gente excluía questões com imagem inteiras da lista; agora só
  // filtramos os links de imagem quebrados (ver isBrokenImage), então
  // todas as questões entram, com ou sem imagem de verdade.
  return allRows.map(mapRowToQuestion).map(applyQuestionOverrides);
}

export function useSupabaseQuestions() {
  return useQuery({
    queryKey: ["questions"],
    queryFn: fetchQuestions,
    staleTime: 5 * 60 * 1000, // 5 min — questões não mudam com frequência
  });
}

// ---------------------------------------------------------------------
// Respostas do usuário (tabela user_answers)
// ---------------------------------------------------------------------

// Cada resposta é um registro novo (histórico de tentativas ao longo do
// tempo, útil pra estatísticas futuras). Pra saber o status "atual" de uma
// questão, pegamos só a tentativa mais recente de cada uma.
async function fetchUserAnswers(userId: string): Promise<Map<string, boolean>> {
  const { data, error } = await supabase
    .from("user_answers")
    .select("question_id, is_correct, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: false });

  if (error) throw error;

  const latestByQuestion = new Map<string, boolean>();
  for (const row of data ?? []) {
    if (!latestByQuestion.has(row.question_id)) {
      latestByQuestion.set(row.question_id, row.is_correct);
    }
  }
  return latestByQuestion;
}

export function useUserAnswers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-answers", user?.id],
    queryFn: () => fetchUserAnswers(user!.id),
    enabled: !!user,
  });
}

type AnswerQuestionInput = {
  questionId: string;
  selectedLetter: string;
  isCorrect: boolean;
};

export function useAnswerQuestion() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, selectedLetter, isCorrect }: AnswerQuestionInput) => {
      if (!user) throw new Error("Você precisa estar logado para responder questões.");

      const { error } = await supabase.from("user_answers").insert({
        user_id: user.id,
        question_id: questionId,
        selected_letter: selectedLetter,
        is_correct: isCorrect,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      // Refaz a busca das respostas pra refletir o novo status em qualquer
      // tela que esteja mostrando essa questão (banco de questões, etc.)
      queryClient.invalidateQueries({ queryKey: ["user-answers", user?.id] });
    },
  });
}

// ---------------------------------------------------------------------
// Explicação da IA (tabela ai_explanations + Edge Function explain-question)
// ---------------------------------------------------------------------

async function fetchExplanation(questionId: string): Promise<string> {
  // 1. Já existe uma explicação salva? Usa ela, sem gastar chamada de IA.
  const { data: cached } = await supabase
    .from("ai_explanations")
    .select("explanation")
    .eq("question_id", questionId)
    .maybeSingle();

  if (cached?.explanation) return cached.explanation;

  // 2. Não existe ainda — pede pra Edge Function gerar (ela mesma salva
  //    o resultado, então da próxima vez cai direto no cache acima).
  const { data, error } = await supabase.functions.invoke<{
    explanation?: string;
    error?: string;
  }>("explain-question", {
    body: { questionId },
  });

  if (error) throw error;
  if (!data?.explanation) throw new Error(data?.error ?? "Não foi possível gerar a explicação.");

  return data.explanation;
}

export function useQuestionExplanation(questionId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["explanation", questionId],
    queryFn: () => fetchExplanation(questionId),
    enabled,
    staleTime: Infinity, // a explicação de uma questão não muda
    retry: 1,
  });
}
