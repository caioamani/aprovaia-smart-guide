import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Flag, Star, Sparkles, ChevronLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AlternativeItem } from "@/components/questions/AlternativeItem";
import { ProgressBar } from "@/components/questions/ProgressBar";
import { SessionStats, type SessionStatsData } from "@/components/questions/SessionStats";
import { ReportProblemDialog } from "@/components/questions/ReportProblemDialog";
import { questionsStore, useQuestions } from "@/lib/questions-store";

export const Route = createFileRoute("/_app/questoes/$id")({
  component: QuestionDetail,
  head: () => ({ meta: [{ title: "Resolver questão · AprovaIA" }] }),
});

function QuestionDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const questions = useQuestions();

  const index = useMemo(() => questions.findIndex((q) => q.id === id), [questions, id]);
  const q = index >= 0 ? questions[index] : undefined;

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);

  const [stats, setStats] = useState<SessionStatsData>({
    answered: 0,
    correct: 0,
    wrong: 0,
    elapsedSeconds: 0,
  });

  // simulated loading on question change
  useEffect(() => {
    setLoading(true);
    setSelected(null);
    setAnswered(false);
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, [id]);

  // stopwatch
  useEffect(() => {
    const t = setInterval(
      () => setStats((s) => ({ ...s, elapsedSeconds: s.elapsedSeconds + 1 })),
      1000,
    );
    return () => clearInterval(t);
  }, []);

  if (!q) {
    return (
      <div className="p-8 max-w-3xl">
        <p className="text-sm text-muted-foreground">Questão não encontrada.</p>
        <Button className="mt-4" onClick={() => navigate({ to: "/questoes" })}>
          Voltar ao banco
        </Button>
      </div>
    );
  }

  const prev = questions[index - 1];
  const next = questions[index + 1];

  const handleAnswer = () => {
    if (!selected || answered) return;
    setAnswered(true);
    const correct = selected === q.correct;
    questionsStore.setStatus(q.id, correct ? "correct" : "wrong");
    setStats((s) => ({
      ...s,
      answered: s.answered + 1,
      correct: s.correct + (correct ? 1 : 0),
      wrong: s.wrong + (correct ? 0 : 1),
    }));
    toast[correct ? "success" : "error"](
      correct ? "Boa! Você acertou." : `Errou. Resposta correta: ${q.correct}.`,
    );
  };

  const goTo = (targetId?: string) => {
    if (!targetId) return;
    navigate({ to: "/questoes/$id", params: { id: targetId } });
  };

  return (
    <div className="p-8 max-w-4xl space-y-6 animate-fade-in">
      <button
        onClick={() => navigate({ to: "/questoes" })}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
      >
        <ChevronLeft className="size-3.5" />
        Voltar ao banco
      </button>

      <ProgressBar current={index + 1} total={questions.length} />

      <SessionStats stats={stats} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/2 bg-surface" />
          <Skeleton className="h-24 w-full bg-surface" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full bg-surface" />
          ))}
        </div>
      ) : (
        <article className="space-y-6">
          {/* header */}
          <header className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
                Q{q.number.toString().padStart(2, "0")} · ENEM {q.year}
              </span>
              <span className="text-[10px] text-muted-foreground">·</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {q.area}
              </span>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">
                {q.subject}
              </span>
              <button
                onClick={() => questionsStore.toggleFavorite(q.id)}
                className="ml-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <Star className={`size-4 ${q.favorite ? "fill-brand text-brand" : ""}`} />
                {q.favorite ? "Favoritada" : "Favoritar"}
              </button>
              <button
                onClick={() => setReportOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
              >
                <Flag className="size-3.5" />
                Reportar
              </button>
            </div>
          </header>

          {/* context + statement */}
          <div className="p-5 rounded-2xl bg-surface ring-1 ring-hairline space-y-3">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Contexto
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-line">
              {q.context}
            </p>
          </div>
          <p className="text-base text-foreground leading-relaxed font-medium">
            {q.statement}
          </p>

          {/* alternatives */}
          <div className="space-y-2.5">
            {q.alternatives.map((a) => (
              <AlternativeItem
                key={a.letter}
                alt={a}
                selected={selected === a.letter}
                correct={q.correct === a.letter}
                answered={answered}
                onSelect={() => setSelected(a.letter)}
              />
            ))}
          </div>

          {/* explanation */}
          {answered && (
            <div className="p-5 rounded-2xl bg-brand/5 ring-1 ring-brand/30 space-y-2 animate-fade-in">
              <div className="flex items-center gap-2 text-xs font-medium text-brand uppercase tracking-widest">
                <Sparkles className="size-3.5" />
                Explicação da IA
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {q.explanation}
              </p>
            </div>
          )}

          {/* action bar */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <Button
              variant="ghost"
              onClick={() => goTo(prev?.id)}
              disabled={!prev}
              className="gap-1.5"
            >
              <ArrowLeft className="size-4" />
              Anterior
            </Button>

            {!answered ? (
              <Button
                onClick={handleAnswer}
                disabled={!selected}
                className="min-w-40"
              >
                Responder
              </Button>
            ) : (
              <Button
                onClick={() => (next ? goTo(next.id) : navigate({ to: "/questoes" }))}
                className="min-w-40"
              >
                {next ? "Continuar" : "Finalizar sessão"}
              </Button>
            )}

            <Button
              variant="ghost"
              onClick={() => goTo(next?.id)}
              disabled={!next}
              className="gap-1.5"
            >
              Próxima
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </article>
      )}

      <ReportProblemDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        questionNumber={q.number}
      />
    </div>
  );
}
