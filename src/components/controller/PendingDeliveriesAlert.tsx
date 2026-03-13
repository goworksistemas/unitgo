import type { Unit, DeliveryBatch } from '@/types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { QrCode, CheckCircle } from 'lucide-react';

interface PendingDeliveriesAlertProps {
  currentUnit: Unit;
  deliveryBatches: DeliveryBatch[];
  onConfirmReceipt: (batchId: string) => void;
  onViewDetails: (batchId: string) => void;
}

export function PendingDeliveriesAlert({
  currentUnit,
  deliveryBatches,
  onConfirmReceipt,
  onViewDetails,
}: PendingDeliveriesAlertProps) {
  const pendingBatches = deliveryBatches.filter(
    b => b.targetUnitId === currentUnit.id && b.status === 'delivery_confirmed'
  );

  if (pendingBatches.length === 0) return null;

  return (
    <div className="divide-y divide-border border-b border-border">
      {pendingBatches.map(batch => {
        const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
        return (
          <div
            key={batch.id}
            className="flex items-center gap-2.5 px-5 py-1.5 text-xs border-l-[3px] border-yellow-400 bg-yellow-50/10 dark:bg-yellow-950/10 border-b border-border last:border-b-0"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium">
                Lote {batch.qrCode} — {totalItems} {totalItems === 1 ? 'item' : 'itens'}
              </p>
              <p className="text-muted-foreground">Aguardando confirmação de recebimento</p>
            </div>
            <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 shrink-0">
              Pendente
            </Badge>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button size="sm" variant="outline" onClick={() => onViewDetails(batch.id)}>
                Detalhes
              </Button>
              <Button size="sm" onClick={() => onConfirmReceipt(batch.id)}>
                <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                Confirmar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
