import { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { LayoutDashboard, ClipboardList, Truck, Scan, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { SelectItemForStockDialog } from '../dialogs/SelectItemForStockDialog';
import { CreateBatchDeliveryDialog } from '../dialogs/CreateBatchDeliveryDialog';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { useWarehouseActions } from '../warehouse/useWarehouseActions';
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

export function WarehouseDashboard({ isDeveloperMode = false }: WarehouseDashboardProps) {
  const {
    currentUser, requests, items, getItemById, getUnitById, getUserById,
    unitStocks, getStockForItem, furnitureRemovalRequests,
    furnitureRequestsToDesigner, deliveryBatches, separateItemInBatch,
  } = useApp();

  const [showAddFurniture, setShowAddFurniture] = useState(false);
  const [showAddStock, setShowAddStock] = useState(false);
  const [showCreateBatch, setShowCreateBatch] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const actions = useWarehouseActions();
  const isDeliveryDriver = isDeveloperMode || currentUser?.warehouseType === 'delivery';
  const isStorageWorker = isDeveloperMode || currentUser?.warehouseType === 'storage';

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'overview', label: 'Visão Geral e Estoque', icon: LayoutDashboard },
    { id: 'requests', label: 'Solicitações', icon: ClipboardList },
    { id: 'logistics', label: 'Logística', icon: Truck },
  ], []);

  const { activeSection } = useDashboardNav(
    navigationSections, 'Almoxarifado Central',
    isDeliveryDriver ? 'Entregas e coletas de materiais' : 'Gestão de solicitações e distribuição de materiais',
    'overview',
  );

  console.log('🔍 DEBUG WarehouseDashboard:', { total: requests.length, requests: requests.map(r => ({ id: r.id, itemId: r.itemId, status: r.status, requestingUnitId: r.requestingUnitId, quantity: r.quantity })) });

  const warehouseRequests = requests.filter(r => r.status !== 'cancelled');
  const pendingRequests = warehouseRequests.filter(r => r.status === 'pending');
  console.log('  ✅ Pending:', { count: pendingRequests.length, details: pendingRequests.map(r => ({ id: r.id, itemId: r.itemId, quantity: r.quantity, status: r.status })) });

  const approvedRequests = warehouseRequests.filter(r => r.status === 'approved' || r.status === 'processing');
  const awaitingPickupRequests = warehouseRequests.filter(r => r.status === 'awaiting_pickup');
  const outForDeliveryRequests = warehouseRequests.filter(r => r.status === 'out_for_delivery');
  const completedRequests = warehouseRequests.filter(r => r.status === 'completed');
  const activeRequests = [...pendingRequests, ...approvedRequests, ...outForDeliveryRequests];

  const pendingBatches = deliveryBatches.filter(b => b.status === 'pending');
  const deliveryConfirmedBatches = deliveryBatches.filter(b => b.status === 'delivery_confirmed');
  const validPendingBatches = pendingBatches.filter(batch => {
    const batchReqs = requests.filter(r => batch.requestIds.includes(r.id));
    return !batchReqs.every(r => r.status === 'awaiting_pickup');
  });

  const furniturePickups = furnitureRemovalRequests.filter(r => r.status === 'approved_storage' || r.status === 'approved_disposal');
  const furnitureInTransit = furnitureRemovalRequests.filter(r => r.status === 'in_transit');
  const warehouseStock = unitStocks.filter(s => s.unitId === actions.warehouseUnitId);
  const lowStockItems = warehouseStock.filter(s => {
    const item = items.find(i => i.id === s.itemId);
    return s.quantity < s.minimumQuantity && !item?.isFurniture;
  });

  const lookups = { getItemById, getUnitById, getUserById };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Tabs defaultValue="resumo" className="w-full">
            <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
              <TabsTrigger
                value="resumo"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Resumo e Estoque
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              >
                <ScrollText className="h-4 w-4 shrink-0" />
                Histórico
              </TabsTrigger>
            </TabsList>
            <TabsContent value="resumo" className="mt-4">
              <div className="space-y-6">
                <OverviewPanel pendingCount={pendingRequests.length} approvedCount={approvedRequests.length}
                  awaitingPickupCount={awaitingPickupRequests.length} outForDeliveryCount={outForDeliveryRequests.length}
                  lowStockItems={lowStockItems} getItemById={getItemById} />
                <StockPanel onAddFurniture={() => setShowAddFurniture(true)} onAddStock={() => setShowAddStock(true)} />
              </div>
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
              <UnitMovementsHistory unitId={actions.warehouseUnitId} />
            </TabsContent>
          </Tabs>
        );
      case 'requests':
        return (
          <RequestsPanel {...lookups} getStockForItem={getStockForItem}
            isDeveloperMode={isDeveloperMode} isDeliveryDriver={isDeliveryDriver} isStorageWorker={isStorageWorker}
            activeRequests={activeRequests} outForDeliveryRequests={outForDeliveryRequests}
            completedRequests={completedRequests} pendingRequests={pendingRequests}
            warehouseUnitId={actions.warehouseUnitId}
            onApprove={(id) => actions.handleRequestAction(id, 'approve')}
            onReject={(id) => actions.handleRequestAction(id, 'reject')}
            onDelivered={(id) => actions.handleRequestAction(id, 'delivered')} />
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
          furnitureRequests={furnitureRequestsToDesigner.filter(r => r.status === 'in_transit')} />
      )}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner onScanSuccess={(code) => { toast.success(`QR Code escaneado: ${code}`); setShowQRScanner(false); }}
              onClose={() => setShowQRScanner(false)} />
          </div>
        </div>
      )}
      <Button onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 z-40 flex items-center justify-center p-0">
        <Scan className="h-6 w-6 text-white" />
      </Button>
    </>
  );
}
