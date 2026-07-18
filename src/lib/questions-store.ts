import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useSupabaseQuestions, useUserAnswers } from "./supabase-questions";
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
  // Atualização otimista local — dá feedback instantâneo na tela assim que
  // a pessoa responde, sem esperar a gravação no Supabase terminar. O status
  // "de verdade" (persistido) chega logo em seguida via useUserAnswers e
  // confirma/substitui esse valor.
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
  const { data: userAnswers } = useUserAnswers();

  useEffect(() => {
    if (data && !hydrated) {
      questionsStore.hydrate(data);
    }
  }, [data]);

  const snapshot = useSyncExternalStore(
    questionsStore.subscribe,
    questionsStore.get,
    questionsStore.get,
  );

  // Sobrepõe o status real (persistido em user_answers) por cima do
  // snapshot do store. É um merge derivado, calculado a cada render — assim
  // não existe corrida entre "questões carregaram" e "respostas carregaram",
  // não importa qual das duas chega primeiro.
  return useMemo(() => {
    if (!userAnswers || userAnswers.size === 0) return snapshot;
    return snapshot.map((q) => {
      const isCorrect = userAnswers.get(q.id);
      if (isCorrect === undefined) return q;
      return { ...q, status: isCorrect ? "correct" : "wrong" };
    });
  }, [snapshot, userAnswers]);
}
