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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

interface FurnitureRemovalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FurnitureRemovalDialog({ open, onOpenChange }: FurnitureRemovalDialogProps) {
  const {
    currentUser,
    currentUnit,
    items,
    unitStocks,
    addFurnitureRemovalRequest,
    getItemById,
  } = useApp();

  const [formData, setFormData] = useState({
    itemId: '',
    quantity: '1',
    reason: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filtrar apenas móveis com estoque na unidade atual
  const furnitureItems = items.filter(item => item.isFurniture && item.active);
  const availableFurniture = furnitureItems.filter(item => {
    const stock = unitStocks.find(s => s.itemId === item.id && s.unitId === currentUnit?.id);
    return stock && stock.quantity > 0;
  });

  const selectedItemStock = formData.itemId
    ? unitStocks.find(s => s.itemId === formData.itemId && s.unitId === currentUnit?.id)
    : undefined;

  const handleSubmit = async () => {
    if (!currentUser || !currentUnit) return;

    if (!formData.itemId || !formData.quantity || !formData.reason.trim()) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const quantity = parseInt(formData.quantity);
    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (selectedItemStock && quantity > selectedItemStock.quantity) {
      toast.error('Quantidade solicitada excede o estoque disponível');
      return;
    }

    setIsSubmitting(true);

    try {
      const item = getItemById(formData.itemId);

      // Aguardar o salvamento no banco
      await addFurnitureRemovalRequest({
        itemId: formData.itemId,
        unitId: currentUnit.id,
        requestedByUserId: currentUser.id,
        quantity,
        reason: formData.reason.trim(),
        status: 'pending',
      });

      // Toast DEPOIS de salvar com sucesso
      toast.success('Solicitação enviada!', {
        description: `Aguardando aprovação do designer para retirada de ${item?.name}`,
      });

      // Reset form
      setFormData({
        itemId: '',
        quantity: '1',
        reason: '',
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      toast.error('Erro ao criar solicitação', {
        description: 'Por favor, tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Solicitar Retirada de Móvel
          </DialogTitle>
          <DialogDescription>
            Solicite a retirada de móveis da unidade. O designer irá avaliar se será armazenado ou descartado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="furniture">Móvel *</Label>
            <Select
              value={formData.itemId}
              onValueChange={(value) => setFormData({ ...formData, itemId: value, quantity: '1' })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o móvel" />
              </SelectTrigger>
              <SelectContent>
                {availableFurniture.map(item => {
                  const stock = unitStocks.find(s => s.itemId === item.id && s.unitId === currentUnit?.id);
                  return (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name} (Disponível: {stock?.quantity || 0})
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={selectedItemStock?.quantity || 1}
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="1"
            />
            {selectedItemStock && (
              <p className="text-sm text-slate-500">
                Estoque disponível: {selectedItemStock.quantity}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Retirada *</Label>
            <Textarea
              id="reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Ex: Móvel danificado, substituição, reorganização do espaço..."
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}