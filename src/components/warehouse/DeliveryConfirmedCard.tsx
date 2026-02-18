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
    <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <CardTitle className="text-base sm:text-lg">
              Entregas Confirmadas pelo Controlador
            </CardTitle>
          </div>
          <Badge className="bg-green-600 text-white">{batches.length}</Badge>
        </div>
        <CardDescription className="text-xs sm:text-sm">
          Controlador confirmou recebimento - registre para finalizar
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {batches.map(batch => {
          const driver = getUserById(batch.driverUserId);
          const targetUnit = getUnitById(batch.targetUnitId);
          const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
          const totalItems = batchRequests.length + (batch.furnitureRequestIds?.length || 0);

          return (
            <div key={batch.id} className="bg-white rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold">Lote {batch.qrCode}</p>
                  <p className="text-xs text-gray-600">
                    Destino: {targetUnit?.name} • {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                  </p>
                  <p className="text-xs text-gray-500">Motorista: {driver?.name}</p>
                </div>
                <Badge className="bg-green-600">Confirmado</Badge>
              </div>
              <div className="space-y-2 mb-3">
                {batchRequests.map(req => {
                  const item = getItemById(req.itemId);
                  return (
                    <div key={req.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs">
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
