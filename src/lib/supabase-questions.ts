import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import type { Question, KnowledgeArea, Language } from "./mock-questions";

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
  context: string | null;
  alternatives_introduction: string | null;
  alternatives: SupabaseAlternative[];
  correct_alternative: string | null;
};

function mapRowToQuestion(row: SupabaseQuestionRow): Question {
  return {
    id: row.id,
    number: row.index,
    year: row.exam_year,
    area: disciplineToArea[row.discipline ?? ""] ?? "Linguagens e Códigos",
    subject: row.discipline ?? "Geral",
    topic: row.title ?? "",
    language: languageMap[row.language ?? ""] ?? "Português",
    context: row.context ?? "",
    statement: row.alternatives_introduction ?? row.title ?? "",
    alternatives: (row.alternatives ?? []).map((a) => ({
      letter: a.letter,
      text: a.text,
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
        "id, exam_year, index, title, discipline, language, context, alternatives_introduction, alternatives, correct_alternative",
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

  return allRows.map(mapRowToQuestion);
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
