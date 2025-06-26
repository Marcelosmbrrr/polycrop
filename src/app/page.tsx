"use client";

import type React from "react";

import { useState, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, RotateCcw, Scissors, Download } from "lucide-react";
import { CropContainer } from "@/components/crop-container";
import { PolygonImage } from "@/components/polygon-image";

interface ImageData {
  id: string;
  url: string;
  name: string;
}

interface CroppedImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vertices: { x: number; y: number }[];
}

export default function Page() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newImage: ImageData = {
          id: Date.now().toString(),
          url: e.target?.result as string,
          name: file.name,
        };
        setImages((prev) => [newImage, ...prev]);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
  };

  const resetImages = () => {
    setImages([]);
    setSelectedImageId(null);
    setCropMode(false);
    setCroppedImages([]);
  };

  const handleCropClick = () => {
    if (selectedImageId) {
      setCropMode(true);
    }
  };

  const handleCropConfirm = (croppedImageUrl: string) => {
    const newCroppedImage: CroppedImage = {
      id: Date.now().toString(),
      url: croppedImageUrl,
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      vertices: [
        { x: 0, y: 0 },
        { x: 200, y: 0 },
        { x: 200, y: 150 },
        { x: 0, y: 150 },
      ],
    };
    setCroppedImages((prev) => [...prev, newCroppedImage]);
    setCropMode(false);
    setSelectedImageId(null);
  };

  const generateImage = async () => {
    if (!containerRef.current || croppedImages.length === 0) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    // Criar canvas com as dimensões do container
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = containerRect.width;
    canvas.height = containerRect.height;

    // Fundo do container
    ctx.fillStyle = "#f8fafc"; // bg-muted/50 equivalent
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Processar cada polígono
    for (const croppedImg of croppedImages) {
      try {
        // Carregar a imagem
        const img = new Image();
        img.crossOrigin = "anonymous";

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = croppedImg.url;
        });

        // Calcular bounding box dos vértices
        const minX = Math.min(...croppedImg.vertices.map((v) => v.x));
        const maxX = Math.max(...croppedImg.vertices.map((v) => v.x));
        const minY = Math.min(...croppedImg.vertices.map((v) => v.y));
        const maxY = Math.max(...croppedImg.vertices.map((v) => v.y));

        const boundingWidth = maxX - minX;
        const boundingHeight = maxY - minY;

        // Salvar contexto
        ctx.save();

        // Criar clip path do polígono
        ctx.beginPath();
        croppedImg.vertices.forEach((vertex, index) => {
          const x = croppedImg.x + vertex.x;
          const y = croppedImg.y + vertex.y;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.clip();

        // Desenhar a imagem esticada para ocupar o bounding box
        ctx.drawImage(
          img,
          croppedImg.x + minX,
          croppedImg.y + minY,
          boundingWidth,
          boundingHeight
        );

        // Restaurar contexto
        ctx.restore();

        // REMOVER: Não desenhar contorno nem elementos de interface na imagem final
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
    }

    // Gerar e baixar a imagem
    const dataURL = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `composicao-${Date.now()}.png`;
    link.href = dataURL;
    link.click();
  };

  const selectedImage = images.find((img) => img.id === selectedImageId);

  return (
    <SidebarProvider>
      <AppSidebar
        images={images}
        selectedImageId={selectedImageId}
        onImageSelect={setSelectedImageId}
      />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-background">
          <div className="flex items-center gap-2">
            <Button
              onClick={resetImages}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button
              onClick={() => document.getElementById("image-upload")?.click()}
              className="flex items-center gap-2"
            >
              <ImagePlus className="h-4 w-4" />
              Adicionar Imagem
            </Button>
            {selectedImageId && (
              <Button
                onClick={handleCropClick}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Scissors className="h-4 w-4" />
                Recortar
              </Button>
            )}
            <Input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Botão Gerar Imagem no lado direito */}
          <Button
            onClick={generateImage}
            disabled={croppedImages.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Gerar Imagem
          </Button>
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div
            ref={containerRef}
            className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min relative overflow-hidden crop-container"
          >
            {cropMode && selectedImage ? (
              <CropContainer
                image={selectedImage}
                onCropConfirm={handleCropConfirm}
                onCancel={() => setCropMode(false)}
              />
            ) : (
              <>
                {croppedImages.map((croppedImg) => (
                  <PolygonImage
                    key={croppedImg.id}
                    croppedImage={croppedImg}
                    onUpdate={(updated) => {
                      setCroppedImages((prev) =>
                        prev.map((img) =>
                          img.id === croppedImg.id
                            ? { ...img, ...updated }
                            : img
                        )
                      );
                    }}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
