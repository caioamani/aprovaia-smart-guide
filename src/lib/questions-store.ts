import { useEffect, useSyncExternalStore } from "react";
import { useSupabaseQuestions } from "./supabase-questions";
import type { Question, QuestionStatus } from "./mock-questions";

let questions: Question[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export const questionsStore = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  get(): Question[] {
    return questions;
  },
  getById(id: string): Question | undefined {
    return questions.find((q) => q.id === id);
  },
  toggleFavorite(id: string) {
    questions = questions.map((q) =>
      q.id === id ? { ...q, favorite: !q.favorite } : q,
    );
    emit();
  },
  setStatus(id: string, status: QuestionStatus) {
    questions = questions.map((q) => (q.id === id ? { ...q, status } : q));
    emit();
  },
  // Chamado quando os dados reais chegam do Supabase pela primeira vez.
  hydrate(data: Question[]) {
    questions = data;
    hydrated = true;
    emit();
  },
};

export function useQuestions(): Question[] {
  const { data } = useSupabaseQuestions();

  useEffect(() => {
    if (data && !hydrated) {
      questionsStore.hydrate(data);
    }
  }, [data]);

  return useSyncExternalStore(
    questionsStore.subscribe,
    questionsStore.get,
    questionsStore.get,
  );
}
