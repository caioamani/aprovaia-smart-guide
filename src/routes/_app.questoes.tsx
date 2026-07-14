import { createFileRoute } from "@tanstack/react-router";
import { Search, Filter, Star, CheckCircle2, XCircle, Clock } from "lucide-react";

export const Route = createFileRoute("/_app/questoes")({
  component: Questoes,
  head: () => ({ meta: [{ title: "Questões · AprovaIA" }] }),
});

const tabs = ["Todas", "Favoritas", "Erradas", "Para revisão", "Respondidas"];

const questions = [
  {
    year: "ENEM 2023",
    subject: "Matemática",
    topic: "Funções exponenciais",
    difficulty: "Média",
    status: "correct",
    text: "Uma população de bactérias dobra a cada 3 horas. Se inicialmente há 500 bactérias, quantas haverá após 15 horas?",
  },
  {
    year: "ENEM 2022",
    subject: "Química",
    topic: "Estequiometria",
    difficulty: "Difícil",
    status: "wrong",
    text: "Considere a reação de combustão completa do metano. Qual é a massa de CO₂ produzida a partir de 32g de CH₄?",
  },
  {
    year: "ENEM 2024",
    subject: "História",
    topic: "Era Vargas",
    difficulty: "Fácil",
    status: "review",
    text: "O Estado Novo, implantado em 1937, caracterizou-se por uma série de medidas centralizadoras. Entre elas destaca-se:",
  },
  {
    year: "ENEM 2023",
    subject: "Física",
    topic: "Termodinâmica",
    difficulty: "Difícil",
    status: "wrong",
    text: "Em uma máquina térmica que opera segundo o ciclo de Carnot, a fonte quente está a 500 K e a fonte fria a 300 K. Qual é o rendimento máximo?",
  },
];

const statusMap = {
  correct: { icon: CheckCircle2, label: "Acertou", tint: "text-emerald-400" },
  wrong: { icon: XCircle, label: "Errou", tint: "text-red-400" },
  review: { icon: Clock, label: "Para revisão", tint: "text-brand" },
} as const;

function Questoes() {
  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Banco de questões</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Mais de 12.400 questões oficiais do ENEM filtradas por IA para você.
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface ring-1 ring-hairline">
          <Search className="size-4 text-muted-foreground" />
          <input
            placeholder="Buscar por matéria, tópico, palavra-chave…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <button className="px-4 py-3 rounded-xl bg-surface ring-1 ring-hairline text-sm font-medium inline-flex items-center gap-2 hover:bg-white/5 transition">
          <Filter className="size-4" /> Filtros
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-hairline">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={[
              "px-4 py-2.5 text-sm font-medium transition-colors -mb-px border-b-2",
              i === 0
                ? "border-brand text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Question list */}
      <div className="space-y-3">
        {questions.map((q, i) => {
          const s = statusMap[q.status as keyof typeof statusMap];
          return (
            <div
              key={i}
              className="p-5 rounded-2xl bg-surface ring-1 ring-hairline hover:ring-brand/30 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
                      {q.year}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {q.subject}
                    </span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {q.topic}
                    </span>
                    <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">
                      {q.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {q.text}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3 shrink-0">
                  <button className="opacity-40 hover:opacity-100 transition">
                    <Star className="size-4" />
                  </button>
                  <div
                    className={`flex items-center gap-1.5 text-[11px] font-medium ${s.tint}`}
                  >
                    <s.icon className="size-3.5" />
                    {s.label}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
