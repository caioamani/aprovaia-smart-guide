import { Check, X } from "lucide-react";
import type { Alternative } from "@/lib/mock-questions";

export function AlternativeItem({
  alt,
  selected,
  correct,
  answered,
  onSelect,
}: {
  alt: Alternative;
  selected: boolean;
  correct: boolean;
  answered: boolean;
  onSelect: () => void;
}) {
  const isRightAnswer = answered && correct;
  const isWrongSelected = answered && selected && !correct;

  let cls =
    "w-full text-left p-4 rounded-xl ring-1 transition-all flex items-start gap-3 group";
  if (isRightAnswer) cls += " bg-emerald-500/10 ring-emerald-500/40";
  else if (isWrongSelected) cls += " bg-red-500/10 ring-red-500/40";
  else if (selected) cls += " bg-brand/10 ring-brand/40";
  else cls += " bg-surface ring-hairline hover:ring-brand/30";

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={answered}
      className={cls}
    >
      <span
        className={`shrink-0 size-7 rounded-lg grid place-items-center text-xs font-semibold ring-1 ${
          isRightAnswer
            ? "bg-emerald-500 text-black ring-emerald-500"
            : isWrongSelected
              ? "bg-red-500 text-white ring-red-500"
              : selected
                ? "bg-brand text-black ring-brand"
                : "bg-white/5 ring-hairline text-foreground/80"
        }`}
      >
        {isRightAnswer ? <Check className="size-4" /> : isWrongSelected ? <X className="size-4" /> : alt.letter}
      </span>
      <span className="text-sm text-foreground/90 leading-relaxed pt-0.5">{alt.text}</span>
    </button>
  );
}
