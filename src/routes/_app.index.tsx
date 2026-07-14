import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Play,
  CheckCircle2,
  Circle,
  Flame,
  Target,
  Clock,
  TrendingUp,
} from "lucide-react";
import { studySessions, type MetricKey } from "@/lib/mock-study";
import { MetricInfoDialog } from "@/components/MetricInfoDialog";
import { ReorganizeAIDialog } from "@/components/ReorganizeAIDialog";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
  head: () => ({
    meta: [
      { title: "Dashboard · AprovaIA" },
      { name: "description", content: "Seu plano de estudos personalizado do dia." },
    ],
  }),
});

const weekBars = [40, 65, 50, 90, 75, 20, 10];
const weekLabels = ["S", "T", "Q", "Q", "S", "S", "D"];

const stats: {
  key: MetricKey;
  label: string;
  value: string;
  suffix?: string;
  icon: typeof Flame;
  tint: string;
  delta?: string;
}[] = [
  { key: "streak", label: "Sequência", value: "12", suffix: "dias", icon: Flame, tint: "text-orange-400" },
  { key: "time", label: "Tempo hoje", value: "2h 15m", icon: Clock, tint: "text-brand" },
  { key: "accuracy", label: "Precisão média", value: "78%", icon: Target, tint: "text-emerald-400", delta: "+4%" },
  { key: "tri", label: "TRI estimada", value: "742.5", icon: TrendingUp, tint: "text-indigo-400", delta: "+18" },
];

function Dashboard() {
  const navigate = useNavigate();
  const [metricOpen, setMetricOpen] = useState<MetricKey | null>(null);
  const [reorgOpen, setReorgOpen] = useState(false);

  const activeSession = studySessions.find((s) => s.active) ?? studySessions[0];

  return (
    <div className="p-8 space-y-8 max-w-[1400px] animate-fade-in">
      {/* Greeting */}
      <section className="grid grid-cols-12 gap-8 items-end">
        <div className="col-span-8">
          <p className="text-xs font-mono uppercase tracking-widest text-brand mb-2">
            Terça-feira · 24 de abril
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-balance">
            Bom dia, Lucas.
          </h1>
          <p className="mt-3 text-muted-foreground text-pretty max-w-[60ch]">
            Você está a{" "}
            <span className="text-foreground font-medium">85% da meta semanal</span>. Hoje
            focaremos em preencher lacunas em Ciências da Natureza.
          </p>
        </div>
        <div className="col-span-4 flex gap-3 justify-end">
          <button
            onClick={() => setReorgOpen(true)}
            className="px-4 py-2.5 rounded-lg bg-surface ring-1 ring-hairline text-sm font-medium hover:bg-white/5 hover:ring-brand/30 transition inline-flex items-center gap-2 active:scale-[0.98]"
          >
            <Sparkles className="size-3.5 text-brand" />
            Reorganizar com IA
          </button>
          <button
            onClick={() => navigate({ to: "/sessao/$id", params: { id: activeSession.id } })}
            className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition inline-flex items-center gap-2 shadow-[0_0_0_1px_var(--color-brand)] active:scale-[0.98]"
          >
            <Play className="size-3.5 fill-current" />
            Retomar
          </button>
        </div>
      </section>

      {/* Stats row */}
      <section className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => setMetricOpen(s.key)}
            className="p-5 rounded-2xl bg-surface ring-1 ring-hairline text-left hover:ring-brand/30 hover:-translate-y-0.5 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                {s.label}
              </span>
              <s.icon className={`size-3.5 ${s.tint}`} />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums">{s.value}</span>
              {s.suffix && (
                <span className="text-xs text-muted-foreground">{s.suffix}</span>
              )}
            </div>
            {s.delta && (
              <p className="text-[11px] text-emerald-400 mt-1 font-medium">
                {s.delta} esta semana
              </p>
            )}
          </button>
        ))}
      </section>

      {/* Main grid */}
      <section className="grid grid-cols-12 gap-6">
        {/* Left: today plan */}
        <div className="col-span-8 space-y-6">
          <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
            <div className="p-6 flex items-center justify-between border-b border-hairline">
              <div>
                <h3 className="font-semibold">Plano de hoje</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  4 sessões · 2h 40min restantes
                </p>
              </div>
              <Link
                to="/cronograma"
                className="text-xs font-medium text-brand hover:underline"
              >
                Ver cronograma completo →
              </Link>
            </div>
            <div className="divide-y divide-hairline">
              {studySessions.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.id}
                    to="/sessao/$id"
                    params={{ id: item.id }}
                    className={[
                      "w-full p-5 flex items-center gap-4 transition-colors text-left group",
                      item.active ? "bg-brand/5 hover:bg-brand/10" : "hover:bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "size-10 rounded-lg grid place-items-center shrink-0 transition",
                        item.done
                          ? "bg-brand/10 text-brand"
                          : "bg-white/5 text-muted-foreground group-hover:text-brand group-hover:bg-brand/10",
                      ].join(" ")}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                          {item.subject}
                        </span>
                        {item.active && (
                          <span className="text-[10px] font-semibold text-brand uppercase tracking-widest">
                            · em foco
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium mt-0.5">{item.topic}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.duration} · {item.kind}
                      </p>
                    </div>
                    {item.done ? (
                      <CheckCircle2 className="size-5 text-brand shrink-0" />
                    ) : item.active ? (
                      <span className="px-3 py-1.5 rounded-md bg-brand text-brand-foreground text-xs font-semibold inline-flex items-center gap-1.5">
                        Continuar <ArrowRight className="size-3" />
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 rounded-md bg-white/5 ring-1 ring-hairline text-xs font-medium group-hover:bg-white/10 group-hover:ring-brand/30 transition">
                        Iniciar
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Performance by subject */}
          <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-semibold">Desempenho por matéria</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Últimos 30 dias
                </p>
              </div>
              <Link
                to="/estatisticas"
                className="text-xs font-medium text-brand hover:underline"
              >
                Análise completa →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              {[
                { name: "Linguagens", pct: 82, color: "bg-emerald-400" },
                { name: "Matemática", pct: 64, color: "bg-brand" },
                { name: "Ciências Humanas", pct: 74, color: "bg-indigo-400" },
                { name: "Ciências da Natureza", pct: 58, color: "bg-orange-400" },
                { name: "Redação", pct: 71, color: "bg-fuchsia-400" },
                { name: "Interdisciplinar", pct: 88, color: "bg-cyan-400" },
              ].map((s) => (
                <div key={s.name}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {s.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.color} transition-all`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: AI + progress */}
        <div className="col-span-4 space-y-6">
          {/* AI insight */}
          <Link
            to="/insight/$id"
            params={{ id: "termodinamica-entropia" }}
            className="block relative rounded-2xl bg-gradient-to-br from-brand/15 via-surface to-surface ring-1 ring-brand/20 p-6 overflow-hidden hover:ring-brand/40 hover:-translate-y-0.5 transition-all"
          >
            <div className="absolute -top-16 -right-16 size-40 bg-brand/25 blur-3xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-4 relative">
              <div className="size-6 rounded-full bg-brand/20 ring-1 ring-brand/30 grid place-items-center">
                <Sparkles className="size-3 text-brand" />
              </div>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
                Insight da IA
              </span>
            </div>
            <p className="text-sm leading-relaxed text-foreground/90 relative">
              "Baseado nos seus erros recentes em <strong>Termodinâmica</strong>, notei
              que o conceito de Entropia precisa reforço. Gerei 3 questões
              específicas para você."
            </p>
            <div className="mt-5 flex gap-2 relative">
              <span className="flex-1 py-2 px-3 rounded-lg bg-brand text-brand-foreground text-xs font-semibold text-center">
                Ver recomendação
              </span>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                className="py-2 px-3 rounded-lg bg-white/5 ring-1 ring-hairline text-xs font-medium hover:bg-white/10 transition"
              >
                Depois
              </button>
            </div>
          </Link>

          {/* Weekly progress */}
          <Link
            to="/estatisticas"
            className="block rounded-2xl bg-surface ring-1 ring-hairline p-6 hover:ring-brand/30 transition"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-sm">Foco semanal</h3>
              <span className="text-xs text-muted-foreground tabular-nums">
                24h 12m
              </span>
            </div>
            <div className="flex items-end justify-between h-24 gap-2">
              {weekBars.map((h, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex-1 flex items-end">
                    <div
                      className={[
                        "w-full rounded-sm transition-all",
                        i === 3 ? "bg-brand" : i === 4 ? "bg-brand/60" : "bg-white/10",
                      ].join(" ")}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {weekLabels.map((l, i) => (
                <span
                  key={i}
                  className="flex-1 text-center text-[10px] font-mono text-muted-foreground"
                >
                  {l}
                </span>
              ))}
            </div>
          </Link>

          {/* Next review */}
          <Link
            to="/cronograma"
            className="block rounded-2xl bg-surface ring-1 ring-hairline p-6 hover:ring-brand/30 transition"
          >
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Próxima revisão espaçada
            </span>
            <h4 className="text-lg font-semibold mt-2">Ciclo do Nitrogênio</h4>
            <p className="text-xs text-muted-foreground mt-1">
              Biologia · Amanhã, 09:00
            </p>
            <div className="mt-4 flex items-center gap-3 pt-4 border-t border-hairline">
              <Circle className="size-2 fill-emerald-400 text-emerald-400" />
              <span className="text-xs text-muted-foreground">
                Retenção estimada:{" "}
                <span className="text-foreground font-medium">92%</span>
              </span>
            </div>
          </Link>
        </div>
      </section>

      <MetricInfoDialog
        metric={metricOpen}
        open={metricOpen !== null}
        onOpenChange={(o) => !o && setMetricOpen(null)}
      />
      <ReorganizeAIDialog open={reorgOpen} onOpenChange={setReorgOpen} />
    </div>
  );
}
