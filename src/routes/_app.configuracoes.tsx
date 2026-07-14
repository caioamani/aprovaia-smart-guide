import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/configuracoes")({
  component: Configuracoes,
  head: () => ({ meta: [{ title: "Configurações · AprovaIA" }] }),
});

const sections = [
  {
    title: "Aparência",
    items: [
      { label: "Tema", control: "select", options: ["Escuro", "Claro", "Sistema"], value: "Escuro" },
      { label: "Estilo visual", control: "select", options: ["Compacto", "Confortável"], value: "Confortável" },
    ],
  },
  {
    title: "Idioma & região",
    items: [
      { label: "Idioma", control: "select", options: ["Português (BR)", "English"], value: "Português (BR)" },
    ],
  },
  {
    title: "Notificações",
    items: [
      { label: "Lembretes de estudo", control: "switch", value: true },
      { label: "Alertas da IA", control: "switch", value: true },
      { label: "Resumo semanal por e-mail", control: "switch", value: false },
    ],
  },
  {
    title: "Privacidade",
    items: [
      { label: "Compartilhar dados anônimos para melhorar a IA", control: "switch", value: true },
      { label: "Aparecer em rankings públicos", control: "switch", value: false },
    ],
  },
];

function Configuracoes() {
  return (
    <div className="p-8 space-y-8 max-w-[900px]">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Personalize a experiência do AprovaIA.
        </p>
      </div>

      {sections.map((sec) => (
        <div key={sec.title}>
          <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 px-1">
            {sec.title}
          </h2>
          <div className="rounded-2xl bg-surface ring-1 ring-hairline divide-y divide-hairline">
            {sec.items.map((it) => (
              <div
                key={it.label}
                className="p-5 flex items-center justify-between gap-4"
              >
                <span className="text-sm">{it.label}</span>
                {it.control === "switch" ? (
                  <button
                    className={[
                      "w-10 h-6 rounded-full p-0.5 transition",
                      it.value ? "bg-brand" : "bg-white/10",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "size-5 rounded-full bg-white transition-transform",
                        it.value ? "translate-x-4" : "",
                      ].join(" ")}
                    />
                  </button>
                ) : (
                  <select
                    defaultValue={it.value as string}
                    className="bg-white/5 ring-1 ring-hairline rounded-md px-3 py-1.5 text-sm outline-none focus:ring-brand/40"
                  >
                    {(it.options as string[]).map((o) => (
                      <option key={o} className="bg-background">
                        {o}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div>
        <h2 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-3 px-1">
          Conta
        </h2>
        <div className="rounded-2xl bg-surface ring-1 ring-hairline divide-y divide-hairline">
          <button className="w-full p-5 text-left text-sm hover:bg-white/[0.02] transition">
            Alterar senha
          </button>
          <button className="w-full p-5 text-left text-sm hover:bg-white/[0.02] transition">
            Exportar meus dados
          </button>
          <button className="w-full p-5 text-left text-sm text-red-400 hover:bg-red-500/5 transition">
            Excluir conta permanentemente
          </button>
        </div>
      </div>
    </div>
  );
}
