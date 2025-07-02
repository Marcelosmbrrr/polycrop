"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Download } from "lucide-react";
import Image from "next/image";

interface ImageData {
  id: string;
  url: string;
  name: string;
}

interface CropContainerProps {
  image: ImageData;
  onCropConfirm: (croppedImageUrl: string) => void;
  onCancel: () => void;
  isGeneratingForCrop?: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function CropContainer({
  image,
  onCropConfirm,
  onCancel,
  isGeneratingForCrop = false,
}: CropContainerProps) {
  const [cropArea, setCropArea] = useState<CropArea>({
    x: 50,
    y: 50,
    width: 200,
    height: 150,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 }); //@ts-ignore
  const timeoutRef = useRef<NodeJS.Timeout>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if ((e.target as HTMLElement).classList.contains("resize-handle")) {
      setIsResizing(true);
    } else if (
      x >= cropArea.x &&
      x <= cropArea.x + cropArea.width &&
      y >= cropArea.y &&
      y <= cropArea.y + cropArea.height
    ) {
      setIsDragging(true);
      setDragStart({
        x: x - cropArea.x,
        y: y - cropArea.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDragging) {
      setCropArea((prev) => ({
        ...prev,
        x: Math.max(0, Math.min(rect.width - prev.width, x - dragStart.x)),
        y: Math.max(0, Math.min(rect.height - prev.height, y - dragStart.y)),
      }));
    } else if (isResizing) {
      setCropArea((prev) => ({
        ...prev,
        width: Math.max(50, Math.min(rect.width - prev.x, x - prev.x)),
        height: Math.max(50, Math.min(rect.height - prev.y, y - prev.y)),
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  const handleCropConfirm = () => {
    if (!canvasRef.current || !imageRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = imageRef.current;
    const scaleX = img.naturalWidth / img.offsetWidth;
    const scaleY = img.naturalHeight / img.offsetHeight;

    canvas.width = cropArea.width * scaleX;
    canvas.height = cropArea.height * scaleY;

    ctx.drawImage(
      img,
      cropArea.x * scaleX,
      cropArea.y * scaleY,
      cropArea.width * scaleX,
      cropArea.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedImageUrl = canvas.toDataURL("image/png");
    
    if (isGeneratingForCrop) {
      // Se estiver gerando para recorte, baixar diretamente o recorte
      const link = document.createElement("a");
      link.download = `recorte-${Date.now()}.png`;
      link.href = croppedImageUrl;
      link.click();
    } else {
      // Comportamento normal
      onCropConfirm(croppedImageUrl);
    }
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div
        className="relative max-w-full max-h-full cursor-crosshair select-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Image
          ref={imageRef}
          src={image.url || "/placeholder.svg"}
          alt={image.name}
          width={800}
          height={600}
          className="max-w-full max-h-[70vh] object-contain pointer-events-none"
          crossOrigin="anonymous"
        />

        <div
          className="absolute border-2 border-blue-500 bg-blue-500/10"
          style={{
            left: cropArea.x,
            top: cropArea.y,
            width: cropArea.width,
            height: cropArea.height,
          }}
        >
          <div className="resize-handle absolute bottom-0 right-0 w-3 h-3 bg-blue-500 cursor-se-resize" />
        </div>
      </div>

      <div className="absolute top-4 right-4 flex gap-2">
        <Button onClick={onCancel} variant="outline" size="sm">
          <X className="h-4 w-4" />
          Cancelar
        </Button>
      </div>

      <div className="absolute bottom-4 right-4">
        <Button
          onClick={handleCropConfirm}
          className="flex items-center gap-2"
        >
          {isGeneratingForCrop ? (
            <>
              <Download className="h-4 w-4" />
              Gerar Imagem
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              Confirmar Recorte
            </>
          )}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
