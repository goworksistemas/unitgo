import type { Request, DeliveryBatch, Item, User, Unit } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PackageCheck } from 'lucide-react';
import { toast } from 'sonner';

interface PendingSeparationCardProps {
  batches: DeliveryBatch[];
  requests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => User | undefined;
  getUnitById: (id: string) => Unit | undefined;
  separateItemInBatch?: (requestId: string, batchId: string) => Promise<void>;
}

export function PendingSeparationCard({
  batches, requests, getItemById, getUserById, getUnitById, separateItemInBatch,
}: PendingSeparationCardProps) {
  if (batches.length === 0) return null;

  return (
    <Card className="border-2 border-orange-400 bg-gradient-to-br from-orange-50 to-yellow-50">
      <CardHeader>
        <CardTitle className="text-base sm:text-lg flex items-center gap-2">
          <PackageCheck className="h-5 w-5 text-orange-600" />
          Lotes Aguardando Separação ({batches.length})
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Separe cada item do lote. Quando todos separados, vai automaticamente para o motorista
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {batches.map(batch => {
          const driver = getUserById(batch.driverUserId);
          const unit = getUnitById(batch.targetUnitId);
          const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));

          return (
            <div key={batch.id} className="bg-white rounded-lg p-4 border-2 border-orange-300">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold">Lote #{batch.qrCode}</h4>
                  <p className="text-xs text-gray-600">Destino: {unit?.name}</p>
                  <p className="text-xs text-gray-600">Motorista: {driver?.name}</p>
                </div>
                <Badge className="bg-orange-500">Separando</Badge>
              </div>

              <div className="space-y-2">
                {batchRequests.map(req => {
                  const item = getItemById(req.itemId);
                  const isSeparated = req.status === 'awaiting_pickup';

                  return (
                    <div
                      key={req.id}
                      className={`flex items-center justify-between p-3 rounded border-2 ${
                        isSeparated ? 'bg-green-50 border-green-300' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item?.name}</p>
                        <p className="text-xs text-gray-600">Qtd: {req.quantity}</p>
                      </div>
                      {isSeparated ? (
                        <Badge className="bg-green-600"> Separado</Badge>
                      ) : (
                        <Button
                          size="sm"
                          className="bg-orange-500 hover:bg-orange-600"
                          onClick={async () => {
                            if (separateItemInBatch) {
                              try {
                                await separateItemInBatch(req.id, batch.id);
                                toast.success(`Item separado! ${batchRequests.filter(r => r.status === 'awaiting_pickup').length + 1}/${batchRequests.length}`);
                              } catch (error) {
                                console.error('Erro ao separar item:', error);
                                toast.error('Erro ao separar item. Tente novamente.');
                              }
                            }
                          }}
                        >
                          <PackageCheck className="h-4 w-4 mr-1" />
                          Separar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
