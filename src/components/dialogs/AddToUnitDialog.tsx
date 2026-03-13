import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '../ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { PackagePlus, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AddToUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddToUnitDialog({ open, onOpenChange }: AddToUnitDialogProps) {
  const { currentUnit, currentUser, items, getStockForItem, addMovement } = useApp();
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [notes, setNotes] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const availableItems = items.filter(i => i.active && !i.isFurniture);
  const selectedItem = selectedItemId ? items.find(i => i.id === selectedItemId) : null;
  const currentStock = selectedItemId && currentUnit
    ? getStockForItem(selectedItemId, currentUnit.id)
    : undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItemId || !currentUser || !currentUnit) {
      toast.error('Selecione um item');
      return;
    }
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    try {
      await addMovement({
        type: 'entry',
        itemId: selectedItemId,
        unitId: currentUnit.id,
        userId: currentUser.id,
        quantity: qty,
        notes: notes.trim() || undefined,
      });
      toast.success(`${qty} ${selectedItem?.unitOfMeasure} de "${selectedItem?.name}" adicionado(s) ao estoque`);
      setSelectedItemId(null);
      setQuantity('1');
      setNotes('');
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao adicionar ao estoque');
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedItemId(null);
      setQuantity('1');
      setNotes('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="h-5 w-5" />
            Adicionar ao Estoque
          </DialogTitle>
          <DialogDescription>
            Registrar entrada de material na unidade {currentUnit?.name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Item *</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={comboboxOpen}
                  className="w-full justify-between"
                >
                  {selectedItem ? selectedItem.name : 'Selecione o item...'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar item..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                    <CommandGroup>
                      {availableItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            setSelectedItemId(item.id);
                            setComboboxOpen(false);
                          }}
                        >
                          <Check className={cn('mr-2 h-4 w-4', selectedItemId === item.id ? 'opacity-100' : 'opacity-0')} />
                          {item.name}
                          {currentUnit && (() => {
                            const st = getStockForItem(item.id, currentUnit.id);
                            return st ? (
                              <span className="ml-2 text-xs text-muted-foreground">(atual: {st.quantity})</span>
                            ) : null;
                          })()}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="qty">Quantidade *</Label>
            <Input
              id="qty"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="1"
            />
            {selectedItem && currentStock && (
              <p className="text-xs text-muted-foreground">
                Novo total: {currentStock.quantity + parseInt(quantity || '0')} {selectedItem.unitOfMeasure}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações (opcional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="NF, fornecedor, motivo da entrada..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!selectedItemId || !quantity}>
              Registrar Entrada
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
