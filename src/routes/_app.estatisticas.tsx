import { createFileRoute, Link } from "@tanstack/react-router";
import { Target, Flame, BookOpen, CalendarCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useUserStats } from "@/lib/user-stats";

export const Route = createFileRoute("/_app/estatisticas")({
  component: Estatisticas,
  head: () => ({ meta: [{ title: "Estatísticas · AprovaIA" }] }),
});

function Estatisticas() {
  const { stats, isLoading, isLoggedOut } = useUserStats();

  if (isLoggedOut) {
    return (
      <div className="p-8 max-w-[1400px]">
        <div className="p-10 rounded-2xl bg-surface ring-1 ring-hairline text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Entre na sua conta pra ver suas estatísticas.
          </p>
          <Button asChild size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading || !stats) {
    return (
      <div className="p-8 space-y-6 max-w-[1400px]">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl bg-surface" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-2xl bg-surface" />
      </div>
    );
  }

  if (stats.totalAnswered === 0) {
    return (
      <div className="p-8 max-w-[1400px] space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Estatísticas</h1>
          <p className="text-muted-foreground mt-2 text-sm">Sua evolução mensurada em tempo real.</p>
        </div>
        <div className="p-10 rounded-2xl bg-surface ring-1 ring-hairline text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            Você ainda não respondeu nenhuma questão. Assim que começar a praticar, suas
            estatísticas aparecem aqui.
          </p>
          <Button asChild size="sm">
            <Link to="/questoes">Ir para o banco de questões</Link>
          </Button>
        </div>
      </div>
    );
  }

  const areaOrder = stats.byArea.slice().sort((a, b) => b.total - a.total);
  const deltaAnswered = stats.thisMonth.total - stats.lastMonth.total;
  const deltaAccuracy = stats.thisMonth.accuracy - stats.lastMonth.accuracy;

  return (
    <div className="p-8 space-y-6 max-w-[1400px] animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sua evolução mensurada em tempo real, com base no que você já respondeu.
        </p>
      </div>

      {/* Big KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Acertos", value: `${stats.accuracy}%`, icon: Target },
          { label: "Questões respondidas", value: String(stats.totalAnswered), icon: BookOpen },
          {
            label: "Consecutivos",
            value: String(stats.streakDays),
            suffix: stats.streakDays === 1 ? "dia" : "dias",
            icon: Flame,
          },
          {
            label: "Este mês",
            value: String(stats.thisMonth.total),
            suffix: "respondidas",
            icon: CalendarCheck,
          },
        ].map((k) => (
          <div key={k.label} className="p-6 rounded-2xl bg-surface ring-1 ring-hairline">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                {k.label}
              </span>
              <k.icon className="size-3.5 text-brand" />
            </div>
            <div className="text-3xl font-semibold tabular-nums">{k.value}</div>
            {k.suffix && <div className="text-xs mt-1.5 text-muted-foreground">{k.suffix}</div>}
          </div>
        ))}
      </div>

      {/* Chart — evolução mensal (% de acerto por mês, últimos 12 meses) */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">Evolução mensal — % de acerto</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Últimos 12 meses</p>
          </div>
        </div>
        <div className="flex items-stretch gap-3 h-56">
          {stats.monthly.map((m, i) => (
            <div key={i} className="flex-1 h-full flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={[
                    "w-full rounded-t-md relative group cursor-pointer transition-all",
                    m.total === 0
                      ? "bg-white/5"
                      : i === stats.monthly.length - 1
                        ? "bg-gradient-to-t from-brand to-brand/40"
                        : "bg-white/10 hover:bg-white/15",
                  ].join(" ")}
                  style={{ height: m.total === 0 ? "2px" : `${Math.max(4, m.accuracy)}%` }}
                >
                  {m.total > 0 && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                      {m.accuracy}% ({m.total})
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column details */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
          <h3 className="font-semibold mb-6">Acertos vs. erros por área</h3>
          {areaOrder.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados suficientes ainda.</p>
          ) : (
            <div className="space-y-4">
              {areaOrder.map((s) => {
                const okPct = s.total === 0 ? 0 : Math.round((s.correct / s.total) * 100);
                const errPct = 100 - okPct;
                return (
                  <div key={s.area}>
                    <div className="flex justify-between text-xs mb-2">
                      <span className="font-medium">{s.area}</span>
                      <span className="text-muted-foreground tabular-nums">
                        <span className="text-emerald-400">{s.correct}</span> /{" "}
                        <span className="text-red-400">{s.total - s.correct}</span>
                      </span>
                    </div>
                    <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                      <div className="bg-emerald-400" style={{ width: `${okPct}%` }} />
                      <div className="bg-red-400/60" style={{ width: `${errPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
          <h3 className="font-semibold mb-6">Comparação mensal</h3>
          <div className="space-y-5">
            {[
              {
                label: "Questões respondidas",
                now: stats.thisMonth.total,
                prev: stats.lastMonth.total,
              },
              {
                label: "Precisão média",
                now: `${stats.thisMonth.accuracy}%`,
                prev: `${stats.lastMonth.accuracy}%`,
              },
            ].map((c) => (
              <div
                key={c.label}
                className="flex items-baseline justify-between border-b border-hairline pb-3 last:border-0"
              >
                <span className="text-sm">{c.label}</span>
                <div className="text-right">
                  <div className="text-lg font-semibold tabular-nums">{c.now}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    vs {c.prev} no mês anterior
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
