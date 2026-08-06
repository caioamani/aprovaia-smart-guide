import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useSupabaseQuestions } from "./supabase-questions";
import type { KnowledgeArea } from "./mock-questions";

// ---------------------------------------------------------------------
// Contexto do aluno (erros recentes) — usado na saudação e mandado pra
// Edge Function como contexto da conversa.
// ---------------------------------------------------------------------

export type RecentMistake = {
  area: KnowledgeArea;
  subject: string;
  topic: string;
  answeredAt: string;
};

export type StudentContext = {
  recentMistakes: RecentMistake[];
  weakestArea: KnowledgeArea | null;
  mistakeCount: number;
};

const MISTAKE_WINDOW_DAYS = 2; // "ontem" pra fins de saudação = últimas 48h

async function fetchRecentWrongAnswers(
  userId: string,
): Promise<{ question_id: string; answered_at: string }[]> {
  const since = new Date();
  since.setDate(since.getDate() - MISTAKE_WINDOW_DAYS);

  const { data, error } = await supabase
    .from("user_answers")
    .select("question_id, answered_at")
    .eq("user_id", userId)
    .eq("is_correct", false)
    .gte("answered_at", since.toISOString())
    .order("answered_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export function useStudentContext() {
  const { user } = useAuth();
  const { data: questions } = useSupabaseQuestions();

  const { data: wrongAnswers, isLoading } = useQuery({
    queryKey: ["tutor-recent-mistakes", user?.id],
    queryFn: () => fetchRecentWrongAnswers(user!.id),
    enabled: !!user,
    staleTime: 60 * 1000,
  });

  const context = useMemo<StudentContext | null>(() => {
    if (!wrongAnswers || !questions) return null;

    const byId = new Map(questions.map((q) => [q.id, q]));
    const recentMistakes: RecentMistake[] = [];
    for (const row of wrongAnswers) {
      const q = byId.get(row.question_id);
      if (!q) continue;
      recentMistakes.push({
        area: q.area,
        subject: q.subject,
        topic: q.topic,
        answeredAt: row.answered_at,
      });
    }

    const countByArea = new Map<KnowledgeArea, number>();
    for (const m of recentMistakes) {
      countByArea.set(m.area, (countByArea.get(m.area) ?? 0) + 1);
    }
    let weakestArea: KnowledgeArea | null = null;
    let max = 0;
    for (const [area, count] of countByArea) {
      if (count > max) {
        max = count;
        weakestArea = area;
      }
    }

    return { recentMistakes, weakestArea, mistakeCount: recentMistakes.length };
  }, [wrongAnswers, questions]);

  return { context, isLoading: isLoading || !questions };
}

/**
 * Limpa marcações de markdown que a IA às vezes devolve (**negrito**,
 * ### títulos, *itálico*, $fórmulas$, --- separadores) pra exibir como
 * texto corrido na bolha de chat, já que a interface não renderiza
 * markdown. Marcadores de lista soltos ("* item") viram "• item".
 */
export function formatTutorText(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // remove ### / ## / # no início da linha
    .replace(/\*\*([\s\S]+?)\*\*/g, "$1") // remove **negrito**
    .replace(/^[ \t]*\*\s+/gm, "• ") // marcador de lista (inclusive indentado) -> bullet
    // ^ tem que rodar ANTES do itálico, senão "*   *texto*" (bullet seguido de
    // itálico) casa errado e some com o marcador.
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, "$1") // remove *itálico*
    .replace(/\$\$?([^$]+?)\$\$?/g, "$1") // remove $ ou $$ de fórmulas em LaTeX
    .replace(/^\s*-{3,}\s*$/gm, "") // remove linhas "---" (separador)
    .replace(/\n{3,}/g, "\n\n") // colapsa linhas em branco sobrando
    .trim();
}

/** Monta a saudação inicial (substitui o texto fixo do mock). */
export function buildGreeting(
  context: StudentContext | null | undefined,
  firstName: string,
): string {
  if (!context || context.mistakeCount === 0) {
    return `Olá, ${firstName}! Sobre o que você quer estudar hoje?`;
  }

  const top = context.recentMistakes[0];
  const plural = context.mistakeCount === 1 ? "questão" : "questões";
  return `Olá, ${firstName}. Vi que você errou ${context.mistakeCount} ${plural} sobre ${top.topic} recentemente. Quer que eu explique isso de uma forma mais visual?`;
}

// ---------------------------------------------------------------------
// Histórico e envio de mensagens (tabela ai_tutor_messages + Edge
// Function ai-tutor-chat).
// ---------------------------------------------------------------------

export type TutorMessageRole = "user" | "ai";

export type TutorMessage = {
  id: string;
  role: TutorMessageRole;
  text: string;
  createdAt: string;
};

async function fetchTutorHistory(userId: string): Promise<TutorMessage[]> {
  const { data, error } = await supabase
    .from("ai_tutor_messages")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    role: row.role as TutorMessageRole,
    text: row.content,
    createdAt: row.created_at,
  }));
}

export function useTutorHistory() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["tutor-history", user?.id],
    queryFn: () => fetchTutorHistory(user!.id),
    enabled: !!user,
  });
}

type SendTutorMessageInput = {
  text: string;
  history: TutorMessage[];
};

export function useSendTutorMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ text, history }: SendTutorMessageInput) => {
      if (!user) throw new Error("Você precisa estar logado para conversar com a IA.");

      // 1. Salva a mensagem do usuário antes de chamar a IA, pra não
      //    perder a pergunta se a chamada falhar.
      const { error: insertUserError } = await supabase.from("ai_tutor_messages").insert({
        user_id: user.id,
        role: "user",
        content: text,
      });
      if (insertUserError) throw insertUserError;

      // 2. Manda pra Edge Function junto com as últimas mensagens da
      //    conversa — ela mesma busca os erros recentes do aluno no banco
      //    pra montar o contexto, então não precisamos duplicar isso aqui.
      const { data, error } = await supabase.functions.invoke<{
        reply?: string;
        error?: string;
      }>("ai-tutor-chat", {
        body: {
          message: text,
          history: history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
        },
      });

      if (error) throw error;
      if (!data?.reply) throw new Error(data?.error ?? "A IA não respondeu. Tenta de novo.");

      // 3. Salva a resposta da IA pra manter o histórico persistente.
      const { error: insertAiError } = await supabase.from("ai_tutor_messages").insert({
        user_id: user.id,
        role: "ai",
        content: data.reply,
      });
      if (insertAiError) throw insertAiError;

      return data.reply;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tutor-history", user?.id] });
    },
  });
}
