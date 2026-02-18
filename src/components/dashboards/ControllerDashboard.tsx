import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Package, Calendar, Armchair, ShoppingCart, Scan } from 'lucide-react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { ControllerKPIs } from '../controller/ControllerKPIs';
import { FurniturePanel } from '../controller/FurniturePanel';
import { LoansPanel } from '../controller/LoansPanel';
import { DeliveriesPanel } from '../controller/DeliveriesPanel';
import { AlmoxarifadoPanel } from '../controller/AlmoxarifadoPanel';
import { PendingDeliveriesAlert } from '../controller/PendingDeliveriesAlert';
import { LoanAlerts } from '../controller/LoanAlerts';
import { ControllerDialogs, type StockDialogState } from '../controller/ControllerDialogs';

export function ControllerDashboard() {
  const {
    currentUnit, unitStocks, loans, items, getItemById, getUserById,
    requests, furnitureRemovalRequests, furnitureRequestsToDesigner,
    deliveryBatches, getConfirmationsForBatch,
  } = useApp();

  React.useEffect(() => {
    if (currentUnit) {
      console.log('🏢 ControllerDashboard - currentUnit:', currentUnit);
      console.log('📊 ControllerDashboard - floors:', currentUnit.floors);
      console.log('📊 ControllerDashboard - floors type:', typeof currentUnit.floors, Array.isArray(currentUnit.floors));
    }
  }, [currentUnit]);

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
    return [
      { id: 'furniture', label: 'Móveis', icon: Armchair },
      { id: 'loans', label: 'Empréstimos', icon: Calendar },
      { id: 'deliveries', label: 'Recebimentos', icon: Package, badge: pendingDeliveries > 0 ? pendingDeliveries : undefined },
      { id: 'almoxarifado', label: 'Almoxarifado', icon: ShoppingCart },
    ];
  }, [currentUnit, deliveryBatches]);

  const { activeSection } = useDashboardNav(
    navigationSections, 'Painel do Controlador',
    currentUnit ? `Gestão de ${currentUnit.name}` : 'Selecione uma unidade no sidebar'
  );

  if (!currentUnit) {
    return (
      <div className="text-center py-12 text-slate-500">
        <p className="text-sm">Selecione uma unidade para visualizar</p>
      </div>
    );
  }

  if (!unitKPIs) return null;

  const renderSection = () => {
    switch (activeSection) {
      case 'loans': return <LoansPanel />;
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
      case 'almoxarifado': return <AlmoxarifadoPanel />;
      case 'furniture':
      default:
        return (
          <FurniturePanel
            currentUnit={currentUnit} items={items} unitStocks={unitStocks}
            getItemById={getItemById} furnitureRemovalRequests={furnitureRemovalRequests}
            selectedFloor={selectedFloor} onFloorChange={setSelectedFloor}
            onAddFurniture={() => setAddFurnitureDialogOpen(true)}
            onRequestFurniture={() => setRequestFurnitureDialogOpen(true)}
            onRemoval={() => setRemovalDialogOpen(true)}
          />
        );
    }
  };

  return (
    <>
      <ControllerKPIs
        totalFurniture={unitKPIs.totalFurniture}
        activeLoans={unitKPIs.activeLoans}
        overdueLoans={unitKPIs.overdueLoans}
      />

      <PendingDeliveriesAlert
        currentUnit={currentUnit} deliveryBatches={deliveryBatches}
        onConfirmReceipt={setScannedBatchId} onViewDetails={setSelectedBatchForTimeline}
      />

      <div className="space-y-4">{renderSection()}</div>

      <LoanAlerts
        overdueLoans={unitKPIs.overdueLoans} soonLoans={unitKPIs.soonLoans}
        overdueLoansData={unitKPIs.overdueLoansData} getItemById={getItemById}
      />

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
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl bg-primary hover:bg-primary/90 z-40 flex items-center justify-center p-0"
      >
        <Scan className="h-6 w-6 text-white" />
      </Button>
    </>
  );
}
