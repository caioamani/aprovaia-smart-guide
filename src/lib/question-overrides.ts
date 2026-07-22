import cartoonAsset from "@/assets/enem-2023-ling-q05-cartoon.png.asset.json";
import amamentarAsset from "@/assets/enem-2023-ling-q44-amamentar.png.asset.json";
import type { Question } from "./mock-questions";

// Ajustes pontuais aplicados sobre o que vem do banco — usado quando
// a API do ENEM não trouxe a imagem original (broken-image.svg) e a gente
// substitui manualmente pela versão certa.
type QuestionOverride = {
  addImages?: string[];
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
};

export function applyQuestionOverrides(q: Question): Question {
  const o = overrides[q.id];
  if (!o) return q;
  return {
    ...q,
    contextImages: [...(o.addImages ?? []), ...q.contextImages],
  };
}
