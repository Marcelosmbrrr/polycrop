import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface TemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: "fullscreen" | "quadrilateral" | "grid", gridPreset?: string) => void;
}

export function TemplateDialog({ open, onOpenChange, onSelectTemplate }: TemplateDialogProps) {
  const [showGridPresets, setShowGridPresets] = React.useState(false);
  const gridPresets = [
    { label: "2x2", value: "2x2" },
    { label: "3x3", value: "3x3" },
    { label: "4x4", value: "4x4" },
    { label: "5x5", value: "5x5" },
  ];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full sm:max-w-lg rounded-none sm:rounded-xl">
        <DialogHeader>
          <DialogTitle>Escolha um template</DialogTitle>
          <DialogDescription>
            Selecione como o mosaico será montado e qual área será considerada na imagem final.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-2">
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => onSelectTemplate("fullscreen")}
            aria-label="Selecionar template Full Screen"
            role="button"
            tabIndex={0}
          >
            Full Screen
            <span className="ml-2 text-xs text-muted-foreground">(Toda a área disponível)</span>
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => onSelectTemplate("quadrilateral")}
            aria-label="Selecionar template Polígono"
            role="button"
            tabIndex={0}
          >
            Polígono
            <span className="ml-2 text-xs text-muted-foreground">(Apenas o que estiver dentro do polígono)</span>
          </Button>
          <Button
            variant="outline"
            className="justify-start"
            onClick={() => setShowGridPresets((v) => !v)}
            aria-label="Alternar exibição de Grid Preset"
            role="button"
            tabIndex={0}
          >
            Grid Preset
            <span className="ml-2 text-xs text-muted-foreground">(Recortes vazios em grid)</span>
          </Button>
          {showGridPresets && (
            <div className="flex flex-col gap-2 pl-4">
              {gridPresets.map((preset) => (
                <Button
                  key={preset.value}
                  variant="secondary"
                  className="justify-start"
                  onClick={() => onSelectTemplate("grid", preset.value)}
                  aria-label={`Selecionar Grid Preset ${preset.label}`}
                  role="button"
                  tabIndex={0}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 