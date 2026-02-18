import React, { useState, useEffect, useMemo } from 'react';
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

export function ControllerConfirmationPanel() {
  const { 
    currentUser,
    currentUnit,
    deliveryBatches,
    getDeliveryBatchById,
    confirmReceipt,
    requests,
    furnitureRequestsToDesigner,
    getItemById,
    getUserById,
    getUserDailyCode,
    validateUserDailyCode,
  } = useApp();
  
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [dailyCodeInput, setDailyCodeInput] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());

  // Força re-render quando a data muda (após meia-noite)
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 180 * 60 * 1000); // Verifica a cada 3 horas

    return () => clearInterval(interval);
  }, [currentDate]);

  // Encontrar lotes que estão pendentes de confirmação para a unidade atual
  const pendingBatches = useMemo(() => {
    if (!currentUnit) return [];

    return deliveryBatches.filter(batch => {
      // Só lotes com status "pending_confirmation" para esta unidade
      if (batch.status !== 'pending_confirmation') return false;
      if (batch.targetUnitId !== currentUnit.id) return false;

      return true;
    });
  }, [currentUnit, deliveryBatches]);

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

    setIsConfirming(true);

    try {
      await confirmReceipt(selectedBatchId, {
        confirmedByUserId: currentUser.id,
        userId: currentUser.id,
        userName: currentUser.name,
        type: 'receipt',
        dailyCode: cleanCode,
      });

      toast.success('Recebimento confirmado com sucesso!');
      setSelectedBatchId(null);
      setDailyCodeInput('');
    } catch (error) {
      console.error('Error confirming delivery:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!currentUser || !currentUnit) return null;

  if (pendingBatches.length === 0) {
    return null; // Não mostrar nada se não houver entregas pendentes
  }

  const selectedBatch = selectedBatchId 
    ? deliveryBatches.find(b => b.id === selectedBatchId)
    : null;

  // Todos os itens do lote selecionado
  const itemsInBatch = selectedBatch ? {
    products: requests.filter(r => selectedBatch.requestIds.includes(r.id)),
    furniture: furnitureRequestsToDesigner.filter(r => 
      selectedBatch.furnitureRequestIds?.includes(r.id)
    ),
  } : { products: [], furniture: [] };

  return (
    <div className="space-y-4" data-controller-confirmation-panel>
      {!selectedBatchId ? (
        <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                <CardTitle className="text-base md:text-lg">Entregas Aguardando Confirmação</CardTitle>
              </div>
              <Badge className="bg-yellow-600">
                {pendingBatches.length}
              </Badge>
            </div>
            <CardDescription className="text-xs md:text-sm">
              Confirme o recebimento com seu código único
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingBatches.map(batch => {
              const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
              const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
                batch.furnitureRequestIds?.includes(r.id)
              );
              const totalItems = batchRequests.length + batchFurnitureRequests.length;

              return (
                <div 
                  key={batch.id}
                  className="bg-card rounded-lg p-3 border border-yellow-300 dark:border-yellow-700"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-sm">Lote {batch.qrCode}</p>
                      <p className="text-xs text-muted-foreground">
                        {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 border-yellow-400 dark:border-yellow-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Pendente
                    </Badge>
                  </div>

                  <Separator className="my-3" />

                  <div className="space-y-2 mb-3">
                    {batchRequests.slice(0, 3).map(req => {
                      const item = getItemById(req.itemId);
                      return (
                        <div key={req.id} className="flex items-center gap-2 text-sm">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span>{item?.name} - Qtd: {req.quantity}</span>
                        </div>
                      );
                    })}
                    {batchFurnitureRequests.slice(0, 3).map(req => {
                      const item = getItemById(req.itemId);
                      return (
                        <div key={req.id} className="flex items-center gap-2 text-sm">
                          <Armchair className="h-3 w-3 text-muted-foreground" />
                          <span>{item?.name} - Qtd: {req.quantity}</span>
                        </div>
                      );
                    })}
                    {totalItems > 3 && (
                      <p className="text-xs text-muted-foreground pl-5">
                        + {totalItems - 3} item(ns) adicional(is)
                      </p>
                    )}
                  </div>

                  <Button
                    onClick={() => setSelectedBatchId(batch.id)}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                    size="sm"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirmar com Código
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-primary">
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
            {/* Itens do lote */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Itens do Lote:</Label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {itemsInBatch.products.map(req => {
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
                {itemsInBatch.furniture.map(req => {
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

            {/* Botões */}
            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedBatchId(null);
                  setDailyCodeInput('');
                }}
                className="flex-1"
                disabled={isConfirming}
              >
                Voltar
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1 bg-primary hover:bg-primary/90"
                disabled={isConfirming || !dailyCodeInput.trim()}
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