import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Send,
  BookOpen,
  FileText,
  Lightbulb,
  Zap,
  GraduationCap,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { EloAvatar } from "@/components/EloAvatar";
import {
  buildGreeting,
  formatTutorText,
  useSendTutorMessage,
  useStudentContext,
  useTutorHistory,
  type TutorMessage,
} from "@/lib/ai-tutor";

export const Route = createFileRoute("/_app/ia")({
  component: IATutor,
  head: () => ({ meta: [{ title: "Elo IA · AprovaIA" }] }),
});

const quickActions: { icon: typeof Lightbulb; label: string; prompt: (topic: string) => string }[] =
  [
    {
      icon: Lightbulb,
      label: "Explicar",
      prompt: (t) => `Pode me explicar ${t} de um jeito simples?`,
    },
    { icon: FileText, label: "Criar resumo", prompt: (t) => `Cria um resumo curto sobre ${t}.` },
    {
      icon: BookOpen,
      label: "Mapa mental",
      prompt: (t) => `Monta um mapa mental (em texto) sobre ${t}.`,
    },
    {
      icon: Zap,
      label: "Gerar exercícios",
      prompt: (t) => `Gera 3 exercícios de ${t} no estilo ENEM.`,
    },
    {
      icon: GraduationCap,
      label: "Explicar como professor",
      prompt: (t) => `Explica ${t} como se fosse uma aula, com exemplos passo a passo.`,
    },
  ];

const GENERIC_TOPIC = "o que eu andei estudando";

function firstNameFromEmail(email: string | null | undefined): string {
  if (!email) return "aluno";
  const local = email.split("@")[0] ?? "aluno";
  const first = local.split(/[._-]/)[0] ?? local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function IATutor() {
  const { user } = useAuth();
  const firstName = firstNameFromEmail(user?.email);

  const { context } = useStudentContext();
  const { data: history, isLoading: loadingHistory } = useTutorHistory();
  const sendMessage = useSendTutorMessage();

  const [draft, setDraft] = useState("");
  const [sessionStart] = useState(() => Date.now());
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mensagem "otimista": mostrada na hora que o aluno manda, antes do
  // histórico (que só chega depois que a IA responde e salvamos tudo no
  // banco) ser recarregado. Evita a mensagem do usuário sumir enquanto
  // espera a resposta.
  const [pendingUserMessage, setPendingUserMessage] = useState<TutorMessage | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setSessionMinutes(Math.floor((Date.now() - sessionStart) / 60_000));
    }, 30_000);
    return () => clearInterval(id);
  }, [sessionStart]);

  // A "conversa" que a tela mostra: histórico salvo + saudação sintética
  // na frente (a saudação não é persistida — é sempre recalculada com base
  // no que o aluno errou recentemente).
  const messages: TutorMessage[] = useMemo(() => {
    const greeting: TutorMessage = {
      id: "greeting",
      role: "ai",
      text: buildGreeting(context, firstName),
      createdAt: "",
    };
    const base = !history || history.length === 0 ? [greeting] : history;

    // Se a mensagem otimista já chegou no histórico real (veio do banco),
    // não duplica ela na tela.
    const alreadyInHistory =
      pendingUserMessage &&
      base.some((m) => m.role === "user" && m.text === pendingUserMessage.text);

    if (pendingUserMessage && !alreadyInHistory) {
      return [...base, pendingUserMessage];
    }
    return base;
  }, [history, context, firstName, pendingUserMessage]);

  // Assim que o histórico real trouxer a mensagem otimista, descarta ela
  // (evita que a bolha "pisque" antes do refetch terminar).
  useEffect(() => {
    if (
      pendingUserMessage &&
      history?.some((m) => m.role === "user" && m.text === pendingUserMessage.text)
    ) {
      setPendingUserMessage(null);
    }
  }, [history, pendingUserMessage]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, sendMessage.isPending]);

  const topicForQuickActions = context?.recentMistakes[0]?.topic ?? GENERIC_TOPIC;

  function handleSend(textOverride?: string) {
    const text = (textOverride ?? draft).trim();
    if (!text || sendMessage.isPending) return;
    if (!user) {
      toast.error("Você precisa estar logado pra falar com a Elo IA.");
      return;
    }

    setDraft("");

    // Mostra a mensagem do aluno na hora, antes da IA começar a "pensar".
    setPendingUserMessage({
      id: `pending-${Date.now()}`,
      role: "user",
      text,
      createdAt: new Date().toISOString(),
    });

    sendMessage.mutate(
      { text, history: messages },
      {
        onError: (err) => {
          toast.error(err instanceof Error ? err.message : "Não foi possível enviar sua mensagem.");
          setDraft(text); // devolve o texto pro aluno não perder a pergunta
          setPendingUserMessage(null); // remove a bolha otimista, já que não foi salva
        },
      },
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="px-8 py-6 border-b border-hairline flex items-center justify-between">
        <div className="flex items-center gap-3">
          <EloAvatar className="size-10" />
          <div>
            <h1 className="font-semibold">Elo IA</h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online · Conhece todo o seu histórico
            </p>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">Sessão · {sessionMinutes} min</div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {loadingHistory ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Carregando sua conversa...
            </div>
          ) : (
            messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === "user" ? "justify-end" : ""}`}
              >
                {m.role === "ai" && <EloAvatar className="size-8" />}
                <div
                  className={[
                    "px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-[75%] whitespace-pre-wrap",
                    m.role === "user"
                      ? "bg-brand text-brand-foreground rounded-tr-sm"
                      : "bg-surface ring-1 ring-hairline rounded-tl-sm",
                  ].join(" ")}
                >
                  {formatTutorText(m.text)}
                </div>
              </div>
            ))
          )}

          {sendMessage.isPending && (
            <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <EloAvatar className="size-8" />
              <div className="px-5 py-3.5 rounded-2xl rounded-tl-sm text-sm bg-surface ring-1 ring-hairline inline-flex items-center gap-2 text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" />
                Pensando...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="border-t border-hairline p-6 bg-background/50 backdrop-blur">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="flex gap-2 flex-wrap">
            {quickActions.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setDraft(a.prompt(topicForQuickActions))}
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
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Pergunte qualquer coisa ao seu professor particular…"
              className="flex-1 bg-transparent resize-none outline-none text-sm placeholder:text-muted-foreground py-1"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={sendMessage.isPending || !draft.trim()}
              className="size-9 rounded-lg bg-brand text-brand-foreground grid place-items-center hover:bg-brand/90 transition shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            >
              {sendMessage.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}
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
