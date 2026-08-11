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

export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

export type TimelinePoint = { label: string; total: number; accuracy: number };
export type AreaStat = { area: KnowledgeArea; correct: number; total: number };
export type SubjectStat = { subject: string; correct: number; total: number };
export type PeriodSummary = { total: number; accuracy: number };

export type UserStats = {
  totalAnswered: number;
  accuracy: number;
  byArea: AreaStat[];
  bySubject: SubjectStat[];
  timeline: TimelinePoint[];
  streakDays: number;
  current: PeriodSummary;
  previous: PeriodSummary;
  currentLabel: string;
  previousLabel: string;
};

const MONTH_LABELS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

// Bucket key generators — each granularity maps a Date to a stable key.
function bucketKey(d: Date, g: Granularity): string {
  switch (g) {
    case "daily":
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    case "weekly": {
      // ISO-ish: use Monday as start of week
      const day = (d.getDay() + 6) % 7; // 0=Mon
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
      return `w-${monday.getFullYear()}-${monday.getMonth()}-${monday.getDate()}`;
    }
    case "monthly":
      return `${d.getFullYear()}-${d.getMonth()}`;
    case "yearly":
      return `${d.getFullYear()}`;
  }
}

function buildBuckets(g: Granularity): { key: string; label: string; date: Date }[] {
  const now = new Date();
  const out: { key: string; label: string; date: Date }[] = [];
  if (g === "daily") {
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
      out.push({ key: bucketKey(d, g), label: String(d.getDate()), date: d });
    }
  } else if (g === "weekly") {
    const day = (now.getDay() + 6) % 7;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(
        thisMonday.getFullYear(),
        thisMonday.getMonth(),
        thisMonday.getDate() - i * 7,
      );
      out.push({ key: bucketKey(d, g), label: `${d.getDate()}/${d.getMonth() + 1}`, date: d });
    }
  } else if (g === "monthly") {
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      out.push({ key: bucketKey(d, g), label: MONTH_LABELS[d.getMonth()], date: d });
    }
  } else {
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear() - i, 0, 1);
      out.push({ key: bucketKey(d, g), label: String(d.getFullYear()), date: d });
    }
  }
  return out;
}

function currentAndPreviousKeys(g: Granularity): {
  current: string;
  previous: string;
  currentLabel: string;
  previousLabel: string;
} {
  const now = new Date();
  if (g === "daily") {
    const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return {
      current: bucketKey(now, g),
      previous: bucketKey(yest, g),
      currentLabel: "Hoje",
      previousLabel: "Ontem",
    };
  }
  if (g === "weekly") {
    const day = (now.getDay() + 6) % 7;
    const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day);
    const lastMonday = new Date(
      thisMonday.getFullYear(),
      thisMonday.getMonth(),
      thisMonday.getDate() - 7,
    );
    return {
      current: bucketKey(thisMonday, g),
      previous: bucketKey(lastMonday, g),
      currentLabel: "Esta semana",
      previousLabel: "Semana passada",
    };
  }
  if (g === "monthly") {
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return {
      current: bucketKey(now, g),
      previous: bucketKey(prev, g),
      currentLabel: "Este mês",
      previousLabel: "Mês anterior",
    };
  }
  const prev = new Date(now.getFullYear() - 1, 0, 1);
  return {
    current: bucketKey(now, g),
    previous: bucketKey(prev, g),
    currentLabel: "Este ano",
    previousLabel: "Ano anterior",
  };
}

export function useUserStats(granularity: Granularity = "monthly") {
  const { user } = useAuth();
  const { data: answers, isLoading: loadingAnswers } = useRawUserAnswers();
  const { data: questions, isLoading: loadingQuestions } = useSupabaseQuestions();

  const stats = useMemo<UserStats | null>(() => {
    if (!answers || !questions) return null;

    const areaByQuestionId = new Map(questions.map((q) => [q.id, q.area]));
    const subjectByQuestionId = new Map(questions.map((q) => [q.id, q.subject]));

    const totalAnswered = answers.length;
    const totalCorrect = answers.filter((a) => a.is_correct).length;
    const accuracy = totalAnswered === 0 ? 0 : Math.round((totalCorrect / totalAnswered) * 100);

    // Área: última tentativa por questão.
    const latestByQuestion = new Map<string, boolean>();
    for (const a of answers) latestByQuestion.set(a.question_id, a.is_correct);

    const byAreaMap = new Map<KnowledgeArea, { correct: number; total: number }>();
    const bySubjectMap = new Map<string, { correct: number; total: number }>();
    for (const [qid, correct] of latestByQuestion) {
      const area = areaByQuestionId.get(qid);
      if (area) {
        const entry = byAreaMap.get(area) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (correct) entry.correct += 1;
        byAreaMap.set(area, entry);
      }

      const subject = subjectByQuestionId.get(qid);
      if (subject) {
        const entry = bySubjectMap.get(subject) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (correct) entry.correct += 1;
        bySubjectMap.set(subject, entry);
      }
    }
    const byArea = Array.from(byAreaMap.entries()).map(([area, v]) => ({ area, ...v }));
    const bySubject = Array.from(bySubjectMap.entries()).map(([subject, v]) => ({ subject, ...v }));

    // Série temporal por granularidade.
    const buckets = buildBuckets(granularity);
    const byBucket = new Map<string, { correct: number; total: number }>();
    for (const a of answers) {
      const key = bucketKey(new Date(a.answered_at), granularity);
      const entry = byBucket.get(key) ?? { correct: 0, total: 0 };
      entry.total += 1;
      if (a.is_correct) entry.correct += 1;
      byBucket.set(key, entry);
    }
    const timeline: TimelinePoint[] = buckets.map(({ key, label }) => {
      const entry = byBucket.get(key);
      const total = entry?.total ?? 0;
      const acc = total === 0 ? 0 : Math.round((entry!.correct / total) * 100);
      return { label, total, accuracy: acc };
    });

    // Streak (mesma lógica: dias consecutivos com resposta).
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

    const { current, previous, currentLabel, previousLabel } = currentAndPreviousKeys(granularity);
    const toSummary = (key: string): PeriodSummary => {
      const e = byBucket.get(key);
      const total = e?.total ?? 0;
      const acc = total === 0 ? 0 : Math.round((e!.correct / total) * 100);
      return { total, accuracy: acc };
    };

    return {
      totalAnswered,
      accuracy,
      byArea,
      bySubject,
      timeline,
      streakDays,
      current: toSummary(current),
      previous: toSummary(previous),
      currentLabel,
      previousLabel,
    };
  }, [answers, questions, granularity]);

  return {
    stats,
    isLoading: loadingAnswers || loadingQuestions,
    isLoggedOut: !user,
  };
}
