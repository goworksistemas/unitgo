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
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { formatDailyCode, unformatDailyCode } from '../../utils/dailyCode';

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

  // Encontrar lotes que têm itens solicitados pelo usuário atual e estão pendentes de confirmação
  const pendingBatches = useMemo(() => {
    if (!currentUser) return [];

    return deliveryBatches.filter(batch => {
      // Só lotes com status "pending_confirmation"
      if (batch.status !== 'pending_confirmation') return false;

      // Verificar se o usuário atual solicitou algum item deste lote
      const hasMyRequests = requests.some(r => 
        batch.requestIds.includes(r.id) && r.requestedByUserId === currentUser.id
      );
      const hasMyFurnitureRequests = furnitureRequestsToDesigner.some(r => 
        batch.furnitureRequestIds?.includes(r.id) && r.requestedByUserId === currentUser.id
      );

      if (!hasMyRequests && !hasMyFurnitureRequests) return false;

      // Verificar se já confirmou
      const confirmations = getConfirmationsForBatch(batch.id);
      const alreadyConfirmed = confirmations.some(c => 
        c.confirmedByUserId === currentUser.id && c.type === 'requester'
      );

      return !alreadyConfirmed;
    });
  }, [currentUser, deliveryBatches, requests, furnitureRequestsToDesigner, deliveryConfirmations]);

  const myDailyCode = currentUser ? getUserDailyCode(currentUser.id) : '';
  const formattedMyCode = formatDailyCode(myDailyCode);

  const handleConfirm = async () => {
    if (!currentUser || !selectedBatchId) return;

    // Validar código diário
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

  if (pendingBatches.length === 0) {
    return (
      <Card data-confirmation-panel>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Confirmar Recebimentos
          </CardTitle>
          <CardDescription>
            Nenhuma entrega aguardando sua confirmação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm">Você está em dia com suas confirmações!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const selectedBatch = selectedBatchId 
    ? deliveryBatches.find(b => b.id === selectedBatchId)
    : null;

  // Filtrar apenas os itens do lote selecionado que foram solicitados pelo usuário
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
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Confirmar Recebimentos
            </CardTitle>
            <CardDescription>
              {pendingBatches.length} entrega(s) aguardando sua confirmação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
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
                    <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
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
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar Recebimento
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
            {/* Seus itens */}
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

            {/* Código único */}
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

            {/* Campo de código */}
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

            {/* Observações */}
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

            {/* Botões */}
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