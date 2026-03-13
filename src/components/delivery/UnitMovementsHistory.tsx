import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ArrowDown, 
  ArrowUp, 
  Package, 
  ArrowRightLeft, 
  RotateCcw,
  Search,
  Filter,
  Calendar,
  User,
  FileText,
  Building2
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface UnitMovementsHistoryProps {
  /** Se true, filtra apenas móveis. Se false, filtra apenas materiais (não móveis). Se undefined, mostra todos. */
  filterByFurniture?: boolean;
  /** ID da unidade. Se não informado, usa currentUnit do contexto. */
  unitId?: string;
}

export function UnitMovementsHistory(props: UnitMovementsHistoryProps = {}) {
  const { filterByFurniture, unitId } = props;
  const { currentUnit, units, movements, getItemById, getUnitById, getUserById } = useApp();
  const effectiveUnitId = unitId ?? currentUnit?.id;
  const effectiveUnit = effectiveUnitId ? (units.find(u => u.id === effectiveUnitId) ?? currentUnit) : currentUnit;
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredMovements = useMemo(() => {
    if (!effectiveUnitId) return [];

    // Get all movements related to this unit
    let unitMovements = movements.filter(m => m.unitId === effectiveUnitId);

    // Filter by item type (furniture vs materials)
    if (filterByFurniture !== undefined) {
      unitMovements = unitMovements.filter(m => {
        const item = getItemById(m.itemId);
        const isFurniture = !!item?.isFurniture;
        return filterByFurniture ? isFurniture : !isFurniture;
      });
    }

    // Apply search filter
    if (searchTerm) {
      unitMovements = unitMovements.filter(m => {
        const item = getItemById(m.itemId);
        const user = getUserById(m.userId);
        return (
          item?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.workOrder?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          m.notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Apply type filter
    if (typeFilter !== 'all') {
      unitMovements = unitMovements.filter(m => m.type === typeFilter);
    }

    // Apply date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      const getTs = (m: any) => m.timestamp ?? m.createdAt ?? '';

      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          unitMovements = unitMovements.filter(m => new Date(getTs(m)) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          unitMovements = unitMovements.filter(m => new Date(getTs(m)) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          unitMovements = unitMovements.filter(m => new Date(getTs(m)) >= filterDate);
          break;
      }
    }

    // Sort by most recent first
    return unitMovements.sort((a, b) => {
      const tsA = (a as any).timestamp ?? (a as any).createdAt;
      const tsB = (b as any).timestamp ?? (b as any).createdAt;
      return new Date(tsB).getTime() - new Date(tsA).getTime();
    });
  }, [effectiveUnitId, movements, searchTerm, typeFilter, dateFilter, getItemById, getUserById, filterByFurniture]);

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'entry':
        return {
          label: 'Entrada',
          icon: ArrowDown,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
        };
      case 'consumption':
        return {
          label: 'Consumo',
          icon: Package,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
        };
      case 'loan':
        return {
          label: 'Empréstimo',
          icon: ArrowRightLeft,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          borderColor: 'border-purple-200 dark:border-purple-800',
        };
      case 'return':
        return {
          label: 'Devolução',
          icon: RotateCcw,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          borderColor: 'border-orange-200 dark:border-orange-800',
        };
      default:
        return {
          label: type,
          icon: Package,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
        };
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return `Hoje às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (isYesterday) {
      return `Ontem às ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const totalMovements = filteredMovements.length;
  const totalEntries = filteredMovements.filter(m => m.type === 'entry').length;
  const totalConsumptions = filteredMovements.filter(m => m.type === 'consumption').length;
  const totalLoans = filteredMovements.filter(m => m.type === 'loan').length;

  if (!effectiveUnitId) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Selecione uma unidade para visualizar</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-muted-foreground">Total</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground">{totalMovements}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-green-600 dark:text-green-400">Entradas</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">{totalEntries}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-blue-600 dark:text-blue-400">Consumos</p>
              <p className="text-2xl md:text-3xl font-bold text-blue-600 dark:text-blue-400">{totalConsumptions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-purple-600 dark:text-purple-400">Empréstimos</p>
              <p className="text-2xl md:text-3xl font-bold text-purple-600 dark:text-purple-400">{totalLoans}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Item, usuário, OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-foreground">Tipo de Movimento</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entry">Entrada</SelectItem>
                  <SelectItem value="consumption">Consumo</SelectItem>
                  <SelectItem value="loan">Empréstimo</SelectItem>
                  <SelectItem value="return">Devolução</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium text-foreground">Período</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="week">Últimos 7 dias</SelectItem>
                  <SelectItem value="month">Último mês</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {(searchTerm || typeFilter !== 'all' || dateFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setDateFilter('all');
                }}
              >
                Limpar Filtros
              </Button>
              <span className="text-xs text-muted-foreground">
                {totalMovements} {totalMovements === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Histórico de Movimentações
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Timeline completa de todas as movimentações da unidade
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredMovements.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
              <p>Nenhuma movimentação encontrada</p>
              {(searchTerm || typeFilter !== 'all' || dateFilter !== 'all') && (
                <p className="text-xs mt-2">Tente ajustar os filtros</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMovements.map((movement) => {
                const item = getItemById(movement.itemId);
                const user = getUserById(movement.userId);
                const typeInfo = getMovementTypeInfo(movement.type);
                const TypeIcon = typeInfo.icon;

                if (!item || !user) return null;

                return (
                  <div
                    key={movement.id}
                    className={`border-l-4 ${typeInfo.borderColor} bg-muted p-3 md:p-4 rounded-r-lg hover:bg-muted/80 transition-colors`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`${typeInfo.bgColor} rounded-lg p-2 flex-shrink-0`}>
                        <TypeIcon className={`h-4 w-4 md:h-5 md:w-5 ${typeInfo.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <Badge variant="outline" className={typeInfo.color}>
                                {typeInfo.label}
                              </Badge>
                              <span className="text-sm font-medium text-foreground truncate">
                                {item.name}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(String((movement as any).timestamp ?? (movement as any).createdAt ?? ''))}
                            </p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {movement.type === 'consumption' || movement.type === 'loan' ? '-' : '+'}
                            {movement.quantity}
                          </Badge>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{user.name}</span>
                          </div>
                          
                          {movement.workOrder && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">OS: {movement.workOrder}</span>
                            </div>
                          )}

                          {movement.borrowerUnitId && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">
                                Para: {getUnitById(movement.borrowerUnitId)?.name || 'Unidade'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {movement.notes && (
                          <div className="mt-2 p-2 bg-muted/50 rounded border border-border">
                            <p className="text-xs text-foreground">{movement.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
