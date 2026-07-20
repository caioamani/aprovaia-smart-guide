import type { Question } from "./mock-questions";
import type { QuestionFiltersState } from "@/components/questions/QuestionFilters";

export function filterQuestions(
  questions: Question[],
  filters: QuestionFiltersState,
  query: string,
): Question[] {
  const q = query.trim().toLowerCase();

  return questions.filter((it) => {
    if (filters.years.length && !filters.years.includes(it.year)) return false;
    if (filters.areas.length && !filters.areas.includes(it.area)) return false;
    if (filters.subjects.length && !filters.subjects.includes(it.subject)) return false;
    if (filters.languages.length && !filters.languages.includes(it.language)) return false;
    if (filters.onlyAnswered && it.status === "unanswered") return false;
    if (filters.onlyUnanswered && it.status !== "unanswered") return false;
    if (filters.onlyWrong && it.status !== "wrong") return false;
    if (filters.onlyFavorites && !it.favorite) return false;
    if (q) {
      const hay = `${it.subject} ${it.topic} ${it.statement} ${it.context}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
