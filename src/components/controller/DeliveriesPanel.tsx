import type { Unit, DeliveryBatch, DeliveryConfirmation, Request, FurnitureRequestToDesigner, Item, User } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Package, Scan } from 'lucide-react';
import { PendingDeliveriesTab } from './PendingDeliveriesTab';
import { CompletedDeliveriesTab } from './CompletedDeliveriesTab';

interface DeliveriesPanelProps {
  currentUnit: Unit;
  deliveryBatches: DeliveryBatch[];
  requests: Request[];
  furnitureRequestsToDesigner: FurnitureRequestToDesigner[];
  getItemById: (id: string) => Item | undefined;
  getUserById: (id: string) => User | undefined;
  getConfirmationsForBatch: (batchId: string) => DeliveryConfirmation[];
  onSelectBatchForReceipt: (batchId: string) => void;
  onShowQRScanner: () => void;
}

export function DeliveriesPanel({
  currentUnit,
  deliveryBatches,
  requests,
  furnitureRequestsToDesigner,
  getItemById,
  getUserById,
  getConfirmationsForBatch,
  onSelectBatchForReceipt,
  onShowQRScanner,
}: DeliveriesPanelProps) {
  const pendingDriverConfirmation = deliveryBatches.filter(
    batch => batch.targetUnitId === currentUnit.id && batch.status === 'pending_confirmation'
  );
  const pendingControllerConfirmation = deliveryBatches.filter(
    batch => batch.targetUnitId === currentUnit.id && batch.status === 'delivery_confirmed'
  );
  const pendingFurnitureDeliveries = furnitureRequestsToDesigner.filter(
    req => req.requestingUnitId === currentUnit.id && req.status === 'pending_confirmation'
  );
  const allPendingConfirmation = [...pendingDriverConfirmation, ...pendingControllerConfirmation];
  const completedBatches = deliveryBatches.filter(
    batch => batch.targetUnitId === currentUnit.id && batch.status === 'completed'
  );
  const completedFurniture = furnitureRequestsToDesigner.filter(
    req => req.requestingUnitId === currentUnit.id && req.status === 'completed'
  );

  const hasNoDeliveries =
    allPendingConfirmation.length === 0 &&
    pendingFurnitureDeliveries.length === 0 &&
    completedBatches.length === 0 &&
    completedFurniture.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Package className="h-5 w-5" />
              Meus Recebimentos
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Entregas recebidas em {currentUnit.name}
            </CardDescription>
          </div>
          <Button onClick={onShowQRScanner} className="bg-primary hover:bg-primary/90 relative" size="sm">
            {pendingControllerConfirmation.length > 0 && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
            )}
            <Scan className="h-4 w-4 mr-2" />
            Escanear QR Code
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasNoDeliveries ? (
          <div className="text-center py-12 text-slate-500">
            <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p>Nenhum lote recebido nesta unidade</p>
          </div>
        ) : (
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending">
                Aguardando Confirmação ({allPendingConfirmation.length + pendingFurnitureDeliveries.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Confirmados ({completedBatches.length + completedFurniture.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="space-y-3 mt-4">
              <PendingDeliveriesTab
                pendingBatches={allPendingConfirmation}
                pendingFurnitureDeliveries={pendingFurnitureDeliveries}
                requests={requests}
                furnitureRequestsToDesigner={furnitureRequestsToDesigner}
                getItemById={getItemById}
                getUserById={getUserById}
                onSelectBatchForReceipt={onSelectBatchForReceipt}
              />
            </TabsContent>
            <TabsContent value="completed" className="space-y-3 mt-4">
              <CompletedDeliveriesTab
                completedBatches={completedBatches}
                completedFurniture={completedFurniture}
                requests={requests}
                getItemById={getItemById}
                getUserById={getUserById}
                getConfirmationsForBatch={getConfirmationsForBatch}
              />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
