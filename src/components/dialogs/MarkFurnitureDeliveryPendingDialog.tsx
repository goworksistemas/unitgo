import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Clock, Armchair, Building2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import type { FurnitureRequestToDesigner } from '../../types';

interface MarkFurnitureDeliveryPendingDialogProps {
  request: FurnitureRequestToDesigner;
  open: boolean;
  onClose: () => void;
}

export function MarkFurnitureDeliveryPendingDialog({ request, open, onClose }: MarkFurnitureDeliveryPendingDialogProps) {
  const { 
    currentUser,
    updateFurnitureRequestToDesigner,
    getItemById,
    getUnitById
  } = useApp();
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const item = getItemById(request.itemId);
  const targetUnit = getUnitById(request.requestingUnitId);

  const handleMarkPending = async () => {
    if (!currentUser) {
      toast.error('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      // Marcar como entregue mas pendente de confirmação do controlador
      await updateFurnitureRequestToDesigner(request.id, {
        status: 'pending_confirmation',
        deliveredByUserId: currentUser.id,
        deliveredAt: new Date(),
        observations: notes || undefined,
      });

      toast.success('✅ Entrega marcada como pendente de confirmação!', {
        description: 'O controlador receberá notificação para confirmar o recebimento'
      });

      onClose();
      setNotes('');
    } catch (error) {
      console.error('Erro ao marcar entrega como pendente:', error);
      toast.error('Erro ao marcar entrega. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            Marcar Entrega como Pendente
          </DialogTitle>
          <DialogDescription>
            A entrega será marcada como realizada e aguardará confirmação do controlador
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações da Entrega */}
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
                  <Badge variant="outline">{targetUnit?.name}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Local:</span>
                  <Badge>{request.location}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Quantidade:</span>
                  <Badge>{request.quantity}x</Badge>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Aviso */}
          <Alert className="border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              O controlador da unidade receberá notificação para confirmar o recebimento do móvel.
            </AlertDescription>
          </Alert>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Móvel deixado na recepção, entreguei ao João..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-orange-600 hover:bg-orange-700"
            onClick={handleMarkPending}
            disabled={isSubmitting}
          >
            <Clock className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Salvando...' : 'Marcar como Pendente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
