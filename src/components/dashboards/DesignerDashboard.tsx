import { useMemo } from 'react';
import { Armchair, CheckCircle, LayoutDashboard, Palette, User } from 'lucide-react';
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

export function DesignerDashboard() {
  const ds = useDesignerState();

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'requests', label: 'Projetos', icon: Palette },
    { id: 'inventory', label: 'Inventário', icon: Armchair },
    { id: 'my-requests', label: 'Minhas Solicitações', icon: User },
    { id: 'approvals', label: 'Aprovações', icon: CheckCircle },
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
          <OverviewPanel
            pendingCount={ds.pendingTransfers.length}
            approvedCount={ds.approvedTransfers.length}
            completedCount={ds.completedTransfers.length}
          />
        );
      case 'requests':
        return <FurnitureRequestsPanel />;
      case 'inventory':
        return (
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
        );
      case 'my-requests':
        return (
          <MyRequestsPanel
            myRemovalRequests={ds.myRemovalRequests}
            pendingTransfers={ds.pendingTransfers}
            approvedTransfers={ds.approvedTransfers}
            completedTransfers={ds.completedTransfers}
            onRequestRemoval={() => ds.setRequestRemovalDialogOpen(true)}
            getItemById={ds.getItemById}
            getUnitById={ds.getUnitById}
          />
        );
      case 'approvals':
        return (
          <ApprovalsPanel
            pendingRemovalRequests={ds.pendingRemovalRequests}
            approvedRemovalRequests={ds.approvedRemovalRequests}
            onEvaluate={ds.handleEvaluateRemoval}
            onReject={ds.handleRejectRemoval}
            getItemById={ds.getItemById}
            getUnitById={ds.getUnitById}
            getUserById={ds.getUserById}
          />
        );
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
