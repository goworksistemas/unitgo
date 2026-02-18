import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus } from 'lucide-react';
import type { Item, Request } from '@/types';

interface StockPanelProps {
  availableItems: Item[];
  requests: Request[];
  getWarehouseUnitId: () => string | undefined;
  getStockForItem: (itemId: string, unitId: string) => { quantity: number } | undefined;
  onRequestItem: (itemId: string) => void;
}

export function StockPanel({ availableItems, requests, getWarehouseUnitId, getStockForItem, onRequestItem }: StockPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5 text-primary" />
          Itens Disponíveis para Solicitação
        </CardTitle>
        <CardDescription>Visualize os itens disponíveis no almoxarifado central</CardDescription>
      </CardHeader>
      <CardContent>
        {availableItems.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum item disponível no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableItems.map(item => {
              const warehouseId = getWarehouseUnitId();
              const centralStock = warehouseId ? getStockForItem(item.id, warehouseId) : undefined;
              const stockQuantity = centralStock?.quantity || 0;
              const pendingRequests = requests.filter(
                r => r.itemId === item.id && ['pending', 'approved', 'processing', 'awaiting_pickup'].includes(r.status)
              );
              const totalPending = pendingRequests.reduce((sum, r) => sum + r.quantity, 0);
              const availableQuantity = stockQuantity - totalPending;
              const isLowStock = availableQuantity < (item.minQuantity ?? item.defaultMinimumQuantity ?? 0);
              const isOutOfStock = availableQuantity <= 0;

              return (
                <Card key={item.id} className={`hover:shadow-lg transition-shadow ${isOutOfStock ? 'opacity-60' : ''}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base flex-1">{item.name}</CardTitle>
                      {isOutOfStock && <Badge variant="destructive" className="text-xs">Esgotado</Badge>}
                      {!isOutOfStock && isLowStock && <Badge variant="secondary" className="text-xs bg-yellow-500 text-white">Baixo</Badge>}
                    </div>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2">{item.description}</p>}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Disponível</p>
                        <p className={`text-2xl ${isOutOfStock ? 'text-red-600' : isLowStock ? 'text-yellow-600' : 'text-green-600'}`}>
                          {availableQuantity}
                        </p>
                      </div>
                      <Package className={`h-8 w-8 ${isOutOfStock ? 'text-red-400' : isLowStock ? 'text-yellow-400' : 'text-green-400'}`} />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Em Estoque:</span>
                        <span className="font-medium">{stockQuantity}</span>
                      </div>
                      {totalPending > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Pendente:</span>
                          <span className="font-medium text-orange-600">{totalPending}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Mínimo:</span>
                        <span className="font-medium">{item.minQuantity ?? item.defaultMinimumQuantity ?? 0}</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => onRequestItem(item.id)} disabled={isOutOfStock}>
                      <Plus className="h-4 w-4 mr-2" />
                      {isOutOfStock ? 'Indisponível' : 'Solicitar'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
