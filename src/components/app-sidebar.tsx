"use client";

import type React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";

interface ImageData {
  id: string;
  url: string;
  name: string;
}

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  images: ImageData[];
  selectedImageId: string | null;
  onImageSelect: (id: string | null) => void;
}

export function AppSidebar({
  images,
  selectedImageId,
  onImageSelect,
  ...props
}: AppSidebarProps) {
  return (
    <Sidebar {...props}  variant="floating">
      <SidebarHeader>
        <div className="p-2">
          <h3 className="text-sm font-medium text-sidebar-foreground mb-2">
            Imagens ({images.length})
          </h3>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <div className="flex flex-col gap-2 p-2">
          {images.map((image) => (
            <div
              key={image.id}
              className={`relative group rounded-lg overflow-hidden border cursor-pointer transition-all ${
                selectedImageId === image.id
                  ? "border-blue-500 ring-2 ring-blue-200"
                  : "border-sidebar-border hover:border-blue-300"
              }`}
              onClick={() =>
                onImageSelect(selectedImageId === image.id ? null : image.id)
              }
            >
              <Image
                src={image.url || "/placeholder.svg"}
                alt={image.name}
                width={200}
                height={120}
                className="w-full h-24 object-cover"
                crossOrigin="anonymous"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                {image.name}
              </div>
              {selectedImageId === image.id && (
                <div className="absolute top-1 right-1 w-3 h-3 bg-blue-500 rounded-full" />
              )}
            </div>
          ))}
          {images.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-8">
              Nenhuma imagem adicionada
            </div>
          )}
        </div>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
