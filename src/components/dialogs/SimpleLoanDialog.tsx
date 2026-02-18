import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../ui/command';
import { toast } from 'sonner';
import { Calendar, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from "@/lib/utils";

interface SimpleLoanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SimpleLoanDialog({ open, onOpenChange }: SimpleLoanDialogProps) {
  const { currentUnit, currentUser, items, users, addLoan } = useApp();
  const [selectedItemId, setSelectedItemId] = useState('');
  const [responsibleUserId, setResponsibleUserId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [openItemCombobox, setOpenItemCombobox] = useState(false);
  const [openUserCombobox, setOpenUserCombobox] = useState(false);

  if (!currentUnit || !currentUser) return null;

  // Todos os itens disponíveis (móveis e produtos)
  const availableItems = items.filter(item => item.active);

  // Filtrar apenas usuários ativos (todos os perfis podem pegar emprestado)
  const availableUsers = users.filter(user => user.id !== currentUser.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedItemId || !responsibleUserId || !expectedReturnDate) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum < 1) {
      toast.error('Quantidade deve ser um número válido maior que zero');
      return;
    }

    setLoading(true);

    try {
      // Registrar empréstimo sem mexer no estoque
      await addLoan({
        itemId: selectedItemId,
        unitId: currentUnit.id,
        responsibleUserId: responsibleUserId,
        serialNumber: serialNumber || undefined,
        quantity: quantityNum,
        expectedReturnDate: new Date(expectedReturnDate),
        status: 'active',
        observations: observations || undefined,
      });

      const item = items.find(i => i.id === selectedItemId);
      const user = users.find(u => u.id === responsibleUserId);
      toast.success(`Empréstimo de ${quantityNum}x "${item?.name}" para ${user?.name} registrado com sucesso!`);

      // Resetar formulário
      setSelectedItemId('');
      setResponsibleUserId('');
      setSerialNumber('');
      setQuantity('1');
      setExpectedReturnDate('');
      setObservations('');
      onOpenChange(false);
    } catch (error) {
      toast.error('Erro ao registrar empréstimo');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Registrar Empréstimo</DialogTitle>
          <DialogDescription>
            Controle de itens emprestados (sem alterar estoque)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item - Combobox com busca */}
          <div className="space-y-2">
            <Label htmlFor="item">Item *</Label>
            <Popover open={openItemCombobox} onOpenChange={setOpenItemCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openItemCombobox}
                  className="w-full justify-between"
                >
                  {selectedItemId
                    ? availableItems.find((item) => item.id === selectedItemId)?.name
                    : "Selecione o item"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Pesquisar item..." />
                  <CommandList>
                    <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                    <CommandGroup>
                      {availableItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
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
                          {item.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Responsável - Combobox com busca */}
          <div className="space-y-2">
            <Label htmlFor="responsible">Responsável *</Label>
            <Popover open={openUserCombobox} onOpenChange={setOpenUserCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openUserCombobox}
                  className="w-full justify-between"
                >
                  {responsibleUserId
                    ? (() => {
                        const user = availableUsers.find((u) => u.id === responsibleUserId);
                        return user ? `${user.name} - ${user.email}` : "Selecione o usuário";
                      })()
                    : "Selecione o usuário responsável"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Pesquisar usuário..." />
                  <CommandList>
                    <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                    <CommandGroup>
                      {availableUsers.map((user) => (
                        <CommandItem
                          key={user.id}
                          value={`${user.name} ${user.email}`}
                          onSelect={() => {
                            setResponsibleUserId(user.id);
                            setOpenUserCombobox(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              responsibleUserId === user.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col">
                            <span>{user.name}</span>
                            <span className="text-xs text-slate-500">{user.email}</span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial">Número de Série / Patrimônio</Label>
            <Input
              id="serial"
              placeholder="Ex: PAT-12345 (opcional)"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">Quantidade *</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              required
              placeholder="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="returnDate">Data de Devolução Prevista *</Label>
            <div className="relative">
              <Input
                id="returnDate"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Observações</Label>
            <Textarea
              id="observations"
              placeholder="Motivo do empréstimo, condições, etc. (opcional)"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Registrando...' : 'Registrar Empréstimo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}