import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, ArrowRight, ArrowLeft, Check } from "lucide-react";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Configurar plano · AprovaIA" }] }),
});

type Question = {
  key: string;
  title: string;
  subtitle?: string;
  type: "single" | "multi" | "text";
  options?: string[];
  placeholder?: string;
};

const questions: Question[] = [
  {
    key: "objetivo",
    title: "Qual é o seu principal objetivo?",
    subtitle: "Vamos calibrar o plano com base na sua meta.",
    type: "single",
    options: ["Passar em Medicina", "Universidade pública", "Universidade privada com bolsa", "Melhorar minha nota", "Ainda estou decidindo"],
  },
  { key: "curso", title: "Qual curso você quer?", type: "text", placeholder: "Ex.: Medicina, Direito, Engenharia..." },
  { key: "nota", title: "Qual nota você quer alcançar?", type: "single", options: ["600–700", "700–800", "800+", "Não sei ainda"] },
  { key: "data", title: "Quando será sua prova?", type: "single", options: ["ENEM deste ano", "Próximo ano", "Ainda estou me preparando"] },
  { key: "horas", title: "Quantas horas por dia você pode estudar?", type: "single", options: ["Menos de 1h", "1–2h", "2–4h", "4h ou mais"] },
  { key: "dias", title: "Quantos dias por semana?", type: "single", options: ["3", "4", "5", "6", "Todos"] },
  { key: "horario", title: "Qual horário funciona melhor?", type: "single", options: ["Manhã", "Tarde", "Noite", "Madrugada"] },
  { key: "trabalha", title: "Você trabalha atualmente?", type: "single", options: ["Não", "Meio período", "Período integral"] },
  { key: "escola", title: "Você estuda em escola ou cursinho?", type: "single", options: ["Sim, escola regular", "Sim, cursinho", "Não, estudo por conta"] },
  { key: "dificuldades", title: "Onde você tem mais dificuldade?", subtitle: "Selecione todas que se aplicam", type: "multi", options: ["Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Redação", "Linguagens"] },
  { key: "facilidades", title: "E onde você tem mais facilidade?", type: "multi", options: ["Matemática", "Física", "Química", "Biologia", "História", "Geografia", "Redação", "Linguagens"] },
  { key: "forma", title: "Como você aprende melhor?", type: "single", options: ["Vídeos", "Resolvendo questões", "Resumos escritos", "Mapas mentais", "Explicações da IA", "Mistura de tudo"] },
  { key: "redacao", title: "Com que frequência quer fazer redação?", type: "single", options: ["1x por semana", "2x por semana", "3x por semana", "Todos os dias"] },
  { key: "desafio", title: "Qual seu maior desafio para estudar?", type: "single", options: ["Procrastinação", "Falta de tempo", "Ansiedade", "Esqueço o conteúdo", "Não consigo manter rotina"] },
  { key: "ajuste", title: "A IA pode ajustar seu plano automaticamente?", subtitle: "Recomendamos que sim — o plano ganha vida assim.", type: "single", options: ["Sim, sempre que fizer sentido", "Prefiro ajustar manualmente"] },
];

function Onboarding() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const q = questions[step];
  const progress = ((step + 1) / questions.length) * 100;
  const value = answers[q.key];
  const canProceed = q.type === "multi"
    ? Array.isArray(value) && value.length > 0
    : Boolean(value);

  function next() {
    if (step < questions.length - 1) setStep(step + 1);
  }

  function selectOption(opt: string) {
    if (q.type === "multi") {
      const current = (answers[q.key] as string[]) ?? [];
      const has = current.includes(opt);
      setAnswers({ ...answers, [q.key]: has ? current.filter((x) => x !== opt) : [...current, opt] });
    } else {
      setAnswers({ ...answers, [q.key]: opt });
      setTimeout(next, 250);
    }
  }

  const isLast = step === questions.length - 1;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top bar */}
      <header className="px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-lg bg-brand/15 ring-1 ring-brand/30 grid place-items-center">
            <Sparkles className="size-3.5 text-brand" />
          </div>
          <span className="font-semibold tracking-tight">
            Aprova<span className="text-brand">IA</span>
          </span>
        </div>
        <div className="text-xs text-muted-foreground font-mono">
          {step + 1} / {questions.length}
        </div>
      </header>

      {/* Progress */}
      <div className="px-8">
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-brand transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div key={step} className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand mb-3">
            Pergunta {step + 1}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            {q.title}
          </h1>
          {q.subtitle && (
            <p className="text-muted-foreground mt-3 text-sm">{q.subtitle}</p>
          )}

          <div className="mt-8 space-y-2.5">
            {q.type === "text" ? (
              <input
                autoFocus
                placeholder={q.placeholder}
                value={(value as string) ?? ""}
                onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
                className="w-full px-5 py-4 rounded-xl bg-surface ring-1 ring-hairline focus:ring-brand/40 outline-none text-base transition"
              />
            ) : (
              q.options?.map((opt) => {
                const selected = q.type === "multi"
                  ? ((value as string[]) ?? []).includes(opt)
                  : value === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => selectOption(opt)}
                    className={[
                      "w-full flex items-center justify-between gap-3 px-5 py-4 rounded-xl text-left transition-all",
                      selected
                        ? "bg-brand/10 ring-1 ring-brand/50"
                        : "bg-surface ring-1 ring-hairline hover:ring-brand/30 hover:bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <span className={`text-sm font-medium ${selected ? "text-foreground" : "text-foreground/85"}`}>
                      {opt}
                    </span>
                    {selected && (
                      <div className="size-5 rounded-full bg-brand grid place-items-center">
                        <Check className="size-3 text-brand-foreground" />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>

          <div className="mt-10 flex items-center justify-between">
            <button
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
              className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 inline-flex items-center gap-2 transition"
            >
              <ArrowLeft className="size-3.5" /> Voltar
            </button>
            {isLast ? (
              <Link
                to="/"
                className="px-6 py-3 rounded-lg bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand/90 transition disabled:opacity-40"
              >
                Gerar meu plano
                <Sparkles className="size-3.5" />
              </Link>
            ) : (
              <button
                onClick={next}
                disabled={!canProceed}
                className="px-6 py-3 rounded-lg bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center gap-2 hover:bg-brand/90 transition disabled:opacity-30"
              >
                Próximo <ArrowRight className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
