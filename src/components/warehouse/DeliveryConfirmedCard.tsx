import type { Request, DeliveryBatch, Item, User, Unit } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

interface DeliveryConfirmedCardProps {
  batches: DeliveryBatch[];
  requests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => User | undefined;
  getUnitById: (id: string) => Unit | undefined;
  onFinalizeBatch: (batchId: string) => void;
}

export function DeliveryConfirmedCard({
  batches, requests, getItemById, getUserById, getUnitById, onFinalizeBatch,
}: DeliveryConfirmedCardProps) {
  if (batches.length === 0) return null;

  return (
    <Card className="border border-green-300/80 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-400" />
            <CardTitle className="text-base sm:text-lg">Finalizar após confirmação no destino</CardTitle>
          </div>
          <Badge className="w-fit bg-green-600 text-white">{batches.length} lote(s)</Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          O controlador já confirmou no destino. Finalize aqui para concluir o fluxo do lote.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {batches.map(batch => {
          const driver = getUserById(batch.driverUserId);
          const targetUnit = getUnitById(batch.targetUnitId);
          const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
          const totalItems = batchRequests.length + (batch.furnitureRequestIds?.length || 0);

          return (
            <div key={batch.id} className="rounded-lg border border-green-200/90 bg-card p-4 dark:border-green-900">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">Lote {batch.qrCode}</p>
                  <p className="text-xs text-muted-foreground">
                    Destino: {targetUnit?.name} • {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </p>
                  <p className="text-xs text-muted-foreground">Motorista: {driver?.name}</p>
                </div>
                <Badge className="bg-green-600">Confirmado</Badge>
              </div>
              <div className="space-y-2 mb-3">
                {batchRequests.map(req => {
                  const item = getItemById(req.itemId);
                  return (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                      <span className="truncate flex-1">{item?.name}</span>
                      <Badge variant="outline" className="ml-2">Qtd: {req.quantity}</Badge>
                    </div>
                  );
                })}
              </div>
              <Button
                size="sm"
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={() => onFinalizeBatch(batch.id)}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Registrar Conclusão
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
