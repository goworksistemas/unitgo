import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { AlertCircle, Package } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface ConsumeItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: string;
  itemName: string;
  availableQuantity: number;
}

export function ConsumeItemDialog({ 
  open, 
  onOpenChange, 
  stockId, 
  itemName,
  availableQuantity 
}: ConsumeItemDialogProps) {
  const { currentUser, addMovement, unitStocks } = useApp();
  const [quantity, setQuantity] = useState('1');
  const [workOrder, setWorkOrder] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const qty = parseInt(quantity);
    
    if (!qty || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (qty > availableQuantity) {
      setError(`Quantidade disponível: ${availableQuantity}`);
      return;
    }

    if (!workOrder.trim()) {
      setError('Ordem de serviço é obrigatória');
      return;
    }

    const stock = unitStocks.find(s => s.id === stockId);
    if (!stock) {
      setError('Estoque não encontrado');
      return;
    }

    if (!currentUser) return;

    addMovement({
      type: 'consumption',
      itemId: stock.itemId,
      unitId: stock.unitId,
      userId: currentUser.id,
      quantity: qty,
      workOrder: workOrder.trim(),
      notes: notes.trim() || undefined,
    });

    // Reset and close
    setQuantity('1');
    setWorkOrder('');
    setNotes('');
    setError('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantity('1');
      setWorkOrder('');
      setNotes('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Consumir Item
          </DialogTitle>
          <DialogDescription>
            Registrar consumo de {itemName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{itemName}</span>
              <Badge variant="outline">Disponível: {availableQuantity}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={availableQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workOrder">Ordem de Serviço *</Label>
            <Input
              id="workOrder"
              value={workOrder}
              onChange={(e) => setWorkOrder(e.target.value)}
              placeholder="Ex: OS-2025-001"
            />
            <p className="text-xs text-muted-foreground">
              Obrigatório para rastreabilidade
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Informações adicionais sobre o consumo"
              rows={3}
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Registrar Consumo
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
