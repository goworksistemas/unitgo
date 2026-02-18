import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Package, Armchair, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import type { DeliveryBatch } from '../../types';

interface MarkDeliveryPendingDialogProps {
  batch: DeliveryBatch;
  open: boolean;
  onClose: () => void;
}

export function MarkDeliveryPendingDialog({ 
  batch, 
  open, 
  onClose 
}: MarkDeliveryPendingDialogProps) {
  const { 
    currentUser,
    requests,
    furnitureRequestsToDesigner,
    getItemById,
    getUserById,
    markDeliveryAsPendingConfirmation,
  } = useApp();
  
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Buscar solicitações do lote e seus solicitantes
  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  // Obter lista única de solicitantes
  const requesterIds = new Set<string>();
  batchRequests.forEach(r => requesterIds.add(r.requestedByUserId));
  batchFurnitureRequests.forEach(r => requesterIds.add(r.requestedByUserId));
  
  const requesters = Array.from(requesterIds).map(id => getUserById(id)).filter(Boolean);
  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  const handleMarkPending = async () => {
    if (!currentUser) return;

    setIsSubmitting(true);

    try {
      await markDeliveryAsPendingConfirmation(batch.id, notes.trim() || undefined);
      
      toast.success('Entrega marcada como pendente de confirmação!');
      onClose();
    } catch (error) {
      console.error('Error marking delivery as pending:', error);
      toast.error('Erro ao marcar entrega');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Confirmar Entrega no Local
          </DialogTitle>
          <DialogDescription>
            Marque que os itens foram entregues no local e aguardam confirmação dos solicitantes
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo do Lote */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">Código do Lote</p>
                <p className="font-mono font-semibold">{batch.qrCode}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">Total de Itens</p>
                <p className="font-semibold">{totalItems}</p>
              </div>
            </div>
          </div>

          {/* Solicitantes que precisam confirmar */}
          <Alert>
            <Users className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Solicitantes que precisarão confirmar o recebimento:
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {requesters.map(user => (
                    <Badge key={user!.id} variant="outline" className="text-xs">
                      {user!.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Cada solicitante receberá notificação para confirmar com seu código único de 6 dígitos
                </p>
              </div>
            </AlertDescription>
          </Alert>

          {/* Lista de Itens */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Itens Entregues:</Label>
            <div className="space-y-2 max-h-52 overflow-y-auto">
              {batchRequests.map(request => {
                const item = getItemById(request.itemId);
                const requester = getUserById(request.requestedByUserId);
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
                          Qtd: {request.quantity} • Solicitado por: {requester?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}

              {batchFurnitureRequests.map(request => {
                const item = getItemById(request.itemId);
                const requester = getUserById(request.requestedByUserId);
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
                          Qtd: {request.quantity} • Solicitado por: {requester?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label htmlFor="notes">Observações da Entrega (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Itens deixados na recepção, condições especiais..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleMarkPending}
            disabled={isSubmitting}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Confirmar Entrega no Local
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}