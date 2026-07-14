import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { metricDetails, type MetricKey } from "@/lib/mock-study";
import { Info } from "lucide-react";

export function MetricInfoDialog({
  metric,
  open,
  onOpenChange,
}: {
  metric: MetricKey | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const data = metric ? metricDetails[metric] : null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface border-hairline">
        {data && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-brand">
                <Info className="size-3" />
                Métrica
              </div>
              <DialogTitle className="text-2xl">{data.label}</DialogTitle>
              <DialogDescription className="text-3xl font-semibold text-foreground tabular-nums pt-2">
                {data.value}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {data.description}
              </p>
              <div className="p-4 rounded-lg bg-brand/5 ring-1 ring-brand/20">
                <p className="text-xs text-brand font-semibold uppercase tracking-widest mb-1.5">
                  Dica
                </p>
                <p className="text-sm text-foreground/90">{data.tip}</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
