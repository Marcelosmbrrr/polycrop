"use client";

import type React from "react";
import { useState, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"; // Verifique se o caminho está correto
import { Trash2, Lock, Unlock, RotateCw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CroppedImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vertices: { x: number; y: number }[];
  resizeMode?: "size" | "free";
  shapeType?: "quadrilateral" | "circle" | "triangle" | "pentagon" | "hexagon";
  rotation?: number;
}

interface PolygonImageProps {
  croppedImage: CroppedImage;
  onUpdate: (updates: Partial<CroppedImage>) => void;
  onDelete: () => void;
  croppedImages: CroppedImage[];
  isSelected: boolean;
  onSelect?: () => void;
  onDeselect?: () => void;
  isRotatingMode?: boolean;
  onToggleRotate?: (v: boolean) => void;
}

export function PolygonImage({ croppedImage, onUpdate, onDelete, croppedImages, isSelected, onSelect, onDeselect, isRotatingMode = false, onToggleRotate }: PolygonImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const resizeMode = croppedImage.resizeMode || "size";
  const shapeType = croppedImage.shapeType || "quadrilateral";
  const [isLocked, setIsLocked] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateStart, setRotateStart] = useState<{ angle: number; mouseAngle: number } | null>(null);

  const rotation = croppedImage.rotation || 0;

  useEffect(() => {
    if (!isSelected || isRotatingMode) return;
    const handleMouseMove = (e: MouseEvent) => {
      if (isLocked) return;
      if (isDragging) {
        // SNAP DE VÉRTICES
        const SNAP_THRESHOLD = 10;
        let newX = e.clientX - dragStart.x;
        let newY = e.clientY - dragStart.y;
        let snapped = false;
        let snapDelta = { x: 0, y: 0 };
        if (shapeType !== "circle") {
          // Calcular os vértices do recorte arrastado na nova posição
          const movedVertices = croppedImage.vertices.map(v => ({ x: v.x + newX, y: v.y + newY }));
          // Para cada outro recorte
          for (const other of croppedImages) {
            if (other.id === croppedImage.id) continue;
            if (!other.shapeType) continue;
            // Calcular vértices do outro recorte
            let otherVertices = other.vertices;
            if (other.resizeMode === "size") {
              // Forçar alinhamento se for size
              const minX = Math.min(...other.vertices.map(v => v.x));
              const minY = Math.min(...other.vertices.map(v => v.y));
              const maxX = Math.max(...other.vertices.map(v => v.x));
              const maxY = Math.max(...other.vertices.map(v => v.y));
              if (other.shapeType === "quadrilateral" || other.shapeType === "circle") {
                otherVertices = [
                  { x: 0, y: 0 },
                  { x: maxX - minX, y: 0 },
                  { x: maxX - minX, y: maxY - minY },
                  { x: 0, y: maxY - minY },
                ];
              } else if (other.shapeType === "triangle") {
                otherVertices = getRegularPolygonVertices(3, maxX - minX, maxY - minY, 0);
              } else if (other.shapeType === "pentagon") {
                otherVertices = getRegularPolygonVertices(5, maxX - minX, maxY - minY, 0);
              } else if (other.shapeType === "hexagon") {
                otherVertices = getRegularPolygonVertices(6, maxX - minX, maxY - minY, 0);
              }
              // Ajustar para posição absoluta
              otherVertices = otherVertices.map(v => ({ x: v.x + other.x, y: v.y + other.y }));
            } else {
              // Livre: já estão relativos ao outro.x/y
              otherVertices = other.vertices.map(v => ({ x: v.x + other.x, y: v.y + other.y }));
            }
            // SNAP DE VÉRTICES
            for (let i = 0; i < movedVertices.length; i++) {
              const v1 = movedVertices[i];
              for (let j = 0; j < otherVertices.length; j++) {
                const v2 = otherVertices[j];
                const dist = Math.hypot(v1.x - v2.x, v1.y - v2.y);
                if (dist < SNAP_THRESHOLD) {
                  snapDelta = { x: v2.x - v1.x, y: v2.y - v1.y };
                  snapped = true;
                  break;
                }
              }
              if (snapped) break;
            }
            if (snapped) break;
            // SNAP DE ARESTAS
            // Para cada aresta do recorte arrastado
            for (let i = 0; i < movedVertices.length; i++) {
              const a1 = movedVertices[i];
              const a2 = movedVertices[(i + 1) % movedVertices.length];
              // Para cada aresta do outro recorte
              for (let j = 0; j < otherVertices.length; j++) {
                const b1 = otherVertices[j];
                const b2 = otherVertices[(j + 1) % otherVertices.length];
                // Calcular distância mínima entre as arestas (segmentos)
                const { dist, delta } = segmentSnap(a1, a2, b1, b2);
                if (dist < SNAP_THRESHOLD) {
                  snapDelta = delta;
                  snapped = true;
                  break;
                }
              }
              if (snapped) break;
            }
            if (snapped) break;
          }
        }
        onUpdate({
          x: newX + snapDelta.x,
          y: newY + snapDelta.y,
        });
      } else if (draggedVertexIndex !== null && resizeMode === "free") {
        const containerRect = document
          .querySelector(".crop-container")
          ?.getBoundingClientRect();
        if (containerRect) {
          const newVertices = [...croppedImage.vertices];
          newVertices[draggedVertexIndex] = {
            x: e.clientX - (containerRect.left + croppedImage.x),
            y: e.clientY - (containerRect.top + croppedImage.y),
          };
          onUpdate({ vertices: newVertices });
        }
      } else if (isResizing && resizeMode === "size") {
        const containerRect = document
          .querySelector(".crop-container")
          ?.getBoundingClientRect();
        if (containerRect) {
          const mouseX = e.clientX - (containerRect.left + croppedImage.x);
          const mouseY = e.clientY - (containerRect.top + croppedImage.y);
          const minX = Math.min(...croppedImage.vertices.map((v) => v.x));
          const minY = Math.min(...croppedImage.vertices.map((v) => v.y));
          const newWidth = Math.max(40, mouseX - minX);
          const newHeight = Math.max(40, mouseY - minY);
          const newVertices = [
            { x: minX, y: minY },
            { x: minX + newWidth, y: minY },
            { x: minX + newWidth, y: minY + newHeight },
            { x: minX, y: minY + newHeight },
          ];
          onUpdate({
            vertices: newVertices,
            width: newWidth,
            height: newHeight,
          });
        }
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedVertexIndex(null);
      setIsResizing(false);
    };

    if (!isLocked && isSelected && (isDragging || draggedVertexIndex !== null || isResizing)) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    isDragging,
    draggedVertexIndex,
    dragStart,
    croppedImage.x,
    croppedImage.y,
    croppedImage.vertices,
    onUpdate,
    isResizing,
    resizeMode,
    isLocked,
    shapeType,
    croppedImages,
    isSelected,
    isRotatingMode,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isSelected || isRotatingMode) return;
    if (isLocked) return;
    if (isResizing) return;
    if (e.button === 0) { // Botão esquerdo
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - croppedImage.x,
        y: e.clientY - croppedImage.y,
      });
    }
  };

  const handleVertexMouseDown = (e: React.MouseEvent, index: number) => {
    if (!isSelected || isRotatingMode) return;
    if (isLocked) return;
    if (e.button === 0 && resizeMode === "free") {
      e.preventDefault();
      e.stopPropagation();
      setDraggedVertexIndex(index);
    }
  };
  
  // Calcular bounding box dos vértices
  let minX = Math.min(...croppedImage.vertices.map((v) => v.x));
  let maxX = Math.max(...croppedImage.vertices.map((v) => v.x));
  let minY = Math.min(...croppedImage.vertices.map((v) => v.y));
  let maxY = Math.max(...croppedImage.vertices.map((v) => v.y));

  let boundingWidth = maxX - minX;
  let boundingHeight = maxY - minY;

  // No modo size, forçar vértices alinhados ao retângulo ou polígono regular
  let displayVertices = croppedImage.vertices;
  if (resizeMode === "size") {
    if (shapeType === "quadrilateral" || shapeType === "circle") {
      displayVertices = [
        { x: 0, y: 0 },
        { x: boundingWidth, y: 0 },
        { x: boundingWidth, y: boundingHeight },
        { x: 0, y: boundingHeight },
      ];
    } else if (shapeType === "triangle") {
      displayVertices = getRegularPolygonVertices(3, boundingWidth, boundingHeight, 0);
    } else if (shapeType === "pentagon") {
      displayVertices = getRegularPolygonVertices(5, boundingWidth, boundingHeight, 0);
    } else if (shapeType === "hexagon") {
      displayVertices = getRegularPolygonVertices(6, boundingWidth, boundingHeight, 0);
    }
  }

  const polygonPoints = displayVertices
    .map((vertex) => `${vertex.x},${vertex.y}`)
    .join(" ");

  // Função para calcular vértices de polígono regular
  function getRegularPolygonVertices(sides: number, width: number, height: number, padding: number = 0) {
    const cx = width / 2;
    const cy = height / 2;
    const r = Math.min(width, height) / 2 - padding;
    const vertices = [];
    for (let i = 0; i < sides; i++) {
      const angle = (2 * Math.PI * i) / sides - Math.PI / 2;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      vertices.push({ x, y });
    }
    return vertices;
  }

  // Atualizar vértices conforme a forma
  const setShape = (type: string) => {
    let newVertices = croppedImage.vertices;
    let newResizeMode = croppedImage.resizeMode || "size";
    if (type === "quadrilateral") {
      newVertices = [
        { x: 0, y: 0 },
        { x: boundingWidth, y: 0 },
        { x: boundingWidth, y: boundingHeight },
        { x: 0, y: boundingHeight },
      ];
    } else if (type === "triangle") {
      newVertices = getRegularPolygonVertices(3, boundingWidth, boundingHeight, 0);
    } else if (type === "pentagon") {
      newVertices = getRegularPolygonVertices(5, boundingWidth, boundingHeight, 0);
    } else if (type === "hexagon") {
      newVertices = getRegularPolygonVertices(6, boundingWidth, boundingHeight, 0);
    } else if (type === "circle") {
      newVertices = [
        { x: 0, y: 0 },
        { x: boundingWidth, y: 0 },
        { x: boundingWidth, y: boundingHeight },
        { x: 0, y: boundingHeight },
      ];
      // Se estava em livre, força para size
      if (croppedImage.resizeMode === "free") {
        newResizeMode = "size";
      }
    }
    onUpdate({
      vertices: newVertices,
      resizeMode: newResizeMode,
      shapeType: type as CroppedImage["shapeType"],
    });
  };

  // Handle para resize retangular
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (isLocked) return;
    if (resizeMode === "size" && e.button === 0) {
      e.stopPropagation();
      setIsResizing(true);
    }
  };

  // Calcular posição do handle de resize
  let handlePos: { left?: number; top?: number; right?: number; bottom?: number } = { left: undefined, top: undefined, right: undefined, bottom: undefined };
  if (resizeMode === "size" && shapeType !== "circle") {
    // Pega o vértice de displayVertices com maior x + y
    let maxIndex = 0;
    let maxSum = displayVertices[0].x + displayVertices[0].y;
    displayVertices.forEach((v, i) => {
      const sum = v.x + v.y;
      if (sum > maxSum) {
        maxSum = sum;
        maxIndex = i;
      }
    });
    const v = displayVertices[maxIndex];
    handlePos = { left: v.x - 5, top: v.y - 5 };
  }
  if (resizeMode === "size" && shapeType === "circle") {
    // Centro do círculo
    const cx = boundingWidth / 2;
    const cy = boundingHeight / 2;
    const rx = boundingWidth / 2;
    const ry = boundingHeight / 2;
    // Ponto na borda a 45° (diagonal inferior-direita)
    const angle = Math.PI / 4;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    handlePos = { left: x - 5, top: y - 5 };
  }

  // Função para calcular ângulo entre centro e mouse
  function getAngleFromCenter(e: MouseEvent | React.MouseEvent) {
    const rect = (e.target as HTMLElement).closest('.polygon-outer')?.getBoundingClientRect();
    if (!rect) return 0;
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    return Math.atan2(dy, dx) * 180 / Math.PI;
  }

  // Eventos de rotação
  useEffect(() => {
    if (!isRotating) return;
    function onMouseMove(e: MouseEvent) {
      if (!rotateStart) return;
      const angleNow = getAngleFromCenter(e);
      const delta = angleNow - rotateStart.mouseAngle;
      onUpdate && onUpdate({ rotation: rotateStart.angle + delta });
    }
    function onMouseUp() {
      setIsRotating(false);
      setRotateStart(null);
    }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isRotating, rotateStart, onUpdate]);

  // Centro da aresta superior (de 0 a 1)
  const topEdgeCenter = {
    x: (displayVertices[0].x + displayVertices[1].x) / 2,
    y: (displayVertices[0].y + displayVertices[1].y) / 2,
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div
            className={`absolute select-none polygon-outer${isLocked || !isSelected ? '' : ' cursor-move'}`}
            style={{
              left: croppedImage.x,
              top: croppedImage.y,
              width: boundingWidth,
              height: boundingHeight,
              transform: `rotate(${rotation}deg)`
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <svg
              width={boundingWidth}
              height={boundingHeight}
              className="absolute inset-0"
              style={{ overflow: "visible" }}
            >
              <defs>
                <clipPath id={`clip-${croppedImage.id}`}>
                  {shapeType === "circle" ? (
                    <ellipse
                      cx={boundingWidth / 2}
                      cy={boundingHeight / 2}
                      rx={boundingWidth / 2}
                      ry={boundingHeight / 2}
                    />
                  ) : (
                    <polygon points={polygonPoints} />
                  )}
                </clipPath>
              </defs>

              <image
                href={croppedImage.url || "/placeholder.svg"}
                x={minX}
                y={minY}
                width={boundingWidth}
                height={boundingHeight}
                clipPath={`url(#clip-${croppedImage.id})`}
                className="pointer-events-none"
                preserveAspectRatio="none"
                style={{ filter: !isSelected && isHovered ? 'brightness(0.6)' : undefined }}
              />

              {/* Overlay de hover e ícone de clique */}
              {!isSelected && isHovered && (
                <g>
                  {/* Overlay escuro */}
                  {shapeType === "circle" ? (
                    <ellipse
                      cx={boundingWidth / 2}
                      cy={boundingHeight / 2}
                      rx={boundingWidth / 2}
                      ry={boundingHeight / 2}
                      fill="#000"
                      fillOpacity={0.25}
                    />
                  ) : (
                    <polygon
                      points={polygonPoints}
                      fill="#000"
                      fillOpacity={0.25}
                    />
                  )}
                  {/* Ícone de clique (mão) centralizado */}
                  <g style={{ pointerEvents: 'none' }}>
                    <svg x={boundingWidth/2 - 16} y={boundingHeight/2 - 16} width="32" height="32" viewBox="0 0 24 24" fill="none">
                      <path d="M7 11V7.5C7 6.11929 8.11929 5 9.5 5C10.3284 5 11 5.67157 11 6.5V11M11 11V6.5C11 5.67157 11.6716 5 12.5 5C13.3284 5 14 5.67157 14 6.5V11M14 11V8.5C14 7.67157 14.6716 7 15.5 7C16.3284 7 17 7.67157 17 8.5V14.5M17 14.5C17 16.9853 14.9853 19 12.5 19C10.0147 19 8 16.9853 8 14.5V11H11H14H17V14.5Z" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </g>
                </g>
              )}

              {/* Bordas e vértices só aparecem se não estiver bloqueado e estiver selecionado */}
              {isSelected && !isLocked && (
                <>
                  {shapeType === "circle" ? (
                    <ellipse
                      cx={boundingWidth / 2}
                      cy={boundingHeight / 2}
                      rx={boundingWidth / 2}
                      ry={boundingHeight / 2}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                  ) : (
                    <polygon
                      points={polygonPoints}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="2"
                    />
                  )}

                  {resizeMode === "free" && croppedImage.vertices.map((vertex, index) => (
                    <circle
                      key={index}
                      cx={vertex.x}
                      cy={vertex.y}
                      r="4"
                      fill="#3b82f6"
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer hover:fill-blue-600 transition-colors"
                      onMouseDown={(e) => handleVertexMouseDown(e as any, index)}
                    />
                  ))}
                </>
              )}
            </svg>
            {/* Handle só aparece se não estiver bloqueado, estiver selecionado e não estiver em modo rotação */}
            {resizeMode === "size" && isSelected && !isLocked && (
              <div
                style={{
                  position: "absolute",
                  ...(handlePos),
                  width: 10,
                  height: 10,
                  cursor: "se-resize",
                  background: "#3b82f6",
                  borderRadius: 5,
                  border: "2px solid #fff",
                  zIndex: 10,
                }}
                onMouseDown={handleResizeMouseDown}
                title="Redimensionar"
              />
            )}
            {/* Área de clique para selecionar o recorte */}
            {!isSelected && isHovered && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  width: boundingWidth,
                  height: boundingHeight,
                  cursor: 'pointer',
                  zIndex: 20,
                }}
                onClick={onSelect}
              />
            )}
            {/* Botão de rotação no vértice superior direito (exemplo) */}
            {isSelected && isRotatingMode && (
              <div
                style={{
                  position: "absolute",
                  left: topEdgeCenter.x - 14,
                  top: topEdgeCenter.y - 28,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isRotating ? 'grabbing' : 'grab',
                  zIndex: 20,
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: '50%',
                  border: '1.5px solid #3b82f6',
                  boxShadow: '0 2px 8px 0 rgba(59,130,246,0.08)'
                }}
                title="Rotacionar"
                onMouseDown={e => {
                  e.stopPropagation();
                  setIsRotating(true);
                  setRotateStart({ angle: rotation, mouseAngle: getAngleFromCenter(e) });
                }}
              >
                <RotateCw className="w-5 h-5 text-blue-600" />
              </div>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-52">
          {/* Switch de seleção */}
          <div className="flex items-center space-x-2 px-2 py-2">
            <Switch id={`select-switch-${croppedImage.id}`} checked={isSelected} onCheckedChange={checked => {
              if (checked) onSelect && onSelect();
              else onDeselect && onDeselect();
            }} />
            <Label htmlFor={`select-switch-${croppedImage.id}`}>Selecionado</Label>
          </div>
          {/* Switch de rotação */}
          <div className="flex items-center space-x-2 px-2 py-2">
            <Switch id={`rotate-switch-${croppedImage.id}`} checked={!!isRotatingMode} onCheckedChange={checked => onToggleRotate && onToggleRotate(checked)} />
            <Label htmlFor={`rotate-switch-${croppedImage.id}`}>Rotação</Label>
          </div>
          <ContextMenuSeparator />
          {/* Grupo de Forma */}
          <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">Polígono/Forma</div>
          <ContextMenuRadioGroup
            value={shapeType}
            onValueChange={(value) => setShape(value)}
          >
            <ContextMenuRadioItem value="quadrilateral">Quadrilátero</ContextMenuRadioItem>
            <ContextMenuRadioItem value="circle">Círculo</ContextMenuRadioItem>
            <ContextMenuRadioItem value="triangle">Triângulo</ContextMenuRadioItem>
            <ContextMenuRadioItem value="pentagon">Pentágono</ContextMenuRadioItem>
            <ContextMenuRadioItem value="hexagon">Hexágono</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          {/* Grupo de Transformação */}
          <div className="px-2 py-1 text-xs text-muted-foreground font-semibold">Transformação</div>
          <ContextMenuRadioGroup
            value={resizeMode}
            onValueChange={(value) => {
              if (value === "size") {
                onUpdate({ resizeMode: "size" });
              } else if (value === "free") {
                // Só permite livre se não for círculo
                if (shapeType !== "circle") {
                  onUpdate({ resizeMode: "free" });
                }
              }
            }}
          >
            <ContextMenuRadioItem value="size">Largura/Altura</ContextMenuRadioItem>
            <ContextMenuRadioItem value="free" disabled={shapeType === "circle"}>Livre</ContextMenuRadioItem>
          </ContextMenuRadioGroup>
          <ContextMenuSeparator />
          <ContextMenuItem onSelect={() => setIsLocked(l => !l)}>
            {isLocked ? (
              <>
                <Unlock className="w-4 h-4 mr-2" /> Desbloquear
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" /> Bloquear
              </>
            )}
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}

// Calcula o ponto mais próximo entre dois segmentos e retorna o delta necessário para alinhar
function segmentSnap(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  b1: { x: number; y: number },
  b2: { x: number; y: number }
) {
  // Função auxiliar: retorna o ponto mais próximo de p no segmento ab
  function closestPointOnSegment(p: { x: number; y: number }, s1: { x: number; y: number }, s2: { x: number; y: number }) {
    const dx = s2.x - s1.x;
    const dy = s2.y - s1.y;
    if (dx === 0 && dy === 0) return s1;
    const t = ((p.x - s1.x) * dx + (p.y - s1.y) * dy) / (dx * dx + dy * dy);
    if (t < 0) return s1;
    if (t > 1) return s2;
    return { x: s1.x + t * dx, y: s1.y + t * dy };
  }
  // Testar todos os extremos de a em b e vice-versa
  const candidates: { dist: number; delta: { x: number; y: number } }[] = [];
  // a1 em b1-b2
  const cp1 = closestPointOnSegment(a1, b1, b2);
  candidates.push({ dist: Math.hypot(a1.x - cp1.x, a1.y - cp1.y), delta: { x: cp1.x - a1.x, y: cp1.y - a1.y } });
  // a2 em b1-b2
  const cp2 = closestPointOnSegment(a2, b1, b2);
  candidates.push({ dist: Math.hypot(a2.x - cp2.x, a2.y - cp2.y), delta: { x: cp2.x - a2.x, y: cp2.y - a2.y } });
  // b1 em a1-a2
  const cp3 = closestPointOnSegment(b1, a1, a2);
  candidates.push({ dist: Math.hypot(b1.x - cp3.x, b1.y - cp3.y), delta: { x: b1.x - cp3.x, y: b1.y - cp3.y } });
  // b2 em a1-a2
  const cp4 = closestPointOnSegment(b2, a1, a2);
  candidates.push({ dist: Math.hypot(b2.x - cp4.x, b2.y - cp4.y), delta: { x: b2.x - cp4.x, y: b2.y - cp4.y } });
  // Escolher o menor
  let min = candidates[0];
  for (const c of candidates) {
    if (c.dist < min.dist) min = c;
  }
  return min;
}