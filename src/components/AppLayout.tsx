import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  BookOpenCheck,
  Sparkles,
  CalendarDays,
  BarChart3,
  PenLine,
  User,
  Settings,
  Crown,
  Flame,
  Bell,
  Search,
} from "lucide-react";
import type { ComponentType } from "react";

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const primaryNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/questoes", label: "Questões", icon: BookOpenCheck },
  { to: "/ia", label: "IA Professor", icon: Sparkles },
  { to: "/cronograma", label: "Cronograma", icon: CalendarDays },
  { to: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
  { to: "/redacao", label: "Redação", icon: PenLine },
];

const secondaryNav: NavItem[] = [
  { to: "/perfil", label: "Perfil", icon: User },
  { to: "/configuracoes", label: "Configurações", icon: Settings },
];

function Crumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const item = [...primaryNav, ...secondaryNav].find((n) => n.to === pathname);
  const label = item?.label ?? "Dashboard";
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>Início</span>
      <span className="opacity-40">/</span>
      <span className="text-foreground/80 font-medium">{label}</span>
    </div>
  );
}

function SidebarLink({ item }: { item: NavItem }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = pathname === item.to;
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className={[
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-white/5 text-foreground shadow-[inset_0_0_0_1px_var(--color-hairline)]"
          : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
      ].join(" ")}
    >
      <Icon
        className={[
          "size-4 shrink-0",
          active ? "text-brand" : "text-muted-foreground",
        ].join(" ")}
      />
      <span>{item.label}</span>
    </Link>
  );
}

export function AppLayout() {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 border-r border-hairline flex flex-col p-6 sticky top-0 h-screen">
        <div className="mb-10 flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-brand/15 ring-1 ring-brand/30 flex items-center justify-center">
            <Sparkles className="size-4 text-brand" />
          </div>
          <span className="text-lg font-semibold tracking-tight">
            Aprova<span className="text-brand">IA</span>
          </span>
        </div>

        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 mb-2 px-3">
          Estudo
        </p>
        <nav className="space-y-1">
          {primaryNav.map((n) => (
            <SidebarLink key={n.to} item={n} />
          ))}
        </nav>

        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 mt-8 mb-2 px-3">
          Conta
        </p>
        <nav className="space-y-1">
          {secondaryNav.map((n) => (
            <SidebarLink key={n.to} item={n} />
          ))}
        </nav>

        <div className="mt-auto space-y-4">
          <Link
            to="/premium"
            className="block p-4 rounded-xl bg-gradient-to-br from-brand/20 via-brand/5 to-transparent ring-1 ring-brand/20 hover:ring-brand/40 transition"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Crown className="size-3.5 text-brand" />
              <span className="text-[11px] uppercase tracking-widest font-semibold text-brand">
                Premium
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Correções ilimitadas e simulados TRI.
            </p>
          </Link>

          <div className="p-4 rounded-xl bg-surface ring-1 ring-hairline">
            <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-widest">
              Nível 14
            </p>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-brand w-2/3" />
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">1.240 / 2.000 XP</p>
          </div>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-hairline flex items-center justify-between px-8 sticky top-0 bg-background/80 backdrop-blur-xl z-10">
          <Crumb />
          <div className="flex items-center gap-5">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface ring-1 ring-hairline text-xs text-muted-foreground w-64">
              <Search className="size-3.5" />
              <span>Buscar matéria, tópico…</span>
              <kbd className="ml-auto text-[10px] font-mono opacity-60">⌘K</kbd>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="size-3.5 text-orange-400" />
              <span className="text-xs font-medium">12 dias</span>
            </div>
            <button className="relative size-8 rounded-md ring-1 ring-hairline hover:bg-white/5 grid place-items-center transition">
              <Bell className="size-3.5" />
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-brand" />
            </button>
            <div className="size-8 rounded-full bg-gradient-to-br from-brand/60 to-indigo-500/60 ring-1 ring-white/10 grid place-items-center text-xs font-semibold">
              L
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
