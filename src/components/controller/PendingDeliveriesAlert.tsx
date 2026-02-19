import type { Unit, DeliveryBatch } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
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
    <Card className="border-2 border-secondary bg-secondary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-secondary" />
            <CardTitle className="text-base md:text-lg">Entregas para Confirmar</CardTitle>
          </div>
          <Badge className="bg-secondary">{pendingBatches.length}</Badge>
        </div>
        <CardDescription className="text-xs md:text-sm">
          Lotes entregues aguardando sua confirmação de recebimento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingBatches.map(batch => {
          const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
          return (
            <div key={batch.id} className="bg-card rounded-lg p-3 border border-border">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-sm">Lote {batch.qrCode}</p>
                  <p className="text-xs text-muted-foreground">
                    {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </p>
                </div>
                <Badge className="bg-green-600">Entregue</Badge>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-secondary hover:bg-secondary/90"
                  onClick={() => onConfirmReceipt(batch.id)}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Recebimento
                </Button>
                <Button size="sm" variant="outline" onClick={() => onViewDetails(batch.id)}>
                  Ver Detalhes
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
