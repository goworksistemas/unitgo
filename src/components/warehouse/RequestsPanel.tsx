import type { Request, Item, Unit, User, UnitStock } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Truck } from 'lucide-react';
import { RequestCard } from './RequestCard';
import { FurnitureWarehousePanel } from '../panels/FurnitureWarehousePanel';

interface RequestsPanelProps {
  isDeveloperMode?: boolean;
  isDeliveryDriver: boolean;
  isStorageWorker: boolean;
  activeRequests: Request[];
  outForDeliveryRequests: Request[];
  completedRequests: Request[];
  pendingRequests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
  getStockForItem: (itemId: string, unitId: string) => UnitStock | undefined;
  warehouseUnitId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onDelivered: (id: string) => void;
}

export function RequestsPanel({
  isDeveloperMode, isDeliveryDriver, isStorageWorker,
  activeRequests, outForDeliveryRequests, completedRequests, pendingRequests,
  getItemById, getUnitById, getUserById, getStockForItem, warehouseUnitId,
  onApprove, onReject, onDelivered,
}: RequestsPanelProps) {
  const cardProps = {
    getItemById, getUnitById, getUserById, getStockForItem,
    warehouseUnitId, isStorageWorker, isDeliveryDriver,
    onApprove, onReject, onDelivered,
  };

  const renderList = (items: Request[], emptyMsg: string) =>
    items.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">{emptyMsg}</div>
    ) : (
      <div className="space-y-3">
        {items.map(r => <RequestCard key={r.id} request={r} {...cardProps} />)}
      </div>
    );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Solicitações de Materiais</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {isDeliveryDriver ? 'Pedidos para retirada e entrega' : 'Aprovar e separar pedidos das unidades'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={isDeliveryDriver ? 'delivery' : 'active'} className="w-full">
            <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3">
              <TabsTrigger value="active" className="relative">
                <span className="hidden sm:inline">Ativas</span>
                <span className="sm:hidden">Ativas</span>
                <span className="ml-1">({activeRequests.length})</span>
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="delivery" className="sm:hidden relative">
                <Truck className="h-4 w-4 mr-1" />
                ({outForDeliveryRequests.length})
                {outForDeliveryRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="relative">
                <span className="hidden sm:inline">Concluídas</span>
                <span className="sm:hidden">OK</span>
                <span className="ml-1">({completedRequests.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {renderList(activeRequests, 'Nenhuma solicitação ativa')}
            </TabsContent>
            <TabsContent value="delivery" className="space-y-3 mt-4 sm:hidden">
              {renderList(outForDeliveryRequests, 'Nenhuma entrega em rota')}
            </TabsContent>
            <TabsContent value="completed" className="space-y-3 mt-4">
              {renderList(completedRequests.slice(0, 10), 'Nenhuma solicitação concluída')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FurnitureWarehousePanel isDeveloperMode={isDeveloperMode} />
    </div>
  );
}
