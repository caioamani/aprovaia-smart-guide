import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, Bell, Gauge, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

const DAY_LABELS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];

type AvailabilitySlot = {
  day: number; // 0 = segunda ... 6 = domingo
  start: string; // "19:00"
  end: string; // "21:00"
};

type Pace = "leve" | "moderado" | "intenso";

const PACE_OPTIONS: { value: Pace; label: string; desc: string }[] = [
  { value: "leve", label: "Leve", desc: "Menos conteúdo por dia, ritmo mais tranquilo." },
  { value: "moderado", label: "Moderado", desc: "Equilíbrio entre volume de conteúdo e descanso." },
  {
    value: "intenso",
    label: "Intenso",
    desc: "Mais conteúdo por dia, pra recuperar o tempo perdido.",
  },
];

type StudyPreferencesRow = {
  user_id: string;
  availability: AvailabilitySlot[];
  notifications_enabled: boolean;
  exam_date: string | null;
  pace: Pace;
};

const DEFAULT_SLOT_START = "19:00";
const DEFAULT_SLOT_END = "21:00";

function slotDuration(slot: AvailabilitySlot): number {
  const [sh, sm] = slot.start.split(":").map(Number);
  const [eh, em] = slot.end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, minutes);
}

export function StudyPreferencesDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [availability, setAvailability] = useState<AvailabilitySlot[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [examDate, setExamDate] = useState<string>("");
  const [pace, setPace] = useState<Pace>("moderado");

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["study-preferences", user?.id],
    enabled: !!user && open,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("study_preferences")
        .select("user_id, availability, notifications_enabled, exam_date, pace")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as StudyPreferencesRow | null;
    },
  });

  // Preenche o formulário assim que as preferências salvas chegam (ou usa
  // valores padrão se o usuário nunca configurou antes).
  useEffect(() => {
    if (!open) return;
    if (preferences) {
      setAvailability(preferences.availability ?? []);
      setNotificationsEnabled(preferences.notifications_enabled);
      setExamDate(preferences.exam_date ?? "");
      setPace(preferences.pace);
    } else if (!isLoading) {
      setAvailability([]);
      setNotificationsEnabled(true);
      setExamDate("");
      setPace("moderado");
    }
  }, [open, preferences, isLoading]);

  const weeklyMinutes = useMemo(
    () => availability.reduce((sum, s) => sum + slotDuration(s), 0),
    [availability],
  );

  const daysUntilExam = useMemo(() => {
    if (!examDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(`${examDate}T00:00:00`);
    const diff = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }, [examDate]);

  function toggleDay(day: number) {
    setAvailability((prev) => {
      const exists = prev.find((s) => s.day === day);
      if (exists) return prev.filter((s) => s.day !== day);
      return [...prev, { day, start: DEFAULT_SLOT_START, end: DEFAULT_SLOT_END }].sort(
        (a, b) => a.day - b.day,
      );
    });
  }

  function updateSlot(day: number, field: "start" | "end", value: string) {
    setAvailability((prev) => prev.map((s) => (s.day === day ? { ...s, [field]: value } : s)));
  }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        user_id: user!.id,
        availability,
        notifications_enabled: notificationsEnabled,
        exam_date: examDate || null,
        pace,
      };
      const { error } = await supabase
        .from("study_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferências de estudo salvas.");
      queryClient.invalidateQueries({ queryKey: ["study-preferences", user?.id] });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Não foi possível salvar suas preferências.");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Preferências de estudo</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Horários, notificações e ritmo do seu plano.
          </p>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex items-center justify-center text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : (
          <div className="py-2 space-y-7">
            {/* Horários de estudo */}
            <section>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand mb-3">
                <Clock className="size-3" />
                Horários de estudo
              </div>
              <div className="space-y-2">
                {DAY_LABELS.map((label, day) => {
                  const slot = availability.find((s) => s.day === day);
                  const active = !!slot;
                  return (
                    <div
                      key={label}
                      className={[
                        "flex items-center gap-3 p-3 rounded-xl ring-1 transition",
                        active ? "ring-brand/30 bg-brand/5" : "ring-hairline bg-white/[0.02]",
                      ].join(" ")}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDay(day)}
                        className={[
                          "shrink-0 w-24 text-left text-sm font-medium px-2 py-1 rounded-lg transition",
                          active ? "text-brand" : "text-muted-foreground",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                      {active ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <input
                            type="time"
                            value={slot.start}
                            onChange={(e) => updateSlot(day, "start", e.target.value)}
                            className="px-2 py-1.5 rounded-lg bg-surface ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
                          />
                          <span className="text-muted-foreground text-xs">até</span>
                          <input
                            type="time"
                            value={slot.end}
                            onChange={(e) => updateSlot(day, "end", e.target.value)}
                            className="px-2 py-1.5 rounded-lg bg-surface ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
                          />
                        </div>
                      ) : (
                        <span className="ml-auto text-xs text-muted-foreground">Sem estudo</span>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total disponível: {(weeklyMinutes / 60).toFixed(1).replace(".0", "")}h por semana
              </p>
            </section>

            {/* Notificações */}
            <section>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand mb-3">
                <Bell className="size-3" />
                Notificações
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl ring-1 ring-hairline bg-white/[0.02]">
                <div>
                  <p className="text-sm font-medium">Avisos de estudo</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Receba um lembrete no app nos horários agendados.
                  </p>
                </div>
                <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
              </div>
            </section>

            {/* Ritmo */}
            <section>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand mb-3">
                <Gauge className="size-3" />
                Ritmo
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Data da prova
                  </label>
                  <input
                    type="date"
                    value={examDate}
                    onChange={(e) => setExamDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface ring-1 ring-hairline text-sm outline-none focus:ring-brand/40"
                  />
                  {daysUntilExam !== null && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {daysUntilExam >= 0
                        ? `Faltam ${daysUntilExam} dias · ${(weeklyMinutes / 60).toFixed(1).replace(".0", "")}h/semana disponíveis`
                        : "Essa data já passou — ajuste pra sua próxima prova."}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {PACE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPace(opt.value)}
                      className={[
                        "text-left p-3 rounded-xl ring-1 transition",
                        pace === opt.value
                          ? "ring-brand/50 bg-brand/10"
                          : "ring-hairline bg-white/[0.02] hover:bg-white/[0.04]",
                      ].join(" ")}
                    >
                      <p
                        className={[
                          "text-sm font-semibold",
                          pace === opt.value ? "text-brand" : "text-foreground",
                        ].join(" ")}
                      >
                        {opt.label}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                        {opt.desc}
                      </p>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  O ritmo ajusta a quantidade de conteúdo por dia com base na data da prova e no
                  tempo livre que você marcou acima. Ao gerar um novo cronograma com IA, essas
                  preferências são levadas em conta.
                </p>
              </div>
            </section>

            <button
              onClick={() => save.mutate()}
              disabled={save.isPending}
              className="w-full py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {save.isPending && <Loader2 className="size-3.5 animate-spin" />}
              {save.isPending ? "Salvando…" : "Salvar preferências"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
