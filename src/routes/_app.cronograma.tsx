import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Sparkles, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FunctionsHttpError,
  FunctionsFetchError,
  FunctionsRelayError,
} from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app/cronograma")({
  component: Cronograma,
  head: () => ({ meta: [{ title: "Cronograma · AprovaIA" }] }),
});

const DAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
const HOUR_STEP_MIN = 120; // cada linha da grade representa um bloco de 2h

// Paleta cíclica por matéria — não temos uma cor "oficial" por matéria no
// banco, então distribuímos por índice, de forma estável (mesma matéria
// sempre cai na mesma cor dentro de uma sessão de uso).
const PALETTE = [
  "bg-brand/15 ring-brand/30 text-brand",
  "bg-fuchsia-500/15 ring-fuchsia-500/30 text-fuchsia-300",
  "bg-orange-500/15 ring-orange-500/30 text-orange-300",
  "bg-indigo-500/15 ring-indigo-500/30 text-indigo-300",
  "bg-emerald-500/15 ring-emerald-500/30 text-emerald-300",
  "bg-cyan-500/15 ring-cyan-500/30 text-cyan-300",
  "bg-lime-500/15 ring-lime-500/30 text-lime-300",
  "bg-rose-500/15 ring-rose-500/30 text-rose-300",
];

type StudySessionRow = {
  id: string;
  scheduled_date: string; // "2026-08-12"
  scheduled_time: string; // "19:00:00"
  duration_minutes: number;
  objective: string;
  kind: string;
  status: string;
  subjects: { name: string; slug: string } | null;
};

function mondayOf(date: Date): Date {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.getDate();
  const endStr = `${end.getDate()} de ${end.toLocaleDateString("pt-BR", { month: "long" })}`;
  return sameMonth
    ? `${startStr} a ${endStr}`
    : `${startStr} de ${start.toLocaleDateString("pt-BR", { month: "long" })} a ${endStr}`;
}

function hourIndexFor(time: string): number {
  const [h] = time.split(":").map(Number);
  // encaixa no slot de 2h mais próximo, sem passar do último
  const idx = Math.floor((h - 8) / 2);
  return Math.min(HOURS.length - 1, Math.max(0, idx));
}

function subjectColor(slug: string, order: string[]): string {
  const i = order.indexOf(slug);
  return PALETTE[i % PALETTE.length];
}

function Cronograma() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = useMemo(() => {
    const base = mondayOf(new Date());
    base.setDate(base.getDate() + weekOffset * 7);
    return base;
  }, [weekOffset]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }, [weekStart]);

  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ["study-sessions", user?.id, toISODate(weekStart)],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_sessions")
        .select(
          "id, scheduled_date, scheduled_time, duration_minutes, objective, kind, status, subjects(name, slug)",
        )
        .eq("user_id", user!.id)
        .gte("scheduled_date", toISODate(weekStart))
        .lte("scheduled_date", toISODate(weekEnd))
        .order("scheduled_date", { ascending: true })
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown as StudySessionRow[];
    },
  });

  const { data: hasActivePlan } = useQuery({
    queryKey: ["has-active-study-plan", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_plans")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const subjectOrder = useMemo(() => {
    const seen = new Set<string>();
    for (const s of sessions ?? []) {
      const slug = s.subjects?.slug;
      if (slug) seen.add(slug);
    }
    return Array.from(seen);
  }, [sessions]);

  const generatePlan = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke<{
        planId?: string;
        sessionsCreated?: number;
        error?: string;
      }>("generate-study-plan");

      if (error) {
        // FunctionsHttpError: a function rodou e devolveu erro — o corpo
        // real (com a mensagem { error: "..." }) vem em error.context.
        if (error instanceof FunctionsHttpError) {
          try {
            const parsed = await error.context.json();
            if (parsed?.error) throw new Error(parsed.error);
          } catch (e) {
            if (e instanceof Error && e.message) throw e;
          }
          throw new Error("A geração do cronograma falhou. Tente novamente.");
        }
        // FunctionsFetchError: a chamada nem chegou a completar — function
        // não publicada, CORS, ou problema de rede. Aqui context é um erro
        // de rede cru, sem .json()/.clone(), por isso o tratamento à parte.
        if (error instanceof FunctionsFetchError) {
          throw new Error(
            "Não foi possível conectar à função de geração do cronograma. Verifique se ela está publicada no Supabase (Edge Functions).",
          );
        }
        if (error instanceof FunctionsRelayError) {
          throw new Error(
            "Erro no relay do Supabase ao gerar o cronograma. Tente novamente em instantes.",
          );
        }
        throw error;
      }
      if (!data?.planId) {
        throw new Error(data?.error ?? "Não foi possível gerar o cronograma.");
      }
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Cronograma gerado com ${data.sessionsCreated} sessões.`);
      // Invalida tudo que depende de study_plans/study_sessions, incluindo
      // a semana atual sendo exibida, pra já mostrar o resultado sem
      // precisar dar refresh manual.
      queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["has-active-study-plan"] });
    },
    onError: (err: Error) => {
      toast.error(err.message || "Erro ao gerar o cronograma.");
    },
  });

  const todayISO = toISODate(new Date());

  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cronograma</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Semana de {formatRange(weekStart, weekEnd)}
            {hasActivePlan ? " · gerado e ajustado pela IA." : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            className="px-3 py-2 rounded-lg bg-surface ring-1 ring-hairline hover:bg-white/5 transition"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={() => setWeekOffset(0)}
            className="px-4 py-2 rounded-lg bg-surface ring-1 ring-hairline text-sm font-medium hover:bg-white/5 transition"
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            className="px-3 py-2 rounded-lg bg-surface ring-1 ring-hairline hover:bg-white/5 transition"
          >
            <ChevronRight className="size-4" />
          </button>
          <button
            onClick={() => generatePlan.mutate()}
            disabled={generatePlan.isPending}
            className="ml-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand/90 transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {generatePlan.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Sparkles className="size-3.5" />
            )}
            {generatePlan.isPending ? "Gerando cronograma…" : "Gerar cronograma com IA"}
          </button>
        </div>
      </div>

      {!loadingSessions && !hasActivePlan && (sessions?.length ?? 0) === 0 && (
        <div className="p-4 rounded-xl bg-brand/10 ring-1 ring-brand/20 text-sm text-brand">
          Você ainda não tem um cronograma gerado. Clique em "Gerar cronograma com IA" pra criar seu
          plano de 30 dias baseado no seu desempenho real.
        </div>
      )}

      {/* Calendar */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-2 min-w-[900px]">
          <div />
          {DAY_LABELS.map((label, i) => {
            const d = new Date(weekStart);
            d.setDate(d.getDate() + i);
            const isToday = toISODate(d) === todayISO;
            return (
              <div key={label} className="text-center pb-3 border-b border-hairline">
                <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {label}
                </p>
                <p className={`text-lg font-semibold mt-1 ${isToday ? "text-brand" : ""}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}

          {HOURS.map((h, hi) => (
            <div key={h} className="contents">
              <div className="text-[10px] font-mono text-muted-foreground pt-2">{h}</div>
              {DAY_LABELS.map((_, di) => {
                const d = new Date(weekStart);
                d.setDate(d.getDate() + di);
                const dateISO = toISODate(d);
                const daySessions = (sessions ?? []).filter(
                  (s) => s.scheduled_date === dateISO && hourIndexFor(s.scheduled_time) === hi,
                );
                return (
                  <div key={di} className="relative h-16 border-t border-hairline">
                    {daySessions.map((s, si) => {
                      const span = Math.max(1, Math.round(s.duration_minutes / HOUR_STEP_MIN));
                      const slug = s.subjects?.slug ?? "geral";
                      return (
                        <div
                          key={s.id}
                          onClick={() =>
                            slug !== "geral" &&
                            navigate({ to: "/questoes", search: { subject: s.subjects?.name } })
                          }
                          className={[
                            "absolute inset-x-0 top-1 rounded-lg p-2 ring-1 cursor-pointer transition hover:brightness-110",
                            subjectColor(slug, subjectOrder),
                            s.status === "done" ? "opacity-50" : "",
                          ].join(" ")}
                          style={{
                            height: `${span * 4 - 0.5}rem`,
                            left: si > 0 ? `${si * 6}px` : undefined,
                          }}
                          title={s.objective}
                        >
                          <p className="text-[9px] font-mono uppercase tracking-widest opacity-80">
                            {s.subjects?.name ?? "Geral"}
                          </p>
                          <p className="text-xs font-semibold mt-0.5 leading-tight line-clamp-2">
                            {s.kind}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
