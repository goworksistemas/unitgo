import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Package, History, CheckCircle2, Scan, ShoppingCart, FileText } from 'lucide-react';
import { RequesterConfirmationPanel } from '../panels/RequesterConfirmationPanel';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { ReceiptConfirmationWithCode } from '../panels/ReceiptConfirmationWithCode';
import { StockPanel } from '../requester/StockPanel';
import { RequestsPanel } from '../requester/RequestsPanel';
import { NewRequestDialog } from '../requester/NewRequestDialog';
import { CreatePurchaseRequestPanel } from '../purchases/requester/CreatePurchaseRequestPanel';
import { MyPurchaseRequestsPanel } from '../purchases/requester/MyPurchaseRequestsPanel';
import { toast } from 'sonner';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';

export function RequesterDashboard() {
  const { currentUser, items, requests, addRequest, getItemById, units, deliveryBatches, getStockForItem, unitStocks, getWarehouseUnitId } = useApp();
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBatchId, setScannedBatchId] = useState<string | null>(null);

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'stock', label: 'Estoque Disponível', icon: Package },
    { id: 'requests', label: 'Meus Pedidos', icon: History },
    { id: 'deliveries', label: 'Recebimentos', icon: CheckCircle2 },
    { id: 'purchases', label: 'Compras', icon: ShoppingCart, items: [
      { id: 'new-purchase', label: 'Nova Solicitação', icon: ShoppingCart },
      { id: 'my-purchases', label: 'Minhas Solicitações', icon: FileText },
    ]},
  ], []);

  const { activeSection, activeItem } = useDashboardNav(navigationSections, 'Minhas Solicitações', 'Solicite materiais do almoxarifado central', 'stock');

  const availableItems = items.filter(item => !item.isFurniture && item.active);
  const warehouseId = getWarehouseUnitId();
  const availableUnits = units.filter(unit => unit.id !== warehouseId && unit.status === 'active');
  const myRequests = requests.filter(req => req.requestedByUserId === currentUser?.id);

  const handleSubmitRequest = (data: { itemId: string; unitId: string; quantity: number; urgency: 'low' | 'medium' | 'high'; observations: string }) => {
    if (!currentUser) return;
    const targetUnitId = currentUser.primaryUnitId || data.unitId;
    if (!targetUnitId) return;
    addRequest({
      itemId: data.itemId,
      requestingUnitId: targetUnitId,
      requestedByUserId: currentUser.id,
      quantity: data.quantity,
      status: 'pending',
      urgency: data.urgency,
      observations: data.observations,
    });
    setIsNewRequestOpen(false);
  };

  return (
    <>
      <div className="flex justify-end mb-4">
        <NewRequestDialog
          open={isNewRequestOpen}
          onOpenChange={setIsNewRequestOpen}
          availableItems={availableItems}
          availableUnits={availableUnits}
          getItemById={getItemById}
          showUnitSelector={!currentUser?.primaryUnitId}
          onSubmit={handleSubmitRequest}
        />
      </div>

      {activeSection === 'stock' && (
        <StockPanel
          availableItems={availableItems}
          requests={requests}
          getWarehouseUnitId={getWarehouseUnitId}
          getStockForItem={getStockForItem}
          onRequestItem={(itemId) => { setIsNewRequestOpen(true); }}
        />
      )}
      {activeSection === 'requests' && (
        <RequestsPanel myRequests={myRequests} getItemById={getItemById} onNewRequest={() => setIsNewRequestOpen(true)} />
      )}
      {activeSection === 'deliveries' && <RequesterConfirmationPanel />}
      {activeSection === 'purchases' && activeItem === 'my-purchases' && <MyPurchaseRequestsPanel />}
      {activeSection === 'purchases' && activeItem !== 'my-purchases' && <CreatePurchaseRequestPanel />}

      <Button
        onClick={() => setShowQRScanner(true)}
        className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-xl z-40 flex items-center justify-center p-0"
      >
        <Scan className="h-6 w-6 text-white" />
      </Button>

      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={(code) => {
                const batch = deliveryBatches.find(b => b.qrCode === code);
                if (batch) { setScannedBatchId(batch.id); setShowQRScanner(false); }
                else { toast.error('Lote não encontrado. Verifique o código.'); }
              }}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      )}

      {scannedBatchId && (() => {
        const batch = deliveryBatches.find(b => b.id === scannedBatchId);
        if (!batch) return null;
        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
            <div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl">
              <ReceiptConfirmationWithCode batch={batch} onSuccess={() => setScannedBatchId(null)} onCancel={() => setScannedBatchId(null)} />
            </div>
          </div>
        );
      })()}
    </>
  );
}
