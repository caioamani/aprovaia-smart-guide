import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, ChevronLeft, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/_app/cronograma")({
  component: Cronograma,
  head: () => ({ meta: [{ title: "Cronograma · AprovaIA" }] }),
});

const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const hours = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];

const blocks: {
  day: number;
  hour: number;
  span: number;
  subject: string;
  title: string;
  color: string;
}[] = [
  { day: 0, hour: 0, span: 2, subject: "Matemática", title: "Logaritmos", color: "bg-brand/15 ring-brand/30 text-brand" },
  { day: 0, hour: 3, span: 2, subject: "Redação", title: "Repertório", color: "bg-fuchsia-500/15 ring-fuchsia-500/30 text-fuchsia-300" },
  { day: 1, hour: 1, span: 2, subject: "Física", title: "Termodinâmica", color: "bg-orange-500/15 ring-orange-500/30 text-orange-300" },
  { day: 1, hour: 4, span: 1, subject: "História", title: "Era Vargas", color: "bg-indigo-500/15 ring-indigo-500/30 text-indigo-300" },
  { day: 2, hour: 0, span: 3, subject: "Simulado", title: "Ciências Natureza", color: "bg-emerald-500/15 ring-emerald-500/30 text-emerald-300" },
  { day: 3, hour: 2, span: 2, subject: "Química", title: "Estequiometria", color: "bg-cyan-500/15 ring-cyan-500/30 text-cyan-300" },
  { day: 4, hour: 0, span: 2, subject: "Biologia", title: "Genética", color: "bg-lime-500/15 ring-lime-500/30 text-lime-300" },
  { day: 4, hour: 3, span: 2, subject: "Redação", title: "Produção textual", color: "bg-fuchsia-500/15 ring-fuchsia-500/30 text-fuchsia-300" },
  { day: 5, hour: 1, span: 3, subject: "Revisão", title: "Semana consolidada", color: "bg-white/5 ring-white/10 text-foreground/70" },
];

function Cronograma() {
  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Cronograma</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Semana de 22 a 28 de abril · gerado e ajustado pela IA.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="px-3 py-2 rounded-lg bg-surface ring-1 ring-hairline hover:bg-white/5 transition">
            <ChevronLeft className="size-4" />
          </button>
          <button className="px-4 py-2 rounded-lg bg-surface ring-1 ring-hairline text-sm font-medium hover:bg-white/5 transition">
            Hoje
          </button>
          <button className="px-3 py-2 rounded-lg bg-surface ring-1 ring-hairline hover:bg-white/5 transition">
            <ChevronRight className="size-4" />
          </button>
          <button className="ml-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand/90 transition">
            <Sparkles className="size-3.5" />
            Reorganizar
          </button>
        </div>
      </div>

      {/* Calendar */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 overflow-x-auto">
        <div className="grid grid-cols-[80px_repeat(7,minmax(0,1fr))] gap-2 min-w-[900px]">
          <div />
          {days.map((d, i) => (
            <div key={d} className="text-center pb-3 border-b border-hairline">
              <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                {d}
              </p>
              <p className={`text-lg font-semibold mt-1 ${i === 1 ? "text-brand" : ""}`}>
                {22 + i}
              </p>
            </div>
          ))}

          {hours.map((h, hi) => (
            <div key={h} className="contents">
              <div className="text-[10px] font-mono text-muted-foreground pt-2">
                {h}
              </div>
              {days.map((_, di) => {
                const block = blocks.find((b) => b.day === di && b.hour === hi);
                return (
                  <div key={di} className="relative h-16 border-t border-hairline">
                    {block && (
                      <div
                        className={[
                          "absolute inset-x-0 top-1 rounded-lg p-2 ring-1 cursor-pointer",
                          block.color,
                        ].join(" ")}
                        style={{ height: `${block.span * 4}rem - 0.5rem` , bottom: 'auto', minHeight: `${block.span * 4 - 0.5}rem`}}
                      >
                        <p className="text-[9px] font-mono uppercase tracking-widest opacity-80">
                          {block.subject}
                        </p>
                        <p className="text-xs font-semibold mt-0.5 leading-tight">
                          {block.title}
                        </p>
                      </div>
                    )}
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
