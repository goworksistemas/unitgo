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
import { Armchair, Plus, Minus } from 'lucide-react';
import { toast } from 'sonner';

interface EditFurnitureStockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stockId: string;
}

export function EditFurnitureStockDialog({ open, onOpenChange, stockId }: EditFurnitureStockDialogProps) {
  const { unitStocks, updateStock, getItemById } = useApp();

  const stock = unitStocks.find(s => s.id === stockId);
  const item = stock ? getItemById(stock.itemId) : null;

  const [quantity, setQuantity] = useState(stock?.quantity.toString() || '0');
  const [minimumQuantity, setMinimumQuantity] = useState(stock?.minimumQuantity.toString() || '1');
  const [location, setLocation] = useState(stock?.location || '');

  // Resetar quando abrir/fechar
  React.useEffect(() => {
    if (open && stock) {
      setQuantity(stock.quantity.toString());
      setMinimumQuantity(stock.minimumQuantity.toString());
      setLocation(stock.location);
    }
  }, [open, stock]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!stock) {
      toast.error('Estoque não encontrado');
      return;
    }

    const newQuantity = parseInt(quantity);
    const newMinimum = parseInt(minimumQuantity);

    if (isNaN(newQuantity) || newQuantity < 0) {
      toast.error('Quantidade deve ser um número válido');
      return;
    }

    if (isNaN(newMinimum) || newMinimum < 0) {
      toast.error('Quantidade mínima deve ser um número válido');
      return;
    }

    if (!location.trim()) {
      toast.error('Informe a localização do estoque');
      return;
    }

    // Atualizar estoque
    updateStock(stock.id, newQuantity, location, newMinimum);

    toast.success('Estoque de móvel atualizado com sucesso!');
    onOpenChange(false);
  };

  const adjustQuantity = (delta: number) => {
    const current = parseInt(quantity) || 0;
    const newValue = Math.max(0, current + delta);
    setQuantity(newValue.toString());
  };

  const adjustMinimum = (delta: number) => {
    const current = parseInt(minimumQuantity) || 0;
    const newValue = Math.max(1, current + delta);
    setMinimumQuantity(newValue.toString());
  };

  if (!stock || !item) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Armchair className="h-5 w-5 text-primary" />
            Editar Estoque de Móvel
          </DialogTitle>
          <DialogDescription className="text-sm">
            Atualize a quantidade e configurações do móvel em estoque
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Info do Móvel */}
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary rounded-lg flex-shrink-0">
                <Armchair className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{item.name}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
              </div>
            </div>
          </div>

          {/* Quantidade Atual */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade Disponível</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustQuantity(-1)}
                className="flex-shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="quantity"
                type="number"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="text-center text-lg font-semibold"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustQuantity(1)}
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Quantidade atual de unidades disponíveis deste móvel
            </p>
          </div>

          {/* Quantidade Mínima */}
          <div className="space-y-2">
            <Label htmlFor="minimumQuantity">Estoque Mínimo</Label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustMinimum(-1)}
                className="flex-shrink-0"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                id="minimumQuantity"
                type="number"
                min="1"
                value={minimumQuantity}
                onChange={(e) => setMinimumQuantity(e.target.value)}
                className="text-center"
                required
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => adjustMinimum(1)}
                className="flex-shrink-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Quantidade mínima necessária para alertas de reposição
            </p>
          </div>

          {/* Localização */}
          <div className="space-y-2">
            <Label htmlFor="location">Localização no Almoxarifado</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Galpão A - Corredor 3 - Prateleira 2"
              required
            />
            <p className="text-xs text-muted-foreground">
              Onde este móvel está armazenado no almoxarifado
            </p>
          </div>

          {/* Status Preview */}
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status após atualização:</span>
              {parseInt(quantity) >= parseInt(minimumQuantity) ? (
                <span className="font-semibold text-green-600">✓ Estoque Adequado</span>
              ) : (
                <span className="font-semibold text-red-600">⚠ Estoque Baixo</span>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Unidades faltantes:</span>
              <span className="font-semibold">
                {Math.max(0, parseInt(minimumQuantity) - parseInt(quantity))}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" className="w-full sm:w-auto">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
