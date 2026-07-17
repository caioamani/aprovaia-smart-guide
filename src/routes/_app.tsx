import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_app")({
  component: RequireAuth,
});

function RequireAuth() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/login" });
    }
  }, [loading, user, navigate]);

  // Enquanto verifica a sessão (ou se não estiver logado, no instante antes
  // do redirecionamento acima acontecer), mostra um estado neutro de
  // carregamento em vez de piscar o app protegido.
  if (loading || !user) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-sm text-muted-foreground">Carregando…</p>
      </div>
    );
  }

  return <AppLayout />;
}
