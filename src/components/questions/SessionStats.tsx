import { CheckCircle2, XCircle, Target, Timer, ListChecks } from "lucide-react";

export type SessionStatsData = {
  answered: number;
  correct: number;
  wrong: number;
  elapsedSeconds: number;
};

function formatTime(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

export function SessionStats({ stats }: { stats: SessionStatsData }) {
  const precision =
    stats.answered > 0 ? Math.round((stats.correct / stats.answered) * 100) : 0;

  const items = [
    { icon: ListChecks, label: "Respondidas", value: stats.answered, tint: "text-foreground" },
    { icon: CheckCircle2, label: "Acertos", value: stats.correct, tint: "text-emerald-400" },
    { icon: XCircle, label: "Erros", value: stats.wrong, tint: "text-red-400" },
    { icon: Target, label: "Precisão", value: `${precision}%`, tint: "text-brand" },
    { icon: Timer, label: "Tempo", value: formatTime(stats.elapsedSeconds), tint: "text-foreground" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {items.map((it) => (
        <div
          key={it.label}
          className="p-3 rounded-xl bg-surface ring-1 ring-hairline"
        >
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
            <it.icon className="size-3" />
            {it.label}
          </div>
          <div className={`mt-1 text-lg font-semibold tabular-nums ${it.tint}`}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}
