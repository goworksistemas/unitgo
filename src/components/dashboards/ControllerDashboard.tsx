import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Package, Armchair, Scan, PackageOpen, Calendar, Truck, Boxes } from 'lucide-react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationSection } from '@/hooks/useNavigation';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { ControllerKPIs } from '../controller/ControllerKPIs';
import { FurniturePanel } from '../controller/FurniturePanel';
import { LoansPanel } from '../controller/LoansPanel';
import { DeliveriesPanel } from '../controller/DeliveriesPanel';
import { AlmoxarifadoPanel } from '../controller/AlmoxarifadoPanel';
import { ItemSearchPanel } from '../panels/ItemSearchPanel';
import { PendingDeliveriesAlert } from '../controller/PendingDeliveriesAlert';
import { LoanAlerts } from '../controller/LoanAlerts';
import { ControllerDialogs, type StockDialogState } from '../controller/ControllerDialogs';

function getControllerPageMeta(
  section: string,
  item: string | undefined,
  unitName: string | undefined,
  roleLabel: string,
): { title: string; subtitle?: string } {
  const u = unitName ?? 'Unidade';
  switch (section) {
    case 'estoque':
      if (item === 'materiais') {
        return {
          title: 'Materiais',
          subtitle: `${u} · Buscar, consumir, registrar entrada ou emprestar`,
        };
      }
      if (item === 'moveis') {
        return {
          title: 'Móveis',
          subtitle: `${u} · Patrimônio, designer e retiradas`,
        };
      }
      if (item === 'loans') {
        return {
          title: 'Empréstimos',
          subtitle: `${u} · Itens emprestados e devoluções`,
        };
      }
      return { title: 'Estoque', subtitle: u };
    case 'almoxarifado':
      return {
        title: 'Solicitações ao almoxarifado',
        subtitle: `${u} · Materiais com o estoque central`,
      };
    case 'deliveries':
      return {
        title: 'Recebimentos',
        subtitle: `${u} · Confirme entregas com QR Code`,
      };
    default:
      return { title: roleLabel, subtitle: u };
  }
}

export function ControllerDashboard() {
  const {
    currentUnit, unitStocks, loans, items, getItemById, getUserById,
    requests, furnitureRemovalRequests, furnitureRequestsToDesigner,
    deliveryBatches, getConfirmationsForBatch, currentUser,
  } = useApp();
  const { setTitle } = useNavigation();
  const roleLabel = currentUser?.role === 'executor' ? 'Executor' : 'Controlador';
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
        sidebarGroup: 'modulos' as const,
        badge: totalEstoquePendentes > 0 ? totalEstoquePendentes : undefined,
        items: [
          { id: 'materiais', label: 'Materiais', icon: Boxes, badge: belowMinimumCount > 0 ? belowMinimumCount : undefined },
          { id: 'moveis', label: 'Móveis', icon: Armchair, badge: pendingRemovals > 0 ? pendingRemovals : undefined },
          { id: 'loans', label: 'Empréstimos', icon: Calendar, badge: overdueLoans > 0 ? overdueLoans : undefined },
        ],
      },
      {
        id: 'almoxarifado',
        label: 'Pedidos ao almox.',
        icon: PackageOpen,
        sidebarGroup: 'modulos',
        badge: pendingAlmoxarifado > 0 ? pendingAlmoxarifado : undefined,
      },
      {
        id: 'deliveries',
        label: 'Recebimentos',
        icon: Truck,
        sidebarGroup: 'modulos',
        badge: pendingDeliveries > 0 ? pendingDeliveries : undefined,
      },
    ];
  }, [currentUnit, deliveryBatches, requests, furnitureRemovalRequests, loans, unitStocks, getItemById]);

  const { activeSection, activeItem, setActiveSection } = useDashboardNav(
    navigationSections,
    undefined,
    undefined,
    'estoque',
  );

  useEffect(() => {
    if (activeSection === 'estoque' && !activeItem) {
      setActiveSection('estoque', 'materiais');
    }
  }, [activeSection, activeItem, setActiveSection]);

  useEffect(() => {
    if (!currentUnit) return;
    const { title, subtitle } = getControllerPageMeta(
      activeSection,
      activeItem,
      currentUnit.name,
      roleLabel,
    );
    setTitle(title, subtitle);
  }, [activeSection, activeItem, currentUnit, setTitle, roleLabel]);

  const showEstoqueOverviewBand = activeSection === 'estoque';

  if (!currentUnit) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center max-w-md mx-auto">
        <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" aria-hidden />
        <p className="text-sm font-medium text-foreground">Escolha uma unidade</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use o seletor <span className="font-medium text-foreground/80">Unidade</span> na barra lateral para carregar estoque, pedidos e recebimentos.
        </p>
      </div>
    );
  }

  if (!unitKPIs) return null;

  const renderContent = () => {
    switch (activeSection) {
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
              title="Materiais em estoque"
              description="Itens desta unidade: abra um material para consumir, emprestar ou ver histórico."
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

  return (
    <>
      <div className="space-y-4">
        {showEstoqueOverviewBand && (
          <div className="rounded-xl border border-border/80 bg-card overflow-hidden shadow-sm">
            <p className="px-4 pt-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Resumo do estoque da unidade
            </p>
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

        <div className="rounded-xl border border-border/80 bg-card/90 p-4 md:p-5 shadow-sm">
          {renderContent()}
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

      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              onClick={() => setShowQRScanner(true)}
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full border border-border bg-primary hover:bg-primary/90 z-40 flex items-center justify-center p-0 shadow-lg"
              aria-label="Escanear QR Code de entrega"
            >
              <Scan className="h-6 w-6 text-primary-foreground" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-[220px]">
            Escanear QR de lote — confirme recebimentos mais rápido
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </>
  );
}
