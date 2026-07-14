import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { reorganizedPlan } from "@/lib/mock-study";
import { Sparkles, Clock, CheckCircle2 } from "lucide-react";

export function ReorganizeAIDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      setLoading(true);
      const t = setTimeout(() => setLoading(false), 2400);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand">
            <Sparkles className="size-3" />
            IA · Reorganização
          </div>
          <DialogTitle className="text-xl">
            {loading ? "Reorganizando seu cronograma…" : "Cronograma otimizado"}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-6 space-y-4 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-full bg-brand/15 ring-1 ring-brand/30 grid place-items-center">
                <Sparkles className="size-4 text-brand animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground">
                A IA está reorganizando seu cronograma…
              </p>
            </div>
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-14 rounded-md bg-white/5" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4 bg-white/5" />
                    <Skeleton className="h-2.5 w-1/2 bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="py-2 space-y-3 animate-fade-in">
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <CheckCircle2 className="size-3.5" />
              Reorganizado com base nos seus pontos fracos recentes
            </div>
            <div className="divide-y divide-hairline rounded-xl ring-1 ring-hairline overflow-hidden">
              {reorganizedPlan.map((item, i) => (
                <div
                  key={i}
                  className="p-3.5 flex items-center gap-3 hover:bg-white/[0.02] transition"
                >
                  <div className="w-14 text-center">
                    <p className="text-xs font-mono text-brand">{item.time}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
                      {item.subject}
                    </p>
                    <p className="text-sm font-medium truncate">{item.topic}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground inline-flex items-center gap-1">
                      <Clock className="size-3" />
                      {item.duration}
                    </p>
                    <p
                      className={[
                        "text-[10px] font-semibold uppercase tracking-widest mt-0.5",
                        item.priority === "Alta"
                          ? "text-orange-400"
                          : item.priority === "Média"
                            ? "text-brand"
                            : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {item.priority}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-full mt-2 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-semibold hover:bg-brand/90 transition active:scale-[0.98]"
            >
              Aplicar novo cronograma
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
