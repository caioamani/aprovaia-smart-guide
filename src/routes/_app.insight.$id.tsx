import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, ArrowRight, BookOpen } from "lucide-react";
import { insights } from "@/lib/mock-study";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/insight/$id")({
  component: InsightPage,
  head: () => ({ meta: [{ title: "Insight da IA · AprovaIA" }] }),
  loader: ({ params }) => {
    const insight = insights[params.id];
    if (!insight) throw notFound();
    return { insight };
  },
  notFoundComponent: () => (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">Insight não encontrado.</p>
    </div>
  ),
});

function InsightPage() {
  const { insight } = Route.useLoaderData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [going, setGoing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-6 animate-fade-in">
        <Skeleton className="h-4 w-32 bg-white/5" />
        <Skeleton className="h-10 w-2/3 bg-white/5" />
        <Skeleton className="h-40 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-56 w-full bg-white/5 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition mb-6"
      >
        <ArrowLeft className="size-3.5" />
        Voltar ao dashboard
      </Link>

      <div className="flex items-center gap-2 mb-3">
        <div className="size-8 rounded-full bg-brand/15 ring-1 ring-brand/30 grid place-items-center">
          <Sparkles className="size-4 text-brand" />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
          Insight da IA
        </span>
      </div>

      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">
        {insight.subject}
      </p>
      <h1 className="text-3xl font-semibold tracking-tight mb-8">{insight.title}</h1>

      <div className="rounded-2xl bg-gradient-to-br from-brand/10 via-surface to-surface ring-1 ring-brand/20 p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 size-40 bg-brand/20 blur-3xl pointer-events-none" />
        <p className="text-[10px] font-mono uppercase tracking-widest text-brand mb-3 relative">
          Por que essa recomendação?
        </p>
        <p className="text-sm leading-relaxed text-foreground/90 relative">
          {insight.reason}
        </p>
      </div>

      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-brand" />
          <p className="text-sm font-semibold">Conteúdos relacionados</p>
        </div>
        <div className="space-y-2">
          {insight.related.map((r: string, i: number) => (
            <button
              key={i}
              className="w-full text-left p-3 rounded-lg ring-1 ring-hairline hover:ring-brand/30 hover:bg-white/[0.02] transition text-sm flex items-center justify-between group"
            >
              <span>{r}</span>
              <ArrowRight className="size-3.5 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition" />
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => {
          setGoing(true);
          setTimeout(() => navigate({ to: "/questoes" }), 700);
        }}
        disabled={going}
        className="w-full py-4 rounded-xl bg-brand text-brand-foreground font-semibold hover:bg-brand/90 transition inline-flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70"
      >
        {going ? (
          "Carregando questões…"
        ) : (
          <>
            Resolver {insight.questionsCount} questões desse assunto
            <ArrowRight className="size-4" />
          </>
        )}
      </button>
    </div>
  );
}
