import { useMemo } from 'react';
import { LayoutDashboard, Palette, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { FurnitureRequestsPanel } from '../panels/FurnitureRequestsPanel';
import { FurnitureRemovalDialog } from '../dialogs/FurnitureRemovalDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
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

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'requests', label: 'Projetos', icon: Palette },
  ], []);

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
            <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0">
              <TabsTrigger
                value="resumo"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-foreground text-muted-foreground px-3 py-2 text-xs data-[state=active]:font-medium"
              >
                Resumo e Inventário
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-foreground text-muted-foreground px-3 py-2 text-xs data-[state=active]:font-medium flex items-center gap-1.5"
              >
                <ScrollText className="h-3.5 w-3.5" />
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
