import type { Request, DeliveryBatch, FurnitureRemovalRequest, Item, Unit, User } from '@/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { ApprovedItemsCard } from './ApprovedItemsCard';
import { PendingSeparationCard } from './PendingSeparationCard';
import { DeliveryConfirmedCard } from './DeliveryConfirmedCard';
import { FurniturePickupsCard } from './FurniturePickupsCard';
import { ListOrdered } from 'lucide-react';

interface LogisticsPanelProps {
  isStorageWorker: boolean;
  isDeliveryDriver: boolean;
  approvedRequests: Request[];
  validPendingBatches: DeliveryBatch[];
  deliveryConfirmedBatches: DeliveryBatch[];
  furniturePickups: FurnitureRemovalRequest[];
  furnitureInTransit: FurnitureRemovalRequest[];
  requests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
  separateItemInBatch?: (requestId: string, batchId: string) => Promise<void>;
  onCreateBatch: () => void;
  onFinalizeBatch: (batchId: string) => void;
  onPickupFurniture: (id: string) => void;
  onReceiveFurniture: (id: string) => void;
}

export function LogisticsPanel({
  isStorageWorker, isDeliveryDriver,
  approvedRequests, validPendingBatches, deliveryConfirmedBatches,
  furniturePickups, furnitureInTransit, requests,
  getItemById, getUnitById, getUserById, separateItemInBatch,
  onCreateBatch, onFinalizeBatch, onPickupFurniture, onReceiveFurniture,
}: LogisticsPanelProps) {
  return (
    <div className="space-y-6">
      {isStorageWorker && (
        <Alert className="border-primary/30 bg-primary/5">
          <ListOrdered className="h-4 w-4" />
          <AlertTitle className="text-sm font-semibold">Fluxo de lotes (materiais)</AlertTitle>
          <AlertDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
            <span className="block mt-1">
              <strong className="text-foreground">1.</strong> Monte o lote com pedidos aprovados →{' '}
              <strong className="text-foreground">2.</strong> Separe cada item no almox →{' '}
              <strong className="text-foreground">3.</strong> Quando o destino confirmar, finalize o lote aqui embaixo.
            </span>
          </AlertDescription>
        </Alert>
      )}

      {isStorageWorker && <Separator className="opacity-50" />}

      {isStorageWorker && (
        <ApprovedItemsCard
          approvedRequests={approvedRequests}
          getItemById={getItemById}
          getUnitById={getUnitById}
          onCreateBatch={onCreateBatch}
        />
      )}
      {isStorageWorker && (
        <PendingSeparationCard
          batches={validPendingBatches}
          requests={requests}
          getItemById={getItemById}
          getUserById={getUserById}
          getUnitById={getUnitById}
          separateItemInBatch={separateItemInBatch}
        />
      )}
      {isStorageWorker && (
        <DeliveryConfirmedCard
          batches={deliveryConfirmedBatches}
          requests={requests}
          getItemById={getItemById}
          getUserById={getUserById}
          getUnitById={getUnitById}
          onFinalizeBatch={onFinalizeBatch}
        />
      )}
      <FurniturePickupsCard
        isDeliveryDriver={isDeliveryDriver}
        isStorageWorker={isStorageWorker}
        furniturePickups={furniturePickups}
        furnitureInTransit={furnitureInTransit}
        getItemById={getItemById}
        getUnitById={getUnitById}
        getUserById={getUserById}
        onPickup={onPickupFurniture}
        onReceive={onReceiveFurniture}
      />
    </div>
  );
}
