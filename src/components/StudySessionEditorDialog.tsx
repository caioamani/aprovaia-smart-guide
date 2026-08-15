import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { getOrCreateActivePlanId } from "@/lib/study-plan";

type SubjectOption = { id: string; name: string; discipline: string };

export type SessionEditorInitial = {
  id: string;
  subjectId: string | null;
  date: string; // "2026-08-12"
  time: string; // "19:00"
  durationMinutes: number;
};

export function StudySessionEditorDialog({
  open,
  onOpenChange,
  initial,
  defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** Presente = editando um cartão existente. Ausente = criando um novo. */
  initial?: SessionEditorInitial | null;
  /** Data pré-selecionada ao criar (ex: o dia da coluna clicada). */
  defaultDate?: string;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEdit = !!initial;

  const [subjectId, setSubjectId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [time, setTime] = useState<string>("19:00");
  const [duration, setDuration] = useState<number>(60);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setSubjectId(initial.subjectId ?? "");
      setDate(initial.date);
      setTime(initial.time);
      setDuration(initial.durationMinutes);
    } else {
      setSubjectId("");
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setTime("19:00");
      setDuration(60);
    }
  }, [open, initial, defaultDate]);

  const { data: subjects, isLoading: loadingSubjects } = useQuery({
    queryKey: ["subjects-list"],
    enabled: open,
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, discipline")
        .order("name");
      if (error) throw error;
      return (data ?? []) as SubjectOption[];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Não autenticado.");
      if (!subjectId) throw new Error("Escolha uma matéria.");
      const subject = subjects?.find((s) => s.id === subjectId);

      if (isEdit && initial) {
        const { error } = await supabase
          .from("study_sessions")
          .update({
            subject_id: subjectId,
            scheduled_date: date,
            scheduled_time: time,
            duration_minutes: duration,
            objective: subject?.name ?? "Sessão de estudo",
          })
          .eq("id", initial.id);
        if (error) throw error;
      } else {
        const planId = await getOrCreateActivePlanId(user.id);
        const { error } = await supabase.from("study_sessions").insert({
          plan_id: planId,
          user_id: user.id,
          subject_id: subjectId,
          scheduled_date: date,
          scheduled_time: time,
          duration_minutes: duration,
          objective: subject?.name ?? "Sessão de estudo",
          kind: "Manual",
          content: [],
          status: "todo",
          order_index: 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isEdit ? "Cartão atualizado." : "Cartão adicionado.");
      queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["has-active-study-plan"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível salvar o cartão.");
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (!initial) return;
      const { error } = await supabase.from("study_sessions").delete().eq("id", initial.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cartão removido.");
      queryClient.invalidateQueries({ queryKey: ["study-sessions"] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível remover o cartão.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar sessão" : "Adicionar sessão"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Matéria</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              disabled={loadingSubjects}
              className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40 disabled:opacity-60"
            >
              <option value="" disabled>
                {loadingSubjects ? "Carregando…" : "Selecione uma matéria"}
              </option>
              {subjects?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Data</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Horário</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Duração (minutos)</label>
            <input
              type="number"
              min={15}
              max={240}
              step={5}
              value={duration}
              onChange={(e) => setDuration(Math.max(15, Number(e.target.value) || 60))}
              className="w-full px-3 py-2 rounded-lg bg-background ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            {isEdit && (
              <button
                onClick={() => remove.mutate()}
                disabled={remove.isPending || save.isPending}
                className="px-3 py-2.5 rounded-lg ring-1 ring-red-500/30 text-red-400 hover:bg-red-500/10 transition inline-flex items-center gap-1.5 text-sm disabled:opacity-60"
              >
                {remove.isPending ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Trash2 className="size-3.5" />
                )}
                Remover
              </button>
            )}
            <button
              onClick={() => save.mutate()}
              disabled={save.isPending || remove.isPending || !subjectId}
              className="flex-1 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {save.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {isEdit ? "Salvar alterações" : "Adicionar cartão"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
