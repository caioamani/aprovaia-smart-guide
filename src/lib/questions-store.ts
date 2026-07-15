import { useSyncExternalStore } from "react";
import { mockQuestions, type Question, type QuestionStatus } from "./mock-questions";

let questions: Question[] = mockQuestions.map((q) => ({ ...q }));
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
};

export function useQuestions(): Question[] {
  return useSyncExternalStore(
    questionsStore.subscribe,
    questionsStore.get,
    questionsStore.get,
  );
}
