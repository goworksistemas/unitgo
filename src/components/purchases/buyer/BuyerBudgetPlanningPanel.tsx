import { useMemo } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContractProgressBar } from '@/components/purchases/shared/ContractProgressBar';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

export interface BuyerBudgetPlanningPanelProps {
  relaxedBuyerScope?: boolean;
}

/** Planejamento orçamentário: consumo de contratos vs teto (dados já disponíveis no módulo). */
export function BuyerBudgetPlanningPanel(_props: BuyerBudgetPlanningPanelProps) {
  const { contracts, costCenters, purchaseOrders, isLoadingPurchases } = usePurchases();

  const byContract = useMemo(() => {
    return contracts
      .filter((c) => c.status === 'active')
      .map((c) => {
        const cc = costCenters.find((x) => x.id === c.centroCustoId);
        const consumed = c.valorConsumido ?? 0;
        const total = c.valorTotal ?? 0;
        return {
          ...c,
          ccLabel: cc ? `${cc.codigo} · ${cc.nome}` : '—',
          consumed,
          total,
          pct: total > 0 ? (consumed / total) * 100 : 0,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [contracts, costCenters]);

  const poVolume = useMemo(() => {
    const thirty = Date.now() - 30 * 24 * 60 * 60 * 1000;
    let sum = 0;
    for (const o of purchaseOrders) {
      const t = new Date(o.createdAt).getTime();
      if (t >= thirty) sum += o.valorTotal ?? 0;
    }
    return sum;
  }, [purchaseOrders]);

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando dados…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Planejamento orçamentário</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Visão de gastos realizados vs contratos ativos. Centros de custo aparecem vinculados a cada contrato.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/60 shadow-sm md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pedidos (30 dias)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{fmt(poVolume)}</p>
            <CardDescription className="text-xs mt-1">Volume emitido no período (todos os pedidos)</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Contratos ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{byContract.length}</p>
            <CardDescription className="text-xs mt-1">Com acompanhamento de saldo</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm md:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Centros de custo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{costCenters.length}</p>
            <CardDescription className="text-xs mt-1">Cadastro auxiliar vinculado aos contratos</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Contratos e consumo</CardTitle>
          <CardDescription>
            Compare o previsto (valor total do contrato) com o já consumido pelos pedidos vinculados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {byContract.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum contrato ativo cadastrado.
            </p>
          ) : (
            byContract.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border/60 bg-card/50 p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{c.nome}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{c.ccLabel}</p>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{c.numero}</span>
                </div>
                <ContractProgressBar
                  valorConsumido={c.consumed}
                  valorTotal={c.total}
                  showLabel={false}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Consumido {fmt(c.consumed)}</span>
                  <span>Saldo {fmt(Math.max(0, c.total - c.consumed))}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
