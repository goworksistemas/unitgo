import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Package, Armchair, QrCode, Building2 } from 'lucide-react';
import { DeliveryQRCode } from '../shared/DeliveryQRCode';
import { useApp } from '../../contexts/AppContext';
import type { DeliveryBatch } from '../../types';

interface DeliveryConfirmationDialogProps {
  batch: DeliveryBatch;
  open: boolean;
  onClose: () => void;
}

export function DeliveryConfirmationDialog({ batch, open, onClose }: DeliveryConfirmationDialogProps) {
  const { 
    requests, 
    furnitureRequestsToDesigner,
    getItemById,
    getUnitById 
  } = useApp();

  const targetUnit = getUnitById(batch.targetUnitId);
  
  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-primary" />
            QR Code da Entrega
          </DialogTitle>
          <DialogDescription>
            Mostre este QR Code para o recebedor escanear e confirmar o recebimento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Destino:</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {targetUnit?.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Total de itens:</span>
                  <Badge>{totalItems}</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-center py-4">
            <DeliveryQRCode code={batch.qrCode} size={220} />
          </div>

          <div className="border rounded-lg p-3 space-y-2 max-h-40 overflow-y-auto">
            <p className="text-sm font-medium mb-2">Itens neste lote:</p>
            
            {batchRequests.map((request) => {
              const item = getItemById(request.itemId);
              return (
                <div key={request.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{item?.name}</span>
                  </div>
                  <Badge variant="secondary">{request.quantity}x</Badge>
                </div>
              );
            })}

            {batchFurnitureRequests.map((request) => {
              const item = getItemById(request.itemId);
              return (
                <div key={request.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Armchair className="h-4 w-4 text-muted-foreground" />
                    <span>{item?.name}</span>
                  </div>
                  <Badge variant="secondary">{request.quantity}x</Badge>
                </div>
              );
            })}
          </div>

          <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
            <QrCode className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
              O recebedor deve escanear este QR Code pelo painel dele para confirmar o recebimento.
              Caso não esteja presente, use a opção "Confirmar Depois".
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
