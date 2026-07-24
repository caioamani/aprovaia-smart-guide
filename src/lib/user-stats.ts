import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseQuestions } from "./supabase-questions";
import type { KnowledgeArea } from "./mock-questions";

type AnswerRow = {
  question_id: string;
  is_correct: boolean;
  answered_at: string;
};

// Busca TODAS as tentativas do usuário (não só a mais recente por questão
// como em useUserAnswers) — pra estatísticas precisamos do histórico
// completo, não só do status atual de cada questão.
async function fetchAllAnswers(userId: string): Promise<AnswerRow[]> {
  const { data, error } = await supabase
    .from("user_answers")
    .select("question_id, is_correct, answered_at")
    .eq("user_id", userId)
    .order("answered_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

function useRawUserAnswers() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["user-answers-raw", user?.id],
    queryFn: () => fetchAllAnswers(user!.id),
    enabled: !!user,
  });
}

export type MonthlyStat = { label: string; total: number; accuracy: number };
export type AreaStat = { area: KnowledgeArea; correct: number; total: number };
export type MonthSummary = { total: number; accuracy: number };

export type UserStats = {
  totalAnswered: number;
  accuracy: number; // 0-100
  byArea: AreaStat[];
  monthly: MonthlyStat[]; // últimos 12 meses, incluindo meses sem atividade
  streakDays: number;
  thisMonth: MonthSummary;
  lastMonth: MonthSummary;
};

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function monthKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export function useUserStats() {
  const { user } = useAuth();
  const { data: answers, isLoading: loadingAnswers } = useRawUserAnswers();
  const { data: questions, isLoading: loadingQuestions } = useSupabaseQuestions();

  const stats = useMemo<UserStats | null>(() => {
    if (!answers || !questions) return null;

    const areaByQuestionId = new Map(questions.map((q) => [q.id, q.area]));

    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.is_correct).length;
    const accuracy = totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

    // Acerto por área: usa a tentativa mais recente de cada questão, senão
    // quem refaz a mesma questão várias vezes distorceria a média da área.
    const latestByQuestion = new Map<string, boolean>();
    for (const a of answers) latestByQuestion.set(a.question_id, a.is_correct);

    const byAreaMap = new Map<KnowledgeArea, { correct: number; total: number }>();
    for (const [qid, correct] of latestByQuestion) {
      const area = areaByQuestionId.get(qid);
      if (!area) continue;
      const entry = byAreaMap.get(area) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (correct) entry.correct += 1;
      byAreaMap.set(area, entry);
    }
    const byArea = Array.from(byAreaMap.entries()).map(([area, v]) => ({ area, ...v }));

    // Evolução mensal — últimos 12 meses, incluindo os sem atividade (0).
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: monthKey(d), label: MONTH_LABELS[d.getMonth()] });
    }
    const byMonth = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const key = monthKey(new Date(a.answered_at));
      const entry = byMonth.get(key) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.is_correct) entry.correct += 1;
      byMonth.set(key, entry);
    }
    const monthly: MonthlyStat[] = months.map(({ key, label }) => {
      const entry = byMonth.get(key);
      const total = entry?.total ?? 0;
      const acc = total === 0 ? 0 : Math.round((entry!.correct / total) * 100);
      return { label, total, accuracy: acc };
    });

    // Streak: dias consecutivos com pelo menos 1 resposta. Se hoje ainda não
    // tem atividade, conta a partir de ontem — assim quem estudou ontem não
    // "perde" a sequência só por ainda não ter estudado hoje.
    const daysWithActivity = new Set(answers.map((a) => new Date(a.answered_at).toDateString()));
    let streakDays = 0;
    const cursor = new Date();
    if (!daysWithActivity.has(cursor.toDateString())) {
      cursor.setDate(cursor.getDate() - 1);
    }
    while (daysWithActivity.has(cursor.toDateString())) {
      streakDays += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    const toSummary = (key: string): MonthSummary => {
      const e = byMonth.get(key);
      const total = e?.total ?? 0;
      const acc = total === 0 ? 0 : Math.round((e!.correct / total) * 100);
      return { total, accuracy: acc };
    };
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    return {
      totalAnswered,
      accuracy,
      byArea,
      monthly,
      streakDays,
      thisMonth: toSummary(monthKey(now)),
      lastMonth: toSummary(monthKey(lastMonthDate)),
    };
  }, [answers, questions]);

  return {
    stats,
    isLoading: loadingAnswers || loadingQuestions,
    // Sem usuário logado não tem o que buscar — trate como "sem dados"
    // em vez de ficar preso em loading eterno.
    isLoggedOut: !user,
  };
}
