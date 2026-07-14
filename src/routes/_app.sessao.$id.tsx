import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Play, Clock, Target, ListChecks, BookOpen } from "lucide-react";
import { studySessions } from "@/lib/mock-study";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_app/sessao/$id")({
  component: SessionPage,
  head: ({ params }) => ({
    meta: [{ title: `Sessão · ${params.id} · AprovaIA` }],
  }),
  loader: ({ params }) => {
    const session = studySessions.find((s) => s.id === params.id);
    if (!session) throw notFound();
    return { session };
  },
  notFoundComponent: () => (
    <div className="p-8">
      <p className="text-sm text-muted-foreground">Sessão não encontrada.</p>
      <Link to="/" className="text-brand text-sm hover:underline">
        ← Voltar ao dashboard
      </Link>
    </div>
  ),
});

function SessionPage() {
  const { session } = Route.useLoaderData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const Icon = session.icon;

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const handleStart = () => {
    setStarting(true);
    setTimeout(() => navigate({ to: "/questoes" }), 900);
  };

  if (loading) {
    return (
      <div className="p-8 max-w-3xl space-y-6 animate-fade-in">
        <Skeleton className="h-4 w-32 bg-white/5" />
        <Skeleton className="h-10 w-2/3 bg-white/5" />
        <Skeleton className="h-32 w-full bg-white/5 rounded-2xl" />
        <Skeleton className="h-48 w-full bg-white/5 rounded-2xl" />
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

      <div className="flex items-start gap-4 mb-8">
        <div className="size-12 rounded-xl bg-brand/15 ring-1 ring-brand/30 grid place-items-center shrink-0">
          <Icon className="size-5 text-brand" />
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand mb-1">
            {session.subject}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{session.topic}</h1>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-8">
        <MetaCard icon={Target} label="Objetivo" value={session.kind} />
        <MetaCard icon={Clock} label="Tempo previsto" value={session.duration} />
        <MetaCard
          icon={ListChecks}
          label="Questões"
          value={session.questions > 0 ? `${session.questions} exercícios` : "Sem questões"}
        />
      </div>

      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 mb-6 hover:ring-brand/20 transition">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
          Objetivo da sessão
        </p>
        <p className="text-sm leading-relaxed text-foreground/90">{session.objective}</p>
      </div>

      <div className="rounded-2xl bg-surface ring-1 ring-hairline p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="size-4 text-brand" />
          <p className="text-sm font-semibold">Conteúdo que será estudado</p>
        </div>
        <ul className="space-y-2.5">
          {session.content.map((c: string, i: number) => (
            <li key={i} className="flex items-start gap-3 text-sm text-foreground/90">
              <span className="mt-1.5 size-1.5 rounded-full bg-brand shrink-0" />
              {c}
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={handleStart}
        disabled={starting}
        className="w-full py-4 rounded-xl bg-brand text-brand-foreground font-semibold hover:bg-brand/90 transition inline-flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-70"
      >
        {starting ? (
          <>
            <span className="size-2 rounded-full bg-brand-foreground animate-pulse" />
            Iniciando sessão…
          </>
        ) : (
          <>
            <Play className="size-4 fill-current" />
            Começar sessão
          </>
        )}
      </button>
    </div>
  );
}

function MetaCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Target;
  label: string;
  value: string;
}) {
  return (
    <div className="p-4 rounded-xl bg-surface ring-1 ring-hairline hover:ring-brand/20 hover:-translate-y-0.5 transition">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="size-3 text-brand" />
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
