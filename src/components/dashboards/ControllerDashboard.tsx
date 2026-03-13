import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { usePurchases } from '../../contexts/PurchaseContext';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Package, Armchair, Scan, ShoppingCart, ClipboardList, History, PackageOpen, Calendar, Truck, Boxes } from 'lucide-react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { ControllerKPIs } from '../controller/ControllerKPIs';
import { FurniturePanel } from '../controller/FurniturePanel';
import { LoansPanel } from '../controller/LoansPanel';
import { DeliveriesPanel } from '../controller/DeliveriesPanel';
import { AlmoxarifadoPanel } from '../controller/AlmoxarifadoPanel';
import { ItemSearchPanel } from '../panels/ItemSearchPanel';
import { PendingDeliveriesAlert } from '../controller/PendingDeliveriesAlert';
import { LoanAlerts } from '../controller/LoanAlerts';
import { ControllerDialogs, type StockDialogState } from '../controller/ControllerDialogs';
import { ManagerPurchaseRequestsPanel } from '../purchases/manager/ManagerPurchaseRequestsPanel';
import { ManagerApprovalHistoryPanel } from '../purchases/manager/ManagerApprovalHistoryPanel';

export function ControllerDashboard() {
  const {
    currentUnit, unitStocks, loans, items, getItemById, getUserById,
    requests, furnitureRemovalRequests, furnitureRequestsToDesigner,
    deliveryBatches, getConfirmationsForBatch, currentUser,
  } = useApp();
  const { purchaseRequests } = usePurchases();

  const [addFurnitureDialogOpen, setAddFurnitureDialogOpen] = useState(false);
  const [requestFurnitureDialogOpen, setRequestFurnitureDialogOpen] = useState(false);
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [selectedFloor, setSelectedFloor] = useState<string>('all');
  const [selectedBatchForReceipt, setSelectedBatchForReceipt] = useState<string | null>(null);
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string | null>(null);
  const [consumeDialog, setConsumeDialog] = useState<StockDialogState>({ open: false, stockId: '', itemName: '', quantity: 0 });
  const [loanDialog, setLoanDialog] = useState<StockDialogState>({ open: false, stockId: '', itemName: '', quantity: 0 });
  const [addStockDialog, setAddStockDialog] = useState<StockDialogState>({ open: false, stockId: '', itemName: '', quantity: 0 });
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBatchId, setScannedBatchId] = useState<string | null>(null);

  const unitKPIs = useMemo(() => {
    if (!currentUnit) return null;
    const stocksInUnit = unitStocks.filter(s => {
      const item = getItemById(s.itemId);
      return s.unitId === currentUnit.id && item && !item.isFurniture;
    });
    const belowMinimum = stocksInUnit.filter(s => s.quantity < s.minimumQuantity);
    const furnitureStocks = unitStocks.filter(s => {
      const item = getItemById(s.itemId);
      return s.unitId === currentUnit.id && item && item.isFurniture && s.quantity > 0;
    });
    const activeLoans = loans.filter(
      l => l.unitId === currentUnit.id && (l.status === 'active' || l.status === 'overdue')
    );
    const now = new Date();
    const overdueLoans = activeLoans.filter(l => {
      const expectedReturn = new Date(l.expectedReturnDate);
      return expectedReturn < now || l.status === 'overdue';
    });
    const soonLoans = activeLoans.filter(l => {
      const expectedReturn = new Date(l.expectedReturnDate);
      const diffDays = Math.ceil((expectedReturn.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays <= 1;
    });
    return {
      totalItems: stocksInUnit.length, totalFurniture: furnitureStocks.length,
      belowMinimum: belowMinimum.length, activeLoans: activeLoans.length,
      overdueLoans: overdueLoans.length, soonLoans: soonLoans.length,
      belowMinimumItems: belowMinimum, overdueLoansData: overdueLoans,
    };
  }, [currentUnit, unitStocks, loans, getItemById]);

  const navigationSections: NavigationSection[] = useMemo(() => {
    if (!currentUnit) return [];
    const pendingDeliveries = deliveryBatches.filter(
      b => b.targetUnitId === currentUnit.id && b.status === 'pending_confirmation'
    ).length;
    const pendingRemovals = furnitureRemovalRequests.filter(
      r => r.originUnitId === currentUnit.id && r.status === 'pending'
    ).length;
    const pendingAlmoxarifado = requests.filter(
      r => r.requestingUnitId === currentUnit.id && r.status === 'pending'
    ).length;
    const overdueLoans = loans.filter(
      l => l.unitId === currentUnit.id && (l.status === 'overdue' || (l.status === 'active' && new Date(l.expectedReturnDate) < new Date()))
    ).length;
    const pendingManagerApprovals = purchaseRequests?.filter(
      (r: { status: string; unidadeId?: string; solicitanteId?: string }) =>
        r.status === 'pending_manager' &&
        r.unidadeId === currentUnit.id &&
        r.solicitanteId !== currentUser?.id
    ).length ?? 0;
    const belowMinimumCount = unitStocks.filter(s => {
      const item = getItemById(s.itemId);
      return s.unitId === currentUnit.id && item && !item.isFurniture && s.quantity < s.minimumQuantity;
    }).length;
    const totalEstoquePendentes = pendingRemovals + overdueLoans + belowMinimumCount;
    return [
      {
        id: 'estoque',
        label: 'Estoque',
        icon: Package,
        badge: totalEstoquePendentes > 0 ? totalEstoquePendentes : undefined,
        items: [
          { id: 'materiais', label: 'Materiais', icon: Boxes, badge: belowMinimumCount > 0 ? belowMinimumCount : undefined },
          { id: 'moveis', label: 'Móveis', icon: Armchair, badge: pendingRemovals > 0 ? pendingRemovals : undefined },
          { id: 'loans', label: 'Empréstimos', icon: Calendar, badge: overdueLoans > 0 ? overdueLoans : undefined },
        ],
      },
      { id: 'almoxarifado', label: 'Almoxarifado', icon: PackageOpen, badge: pendingAlmoxarifado > 0 ? pendingAlmoxarifado : undefined },
      { id: 'deliveries', label: 'Entregas', icon: Truck, badge: pendingDeliveries > 0 ? pendingDeliveries : undefined },
      {
        id: 'purchases',
        label: 'Compras',
        icon: ShoppingCart,
        items: [
          { id: 'manager-requests', label: 'Solicitações da Área', icon: ClipboardList, badge: pendingManagerApprovals > 0 ? pendingManagerApprovals : undefined },
          { id: 'approval-history', label: 'Histórico Aprovações', icon: History },
        ],
      },
    ];
  }, [currentUnit, deliveryBatches, requests, furnitureRemovalRequests, loans, purchaseRequests, currentUser, unitStocks, getItemById]);

  const { activeSection, activeItem, setActiveSection } = useDashboardNav(
    navigationSections, 'Painel do Controlador',
    currentUnit ? `Gestão de ${currentUnit.name}` : 'Selecione uma unidade no sidebar',
    'estoque'
  );

  useEffect(() => {
    if (activeSection === 'estoque' && !activeItem) {
      setActiveSection('estoque', 'materiais');
    }
  }, [activeSection, activeItem, setActiveSection]);

  if (!currentUnit) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Selecione uma unidade para visualizar</p>
      </div>
    );
  }

  if (!unitKPIs) return null;

  const renderContent = () => {
    switch (activeSection) {
      case 'purchases':
        if (activeItem === 'approval-history') return <ManagerApprovalHistoryPanel />;
        return <ManagerPurchaseRequestsPanel />;
      case 'almoxarifado':
        return <AlmoxarifadoPanel />;
      case 'deliveries':
        return (
          <DeliveriesPanel
            currentUnit={currentUnit} deliveryBatches={deliveryBatches}
            requests={requests} furnitureRequestsToDesigner={furnitureRequestsToDesigner}
            getItemById={getItemById} getUserById={getUserById}
            getConfirmationsForBatch={getConfirmationsForBatch}
            onSelectBatchForReceipt={setSelectedBatchForReceipt}
            onShowQRScanner={() => setShowQRScanner(true)}
          />
        );
      case 'estoque':
        switch (activeItem) {
          case 'materiais': return (
            <ItemSearchPanel
              title="Estoque de Materiais"
              description="Gerencie o estoque da unidade — consumir, adicionar ao estoque ou emprestar itens"
            />
          );
          case 'loans': return <LoansPanel />;
          case 'moveis':
          default:
            return (
              <FurniturePanel
                currentUnit={currentUnit} items={items} unitStocks={unitStocks}
                getItemById={getItemById} furnitureRemovalRequests={furnitureRemovalRequests}
                furnitureRequestsToDesigner={furnitureRequestsToDesigner}
                selectedFloor={selectedFloor} onFloorChange={setSelectedFloor}
                onAddFurniture={() => setAddFurnitureDialogOpen(true)}
                onRequestFurniture={() => setRequestFurnitureDialogOpen(true)}
                onRemoval={() => setRemovalDialogOpen(true)}
              />
            );
        }
      default:
        return (
          <FurniturePanel
            currentUnit={currentUnit} items={items} unitStocks={unitStocks}
            getItemById={getItemById} furnitureRemovalRequests={furnitureRemovalRequests}
            furnitureRequestsToDesigner={furnitureRequestsToDesigner}
            selectedFloor={selectedFloor} onFloorChange={setSelectedFloor}
            onAddFurniture={() => setAddFurnitureDialogOpen(true)}
            onRequestFurniture={() => setRequestFurnitureDialogOpen(true)}
            onRemoval={() => setRemovalDialogOpen(true)}
          />
        );
    }
  };

  const isPurchasesWithSubTabs = activeSection === 'purchases';
  const isAlmoxarifado = activeSection === 'almoxarifado';

  return (
    <>
      <div className="space-y-0">
        {/* Top band - oculto no Almoxarifado para evitar dois dashboards; Materiais usa KPIs simplificados */}
        {!isAlmoxarifado && (
        <div className="bg-background border-b border-border -mx-4 -mt-4 md:-mx-6 md:-mt-6 mb-0">
          <ControllerKPIs
            totalMaterials={unitKPIs.totalItems}
            totalFurniture={unitKPIs.totalFurniture}
            activeLoans={unitKPIs.activeLoans}
            overdueLoans={unitKPIs.overdueLoans}
            belowMinimum={unitKPIs.belowMinimum}
          />
          <PendingDeliveriesAlert
            currentUnit={currentUnit} deliveryBatches={deliveryBatches}
            onConfirmReceipt={setScannedBatchId} onViewDetails={setSelectedBatchForTimeline}
          />
          <LoanAlerts
            overdueLoans={unitKPIs.overdueLoans} soonLoans={unitKPIs.soonLoans}
            overdueLoansData={unitKPIs.overdueLoansData} getItemById={getItemById}
          />
        </div>
        )}

        <div className="bg-muted/30 p-4 md:p-5 -mx-4 -mb-4 md:-mx-6 md:-mb-6 mt-0">
          {isPurchasesWithSubTabs ? (
            <Tabs value={activeItem || 'manager-requests'} onValueChange={(v) => setActiveSection('purchases', v as 'manager-requests' | 'approval-history')}>
              <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
                <TabsTrigger
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
                  value="manager-requests"
                >
                  <ClipboardList className="h-4 w-4 shrink-0" />
                  Solicitações da Área
                </TabsTrigger>
                <TabsTrigger
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
                  value="approval-history"
                >
                  <History className="h-4 w-4 shrink-0" />
                  Histórico Aprovações
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manager-requests" className="mt-0">
                <ManagerPurchaseRequestsPanel />
              </TabsContent>
              <TabsContent value="approval-history" className="mt-0">
                <ManagerApprovalHistoryPanel />
              </TabsContent>
            </Tabs>
          ) : (
            renderContent()
          )}
        </div>
      </div>

      <ControllerDialogs
        removalDialogOpen={removalDialogOpen} onRemovalDialogChange={setRemovalDialogOpen}
        consumeDialog={consumeDialog} onConsumeDialogChange={setConsumeDialog}
        loanDialog={loanDialog} onLoanDialogChange={setLoanDialog}
        addStockDialog={addStockDialog} onAddStockDialogChange={setAddStockDialog}
        requestFurnitureDialogOpen={requestFurnitureDialogOpen} onRequestFurnitureDialogChange={setRequestFurnitureDialogOpen}
        addFurnitureDialogOpen={addFurnitureDialogOpen} onAddFurnitureDialogChange={setAddFurnitureDialogOpen}
        selectedBatchForReceipt={selectedBatchForReceipt} onSelectedBatchForReceiptChange={setSelectedBatchForReceipt}
        selectedBatchForTimeline={selectedBatchForTimeline} onSelectedBatchForTimelineChange={setSelectedBatchForTimeline}
        showQRScanner={showQRScanner} onShowQRScannerChange={setShowQRScanner}
        scannedBatchId={scannedBatchId} onScannedBatchIdChange={setScannedBatchId}
        deliveryBatches={deliveryBatches} getConfirmationsForBatch={getConfirmationsForBatch}
      />

      <Button
        onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full border border-border bg-primary hover:bg-primary/90 z-40 flex items-center justify-center p-0"
      >
        <Scan className="h-6 w-6 text-white" />
      </Button>
    </>
  );
}
