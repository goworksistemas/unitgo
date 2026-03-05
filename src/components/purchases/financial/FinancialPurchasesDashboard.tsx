import { useMemo } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ContractProgressBar } from '../shared/ContractProgressBar';
import { format } from 'date-fns';

export function FinancialPurchasesDashboard() {
  const { contracts, costCenters, isLoadingPurchases } = usePurchases();

  const criticalContracts = useMemo(
    () => contracts.filter((c) => c.status === 'active' && c.valorTotal > 0 && (c.valorConsumido / c.valorTotal) >= 0.8),
    [contracts]
  );

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Tabs defaultValue="contratos" className="space-y-4">
      <TabsList>
        <TabsTrigger value="contratos">Dashboard Contratos</TabsTrigger>
        <TabsTrigger value="centros-custo">Centros de Custo</TabsTrigger>
      </TabsList>
      <TabsContent value="contratos">
        <div className="space-y-4">
          {criticalContracts.length > 0 && (
            <Card className="border-amber-300 bg-amber-50/50 dark:bg-amber-900/10">
              <CardHeader>
                <CardTitle className="text-amber-700 dark:text-amber-400">Contratos Críticos</CardTitle>
                <CardDescription>Contratos com consumo acima de 80%</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {criticalContracts.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg border space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{c.numero} — {c.nome}</p>
                      <Badge variant={c.valorConsumido >= c.valorTotal ? 'destructive' : 'outline'} className={c.valorConsumido < c.valorTotal ? 'bg-amber-100 text-amber-700 border-amber-300' : ''}>
                        {c.valorConsumido >= c.valorTotal ? 'Esgotado' : 'Alerta'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Total:</span> {fmt(c.valorTotal)}</div>
                      <div><span className="text-muted-foreground">Consumido:</span> {fmt(c.valorConsumido)}</div>
                      <div><span className="text-muted-foreground">Saldo:</span> {fmt(c.saldo)}</div>
                    </div>
                    <ContractProgressBar valorTotal={c.valorTotal} valorConsumido={c.valorConsumido} />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader>
              <CardTitle>Todos os Contratos</CardTitle>
              <CardDescription>{contracts.length} contrato(s) cadastrado(s)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {contracts.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Nenhum contrato</p>
              ) : contracts.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{c.numero} — {c.nome}</p>
                    <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                  </div>
                  <ContractProgressBar valorTotal={c.valorTotal} valorConsumido={c.valorConsumido} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="centros-custo">
        <Card>
          <CardHeader>
            <CardTitle>Centros de Custo</CardTitle>
            <CardDescription>Análise de gastos por centro de custo</CardDescription>
          </CardHeader>
          <CardContent>
            {costCenters.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum centro de custo</p>
            ) : (
              <div className="space-y-3">
                {costCenters.map((cc) => {
                  const ccContracts = contracts.filter((c) => c.centroCustoId === cc.id);
                  const totalValor = ccContracts.reduce((s, c) => s + c.valorTotal, 0);
                  const totalConsumo = ccContracts.reduce((s, c) => s + c.valorConsumido, 0);
                  return (
                    <div key={cc.id} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium">{cc.codigo} — {cc.nome}</p>
                          <p className="text-xs text-muted-foreground">{ccContracts.length} contrato(s)</p>
                        </div>
                        <Badge variant={cc.status === 'active' ? 'default' : 'secondary'}>{cc.status === 'active' ? 'Ativo' : 'Inativo'}</Badge>
                      </div>
                      {totalValor > 0 && <ContractProgressBar valorTotal={totalValor} valorConsumido={totalConsumo} />}
                      <div className="grid grid-cols-2 gap-2 text-sm mt-2">
                        <div><span className="text-muted-foreground">Total:</span> {fmt(totalValor)}</div>
                        <div><span className="text-muted-foreground">Consumido:</span> {fmt(totalConsumo)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
