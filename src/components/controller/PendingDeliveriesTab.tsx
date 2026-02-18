import type { DeliveryBatch, Request, FurnitureRequestToDesigner, Item, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Package, Armchair, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PendingDeliveriesTabProps {
  pendingBatches: DeliveryBatch[];
  pendingFurnitureDeliveries: FurnitureRequestToDesigner[];
  requests: Request[];
  furnitureRequestsToDesigner: FurnitureRequestToDesigner[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => User | undefined;
  onSelectBatchForReceipt: (batchId: string) => void;
}

export function PendingDeliveriesTab({
  pendingBatches,
  pendingFurnitureDeliveries,
  requests,
  furnitureRequestsToDesigner,
  getItemById,
  getUserById,
  onSelectBatchForReceipt,
}: PendingDeliveriesTabProps) {
  if (pendingBatches.length === 0 && pendingFurnitureDeliveries.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <CheckCircle className="h-10 w-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">Todas as entregas confirmadas!</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {pendingBatches.map(batch => {
        const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
        const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r =>
          batch.furnitureRequestIds?.includes(r.id)
        );
        const driver = getUserById(batch.driverUserId);
        const isPendingConfirmation = batch.status === 'pending_confirmation';

        return (
          <Card key={batch.id} className={`border-2 ${isPendingConfirmation ? 'border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20' : 'border-secondary'}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Lote {batch.qrCode}</CardTitle>
                  <CardDescription className="text-xs">Motorista: {driver?.name}</CardDescription>
                </div>
                <Badge className={isPendingConfirmation ? 'bg-yellow-600' : 'bg-secondary'}>
                  {isPendingConfirmation ? 'Aguardando Motorista' : 'Entregue'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {isPendingConfirmation && (
                <Alert className="bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                    O motorista marcou como "Confirmar Depois". Confirme o recebimento com seu código único.
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Itens:</p>
                {batchRequests.map(req => {
                  const item = getItemById(req.itemId);
                  const requester = getUserById(req.requestedByUserId);
                  return (
                    <div key={req.id} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                      <Package className="h-3 w-3 text-slate-400" />
                      <div className="flex-1">
                        <p className="font-medium">{item?.name}</p>
                        <p className="text-muted-foreground">Qtd: {req.quantity} • Solicitante: {requester?.name}</p>
                      </div>
                    </div>
                  );
                })}
                {batchFurnitureRequests.map(req => {
                  const item = getItemById(req.itemId);
                  const requester = getUserById(req.requestedByUserId);
                  return (
                    <div key={req.id} className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                      <Armchair className="h-3 w-3 text-slate-400" />
                      <div className="flex-1">
                        <p className="font-medium">{item?.name}</p>
                        <p className="text-muted-foreground">Qtd: {req.quantity} • Solicitante: {requester?.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                className={`w-full ${isPendingConfirmation ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-secondary hover:bg-secondary/90'}`}
                onClick={() => onSelectBatchForReceipt(batch.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recebimento com Código
              </Button>
            </CardContent>
          </Card>
        );
      })}

      {pendingFurnitureDeliveries.map(furnitureReq => {
        const item = getItemById(furnitureReq.itemId);
        const driver = furnitureReq.deliveredByUserId ? getUserById(furnitureReq.deliveredByUserId) : null;

        return (
          <Card key={furnitureReq.id} className="border-2 border-yellow-500 bg-yellow-50/30 dark:bg-yellow-950/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Armchair className="h-4 w-4" />
                    {item?.name}
                  </CardTitle>
                  <CardDescription className="text-xs">Motorista: {driver?.name || 'Não informado'}</CardDescription>
                </div>
                <Badge className="bg-yellow-600">Entrega Individual</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert className="bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
                <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <AlertDescription className="text-xs text-yellow-800 dark:text-yellow-200">
                  O motorista marcou como "Confirmar Depois". Confirme o recebimento com seu código único.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Detalhes:</p>
                <div className="flex items-center gap-2 p-2 bg-muted rounded text-xs">
                  <Armchair className="h-3 w-3 text-slate-400" />
                  <div className="flex-1">
                    <p className="font-medium">{item?.name}</p>
                    <p className="text-muted-foreground">Qtd: {furnitureReq.quantity} • Local: {furnitureReq.location}</p>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full bg-yellow-600 hover:bg-yellow-700"
                onClick={() => toast.info('Funcionalidade de confirmação de móvel individual será implementada')}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Confirmar Recebimento com Código
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
