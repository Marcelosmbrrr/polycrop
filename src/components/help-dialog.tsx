import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { FC } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const HelpDialog: FC<HelpDialogProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="w-full !max-w-4xl">
      <DialogHeader>
        <DialogTitle>Como usar o PolyCrop</DialogTitle>
      </DialogHeader>
      <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
      <AccordionItem value="item-1">
          <AccordionTrigger>Novo Projeto</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Use o botão <b>Novo</b> para escolher um template de mosaico (full screen ou polígono).</p>
            <p>Arraste e redimensione as áreas do mosaico na tela principal conforme desejar.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-2">
          <AccordionTrigger>Adicionar imagens</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Use o botão <b>Imagem</b> no topo da tela para adicionar novas imagens ao projeto.</p>
            <p>As imagens adicionadas aparecerão na barra lateral esquerda.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-3">
          <AccordionTrigger>Selecionar e recortar imagens</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Clique em uma imagem na barra lateral para selecioná-la.</p>
            <p>Com uma imagem selecionada, clique em <b>Recortar</b> para abrir a ferramenta de recorte.</p>
            <p>Defina a área de recorte e confirme para adicionar o recorte ao mosaico.</p>
          </AccordionContent>
        </AccordionItem>
        
        <AccordionItem value="item-4">
          <AccordionTrigger>Manipulação dos recortes</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Clique com o botão direito em um recorte para acessar o menu de contexto.</p>
            <p>Altere a forma do recorte (triângulo, círculo, etc) ou o modo de manipulação (Largura/Altura ou Livre).</p>
            <p>Você pode bloquear o recorte para evitar alterações acidentais.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-5">
          <AccordionTrigger>Exportar composição</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Use o menu <b>Gerar</b> para exportar a composição como imagem PNG ou PDF.</p>
            <p>Você pode visualizar um preview antes de exportar.</p>
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="item-6">
          <AccordionTrigger>Navegação e atalhos</AccordionTrigger>
          <AccordionContent className="flex flex-col gap-2 text-balance">
            <p>Para mover a tela, segure <b>Espaço</b> e arraste com o mouse.</p>
            <p>Para dar zoom, use <b>Ctrl + Scroll</b> ou <b>Alt + Scroll</b>.</p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <DialogFooter>
        <Button onClick={() => onOpenChange(false)} autoFocus>Fechar</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
); 