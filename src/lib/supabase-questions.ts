import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
    // A API do ENEM não classifica dificuldade — fica fixo até termos essa
    // informação (ex: calculada depois, com base no % de acerto dos usuários).
    difficulty: "Média",
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
    // Vem da tabela user_answers — ainda não conectada nesta etapa.
    status: "unanswered",
    // Feature de favoritos ainda não tem coluna/tabela própria no banco.
    favorite: false,
  };
}

async function fetchQuestions(): Promise<Question[]> {
  const { data, error } = await supabase
    .from("questions")
    .select(
      "id, exam_year, index, title, discipline, language, context, alternatives_introduction, alternatives, correct_alternative",
    )
    .order("exam_year", { ascending: false })
    .order("index", { ascending: true });

  if (error) throw error;
  return (data as SupabaseQuestionRow[]).map(mapRowToQuestion);
}

export function useSupabaseQuestions() {
  return useQuery({
    queryKey: ["questions"],
    queryFn: fetchQuestions,
    staleTime: 5 * 60 * 1000, // 5 min — questões não mudam com frequência
  });
}
