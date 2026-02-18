import type { Request, Item, Unit, User, UnitStock } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { getStatusConfig, formatDate } from '@/lib/format';

interface RequestCardProps {
  request: Request;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
  getStockForItem: (itemId: string, unitId: string) => UnitStock | undefined;
  warehouseUnitId: string | null;
  isStorageWorker: boolean;
  isDeliveryDriver: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelivered: (id: string) => void;
}

const URGENCY_CONFIG: Record<string, { className: string; label: string }> = {
  low: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Baixa' },
  medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Média' },
  high: { className: 'bg-red-100 text-red-800 border-red-300', label: 'Alta' },
};

export function RequestCard({
  request, getItemById, getUnitById, getUserById, getStockForItem,
  warehouseUnitId, isStorageWorker, isDeliveryDriver,
  onApprove, onReject, onDelivered,
}: RequestCardProps) {
  const item = getItemById(request.itemId);
  const unit = getUnitById(request.requestingUnitId);
  const user = getUserById(request.requestedByUserId);
  const warehouseStock = warehouseUnitId
    ? getStockForItem(request.itemId, warehouseUnitId)
    : undefined;
  const hasStock = warehouseStock && warehouseStock.quantity >= request.quantity;
  const stockQuantity = warehouseStock?.quantity || 0;
  const statusCfg = getStatusConfig(request.status);
  const urgencyCfg = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.medium;

  return (
    <div className={`border rounded-lg p-3 sm:p-4 space-y-3 ${
      !hasStock && request.status === 'pending' ? 'bg-red-50 border-red-200' : 'bg-white'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{item?.name || 'Item não encontrado'}</h4>
          <p className="text-sm text-gray-600 truncate">{unit?.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          <Badge className={urgencyCfg.className}>{urgencyCfg.label}</Badge>
        </div>
      </div>

      {!hasStock && request.status === 'pending' && (
        <div className="flex items-start gap-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Estoque Insuficiente</p>
            <p>Solicitado: {request.quantity} | Disponível: {stockQuantity}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-gray-500">Qtd:</span>
          <span className="ml-1 font-semibold">{request.quantity}</span>
          <span className={`ml-1 text-xs font-semibold ${hasStock ? 'text-green-600' : 'text-red-600'}`}>
            (Est: {stockQuantity})
          </span>
        </div>
        <div>
          <span className="text-gray-500">Solicitante:</span>
          <span className="ml-1 truncate block">{user?.name}</span>
        </div>
      </div>

      <div className="text-xs text-gray-500">{formatDate(request.createdAt)}</div>

      <div className="flex flex-wrap gap-2">
        {isStorageWorker && request.status === 'pending' && (
          <>
            <Button size="sm" variant={hasStock ? 'default' : 'secondary'}
              onClick={() => onApprove(request.id)} className="flex-1 sm:flex-none">
              <CheckCircle className="h-4 w-4 mr-1" />
              {hasStock ? 'Aprovar' : 'Aprovar (Sem Estoque)'}
            </Button>
            <Button size="sm" variant="destructive"
              onClick={() => onReject(request.id)} className="flex-1 sm:flex-none">
              <XCircle className="h-4 w-4 mr-1" />
              Rejeitar
            </Button>
          </>
        )}
        {isDeliveryDriver && request.status === 'out_for_delivery' && (
          <Button size="sm" variant="default"
            onClick={() => onDelivered(request.id)} className="flex-1">
            <CheckCircle className="h-4 w-4 mr-1" />
            Entregue
          </Button>
        )}
      </div>
    </div>
  );
}
