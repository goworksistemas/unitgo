import type { Request, Item, Unit, User, UnitStock } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Route, ListChecks } from 'lucide-react';
import { RequestCard } from './RequestCard';
import { FurnitureWarehousePanel } from '../panels/FurnitureWarehousePanel';

interface RequestsPanelProps {
  isDeveloperMode?: boolean;
  isDeliveryDriver: boolean;
  isStorageWorker: boolean;
  /** Pedidos que precisam de ação no almox (aprovar, processar) */
  actionRequests: Request[];
  /** Aguardando retirada ou em rota de entrega */
  routeRequests: Request[];
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
  isDeveloperMode,
  isDeliveryDriver,
  isStorageWorker,
  actionRequests,
  routeRequests,
  completedRequests,
  pendingRequests,
  getItemById,
  getUnitById,
  getUserById,
  getStockForItem,
  warehouseUnitId,
  onApprove,
  onReject,
  onDelivered,
}: RequestsPanelProps) {
  const cardProps = {
    getItemById,
    getUnitById,
    getUserById,
    getStockForItem,
    warehouseUnitId,
    isStorageWorker,
    isDeliveryDriver,
    onApprove,
    onReject,
    onDelivered,
  };

  const defaultTab = isDeliveryDriver && routeRequests.length > 0 && actionRequests.length === 0
    ? 'route'
    : 'action';

  const renderList = (items: Request[], emptyMsg: string) =>
    items.length === 0 ? (
      <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
        {emptyMsg}
      </div>
    ) : (
      <div className="space-y-3">
        {items.map((r) => (
          <RequestCard key={r.id} request={r} {...cardProps} />
        ))}
      </div>
    );

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold tracking-tight">Pedidos de materiais</CardTitle>
          <CardDescription>
            {isDeliveryDriver
              ? 'Use a aba «Na rota» para marcar entregas. Aprovações e lotes ficam em outras áreas do sistema.'
              : 'Comece em «À fazer» (aprovar). Depois use «Na rota» para retirada e entrega. Lotes de carga ficam em Lotes.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-1 p-1 sm:max-w-xl">
              <TabsTrigger value="action" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <ListChecks className="hidden h-3.5 w-3.5 sm:inline" />
                <span>À fazer</span>
                {pendingRequests.length > 0 ? (
                  <span className="ml-0.5 rounded-full bg-destructive/15 px-1.5 text-[10px] font-semibold text-destructive tabular-nums">
                    {pendingRequests.length}
                  </span>
                ) : (
                  <span className="ml-0.5 text-muted-foreground tabular-nums">({actionRequests.length})</span>
                )}
              </TabsTrigger>
              <TabsTrigger value="route" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <Route className="hidden h-3.5 w-3.5 sm:inline" />
                <span className="truncate">Na rota</span>
                <span className="ml-0.5 text-muted-foreground tabular-nums">({routeRequests.length})</span>
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-1.5 px-2 py-2 text-xs sm:text-sm">
                <Package className="hidden h-3.5 w-3.5 sm:inline" />
                <span className="truncate">Feitos</span>
                <span className="ml-0.5 text-muted-foreground tabular-nums">({completedRequests.length})</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="action" className="mt-4">
              {renderList(
                actionRequests,
                isStorageWorker
                  ? 'Nada pendente de aprovação ou separação neste momento.'
                  : 'Sem pedidos aguardando ação do almox.',
              )}
            </TabsContent>
            <TabsContent value="route" className="mt-4">
              {renderList(
                routeRequests,
                'Nenhum item aguardando retirada ou em entrega.',
              )}
            </TabsContent>
            <TabsContent value="completed" className="mt-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Mostrando os 15 últimos concluídos.
              </p>
              {renderList(completedRequests.slice(0, 15), 'Nenhum pedido concluído ainda.')}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <FurnitureWarehousePanel isDeveloperMode={isDeveloperMode} />
    </div>
  );
}
