import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const reasons = [
  "Enunciado com erro",
  "Alternativas incorretas",
  "Gabarito equivocado",
  "Explicação insuficiente",
  "Outro",
];

export function ReportProblemDialog({
  open,
  onOpenChange,
  questionNumber,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  questionNumber: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface ring-1 ring-hairline">
        <DialogHeader>
          <DialogTitle>Reportar problema na questão {questionNumber}</DialogTitle>
          <DialogDescription>
            Conte para a equipe o que está errado. Sua contribuição melhora o banco de questões.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 gap-2">
          {reasons.map((r) => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className={`text-left px-3 py-2 rounded-lg ring-1 text-sm transition ${
                selected === r
                  ? "bg-brand/15 ring-brand/40 text-brand"
                  : "bg-white/5 ring-hairline hover:ring-brand/30"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={!selected}
            onClick={() => {
              toast.success("Problema reportado. Obrigado!");
              setSelected(null);
              onOpenChange(false);
            }}
          >
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
