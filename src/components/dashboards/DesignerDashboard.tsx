import { useMemo } from 'react';
import {
  LayoutDashboard,
  Armchair,
  ArrowRightLeft,
  ShieldCheck,
  ScrollText,
  Inbox,
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { FurnitureRequestsPanel } from '../panels/FurnitureRequestsPanel';
import { FurnitureRemovalDialog } from '../dialogs/FurnitureRemovalDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { useAllowedTabs } from '@/hooks/useAllowedTabs';
import { useApp } from '@/contexts/AppContext';
import { useDesignerState } from '../designer/useDesignerState';
import { OverviewPanel } from '../designer/OverviewPanel';
import { InventoryPanel } from '../designer/InventoryPanel';
import { MyRequestsPanel } from '../designer/MyRequestsPanel';
import { ApprovalsPanel } from '../designer/ApprovalsPanel';
import { TransferDialog } from '../designer/TransferDialog';
import { RemovalApprovalDialog } from '../designer/RemovalApprovalDialog';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';

export function DesignerDashboard() {
  const ds = useDesignerState();
  const { furnitureRequestsToDesigner } = useApp();

  const pendingUnitFurnitureRequests = useMemo(
    () => furnitureRequestsToDesigner.filter((r) => r.status === 'pending_designer').length,
    [furnitureRequestsToDesigner]
  );

  const { canAccessTab } = useAllowedTabs();
  const navigationSections: NavigationSection[] = useMemo(() => {
    const TAB_MAP: Record<string, string> = {
      overview: 'designer.visao',
      requests: 'designer.projetos',
    };
    const all: NavigationSection[] = [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
      { id: 'requests', label: 'Pedidos das unidades', icon: Inbox },
    ];
    return all.filter((s) => {
      const tabId = TAB_MAP[s.id];
      return !tabId || canAccessTab(tabId);
    });
  }, [canAccessTab]);

  const { activeSection } = useDashboardNav(
    navigationSections,
    'Móveis e designer',
    'Inventário, pedidos das unidades, transferências e retiradas',
    'overview'
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <Tabs defaultValue="resumo" className="w-full">
            <div className="overflow-x-auto -mx-1 px-1 pb-1 scrollbar-hide">
              <TabsList className="inline-flex h-auto w-full min-w-min flex-wrap justify-start gap-1 rounded-lg bg-muted/60 p-1 sm:flex-nowrap">
                <TabsTrigger
                  value="resumo"
                  className="gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                >
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger
                  value="inventario"
                  className="gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                >
                  <Armchair className="h-4 w-4 shrink-0" />
                  Inventário
                </TabsTrigger>
                <TabsTrigger
                  value="movimentacoes"
                  className="gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                >
                  <ArrowRightLeft className="h-4 w-4 shrink-0" />
                  Movimentações
                </TabsTrigger>
                <TabsTrigger
                  value="aprovacoes"
                  className="gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Aprovar retiradas
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="gap-1.5 rounded-md px-3 py-2 text-xs sm:text-sm data-[state=active]:shadow-sm"
                >
                  <ScrollText className="h-4 w-4 shrink-0" />
                  Histórico
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="resumo" className="mt-4 focus-visible:outline-none">
              <OverviewPanel
                myPendingTransfers={ds.pendingTransfers.length}
                pendingRemovalApprovals={ds.pendingRemovalRequests.length}
                pendingUnitFurnitureRequests={pendingUnitFurnitureRequests}
              />
            </TabsContent>

            <TabsContent value="inventario" className="mt-4 focus-visible:outline-none">
              <InventoryPanel
                furnitureStock={ds.furnitureStock}
                viewingUnit={ds.viewingUnit}
                viewableUnits={ds.viewableUnits}
                availableUnitsCount={ds.availableUnits.length}
                onViewingUnitChange={ds.setViewingUnit}
                onAddFurniture={() => ds.setAddFurnitureDialogOpen(true)}
                onRequestTransfer={ds.handleRequestTransfer}
                getItemById={ds.getItemById}
              />
            </TabsContent>

            <TabsContent value="movimentacoes" className="mt-4 focus-visible:outline-none">
              <MyRequestsPanel
                myRemovalRequests={ds.myRemovalRequests}
                pendingTransfers={ds.pendingTransfers}
                approvedTransfers={ds.approvedTransfers}
                completedTransfers={ds.completedTransfers}
                onRequestRemoval={() => ds.setRequestRemovalDialogOpen(true)}
                getItemById={ds.getItemById}
                getUnitById={ds.getUnitById}
              />
            </TabsContent>

            <TabsContent value="aprovacoes" className="mt-4 focus-visible:outline-none">
              <ApprovalsPanel
                pendingRemovalRequests={ds.pendingRemovalRequests}
                approvedRemovalRequests={ds.approvedRemovalRequests}
                onEvaluate={ds.handleEvaluateRemoval}
                onReject={ds.handleRejectRemoval}
                getItemById={ds.getItemById}
                getUnitById={ds.getUnitById}
                getUserById={ds.getUserById}
              />
            </TabsContent>

            <TabsContent value="historico" className="mt-4 focus-visible:outline-none">
              <UnitMovementsHistory unitId={ds.viewingUnit || undefined} filterByFurniture={true} />
            </TabsContent>
          </Tabs>
        );
      case 'requests':
        return <FurnitureRequestsPanel />;
      default:
        return null;
    }
  };

  return (
    <>
      {renderContent()}

      <TransferDialog
        open={ds.transferDialogOpen}
        onOpenChange={ds.setTransferDialogOpen}
        selectedItem={ds.selectedItem}
        viewingUnit={ds.viewingUnit}
        availableUnits={ds.availableUnits}
        selectedUnit={ds.selectedUnit}
        onSelectedUnitChange={ds.setSelectedUnit}
        transferObservations={ds.transferObservations}
        onObservationsChange={ds.setTransferObservations}
        onConfirm={ds.confirmTransfer}
        getItemById={ds.getItemById}
        getUnitById={ds.getUnitById}
      />

      <AddFurnitureDialog
        open={ds.addFurnitureDialogOpen}
        onOpenChange={ds.setAddFurnitureDialogOpen}
      />

      <RemovalApprovalDialog
        open={ds.removalDialogOpen}
        onOpenChange={ds.setRemovalDialogOpen}
        selectedRequestId={ds.selectedRemovalRequest}
        furnitureRemovalRequests={ds.furnitureRemovalRequests}
        disposalJustification={ds.disposalJustification}
        onJustificationChange={ds.setDisposalJustification}
        onApprove={ds.handleApproveRemoval}
        getItemById={ds.getItemById}
        getUnitById={ds.getUnitById}
      />

      <FurnitureRemovalDialog
        open={ds.requestRemovalDialogOpen}
        onOpenChange={ds.setRequestRemovalDialogOpen}
      />
    </>
  );
}
