import { createFileRoute } from "@tanstack/react-router";
import { Check, X, Crown, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_app/premium")({
  component: Premium,
  head: () => ({ meta: [{ title: "Premium · AprovaIA" }] }),
});

const features: { label: string; free: boolean | string; premium: boolean | string }[] = [
  { label: "Plano de estudos personalizado", free: true, premium: true },
  { label: "Banco de questões oficial ENEM", free: "Limitado", premium: "Ilimitado" },
  { label: "Correções de redação por IA", free: "2/mês", premium: "Ilimitadas" },
  { label: "Elo IA 24/7", free: "20 msgs/dia", premium: "Ilimitado" },
  { label: "Simulados TRI completos", free: false, premium: true },
  { label: "Mapas mentais gerados por IA", free: false, premium: true },
  { label: "Reorganização automática do cronograma", free: false, premium: true },
  { label: "Análise preditiva de desempenho", free: false, premium: true },
  { label: "Sem anúncios", free: false, premium: true },
];

function Cell({ v }: { v: boolean | string }) {
  if (v === true) return <Check className="size-4 text-brand mx-auto" />;
  if (v === false) return <X className="size-4 text-muted-foreground/40 mx-auto" />;
  return <span className="text-xs text-foreground/80">{v}</span>;
}

function Premium() {
  return (
    <div className="p-8 max-w-[1000px] space-y-8">
      <div className="text-center py-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/10 ring-1 ring-brand/30 mb-6">
          <Crown className="size-3.5 text-brand" />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-brand">
            AprovaIA Premium
          </span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight max-w-xl mx-auto text-balance">
          Seu professor particular de IA, sem limites.
        </h1>
        <p className="text-muted-foreground mt-3 max-w-lg mx-auto">
          Correções ilimitadas, simulados TRI e uma IA que se molda ao seu ritmo.
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-6 rounded-2xl bg-surface ring-1 ring-hairline">
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            Gratuito
          </p>
          <p className="text-3xl font-semibold mt-2">R$ 0</p>
          <p className="text-xs text-muted-foreground mt-1">Para sempre</p>
          <button className="w-full mt-6 py-2.5 rounded-lg bg-white/5 ring-1 ring-hairline text-sm font-medium">
            Plano atual
          </button>
        </div>
        <div className="p-6 rounded-2xl bg-gradient-to-br from-brand/20 via-surface to-surface ring-1 ring-brand/40 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-40 bg-brand/30 blur-3xl pointer-events-none" />
          <div className="flex items-center gap-2 relative">
            <Sparkles className="size-3.5 text-brand" />
            <p className="text-[10px] font-mono uppercase tracking-widest text-brand">
              Premium
            </p>
          </div>
          <p className="text-3xl font-semibold mt-2 relative">
            R$ 39<span className="text-sm text-muted-foreground">/mês</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1 relative">
            Cancele quando quiser
          </p>
          <button className="w-full mt-6 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition relative">
            Fazer upgrade
          </button>
        </div>
      </div>

      {/* Comparison table */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px] p-5 border-b border-hairline text-xs">
          <span className="font-semibold">Recursos</span>
          <span className="text-center text-muted-foreground uppercase tracking-widest text-[10px] font-mono">
            Gratuito
          </span>
          <span className="text-center text-brand uppercase tracking-widest text-[10px] font-mono">
            Premium
          </span>
        </div>
        <div className="divide-y divide-hairline">
          {features.map((f) => (
            <div key={f.label} className="grid grid-cols-[1fr_120px_120px] p-5 items-center text-sm">
              <span className="text-foreground/85">{f.label}</span>
              <div className="text-center"><Cell v={f.free} /></div>
              <div className="text-center"><Cell v={f.premium} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
