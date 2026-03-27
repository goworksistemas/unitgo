import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface BuyerIndicatorsPanelProps {
  relaxedBuyerScope?: boolean;
}

export default function BuyerIndicatorsPanel({ relaxedBuyerScope }: BuyerIndicatorsPanelProps) {
  const { currentUser } = useApp();
  const { purchaseOrders, isLoadingPurchases } = usePurchases();

  const filteredOrders = useMemo(() => {
    if (!currentUser) return [];
    return purchaseOrders.filter((o) => {
      if (!o.compradorId) return false;
      if (relaxedBuyerScope) return true;
      return o.compradorId === currentUser.id;
    });
  }, [purchaseOrders, currentUser, relaxedBuyerScope]);

  const { totalPedidos, valorTotal, ticketMedio, chartData } = useMemo(() => {
    const totalPedidos = filteredOrders.length;
    const valorTotal = filteredOrders.reduce((a, o) => a + (o.valorTotal || 0), 0);
    const ticketMedio = totalPedidos > 0 ? valorTotal / totalPedidos : 0;

    const byMonth = new Map<string, { mes: string; pedidos: number; valor: number }>();
    for (const o of filteredOrders) {
      const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as unknown as string);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      const cur = byMonth.get(key) ?? { mes: label, pedidos: 0, valor: 0 };
      cur.pedidos += 1;
      cur.valor += o.valorTotal || 0;
      byMonth.set(key, cur);
    }
    const chartData = Array.from(byMonth.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
      .slice(-8);

    return { totalPedidos, valorTotal, ticketMedio, chartData };
  }, [filteredOrders]);

  const fmt = (n: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando dashboard…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Indicadores dos pedidos de compra no seu escopo, por data de emissão. Métricas adicionais do ERP podem ser
          integradas depois.
          {relaxedBuyerScope && (
            <span className="block mt-2 text-amber-700 dark:text-amber-400">
              Pré-visualização: inclui todos os pedidos com comprador atribuído.
            </span>
          )}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{totalPedidos}</div>
            <CardDescription className="text-xs">Quantidade no período considerado</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Valor total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{fmt(valorTotal)}</div>
            <CardDescription className="text-xs">Soma dos totais dos PCs</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ticket médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{fmt(ticketMedio)}</div>
            <CardDescription className="text-xs">Valor médio por pedido</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Histórico mensal</CardTitle>
          <CardDescription>Quantidade de pedidos e valor por mês de emissão</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px] w-full min-w-0">
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">Sem dados para o gráfico.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'valor' ? fmt(value) : value
                  }
                />
                <Bar yAxisId="left" dataKey="pedidos" fill="#3F76FF" name="Qtd. pedidos" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="right" dataKey="valor" fill="#00C5E9" name="Valor" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
