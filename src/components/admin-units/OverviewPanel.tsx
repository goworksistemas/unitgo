import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Clock, AlertTriangle, ArrowRightLeft, Package, Users, TrendingUp, BarChart3, Layers } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, LabelList } from 'recharts';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';

interface OverviewPanelProps {
  stats: {
    activeUnits: number;
    totalUsers: number;
    totalItems: number;
    pendingRequests: number;
    approvedRequests: number;
    lowStockItems: number;
    pendingTransfers: number;
  };
  operationalUnitsCount: number;
  requestsCount: number;
  requestsByItem: { name: string; count: number }[];
}

const chartConfig: ChartConfig = {
  count: { label: 'Pedidos', color: 'hsl(var(--primary))' },
};

export function OverviewPanel({ stats, operationalUnitsCount, requestsCount, requestsByItem }: OverviewPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Ativas</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeUnits}</div>
            <p className="text-xs text-muted-foreground mt-1">{operationalUnitsCount} unidades totais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingRequests}</div>
            <p className="text-xs text-muted-foreground mt-1">{stats.approvedRequests} aprovados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.lowStockItems}</div>
            <p className="text-xs text-muted-foreground mt-1">Itens abaixo do mínimo</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transferências</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingTransfers}</div>
            <p className="text-xs text-muted-foreground mt-1">Transferências pendentes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-primary" />Volume de Pedidos por Item</CardTitle>
            <CardDescription>Top 10 itens mais solicitados</CardDescription>
          </CardHeader>
          <CardContent>
            {requestsByItem.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mb-3 opacity-30" />
                <p className="text-sm">Nenhum pedido registrado</p>
              </div>
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <BarChart data={requestsByItem} layout="vertical" margin={{ top: 5, right: 40, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis type="category" dataKey="name" width={120} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} tickMargin={8} />
                  <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                    <LabelList dataKey="count" position="right" offset={8} className="fill-foreground text-xs font-medium" />
                    {requestsByItem.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={`url(#colorGradient-${index})`} />
                    ))}
                  </Bar>
                  <defs>
                    {requestsByItem.map((_, index) => (
                      <linearGradient key={`gradient-${index}`} id={`colorGradient-${index}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="var(--primary)" />
                        <stop offset="100%" stopColor="var(--secondary)" />
                      </linearGradient>
                    ))}
                  </defs>
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-secondary" />Resumo do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { icon: Package, label: 'Total de Itens', value: stats.totalItems },
                { icon: Users, label: 'Total de Usuários', value: stats.totalUsers },
                { icon: Building2, label: 'Unidades Operacionais', value: operationalUnitsCount },
                { icon: TrendingUp, label: 'Pedidos Totais', value: requestsCount },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{label}</span></div>
                  <span className="font-bold text-lg">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
