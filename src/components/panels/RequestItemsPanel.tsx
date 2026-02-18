import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
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
    const statusConfig: Record<string, { variant: any; label: string; icon: any }> = {
      pending: { variant: 'outline', label: 'Pendente', icon: Clock },
      approved: { variant: 'default', label: 'Aprovado', icon: CheckCircle },
      processing: { variant: 'secondary', label: 'Processando', icon: Loader },
      completed: { variant: 'default', label: 'Concluído', icon: CheckCircle },
      rejected: { variant: 'destructive', label: 'Rejeitado', icon: XCircle },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getUrgencyBadge = (urgencyLevel: string) => {
    const urgencyConfig: Record<string, { className: string; label: string }> = {
      low: { className: 'bg-green-100 text-green-800 border-green-300', label: 'Baixa' },
      medium: { className: 'bg-yellow-100 text-yellow-800 border-yellow-300', label: 'Média' },
      high: { className: 'bg-red-100 text-red-800 border-red-300', label: 'Alta' },
    };

    const config = urgencyConfig[urgencyLevel] || urgencyConfig.medium;
    return <Badge className={config.className}>{config.label}</Badge>;
  };

  const pendingCount = unitRequests.filter(r => r.status === 'pending').length;
  const approvedCount = unitRequests.filter(r => r.status === 'approved' || r.status === 'processing').length;
  const completedCount = unitRequests.filter(r => r.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{pendingCount}</div>
            <p className="text-xs text-gray-600">Aguardando aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
            <Loader className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{approvedCount}</div>
            <p className="text-xs text-gray-600">Aprovadas/Processando</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm">Concluídas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{completedCount}</div>
            <p className="text-xs text-gray-600">Total recebidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Solicitações */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Solicitações ao Almoxarifado</CardTitle>
              <CardDescription>Gerencie pedidos de itens para sua unidade</CardDescription>
            </div>
            <Button onClick={handleNewRequest}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Solicitação
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {unitRequests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unitRequests.map(request => {
                  const item = getItemById(request.itemId);
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div>{item?.name}</div>
                          <div className="text-xs text-gray-500">{item?.description}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {request.quantity}
                      </TableCell>
                      <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(request.createdAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(request.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600 max-w-xs truncate">
                          {request.observations || '-'}
                        </div>
                        {request.status === 'rejected' && request.rejectedReason && (
                          <div className="text-xs text-red-600 mt-1">
                            Motivo: {request.rejectedReason}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
              <p>Nenhuma solicitação realizada ainda</p>
              <p className="text-sm">Clique em "Nova Solicitação" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                <p className="text-sm text-gray-600">
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
