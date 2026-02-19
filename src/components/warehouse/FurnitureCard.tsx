import type { FurnitureRemovalRequest, Item, Unit, User } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Armchair, Truck, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/format';

interface FurnitureCardProps {
  request: FurnitureRemovalRequest;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
  isStorageWorker: boolean;
  isDeliveryDriver: boolean;
  onPickup: (id: string) => void;
  onReceive: (id: string) => void;
}

export function FurnitureCard({
  request, getItemById, getUnitById, getUserById,
  isStorageWorker, isDeliveryDriver, onPickup, onReceive,
}: FurnitureCardProps) {
  const item = getItemById(request.itemId);
  const unit = getUnitById(request.unitId);
  const driver = getUserById(request.pickedUpByUserId || '');

  return (
    <div className="bg-card border rounded-lg p-3 sm:p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Armchair className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{item?.name}</h4>
            <p className="text-sm text-muted-foreground truncate">{unit?.name}</p>
          </div>
        </div>
        <Badge variant={request.status === 'approved_storage' ? 'default' : 'destructive'}>
          {request.status === 'approved_storage' || request.status === 'in_transit'
            ? 'Armazenagem' : 'Descarte'}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Qtd:</span>
          <span className="ml-1 font-semibold">{request.quantity}</span>
        </div>
        {request.status === 'in_transit' && driver && (
          <div>
            <span className="text-muted-foreground">Motorista:</span>
            <span className="ml-1 truncate block">{driver.name}</span>
          </div>
        )}
      </div>

      {request.pickedUpAt ? (
        <div className="text-xs text-muted-foreground">
          Coletado: {formatDate(request.pickedUpAt)}
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">
          Aprovado: {request.reviewedAt && formatDate(request.reviewedAt)}
        </div>
      )}

      <div className="flex gap-2">
        {isDeliveryDriver && request.status !== 'in_transit' && (
          <Button size="sm" onClick={() => onPickup(request.id)} className="flex-1">
            <Truck className="h-4 w-4 mr-1" />
            Coletado
          </Button>
        )}
        {isStorageWorker && request.status === 'in_transit' && (
          <Button size="sm" onClick={() => onReceive(request.id)} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Recebido
          </Button>
        )}
      </div>
    </div>
  );
}
