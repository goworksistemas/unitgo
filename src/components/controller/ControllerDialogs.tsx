import type { DeliveryBatch, DeliveryConfirmation } from '@/types';
import { Button } from '../ui/button';
import { FurnitureRemovalDialog } from '../dialogs/FurnitureRemovalDialog';
import { ConsumeItemDialog } from '../dialogs/ConsumeItemDialog';
import { LoanItemDialog } from '../dialogs/LoanItemDialog';
import { AddStockDialog } from '../dialogs/AddStockDialog';
import { AddFurnitureDialog } from '../dialogs/AddFurnitureDialog';
import { RequestFurnitureToDesignerDialog } from '../dialogs/RequestFurnitureToDesignerDialog';
import { DeliveryTimeline } from '../delivery/DeliveryTimeline';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { ReceiptConfirmationWithCode } from '../panels/ReceiptConfirmationWithCode';
import { toast } from 'sonner';

export interface StockDialogState {
  open: boolean;
  stockId: string;
  itemName: string;
  quantity: number;
}

interface ControllerDialogsProps {
  removalDialogOpen: boolean;
  onRemovalDialogChange: (open: boolean) => void;
  consumeDialog: StockDialogState;
  onConsumeDialogChange: (state: StockDialogState) => void;
  loanDialog: StockDialogState;
  onLoanDialogChange: (state: StockDialogState) => void;
  addStockDialog: StockDialogState;
  onAddStockDialogChange: (state: StockDialogState) => void;
  requestFurnitureDialogOpen: boolean;
  onRequestFurnitureDialogChange: (open: boolean) => void;
  addFurnitureDialogOpen: boolean;
  onAddFurnitureDialogChange: (open: boolean) => void;
  selectedBatchForReceipt: string | null;
  onSelectedBatchForReceiptChange: (batchId: string | null) => void;
  selectedBatchForTimeline: string | null;
  onSelectedBatchForTimelineChange: (batchId: string | null) => void;
  showQRScanner: boolean;
  onShowQRScannerChange: (show: boolean) => void;
  scannedBatchId: string | null;
  onScannedBatchIdChange: (batchId: string | null) => void;
  deliveryBatches: DeliveryBatch[];
  getConfirmationsForBatch: (batchId: string) => DeliveryConfirmation[];
}

export function ControllerDialogs({
  removalDialogOpen, onRemovalDialogChange,
  consumeDialog, onConsumeDialogChange,
  loanDialog, onLoanDialogChange,
  addStockDialog, onAddStockDialogChange,
  requestFurnitureDialogOpen, onRequestFurnitureDialogChange,
  addFurnitureDialogOpen, onAddFurnitureDialogChange,
  selectedBatchForReceipt, onSelectedBatchForReceiptChange,
  selectedBatchForTimeline, onSelectedBatchForTimelineChange,
  showQRScanner, onShowQRScannerChange,
  scannedBatchId, onScannedBatchIdChange,
  deliveryBatches, getConfirmationsForBatch,
}: ControllerDialogsProps) {
  const receiptBatch = selectedBatchForReceipt ? deliveryBatches.find(b => b.id === selectedBatchForReceipt) : null;
  const scannedBatch = scannedBatchId ? deliveryBatches.find(b => b.id === scannedBatchId) : null;

  return (
    <>
      <FurnitureRemovalDialog open={removalDialogOpen} onOpenChange={onRemovalDialogChange} />

      <ConsumeItemDialog
        open={consumeDialog.open}
        onOpenChange={(open) => onConsumeDialogChange({ ...consumeDialog, open })}
        stockId={consumeDialog.stockId}
        itemName={consumeDialog.itemName}
        availableQuantity={consumeDialog.quantity}
      />

      <LoanItemDialog
        open={loanDialog.open}
        onOpenChange={(open) => onLoanDialogChange({ ...loanDialog, open })}
        stockId={loanDialog.stockId}
        itemName={loanDialog.itemName}
        availableQuantity={loanDialog.quantity}
      />

      <AddStockDialog
        open={addStockDialog.open}
        onOpenChange={(open) => onAddStockDialogChange({ ...addStockDialog, open })}
        stockId={addStockDialog.stockId}
        itemName={addStockDialog.itemName}
        currentQuantity={addStockDialog.quantity}
      />

      <RequestFurnitureToDesignerDialog
        open={requestFurnitureDialogOpen}
        onOpenChange={onRequestFurnitureDialogChange}
      />

      <AddFurnitureDialog open={addFurnitureDialogOpen} onOpenChange={onAddFurnitureDialogChange} />

      {receiptBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <ReceiptConfirmationWithCode
                batch={receiptBatch}
                onSuccess={() => onSelectedBatchForReceiptChange(null)}
                onCancel={() => onSelectedBatchForReceiptChange(null)}
              />
            </div>
          </div>
        </div>
      )}

      {selectedBatchForTimeline && (
        <dialog
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          open
          onClick={() => onSelectedBatchForTimelineChange(null)}
        >
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg">Timeline da Entrega</h3>
                <Button variant="outline" size="sm" onClick={() => onSelectedBatchForTimelineChange(null)}>
                  Fechar
                </Button>
              </div>
              <DeliveryTimeline
                batch={deliveryBatches.find(b => b.id === selectedBatchForTimeline)!}
                confirmations={getConfirmationsForBatch(selectedBatchForTimeline)}
              />
            </div>
          </div>
        </dialog>
      )}

      {showQRScanner && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => onShowQRScannerChange(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={(code) => {
                const batch = deliveryBatches.find(b => b.qrCode === code);
                if (batch) {
                  onScannedBatchIdChange(batch.id);
                  onShowQRScannerChange(false);
                } else {
                  toast.error('Lote não encontrado. Verifique o cdigo.');
                }
              }}
              onClose={() => onShowQRScannerChange(false)}
            />
          </div>
        </div>
      )}

      {scannedBatch && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div onClick={(e) => e.stopPropagation()} className="my-8 w-full max-w-2xl">
            <ReceiptConfirmationWithCode
              batch={scannedBatch}
              onSuccess={() => onScannedBatchIdChange(null)}
              onCancel={() => onScannedBatchIdChange(null)}
              viaQRCode
            />
          </div>
        </div>
      )}
    </>
  );
}
