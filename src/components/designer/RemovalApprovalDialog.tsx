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
import type { FurnitureRemovalRequest, Item } from '@/types';

export interface RemovalApprovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedRequestId: string | null;
  furnitureRemovalRequests: FurnitureRemovalRequest[];
  disposalJustification: string;
  onJustificationChange: (value: string) => void;
  onApprove: (decision: 'storage' | 'disposal') => void;
  getItemById: (id: string) => Item | undefined;
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
}: RemovalApprovalDialogProps) {
  const selectedRequest = selectedRequestId
    ? furnitureRemovalRequests.find(r => r.id === selectedRequestId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar Decisão</DialogTitle>
          <DialogDescription>
            {selectedRequest?.status === 'pending'
              ? 'Você está prestes a aprovar esta solicitação. Escolha se o móvel será armazenado ou descartado.'
              : 'Confirme a ação desejada'}
          </DialogDescription>
        </DialogHeader>

        {selectedRequestId && (
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">Item</div>
              <div>
                {getItemById(selectedRequest?.itemId || '')?.name}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="disposal-justification">
                Justificativa para Descarte {' '}
                <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="disposal-justification"
                value={disposalJustification}
                onChange={(e) => onJustificationChange(e.target.value)}
                placeholder="Ex: Móvel danificado irreparavelmente, fora dos padrões da empresa..."
                className="min-h-[100px]"
              />
              <p className="text-xs text-gray-500">
                Obrigatório apenas para descarte. Deixe em branco para armazenagem.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              onJustificationChange('');
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="default"
            onClick={() => onApprove('storage')}
          >
            Aprovar para Armazenagem
          </Button>
          <Button
            variant="destructive"
            onClick={() => onApprove('disposal')}
            disabled={!disposalJustification.trim()}
          >
            Aprovar para Descarte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
