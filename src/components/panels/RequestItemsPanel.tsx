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
import { Check, ChevronsUpDown, Calendar } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
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

  const requestCardAccent = (status: string) => {
    if (status === 'rejected' || status === 'overdue') {
      return 'border-l-4 border-l-red-500 bg-red-500/[0.03] dark:bg-red-950/20';
    }
    if (status === 'pending') {
      return 'border-l-4 border-l-amber-500 bg-amber-500/[0.04] dark:bg-amber-950/15';
    }
    if (status === 'approved' || status === 'processing') {
      return 'border-l-4 border-l-sky-500 bg-sky-500/[0.04] dark:bg-sky-950/20';
    }
    return 'border-l-4 border-l-emerald-500 bg-emerald-500/[0.04] dark:bg-emerald-950/15';
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground tracking-tight">Pedidos ao almoxarifado</h3>
              <p className="text-xs text-muted-foreground">
                {unitRequests.length === 0
                  ? 'Nenhuma solicitação nesta unidade'
                  : `${unitRequests.length} solicitação${unitRequests.length === 1 ? '' : 'ões'} registrada${unitRequests.length === 1 ? '' : 's'}`}
              </p>
            </div>
          </div>
        </div>
        <Button onClick={handleNewRequest} size="sm" className="shrink-0 w-full sm:w-auto">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Nova solicitação
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Clock className="h-5 w-5 text-amber-700 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums leading-none">{pendingCount}</p>
              <p className="text-xs font-medium text-foreground mt-1">Pendentes</p>
              <p className="text-[11px] text-muted-foreground">Aguardando o almoxarifado</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-900/30">
              <Loader className="h-5 w-5 text-sky-700 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums leading-none">{approvedCount}</p>
              <p className="text-xs font-medium text-foreground mt-1">Em andamento</p>
              <p className="text-[11px] text-muted-foreground">Aprovado ou separando</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
              <CheckCircle className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-semibold tabular-nums leading-none">{completedCount}</p>
              <p className="text-xs font-medium text-foreground mt-1">Concluídas</p>
              <p className="text-[11px] text-muted-foreground">Já entregues à unidade</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {unitRequests.length > 0 ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lista de solicitações</p>
          {unitRequests.map((request) => {
            const item = getItemById(request.itemId);
            const created = new Date(request.createdAt);
            const dateStr = `${created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · ${created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
            const hasObs = Boolean(request.observations?.trim());
            const rejected = request.status === 'rejected' && request.rejectedReason;

            return (
              <Card
                key={request.id}
                className={cn(
                  'border border-border/80 shadow-sm transition-shadow hover:shadow-md',
                  requestCardAccent(request.status),
                )}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-base font-semibold text-foreground leading-snug">
                        {item?.name ?? 'Item removido do catálogo'}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                          {dateStr}
                        </span>
                      </div>
                      {rejected ? (
                        <p className="text-sm text-destructive/90 bg-destructive/5 dark:bg-destructive/10 rounded-md px-3 py-2 border border-destructive/15">
                          <span className="font-medium text-destructive">Motivo da rejeição: </span>
                          {request.rejectedReason}
                        </p>
                      ) : hasObs ? (
                        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{request.observations}</p>
                      ) : (
                        <p className="text-xs text-muted-foreground/80 italic">Sem observações na solicitação</p>
                      )}
                    </div>
                    <div className="flex flex-row flex-wrap items-stretch gap-3 lg:flex-col lg:items-end shrink-0">
                      <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-2.5 min-w-[7rem]">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Quantidade</p>
                        <p className="text-lg font-semibold tabular-nums text-foreground">{request.quantity}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        {getUrgencyBadge(request.urgency)}
                        {getStatusBadge(request.status)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-border/80 bg-muted/20">
          <CardContent className="flex flex-col items-center justify-center py-14 px-6 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Package className="h-6 w-6 text-muted-foreground/50" aria-hidden />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhum pedido ainda</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Quando precisar de materiais do almoxarifado central, use <span className="font-medium text-foreground/90">Nova solicitação</span>.
            </p>
          </CardContent>
        </Card>
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
