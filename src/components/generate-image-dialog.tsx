import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, Save, FileText, FileImage, FileScan, Share2 } from "lucide-react";
import React, { useState, useEffect } from "react";

interface GenerateImageDialogProps {
  generateImage: () => void;
  exportPDF?: () => void;
  disabled?: boolean;
  getPreviewDataUrl?: () => Promise<string | null>;
}

export function GenerateImageDialog({ generateImage, exportPDF, disabled, getPreviewDataUrl }: GenerateImageDialogProps) {
  const [open, setOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open && getPreviewDataUrl) {
      getPreviewDataUrl().then(setPreviewUrl);
    } else {
      setPreviewUrl(null);
    }
  }, [open, getPreviewDataUrl]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <form onSubmit={e => e.preventDefault()}>
        <DialogTrigger asChild>
          <Button
            disabled={disabled}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Gerar Imagem</DialogTitle>
            <DialogDescription>
              Escolha como deseja gerar a imagem final do mosaico.
            </DialogDescription>
          </DialogHeader>
          {previewUrl && (
            <div className="flex justify-center py-2">
              <img src={previewUrl} alt="Preview da imagem gerada" style={{ maxWidth: 320, maxHeight: 240, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }} />
            </div>
          )}
          <div className="flex flex-col gap-2 py-2">
            <Button
              onClick={generateImage}
              variant="ghost"
              className="justify-start"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PNG
            </Button>
            <Button
              onClick={exportPDF}
              variant="ghost"
              className="justify-start"
              disabled={!exportPDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" type="button">Cancelar</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
} 