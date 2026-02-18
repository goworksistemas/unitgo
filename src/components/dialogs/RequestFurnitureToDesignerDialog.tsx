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
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { AlertCircle, Sofa, Check, ChevronsUpDown, Package } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";

interface RequestFurnitureToDesignerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RequestFurnitureToDesignerDialog({ 
  open, 
  onOpenChange,
}: RequestFurnitureToDesignerDialogProps) {
  const { 
    currentUser, 
    currentUnit, 
    items, 
    addFurnitureRequestToDesigner,
    getStockForItem,
    getWarehouseUnitId,
  } = useApp();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [location, setLocation] = useState('');
  const [justification, setJustification] = useState('');
  const [error, setError] = useState('');
  const [openItemCombobox, setOpenItemCombobox] = useState(false);

  // Get warehouse unit ID
  const warehouseUnitId = getWarehouseUnitId();

  // Get all furniture items that have stock in the warehouse
  const furnitureItems = items
    .filter(item => {
      if (!item.isFurniture || !item.active) return false;
      
      // Only show items with stock in warehouse
      if (!warehouseUnitId) return false;
      const stock = getStockForItem(item.id, warehouseUnitId);
      return stock && stock.quantity > 0;
    })
    .map(item => {
      const stock = getStockForItem(item.id, warehouseUnitId!);
      return {
        ...item,
        availableStock: stock?.quantity || 0
      };
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedItemId) {
      setError('Selecione um móvel');
      return;
    }

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError('Quantidade inválida');
      return;
    }

    if (!location.trim()) {
      setError('Informe a localização');
      return;
    }

    if (!justification.trim()) {
      setError('Informe a justificativa');
      return;
    }

    if (!currentUnit || !currentUser) {
      setError('Unidade ou usuário não identificado');
      return;
    }

    try {
      // Aguardar o salvamento no banco
      await addFurnitureRequestToDesigner({
        itemId: selectedItemId,
        requestingUnitId: currentUnit.id,
        requestedByUserId: currentUser.id,
        quantity: qty,
        location: location.trim(),
        justification: justification.trim(),
        status: 'pending_designer',
      });

      // Toast DEPOIS de salvar com sucesso
      toast.success('Solicitação enviada ao designer!', {
        description: `A equipe de design irá avaliar sua solicitação em breve.`
      });

      // Reset and close
      setSelectedItemId('');
      setQuantity('1');
      setLocation('');
      setJustification('');
      setError('');
      onOpenChange(false);
      
    } catch (error) {
      // Tratar erros
      console.error('Erro ao salvar solicitação:', error);
      setError('Erro ao enviar solicitação. Tente novamente.');
      toast.error('Erro ao enviar solicitação', {
        description: 'Por favor, tente novamente.'
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedItemId('');
      setQuantity('1');
      setLocation('');
      setJustification('');
      setError('');
    }
    onOpenChange(newOpen);
  };

  const selectedItem = furnitureItems.find(i => i.id === selectedItemId);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sofa className="h-5 w-5" />
            Solicitar Móvel ao Designer
          </DialogTitle>
          <DialogDescription>
            Envie uma solicitação de móvel para aprovação do designer. Apenas móveis com estoque no almoxarifado são exibidos.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Móvel - Combobox com busca */}
          <div className="space-y-2">
            <Label htmlFor="furniture">Móvel *</Label>
            <Popover open={openItemCombobox} onOpenChange={setOpenItemCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openItemCombobox}
                  className="w-full justify-between"
                >
                  {selectedItemId
                    ? (() => {
                        const item = furnitureItems.find((i) => i.id === selectedItemId);
                        if (!item) return "Selecione o móvel";
                        return `${item.name}${item.brand ? ` - ${item.brand}` : ''}${item.model ? ` (${item.model})` : ''}`;
                      })()
                    : "Selecione o móvel"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Pesquisar móvel..." />
                  <CommandList>
                    <CommandEmpty>Nenhum móvel encontrado.</CommandEmpty>
                    <CommandGroup>
                      {furnitureItems.map((item) => {
                        const displayName = `${item.name}${item.brand ? ` - ${item.brand}` : ''}${item.model ? ` (${item.model})` : ''}`;
                        return (
                          <CommandItem
                            key={item.id}
                            value={displayName}
                            onSelect={() => {
                              setSelectedItemId(item.id);
                              setOpenItemCombobox(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedItemId === item.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-1 items-center justify-between gap-2">
                              <div className="flex flex-col">
                                <span>{displayName}</span>
                                {item.description && (
                                  <span className="text-xs text-slate-500">{item.description}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                                <Package className="h-3 w-3" />
                                <span>{item.availableStock}</span>
                              </div>
                            </div>
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {selectedItem && (
              <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-2 py-1.5 rounded border border-green-200">
                <Package className="h-3.5 w-3.5" />
                <span>
                  <strong>{selectedItem.availableStock}</strong> unidade{selectedItem.availableStock !== 1 ? 's' : ''} disponível{selectedItem.availableStock !== 1 ? 'is' : ''} no almoxarifado
                </span>
              </div>
            )}
            {furnitureItems.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Nenhum móvel com estoque disponível no almoxarifado no momento. Entre em contato com a equipe de compras.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Digite a quantidade"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Localização na Unidade *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Sala de reunião 1, Recepção, etc."
            />
            <p className="text-xs text-slate-500">
              Onde o móvel será posicionado na unidade
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="justification">Justificativa *</Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Explique o motivo da solicitação do móvel..."
              rows={4}
            />
            <p className="text-xs text-slate-500">
              Por que este móvel é necessário para a unidade?
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Fluxo de aprovação:</strong><br />
              1. Designer avalia e aprova/rejeita<br />
              2. Se aprovado, almoxarifado é acionado para entrega<br />
              3. Motorista realiza a entrega na unidade
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}