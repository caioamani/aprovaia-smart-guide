import { createFileRoute, Link } from "@tanstack/react-router";
import { Crown, Edit3, Target, Clock, LogOut } from "lucide-react";

export const Route = createFileRoute("/_app/perfil")({
  component: Perfil,
  head: () => ({ meta: [{ title: "Perfil · AprovaIA" }] }),
});

function Perfil() {
  return (
    <div className="p-8 space-y-6 max-w-[1000px]">
      <div className="rounded-2xl bg-gradient-to-br from-brand/15 via-surface to-surface ring-1 ring-brand/20 p-8">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-5">
            <div className="size-20 rounded-full bg-gradient-to-br from-brand to-indigo-500 grid place-items-center text-2xl font-semibold text-brand-foreground">
              L
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand">
                  Plano Premium
                </span>
                <Crown className="size-3 text-brand" />
              </div>
              <h1 className="text-2xl font-semibold">Lucas Andrade</h1>
              <p className="text-sm text-muted-foreground mt-1">
                lucas.andrade@email.com · membro desde jan/2024
              </p>
            </div>
          </div>
          <button className="px-4 py-2 rounded-lg bg-surface ring-1 ring-hairline text-sm font-medium inline-flex items-center gap-2 hover:bg-white/5 transition">
            <Edit3 className="size-3.5" />
            Editar perfil
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-8">
          <div className="p-4 rounded-xl bg-white/5">
            <Target className="size-4 text-brand mb-2" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Objetivo
            </p>
            <p className="text-sm font-medium">Medicina · USP</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <Target className="size-4 text-brand mb-2" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Nota meta
            </p>
            <p className="text-sm font-medium">780+</p>
          </div>
          <div className="p-4 rounded-xl bg-white/5">
            <Clock className="size-4 text-brand mb-2" />
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
              Rotina
            </p>
            <p className="text-sm font-medium">3h/dia · 6 dias</p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="rounded-2xl bg-surface ring-1 ring-hairline divide-y divide-hairline">
        {[
          { label: "Editar questionário", desc: "Refaça o onboarding para ajustar seu plano" },
          { label: "Preferências de estudo", desc: "Horários, notificações e ritmo" },
          { label: "Editar perfil", desc: "Nome, e-mail e foto" },
          { label: "Plano Premium", desc: "Ver benefícios ativos", to: "/premium" },
          { label: "Configurações", desc: "Tema, idioma, privacidade", to: "/configuracoes" },
        ].map((s) => {
          const Comp = s.to ? Link : "button";
          return (
            <Comp
              key={s.label}
              // @ts-expect-error dynamic component
              to={s.to}
              className="w-full text-left p-5 flex items-center justify-between hover:bg-white/[0.02] transition"
            >
              <div>
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
              </div>
              <span className="text-muted-foreground">→</span>
            </Comp>
          );
        })}
      </div>

      <button className="w-full p-4 rounded-2xl bg-surface ring-1 ring-hairline text-sm text-red-400 font-medium hover:bg-red-500/5 transition inline-flex items-center justify-center gap-2">
        <LogOut className="size-4" />
        Sair da conta
      </button>
    </div>
  );
}
