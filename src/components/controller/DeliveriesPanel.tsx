import { useState } from 'react';
import type { Unit, DeliveryBatch, DeliveryConfirmation, Request, FurnitureRequestToDesigner, Item, User } from '@/types';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Package, Scan, Clock, CheckCircle } from 'lucide-react';
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

  const [deliveriesTab, setDeliveriesTab] = useState<'pending' | 'completed'>('pending');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-foreground">Recebimentos da unidade</h3>
          <span className="text-xs text-muted-foreground">
            {allPendingConfirmation.length + pendingFurnitureDeliveries.length + completedBatches.length + completedFurniture.length} registro(s)
          </span>
        </div>
        <Button onClick={onShowQRScanner} size="sm" className="relative">
          {pendingControllerConfirmation.length > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
          <Scan className="h-3.5 w-3.5 mr-1.5" />
          Escanear QR
        </Button>
      </div>

      {hasNoDeliveries ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Package className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
        </div>
      ) : (
        <Tabs value={deliveriesTab} onValueChange={(v) => setDeliveriesTab(v as 'pending' | 'completed')} className="w-full">
          <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
            <TabsTrigger
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              value="pending"
            >
              <Clock className="h-4 w-4 shrink-0" />
              Aguardando ({allPendingConfirmation.length + pendingFurnitureDeliveries.length})
            </TabsTrigger>
            <TabsTrigger
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              value="completed"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              Confirmados ({completedBatches.length + completedFurniture.length})
            </TabsTrigger>
          </TabsList>
          <TabsContent value="pending" className="space-y-3 mt-4" forceMount={false}>
            {deliveriesTab === 'pending' ? (
              <PendingDeliveriesTab
                pendingBatches={allPendingConfirmation}
                pendingFurnitureDeliveries={pendingFurnitureDeliveries}
                requests={requests}
                furnitureRequestsToDesigner={furnitureRequestsToDesigner}
                getItemById={getItemById}
                getUserById={getUserById}
                onSelectBatchForReceipt={onSelectBatchForReceipt}
              />
            ) : null}
          </TabsContent>
          <TabsContent value="completed" className="space-y-3 mt-4" forceMount={false}>
            {deliveriesTab === 'completed' ? (
              <CompletedDeliveriesTab
                completedBatches={completedBatches}
                completedFurniture={completedFurniture}
                requests={requests}
                getItemById={getItemById}
                getUserById={getUserById}
                getConfirmationsForBatch={getConfirmationsForBatch}
              />
            ) : null}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
