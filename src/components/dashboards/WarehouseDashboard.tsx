import { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { LayoutDashboard, ClipboardList, Truck, Scan, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { toast } from 'sonner';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { SelectItemForStockDialog } from '../dialogs/SelectItemForStockDialog';
import { CreateBatchDeliveryDialog } from '../dialogs/CreateBatchDeliveryDialog';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation, type NavigationSection } from '@/hooks/useNavigation';
import { useAllowedTabs } from '@/hooks/useAllowedTabs';
import { useWarehouseActions } from '../warehouse/useWarehouseActions';
import { CostCenterManagementPanel } from '../purchases/admin/CostCenterManagementPanel';
import { ContractManagementPanel } from '../purchases/admin/ContractManagementPanel';
import { OverviewPanel } from '../warehouse/OverviewPanel';
import { RequestsPanel } from '../warehouse/RequestsPanel';
import { LogisticsPanel } from '../warehouse/LogisticsPanel';
import { StockPanel } from '../warehouse/StockPanel';
import { ConfirmActionDialog } from '../warehouse/ConfirmActionDialog';
import { FinalizeBatchDialog } from '../warehouse/FinalizeBatchDialog';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';

interface WarehouseDashboardProps {
  isDeveloperMode?: boolean;
}

function getWarehousePageMeta(
  item: string | undefined,
  isDeliveryDriver: boolean,
  isStorageWorker: boolean,
): { title: string; subtitle?: string } {
  const roleHint = isDeliveryDriver
    ? 'Retirada e entrega'
    : isStorageWorker
      ? 'Pedidos, lotes e estoque'
      : 'Almoxarifado';
  switch (item) {
    case 'requests':
      return { title: 'Pedidos', subtitle: roleHint };
    case 'logistics':
      return { title: 'Lotes', subtitle: roleHint };
    case 'cost-centers':
      return { title: 'Centros de custo', subtitle: 'Compras' };
    case 'contracts':
      return { title: 'Contratos', subtitle: 'Compras' };
    case 'overview':
    default:
      return { title: 'Visão geral', subtitle: roleHint };
  }
}

export function WarehouseDashboard({ isDeveloperMode = false }: WarehouseDashboardProps) {
  const {
    currentUser, requests, items, getItemById, getUnitById, getUserById,
    unitStocks, getStockForItem, furnitureRemovalRequests,
    furnitureRequestsToDesigner, deliveryBatches, separateItemInBatch,
  } = useApp();

  const { setTitle } = useNavigation();
  const [showAddFurniture, setShowAddFurniture] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const actions = useWarehouseActions();
  const isDeliveryDriver = isDeveloperMode || currentUser?.warehouseType === 'delivery';
  const isStorageWorker = isDeveloperMode || currentUser?.warehouseType === 'storage';

  const { canAccessTab } = useAllowedTabs();
  const navigationSections: NavigationSection[] = useMemo(() => {
    const TAB_MAP: Record<string, string> = {
      'overview': 'almox.visao',
      'requests': 'almox.solicitacoes',
      'logistics': 'almox.logistica',
      'cost-centers': 'compras.centros_custo',
      'contracts': 'compras.contratos',
    };
    const moduleItems: NonNullable<NavigationSection['items']> = [
      { id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
      { id: 'requests', label: 'Pedidos', icon: ClipboardList },
      { id: 'logistics', label: 'Lotes', icon: Truck },
    ];
    if (canAccessTab('compras.centros_custo'))
      moduleItems.push({ id: 'cost-centers', label: 'Centros de Custo', icon: ClipboardList });
    if (canAccessTab('compras.contratos'))
      moduleItems.push({ id: 'contracts', label: 'Contratos', icon: ClipboardList });
    const filtered = moduleItems.filter((item) => {
      const tabId = TAB_MAP[item.id];
      return !tabId || canAccessTab(tabId);
    });
    return [
      {
        id: 'warehouse-home',
        label: 'Painel',
        icon: LayoutDashboard,
        sidebarGroup: 'inicio' as const,
      },
      {
        id: 'almox',
        label: 'Almoxarifado',
        icon: LayoutDashboard,
        sidebarGroup: 'modulos' as const,
        items: filtered,
      },
    ];
  }, [canAccessTab]);

  const { activeSection, activeItem, setActiveSection } = useDashboardNav(
    navigationSections,
    undefined,
    undefined,
    'warehouse-home',
  );

  useEffect(() => {
    if (activeSection === 'almox' && !activeItem) {
      setActiveSection('almox', 'overview');
    }
  }, [activeSection, activeItem, setActiveSection]);

  useEffect(() => {
    if (activeSection === 'warehouse-home') {
      const meta = getWarehousePageMeta('overview', isDeliveryDriver, isStorageWorker);
      setTitle(meta.title, meta.subtitle);
      return;
    }
    if (activeSection !== 'almox') return;
    const meta = getWarehousePageMeta(activeItem, isDeliveryDriver, isStorageWorker);
    setTitle(meta.title, meta.subtitle);
  }, [activeSection, activeItem, isDeliveryDriver, isStorageWorker, setTitle]);

  const warehouseMetrics = useMemo(() => {
    const warehouseRequests = requests.filter(r => r.status !== 'cancelled');
    const pendingRequests = warehouseRequests.filter(r => r.status === 'pending');
    const approvedRequests = warehouseRequests.filter(r => r.status === 'approved' || r.status === 'processing');
    const awaitingPickupRequests = warehouseRequests.filter(r => r.status === 'awaiting_pickup');
    const outForDeliveryRequests = warehouseRequests.filter(r => r.status === 'out_for_delivery');
    const completedRequests = warehouseRequests.filter(r => r.status === 'completed');
    const actionRequests = warehouseRequests.filter(r =>
      ['pending', 'approved', 'processing'].includes(r.status),
    );
    const routeRequests = warehouseRequests.filter(r =>
      ['awaiting_pickup', 'out_for_delivery'].includes(r.status),
    );
    const pendingBatches = deliveryBatches.filter(b => b.status === 'pending');
    const deliveryConfirmedBatches = deliveryBatches.filter(b => b.status === 'delivery_confirmed');
    const validPendingBatches = pendingBatches.filter(batch => {
      const batchReqs = requests.filter(r => batch.requestIds.includes(r.id));
      return !batchReqs.every(r => r.status === 'awaiting_pickup');
    });
    const furniturePickups = furnitureRemovalRequests.filter(
      r => r.status === 'approved_storage' || r.status === 'approved_disposal',
    );
    const furnitureInTransit = furnitureRemovalRequests.filter(r => r.status === 'in_transit');
    const warehouseStock = unitStocks.filter(s => s.unitId === actions.warehouseUnitId);
    const lowStockItems = warehouseStock.filter(s => {
      const item = items.find(i => i.id === s.itemId);
      return s.quantity < s.minimumQuantity && !item?.isFurniture;
    });
    return {
      warehouseRequests,
      pendingRequests,
      approvedRequests,
      awaitingPickupRequests,
      outForDeliveryRequests,
      completedRequests,
      actionRequests,
      routeRequests,
      pendingBatches,
      deliveryConfirmedBatches,
      validPendingBatches,
      furniturePickups,
      furnitureInTransit,
      lowStockItems,
    };
  }, [requests, deliveryBatches, furnitureRemovalRequests, unitStocks, items, actions.warehouseUnitId]);

  const furnitureEligibleForBatch = useMemo(() => {
    const idsInOpenBatch = new Set<string>();
    for (const b of deliveryBatches) {
      if (
        ['pending', 'in_transit', 'delivery_confirmed', 'pending_confirmation'].includes(
          b.status,
        )
      ) {
        b.furnitureRequestIds?.forEach((id) => idsInOpenBatch.add(id));
      }
    }
    return furnitureRequestsToDesigner.filter(
      (r) =>
        (r.status === 'in_transit' || r.status === 'awaiting_delivery') &&
        !idsInOpenBatch.has(r.id),
    );
  }, [furnitureRequestsToDesigner, deliveryBatches]);

  const {
    pendingRequests,
    approvedRequests,
    awaitingPickupRequests,
    outForDeliveryRequests,
    completedRequests,
    actionRequests,
    routeRequests,
    validPendingBatches,
    deliveryConfirmedBatches,
    furniturePickups,
    furnitureInTransit,
    lowStockItems,
  } = warehouseMetrics;

  const lookups = { getItemById, getUnitById, getUserById };

  const renderWarehouseOverview = () => (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-2xl">
        {isStorageWorker
          ? 'Resumo dos pedidos de material e estoque do almoxarifado. Use Pedidos para aprovar e Lotes para montar entregas.'
          : 'Acompanhe retiradas e entregas. Pedidos mostra o que está em rota.'}
      </p>
      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="h-auto rounded-lg bg-muted/50 p-1 mb-4 w-full max-w-md justify-start gap-1">
          <TabsTrigger value="resumo" className="gap-2 data-[state=active]:shadow-sm">
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Resumo
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2 data-[state=active]:shadow-sm">
            <ScrollText className="h-4 w-4 shrink-0" />
            Movimentações
          </TabsTrigger>
        </TabsList>
        <TabsContent value="resumo" className="mt-0 space-y-6">
          <OverviewPanel
            pendingCount={pendingRequests.length}
            approvedCount={approvedRequests.length}
            awaitingPickupCount={awaitingPickupRequests.length}
            outForDeliveryCount={outForDeliveryRequests.length}
            lowStockItems={lowStockItems}
            getItemById={getItemById}
          />
          <StockPanel onAddFurniture={() => setShowAddFurniture(true)} onAddStock={() => setShowAddStock(true)} />
        </TabsContent>
        <TabsContent value="historico" className="mt-0">
          <UnitMovementsHistory unitId={actions.warehouseUnitId} />
        </TabsContent>
      </Tabs>
    </div>
  );

  const renderContent = () => {
    if (activeSection === 'warehouse-home') return renderWarehouseOverview();
    if (activeSection !== 'almox') return null;
    switch (activeItem) {
      case 'cost-centers': return <CostCenterManagementPanel />;
      case 'contracts': return <ContractManagementPanel />;
      case 'overview':
        return renderWarehouseOverview();
      case 'requests':
        return (
          <RequestsPanel
            {...lookups}
            getStockForItem={getStockForItem}
            isDeveloperMode={isDeveloperMode}
            isDeliveryDriver={isDeliveryDriver}
            isStorageWorker={isStorageWorker}
            actionRequests={actionRequests}
            routeRequests={routeRequests}
            completedRequests={completedRequests}
            pendingRequests={pendingRequests}
            warehouseUnitId={actions.warehouseUnitId}
            onApprove={(id) => actions.handleRequestAction(id, 'approve')}
            onReject={(id) => actions.handleRequestAction(id, 'reject')}
            onDelivered={(id) => actions.handleRequestAction(id, 'delivered')}
          />
        );
      case 'logistics':
        return (
          <LogisticsPanel {...lookups}
            isStorageWorker={isStorageWorker} isDeliveryDriver={isDeliveryDriver}
            approvedRequests={approvedRequests} validPendingBatches={validPendingBatches}
            deliveryConfirmedBatches={deliveryConfirmedBatches}
            furniturePickups={furniturePickups} furnitureInTransit={furnitureInTransit}
            requests={requests} separateItemInBatch={separateItemInBatch}
            onCreateBatch={() => setShowCreateBatch(true)} onFinalizeBatch={actions.handleFinalizeBatch}
            onPickupFurniture={actions.handlePickupFurniture} onReceiveFurniture={actions.handleReceiveFurniture} />
        );
      default: return null;
    }
  };

  return (
    <>
      {renderContent()}
      <ConfirmActionDialog selectedRequest={actions.selectedRequest} actionType={actions.actionType}
        rejectionReason={actions.rejectionReason} setRejectionReason={actions.setRejectionReason}
        confirmAction={actions.confirmAction} resetActionState={actions.resetActionState} />
      <FinalizeBatchDialog selectedBatchToFinalize={actions.selectedBatchToFinalize}
        onOpenChange={() => actions.setSelectedBatchToFinalize(null)} onConfirm={actions.confirmFinalizeBatch} />
      {showAddFurniture && <AddFurnitureDialog open={showAddFurniture} onOpenChange={setShowAddFurniture} />}
      {showAddStock && <SelectItemForStockDialog open={showAddStock} onOpenChange={setShowAddStock} />}
      {showCreateBatch && (
        <CreateBatchDeliveryDialog open={showCreateBatch} onClose={() => setShowCreateBatch(false)}
          requests={approvedRequests.filter(r => r.status === 'approved')}
          furnitureRequests={furnitureEligibleForBatch} />
      )}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={(code) => {
                toast.success(`QR Code escaneado: ${code}`);
                setShowQRScanner(false);
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => setShowQRScanner(true)}
              aria-label="Ler QR Code de lote ou etiqueta"
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 z-40 p-0"
            >
              <Scan className="h-6 w-6 text-primary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[200px]">
            Ler QR Code (lote ou etiqueta)
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
