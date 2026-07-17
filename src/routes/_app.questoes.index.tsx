import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { QuestionCard } from "@/components/questions/QuestionCard";
import {
  QuestionFilters,
  emptyFilters,
  type QuestionFiltersState,
} from "@/components/questions/QuestionFilters";
import { questionsStore, useQuestions } from "@/lib/questions-store";
import type { Difficulty, KnowledgeArea, Language } from "@/lib/mock-questions";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/_app/questoes/")({
  component: Questoes,
  head: () => ({ meta: [{ title: "Questões · AprovaIA" }] }),
});

function Questoes() {
  const questions = useQuestions();
  const [filters, setFilters] = useState<QuestionFiltersState>(emptyFilters);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const facets = useMemo(() => {
    const years = Array.from(new Set(questions.map((q) => q.year))).sort((a, b) => b - a);
    const areas = Array.from(new Set(questions.map((q) => q.area))) as KnowledgeArea[];
    const subjects = Array.from(new Set(questions.map((q) => q.subject))).sort();
    const difficulties: Difficulty[] = ["Fácil", "Média", "Difícil"];
    const languages: Language[] = ["Português", "Inglês", "Espanhol"];
    return { years, areas, subjects, difficulties, languages };
  }, [questions]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return questions.filter((it) => {
      if (filters.years.length && !filters.years.includes(it.year)) return false;
      if (filters.areas.length && !filters.areas.includes(it.area)) return false;
      if (filters.subjects.length && !filters.subjects.includes(it.subject)) return false;
      if (filters.difficulties.length && !filters.difficulties.includes(it.difficulty))
        return false;
      if (filters.languages.length && !filters.languages.includes(it.language)) return false;
      if (filters.onlyAnswered && it.status === "unanswered") return false;
      if (filters.onlyUnanswered && it.status !== "unanswered") return false;
      if (filters.onlyWrong && it.status !== "wrong") return false;
      if (filters.onlyFavorites && !it.favorite) return false;
      if (q) {
        const hay = `${it.subject} ${it.topic} ${it.statement} ${it.context}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [questions, filters, query]);

  // Sempre que os filtros ou a busca mudarem, volta pra primeira página —
  // senão o usuário pode ficar "preso" numa página que não existe mais
  // no novo resultado filtrado.
  useEffect(() => {
    setPage(1);
  }, [filters, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const rangeStart = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(currentPage * PAGE_SIZE, filtered.length);

  return (
    <div className="p-8 space-y-6 max-w-[1400px] animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Banco de questões</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {questions.length} questões oficiais do ENEM filtradas por IA. Refine sua prática abaixo.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl bg-surface ring-1 ring-hairline">
          <Search className="size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por matéria, tópico, palavra-chave…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
          />
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {filtered.length} resultado{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <QuestionFilters filters={filters} setFilters={setFilters} {...facets} />

        <div className="flex-1 space-y-3 min-w-0">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-2xl bg-surface" />
            ))
          ) : filtered.length === 0 ? (
            <div className="p-10 rounded-2xl bg-surface ring-1 ring-hairline text-center text-sm text-muted-foreground">
              Nenhuma questão encontrada com esses filtros.
            </div>
          ) : (
            <>
              {paged.map((q) => (
                <QuestionCard
                  key={q.id}
                  q={q}
                  onToggleFavorite={(id) => questionsStore.toggleFavorite(id)}
                />
              ))}

              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground tabular-nums">
                  Mostrando {rangeStart}–{rangeEnd} de {filtered.length}
                </p>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    disabled={currentPage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="size-4" />
                    Anterior
                  </Button>

                  <span className="text-xs text-muted-foreground tabular-nums px-2">
                    Página {currentPage} de {totalPages}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1"
                    disabled={currentPage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Próxima
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
