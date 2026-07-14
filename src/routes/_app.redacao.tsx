import { createFileRoute } from "@tanstack/react-router";
import { Upload, Camera, FileText, Sparkles, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/redacao")({
  component: Redacao,
  head: () => ({ meta: [{ title: "Redação · AprovaIA" }] }),
});

const competencias = [
  { n: "I", nome: "Domínio da norma culta", score: 160 },
  { n: "II", nome: "Compreensão da proposta", score: 180 },
  { n: "III", nome: "Argumentação", score: 140 },
  { n: "IV", nome: "Coesão textual", score: 160 },
  { n: "V", nome: "Proposta de intervenção", score: 120 },
];

function Redacao() {
  return (
    <div className="p-8 space-y-6 max-w-[1400px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Redação</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Correção pela IA nas 5 competências do ENEM em menos de 60 segundos.
        </p>
      </div>

      {/* Send options */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: FileText, label: "Digitar", desc: "Editor com contador de linhas" },
          { icon: Upload, label: "Upload", desc: "PDF ou imagem escaneada" },
          { icon: Camera, label: "Foto", desc: "Capture com a câmera" },
        ].map((o) => (
          <button
            key={o.label}
            className="p-6 rounded-2xl bg-surface ring-1 ring-hairline text-left hover:ring-brand/40 hover:bg-white/[0.02] transition-all group"
          >
            <div className="size-10 rounded-lg bg-brand/10 grid place-items-center mb-4 group-hover:bg-brand/20 transition">
              <o.icon className="size-4 text-brand" />
            </div>
            <h3 className="font-semibold">{o.label}</h3>
            <p className="text-xs text-muted-foreground mt-1">{o.desc}</p>
          </button>
        ))}
      </div>

      {/* Latest correction */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline overflow-hidden">
        <div className="p-6 border-b border-hairline flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="size-3.5 text-brand" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
                Última correção
              </span>
            </div>
            <h3 className="font-semibold">Tema: Efeitos da IA na sociedade brasileira</h3>
            <p className="text-xs text-muted-foreground mt-1">Enviada há 2 dias</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              Nota estimada
            </p>
            <p className="text-4xl font-semibold tabular-nums mt-1">
              760<span className="text-lg text-muted-foreground">/1000</span>
            </p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-5 gap-3">
          {competencias.map((c) => (
            <div key={c.n} className="p-4 rounded-xl bg-white/5 ring-1 ring-hairline">
              <div className="flex items-center gap-2 mb-2">
                <div className="size-6 rounded-full bg-brand/15 grid place-items-center text-[10px] font-semibold text-brand">
                  {c.n}
                </div>
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  Comp.
                </span>
              </div>
              <p className="text-[11px] font-medium leading-tight mb-3">
                {c.nome}
              </p>
              <div className="text-xl font-semibold tabular-nums">
                {c.score}
                <span className="text-[10px] text-muted-foreground">/200</span>
              </div>
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full"
                  style={{ width: `${(c.score / 200) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 border-t border-hairline space-y-3">
          <p className="text-[10px] font-mono uppercase tracking-widest text-brand mb-2">
            Sugestões da IA
          </p>
          {[
            "Aprofunde a competência III com mais dados estatísticos concretos.",
            "A proposta de intervenção pode detalhar melhor o agente responsável.",
            "Excelente uso de repertório sociocultural em Zygmunt Bauman.",
          ].map((s, i) => (
            <div key={i} className="flex items-start gap-3">
              <CheckCircle2 className="size-4 text-brand shrink-0 mt-0.5" />
              <p className="text-sm text-foreground/85">{s}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
