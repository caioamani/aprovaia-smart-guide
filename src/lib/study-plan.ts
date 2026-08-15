import { supabase } from "@/integrations/supabase/client";

const MANUAL_PLAN_DAYS = 30;

function addDays(base: Date, days: number): string {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Retorna o id do plano de estudos ativo do usuário, criando um plano
 * "manual" na hora se ele ainda não tiver nenhum — necessário porque
 * study_sessions.plan_id é NOT NULL, e cartões adicionados manualmente
 * precisam ficar vinculados a algum plano mesmo sem geração por IA.
 */
export async function getOrCreateActivePlanId(userId: string): Promise<string> {
  const { data: existing, error: findError } = await supabase
    .from("study_plans")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle<{ id: string }>();

  if (findError) throw findError;
  if (existing) return existing.id;

  const today = new Date();
  const { data: created, error: createError } = await supabase
    .from("study_plans")
    .insert({
      user_id: userId,
      status: "active",
      generation_source: "manual",
      valid_from: addDays(today, 0),
      valid_until: addDays(today, MANUAL_PLAN_DAYS),
    })
    .select("id")
    .single<{ id: string }>();

  if (createError || !created) {
    throw createError ?? new Error("Não foi possível criar um plano de estudos.");
  }
  return created.id;
}
