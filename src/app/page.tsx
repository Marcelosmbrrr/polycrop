"use client";

import React, { useState, useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImagePlus, Scissors, Plus, Lock, Unlock, Hand, MoveDiagonal } from "lucide-react";
import { CropContainer } from "@/components/crop-container";
import { PolygonImage } from "@/components/polygon-image";
import { GenerateImageDialog } from "@/components/generate-image-dialog";
import { TemplateDialog } from "@/components/template-dialog";
import { PolygonShapeDialog } from "@/components/polygon-shape-dialog";
import { toast } from "sonner";
// @ts-ignore
import jsPDF from "jspdf";

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

type MosaicTemplate = "fullscreen" | "quadrilateral" | "grid";

interface GridPreset {
  rows: number;
  cols: number;
}

function parseGridPreset(preset: string): GridPreset {
  const [cols, rows] = preset.split("x").map(Number);
  return { cols, rows };
}

export default function Page() {
  const [images, setImages] = useState<ImageData[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [croppedImages, setCroppedImages] = useState<CroppedImage[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isGeneratingForCrop, setIsGeneratingForCrop] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [mosaicTemplate, setMosaicTemplate] = useState<MosaicTemplate>("fullscreen");
  const [gridPreset, setGridPreset] = useState<GridPreset | null>(null);
  const [quadRect, setQuadRect] = useState({ x: 100, y: 100, width: 300, height: 300 });
  const [isResizingQuad, setIsResizingQuad] = useState(false);
  const [resizeStart, setResizeStart] = useState({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const [isDraggingQuad, setIsDraggingQuad] = useState(false);
  const [dragStart, setDragStart] = useState({ mouseX: 0, mouseY: 0, x: 0, y: 0 });
  const [quadLocked, setQuadLocked] = useState(false);
  const [polygonShapeDialogOpen, setPolygonShapeDialogOpen] = useState(false);
  const [viewportShape, setViewportShape] = useState<string>("quadrilateral");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0, mouseX: 0, mouseY: 0 });
  const [spacePressed, setSpacePressed] = useState(false);
  const [gridRect, setGridRect] = useState({ x: 100, y: 100, width: 400, height: 400 });
  const [isResizingGrid, setIsResizingGrid] = useState(false);
  const [resizeGridStart, setResizeGridStart] = useState({ mouseX: 0, mouseY: 0, width: 0, height: 0 });
  const [isDraggingGrid, setIsDraggingGrid] = useState(false);
  const [dragGridStart, setDragGridStart] = useState({ mouseX: 0, mouseY: 0, x: 0, y: 0 });
  const [gridLocked, setGridLocked] = useState(false);

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

  const openTemplateDialog = () => {
    setTemplateDialogOpen(true);
  };

  const handleSelectTemplate = (template: MosaicTemplate, preset?: string) => {
    setImages([]);
    setSelectedImageId(null);
    setCropMode(false);
    setCroppedImages([]);
    setIsGeneratingForCrop(false);
    setMosaicTemplate(template);
    if (template === "grid" && preset) {
      const grid = parseGridPreset(preset);
      setGridPreset(grid);
      const gridWidth = 400;
      const gridHeight = 400;
      setGridRect({ x: 100, y: 100, width: gridWidth, height: gridHeight });
      const cellWidth = gridWidth / grid.cols;
      const cellHeight = gridHeight / grid.rows;
      const cropped: CroppedImage[] = [];
      let id = 1;
      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const x = gridRect.x + col * cellWidth;
          const y = gridRect.y + row * cellHeight;
          cropped.push({
            id: `grid-${id++}`,
            url: "",
            x,
            y,
            width: cellWidth,
            height: cellHeight,
            vertices: [
              { x: 0, y: 0 },
              { x: cellWidth, y: 0 },
              { x: cellWidth, y: cellHeight },
              { x: 0, y: cellHeight },
            ],
          });
        }
      }
      setCroppedImages(cropped);
    } else {
      setGridPreset(null);
    }
    setTemplateDialogOpen(false);
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

    // Se for quadrilateral, usar as dimensões do quadrilátero
    let canvasWidth = containerRect.width;
    let canvasHeight = containerRect.height;
    let offsetX = 0;
    let offsetY = 0;
    if (mosaicTemplate === "quadrilateral") {
      canvasWidth = quadRect.width;
      canvasHeight = quadRect.height;
      offsetX = quadRect.x;
      offsetY = quadRect.y;
    }

    // Criar canvas
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    // Fundo transparente
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Máscara de recorte do polígono
    if (mosaicTemplate === "quadrilateral") {
      ctx.save();
      ctx.beginPath();
      if (viewportShape === "quadrilateral") {
        ctx.rect(0, 0, canvasWidth, canvasHeight);
      } else if (viewportShape === "triangle") {
        const points = getRegularPolygonPointsArr(3, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "pentagon") {
        const points = getRegularPolygonPointsArr(5, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "hexagon") {
        const points = getRegularPolygonPointsArr(6, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "circle") {
        ctx.ellipse(canvasWidth/2, canvasHeight/2, canvasWidth/2-8, canvasHeight/2-8, 0, 0, 2*Math.PI);
      }
      ctx.clip();
    }

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

        // Criar clip path do polígono do recorte
        ctx.beginPath();
        croppedImg.vertices.forEach((vertex, index) => {
          // Offset relativo ao quadrilátero se for quadrilateral
          const x = croppedImg.x + vertex.x - offsetX;
          const y = croppedImg.y + vertex.y - offsetY;
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
          croppedImg.x + minX - offsetX,
          croppedImg.y + minY - offsetY,
          boundingWidth,
          boundingHeight
        );

        // Restaurar contexto
        ctx.restore();
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
    }

    // Restaurar contexto global após máscara
    if (mosaicTemplate === "quadrilateral") {
      ctx.restore();
    }

    // Gerar e baixar a imagem
    const dataURL = canvas.toDataURL("image/png", 1.0);
    const link = document.createElement("a");
    link.download = `composicao-${Date.now()}.png`;
    link.href = dataURL;
    link.click();

    // Toast de sucesso
    toast.success("Imagem gerada com sucesso!");
  };

  const generateImageForCrop = async () => {
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
      } catch (error) {
        console.error("Erro ao processar imagem:", error);
      }
    }

    // Gerar a imagem como data URL
    const dataURL = canvas.toDataURL("image/png", 1.0);
    
    // Criar uma nova imagem com o mosaico gerado
    const newImage: ImageData = {
      id: Date.now().toString(),
      url: dataURL,
      name: `mosaico-${Date.now()}.png`,
    };
    
    setImages((prev) => [newImage, ...prev]);
    setSelectedImageId(newImage.id);
    setCropMode(true);
    setIsGeneratingForCrop(true);
  };

  const selectedImage = images.find((img) => img.id === selectedImageId);

  // Função para exportar PDF (usando PNG)
  const exportPDF = async () => {
    if (!containerRef.current) return;
    // Gerar PNG preview
    const dataUrl = await getPreviewDataUrl();
    if (!dataUrl) return;
    const pdf = new jsPDF({ orientation: quadRect.width > quadRect.height ? 'l' : 'p', unit: 'px', format: [quadRect.width, quadRect.height] });
    pdf.addImage(dataUrl, 'PNG', 0, 0, quadRect.width, quadRect.height);
    pdf.save(`mosaico-${Date.now()}.pdf`);
  };

  // Função para preview (PNG)
  const getPreviewDataUrl = async () => {
    // Reutiliza a lógica de generateImage, mas retorna o dataURL sem baixar
    if (!containerRef.current || croppedImages.length === 0) return null;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    let canvasWidth = containerRect.width;
    let canvasHeight = containerRect.height;
    let offsetX = 0;
    let offsetY = 0;
    if (mosaicTemplate === "quadrilateral") {
      canvasWidth = quadRect.width;
      canvasHeight = quadRect.height;
      offsetX = quadRect.x;
      offsetY = quadRect.y;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (mosaicTemplate === "quadrilateral") {
      ctx.save();
      ctx.beginPath();
      if (viewportShape === "quadrilateral") {
        ctx.rect(0, 0, canvasWidth, canvasHeight);
      } else if (viewportShape === "triangle") {
        const points = getRegularPolygonPointsArr(3, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "pentagon") {
        const points = getRegularPolygonPointsArr(5, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "hexagon") {
        const points = getRegularPolygonPointsArr(6, canvasWidth, canvasHeight);
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
        ctx.closePath();
      } else if (viewportShape === "circle") {
        ctx.ellipse(canvasWidth/2, canvasHeight/2, canvasWidth/2-8, canvasHeight/2-8, 0, 0, 2*Math.PI);
      }
      ctx.clip();
    }
    for (const croppedImg of croppedImages) {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = croppedImg.url;
        });
        const minX = Math.min(...croppedImg.vertices.map((v) => v.x));
        const maxX = Math.max(...croppedImg.vertices.map((v) => v.x));
        const minY = Math.min(...croppedImg.vertices.map((v) => v.y));
        const maxY = Math.max(...croppedImg.vertices.map((v) => v.y));
        const boundingWidth = maxX - minX;
        const boundingHeight = maxY - minY;
        ctx.save();
        ctx.beginPath();
        croppedImg.vertices.forEach((vertex, index) => {
          const x = croppedImg.x + vertex.x - offsetX;
          const y = croppedImg.y + vertex.y - offsetY;
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(
          img,
          croppedImg.x + minX - offsetX,
          croppedImg.y + minY - offsetY,
          boundingWidth,
          boundingHeight
        );
        ctx.restore();
      } catch (error) {}
    }
    if (mosaicTemplate === "quadrilateral") {
      ctx.restore();
    }
    return canvas.toDataURL("image/png", 1.0);
  };

  // Atualizar todas as células do grid ao mover/redimensionar o grid
  const updateGridCells = (rect: { x: number; y: number; width: number; height: number }) => {
    if (!gridPreset) return;
    const cellWidth = rect.width / gridPreset.cols;
    const cellHeight = rect.height / gridPreset.rows;
    let id = 1;
    const cropped: CroppedImage[] = [];
    for (let row = 0; row < gridPreset.rows; row++) {
      for (let col = 0; col < gridPreset.cols; col++) {
        const x = rect.x + col * cellWidth;
        const y = rect.y + row * cellHeight;
        cropped.push({
          id: `grid-${id++}`,
          url: croppedImages[(row * gridPreset.cols) + col]?.url || "",
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          vertices: [
            { x: 0, y: 0 },
            { x: cellWidth, y: 0 },
            { x: cellWidth, y: cellHeight },
            { x: 0, y: cellHeight },
          ],
        });
      }
    }
    setCroppedImages(cropped);
  };

  return (
    <SidebarProvider>
      <AppSidebar
        images={images}
        selectedImageId={selectedImageId}
        onImageSelect={setSelectedImageId}
      />
      <SidebarInset>
        <TemplateDialog
          open={templateDialogOpen}
          onOpenChange={setTemplateDialogOpen}
          onSelectTemplate={handleSelectTemplate}
        />
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 bg-background">
          <div className="flex items-center gap-2">
            <Button
              onClick={openTemplateDialog}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo
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

          <GenerateImageDialog
            generateImage={generateImage}
            exportPDF={exportPDF}
            getPreviewDataUrl={getPreviewDataUrl}
                disabled={croppedImages.length === 0}
          />
        </header>

        <div className="flex flex-1 flex-col gap-4 p-4">
          <div
            ref={containerRef}
            className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min relative overflow-hidden crop-container"
            tabIndex={0}
            onWheel={e => {
              if (e.ctrlKey || e.metaKey || e.altKey) {
                // Zoom com Ctrl/Meta/Alt + scroll
                e.preventDefault();
                setZoom(z => Math.max(0.2, Math.min(3, z - e.deltaY * 0.001)));
              }
            }}
            onMouseDown={e => {
              if (spacePressed || e.button === 1) {
                setIsPanning(true);
                setPanStart({ x: pan.x, y: pan.y, mouseX: e.clientX, mouseY: e.clientY });
                e.preventDefault();
              }
            }}
            onMouseMove={e => {
              if (isPanning) {
                setPan({
                  x: panStart.x + (e.clientX - panStart.mouseX),
                  y: panStart.y + (e.clientY - panStart.mouseY),
                });
              }
            }}
            onMouseUp={() => setIsPanning(false)}
            onMouseLeave={() => setIsPanning(false)}
            onKeyDown={e => { if (e.code === 'Space') setSpacePressed(true); }}
            onKeyUp={e => { if (e.code === 'Space') setSpacePressed(false); }}
            style={{ outline: 'none', cursor: isPanning || spacePressed ? 'grab' : undefined }}
          >
            {/* Grid visual no fundo do container */}
            <GridBackground containerRef={containerRef} zoom={zoom} pan={pan} />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: '100%',
                height: '100%',
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                zIndex: 2,
              }}
            >
              {/* Quadrilátero deve ser renderizado ANTES dos recortes, com zIndex menor */}
              {mosaicTemplate === "quadrilateral" && !cropMode && (
                <div
                  style={{
                    position: "absolute",
                    left: quadRect.x,
                    top: quadRect.y,
                    width: quadRect.width,
                    height: quadRect.height,
                    zIndex: 10,
                    boxSizing: "border-box",
                    pointerEvents: "none",
                  }}
                >
                  {/* Polígono visual do viewport */}
                  <svg
                    width={quadRect.width}
                    height={quadRect.height}
                    style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                  >
                    {viewportShape === "quadrilateral" && (
                      <rect x={0} y={0} width={quadRect.width} height={quadRect.height} rx={8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" />
                    )}
                    {viewportShape === "triangle" && (
                      <polygon points={getRegularPolygonPoints(3, quadRect.width, quadRect.height)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" />
                    )}
                    {viewportShape === "pentagon" && (
                      <polygon points={getRegularPolygonPoints(5, quadRect.width, quadRect.height)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" />
                    )}
                    {viewportShape === "hexagon" && (
                      <polygon points={getRegularPolygonPoints(6, quadRect.width, quadRect.height)} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" />
                    )}
                    {viewportShape === "circle" && (
                      <ellipse cx={quadRect.width/2} cy={quadRect.height/2} rx={quadRect.width/2-8} ry={quadRect.height/2-8} fill="none" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" />
                    )}
                  </svg>
                  {/* Botões horizontais no topo direito */}
                  <div
                    style={{
                      position: "absolute",
                      top: -48,
                      right: 0,
                      display: "flex",
                      flexDirection: "row",
                      gap: 8,
                      zIndex: 30,
                    }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      style={{ background: '#fff', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                      onClick={e => {
                        e.stopPropagation();
                        setQuadLocked((locked) => !locked);
                      }}
                      title={quadLocked ? "Desbloquear redimensionamento" : "Bloquear redimensionamento"}
                    >
                      {quadLocked ? <Lock className="w-5 h-5 text-blue-600" /> : <Unlock className="w-5 h-5 text-blue-600" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      style={{ background: '#fff', cursor: isDraggingQuad ? 'grabbing' : 'grab', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                      onMouseDown={e => {
                        if (quadLocked) return;
                        if (e.button === 0) {
                          setIsDraggingQuad(true);
                          setDragStart({ mouseX: e.clientX, mouseY: e.clientY, x: quadRect.x, y: quadRect.y });
                        }
                      }}
                      title="Mover área do polígono"
                    >
                      <Hand className="w-5 h-5 text-blue-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      style={{ background: '#fff', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                      onClick={e => {
                        e.stopPropagation();
                        setPolygonShapeDialogOpen(true);
                      }}
                      title="Selecionar formato do polígono"
                    >
                      {/* Ícone do polígono atual (exemplo: quadrilátero) */}
                      {viewportShape === "triangle" && (
                        <svg width="20" height="20" viewBox="0 0 32 32"><polygon points="16,4 28,28 4,28" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
                      )}
                      {viewportShape === "quadrilateral" && (
                        <svg width="20" height="20" viewBox="0 0 32 32"><rect x="6" y="6" width="20" height="20" fill="none" stroke="#3b82f6" strokeWidth="2" rx="4" /></svg>
                      )}
                      {viewportShape === "circle" && (
                        <svg width="20" height="20" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
                      )}
                      {viewportShape === "pentagon" && (
                        <svg width="20" height="20" viewBox="0 0 32 32"><polygon points="16,4 28,13 23,28 9,28 4,13" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
                      )}
                      {viewportShape === "hexagon" && (
                        <svg width="20" height="20" viewBox="0 0 32 32"><polygon points="8,6 24,6 30,16 24,26 8,26 2,16" fill="none" stroke="#3b82f6" strokeWidth="2" /></svg>
                      )}
                    </Button>
                  </div>
                  {/* Botão de resize no rodapé */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    style={{
                      position: "absolute",
                      bottom: 0,
                      left: "100%",
                      marginLeft: 12,
                      background: '#fff',
                      pointerEvents: 'auto',
                      border: '1px solid #bfdbfe',
                      boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)',
                      zIndex: 30,
                    }}
                    onMouseDown={e => {
                      if (quadLocked) return;
                      if (e.button === 0) {
                        setIsResizingQuad(true);
                        setResizeStart({ mouseX: e.clientX, mouseY: e.clientY, width: quadRect.width, height: quadRect.height });
                      }
                    }}
                    title="Redimensionar área do polígono"
                  >
                    <MoveDiagonal className="w-5 h-5 text-blue-600" />
                  </Button>
                  <PolygonShapeDialog
                    open={polygonShapeDialogOpen}
                    onOpenChange={setPolygonShapeDialogOpen}
                    onSelectShape={shape => {
                      setViewportShape(shape);
                      setPolygonShapeDialogOpen(false);
                    }}
                    currentShape={viewportShape}
                  />
                </div>
              )}
            {cropMode && selectedImage ? (
              <CropContainer
                image={selectedImage}
                onCropConfirm={handleCropConfirm}
                onCancel={() => {
                  setCropMode(false);
                  setIsGeneratingForCrop(false);
                }}
                isGeneratingForCrop={isGeneratingForCrop}
              />
            ) : (
              <>
                  {mosaicTemplate === "grid" && gridPreset && (
                    <>
                      {/* Container do grid com handles, cadeado e linhas internas */}
                      <div
                        style={{
                          position: "absolute",
                          left: gridRect.x,
                          top: gridRect.y,
                          width: gridRect.width,
                          height: gridRect.height,
                          zIndex: 10,
                          boxSizing: "border-box",
                          pointerEvents: "auto",
                          border: "2px dashed #3b82f6",
                          borderRadius: 8,
                          background: "transparent"
                        }}
                      >
                        {/* Linhas internas do grid */}
                        <svg
                          width={gridRect.width}
                          height={gridRect.height}
                          style={{ position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                        >
                          {/* Linhas verticais */}
                          {Array.from({ length: gridPreset.cols - 1 }).map((_, i) => (
                            <line
                              key={"v-" + i}
                              x1={((i + 1) * gridRect.width) / gridPreset.cols}
                              y1={0}
                              x2={((i + 1) * gridRect.width) / gridPreset.cols}
                              y2={gridRect.height}
                              stroke="#3b82f6"
                              strokeDasharray="6 4"
                              strokeWidth={1}
                            />
                          ))}
                          {/* Linhas horizontais */}
                          {Array.from({ length: gridPreset.rows - 1 }).map((_, i) => (
                            <line
                              key={"h-" + i}
                              x1={0}
                              y1={((i + 1) * gridRect.height) / gridPreset.rows}
                              x2={gridRect.width}
                              y2={((i + 1) * gridRect.height) / gridPreset.rows}
                              stroke="#3b82f6"
                              strokeDasharray="6 4"
                              strokeWidth={1}
  />
))}
                        </svg>
                        {/* Botões horizontais no topo direito */}
                        <div
                          style={{
                            position: "absolute",
                            top: -48,
                            right: 0,
                            display: "flex",
                            flexDirection: "row",
                            gap: 8,
                            zIndex: 30,
                          }}
                        >
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            style={{ background: '#fff', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                            onClick={e => {
                              e.stopPropagation();
                              setGridLocked((locked) => !locked);
                            }}
                            title={gridLocked ? "Desbloquear redimensionamento" : "Bloquear redimensionamento"}
                          >
                            {gridLocked ? <Lock className="w-5 h-5 text-blue-600" /> : <Unlock className="w-5 h-5 text-blue-600" />}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            style={{ background: '#fff', cursor: isDraggingGrid ? 'grabbing' : 'grab', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                            onMouseDown={e => {
                              if (gridLocked) return;
                              if (e.button === 0) {
                                setIsDraggingGrid(true);
                                setDragGridStart({ mouseX: e.clientX, mouseY: e.clientY, x: gridRect.x, y: gridRect.y });
                              }
                            }}
                            title="Mover grid"
                          >
                            <Hand className="w-5 h-5 text-blue-600" />
                          </Button>
                        </div>
                        {/* Handle de resize no rodapé */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          style={{ position: "absolute", bottom: 0, left: "100%", marginLeft: 12, background: '#fff', pointerEvents: 'auto', border: '1px solid #bfdbfe', boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)' }}
                          onMouseDown={e => {
                            if (gridLocked) return;
                            if (e.button === 0) {
                              setIsResizingGrid(true);
                              setResizeGridStart({ mouseX: e.clientX, mouseY: e.clientY, width: gridRect.width, height: gridRect.height });
                            }
                          }}
                          title="Redimensionar grid"
                        >
                          <MoveDiagonal className="w-5 h-5 text-blue-600" />
                        </Button>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            {/* Eventos globais para resize/drag do quadrilátero ou grid */}
            {mosaicTemplate === "quadrilateral" && !cropMode && (isResizingQuad || isDraggingQuad) && (
              <QuadRectEvents
                isResizing={isResizingQuad}
                isDragging={isDraggingQuad}
                onResize={delta => {
                  setQuadRect(rect => ({
                    ...rect,
                    width: Math.max(40, resizeStart.width + delta.x),
                    height: Math.max(40, resizeStart.height + delta.y),
                  }));
                }}
                onDrag={delta => {
                  setQuadRect(rect => ({
                    ...rect,
                    x: dragStart.x + delta.x,
                    y: dragStart.y + delta.y,
                  }));
                }}
                onEnd={() => {
                  setIsResizingQuad(false);
                  setIsDraggingQuad(false);
                }}
                resizeStart={resizeStart}
                dragStart={dragStart}
              />
            )}
            {mosaicTemplate === "grid" && gridPreset && (isResizingGrid || isDraggingGrid) && (
              <QuadRectEvents
                isResizing={isResizingGrid}
                isDragging={isDraggingGrid}
                onResize={delta => {
                  const newRect = {
                    ...gridRect,
                    width: Math.max(40, resizeGridStart.width + delta.x),
                    height: Math.max(40, resizeGridStart.height + delta.y),
                  };
                  setGridRect(newRect);
                  updateGridCells(newRect);
                }}
                onDrag={delta => {
                  const newRect = {
                    ...gridRect,
                    x: dragGridStart.x + delta.x,
                    y: dragGridStart.y + delta.y,
                  };
                  setGridRect(newRect);
                  updateGridCells(newRect);
                }}
                onEnd={() => {
                  setIsResizingGrid(false);
                  setIsDraggingGrid(false);
                }}
                resizeStart={resizeGridStart}
                dragStart={dragGridStart}
              />
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type QuadRectEventsProps = {
  isResizing: boolean;
  isDragging: boolean;
  onResize: (delta: { x: number; y: number }) => void;
  onDrag: (delta: { x: number; y: number }) => void;
  onEnd: () => void;
  resizeStart: { mouseX: number; mouseY: number; width: number; height: number };
  dragStart: { mouseX: number; mouseY: number; x: number; y: number };
};

function QuadRectEvents({ isResizing, isDragging, onResize, onDrag, onEnd, resizeStart, dragStart }: QuadRectEventsProps) {
  React.useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (isResizing) {
        onResize({ x: e.clientX - resizeStart.mouseX, y: e.clientY - resizeStart.mouseY });
      } else if (isDragging) {
        onDrag({ x: e.clientX - dragStart.mouseX, y: e.clientY - dragStart.mouseY });
      }
    }
    function onMouseUp() {
      onEnd();
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isResizing, isDragging, onResize, onDrag, onEnd, resizeStart, dragStart]);
  return null;
}

// Função utilitária para gerar pontos de polígono regular
function getRegularPolygonPoints(sides: number, width: number, height: number, padding: number = 8) {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - padding;
  const points = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push(`${x},${y}`);
  }
  return points.join(" ");
}

// Função utilitária para gerar pontos de polígono regular como array de [x, y]
function getRegularPolygonPointsArr(sides: number, width: number, height: number, padding: number = 8): [number, number][] {
  const cx = width / 2;
  const cy = height / 2;
  const r = Math.min(width, height) / 2 - padding;
  const points: [number, number][] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    points.push([x, y]);
  }
  return points;
}

// Componente de grid visual
function GridBackground({ containerRef, zoom = 1, pan = { x: 0, y: 0 } }: { containerRef: React.RefObject<HTMLDivElement | null>, zoom?: number, pan?: { x: number, y: number } }) {
  const [size, setSize] = React.useState({ width: 0, height: 0 });
  React.useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setSize({ width: rect.width, height: rect.height });
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [containerRef]);
  const step = 40;
  const linesV = [];
  const linesH = [];
  for (let x = step; x < size.width; x += step) {
    linesV.push(<line key={x} x1={x} y1={0} x2={x} y2={size.height} stroke="#e0e7ef" strokeWidth={1} />);
  }
  for (let y = step; y < size.height; y += step) {
    linesH.push(<line key={y} x1={0} y1={y} x2={size.width} y2={y} stroke="#e0e7ef" strokeWidth={1} />);
  }
  return (
    <svg
      width={size.width}
      height={size.height}
      style={{ position: 'absolute', left: 0, top: 0, zIndex: 0, pointerEvents: 'none',
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: '0 0',
      }}
    >
      {linesV}
      {linesH}
    </svg>
  );
}
