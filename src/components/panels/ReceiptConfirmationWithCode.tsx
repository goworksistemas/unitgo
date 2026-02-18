import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  CheckCircle, 
  AlertCircle, 
  Package, 
  Armchair, 
  KeyRound,
  Truck,
  MapPin,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { unformatDailyCode, formatDailyCode } from '../../utils/dailyCode';
import type { DeliveryBatch } from '../../types';

interface ReceiptConfirmationWithCodeProps {
  batch: DeliveryBatch;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ReceiptConfirmationWithCode({ 
  batch, 
  onSuccess, 
  onCancel 
}: ReceiptConfirmationWithCodeProps) {
  const { 
    currentUser, 
    requests, 
    furnitureRequestsToDesigner,
    confirmReceipt,
    getUserDailyCode,
    validateUserDailyCode,
    getItemById,
    getUnitById,
    getUserById
  } = useApp();
  
  const [dailyCodeInput, setDailyCodeInput] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date().toDateString());

  // Força re-render quando a data muda (após meia-noite)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 180 * 60 * 1000); // Verifica a cada 3 horas

    return () => clearInterval(interval);
  }, [currentDate]);
  
  const targetUnit = getUnitById(batch.targetUnitId);
  const driver = getUserById(batch.driverUserId);
  
  // Buscar solicitações do lote
  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  // Código diário do usuário atual
  const myDailyCode = currentUser ? getUserDailyCode(currentUser.id) : '';
  const formattedMyCode = formatDailyCode(myDailyCode);

  const handleConfirm = async () => {
    if (!currentUser) return;

    // Validar código diário
    const cleanCode = unformatDailyCode(dailyCodeInput);
    if (!validateUserDailyCode(currentUser.id, cleanCode)) {
      toast.error('Código diário incorreto. Verifique e tente novamente.');
      return;
    }

    setIsSubmitting(true);

    try {
      await confirmReceipt(batch.id, {
        type: 'receipt',
        confirmedByUserId: currentUser.id,
        photoUrl: '', // Não tem foto neste fluxo (confirmação por código)
        notes: notes.trim() ? `${notes.trim()} | dailyCode:${cleanCode}` : `dailyCode:${cleanCode}`,
      });

      toast.success('Recebimento confirmado com sucesso!');
      onSuccess();
    } catch (error) {
      console.error('Error confirming receipt:', error);
      toast.error('Erro ao confirmar recebimento');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Alerta para lotes pendentes de confirmação */}
      {batch.status === 'pending_confirmation' && (
        <Alert className="bg-yellow-100 border-yellow-400 dark:bg-yellow-900/30 dark:border-yellow-600">
          <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Atenção:</strong> O motorista marcou este lote como "Confirmar Depois" e não escaneou o QR Code. 
            Verifique cuidadosamente os itens antes de confirmar o recebimento.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Informações do Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Confirmar Recebimento
          </CardTitle>
          <CardDescription>
            Valide o recebimento com seu código único
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informações da Entrega */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Destino
              </p>
              <p className="font-medium">{targetUnit?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <Truck className="h-4 w-4" />
                Motorista
              </p>
              <p className="font-medium">{driver?.name || 'N/A'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Criado em
              </p>
              <p className="font-medium">
                {new Date(batch.createdAt).toLocaleDateString('pt-BR')}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Total de Itens
              </p>
              <p className="font-medium">{totalItems}</p>
            </div>
          </div>

          <Separator />

          {/* Lista de Itens */}
          <div>
            <p className="text-sm font-medium mb-3">Itens do Lote:</p>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {batchRequests.map(request => {
                const item = getItemById(request.itemId);
                return (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item?.name || 'Item'}</p>
                        <p className="text-xs text-muted-foreground">
                          Quantidade: {request.quantity}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>
                );
              })}

              {batchFurnitureRequests.map(request => {
                const item = getItemById(request.itemId);
                return (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Armchair className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{item?.name || 'Móvel'}</p>
                        <p className="text-xs text-muted-foreground">
                          Quantidade: {request.quantity}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmação com Código */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" />
            Validação de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mostrar código do usuário */}
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm">Seu código único de hoje:</p>
                <p className="text-2xl font-mono font-bold text-primary tracking-wider">
                  {formattedMyCode}
                </p>
                <p className="text-xs text-muted-foreground">
                  Digite este código abaixo para confirmar o recebimento
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
              placeholder="Adicione observações sobre o recebimento..."
              rows={3}
            />
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
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
    </div>
  );
}