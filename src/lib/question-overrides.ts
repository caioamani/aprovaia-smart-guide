import cartoonAsset from "@/assets/enem-2023-ling-q05-cartoon.png.asset.json";
import amamentarAsset from "@/assets/enem-2023-ling-q44-amamentar.png.asset.json";
import laerteAsset from "@/assets/enem-2023-hum-q56-laerte.png.asset.json";
import q132AltAAsset from "@/assets/enem-2023-mat-q132-altA.png.asset.json";
import type { Question } from "./mock-questions";

// Ajustes pontuais aplicados sobre o que vem do banco — usado quando
// a API do ENEM não trouxe a imagem original (broken-image.svg) e a gente
// substitui manualmente pela versão certa.
type AlternativeLetter = "A" | "B" | "C" | "D" | "E";
type QuestionOverride = {
  addImages?: string[];
  alternativeImages?: Partial<Record<AlternativeLetter, string>>;
};

const overrides: Record<string, QuestionOverride> = {
  // ENEM 2023 · Linguagens · Q05 (inglês) — cartoon do cartoonstock.
  "3550fbf9-354e-426c-b2b4-60144a6d6baf": {
    addImages: [cartoonAsset.url],
  },
  // ENEM 2023 · Linguagens · Q44 — campanha "Por que é tão importante amamentar?".
  "4bcaeb63-4465-4ce0-a599-df30ae2e491d": {
    addImages: [amamentarAsset.url],
  },
  // ENEM 2023 · Ciências Humanas · Q56 — tirinha do Laerte.
  "f4e29a8b-307c-468f-85f9-46120c8d42bf": {
    addImages: [laerteAsset.url],
  },
  // ENEM 2023 · Matemática · Q132 — alternativa A (diagrama P x T).
  "8ba18de2-1302-4653-8341-e7e5d84045fb": {
    alternativeImages: { A: q132AltAAsset.url },
  },
};

export function applyQuestionOverrides(q: Question): Question {
  const o = overrides[q.id];
  if (!o) return q;
  return {
    ...q,
    contextImages: [...(o.addImages ?? []), ...q.contextImages],
    alternatives: o.alternativeImages
      ? q.alternatives.map((a) =>
          o.alternativeImages?.[a.letter]
            ? { ...a, image: o.alternativeImages[a.letter] }
            : a,
        )
      : q.alternatives,
  };
}
