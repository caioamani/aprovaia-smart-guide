import { Star, CheckCircle2, XCircle, Circle } from "lucide-react";
import { Link } from "@tanstack/react-router";
import type { Question } from "@/lib/mock-questions";
import type { QuestionFiltersState } from "./QuestionFilters";

export function QuestionCard({
  q,
  onToggleFavorite,
  listContext,
}: {
  q: Question;
  onToggleFavorite: (id: string) => void;
  // Filtro + busca atualmente aplicados na listagem — repassado na URL pra
  // que "Anterior"/"Próxima" na tela de detalhe respeitem esse recorte.
  listContext: QuestionFiltersState & { q: string };
}) {
  const StatusIcon =
    q.status === "correct" ? CheckCircle2 : q.status === "wrong" ? XCircle : Circle;
  const statusTint =
    q.status === "correct"
      ? "text-emerald-400"
      : q.status === "wrong"
        ? "text-red-400"
        : "text-muted-foreground";
  const statusLabel =
    q.status === "correct"
      ? "Respondida"
      : q.status === "wrong"
        ? "Errada"
        : "Não respondida";

  return (
    <div className="p-5 rounded-2xl bg-surface ring-1 ring-hairline hover:ring-brand/30 transition-all group animate-fade-in">
      <div className="flex items-start justify-between gap-4">
        <Link
          to="/questoes/$id"
          params={{ id: q.id }}
          search={listContext}
          className="flex-1 min-w-0 cursor-pointer"
        >
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
              Q{q.number.toString().padStart(2, "0")} · ENEM {q.year}
            </span>
            <span className="text-[10px] text-muted-foreground">·</span>
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
              {q.subject}
            </span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-white/5 text-[10px] text-muted-foreground">
              {q.language}
            </span>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed line-clamp-2">
            {q.statement}
          </p>
        </Link>
        <div className="flex flex-col items-end gap-3 shrink-0">
          <button
            onClick={() => onToggleFavorite(q.id)}
            className="transition hover:scale-110"
            aria-label="Favoritar"
          >
            <Star
              className={`size-4 ${q.favorite ? "fill-brand text-brand" : "opacity-40 hover:opacity-100"}`}
            />
          </button>
          <div className={`flex items-center gap-1.5 text-[11px] font-medium ${statusTint}`}>
            <StatusIcon className="size-3.5" />
            {statusLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
