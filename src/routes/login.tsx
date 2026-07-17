import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ meta: [{ title: "Entrar · AprovaIA" }] }),
});

function Login() {
  const { user, loading, signInWithPassword, signUp } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Já logado? Manda direto pro dashboard, sem mostrar a tela de login.
  useEffect(() => {
    if (!loading && user) {
      navigate({ to: "/" });
    }
  }, [loading, user, navigate]);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setInfo(null);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUp(email, password);

    setSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (mode === "signup") {
      // Dependendo da configuração do projeto Supabase, pode ser necessário
      // confirmar o e-mail antes do login funcionar.
      setInfo("Cadastro criado! Verifique seu e-mail para confirmar a conta antes de entrar.");
      return;
    }

    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="size-7 rounded-lg bg-brand/15 ring-1 ring-brand/30 grid place-items-center">
            <Sparkles className="size-3.5 text-brand" />
          </div>
          <span className="font-semibold tracking-tight text-lg">
            Aprova<span className="text-brand">IA</span>
          </span>
        </div>

        <div className="p-6 rounded-2xl bg-surface ring-1 ring-hairline space-y-5">
          <div className="flex rounded-lg bg-white/5 p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "signin" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                mode === "signup" ? "bg-brand text-brand-foreground" : "text-muted-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">E-mail</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 ring-1 ring-hairline focus:ring-brand/40 outline-none text-sm transition"
                placeholder="voce@email.com"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Senha</label>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 ring-1 ring-hairline focus:ring-brand/40 outline-none text-sm transition"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-500/10 ring-1 ring-red-500/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {info && (
              <p className="text-xs text-brand bg-brand/10 ring-1 ring-brand/20 rounded-lg px-3 py-2">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-lg bg-brand text-brand-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-brand/90 transition disabled:opacity-50"
            >
              {submitting && <Loader2 className="size-3.5 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
