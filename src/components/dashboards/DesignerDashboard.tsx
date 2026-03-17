import { useMemo } from 'react';
import { LayoutDashboard, Palette, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { FurnitureRequestsPanel } from '../panels/FurnitureRequestsPanel';
import { FurnitureRemovalDialog } from '../dialogs/FurnitureRemovalDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { useAllowedTabs } from '@/hooks/useAllowedTabs';
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

  const { canAccessTab } = useAllowedTabs();
  const navigationSections: NavigationSection[] = useMemo(() => {
    const TAB_MAP: Record<string, string> = {
      'overview': 'designer.visao',
      'requests': 'designer.projetos',
    };
    const all: NavigationSection[] = [
      { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
      { id: 'requests', label: 'Projetos', icon: Palette },
    ];
    return all.filter((s) => {
      const tabId = TAB_MAP[s.id];
      return !tabId || canAccessTab(tabId);
    });
  }, [canAccessTab]);

  const { activeSection } = useDashboardNav(
    navigationSections,
    'Gestão de Móveis',
    'Visualize e gerencie móveis de todas as unidades Gowork',
    'overview'
  );

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
                Resumo e Inventário
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
              <div className="space-y-8">
                <OverviewPanel
                  pendingCount={ds.pendingTransfers.length}
                  approvedCount={ds.approvedTransfers.length}
                  completedCount={ds.completedTransfers.length}
                />
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
                <MyRequestsPanel
                  myRemovalRequests={ds.myRemovalRequests}
                  pendingTransfers={ds.pendingTransfers}
                  approvedTransfers={ds.approvedTransfers}
                  completedTransfers={ds.completedTransfers}
                  onRequestRemoval={() => ds.setRequestRemovalDialogOpen(true)}
                  getItemById={ds.getItemById}
                  getUnitById={ds.getUnitById}
                />
                <ApprovalsPanel
                  pendingRemovalRequests={ds.pendingRemovalRequests}
                  approvedRemovalRequests={ds.approvedRemovalRequests}
                  onEvaluate={ds.handleEvaluateRemoval}
                  onReject={ds.handleRejectRemoval}
                  getItemById={ds.getItemById}
                  getUnitById={ds.getUnitById}
                  getUserById={ds.getUserById}
                />
              </div>
            </TabsContent>
            <TabsContent value="historico" className="mt-4">
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
      />

      <FurnitureRemovalDialog
        open={ds.requestRemovalDialogOpen}
        onOpenChange={ds.setRequestRemovalDialogOpen}
      />
    </>
  );
}
