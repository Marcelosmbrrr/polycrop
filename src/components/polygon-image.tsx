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
}

interface PolygonImageProps {
  croppedImage: CroppedImage;
  onUpdate: (updates: Partial<CroppedImage>) => void;
}

export function PolygonImage({ croppedImage, onUpdate }: PolygonImageProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(
    null
  );
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        // Arrastar toda a forma
        onUpdate({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y,
        });
      } else if (draggedVertexIndex !== null) {
        // Arrastar vértice específico
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
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setDraggedVertexIndex(null);
    };

    if (isDragging || draggedVertexIndex !== null) {
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
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - croppedImage.x,
      y: e.clientY - croppedImage.y,
    });
  };

  const handleVertexMouseDown = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDraggedVertexIndex(index);
  };

  // Calcular bounding box dos vértices
  const minX = Math.min(...croppedImage.vertices.map((v) => v.x));
  const maxX = Math.max(...croppedImage.vertices.map((v) => v.x));
  const minY = Math.min(...croppedImage.vertices.map((v) => v.y));
  const maxY = Math.max(...croppedImage.vertices.map((v) => v.y));

  const boundingWidth = maxX - minX;
  const boundingHeight = maxY - minY;

  const polygonPath =
    croppedImage.vertices
      .map(
        (vertex, index) => `${index === 0 ? "M" : "L"} ${vertex.x} ${vertex.y}`
      )
      .join(" ") + " Z";

  const polygonPoints = croppedImage.vertices
    .map((vertex) => `${vertex.x},${vertex.y}`)
    .join(" ");

  return (
    <div
      className="absolute cursor-move select-none"
      style={{
        left: croppedImage.x,
        top: croppedImage.y,
        width: boundingWidth,
        height: boundingHeight,
      }}
      onMouseDown={handleMouseDown}
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

        {croppedImage.vertices.map((vertex, index) => (
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
    </div>
  );
}
