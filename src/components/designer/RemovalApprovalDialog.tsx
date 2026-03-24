import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Hash, MessageSquare } from 'lucide-react';
import type { FurnitureRemovalRequest, Item, Unit } from '@/types';

export interface RemovalApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequestId: string | null;
  furnitureRemovalRequests: FurnitureRemovalRequest[];
  disposalJustification: string;
  onJustificationChange: (value: string) => void;
  onApprove: (decision: 'storage' | 'disposal') => void;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function RemovalApprovalDialog({
  open,
  onOpenChange,
  selectedRequestId,
  furnitureRemovalRequests,
  disposalJustification,
  onJustificationChange,
  onApprove,
  getItemById,
  getUnitById,
}: RemovalApprovalDialogProps) {
  const selectedRequest = selectedRequestId
    ? furnitureRemovalRequests.find((r) => r.id === selectedRequestId)
    : null;
  const item = selectedRequest ? getItemById(selectedRequest.itemId) : undefined;
  const unit = selectedRequest ? getUnitById(selectedRequest.unitId) : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Decidir retirada de móvel</DialogTitle>
          <DialogDescription>
            Confirme <strong className="text-foreground font-medium">armazenagem</strong> (volta ao estoque) ou{' '}
            <strong className="text-foreground font-medium">descarte</strong> (com justificativa obrigatória).
          </DialogDescription>
        </DialogHeader>

        {selectedRequest && item ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3 text-sm">
              <div>
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Item</div>
                <div className="font-medium text-foreground">{item.name}</div>
                {item.description ? (
                  <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{item.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-4 text-muted-foreground">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{unit?.name ?? 'Unidade'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Hash className="h-4 w-4 shrink-0" aria-hidden />
                  <span>Qtd. {selectedRequest.quantity}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                  <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  Motivo do solicitante
                </div>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{selectedRequest.reason || '—'}</p>
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border p-4">
              <p className="text-sm font-medium text-foreground">Armazenagem</p>
              <p className="text-xs text-muted-foreground">
                O móvel seguirá para coleta e retorno ao fluxo de estoque, sem justificativa extra aqui.
              </p>
              <Button type="button" className="w-full sm:w-auto" onClick={() => onApprove('storage')}>
                Aprovar armazenagem
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <p className="text-sm font-medium text-foreground">Descarte</p>
              <p className="text-xs text-muted-foreground">
                Obrigatório descrever o motivo (ex.: danos irreparáveis, fora do padrão).
              </p>
              <div className="space-y-2">
                <Label htmlFor="disposal-justification">Justificativa do descarte</Label>
                <Textarea
                  id="disposal-justification"
                  value={disposalJustification}
                  onChange={(e) => onJustificationChange(e.target.value)}
                  placeholder="Descreva o motivo do descarte…"
                  className="min-h-[100px] resize-y"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                className="w-full sm:w-auto"
                onClick={() => onApprove('disposal')}
                disabled={!disposalJustification.trim()}
              >
                Aprovar descarte
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Não foi possível carregar esta solicitação.</p>
        )}

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => {
              onOpenChange(false);
              onJustificationChange('');
            }}
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
