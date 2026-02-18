import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, ChevronsUpDown, Check } from 'lucide-react';
import type { Item, Unit } from '@/types';
import { useState } from 'react';

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  availableItems: Item[];
  availableUnits: Unit[];
  getItemById: (id: string) => Item | undefined;
  showUnitSelector: boolean;
  onSubmit: (data: { itemId: string; unitId: string; quantity: number; urgency: 'low' | 'medium' | 'high'; observations: string }) => void;
}

export function NewRequestDialog({ open, onOpenChange, availableItems, availableUnits, getItemById, showUnitSelector, onSubmit }: NewRequestDialogProps) {
  const [selectedItemId, setSelectedItemId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [observations, setObservations] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  const handleSubmit = () => {
    onSubmit({ itemId: selectedItemId, unitId: selectedUnitId, quantity: parseInt(quantity), urgency, observations });
    setSelectedItemId('');
    setSelectedUnitId('');
    setQuantity('1');
    setUrgency('medium');
    setObservations('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto"><Plus className="h-4 w-4 mr-2" />Nova Solicitação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Material</DialogTitle>
          <DialogDescription>Solicite materiais disponíveis no almoxarifado central</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Item *</Label>
            <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {selectedItemId ? getItemById(selectedItemId)?.name : "Buscar e selecionar item..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar item..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                    <CommandGroup>
                      {availableItems.map(item => (
                        <CommandItem key={item.id} value={item.name} onSelect={() => { setSelectedItemId(item.id); setComboboxOpen(false); }}>
                          <Check className={`mr-2 h-4 w-4 ${selectedItemId === item.id ? "opacity-100" : "opacity-0"}`} />
                          <span>{item.name}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Quantidade *</Label>
            <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Urgência *</Label>
            <Select value={urgency} onValueChange={(v) => setUrgency(v as 'low' | 'medium' | 'high')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea value={observations} onChange={(e) => setObservations(e.target.value)} rows={3} />
          </div>
          {showUnitSelector && (
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                <SelectTrigger><SelectValue placeholder="Selecione a unidade" /></SelectTrigger>
                <SelectContent>
                  {availableUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!selectedItemId || !quantity || parseInt(quantity) < 1}>Solicitar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
