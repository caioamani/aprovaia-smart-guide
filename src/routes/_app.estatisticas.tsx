import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, Target, Flame, Clock, Award } from "lucide-react";

export const Route = createFileRoute("/_app/estatisticas")({
  component: Estatisticas,
  head: () => ({ meta: [{ title: "Estatísticas · AprovaIA" }] }),
});

const monthly = [42, 58, 65, 71, 68, 78, 82, 74, 88, 91, 85, 92];
const monthLabels = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

function Estatisticas() {
  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Estatísticas</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Sua evolução mensurada em tempo real. TRI, consistência e domínio.
        </p>
      </div>

      {/* Big KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "TRI estimada", value: "742.5", delta: "+18", up: true, icon: Award },
          { label: "Acertos", value: "78%", delta: "+4%", up: true, icon: Target },
          { label: "Tempo total", value: "126h", delta: "este mês", up: true, icon: Clock },
          { label: "Consecutivos", value: "12", delta: "dias", up: true, icon: Flame },
        ].map((k) => (
          <div key={k.label} className="p-6 rounded-2xl bg-surface ring-1 ring-hairline">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
                {k.label}
              </span>
              <k.icon className="size-3.5 text-brand" />
            </div>
            <div className="text-3xl font-semibold tabular-nums">{k.value}</div>
            <div
              className={`text-xs mt-1.5 flex items-center gap-1 ${k.up ? "text-emerald-400" : "text-red-400"}`}
            >
              {k.up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
              {k.delta}
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-semibold">Evolução mensal — TRI</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Últimos 12 meses
            </p>
          </div>
          <div className="flex gap-2">
            {["Semana", "Mês", "Ano"].map((p, i) => (
              <button
                key={p}
                className={[
                  "px-3 py-1.5 rounded-md text-xs font-medium",
                  i === 1 ? "bg-white/5 ring-1 ring-hairline" : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-3 h-56">
          {monthly.map((v, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex-1 flex items-end">
                <div
                  className={[
                    "w-full rounded-t-md relative group cursor-pointer transition-all",
                    i === monthly.length - 1
                      ? "bg-gradient-to-t from-brand to-brand/40"
                      : "bg-white/10 hover:bg-white/15",
                  ].join(" ")}
                  style={{ height: `${v}%` }}
                >
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono opacity-0 group-hover:opacity-100 transition">
                    {v * 8}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-muted-foreground">
                {monthLabels[i]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-column details */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
          <h3 className="font-semibold mb-6">Acertos vs. erros por área</h3>
          <div className="space-y-4">
            {[
              { name: "Linguagens", ok: 82, err: 18 },
              { name: "Matemática", ok: 64, err: 36 },
              { name: "Ciências Humanas", ok: 74, err: 26 },
              { name: "Ciências da Natureza", ok: 58, err: 42 },
            ].map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-medium">{s.name}</span>
                  <span className="text-muted-foreground tabular-nums">
                    <span className="text-emerald-400">{s.ok}</span> /{" "}
                    <span className="text-red-400">{s.err}</span>
                  </span>
                </div>
                <div className="flex h-2 rounded-full overflow-hidden bg-white/5">
                  <div className="bg-emerald-400" style={{ width: `${s.ok}%` }} />
                  <div className="bg-red-400/60" style={{ width: `${s.err}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6">
          <h3 className="font-semibold mb-6">Comparação mensal</h3>
          <div className="space-y-5">
            {[
              { label: "Questões respondidas", now: 1240, prev: 980 },
              { label: "Horas estudadas", now: 126, prev: 98 },
              { label: "Redações enviadas", now: 8, prev: 5 },
              { label: "Precisão média", now: "78%", prev: "71%" },
            ].map((c) => (
              <div key={c.label} className="flex items-baseline justify-between border-b border-hairline pb-3 last:border-0">
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
