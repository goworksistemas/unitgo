import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Download, 
  Filter,
  Search,
  Calendar,
  User,
  Package,
  FileText,
  Truck,
  Archive,
  Trash2,
  ArrowRightLeft,
  CheckCircle,
  XCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const COLORS = {
  primary: 'var(--primary)',
  secondary: 'var(--secondary)',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  gray: '#606060',
};

type LogEntry = {
  id: string;
  timestamp: Date;
  type: 'movement' | 'request' | 'transfer' | 'removal' | 'delivery' | 'approval' | 'rejection';
  action: string;
  user: string;
  userRole: string;
  item: string;
  quantity?: number;
  unit?: string;
  fromUnit?: string;
  toUnit?: string;
  status?: string;
  details: string;
};

export function AdminAnalytics() {
  const {
    users,
    movements,
    requests,
    furnitureTransfers,
    furnitureRemovalRequests,
    deliveryBatches,
    deliveryConfirmations,
    items,
    units,
    getUserById,
    getItemById,
    getUnitById,
  } = useApp();

  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrar dados por período
  const filterByDate = (date: Date) => {
    if (dateRange === 'all') return true;
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    
    switch (dateRange) {
      case '7d': return diffDays <= 7;
      case '30d': return diffDays <= 30;
      case '90d': return diffDays <= 90;
      default: return true;
    }
  };

  // Gerar log master de todas as movimentações
  const masterLog = useMemo(() => {
    const logs: LogEntry[] = [];

    // Função para traduzir status
    const translateStatus = (status: string): string => {
      const statusMap: Record<string, string> = {
        'pending': 'Pendente',
        'approved': 'Aprovado',
        'rejected': 'Rejeitado',
        'processing': 'Processando',
        'awaiting_pickup': 'Aguardando Coleta',
        'in_transit': 'Em Trânsito',
        'delivered': 'Entregue',
        'completed': 'Concluído',
        'cancelled': 'Cancelado',
        'pending_designer': 'Aguardando Designer',
        'approved_designer': 'Aprovado pelo Designer',
        'approved_storage': 'Aprovado para Armazenagem',
        'approved_disposal': 'Aprovado para Descarte',
        'rejected_designer': 'Rejeitado pelo Designer',
      };
      return statusMap[status] || status;
    };

    // Movimentações de estoque
    movements.forEach(m => {
      const user = getUserById(m.userId);
      const item = getItemById(m.itemId);
      const unit = getUnitById(m.unitId);
      
      logs.push({
        id: `mov-${m.id}`,
        timestamp: new Date(m.movementDate ?? m.timestamp),
        type: 'movement',
        action: (m.type === 'entry' || m.type === 'in') ? 'Entrada de Estoque' : 'Saída de Estoque',
        user: user?.name || 'Desconhecido',
        userRole: user?.role || '',
        item: item?.name || 'Item desconhecido',
        quantity: Math.abs(m.quantity),
        unit: unit?.name || '',
        status: (m.type === 'entry' || m.type === 'in') ? 'Entrada' : 'Saída',
        details: `${(m.type === 'entry' || m.type === 'in') ? '+' : '-'}${Math.abs(m.quantity)} ${item?.name} - ${m.reason ?? m.notes ?? 'Sem motivo especificado'}`,
      });
    });

    // Solicitações
    requests.forEach(r => {
      const requester = getUserById(r.requestedByUserId);
      const approver = r.approvedByUserId ? getUserById(r.approvedByUserId) : null;
      const item = getItemById(r.itemId);
      const unit = getUnitById(r.requestingUnitId);

      // Log de criação
      logs.push({
        id: `req-create-${r.id}`,
        timestamp: new Date(r.createdAt),
        type: 'request',
        action: 'Solicitação Criada',
        user: requester?.name || 'Desconhecido',
        userRole: requester?.role || '',
        item: item?.name || 'Item desconhecido',
        quantity: r.quantity,
        unit: unit?.name || '',
        status: translateStatus(r.status),
        details: `Solicitação de ${r.quantity} ${item?.name} para ${unit?.name}`,
      });

      // Log de aprovação
      if (r.approvedAt && approver) {
        logs.push({
          id: `req-approve-${r.id}`,
          timestamp: new Date(r.approvedAt),
          type: 'approval',
          action: 'Solicitação Aprovada',
          user: approver.name,
          userRole: approver.role,
          item: item?.name || 'Item desconhecido',
          quantity: r.quantity,
          unit: unit?.name || '',
          status: translateStatus(r.status),
          details: `${approver.name} aprovou solicitação de ${r.quantity} ${item?.name}`,
        });
      }

      // Log de rejeição
      if (r.status === 'rejected' && r.approvedAt && approver) {
        logs.push({
          id: `req-reject-${r.id}`,
          timestamp: new Date(r.approvedAt),
          type: 'rejection',
          action: 'Solicitação Rejeitada',
          user: approver.name,
          userRole: approver.role,
          item: item?.name || 'Item desconhecido',
          quantity: r.quantity,
          unit: unit?.name || '',
          status: translateStatus(r.status),
          details: `${approver.name} rejeitou solicitação de ${r.quantity} ${item?.name}${(r.rejectionReason ?? r.rejectedReason) ? ` - Motivo: ${r.rejectionReason ?? r.rejectedReason}` : ''}`,
        });
      }

      // Log de entrega
      if (r.deliveredAt) {
        logs.push({
          id: `req-deliver-${r.id}`,
          timestamp: new Date(r.deliveredAt),
          type: 'delivery',
          action: 'Solicitação Entregue',
          user: 'Sistema',
          userRole: 'system',
          item: item?.name || 'Item desconhecido',
          quantity: r.quantity,
          unit: unit?.name || '',
          status: translateStatus(r.status),
          details: `Entrega concluída: ${r.quantity} ${item?.name} para ${unit?.name}`,
        });
      }
    });

    // Transferências de móveis
    furnitureTransfers.forEach(t => {
      const requester = getUserById(t.requestedByUserId);
      const approver = t.approvedByUserId ? getUserById(t.approvedByUserId) : null;
      const item = getItemById(t.itemId);
      const fromUnit = getUnitById(t.fromUnitId);
      const toUnit = getUnitById(t.toUnitId);

      // Log de criação
      logs.push({
        id: `transfer-create-${t.id}`,
        timestamp: new Date(t.createdAt),
        type: 'transfer',
        action: 'Transferência Solicitada',
        user: requester?.name || 'Desconhecido',
        userRole: requester?.role || '',
        item: item?.name || 'Item desconhecido',
        quantity: t.quantity ?? 1,
        fromUnit: fromUnit?.name || '',
        toUnit: toUnit?.name || '',
        status: translateStatus(t.status),
        details: `Transferência de ${t.quantity} ${item?.name} de ${fromUnit?.name} para ${toUnit?.name}`,
      });

      // Log de aprovação
      if (t.approvedAt && approver) {
        logs.push({
          id: `transfer-approve-${t.id}`,
          timestamp: new Date(t.approvedAt),
          type: 'approval',
          action: 'Transferência Aprovada',
          user: approver.name,
          userRole: approver.role,
          item: item?.name || 'Item desconhecido',
          quantity: t.quantity ?? 1,
          fromUnit: fromUnit?.name || '',
          toUnit: toUnit?.name || '',
          status: translateStatus(t.status),
          details: `${approver.name} aprovou transferência de ${t.quantity} ${item?.name}`,
        });
      }

      // Log de conclusão
      if (t.completedAt) {
        logs.push({
          id: `transfer-complete-${t.id}`,
          timestamp: new Date(t.completedAt),
          type: 'transfer',
          action: 'Transferência Concluída',
          user: 'Sistema',
          userRole: 'system',
          item: item?.name || 'Item desconhecido',
          quantity: t.quantity ?? 1,
          fromUnit: fromUnit?.name || '',
          toUnit: toUnit?.name || '',
          status: translateStatus(t.status),
          details: `Transferência concluída: ${t.quantity} ${item?.name} chegou em ${toUnit?.name}`,
        });
      }
    });

    // Retiradas/Remoções
    furnitureRemovalRequests.forEach(r => {
      const requester = getUserById(r.requestedByUserId);
      const reviewer = r.reviewedByUserId ? getUserById(r.reviewedByUserId) : null;
      const receiver = r.receivedByUserId ? getUserById(r.receivedByUserId) : null;
      const item = getItemById(r.itemId);
      const unit = getUnitById(r.unitId);

      // Log de criação
      logs.push({
        id: `removal-create-${r.id}`,
        timestamp: new Date(r.createdAt),
        type: 'removal',
        action: 'Retirada Solicitada',
        user: requester?.name || 'Desconhecido',
        userRole: requester?.role || '',
        item: item?.name || 'Item desconhecido',
        quantity: r.quantity,
        unit: unit?.name || '',
        status: translateStatus(r.status),
        details: `Solicitação de retirada de ${r.quantity} ${item?.name} de ${unit?.name}${r.reason ? ` - ${r.reason}` : ''}`,
      });

      // Log de aprovação pelo designer
      if (r.reviewedAt && reviewer) {
        const isStorage = r.status === 'approved_storage';
        const isDisposal = r.status === 'approved_disposal';
        logs.push({
          id: `removal-review-${r.id}`,
          timestamp: new Date(r.reviewedAt),
          type: 'approval',
          action: isStorage ? 'Aprovado para Armazenagem' : isDisposal ? 'Aprovado para Descarte' : 'Retirada Avaliada',
          user: reviewer.name,
          userRole: reviewer.role,
          item: item?.name || 'Item desconhecido',
          quantity: r.quantity,
          unit: unit?.name || '',
          status: translateStatus(r.status),
          details: `${reviewer.name} ${isStorage ? 'aprovou armazenagem' : isDisposal ? 'aprovou descarte' : 'avaliou retirada'} de ${r.quantity} ${item?.name}${r.disposalJustification ? ` - ${r.disposalJustification}` : ''}`,
        });
      }

      // Log de recebimento pelo almoxarifado
      if (r.receivedAt && receiver) {
        logs.push({
          id: `removal-receive-${r.id}`,
          timestamp: new Date(r.receivedAt),
          type: 'delivery',
          action: 'Retirada Recebida',
          user: receiver.name,
          userRole: receiver.role,
          item: item?.name || 'Item desconhecido',
          quantity: r.quantity,
          unit: unit?.name || '',
          status: translateStatus(r.status),
          details: `${receiver.name} recebeu ${r.quantity} ${item?.name} no almoxarifado`,
        });
      }
    });

    // Entregas em lote
    deliveryBatches.forEach(batch => {
      const driver = getUserById(batch.driverId ?? batch.driverUserId);
      
      logs.push({
        id: `batch-${batch.id}`,
        timestamp: new Date(batch.createdAt),
        type: 'delivery',
        action: (batch.status === 'delivered' || batch.status === 'completed') ? 'Lote Entregue' : 'Lote Criado',
        user: driver?.name || 'Desconhecido',
        userRole: driver?.role || '',
        item: `Lote #${batch.id.slice(0, 8)}`,
        quantity: batch.requestIds.length,
        status: translateStatus(batch.status),
        details: `${driver?.name} ${(batch.status === 'delivered' || batch.status === 'completed') ? 'entregou' : 'criou'} lote com ${batch.requestIds.length} solicitações`,
      });
    });

    // Ordenar por timestamp (mais recente primeiro)
    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [movements, requests, furnitureTransfers, furnitureRemovalRequests, deliveryBatches, getUserById, getItemById, getUnitById]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return masterLog.filter(log => {
      // Filtro de data
      if (!filterByDate(log.timestamp)) return false;

      // Filtro de tipo
      if (typeFilter !== 'all' && log.type !== typeFilter) return false;

      // Filtro de busca
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.user.toLowerCase().includes(query) ||
          log.item.toLowerCase().includes(query) ||
          log.details.toLowerCase().includes(query) ||
          log.action.toLowerCase().includes(query) ||
          (log.unit && log.unit.toLowerCase().includes(query))
        );
      }

      return true;
    });
  }, [masterLog, dateRange, typeFilter, searchQuery]);

  // Estatísticas gerais
  const stats = useMemo(() => {
    return {
      total: filteredLogs.length,
      movements: filteredLogs.filter(l => l.type === 'movement').length,
      requests: filteredLogs.filter(l => l.type === 'request').length,
      transfers: filteredLogs.filter(l => l.type === 'transfer').length,
      removals: filteredLogs.filter(l => l.type === 'removal').length,
      deliveries: filteredLogs.filter(l => l.type === 'delivery').length,
      approvals: filteredLogs.filter(l => l.type === 'approval').length,
      rejections: filteredLogs.filter(l => l.type === 'rejection').length,
    };
  }, [filteredLogs]);

  // Dados para gráfico de tipos de ação
  const actionTypeData = useMemo(() => {
    return [
      { name: 'Movimentações', value: stats.movements, color: COLORS.primary },
      { name: 'Solicitações', value: stats.requests, color: COLORS.secondary },
      { name: 'Transferências', value: stats.transfers, color: COLORS.warning },
      { name: 'Retiradas', value: stats.removals, color: COLORS.danger },
      { name: 'Entregas', value: stats.deliveries, color: '#8b5cf6' },
      { name: 'Aprovações', value: stats.approvals, color: '#10b981' },
      { name: 'Rejeições', value: stats.rejections, color: '#ef4444' },
    ].filter(item => item.value > 0);
  }, [stats]);

  // Gerar relatório CSV
  const generateCSVReport = () => {
    const headers = [
      'Data/Hora',
      'Tipo',
      'Ação',
      'Usuário',
      'Perfil',
      'Item',
      'Quantidade',
      'Unidade',
      'Origem',
      'Destino',
      'Status',
      'Detalhes'
    ];

    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString('pt-BR'),
      log.type,
      log.action,
      log.user,
      log.userRole,
      log.item,
      log.quantity || '',
      log.unit || '',
      log.fromUnit || '',
      log.toUnit || '',
      log.status || '',
      log.details,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `log-master-gowork-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Relatório gerado com sucesso!', {
      description: `${filteredLogs.length} registros exportados para CSV.`,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movement': return <Package className="h-4 w-4" />;
      case 'request': return <FileText className="h-4 w-4" />;
      case 'transfer': return <ArrowRightLeft className="h-4 w-4" />;
      case 'removal': return <Trash2 className="h-4 w-4" />;
      case 'delivery': return <Truck className="h-4 w-4" />;
      case 'approval': return <CheckCircle className="h-4 w-4" />;
      case 'rejection': return <XCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    const typeLabels: Record<string, string> = {
      movement: 'Movimentação',
      request: 'Solicitação',
      transfer: 'Transferência',
      removal: 'Retirada',
      delivery: 'Entrega',
      approval: 'Aprovação',
      rejection: 'Rejeição',
    };
    return typeLabels[type] || type;
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'movement': return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'request': return 'bg-cyan-100 text-cyan-700 border-cyan-300';
      case 'transfer': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'removal': return 'bg-red-100 text-red-700 border-red-300';
      case 'delivery': return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'approval': return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'rejection': return 'bg-rose-100 text-rose-700 border-rose-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getRoleLabel = (role: string) => {
    const roles: Record<string, string> = {
      admin: 'Admin',
      controller: 'Controlador',
      warehouse: 'Almoxarifado',
      designer: 'Designer',
      requester: 'Solicitante',
      developer: 'Developer',
      system: 'Sistema',
    };
    return roles[role] || role;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2>Log Master de Movimentações</h2>
          <p className="text-muted-foreground">Histórico completo de todas as ações no sistema</p>
        </div>
        
        <Button onClick={generateCSVReport} className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório ({filteredLogs.length})
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro de Período */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={dateRange === '7d' ? 'default' : 'outline'}
                  onClick={() => setDateRange('7d')}
                  className="flex-1"
                >
                  7 dias
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === '30d' ? 'default' : 'outline'}
                  onClick={() => setDateRange('30d')}
                  className="flex-1"
                >
                  30 dias
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === '90d' ? 'default' : 'outline'}
                  onClick={() => setDateRange('90d')}
                  className="flex-1"
                >
                  90 dias
                </Button>
                <Button
                  size="sm"
                  variant={dateRange === 'all' ? 'default' : 'outline'}
                  onClick={() => setDateRange('all')}
                  className="flex-1"
                >
                  Tudo
                </Button>
              </div>
            </div>

            {/* Filtro de Tipo */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Ação</label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="movement">Movimentações</option>
                <option value="request">Solicitações</option>
                <option value="transfer">Transferências</option>
                <option value="removal">Retiradas</option>
                <option value="delivery">Entregas</option>
                <option value="approval">Aprovações</option>
                <option value="rejection">Rejeições</option>
              </select>
            </div>

            {/* Busca */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Usuário, item, unidade..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Movimentações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.movements}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Solicitações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{stats.requests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Transferências</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.transfers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Aprovações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{stats.approvals}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Distribuição */}
      {actionTypeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Ações</CardTitle>
            <CardDescription>Visualização por tipo de ação</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={actionTypeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {actionTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Movimentações</CardTitle>
          <CardDescription>
            Mostrando {filteredLogs.length} de {masterLog.length} registros
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
            <Table className="min-w-[1400px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[160px]">Data/Hora</TableHead>
                  <TableHead className="w-[120px]">Tipo</TableHead>
                  <TableHead className="w-[180px]">Ação</TableHead>
                  <TableHead className="w-[150px]">Usuário</TableHead>
                  <TableHead className="w-[100px]">Perfil</TableHead>
                  <TableHead className="w-[180px]">Item</TableHead>
                  <TableHead className="w-[80px] text-center">Qtd</TableHead>
                  <TableHead className="w-[140px]">Local</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum registro encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {new Date(log.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getTypeBadgeColor(log.type)}>
                          <span className="flex items-center gap-1">
                            {getTypeIcon(log.type)}
                            {getTypeLabel(log.type)}
                          </span>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{log.action}</TableCell>
                      <TableCell>{log.user}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {getRoleLabel(log.userRole)}
                        </Badge>
                      </TableCell>
                      <TableCell>{log.item}</TableCell>
                      <TableCell className="text-center">
                        {log.quantity ? (
                          <Badge variant="outline">{log.quantity}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.fromUnit && log.toUnit ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.fromUnit} → {log.toUnit}
                          </div>
                        ) : log.unit ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {log.unit}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}