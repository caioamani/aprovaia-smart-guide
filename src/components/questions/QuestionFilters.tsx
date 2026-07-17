import type { KnowledgeArea, Language } from "@/lib/mock-questions";
import { RotateCcw } from "lucide-react";

export type QuestionFiltersState = {
  years: number[];
  areas: KnowledgeArea[];
  subjects: string[];
  topics: string[];
  languages: Language[];
  onlyAnswered: boolean;
  onlyUnanswered: boolean;
  onlyWrong: boolean;
  onlyFavorites: boolean;
};

export const emptyFilters: QuestionFiltersState = {
  years: [],
  areas: [],
  subjects: [],
  topics: [],
  languages: [],
  onlyAnswered: false,
  onlyUnanswered: false,
  onlyWrong: false,
  onlyFavorites: false,
};

function CheckPill<T extends string | number>({
  label,
  active,
  onToggle,
}: {
  label: T;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={`px-2.5 py-1 rounded-full text-[11px] transition ring-1 ${
        active
          ? "bg-brand/15 ring-brand/40 text-brand"
          : "bg-white/5 ring-hairline text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function ToggleRow({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full text-left text-xs py-1.5"
    >
      <span className={active ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      <span
        className={`w-8 h-4 rounded-full relative transition ${active ? "bg-brand" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 size-3 rounded-full bg-white transition-all ${active ? "left-4" : "left-0.5"}`}
        />
      </span>
    </button>
  );
}

export function QuestionFilters({
  filters,
  setFilters,
  years,
  areas,
  languages,
}: {
  filters: QuestionFiltersState;
  setFilters: (f: QuestionFiltersState) => void;
  years: number[];
  areas: KnowledgeArea[];
  languages: Language[];
}) {
  const toggle = <K extends keyof QuestionFiltersState>(
    key: K,
    value: QuestionFiltersState[K] extends Array<infer U> ? U : never,
  ) => {
    const arr = filters[key] as Array<typeof value>;
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    setFilters({ ...filters, [key]: next });
  };

  const flip = (key: keyof QuestionFiltersState) =>
    setFilters({ ...filters, [key]: !filters[key] });

  return (
    <aside className="w-full lg:w-64 shrink-0 space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Filtros</h2>
        <button
          onClick={() => setFilters(emptyFilters)}
          className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <RotateCcw className="size-3" />
          Limpar
        </button>
      </div>

      <Section title="Ano do ENEM">
        {years.map((y) => (
          <CheckPill
            key={y}
            label={y}
            active={filters.years.includes(y)}
            onToggle={() => toggle("years", y)}
          />
        ))}
      </Section>

      <Section title="Área do conhecimento">
        {areas.map((a) => (
          <CheckPill
            key={a}
            label={a.replace(" e suas Tecnologias", "")}
            active={filters.areas.includes(a)}
            onToggle={() => toggle("areas", a)}
          />
        ))}
      </Section>

      <Section title="Idioma">
        {languages.map((l) => (
          <CheckPill
            key={l}
            label={l}
            active={filters.languages.includes(l)}
            onToggle={() => toggle("languages", l)}
          />
        ))}
      </Section>

      <div className="pt-3 border-t border-hairline space-y-1">
        <ToggleRow
          label="Apenas respondidas"
          active={filters.onlyAnswered}
          onToggle={() => flip("onlyAnswered")}
        />
        <ToggleRow
          label="Apenas não respondidas"
          active={filters.onlyUnanswered}
          onToggle={() => flip("onlyUnanswered")}
        />
        <ToggleRow
          label="Apenas erradas"
          active={filters.onlyWrong}
          onToggle={() => flip("onlyWrong")}
        />
        <ToggleRow
          label="Apenas favoritas"
          active={filters.onlyFavorites}
          onToggle={() => flip("onlyFavorites")}
        />
      </div>
    </aside>
  );
}
