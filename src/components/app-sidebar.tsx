"use client";

import type React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarRail,
  SidebarHeader,
} from "@/components/ui/sidebar";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { HelpDialog } from "@/components/help-dialog";

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
  const [helpOpen, setHelpOpen] = useState(false);
  return (
    <Sidebar {...props}  variant="floating">
      <SidebarHeader>
        <div className="p-2">
          <h2 className="text-xl font-bold text-sidebar-foreground mb-1"> 
            PolyCrop <span className="text-sm text-sidebar-foreground">v0.1.0</span></h2>
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
        <div className="flex-1" />
        <div className="p-2 mt-auto">
          <Button variant="outline" className="w-full" onClick={() => setHelpOpen(true)}>
            Ajuda
          </Button>
        </div>
      </SidebarContent>
      <SidebarRail />
      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />
    </Sidebar>
  );
}
