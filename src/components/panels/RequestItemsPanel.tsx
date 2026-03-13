import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
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
import { Check, ChevronsUpDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Package, Plus, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { toast } from 'sonner';

export function RequestItemsPanel() {
  const {
    currentUser,
    currentUnit,
    items,
    categories,
    requests,
    getItemById,
    getUnitById,
    addRequest,
    getStockForItem,
    getWarehouseUnitId,
  } = useApp();

  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState('');
  const [urgency, setUrgency] = useState<'low' | 'medium' | 'high'>('medium');
  const [observations, setObservations] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Filtrar solicitações da unidade atual
  const unitRequests = requests.filter(
    r => r.requestingUnitId === currentUnit?.id
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Filtrar itens disponíveis (excluindo móveis)
  const availableItems = items.filter(
    item => item.active && !item.isFurniture
  );

  // Buscar itens
  const filteredItems = availableItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleNewRequest = () => {
    setRequestDialogOpen(true);
    setSelectedItem('');
    setQuantity('');
    setUrgency('medium');
    setObservations('');
    setSearchTerm('');
  };

  const confirmRequest = () => {
    if (!selectedItem || !quantity || !currentUser || !currentUnit) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    const qty = parseInt(quantity);
    if (qty <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    addRequest({
      itemId: selectedItem,
      requestingUnitId: currentUnit.id,
      requestedByUserId: currentUser.id,
      quantity: qty,
      status: 'pending',
      urgency,
      observations,
    });

    toast.success('Solicitação enviada ao almoxarifado!', {
      description: 'Aguarde a aprovação para receber os itens',
    });

    setRequestDialogOpen(false);
    setSelectedItem('');
    setQuantity('');
    setUrgency('medium');
    setObservations('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { variant: any; label: string; icon: any; className?: string }> = {
      pending: { variant: 'outline', label: 'Pendente', icon: Clock, className: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' },
      approved: { variant: 'outline', label: 'Aprovado', icon: CheckCircle, className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' },
      processing: { variant: 'outline', label: 'Processando', icon: Loader },
      completed: { variant: 'outline', label: 'Concluído', icon: CheckCircle, className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300' },
      rejected: { variant: 'outline', label: 'Rejeitado', icon: XCircle, className: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300' },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className={cn('flex items-center gap-1 w-fit', config.className)}>
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgencyLevel: string) => {
    const urgencyConfig: Record<string, { className: string; label: string }> = {
      low: { className: 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300', label: 'Baixa' },
      medium: { className: 'border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', label: 'Média' },
      high: { className: 'border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300', label: 'Alta' },
    };

    const config = urgencyConfig[urgencyLevel] || urgencyConfig.medium;
    return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
  };

  const pendingCount = unitRequests.filter(r => r.status === 'pending').length;
  const approvedCount = unitRequests.filter(r => r.status === 'approved' || r.status === 'processing').length;
  const completedCount = unitRequests.filter(r => r.status === 'completed').length;

  const getStatusBorder = (status: string) => {
    if (status === 'rejected' || status === 'overdue') return 'border-red-500';
    if (status === 'pending') return 'border-yellow-400';
    return 'border-emerald-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-foreground">Almoxarifado</h3>
          <span className="text-xs text-muted-foreground">{unitRequests.length} solicitações</span>
        </div>
        <Button onClick={handleNewRequest} size="sm">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova Solicitação
        </Button>
      </div>

      {/* Cards de dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Em andamento</CardTitle>
            <Loader className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{approvedCount}</div>
            <p className="text-xs text-muted-foreground">Aprovados / processando</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-semibold">{completedCount}</div>
            <p className="text-xs text-muted-foreground">Entregues</p>
          </CardContent>
        </Card>
      </div>

      {unitRequests.length > 0 ? (
        <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
          {unitRequests.map(request => {
            const item = getItemById(request.itemId);
            const detail = `${new Date(request.createdAt).toLocaleDateString('pt-BR')} ${new Date(request.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${request.status === 'rejected' && request.rejectedReason ? request.rejectedReason : (request.observations || 'Sem observações')}`;
            return (
              <div
                key={request.id}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors",
                  `border-l-[3px] ${getStatusBorder(request.status)}`
                )}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item?.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{detail}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{request.quantity}</span>
                  {getUrgencyBadge(request.urgency)}
                  {getStatusBadge(request.status)}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Package className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum item encontrado</p>
        </div>
      )}

      {/* Dialog de Nova Solicitação */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação ao Almoxarifado</DialogTitle>
            <DialogDescription>
              Solicite itens do almoxarifado central para {currentUnit?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item">Item *</Label>
              <Popover open={comboboxOpen} onOpenChange={setComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                  >
                    {selectedItem
                      ? getItemById(selectedItem)?.name
                      : "Buscar e selecionar item..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar item..." />
                    <CommandList>
                      <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
                      <CommandGroup>
                        {availableItems.map(item => {
                          const warehouseId = getWarehouseUnitId();
                          const warehouseStock = warehouseId ? getStockForItem(item.id, warehouseId) : 0;
                          return (
                            <CommandItem
                              key={item.id}
                              value={item.name}
                              onSelect={() => {
                                setSelectedItem(item.id);
                                setComboboxOpen(false);
                              }}
                            >
                              <Check
                                className={`mr-2 h-4 w-4 ${
                                  selectedItem === item.id ? "opacity-100" : "opacity-0"
                                }`}
                              />
                              <div className="flex-1 flex items-center justify-between">
                                <span>{item.name}</span>
                                {warehouseStock && (
                                  <span className={`text-xs ml-2 ${
                                    warehouseStock.quantity > 0 
                                      ? 'text-green-600' 
                                      : 'text-red-600'
                                  }`}>
                                    Est: {warehouseStock.quantity}
                                  </span>
                                )}
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
                <p className="text-sm text-muted-foreground">
                  {getItemById(selectedItem)?.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantidade *</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="urgency">Urgência *</Label>
                <Select value={urgency} onValueChange={(value: any) => setUrgency(value)}>
                  <SelectTrigger id="urgency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obs">Observações</Label>
              <Textarea
                id="obs"
                value={observations}
                onChange={(e) => setObservations(e.target.value)}
                placeholder="Informe detalhes sobre a solicitação..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmRequest} disabled={!selectedItem || !quantity}>
              Enviar Solicitação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
