import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, BookOpen, FileText, Lightbulb, Zap, GraduationCap } from "lucide-react";

export const Route = createFileRoute("/_app/ia")({
  component: IATutor,
  head: () => ({ meta: [{ title: "IA Professor · AprovaIA" }] }),
});

const quickActions = [
  { icon: Lightbulb, label: "Explicar" },
  { icon: FileText, label: "Criar resumo" },
  { icon: BookOpen, label: "Mapa mental" },
  { icon: Zap, label: "Gerar exercícios" },
  { icon: GraduationCap, label: "Explicar como professor" },
];

const messages = [
  {
    role: "ai",
    text: "Olá, Lucas. Vi que você errou 3 questões sobre Termodinâmica ontem. Quer que eu explique a 2ª Lei de uma forma mais visual?",
  },
  {
    role: "user",
    text: "Sim, explica como se eu nunca tivesse visto o conteúdo antes.",
  },
  {
    role: "ai",
    text: "Perfeito. Pense na entropia como uma medida da 'bagunça' de um sistema. Se você tem uma sala organizada e alguém entra e desorganiza tudo, a entropia aumentou. A 2ª Lei diz que, em qualquer processo natural, a entropia total do universo sempre aumenta ou permanece igual — nunca diminui espontaneamente.",
  },
];

function IATutor() {
  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-brand/15 ring-1 ring-brand/30 grid place-items-center">
            <Sparkles className="size-4 text-brand" />
          </div>
          <div>
            <h1 className="font-semibold">IA Professor</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online · Conhece todo o seu histórico
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Sessão · 12 min</div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}
            >
              {m.role === "ai" && (
                <div className="size-8 rounded-full bg-brand/15 ring-1 ring-brand/30 grid place-items-center shrink-0">
                  <Sparkles className="size-3.5 text-brand" />
                </div>
              )}
              <div
                className={[
                  "px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-[75%]",
                  m.role === "user"
                    ? "bg-brand text-brand-foreground rounded-tr-sm"
                    : "bg-surface ring-1 ring-hairline rounded-tl-sm",
                ].join(" ")}
              >
                {m.text}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-hairline p-6 bg-background/50 backdrop-blur">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((a) => (
              <button
                key={a.label}
                className="px-3 py-1.5 rounded-full bg-surface ring-1 ring-hairline text-xs font-medium inline-flex items-center gap-1.5 hover:bg-white/5 hover:ring-brand/30 transition"
              >
                <a.icon className="size-3 text-brand" />
                {a.label}
              </button>
            ))}
          </div>
          <div className="flex gap-3 items-end p-3 rounded-2xl bg-surface ring-1 ring-hairline focus-within:ring-brand/40 transition">
            <textarea
              rows={2}
              placeholder="Pergunte qualquer coisa ao seu professor particular…"
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground py-1"
            />
            <button className="size-9 rounded-lg bg-brand text-brand-foreground grid place-items-center hover:bg-brand/90 transition shrink-0">
              <Send className="size-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            A IA usa seu perfil e histórico para respostas personalizadas.
          </p>
        </div>
      </div>
    </div>
  );
}
