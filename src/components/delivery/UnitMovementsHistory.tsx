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

export function UnitMovementsHistory() {
  const { currentUnit, movements, getItemById, getUnitById, getUserById } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');

  const filteredMovements = useMemo(() => {
    if (!currentUnit) return [];

    // Get all movements related to this unit
    let unitMovements = movements.filter(m => m.unitId === currentUnit.id);

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
      
      switch (dateFilter) {
        case 'today':
          filterDate.setHours(0, 0, 0, 0);
          unitMovements = unitMovements.filter(m => new Date(m.timestamp) >= filterDate);
          break;
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          unitMovements = unitMovements.filter(m => new Date(m.timestamp) >= filterDate);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          unitMovements = unitMovements.filter(m => new Date(m.timestamp) >= filterDate);
          break;
      }
    }

    // Sort by most recent first
    return unitMovements.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [currentUnit, movements, searchTerm, typeFilter, dateFilter, getItemById, getUserById]);

  const getMovementTypeInfo = (type: string) => {
    switch (type) {
      case 'entry':
        return {
          label: 'Entrada',
          icon: ArrowDown,
          color: 'text-green-600',
          bgColor: 'bg-green-100',
          borderColor: 'border-green-200',
        };
      case 'consumption':
        return {
          label: 'Consumo',
          icon: Package,
          color: 'text-blue-600',
          bgColor: 'bg-blue-100',
          borderColor: 'border-blue-200',
        };
      case 'loan':
        return {
          label: 'Empréstimo',
          icon: ArrowRightLeft,
          color: 'text-purple-600',
          bgColor: 'bg-purple-100',
          borderColor: 'border-purple-200',
        };
      case 'return':
        return {
          label: 'Devolução',
          icon: RotateCcw,
          color: 'text-orange-600',
          bgColor: 'bg-orange-100',
          borderColor: 'border-orange-200',
        };
      default:
        return {
          label: type,
          icon: Package,
          color: 'text-slate-600',
          bgColor: 'bg-slate-100',
          borderColor: 'border-slate-200',
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

  if (!currentUnit) {
    return (
      <div className="text-center py-12 text-slate-500">
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
              <p className="text-xs md:text-sm text-slate-600">Total</p>
              <p className="text-2xl md:text-3xl text-slate-900">{totalMovements}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-green-600">Entradas</p>
              <p className="text-2xl md:text-3xl text-green-600">{totalEntries}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-blue-600">Consumos</p>
              <p className="text-2xl md:text-3xl text-blue-600">{totalConsumptions}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 md:pt-6 pb-4">
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-purple-600">Empréstimos</p>
              <p className="text-2xl md:text-3xl text-purple-600">{totalLoans}</p>
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
              <label className="text-xs md:text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Item, usuário, OS..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs md:text-sm font-medium">Tipo de Movimento</label>
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
              <label className="text-xs md:text-sm font-medium">Período</label>
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
              <span className="text-xs text-slate-600">
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
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 text-slate-300" />
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
                    className={`border-l-4 ${typeInfo.borderColor} bg-muted p-3 md:p-4 rounded-r-lg hover:bg-slate-100 transition-colors`}
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
                              <span className="text-sm font-medium text-slate-900 truncate">
                                {item.name}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500">
                              {formatDate(movement.createdAt instanceof Date ? movement.createdAt.toISOString() : String(movement.createdAt))}
                            </p>
                          </div>
                          <Badge variant="secondary" className="flex-shrink-0">
                            {movement.type === 'consumption' || movement.type === 'loan' ? '-' : '+'}
                            {movement.quantity}
                          </Badge>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          <div className="flex items-center gap-2 text-slate-600">
                            <User className="h-3 w-3" />
                            <span className="truncate">{user.name}</span>
                          </div>
                          
                          {movement.workOrder && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <FileText className="h-3 w-3" />
                              <span className="truncate">OS: {movement.workOrder}</span>
                            </div>
                          )}

                          {movement.borrowerUnitId && (
                            <div className="flex items-center gap-2 text-slate-600">
                              <Building2 className="h-3 w-3" />
                              <span className="truncate">
                                Para: {getUnitById(movement.borrowerUnitId)?.name || 'Unidade'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Notes */}
                        {movement.notes && (
                          <div className="mt-2 p-2 bg-card rounded border border-border">
                            <p className="text-xs text-slate-700">{movement.notes}</p>
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
