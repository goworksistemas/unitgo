import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { 
  Package, 
  Armchair, 
  CheckCircle, 
  KeyRound,
  AlertCircle,
  Clock,
  Scan
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { formatDailyCode, unformatDailyCode } from '../../utils/dailyCode';
import { QRCodeScanner } from '../shared/QRCodeScanner';
import { ReceiptConfirmationWithCode } from './ReceiptConfirmationWithCode';

export function RequesterConfirmationPanel() {
  const { 
    currentUser,
    deliveryBatches,
    deliveryConfirmations,
    requests,
    furnitureRequestsToDesigner,
    getItemById,
    getUserDailyCode,
    validateUserDailyCode,
    confirmDeliveryByRequester,
    getConfirmationsForBatch,
  } = useApp();
  
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [dailyCodeInput, setDailyCodeInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [scannedBatch, setScannedBatch] = useState<typeof deliveryBatches[0] | null>(null);

  const pendingBatches = useMemo(() => {
    if (!currentUser) return [];

    return deliveryBatches.filter(batch => {
      if (batch.status !== 'pending_confirmation') return false;

      const hasMyRequests = requests.some(r => 
        batch.requestIds.includes(r.id) && r.requestedByUserId === currentUser.id
      );
      const hasMyFurnitureRequests = furnitureRequestsToDesigner.some(r => 
        batch.furnitureRequestIds?.includes(r.id) && r.requestedByUserId === currentUser.id
      );

      if (!hasMyRequests && !hasMyFurnitureRequests) return false;

      const confirmations = getConfirmationsForBatch(batch.id);
      const alreadyConfirmed = confirmations.some(c => 
        c.confirmedByUserId === currentUser.id && c.type === 'requester'
      );

      return !alreadyConfirmed;
    });
  }, [currentUser, deliveryBatches, requests, furnitureRequestsToDesigner, deliveryConfirmations]);

  const myDailyCode = currentUser ? getUserDailyCode(currentUser.id) : '';
  const formattedMyCode = formatDailyCode(myDailyCode);

  const handleQRScanSuccess = (code: string) => {
    const batch = deliveryBatches.find(b => b.qrCode === code);
    if (batch) {
      setScannedBatch(batch);
      setShowQRScanner(false);
    } else {
      toast.error('Lote não encontrado. Verifique o QR Code.');
    }
  };

  const handleConfirm = async () => {
    if (!currentUser || !selectedBatchId) return;

    const cleanCode = unformatDailyCode(dailyCodeInput);
    if (!validateUserDailyCode(currentUser.id, cleanCode)) {
      toast.error('Código incorreto. Verifique e tente novamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmDeliveryByRequester(selectedBatchId, {
        userId: currentUser.id,
        userName: currentUser.name,
        notes: notes.trim() || undefined,
        dailyCode: cleanCode,
      });

      toast.success('Recebimento confirmado com sucesso!');
      setSelectedBatchId(null);
      setDailyCodeInput('');
      setNotes('');
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentUser) return null;

  if (showQRScanner) {
    return (
      <div className="space-y-4" data-confirmation-panel>
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowQRScanner(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <QRCodeScanner
              onScanSuccess={handleQRScanSuccess}
              onClose={() => setShowQRScanner(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (scannedBatch) {
    return (
      <div className="space-y-4" data-confirmation-panel>
        <ReceiptConfirmationWithCode
          batch={scannedBatch}
          onSuccess={() => setScannedBatch(null)}
          onCancel={() => setScannedBatch(null)}
          viaQRCode
        />
      </div>
    );
  }

  if (pendingBatches.length === 0) {
    return (
      <Card data-confirmation-panel>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Confirmar Recebimentos
              </CardTitle>
              <CardDescription>
                Nenhuma entrega aguardando sua confirmação
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowQRScanner(true)} 
              className="bg-primary hover:bg-primary/90"
              size="sm"
            >
              <Scan className="h-4 w-4 mr-2" />
              Escanear QR Code
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">Você está em dia com suas confirmações!</p>
            <p className="text-xs text-muted-foreground mt-2">
              Use o botão "Escanear QR Code" para confirmar entregas presenciais
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedBatch = selectedBatchId 
    ? deliveryBatches.find(b => b.id === selectedBatchId)
    : null;

  const myItemsInBatch = selectedBatch ? {
    products: requests.filter(r => 
      selectedBatch.requestIds.includes(r.id) && r.requestedByUserId === currentUser.id
    ),
    furniture: furnitureRequestsToDesigner.filter(r => 
      selectedBatch.furnitureRequestIds?.includes(r.id) && r.requestedByUserId === currentUser.id
    ),
  } : { products: [], furniture: [] };

  return (
    <div className="space-y-4" data-confirmation-panel>
      {!selectedBatchId ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Confirmar Recebimentos
                </CardTitle>
                <CardDescription>
                  {pendingBatches.length} entrega(s) aguardando sua confirmação
                </CardDescription>
              </div>
              <Button 
                onClick={() => setShowQRScanner(true)} 
                className="bg-primary hover:bg-primary/90"
                size="sm"
              >
                <Scan className="h-4 w-4 mr-2" />
                Escanear QR Code
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800">
              <Scan className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-xs text-blue-800 dark:text-blue-200">
                Se o motorista está presente, use o botão "Escanear QR Code" para confirmar instantaneamente.
                Os lotes abaixo são de entregas que aguardam confirmação com código diário.
              </AlertDescription>
            </Alert>

            {pendingBatches.map(batch => {
              const myRequests = requests.filter(r => 
                batch.requestIds.includes(r.id) && r.requestedByUserId === currentUser.id
              );
              const myFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
                batch.furnitureRequestIds?.includes(r.id) && r.requestedByUserId === currentUser.id
              );
              const totalMyItems = myRequests.length + myFurnitureRequests.length;

              return (
                <div 
                  key={batch.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">Lote {batch.qrCode}</p>
                      <p className="text-sm text-muted-foreground">
                        {totalMyItems} {totalMyItems === 1 ? 'item seu' : 'itens seus'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">
                      <Clock className="h-3 w-3 mr-1" />
                      Aguardando
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  <div className="space-y-2 mb-3">
                    {myRequests.map(req => {
                      const item = getItemById(req.itemId);
                      return (
                        <div key={req.id} className="flex items-center gap-2 text-sm">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{item?.name} - Qtd: {req.quantity}</span>
                        </div>
                      );
                    })}
                    {myFurnitureRequests.map(req => {
                      const item = getItemById(req.itemId);
                      return (
                        <div key={req.id} className="flex items-center gap-2 text-sm">
                          <Armchair className="h-3 w-3 text-muted-foreground" />
                          <span>{item?.name} - Qtd: {req.quantity}</span>
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    onClick={() => setSelectedBatchId(batch.id)}
                    className="w-full"
                    size="sm"
                  >
                    <KeyRound className="h-4 w-4 mr-2" />
                    Confirmar com Código Diário
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Confirmar Recebimento - Lote {selectedBatch?.qrCode}
            </CardTitle>
            <CardDescription>
              Digite seu código único para confirmar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Seus Itens:</Label>
              <div className="space-y-2">
                {myItemsInBatch.products.map(req => {
                  const item = getItemById(req.itemId);
                  return (
                    <div key={req.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item?.name}</p>
                        <p className="text-xs text-muted-foreground">Quantidade: {req.quantity}</p>
                      </div>
                    </div>
                  );
                })}
                {myItemsInBatch.furniture.map(req => {
                  const item = getItemById(req.itemId);
                  return (
                    <div key={req.id} className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                      <Armchair className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item?.name}</p>
                        <p className="text-xs text-muted-foreground">Quantidade: {req.quantity}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            <Alert>
              <KeyRound className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <p className="text-sm">Seu código único de hoje:</p>
                  <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                    {formattedMyCode}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Digite este código abaixo para confirmar
                  </p>
                </div>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="dailyCode">Digite seu código único *</Label>
              <Input
                id="dailyCode"
                value={dailyCodeInput}
                onChange={(e) => setDailyCodeInput(e.target.value)}
                placeholder="000-000"
                maxLength={7}
                className="text-center text-lg font-mono tracking-wider"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações (opcional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Condições dos itens, problemas, etc..."
                rows={3}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBatchId(null);
                  setDailyCodeInput('');
                  setNotes('');
                }}
                className="flex-1"
                disabled={isSubmitting}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={isSubmitting || !dailyCodeInput.trim()}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Confirmar Recebimento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
