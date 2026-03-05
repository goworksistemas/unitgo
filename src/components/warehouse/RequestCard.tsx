import type { Request, Item, Unit, User, UnitStock } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, User as UserIcon, Truck, PackageCheck } from 'lucide-react';
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
  low: { className: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700', label: 'Baixa' },
  medium: { className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700', label: 'Média' },
  high: { className: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700', label: 'Alta' },
};

export function RequestCard({
  request, getItemById, getUnitById, getUserById, getStockForItem,
  warehouseUnitId, isStorageWorker, isDeliveryDriver,
  onApprove, onReject, onDelivered,
}: RequestCardProps) {
  const item = getItemById(request.itemId);
  const unit = getUnitById(request.requestingUnitId);
  const user = getUserById(request.requestedByUserId);
  const approver = request.approvedByUserId ? getUserById(request.approvedByUserId) : null;
  const picker = request.pickedUpByUserId ? getUserById(request.pickedUpByUserId) : null;
  const completer = request.completedByUserId ? getUserById(request.completedByUserId) : null;
  const warehouseStock = warehouseUnitId
    ? getStockForItem(request.itemId, warehouseUnitId)
    : undefined;
  const hasStock = warehouseStock && warehouseStock.quantity >= request.quantity;
  const stockQuantity = warehouseStock?.quantity || 0;
  const statusCfg = getStatusConfig(request.status);
  const urgencyCfg = URGENCY_CONFIG[request.urgency] || URGENCY_CONFIG.medium;

  return (
    <div className={`border rounded-lg p-3 sm:p-4 space-y-3 ${
      !hasStock && request.status === 'pending' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'bg-card'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold truncate">{item?.name || 'Item não encontrado'}</h4>
          <p className="text-sm text-muted-foreground truncate">{unit?.name}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={statusCfg.variant}>{statusCfg.label}</Badge>
          <Badge className={urgencyCfg.className}>{urgencyCfg.label}</Badge>
        </div>
      </div>

      {!hasStock && request.status === 'pending' && (
        <div className="flex items-start gap-2 p-2 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded text-xs text-red-800 dark:text-red-300">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Estoque Insuficiente</p>
            <p>Solicitado: {request.quantity} | Disponível: {stockQuantity}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Qtd:</span>
          <span className="ml-1 font-semibold">{request.quantity}</span>
          <span className={`ml-1 text-xs font-semibold ${hasStock ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            (Est: {stockQuantity})
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Solicitante:</span>
          <span className="ml-1 truncate block">{user?.name}</span>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">{formatDate(request.createdAt)}</div>

      {(approver || picker || completer) && (
        <div className="space-y-1 text-xs text-muted-foreground border-t pt-2">
          {approver && request.approvedAt && (
            <div className="flex items-center gap-1.5">
              <CheckCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span>Aprovado por <strong className="text-foreground">{approver.name}</strong> em {formatDate(request.approvedAt)}</span>
            </div>
          )}
          {picker && request.pickedUpAt && (
            <div className="flex items-center gap-1.5">
              <Truck className="h-3 w-3 text-primary" />
              <span>Retirado por <strong className="text-foreground">{picker.name}</strong> em {formatDate(request.pickedUpAt)}</span>
            </div>
          )}
          {completer && request.completedAt && (
            <div className="flex items-center gap-1.5">
              <PackageCheck className="h-3 w-3 text-green-600 dark:text-green-400" />
              <span>Entrega confirmada por <strong className="text-foreground">{completer.name}</strong> em {formatDate(request.completedAt)}</span>
            </div>
          )}
        </div>
      )}

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
