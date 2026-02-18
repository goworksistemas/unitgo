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
import { AlertCircle, PackagePlus } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';

interface AddStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId?: string; // Opcional - quando já existe stock
  itemId?: string; // Opcional - quando ainda não existe stock
  itemName: string;
  currentQuantity: number;
}

export function AddStockDialog({ 
  open, 
  onOpenChange, 
  stockId,
  itemId,
  itemName,
  currentQuantity 
}: AddStockDialogProps) {
  const { currentUser, currentUnit, addMovement, unitStocks, getItemById } = useApp();
  const [quantity, setQuantity] = useState('1');
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

    if (!currentUser || !currentUnit) {
      setError('Unidade ou usuário não identificado');
      return;
    }

    // Caso 1: Já existe stock (stockId foi passado)
    if (stockId) {
      const stock = unitStocks.find(s => s.id === stockId);
      if (!stock) {
        setError('Estoque não encontrado');
        return;
      }

      addMovement({
        type: 'entry',
        itemId: stock.itemId,
        unitId: stock.unitId,
        userId: currentUser.id,
        quantity: qty,
        notes: notes.trim() || undefined,
      });

    } 
    // Caso 2: Ainda não existe stock (itemId foi passado)
    else if (itemId) {
      
      addMovement({
        type: 'entry',
        itemId: itemId,
        unitId: currentUnit.id,
        userId: currentUser.id,
        quantity: qty,
        notes: notes.trim() || undefined,
      });

    } else {
      setError('Item ou estoque não identificado');
      return;
    }

    // Reset and close
    setQuantity('1');
    setNotes('');
    setError('');
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setQuantity('1');
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
            <PackagePlus className="h-5 w-5" />
            Entrada de Estoque
          </DialogTitle>
          <DialogDescription>
            Adicionar {itemName} ao estoque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">{itemName}</span>
              <Badge variant="outline">Atual: {currentQuantity}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade a Adicionar *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
            />
            <p className="text-xs text-slate-500">
              Novo total: {currentQuantity + parseInt(quantity || '0')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fornecedor, nota fiscal, motivo da entrada, etc."
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
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}