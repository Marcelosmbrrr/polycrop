import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const shapes = [
  {
    key: "triangle",
    name: "Triângulo",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,4 28,28 4,28" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
    ),
  },
  {
    key: "quadrilateral",
    name: "Quadrilátero",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" /></svg>
    ),
  },
  {
    key: "circle",
    name: "Círculo",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
    ),
  },
  {
    key: "pentagon",
    name: "Pentágono",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="16,4 28,13 23,28 9,28 4,13" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
    ),
  },
  {
    key: "hexagon",
    name: "Hexágono",
    icon: (
      <svg width="32" height="32" viewBox="0 0 32 32"><polygon points="8,6 24,6 30,16 24,26 8,26 2,16" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
    ),
  },
];

interface PolygonShapeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectShape: (shape: string) => void;
  currentShape: string;
}

export function PolygonShapeDialog({ open, onOpenChange, onSelectShape, currentShape }: PolygonShapeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Escolha o Polígono</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2 py-2">
          {shapes.map((shape) => (
            <Button
              key={shape.key}
              variant={currentShape === shape.key ? "default" : "outline"}
              className="flex items-center gap-3 justify-start"
              onClick={() => onSelectShape(shape.key)}
            >
              {shape.icon}
              {shape.name}
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
} 