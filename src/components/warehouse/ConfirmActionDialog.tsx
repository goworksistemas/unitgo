import type { ActionType } from './useWarehouseActions';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ConfirmActionDialogProps {
  selectedRequest: string | null;
  actionType: ActionType;
  rejectionReason: string;
  setRejectionReason: (value: string) => void;
  confirmAction: () => void;
  resetActionState: () => void;
}

export function ConfirmActionDialog({
  selectedRequest, actionType, rejectionReason, setRejectionReason,
  confirmAction, resetActionState,
}: ConfirmActionDialogProps) {
  return (
    <AlertDialog open={!!selectedRequest} onOpenChange={resetActionState}>
      <AlertDialogContent className="max-w-[95vw] sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-base sm:text-lg">
            {actionType === 'approve' && 'Aprovar Solicitação'}
            {actionType === 'reject' && 'Rejeitar Solicitação'}
            {actionType === 'ready_pickup' && 'Marcar como Pronto'}
            {actionType === 'picked_up' && 'Confirmar Retirada'}
            {actionType === 'delivered' && 'Confirmar Entrega'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm">
            {actionType === 'approve' && 'Confirma a aprovação desta solicitação? O item será liberado para separação.'}
            {actionType === 'reject' && (
              <div className="space-y-4 pt-4">
                <p>Informe o motivo da rejeição:</p>
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Motivo</Label>
                  <Textarea
                    id="rejection-reason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Ex: Item fora de estoque, substituir por outro produto..."
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            )}
            {actionType === 'ready_pickup' && 'Confirma que o pedido foi separado e está pronto para retirada pelo motorista?'}
            {actionType === 'picked_up' && 'Confirma que você retirou este pedido e está saindo para entrega?'}
            {actionType === 'delivered' && 'Confirma que este pedido foi entregue com sucesso na unidade de destino?'}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="w-full sm:w-auto">Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={confirmAction} className="w-full sm:w-auto">
            Confirmar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
