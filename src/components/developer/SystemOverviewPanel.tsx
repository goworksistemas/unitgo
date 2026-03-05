import { useMemo, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
  CalendarIcon,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  RotateCcw,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { format, subDays, startOfDay, endOfDay, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';

type DatePreset = 'today' | '7d' | '30d' | '90d' | 'all' | 'custom';

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
            <stop offset="0%" stopColor="var(--secondary)" />
            <stop offset="100%" stopColor="var(--primary)" />
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

function getDateRange(preset: DatePreset, customRange?: DateRange): { from: Date; to: Date } | null {
  if (preset === 'all') return null;
  const now = new Date();
  const to = endOfDay(now);
  switch (preset) {
    case 'today': return { from: startOfDay(now), to };
    case '7d': return { from: startOfDay(subDays(now, 7)), to };
    case '30d': return { from: startOfDay(subDays(now, 30)), to };
    case '90d': return { from: startOfDay(subDays(now, 90)), to };
    case 'custom':
      if (customRange?.from) return { from: startOfDay(customRange.from), to: customRange.to ? endOfDay(customRange.to) : endOfDay(customRange.from) };
      return null;
    default: return null;
  }
}

function getPreviousPeriod(range: { from: Date; to: Date }): { from: Date; to: Date } {
  const days = differenceInDays(range.to, range.from) + 1;
  return {
    from: startOfDay(subDays(range.from, days)),
    to: endOfDay(subDays(range.from, 1)),
  };
}

function isInRange(date: Date | string | undefined, range: { from: Date; to: Date } | null): boolean {
  if (!range || !date) return true;
  const d = new Date(date);
  return d >= range.from && d <= range.to;
}

function calcVariation(current: number, previous: number): { pct: number; direction: 'up' | 'down' | 'same' } {
  if (previous === 0 && current === 0) return { pct: 0, direction: 'same' };
  if (previous === 0) return { pct: 100, direction: 'up' };
  const pct = Math.round(((current - previous) / previous) * 100);
  return { pct: Math.abs(pct), direction: pct > 0 ? 'up' : pct < 0 ? 'down' : 'same' };
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

  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [compareCustomRange, setCompareCustomRange] = useState<DateRange | undefined>();
  const [compareMode, setCompareMode] = useState<'auto' | 'custom'>('auto');

  const activeRange = useMemo(() => getDateRange(datePreset, customRange), [datePreset, customRange]);
  const previousRange = useMemo(() => {
    if (!activeRange) return null;
    if (compareMode === 'custom' && compareCustomRange?.from) {
      return {
        from: startOfDay(compareCustomRange.from),
        to: compareCustomRange.to ? endOfDay(compareCustomRange.to) : endOfDay(compareCustomRange.from),
      };
    }
    return getPreviousPeriod(activeRange);
  }, [activeRange, compareMode, compareCustomRange]);

  const handlePreset = useCallback((preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') setCustomRange(undefined);
  }, []);

  const handleCustomRange = useCallback((range: DateRange | undefined) => {
    setCustomRange(range);
    setDatePreset('custom');
  }, []);

  const handleReset = useCallback(() => {
    setDatePreset('all');
    setCustomRange(undefined);
    setCompareEnabled(false);
    setCompareMode('auto');
    setCompareCustomRange(undefined);
  }, []);

  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  const operationalUnits = units.filter(u => u.id !== warehouseUnit?.id);

  const filteredRequests = useMemo(() => requests.filter(r => isInRange(r.createdAt, activeRange)), [requests, activeRange]);
  const filteredLoans = useMemo(() => loans.filter(l => isInRange(l.withdrawalDate, activeRange)), [loans, activeRange]);
  const filteredTransfers = useMemo(() => furnitureTransfers.filter(t => isInRange(t.createdAt, activeRange)), [furnitureTransfers, activeRange]);
  const filteredDesignerReqs = useMemo(() => furnitureRequestsToDesigner.filter(r => isInRange(r.createdAt, activeRange)), [furnitureRequestsToDesigner, activeRange]);
  const filteredRemovals = useMemo(() => furnitureRemovalRequests.filter(r => isInRange(r.createdAt, activeRange)), [furnitureRemovalRequests, activeRange]);
  const filteredBatches = useMemo(() => deliveryBatches.filter(b => isInRange(b.createdAt, activeRange)), [deliveryBatches, activeRange]);

  const prevRequests = useMemo(() => compareEnabled ? requests.filter(r => isInRange(r.createdAt, previousRange)) : [], [requests, previousRange, compareEnabled]);
  const prevLoans = useMemo(() => compareEnabled ? loans.filter(l => isInRange(l.withdrawalDate, previousRange)) : [], [loans, previousRange, compareEnabled]);
  const prevTransfers = useMemo(() => compareEnabled ? furnitureTransfers.filter(t => isInRange(t.createdAt, previousRange)) : [], [furnitureTransfers, previousRange, compareEnabled]);
  const prevDesignerReqs = useMemo(() => compareEnabled ? furnitureRequestsToDesigner.filter(r => isInRange(r.createdAt, previousRange)) : [], [furnitureRequestsToDesigner, previousRange, compareEnabled]);
  const prevRemovals = useMemo(() => compareEnabled ? furnitureRemovalRequests.filter(r => isInRange(r.createdAt, previousRange)) : [], [furnitureRemovalRequests, previousRange, compareEnabled]);
  const prevBatches = useMemo(() => compareEnabled ? deliveryBatches.filter(b => isInRange(b.createdAt, previousRange)) : [], [deliveryBatches, previousRange, compareEnabled]);

  const stats = useMemo(() => ({
    activeUnits: operationalUnits.filter(u => u.status === 'active').length,
    inactiveUnits: operationalUnits.filter(u => u.status === 'inactive').length,
    totalUsers: users.length,
    totalMaterials: items.filter(i => i.active && !i.isFurniture).length,
    totalFurniture: items.filter(i => i.active && i.isFurniture).length,
    inactiveItems: items.filter(i => !i.active).length,
    totalCategories: categories.length,
    totalRequests: filteredRequests.length,
    pendingRequests: filteredRequests.filter(r => r.status === 'pending').length,
    approvedRequests: filteredRequests.filter(r => ['approved', 'processing'].includes(r.status)).length,
    completedRequests: filteredRequests.filter(r => r.status === 'completed').length,
    rejectedRequests: filteredRequests.filter(r => r.status === 'rejected').length,
    lowStockItems: unitStocks.filter(s => s.quantity <= s.minimumQuantity && s.quantity > 0).length,
    outOfStockItems: unitStocks.filter(s => s.quantity === 0).length,
    totalLoans: filteredLoans.length,
    activeLoans: filteredLoans.filter(l => l.status === 'active').length,
    overdueLoans: filteredLoans.filter(l => l.status === 'overdue').length,
    totalTransfers: filteredTransfers.length,
    pendingTransfers: filteredTransfers.filter(t => t.status === 'pending').length,
    totalDesignerRequests: filteredDesignerReqs.length,
    pendingDesignerRequests: filteredDesignerReqs.filter(r => r.status === 'pending_designer').length,
    totalRemovals: filteredRemovals.length,
    pendingRemovals: filteredRemovals.filter(r => r.status === 'pending').length,
    totalBatches: filteredBatches.length,
    batchesInTransit: filteredBatches.filter(b => b.status === 'in_transit').length,
    batchesCompleted: filteredBatches.filter(b => ['completed', 'delivered'].includes(b.status)).length,
  }), [units, users, items, categories, unitStocks, filteredRequests, filteredLoans, filteredTransfers, filteredDesignerReqs, filteredRemovals, filteredBatches, operationalUnits]);

  const prevStats = useMemo(() => {
    if (!compareEnabled) return null;
    return {
      totalRequests: prevRequests.length,
      pendingRequests: prevRequests.filter(r => r.status === 'pending').length,
      approvedRequests: prevRequests.filter(r => ['approved', 'processing'].includes(r.status)).length,
      completedRequests: prevRequests.filter(r => r.status === 'completed').length,
      rejectedRequests: prevRequests.filter(r => r.status === 'rejected').length,
      totalLoans: prevLoans.length,
      activeLoans: prevLoans.filter(l => l.status === 'active').length,
      overdueLoans: prevLoans.filter(l => l.status === 'overdue').length,
      totalTransfers: prevTransfers.length,
      pendingTransfers: prevTransfers.filter(t => t.status === 'pending').length,
      totalDesignerRequests: prevDesignerReqs.length,
      pendingDesignerRequests: prevDesignerReqs.filter(r => r.status === 'pending_designer').length,
      totalRemovals: prevRemovals.length,
      pendingRemovals: prevRemovals.filter(r => r.status === 'pending').length,
      totalBatches: prevBatches.length,
      batchesInTransit: prevBatches.filter(b => b.status === 'in_transit').length,
      batchesCompleted: prevBatches.filter(b => ['completed', 'delivered'].includes(b.status)).length,
    };
  }, [compareEnabled, prevRequests, prevLoans, prevTransfers, prevDesignerReqs, prevRemovals, prevBatches]);

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
    filteredRequests.forEach(r => counts.set(r.status, (counts.get(r.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: statusLabels[status] || status, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredRequests]);

  const requestsByItem = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    filteredRequests.forEach(r => {
      const item = getItemById(r.itemId);
      if (item) {
        const cur = counts.get(item.id) || { name: item.name, count: 0 };
        counts.set(item.id, { name: item.name, count: cur.count + r.quantity });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredRequests, getItemById]);

  const requestsByUrgency = useMemo(() => {
    const labels: Record<string, string> = { low: 'Baixa', medium: 'Média', high: 'Alta' };
    const counts = new Map<string, number>();
    filteredRequests.forEach(r => counts.set(r.urgency, (counts.get(r.urgency) || 0) + 1));
    return Array.from(counts.entries())
      .map(([urgency, count]) => ({ name: labels[urgency] || urgency, count }))
      .filter(d => d.count > 0);
  }, [filteredRequests]);

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
    filteredLoans.forEach(l => counts.set(l.status, (counts.get(l.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [filteredLoans]);

  const batchesByStatus = useMemo(() => {
    const labels: Record<string, string> = {
      pending: 'Pendente', in_transit: 'Em Trânsito', delivery_confirmed: 'Entregue',
      received_confirmed: 'Recebido', completed: 'Concluído', pending_confirmation: 'Aguard. Confirm.',
      confirmed_by_requester: 'Confirmado', delivered: 'Entregue',
    };
    const counts = new Map<string, number>();
    filteredBatches.forEach(b => counts.set(b.status, (counts.get(b.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredBatches]);

  const requestsByUnit = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    filteredRequests.forEach(r => {
      const unit = getUnitById(r.requestingUnitId);
      if (unit) {
        const cur = counts.get(r.requestingUnitId) || { name: unit.name.replace('Gowork ', '').replace('GoWork ', ''), count: 0 };
        cur.count++;
        counts.set(r.requestingUnitId, cur);
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredRequests, getUnitById]);

  const transfersByStatus = useMemo(() => {
    const labels: Record<string, string> = { pending: 'Pendente', approved: 'Aprovada', completed: 'Concluída', rejected: 'Rejeitada' };
    const counts = new Map<string, number>();
    filteredTransfers.forEach(t => counts.set(t.status, (counts.get(t.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [filteredTransfers]);

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
    filteredRemovals.forEach(r => counts.set(r.status, (counts.get(r.status) || 0) + 1));
    return Array.from(counts.entries())
      .map(([status, count]) => ({ name: labels[status] || status, count }))
      .filter(d => d.count > 0);
  }, [filteredRemovals]);

  const isFiltered = datePreset !== 'all';
  const presetLabel = datePreset === 'today' ? 'Hoje' : datePreset === '7d' ? '7 dias' : datePreset === '30d' ? '30 dias' : datePreset === '90d' ? '90 dias' : datePreset === 'custom' ? 'Personalizado' : 'Tudo';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-semibold mb-1">Dashboard do Sistema</h2>
          <p className="text-sm text-muted-foreground">Visão completa com gráficos de todas as áreas</p>
        </div>
        {isFiltered && (
          <Badge variant="secondary" className="text-xs">
            {presetLabel}
            {datePreset === 'custom' && customRange?.from && (
              <span className="ml-1">
                ({format(customRange.from, 'dd/MM/yy', { locale: ptBR })}
                {customRange.to && ` - ${format(customRange.to, 'dd/MM/yy', { locale: ptBR })}`})
              </span>
            )}
            {compareEnabled && ' vs anterior'}
          </Badge>
        )}
      </div>

      {/* ═══ FILTROS DE DATA ═══ */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4 text-primary" />
            Filtros de Data
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {(['today', '7d', '30d', '90d', 'all'] as DatePreset[]).map(preset => {
                const labels: Record<string, string> = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias', '90d': '90 dias', all: 'Tudo' };
                return (
                  <Button
                    key={preset}
                    size="sm"
                    variant={datePreset === preset ? 'default' : 'outline'}
                    onClick={() => handlePreset(preset)}
                  >
                    {labels[preset]}
                  </Button>
                );
              })}

              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant={datePreset === 'custom' ? 'default' : 'outline'} className="gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    {datePreset === 'custom' && customRange?.from
                      ? `${format(customRange.from, 'dd/MM/yy', { locale: ptBR })}${customRange.to ? ` - ${format(customRange.to, 'dd/MM/yy', { locale: ptBR })}` : ''}`
                      : 'Período Personalizado'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={customRange}
                    onSelect={handleCustomRange}
                    numberOfMonths={2}
                    locale={ptBR}
                    disabled={{ after: new Date() }}
                  />
                </PopoverContent>
              </Popover>

              {isFiltered && (
                <Button size="sm" variant="ghost" onClick={handleReset} className="gap-1 text-muted-foreground">
                  <RotateCcw className="h-3 w-3" />
                  Limpar
                </Button>
              )}
            </div>

            {isFiltered && (
              <div className="flex flex-col gap-3 pt-3 border-t">
                <div className="flex items-center gap-2">
                  <Switch checked={compareEnabled} onCheckedChange={(v) => { setCompareEnabled(v); if (!v) { setCompareMode('auto'); setCompareCustomRange(undefined); } }} id="compare-toggle" />
                  <label htmlFor="compare-toggle" className="text-sm cursor-pointer select-none">
                    Comparar com outro período
                  </label>
                </div>

                {compareEnabled && (
                  <div className="flex flex-wrap items-center gap-2 pl-1">
                    <Button
                      size="sm"
                      variant={compareMode === 'auto' ? 'default' : 'outline'}
                      onClick={() => { setCompareMode('auto'); setCompareCustomRange(undefined); }}
                    >
                      Período anterior
                    </Button>

                    <Popover>
                      <PopoverTrigger asChild>
                        <Button size="sm" variant={compareMode === 'custom' ? 'default' : 'outline'} className="gap-2">
                          <CalendarIcon className="h-4 w-4" />
                          {compareMode === 'custom' && compareCustomRange?.from
                            ? `${format(compareCustomRange.from, 'dd/MM/yy', { locale: ptBR })}${compareCustomRange.to ? ` - ${format(compareCustomRange.to, 'dd/MM/yy', { locale: ptBR })}` : ''}`
                            : 'Escolher data'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="range"
                          selected={compareCustomRange}
                          onSelect={(range) => { setCompareCustomRange(range); setCompareMode('custom'); }}
                          numberOfMonths={2}
                          locale={ptBR}
                          disabled={{ after: new Date() }}
                        />
                      </PopoverContent>
                    </Popover>

                    {previousRange && (
                      <span className="text-xs text-muted-foreground">
                        Comparando: {format(previousRange.from, 'dd/MM/yy', { locale: ptBR })} - {format(previousRange.to, 'dd/MM/yy', { locale: ptBR })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ═══ KPIs ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard title="Unidades Ativas" value={stats.activeUnits} sub={`${stats.inactiveUnits} inativas`} icon={<Building2 className="h-4 w-4 text-primary" />} />
        <KpiCard title="Usuários" value={stats.totalUsers} icon={<Users className="h-4 w-4 text-primary" />} />
        <KpiCard title="Materiais" value={stats.totalMaterials} sub={`${stats.inactiveItems} inativos`} icon={<Package className="h-4 w-4 text-primary" />} />
        <KpiCard title="Móveis" value={stats.totalFurniture} icon={<Armchair className="h-4 w-4 text-primary" />} />
        <KpiCard title="Categorias" value={stats.totalCategories} icon={<ClipboardList className="h-4 w-4 text-primary" />} />
        <KpiCard
          title="Solicitações"
          value={stats.totalRequests}
          sub={`${stats.pendingRequests} pendentes`}
          icon={<TrendingUp className="h-4 w-4 text-primary" />}
          variation={prevStats ? calcVariation(stats.totalRequests, prevStats.totalRequests) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard
          title="Aprovados"
          value={stats.approvedRequests}
          icon={<CheckCircle className="h-4 w-4 text-primary" />}
          variation={prevStats ? calcVariation(stats.approvedRequests, prevStats.approvedRequests) : undefined}
        />
        <KpiCard
          title="Concluídos"
          value={stats.completedRequests}
          icon={<CheckCircle className="h-4 w-4 text-secondary" />}
          variation={prevStats ? calcVariation(stats.completedRequests, prevStats.completedRequests) : undefined}
        />
        <KpiCard
          title="Rejeitados"
          value={stats.rejectedRequests}
          icon={<XCircle className="h-4 w-4 text-destructive" />}
          variation={prevStats ? calcVariation(stats.rejectedRequests, prevStats.rejectedRequests) : undefined}
          invertColor
        />
        <KpiCard title="Estoque Baixo" value={stats.lowStockItems} sub={`${stats.outOfStockItems} zerados`} icon={<AlertTriangle className="h-4 w-4 text-yellow-600" />} />
        <KpiCard
          title="Empréstimos"
          value={stats.activeLoans}
          sub={`${stats.overdueLoans} atrasados`}
          icon={<Clock className="h-4 w-4 text-yellow-600" />}
          variation={prevStats ? calcVariation(stats.totalLoans, prevStats.totalLoans) : undefined}
        />
        <KpiCard
          title="Lotes Entrega"
          value={stats.totalBatches}
          sub={`${stats.batchesInTransit} em trânsito`}
          icon={<Truck className="h-4 w-4 text-primary" />}
          variation={prevStats ? calcVariation(stats.totalBatches, prevStats.totalBatches) : undefined}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          title="Transferências"
          value={stats.totalTransfers}
          sub={`${stats.pendingTransfers} pendentes`}
          icon={<ArrowRightLeft className="h-4 w-4 text-secondary" />}
          variation={prevStats ? calcVariation(stats.totalTransfers, prevStats.totalTransfers) : undefined}
        />
        <KpiCard
          title="Solic. Designer"
          value={stats.totalDesignerRequests}
          sub={`${stats.pendingDesignerRequests} pendentes`}
          icon={<Palette className="h-4 w-4 text-secondary" />}
          variation={prevStats ? calcVariation(stats.totalDesignerRequests, prevStats.totalDesignerRequests) : undefined}
        />
        <KpiCard
          title="Remoções"
          value={stats.totalRemovals}
          sub={`${stats.pendingRemovals} pendentes`}
          icon={<AlertTriangle className="h-4 w-4 text-orange-600" />}
          variation={prevStats ? calcVariation(stats.totalRemovals, prevStats.totalRemovals) : undefined}
        />
        <KpiCard
          title="Entregas OK"
          value={stats.batchesCompleted}
          sub={`de ${stats.totalBatches} lotes`}
          icon={<CheckCircle className="h-4 w-4 text-secondary" />}
          variation={prevStats ? calcVariation(stats.batchesCompleted, prevStats.batchesCompleted) : undefined}
        />
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
              <CardDescription>{stats.totalRequests} solicitações {isFiltered ? 'no período' : 'no sistema'}</CardDescription>
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
              <CardDescription>Volume de pedidos por item {isFiltered ? 'no período' : ''}</CardDescription>
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
              <CardDescription>Volume de pedidos por unidade operacional {isFiltered ? 'no período' : ''}</CardDescription>
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
              <CardDescription>{stats.totalLoans} empréstimos {isFiltered ? 'no período' : 'registrados'}</CardDescription>
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
              <CardDescription>{stats.totalBatches} lotes de entrega {isFiltered ? 'no período' : ''}</CardDescription>
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
              <CardDescription>{stats.totalTransfers} transferências {isFiltered ? 'no período' : 'registradas'}</CardDescription>
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
              <CardDescription>{stats.totalRemovals} remoções {isFiltered ? 'no período' : 'registradas'}</CardDescription>
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
              { icon: TrendingUp, label: `Solicitações${isFiltered ? ' (período)' : ' Totais'}`, value: stats.totalRequests },
              { icon: Truck, label: `Lotes de Entrega${isFiltered ? ' (período)' : ''}`, value: stats.totalBatches },
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

interface KpiCardProps {
  title: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  variation?: { pct: number; direction: 'up' | 'down' | 'same' };
  invertColor?: boolean;
}

function KpiCard({ title, value, sub, icon, variation, invertColor }: KpiCardProps) {
  const getVariationColor = () => {
    if (!variation || variation.direction === 'same') return 'text-muted-foreground';
    if (invertColor) return variation.direction === 'up' ? 'text-destructive' : 'text-emerald-600';
    return variation.direction === 'up' ? 'text-emerald-600' : 'text-destructive';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {variation && (
          <div className={`flex items-center gap-1 text-xs font-medium ${getVariationColor()}`}>
            {variation.direction === 'up' && <ArrowUpRight className="h-3 w-3" />}
            {variation.direction === 'down' && <ArrowDownRight className="h-3 w-3" />}
            {variation.direction === 'same' && <Minus className="h-3 w-3" />}
            <span>{variation.pct}% vs anterior</span>
          </div>
        )}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
