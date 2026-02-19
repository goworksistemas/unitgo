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
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

const chartConfig: ChartConfig = {
  count: { label: 'Pedidos', color: 'var(--primary)' },
};

export function SystemOverviewPanel() {
  const {
    units,
    users,
    items,
    unitStocks,
    requests,
    furnitureTransfers,
    furnitureRequestsToDesigner,
    furnitureRemovalRequests,
    deliveryBatches,
    getItemById,
  } = useApp();

  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  const operationalUnits = units.filter(u => u.id !== warehouseUnit?.id);

  const stats = useMemo(() => ({
    activeUnits: operationalUnits.filter(u => u.status === 'active').length,
    totalUnits: operationalUnits.length,
    totalUsers: users.length,
    totalItems: items.filter(i => i.active && !i.isFurniture).length,
    totalFurniture: items.filter(i => i.active && i.isFurniture).length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    approvedRequests: requests.filter(r => ['approved', 'processing', 'awaiting_pickup'].includes(r.status)).length,
    lowStockItems: unitStocks.filter(s => s.quantity <= s.minimumQuantity).length,
    pendingTransfers: furnitureTransfers.filter(t => t.status === 'pending').length,
    approvedTransfers: furnitureTransfers.filter(t => ['approved', 'in_transit'].includes(t.status)).length,
    pendingDesignerRequests: furnitureRequestsToDesigner.filter(r => r.status === 'pending_designer').length,
    pendingRemovals: furnitureRemovalRequests.filter(r => r.status === 'pending').length,
    batchesInTransit: deliveryBatches.filter(b => b.status === 'in_transit').length,
    totalRequests: requests.length,
  }), [units, users, items, unitStocks, requests, furnitureTransfers, furnitureRequestsToDesigner, furnitureRemovalRequests, deliveryBatches]);

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

  const chartColors = ['var(--primary)', 'var(--secondary)', 'var(--warning)', 'var(--destructive)', 'var(--accent-2)'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-1">Dashboard do Sistema</h2>
        <p className="text-sm text-muted-foreground">Visão geral completa de unidades, materiais e móveis</p>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUnits}</div>
            <p className="text-xs text-muted-foreground">{stats.totalUnits} operacionais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Materiais</CardTitle>
            <Package className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Móveis</CardTitle>
            <Armchair className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFurniture}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground">{stats.approvedRequests} aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
          </CardContent>
        </Card>
      </div>

      {/* Móveis e fluxos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Transferências</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
            <p className="text-xs text-muted-foreground">{stats.approvedTransfers} em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Solicitações Designer</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingDesignerRequests}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Remoções Pendentes</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRemovals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-medium">Lotes em Trânsito</CardTitle>
            <Truck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.batchesInTransit}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de pedidos por item */}
      {requestsByItem.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Volume de Pedidos por Item
            </CardTitle>
            <CardDescription>Top 10 itens mais solicitados no sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <BarChart data={requestsByItem} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  <LabelList dataKey="count" position="right" offset={8} className="fill-foreground text-xs font-medium" />
                  {requestsByItem.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
