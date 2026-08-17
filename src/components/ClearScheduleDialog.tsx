import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type Mode = "all" | "period";
type PeriodType = "day" | "week" | "month";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function iso(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

// Semana Seg–Dom que contém a data escolhida, mesma convenção usada no
// cronograma (0 = segunda).
function weekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - dow);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: iso(start.getFullYear(), start.getMonth() + 1, start.getDate()),
    end: iso(end.getFullYear(), end.getMonth() + 1, end.getDate()),
  };
}

function monthRange(monthStr: string): { start: string; end: string } {
  const [y, m] = monthStr.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return { start: iso(y, m, 1), end: iso(y, m, lastDay) };
}

function formatBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
}

const MONTH_LABELS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export function ClearScheduleDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<"select" | "confirm">("select");
  const [mode, setMode] = useState<Mode>("all");
  const [periodType, setPeriodType] = useState<PeriodType>("day");
  const [dayValue, setDayValue] = useState(() => new Date().toISOString().slice(0, 10));
  const [monthValue, setMonthValue] = useState(() => new Date().toISOString().slice(0, 7));

  function reset() {
    setStep("select");
    setMode("all");
    setPeriodType("day");
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset();
    onOpenChange(o);
  }

  function range(): { start: string; end: string } {
    if (periodType === "day") return { start: dayValue, end: dayValue };
    if (periodType === "week") return weekRange(dayValue);
    return monthRange(monthValue);
  }

  const clear = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado.");

      if (mode === "all") {
        const { error } = await supabase.from("study_sessions").delete().eq("user_id", user.id);
        if (error) throw error;
        const { error: archiveError } = await supabase
          .from("study_plans")
          .update({ status: "archived" })
          .eq("user_id", user.id)
          .eq("status", "active");
        if (archiveError) throw archiveError;
      } else {
        const { start, end } = range();
        const { error } = await supabase
          .from("study_sessions")
          .delete()
          .eq("user_id", user.id)
          .gte("scheduled_date", start)
          .lte("scheduled_date", end);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(
        mode === "all" ? "Cronograma inteiro apagado." : "Sessões do período apagadas.",
      );
      queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["has-active-study-plan"] });
      handleOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível limpar o cronograma.");
    },
  });

  function periodLabel(): string {
    if (periodType === "day") return `o dia ${formatBR(dayValue)}`;
    if (periodType === "week") {
      const { start, end } = weekRange(dayValue);
      return `a semana de ${formatBR(start)} a ${formatBR(end)}`;
    }
    const [y, m] = monthValue.split("-").map(Number);
    return `${MONTH_LABELS[m - 1]} de ${y}`;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="bg-surface border-hairline max-w-md">
        {step === "select" ? (
          <>
            <DialogHeader>
              <DialogTitle>Limpar cronograma</DialogTitle>
              <p className="text-sm text-muted-foreground">Escolha o que você quer apagar.</p>
            </DialogHeader>

            <div className="py-2 space-y-3">
              <button
                type="button"
                onClick={() => setMode("all")}
                className={[
                  "w-full text-left p-4 rounded-xl ring-1 transition",
                  mode === "all"
                    ? "ring-red-500/50 bg-red-500/10"
                    : "ring-hairline bg-white/[0.02] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <p
                  className={["text-sm font-semibold", mode === "all" ? "text-red-400" : ""].join(
                    " ",
                  )}
                >
                  Limpar cronograma inteiro
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Apaga todas as sessões, de todas as semanas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setMode("period")}
                className={[
                  "w-full text-left p-4 rounded-xl ring-1 transition",
                  mode === "period"
                    ? "ring-brand/50 bg-brand/10"
                    : "ring-hairline bg-white/[0.02] hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <p
                  className={["text-sm font-semibold", mode === "period" ? "text-brand" : ""].join(
                    " ",
                  )}
                >
                  Limpar um período específico
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Escolha um dia, uma semana ou um mês.
                </p>

                {mode === "period" && (
                  <div
                    className="mt-3 space-y-3"
                    onClick={(e) => e.stopPropagation()}
                    role="presentation"
                  >
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          { value: "day", label: "Dia" },
                          { value: "week", label: "Semana" },
                          { value: "month", label: "Mês" },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPeriodType(opt.value)}
                          className={[
                            "py-1.5 rounded-lg text-xs font-medium ring-1 transition",
                            periodType === opt.value
                              ? "ring-brand/50 bg-brand/15 text-brand"
                              : "ring-hairline bg-background text-muted-foreground hover:bg-white/5",
                          ].join(" ")}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {periodType === "month" ? (
                      <input
                        type="month"
                        value={monthValue}
                        onChange={(e) => setMonthValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
                      />
                    ) : (
                      <input
                        type="date"
                        value={dayValue}
                        onChange={(e) => setDayValue(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
                      />
                    )}
                  </div>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => handleOpenChange(false)}
                className="flex-1 py-2.5 rounded-lg ring-1 ring-hairline text-sm font-medium hover:bg-white/5 transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep("confirm")}
                className="flex-1 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition"
              >
                Confirmar
              </button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="size-5" />
                {mode === "all" ? "Apagar tudo?" : "Apagar esse período?"}
              </DialogTitle>
            </DialogHeader>

            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                {mode === "all" ? (
                  <>
                    Isso vai apagar{" "}
                    <strong className="text-foreground">todo o seu cronograma</strong> — todas as
                    sessões de todas as semanas, geradas por IA ou adicionadas manualmente. Essa
                    ação não pode ser desfeita.
                  </>
                ) : (
                  <>
                    Isso vai apagar todas as sessões de{" "}
                    <strong className="text-foreground">{periodLabel()}</strong>. Essa ação não pode
                    ser desfeita.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => setStep("select")}
                disabled={clear.isPending}
                className="flex-1 py-2.5 rounded-lg ring-1 ring-hairline text-sm font-medium hover:bg-white/5 transition disabled:opacity-60"
              >
                Voltar
              </button>
              <button
                onClick={() => clear.mutate()}
                disabled={clear.isPending}
                className="flex-1 py-2.5 rounded-lg bg-red-500/90 text-white text-sm font-semibold hover:bg-red-500 transition disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {clear.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Sim, apagar
              </button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
