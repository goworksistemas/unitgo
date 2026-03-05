import { useMemo, useState, useCallback } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import {
  FileText,
  Landmark,
  BarChart3,
  Bell,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  ShieldAlert,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Progress } from '../ui/progress';
import { ContractProgressBar } from '../purchases/shared/ContractProgressBar';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '../ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Contract, CostCenter } from '@/types/purchases';
import { toast } from 'sonner';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const fmtCompact = (v: number) => {
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}K`;
  return fmt(v);
};

const pct = (consumed: number, total: number) =>
  total > 0 ? Math.min(100, (consumed / total) * 100) : 0;

const PIE_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

export function FinancialDashboard() {
  const {
    contracts,
    costCenters,
    purchaseRequests,
    purchaseOrders,
    isLoadingPurchases,
  } = usePurchases();

  const navigationSections: NavigationSection[] = useMemo(
    () => [
      { id: 'overview', label: 'Visão Executiva', icon: BarChart3 },
      { id: 'contracts', label: 'Gestão de Contratos', icon: FileText },
      { id: 'cost-centers', label: 'Centros de Custo', icon: Landmark },
      { id: 'alerts', label: 'Alertas', icon: Bell },
      { id: 'reports', label: 'Relatórios', icon: Download },
    ],
    []
  );

  const { activeSection } = useDashboardNav(
    navigationSections,
    'Painel Financeiro',
    'Contratos, Centros de Custo e Relatórios',
    'overview'
  );

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-3" />
          Carregando dados financeiros...
        </CardContent>
      </Card>
    );
  }

  switch (activeSection) {
    case 'contracts':
      return <ContractsSection contracts={contracts} costCenters={costCenters} />;
    case 'cost-centers':
      return <CostCentersSection contracts={contracts} costCenters={costCenters} />;
    case 'alerts':
      return <AlertsSection contracts={contracts} costCenters={costCenters} />;
    case 'reports':
      return (
        <ReportsSection
          contracts={contracts}
          costCenters={costCenters}
          purchaseRequests={purchaseRequests}
          purchaseOrders={purchaseOrders}
        />
      );
    case 'overview':
    default:
      return (
        <OverviewSection
          contracts={contracts}
          costCenters={costCenters}
          purchaseRequests={purchaseRequests}
          purchaseOrders={purchaseOrders}
        />
      );
  }
}

// ─── VISÃO EXECUTIVA ───────────────────────────────────────────────────────────

interface SectionProps {
  contracts: Contract[];
  costCenters: CostCenter[];
  purchaseRequests?: any[];
  purchaseOrders?: any[];
}

function OverviewSection({ contracts, costCenters, purchaseRequests = [], purchaseOrders = [] }: SectionProps) {
  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalValorContratos = activeContracts.reduce((s, c) => s + c.valorTotal, 0);
  const totalConsumido = activeContracts.reduce((s, c) => s + c.valorConsumido, 0);
  const totalSaldo = activeContracts.reduce((s, c) => s + c.saldo, 0);
  const percentualGeral = pct(totalConsumido, totalValorContratos);

  const criticalContracts = activeContracts.filter(
    (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 80
  );
  const blockedContracts = activeContracts.filter(
    (c) => c.valorTotal > 0 && c.valorConsumido >= c.valorTotal
  );
  const expiringContracts = activeContracts.filter((c) => {
    const daysLeft = differenceInDays(new Date(c.dataFim), new Date());
    return daysLeft >= 0 && daysLeft <= 30;
  });

  const ccDistribution = costCenters
    .filter((cc) => cc.status === 'active')
    .map((cc) => {
      const ccContracts = contracts.filter((c) => c.centroCustoId === cc.id);
      const total = ccContracts.reduce((s, c) => s + c.valorConsumido, 0);
      return { name: cc.codigo, value: total, fullName: cc.nome };
    })
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value);

  const pendingRequests = purchaseRequests.filter(
    (r: any) => r.status === 'pending_manager' || r.status === 'pending_director'
  ).length;

  const chartConfig: ChartConfig = {};
  ccDistribution.forEach((d, i) => {
    chartConfig[d.name] = { label: d.fullName, color: PIE_COLORS[i % PIE_COLORS.length] };
  });

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Valor Total Contratos"
          value={fmtCompact(totalValorContratos)}
          subtitle={`${activeContracts.length} contrato(s) ativo(s)`}
          icon={<DollarSign className="h-4 w-4" />}
          color="blue"
        />
        <KpiCard
          title="Total Consumido"
          value={fmtCompact(totalConsumido)}
          subtitle={`${percentualGeral.toFixed(1)}% do total`}
          icon={<TrendingUp className="h-4 w-4" />}
          color={percentualGeral >= 80 ? 'red' : percentualGeral >= 60 ? 'amber' : 'green'}
        />
        <KpiCard
          title="Saldo Disponível"
          value={fmtCompact(totalSaldo)}
          subtitle="Saldo remanescente"
          icon={<TrendingDown className="h-4 w-4" />}
          color="emerald"
        />
        <KpiCard
          title="Alertas Ativos"
          value={`${criticalContracts.length + expiringContracts.length}`}
          subtitle={`${blockedContracts.length} bloqueado(s)`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={blockedContracts.length > 0 ? 'red' : criticalContracts.length > 0 ? 'amber' : 'green'}
        />
      </div>

      {/* Consumo geral */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Consumo Geral de Contratos</CardTitle>
          <CardDescription>Visão consolidada de todos os contratos ativos</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Consumido: {fmt(totalConsumido)}</span>
              <span className="text-muted-foreground">Total: {fmt(totalValorContratos)}</span>
            </div>
            <Progress
              value={percentualGeral}
              className={`h-3 ${
                percentualGeral >= 100
                  ? '[&>div]:bg-destructive'
                  : percentualGeral >= 80
                  ? '[&>div]:bg-amber-500'
                  : ''
              }`}
            />
            <p className="text-xs text-muted-foreground text-right">
              {percentualGeral.toFixed(1)}% consumido
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Distribuição por Centro de Custo */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="h-4 w-4 text-primary" />
              Distribuição por Centro de Custo
            </CardTitle>
          </CardHeader>
          <CardContent>
            {ccDistribution.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Sem dados de consumo
              </p>
            ) : (
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={ccDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                    >
                      {ccDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => fmt(value)}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Legend
                      formatter={(value: string) => {
                        const item = ccDistribution.find((d) => d.name === value);
                        return item ? `${value} — ${item.fullName}` : value;
                      }}
                      wrapperStyle={{ fontSize: '11px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contratos que requerem atenção */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Atenção Imediata
            </CardTitle>
            <CardDescription>Contratos que requerem ação</CardDescription>
          </CardHeader>
          <CardContent>
            {criticalContracts.length === 0 && expiringContracts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto">
                {blockedContracts.map((c) => (
                  <AlertItem key={c.id} contract={c} type="blocked" />
                ))}
                {criticalContracts
                  .filter((c) => c.valorConsumido < c.valorTotal)
                  .map((c) => (
                    <AlertItem key={c.id} contract={c} type="critical" />
                  ))}
                {expiringContracts.map((c) => (
                  <AlertItem key={`exp-${c.id}`} contract={c} type="expiring" />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Solicitações em andamento */}
      <div className="grid md:grid-cols-3 gap-4">
        <MiniKpi
          label="Solicitações Pendentes"
          value={pendingRequests}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
        />
        <MiniKpi
          label="Pedidos em Andamento"
          value={purchaseOrders.filter((o: any) => !['fully_received'].includes(o.status)).length}
          icon={<ArrowUpRight className="h-4 w-4" />}
          color="blue"
        />
        <MiniKpi
          label="Contratos a Vencer (30d)"
          value={expiringContracts.length}
          icon={<Calendar className="h-4 w-4" />}
          color={expiringContracts.length > 0 ? 'red' : 'green'}
        />
      </div>
    </div>
  );
}

// ─── GESTÃO DE CONTRATOS ───────────────────────────────────────────────────────

function ContractsSection({ contracts, costCenters }: SectionProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('consumo');

  const filtered = useMemo(() => {
    let list = [...contracts];
    if (statusFilter !== 'all') {
      list = list.filter((c) => c.status === statusFilter);
    }
    if (sortBy === 'consumo') {
      list.sort((a, b) => {
        const pa = pct(a.valorConsumido, a.valorTotal);
        const pb = pct(b.valorConsumido, b.valorTotal);
        return pb - pa;
      });
    } else if (sortBy === 'valor') {
      list.sort((a, b) => b.valorTotal - a.valorTotal);
    } else if (sortBy === 'vencimento') {
      list.sort(
        (a, b) => new Date(a.dataFim).getTime() - new Date(b.dataFim).getTime()
      );
    }
    return list;
  }, [contracts, statusFilter, sortBy]);

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const criticalCount = activeContracts.filter(
    (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 80
  ).length;

  const getCostCenterName = (id: string) => {
    const cc = costCenters.find((c) => c.id === id);
    return cc ? `${cc.codigo} — ${cc.nome}` : '—';
  };

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Gestão de Contratos</h2>
          <p className="text-sm text-muted-foreground">
            {contracts.length} contrato(s) total — {criticalCount} em alerta
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-9 text-sm">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="encerrado">Encerrados</SelectItem>
              <SelectItem value="suspenso">Suspensos</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="consumo">Maior Consumo</SelectItem>
              <SelectItem value="valor">Maior Valor</SelectItem>
              <SelectItem value="vencimento">Vencimento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de contratos */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum contrato encontrado
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const percent = pct(c.valorConsumido, c.valorTotal);
            const daysLeft = differenceInDays(new Date(c.dataFim), new Date());
            const isExpiring = daysLeft >= 0 && daysLeft <= 30;
            const isExpired = daysLeft < 0;
            const isBlocked = c.valorConsumido >= c.valorTotal && c.valorTotal > 0;

            return (
              <Card
                key={c.id}
                className={
                  isBlocked
                    ? 'border-red-300 bg-red-50/30 dark:bg-red-900/10'
                    : percent >= 80
                    ? 'border-amber-300 bg-amber-50/30 dark:bg-amber-900/10'
                    : ''
                }
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Cabeçalho */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{c.numero}</p>
                          <ContractStatusBadge status={c.status} percent={percent} />
                          {isExpiring && (
                            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                              <Clock className="h-3 w-3 mr-1" />
                              {daysLeft}d restantes
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="destructive" className="text-xs">
                              Vencido
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">{c.nome}</p>
                      </div>
                    </div>

                    {/* Dados financeiros */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground block">Valor Total</span>
                        <span className="font-medium">{fmt(c.valorTotal)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Consumido</span>
                        <span className="font-medium">{fmt(c.valorConsumido)}</span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Saldo</span>
                        <span className={`font-medium ${c.saldo <= 0 ? 'text-red-600' : ''}`}>
                          {fmt(c.saldo)}
                        </span>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Centro de Custo</span>
                        <span className="font-medium text-xs">{getCostCenterName(c.centroCustoId)}</span>
                      </div>
                    </div>

                    {/* Barra de progresso */}
                    {c.valorTotal > 0 && (
                      <ContractProgressBar
                        valorTotal={c.valorTotal}
                        valorConsumido={c.valorConsumido}
                      />
                    )}

                    {/* Datas */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>
                        Início: {format(new Date(c.dataInicio), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span>
                        Fim: {format(new Date(c.dataFim), 'dd/MM/yyyy', { locale: ptBR })}
                      </span>
                      <span>CNPJ: {c.cnpjCliente}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── CENTROS DE CUSTO ──────────────────────────────────────────────────────────

function CostCentersSection({ contracts, costCenters }: SectionProps) {
  const ccData = useMemo(() => {
    return costCenters.map((cc) => {
      const ccContracts = contracts.filter((c) => c.centroCustoId === cc.id);
      const activeContracts = ccContracts.filter((c) => c.status === 'active');
      const totalValor = ccContracts.reduce((s, c) => s + c.valorTotal, 0);
      const totalConsumo = ccContracts.reduce((s, c) => s + c.valorConsumido, 0);
      const totalSaldo = ccContracts.reduce((s, c) => s + c.saldo, 0);
      const criticalCount = activeContracts.filter(
        (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 80
      ).length;

      return {
        ...cc,
        contracts: ccContracts,
        activeContracts,
        totalValor,
        totalConsumo,
        totalSaldo,
        criticalCount,
        percent: pct(totalConsumo, totalValor),
      };
    });
  }, [contracts, costCenters]);

  const chartData = ccData
    .filter((d) => d.totalValor > 0)
    .sort((a, b) => b.totalConsumo - a.totalConsumo);

  const barChartConfig: ChartConfig = {
    consumido: { label: 'Consumido', color: '#3B82F6' },
    saldo: { label: 'Saldo', color: '#10B981' },
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Centros de Custo</h2>
        <p className="text-sm text-muted-foreground">
          Análise de gastos e desempenho por centro de custo
        </p>
      </div>

      {/* Gráfico comparativo */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparativo de Centros de Custo</CardTitle>
            <CardDescription>Consumido vs. Saldo disponível</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barChartConfig} className="h-[280px] w-full">
              <BarChart
                data={chartData.map((d) => ({
                  name: d.codigo,
                  consumido: d.totalConsumo,
                  saldo: d.totalSaldo,
                }))}
                layout="vertical"
                margin={{ left: 10, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={(v) => fmtCompact(v)} />
                <YAxis type="category" dataKey="name" width={60} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value: any) => fmt(Number(value))}
                    />
                  }
                />
                <Bar dataKey="consumido" fill="var(--color-consumido)" radius={[0, 4, 4, 0]} />
                <Bar dataKey="saldo" fill="var(--color-saldo)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {/* Cards por centro de custo */}
      {ccData.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhum centro de custo cadastrado
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {ccData.map((cc) => (
            <Card
              key={cc.id}
              className={
                cc.criticalCount > 0 ? 'border-amber-300' : ''
              }
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {cc.codigo} — {cc.nome}
                    </CardTitle>
                    <CardDescription>{cc.descricao || 'Sem descrição'}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {cc.criticalCount > 0 && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                        {cc.criticalCount} alerta(s)
                      </Badge>
                    )}
                    <Badge variant={cc.status === 'active' ? 'default' : 'secondary'}>
                      {cc.status === 'active' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <span className="text-xs text-muted-foreground block">Total</span>
                    <span className="font-semibold">{fmtCompact(cc.totalValor)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Consumido</span>
                    <span className="font-semibold">{fmtCompact(cc.totalConsumo)}</span>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block">Saldo</span>
                    <span className={`font-semibold ${cc.totalSaldo <= 0 ? 'text-red-600' : ''}`}>
                      {fmtCompact(cc.totalSaldo)}
                    </span>
                  </div>
                </div>
                {cc.totalValor > 0 && (
                  <ContractProgressBar
                    valorTotal={cc.totalValor}
                    valorConsumido={cc.totalConsumo}
                  />
                )}
                <div className="text-xs text-muted-foreground">
                  {cc.activeContracts.length} contrato(s) ativo(s) de {cc.contracts.length} total
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ALERTAS E NOTIFICAÇÕES ────────────────────────────────────────────────────

function AlertsSection({ contracts, costCenters }: SectionProps) {
  const activeContracts = contracts.filter((c) => c.status === 'active');

  const blockedContracts = activeContracts.filter(
    (c) => c.valorTotal > 0 && c.valorConsumido >= c.valorTotal
  );
  const criticalContracts = activeContracts.filter(
    (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 80 && c.valorConsumido < c.valorTotal
  );
  const warningContracts = activeContracts.filter(
    (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 60 && pct(c.valorConsumido, c.valorTotal) < 80
  );
  const expiringContracts = activeContracts.filter((c) => {
    const daysLeft = differenceInDays(new Date(c.dataFim), new Date());
    return daysLeft >= 0 && daysLeft <= 60;
  });
  const expiredContracts = contracts.filter((c) => {
    return c.status === 'active' && isBefore(new Date(c.dataFim), new Date());
  });

  const totalAlerts =
    blockedContracts.length +
    criticalContracts.length +
    expiringContracts.length +
    expiredContracts.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Alertas e Notificações</h2>
          <p className="text-sm text-muted-foreground">{totalAlerts} alerta(s) ativo(s)</p>
        </div>
      </div>

      {totalAlerts === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">Tudo em ordem!</p>
            <p className="text-sm text-muted-foreground mt-1">
              Nenhum contrato requer atenção no momento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Bloqueados */}
          {blockedContracts.length > 0 && (
            <AlertGroup
              title="Contratos Bloqueados (100%)"
              description="Contratos com saldo esgotado — compras bloqueadas"
              variant="destructive"
              icon={<XCircle className="h-5 w-5" />}
              contracts={blockedContracts}
              costCenters={costCenters}
            />
          )}

          {/* Vencidos */}
          {expiredContracts.length > 0 && (
            <AlertGroup
              title="Contratos Vencidos"
              description="Contratos com data de vigência expirada"
              variant="destructive"
              icon={<Calendar className="h-5 w-5" />}
              contracts={expiredContracts}
              costCenters={costCenters}
              showExpiry
            />
          )}

          {/* Críticos */}
          {criticalContracts.length > 0 && (
            <AlertGroup
              title="Alerta Crítico (≥80%)"
              description="Contratos próximos do limite — risco de bloqueio iminente"
              variant="warning"
              icon={<AlertTriangle className="h-5 w-5" />}
              contracts={criticalContracts}
              costCenters={costCenters}
            />
          )}

          {/* A vencer */}
          {expiringContracts.length > 0 && (
            <AlertGroup
              title="Contratos a Vencer (60 dias)"
              description="Contratos com vencimento próximo — avaliar renovação"
              variant="info"
              icon={<Clock className="h-5 w-5" />}
              contracts={expiringContracts}
              costCenters={costCenters}
              showExpiry
            />
          )}

          {/* Atenção */}
          {warningContracts.length > 0 && (
            <AlertGroup
              title="Atenção (≥60%)"
              description="Contratos com consumo moderado — monitorar evolução"
              variant="muted"
              icon={<TrendingUp className="h-5 w-5" />}
              contracts={warningContracts}
              costCenters={costCenters}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ─── RELATÓRIOS E EXPORTAÇÕES ──────────────────────────────────────────────────

function ReportsSection({ contracts, costCenters, purchaseRequests = [], purchaseOrders = [] }: SectionProps) {
  const [reportType, setReportType] = useState('contracts');

  const exportCSV = useCallback(
    (type: string) => {
      let csvContent = '';
      let fileName = '';

      if (type === 'contracts') {
        csvContent = 'Numero;Nome;CNPJ;Status;Valor Total;Valor Consumido;Saldo;% Consumido;Data Inicio;Data Fim;Centro de Custo\n';
        contracts.forEach((c) => {
          const cc = costCenters.find((cc) => cc.id === c.centroCustoId);
          csvContent += `${c.numero};${c.nome};${c.cnpjCliente};${c.status};${c.valorTotal};${c.valorConsumido};${c.saldo};${pct(c.valorConsumido, c.valorTotal).toFixed(1)}%;${format(new Date(c.dataInicio), 'dd/MM/yyyy')};${format(new Date(c.dataFim), 'dd/MM/yyyy')};${cc ? `${cc.codigo} - ${cc.nome}` : ''}\n`;
        });
        fileName = `contratos_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'cost-centers') {
        csvContent = 'Codigo;Nome;Status;Qtd Contratos;Valor Total;Valor Consumido;Saldo;% Consumido\n';
        costCenters.forEach((cc) => {
          const ccContracts = contracts.filter((c) => c.centroCustoId === cc.id);
          const totalValor = ccContracts.reduce((s, c) => s + c.valorTotal, 0);
          const totalConsumo = ccContracts.reduce((s, c) => s + c.valorConsumido, 0);
          const totalSaldo = ccContracts.reduce((s, c) => s + c.saldo, 0);
          csvContent += `${cc.codigo};${cc.nome};${cc.status};${ccContracts.length};${totalValor};${totalConsumo};${totalSaldo};${pct(totalConsumo, totalValor).toFixed(1)}%\n`;
        });
        fileName = `centros_custo_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'alerts') {
        csvContent = 'Tipo Alerta;Contrato;Nome;% Consumido;Saldo;Vencimento;Centro de Custo\n';
        const activeContracts = contracts.filter((c) => c.status === 'active');
        activeContracts.forEach((c) => {
          const percent = pct(c.valorConsumido, c.valorTotal);
          const cc = costCenters.find((cc) => cc.id === c.centroCustoId);
          let alertType = 'Normal';
          if (c.valorConsumido >= c.valorTotal && c.valorTotal > 0) alertType = 'BLOQUEADO';
          else if (percent >= 80) alertType = 'CRITICO';
          else if (percent >= 60) alertType = 'ATENCAO';
          const daysLeft = differenceInDays(new Date(c.dataFim), new Date());
          if (daysLeft <= 30 && daysLeft >= 0) alertType += ' / VENCENDO';
          if (daysLeft < 0) alertType += ' / VENCIDO';
          csvContent += `${alertType};${c.numero};${c.nome};${percent.toFixed(1)}%;${fmt(c.saldo)};${format(new Date(c.dataFim), 'dd/MM/yyyy')};${cc ? `${cc.codigo} - ${cc.nome}` : ''}\n`;
        });
        fileName = `alertas_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      } else if (type === 'requests') {
        csvContent = 'ID;Status;Justificativa;Centro de Custo;Data Criacao\n';
        purchaseRequests.forEach((r: any) => {
          const cc = costCenters.find((cc) => cc.id === r.centroCustoId);
          csvContent += `${r.id};${r.status};${r.justificativa || ''};${cc ? `${cc.codigo} - ${cc.nome}` : ''};${format(new Date(r.createdAt), 'dd/MM/yyyy HH:mm')}\n`;
        });
        fileName = `solicitacoes_compra_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      }

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success(`Relatório exportado: ${fileName}`);
    },
    [contracts, costCenters, purchaseRequests]
  );

  const activeContracts = contracts.filter((c) => c.status === 'active');
  const totalValor = activeContracts.reduce((s, c) => s + c.valorTotal, 0);
  const totalConsumo = activeContracts.reduce((s, c) => s + c.valorConsumido, 0);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Relatórios e Exportações</h2>
        <p className="text-sm text-muted-foreground">
          Gere relatórios detalhados e exporte dados para análise
        </p>
      </div>

      {/* Cards de exportação */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ReportExportCard
          title="Contratos"
          description="Dados completos de todos os contratos com saldos e consumo"
          count={contracts.length}
          onExport={() => exportCSV('contracts')}
        />
        <ReportExportCard
          title="Centros de Custo"
          description="Consolidado de gastos e saldos por centro de custo"
          count={costCenters.length}
          onExport={() => exportCSV('cost-centers')}
        />
        <ReportExportCard
          title="Alertas"
          description="Relatório de contratos com alertas de consumo e vencimento"
          count={
            activeContracts.filter(
              (c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 60
            ).length
          }
          onExport={() => exportCSV('alerts')}
        />
        <ReportExportCard
          title="Solicitações"
          description="Histórico de solicitações de compra com status e aprovações"
          count={purchaseRequests.length}
          onExport={() => exportCSV('requests')}
        />
      </div>

      {/* Resumo executivo */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resumo Executivo</CardTitle>
          <CardDescription>
            Dados consolidados para apresentação — gerado em{' '}
            {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryItem label="Contratos Ativos" value={activeContracts.length.toString()} />
            <SummaryItem label="Volume Total" value={fmtCompact(totalValor)} />
            <SummaryItem label="Consumo Total" value={fmtCompact(totalConsumo)} />
            <SummaryItem
              label="Eficiência Orçamentária"
              value={`${pct(totalConsumo, totalValor).toFixed(1)}%`}
            />
          </div>
          <Separator className="my-4" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryItem label="Centros de Custo" value={costCenters.filter((cc) => cc.status === 'active').length.toString()} />
            <SummaryItem label="Solicitações de Compra" value={purchaseRequests.length.toString()} />
            <SummaryItem label="Pedidos de Compra" value={purchaseOrders.length.toString()} />
            <SummaryItem
              label="Contratos Críticos"
              value={
                activeContracts
                  .filter((c) => c.valorTotal > 0 && pct(c.valorConsumido, c.valorTotal) >= 80)
                  .length.toString()
              }
              alert
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── COMPONENTES AUXILIARES ────────────────────────────────────────────────────

function KpiCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400',
    green: 'bg-green-50 text-green-600 dark:bg-green-950/30 dark:text-green-400',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
    red: 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color] || colorClasses.blue}`}>{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold truncate">{value}</p>
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MiniKpi({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={colorClasses[color] || ''}>{icon}</div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ContractStatusBadge({ status, percent }: { status: string; percent: number }) {
  if (percent >= 100) return <Badge variant="destructive">Esgotado</Badge>;
  if (percent >= 80) return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Alerta</Badge>;
  if (status === 'active') return <Badge variant="default">Ativo</Badge>;
  if (status === 'encerrado') return <Badge variant="secondary">Encerrado</Badge>;
  if (status === 'suspenso') return <Badge variant="outline">Suspenso</Badge>;
  return <Badge variant="secondary">{status}</Badge>;
}

function AlertItem({ contract, type }: { contract: Contract; type: 'blocked' | 'critical' | 'expiring' }) {
  const percent = pct(contract.valorConsumido, contract.valorTotal);
  const daysLeft = differenceInDays(new Date(contract.dataFim), new Date());

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg border text-sm">
      {type === 'blocked' && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
      {type === 'critical' && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
      {type === 'expiring' && <Clock className="h-4 w-4 text-blue-500 shrink-0" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium truncate">{contract.numero}</p>
        <p className="text-xs text-muted-foreground truncate">{contract.nome}</p>
      </div>
      <div className="text-right shrink-0">
        {type !== 'expiring' && (
          <p className={`text-xs font-medium ${percent >= 100 ? 'text-red-600' : 'text-amber-600'}`}>
            {percent.toFixed(0)}%
          </p>
        )}
        {type === 'expiring' && (
          <p className="text-xs font-medium text-blue-600">{daysLeft}d</p>
        )}
      </div>
    </div>
  );
}

function AlertGroup({
  title,
  description,
  variant,
  icon,
  contracts,
  costCenters,
  showExpiry,
}: {
  title: string;
  description: string;
  variant: 'destructive' | 'warning' | 'info' | 'muted';
  icon: React.ReactNode;
  contracts: Contract[];
  costCenters: CostCenter[];
  showExpiry?: boolean;
}) {
  const variantClasses: Record<string, string> = {
    destructive: 'border-red-300 bg-red-50/50 dark:bg-red-900/10',
    warning: 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10',
    info: 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10',
    muted: 'border-border',
  };

  const titleColors: Record<string, string> = {
    destructive: 'text-red-700 dark:text-red-400',
    warning: 'text-amber-700 dark:text-amber-400',
    info: 'text-blue-700 dark:text-blue-400',
    muted: 'text-foreground',
  };

  return (
    <Card className={variantClasses[variant]}>
      <CardHeader className="pb-3">
        <CardTitle className={`text-base flex items-center gap-2 ${titleColors[variant]}`}>
          {icon}
          {title}
          <Badge variant="secondary" className="ml-auto">
            {contracts.length}
          </Badge>
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {contracts.map((c) => {
          const percent = pct(c.valorConsumido, c.valorTotal);
          const cc = costCenters.find((cc) => cc.id === c.centroCustoId);
          const daysLeft = differenceInDays(new Date(c.dataFim), new Date());

          return (
            <div key={c.id} className="p-3 rounded-lg border bg-background/60 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    {c.numero} — {c.nome}
                  </p>
                  {cc && (
                    <p className="text-xs text-muted-foreground">
                      CC: {cc.codigo} — {cc.nome}
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {showExpiry ? (
                    <Badge variant={daysLeft < 0 ? 'destructive' : 'outline'} className="text-xs">
                      {daysLeft < 0 ? `Vencido há ${Math.abs(daysLeft)}d` : `${daysLeft}d restantes`}
                    </Badge>
                  ) : (
                    <Badge
                      variant={percent >= 100 ? 'destructive' : 'outline'}
                      className={percent < 100 && percent >= 80 ? 'text-amber-600 border-amber-300' : ''}
                    >
                      {percent.toFixed(0)}%
                    </Badge>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Total:</span> {fmt(c.valorTotal)}
                </div>
                <div>
                  <span className="text-muted-foreground">Consumido:</span> {fmt(c.valorConsumido)}
                </div>
                <div>
                  <span className="text-muted-foreground">Saldo:</span>{' '}
                  <span className={c.saldo <= 0 ? 'text-red-600 font-medium' : ''}>
                    {fmt(c.saldo)}
                  </span>
                </div>
              </div>
              {c.valorTotal > 0 && (
                <ContractProgressBar valorTotal={c.valorTotal} valorConsumido={c.valorConsumido} />
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ReportExportCard({
  title,
  description,
  count,
  onExport,
}: {
  title: string;
  description: string;
  count: number;
  onExport: () => void;
}) {
  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-sm">{title}</p>
          <Badge variant="secondary">{count}</Badge>
        </div>
        <p className="text-xs text-muted-foreground flex-1">{description}</p>
        <Button variant="outline" size="sm" onClick={onExport} className="w-full">
          <Download className="h-3 w-3 mr-2" />
          Exportar CSV
        </Button>
      </CardContent>
    </Card>
  );
}

function SummaryItem({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-muted/50">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-lg font-bold ${alert ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  );
}
