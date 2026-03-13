import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { QrCode, Armchair, Building2, MapPin } from 'lucide-react';
import { DeliveryQRCode } from '../shared/DeliveryQRCode';
import { useApp } from '../../contexts/AppContext';
import type { FurnitureRequestToDesigner } from '../../types';

interface FurnitureQRCodeScannerDialogProps {
  request: FurnitureRequestToDesigner;
  open: boolean;
  onClose: () => void;
}

export function FurnitureQRCodeScannerDialog({ request, open, onClose }: FurnitureQRCodeScannerDialogProps) {
  const { getItemById, getUnitById } = useApp();

  const item = getItemById(request.itemId);
  const targetUnit = getUnitById(request.requestingUnitId);

  const qrCodeValue = `FRN-${request.id}`;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-lg">
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
            <Armchair className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Móvel:</span>
                  <Badge variant="outline">{item?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Destino:</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {targetUnit?.name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Local:</span>
                  <Badge className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {request.location}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quantidade:</span>
                  <Badge>{request.quantity}x</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-center items-center w-full py-4">
            <DeliveryQRCode code={qrCodeValue} size={220} />
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
