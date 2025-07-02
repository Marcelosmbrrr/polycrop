"use client";

import type React from "react";
import { useState, useEffect } from "react";

interface CroppedImage {
  id: string;
  url: string;
  x: number;
  y: number;
  width: number;
  height: number;
  vertices: { x: number; y: number }[];
  resizeMode?: "size" | "free";
}

interface PolygonImageProps {
  croppedImage: CroppedImage;
  onUpdate: (updates: Partial<CroppedImage>) => void;
  onDelete: () => void;
}

export function PolygonImage({ croppedImage, onUpdate, onDelete }: PolygonImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState(false);
  const resizeMode = croppedImage.resizeMode || "size";

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onUpdate({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
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

    const handleClickOutside = () => {
      setContextMenu({ visible: false, x: 0, y: 0 });
    };

    if (isDragging || draggedVertexIndex !== null || isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("click", handleClickOutside);
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
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Botão esquerdo
      e.preventDefault();
      setIsDragging(true);
      setDragStart({
        x: e.clientX - croppedImage.x,
        y: e.clientY - croppedImage.y,
      });
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleVertexMouseDown = (e: React.MouseEvent, index: number) => {
    if (e.button === 0 && resizeMode === "free") {
      e.preventDefault();
      e.stopPropagation();
      setDraggedVertexIndex(index);
    }
  };

  const handleDelete = () => {
    onDelete();
    setContextMenu({ visible: false, x: 0, y: 0 });
  };

  // Calcular bounding box dos vértices
  let minX = Math.min(...croppedImage.vertices.map((v) => v.x));
  let maxX = Math.max(...croppedImage.vertices.map((v) => v.x));
  let minY = Math.min(...croppedImage.vertices.map((v) => v.y));
  let maxY = Math.max(...croppedImage.vertices.map((v) => v.y));

  let boundingWidth = maxX - minX;
  let boundingHeight = maxY - minY;

  // No modo size, forçar vértices alinhados ao retângulo
  let displayVertices = croppedImage.vertices;
  if (resizeMode === "size") {
    boundingWidth = croppedImage.width || boundingWidth;
    boundingHeight = croppedImage.height || boundingHeight;
    minX = 0;
    minY = 0;
    displayVertices = [
      { x: 0, y: 0 },
      { x: boundingWidth, y: 0 },
      { x: boundingWidth, y: boundingHeight },
      { x: 0, y: boundingHeight },
    ];
  }

  const polygonPath =
    displayVertices
      .map(
        (vertex, index) => `${index === 0 ? "M" : "L"} ${vertex.x} ${vertex.y}`
      )
      .join(" ") + " Z";

  const polygonPoints = displayVertices
    .map((vertex) => `${vertex.x},${vertex.y}`)
    .join(" ");

  // Função para transformar em retângulo
  const toRectangle = () => {
    const newVertices = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY },
    ];
    onUpdate({
      vertices: newVertices,
      resizeMode: "size",
    });
  };

  // Alternar para modo livre
  const toFree = () => {
    onUpdate({ resizeMode: "free" });
  };

  // Handle para resize retangular
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    if (resizeMode === "size" && e.button === 0) {
      e.stopPropagation();
      setIsResizing(true);
    }
  };

  return (
    <>
      <div
        className="absolute cursor-move select-none"
        style={{
          left: croppedImage.x,
          top: croppedImage.y,
          width: boundingWidth,
          height: boundingHeight,
        }}
        onMouseDown={handleMouseDown}
        onContextMenu={handleContextMenu}
      >
        <svg
          width={boundingWidth}
          height={boundingHeight}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          <defs>
            <clipPath id={`clip-${croppedImage.id}`}>
              <polygon points={polygonPoints} />
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
          />

          <polygon
            points={polygonPoints}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {resizeMode === "free" && croppedImage.vertices.map((vertex, index) => (
            <circle
              key={index}
              cx={vertex.x}
              cy={vertex.y}
              r="6"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
              className="cursor-pointer hover:fill-blue-600 transition-colors"
              onMouseDown={(e) => handleVertexMouseDown(e as any, index)}
            />
          ))}
        </svg>
        {/* Handle de resize no modo size */}
        {resizeMode === "size" && (
          <div
            style={{
              position: "absolute",
              right: -8,
              bottom: -8,
              width: 16,
              height: 16,
              cursor: "se-resize",
              background: "#3b82f6",
              borderRadius: 8,
              border: "2px solid #fff",
              zIndex: 10,
            }}
            onMouseDown={handleResizeMouseDown}
            title="Redimensionar"
          />
        )}
      </div>

      {contextMenu.visible && (
        <div
          className="fixed bg-white shadow-lg rounded-md border border-gray-200 z-50"
          style={{
            left: contextMenu.x,
            top: contextMenu.y,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              if (resizeMode !== "size") toRectangle();
              setContextMenu({ ...contextMenu, visible: false });
            }}
            disabled={resizeMode === "size"}
          >
            Largura/Altura {resizeMode === "size" && "(Ativo)"}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100"
            onClick={() => {
              if (resizeMode !== "free") toFree();
              setContextMenu({ ...contextMenu, visible: false });
            }}
            disabled={resizeMode === "free"}
          >
            Livre {resizeMode === "free" && "(Ativo)"}
          </button>
          <button
            className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded-b-md"
            onClick={handleDelete}
          >
            Excluir
          </button>
        </div>
      )}
      {/* Indicação visual do modo ativo */}
      <div style={{position: 'absolute', left: 0, top: -28, background: '#fff', color: '#3b82f6', fontWeight: 600, fontSize: 12, borderRadius: 4, padding: '2px 8px', border: '1px solid #3b82f6'}}>
        {resizeMode === "size" ? "Largura/Altura" : "Livre"}
      </div>
    </>
  );
}