import type { DeliveryBatch, DeliveryConfirmation, Request, FurnitureRequestToDesigner, Item, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Package, CheckCircle } from 'lucide-react';

interface CompletedDeliveriesTabProps {
  completedBatches: DeliveryBatch[];
  completedFurniture: FurnitureRequestToDesigner[];
  requests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => User | undefined;
  getConfirmationsForBatch: (batchId: string) => DeliveryConfirmation[];
}

export function CompletedDeliveriesTab({
  completedBatches,
  completedFurniture,
  requests,
  getItemById,
  getUserById,
  getConfirmationsForBatch,
}: CompletedDeliveriesTabProps) {
  if (completedBatches.length === 0 && completedFurniture.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        <Package className="h-10 w-10 mx-auto mb-2 text-slate-300" />
        <p className="text-sm">Nenhum lote confirmado ainda</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {completedBatches.slice(0, 10).map(batch => {
        const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
        const confirmations = getConfirmationsForBatch(batch.id);
        const controllerConfirmation = confirmations.find(c => c.type === 'receipt');
        const controllerUser = controllerConfirmation ? getUserById(controllerConfirmation.confirmedByUserId) : null;
        const requesterConfirmations = confirmations.filter(c => c.type === 'requester');

        return (
          <Card key={batch.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Lote {batch.qrCode}</CardTitle>
                  <CardDescription className="text-xs">
                    {batchRequests.length} {batchRequests.length === 1 ? 'item' : 'itens'}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-green-50 text-green-700">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Confirmado
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="space-y-2">
                  {batchRequests.slice(0, 3).map(req => {
                    const item = getItemById(req.itemId);
                    return (
                      <div key={req.id} className="flex items-center gap-2 text-xs text-slate-600">
                        <Package className="h-3 w-3" />
                        <span>{item?.name} - Qtd: {req.quantity}</span>
                      </div>
                    );
                  })}
                  {batchRequests.length > 3 && (
                    <p className="text-xs text-slate-500">+{batchRequests.length - 3} mais...</p>
                  )}
                </div>

                {controllerConfirmation && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-slate-700 mb-2">Confirmação do Controlador:</p>
                    <div className="bg-muted rounded-lg p-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span className="font-medium">{controllerUser?.name}</span>
                      </div>
                      <div className="text-xs text-slate-600 pl-5">
                        {new Date(controllerConfirmation.timestamp).toLocaleDateString('pt-BR')} às{' '}
                        {new Date(controllerConfirmation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div className="text-xs text-slate-600 pl-5">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          QR Code Presencial
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {requesterConfirmations.length > 0 && (
                  <div className="pt-3 border-t">
                    <p className="text-xs font-medium text-slate-700 mb-2">
                      Confirmações dos Solicitantes ({requesterConfirmations.length}):
                    </p>
                    <div className="space-y-2">
                      {requesterConfirmations.map(confirmation => {
                        const requester = getUserById(confirmation.confirmedByUserId);
                        const isCodeMethod = confirmation.notes?.includes('dailyCode:');
                        return (
                          <div key={confirmation.id} className="bg-muted rounded-lg p-2 space-y-1">
                            <div className="flex items-center gap-2 text-xs">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="font-medium">{requester?.name}</span>
                            </div>
                            <div className="text-xs text-slate-600 pl-5">
                              {new Date(confirmation.timestamp).toLocaleDateString('pt-BR')} às{' '}
                              {new Date(confirmation.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-xs text-slate-600 pl-5">
                              <Badge variant="outline" className={`text-xs ${isCodeMethod ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700'}`}>
                                {isCodeMethod ? 'Código Posterior' : 'QR Code Presencial'}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
