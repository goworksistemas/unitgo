import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Building2,
  Users,
  Package,
  Armchair,
  Clock,
  ArrowRightLeft,
  AlertTriangle,
  Truck,
  BarChart3,
  CheckCircle,
  XCircle,
  UserCog,
  Palette,
  ShieldCheck,
  ClipboardList,
  TrendingUp,
  Layers,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  count: { label: 'Quantidade', color: 'var(--primary)' },
};

const GRADIENT_H = 'devGradH';
const GRADIENT_V = 'devGradV';

function HorizontalBarChart({ data, dataKey, nameKey, height = 300 }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string; height?: number }) {
  return (
    <ChartContainer config={chartConfig} className={`w-full`} style={{ height }}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 40, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={GRADIENT_H} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis type="category" dataKey={nameKey} width={110} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickMargin={8} />
        <Bar dataKey={dataKey} fill={`url(#${GRADIENT_H})`} radius={[0, 8, 8, 0]}>
          <LabelList dataKey={dataKey} position="right" offset={8} className="fill-foreground text-xs font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

function VerticalBarChart({ data, dataKey, nameKey, height = 250, fontSize = 11 }: { data: Record<string, unknown>[]; dataKey: string; nameKey: string; height?: number; fontSize?: number }) {
  return (
    <ChartContainer config={chartConfig} className="w-full" style={{ height }}>
      <BarChart data={data} margin={{ top: 20, right: 20, left: 5, bottom: 5 }}>
        <defs>
          <linearGradient id={GRADIENT_V} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--secondary)" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey={nameKey} tickLine={false} axisLine={false} tick={{ fontSize }} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} tickMargin={8} />
        <Bar dataKey={dataKey} fill={`url(#${GRADIENT_V})`} radius={[6, 6, 0, 0]}>
          <LabelList dataKey={dataKey} position="top" className="fill-foreground text-xs font-medium" />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

export function SystemOverviewPanel() {
  const {
    units,
    users,
    items,
    categories,
    unitStocks,
    requests,
    loans,
    furnitureTransfers,
    furnitureRequestsToDesigner,
    furnitureRemovalRequests,
    deliveryBatches,
    getItemById,
    getUnitById,
  } = useApp();

  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  const operationalUnits = units.filter(u => u.id !== warehouseUnit?.id);

  const stats = useMemo(() => ({
    activeUnits: operationalUnits.filter(u => u.status === 'active').length,
    inactiveUnits: operationalUnits.filter(u => u.status === 'inactive').length,
    totalUsers: users.length,
    totalMaterials: items.filter(i => i.active && !i.isFurniture).length,
    totalFurniture: items.filter(i => i.active && i.isFurniture).length,
    inactiveItems: items.filter(i => !i.active).length,
    totalCategories: categories.length,
    totalRequests: requests.length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    approvedRequests: requests.filter(r => ['approved', 'processing'].includes(r.status)).length,
    completedRequests: requests.filter(r => r.status === 'completed').length,
    rejectedRequests: requests.filter(r => r.status === 'rejected').length,
    lowStockItems: unitStocks.filter(s => s.quantity <= s.minimumQuantity && s.quantity > 0).length,
    outOfStockItems: unitStocks.filter(s => s.quantity === 0).length,
    totalLoans: loans.length,
    activeLoans: loans.filter(l => l.status === 'active').length,
    overdueLoans: loans.filter(l => l.status === 'overdue').length,
    totalTransfers: furnitureTransfers.length,
    pendingTransfers: furnitureTransfers.filter(t => t.status === 'pending').length,
    totalDesignerRequests: furnitureRequestsToDesigner.length,
    pendingDesignerRequests: furnitureRequestsToDesigner.filter(r => r.status === 'pending_designer').length,
    totalRemovals: furnitureRemovalRequests.length,
    pendingRemovals: furnitureRemovalRequests.filter(r => r.status === 'pending').length,
    totalBatches: deliveryBatches.length,
    batchesInTransit: deliveryBatches.filter(b => b.status === 'in_transit').length,
    batchesCompleted: deliveryBatches.filter(b => ['completed', 'delivered'].includes(b.status)).length,
  }), [units, users, items, categories, unitStocks, requests, loans, furnitureTransfers, furnitureRequestsToDesigner, furnitureRemovalRequests, deliveryBatches]);

  const usersByRole = useMemo(() => {
    const roleLabels: Record<string, string> = {
      controller: 'Controlador', admin: 'Admin', warehouse: 'Almoxarifado',
      driver: 'Motorista', designer: 'Designer', requester: 'Solicitante',
      developer: 'Developer', executor: 'Executor',
    };
    const counts = new Map<string, number>();
    users.forEach(u => counts.set(u.role, (counts.get(u.role) || 0) + 1));
    return Array.from(counts.entries())
      .map(([role, count]) => ({ name: roleLabels[role] || role, count }))
      .sort((a, b) => b.count - a.count);
  }, [users]);

  const requestsByStatus = useMemo(() => {
    const statusLabels: Record<string, string> = {
      pending: 'Pendente', approved: 'Aprovado', processing: 'Processando',
      awaiting_pickup: 'Aguard. Coleta', out_for_delivery: 'Em Entrega',
      completed: 'Concluído', rejected: 'Rejeitado', cancelled: 'Cancelado',
      delivery_confirmed: 'Entregue', received_confirmed: 'Recebido',
    };
    const counts = new Map<string, number>();
    requests.forEach(r => counts.set(r.status, (counts.get(r.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: statusLabels[status] || status, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [requests]);

  const requestsByItem = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    requests.forEach(r => {
      const item = getItemById(r.itemId);
      if (item) {
        const cur = counts.get(item.id) || { name: item.name, count: 0 };
        counts.set(item.id, { name: item.name, count: cur.count + r.quantity });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [requests, getItemById]);

  const requestsByUrgency = useMemo(() => {
    const labels: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
    const counts = new Map<string, number>();
    requests.forEach(r => counts.set(r.urgency, (counts.get(r.urgency) || 0) + 1));
    return Array.from(counts.entries())
      .map(([urgency, count]) => ({ name: labels[urgency] || urgency, count }))
      .filter(d => d.count > 0);
  }, [requests]);

  const stockByUnit = useMemo(() => {
    const counts = new Map<string, { name: string; total: number }>();
    unitStocks.forEach(s => {
      const unit = getUnitById(s.unitId);
      if (unit && unit.id !== warehouseUnit?.id) {
        const cur = counts.get(s.unitId) || { name: unit.name.replace('Gowork ', '').replace('GoWork ', ''), total: 0 };
        cur.total += s.quantity;
        counts.set(s.unitId, cur);
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [unitStocks, getUnitById, warehouseUnit]);

  const loansByStatus = useMemo(() => {
    const labels: Record<string, string> = { active: 'Ativos', overdue: 'Atrasados', returned: 'Devolvidos', lost: 'Perdidos' };
    const counts = new Map<string, number>();
    loans.forEach(l => counts.set(l.status, (counts.get(l.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [loans]);

  const batchesByStatus = useMemo(() => {
    const labels: Record<string, string> = {
      pending: 'Pendente', in_transit: 'Em Trânsito', delivery_confirmed: 'Entregue',
      received_confirmed: 'Recebido', completed: 'Concluído', pending_confirmation: 'Aguard. Confirm.',
      confirmed_by_requester: 'Confirmado', delivered: 'Entregue',
    };
    const counts = new Map<string, number>();
    deliveryBatches.forEach(b => counts.set(b.status, (counts.get(b.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [deliveryBatches]);

  const requestsByUnit = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    requests.forEach(r => {
      const unit = getUnitById(r.requestingUnitId);
      if (unit) {
        const cur = counts.get(r.requestingUnitId) || { name: unit.name.replace('Gowork ', '').replace('GoWork ', ''), count: 0 };
        cur.count++;
        counts.set(r.requestingUnitId, cur);
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [requests, getUnitById]);

  const transfersByStatus = useMemo(() => {
    const labels: Record<string, string> = { pending: 'Pendente', approved: 'Aprovada', completed: 'Concluída', rejected: 'Rejeitada' };
    const counts = new Map<string, number>();
    furnitureTransfers.forEach(t => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [furnitureTransfers]);

  const itemsByCategory = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    items.filter(i => i.active).forEach(i => {
      const cat = categories.find(c => c.id === i.categoryId);
      const catName = cat?.name || 'Sem categoria';
      const cur = counts.get(i.categoryId) || { name: catName, count: 0 };
      cur.count++;
      counts.set(i.categoryId, cur);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [items, categories]);

  const removalsByStatus = useMemo(() => {
    const labels: Record<string, string> = {
      pending: 'Pendente', approved_storage: 'Aprov. Guarda', approved_disposal: 'Aprov. Descarte',
      awaiting_pickup: 'Aguard. Coleta', in_transit: 'Em Trânsito', completed: 'Concluída', rejected: 'Rejeitada',
    };
    const counts = new Map<string, number>();
    furnitureRemovalRequests.forEach(r => counts.set(r.status, (counts.get(r.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [furnitureRemovalRequests]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Dashboard do Sistema</h2>
        <p className="text-sm text-muted-foreground">Visão completa com gráficos de todas as áreas</p>
      </div>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Unidades Ativas" value={stats.activeUnits} sub={`${stats.inactiveUnits} inativas`} icon={<Building2 className="h-4 w-4 text-primary" />} />
        <KpiCard title="Usuários" value={stats.totalUsers} icon={<Users className="h-4 w-4 text-primary" />} />
        <KpiCard title="Materiais" value={stats.totalMaterials} sub={`${stats.inactiveItems} inativos`} icon={<Package className="h-4 w-4 text-primary" />} />
        <KpiCard title="Móveis" value={stats.totalFurniture} icon={<Armchair className="h-4 w-4 text-primary" />} />
        <KpiCard title="Categorias" value={stats.totalCategories} icon={<ClipboardList className="h-4 w-4 text-primary" />} />
        <KpiCard title="Solicitações" value={stats.totalRequests} sub={`${stats.pendingRequests} pendentes`} icon={<TrendingUp className="h-4 w-4 text-primary" />} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Aprovados" value={stats.approvedRequests} icon={<CheckCircle className="h-4 w-4 text-primary" />} />
        <KpiCard title="Concluídos" value={stats.completedRequests} icon={<CheckCircle className="h-4 w-4 text-secondary" />} />
        <KpiCard title="Rejeitados" value={stats.rejectedRequests} icon={<XCircle className="h-4 w-4 text-destructive" />} />
        <KpiCard title="Estoque Baixo" value={stats.lowStockItems} sub={`${stats.outOfStockItems} zerados`} icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />} />
        <KpiCard title="Empréstimos" value={stats.activeLoans} sub={`${stats.overdueLoans} atrasados`} icon={<Clock className="h-4 w-4 text-yellow-600" />} />
        <KpiCard title="Lotes Entrega" value={stats.totalBatches} sub={`${stats.batchesInTransit} em trânsito`} icon={<Truck className="h-4 w-4 text-primary" />} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Transferências" value={stats.totalTransfers} sub={`${stats.pendingTransfers} pendentes`} icon={<ArrowRightLeft className="h-4 w-4 text-secondary" />} />
        <KpiCard title="Solic. Designer" value={stats.totalDesignerRequests} sub={`${stats.pendingDesignerRequests} pendentes`} icon={<Palette className="h-4 w-4 text-secondary" />} />
        <KpiCard title="Remoções" value={stats.totalRemovals} sub={`${stats.pendingRemovals} pendentes`} icon={<AlertTriangle className="h-4 w-4 text-orange-600" />} />
        <KpiCard title="Entregas OK" value={stats.batchesCompleted} sub={`de ${stats.totalBatches} lotes`} icon={<CheckCircle className="h-4 w-4 text-secondary" />} />
      </div>

      {/* ═══ GRÁFICOS ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {usersByRole.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserCog className="h-5 w-5 text-primary" />Usuários por Perfil</CardTitle>
              <CardDescription>{stats.totalUsers} usuários cadastrados</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={usersByRole} dataKey="count" nameKey="name" height={250} />
            </CardContent>
          </Card>
        )}

        {requestsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Solicitações por Status</CardTitle>
              <CardDescription>{stats.totalRequests} solicitações no sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={requestsByStatus} dataKey="count" nameKey="name" height={250} fontSize={10} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requestsByItem.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Top 10 Itens Mais Solicitados</CardTitle>
              <CardDescription>Volume de pedidos por item</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={requestsByItem} dataKey="count" nameKey="name" />
            </CardContent>
          </Card>
        )}

        {requestsByUnit.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-primary" />Solicitações por Unidade</CardTitle>
              <CardDescription>Volume de pedidos por unidade operacional</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={requestsByUnit} dataKey="count" nameKey="name" />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {requestsByUrgency.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" />Urgência dos Pedidos</CardTitle>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={requestsByUrgency} dataKey="count" nameKey="name" height={220} fontSize={12} />
            </CardContent>
          </Card>
        )}

        {loansByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-primary" />Empréstimos por Status</CardTitle>
              <CardDescription>{stats.totalLoans} empréstimos registrados</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={loansByStatus} dataKey="count" nameKey="name" height={220} fontSize={12} />
            </CardContent>
          </Card>
        )}

        {itemsByCategory.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Package className="h-5 w-5 text-primary" />Itens por Categoria</CardTitle>
              <CardDescription>{stats.totalCategories} categorias</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={itemsByCategory} dataKey="count" nameKey="name" height={220} fontSize={10} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stockByUnit.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" />Estoque Total por Unidade</CardTitle>
              <CardDescription>Quantidade total de itens em cada unidade</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={stockByUnit} dataKey="total" nameKey="name" />
            </CardContent>
          </Card>
        )}

        {batchesByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Lotes de Entrega por Status</CardTitle>
              <CardDescription>{stats.totalBatches} lotes de entrega</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={batchesByStatus} dataKey="count" nameKey="name" height={300} fontSize={10} />
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {transfersByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><ArrowRightLeft className="h-5 w-5 text-primary" />Transferências de Móveis</CardTitle>
              <CardDescription>{stats.totalTransfers} transferências registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={transfersByStatus} dataKey="count" nameKey="name" fontSize={12} />
            </CardContent>
          </Card>
        )}

        {removalsByStatus.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Armchair className="h-5 w-5 text-primary" />Remoções de Móveis</CardTitle>
              <CardDescription>{stats.totalRemovals} remoções registradas</CardDescription>
            </CardHeader>
            <CardContent>
              <VerticalBarChart data={removalsByStatus} dataKey="count" nameKey="name" fontSize={10} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Resumo do Sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-primary" />Resumo do Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { icon: Building2, label: 'Unidades Operacionais', value: operationalUnits.length },
              { icon: Users, label: 'Total de Usuários', value: stats.totalUsers },
              { icon: Package, label: 'Itens Cadastrados', value: stats.totalMaterials + stats.totalFurniture },
              { icon: TrendingUp, label: 'Solicitações Totais', value: stats.totalRequests },
              { icon: Truck, label: 'Lotes de Entrega', value: stats.totalBatches },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex flex-col items-center text-center gap-2">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-primary to-secondary flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-lg">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({ title, value, sub, icon }: { title: string; value: number; sub?: string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
