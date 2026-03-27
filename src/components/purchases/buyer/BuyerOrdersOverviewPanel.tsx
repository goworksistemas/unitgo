import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { filterOrdersForBuyer } from './buyerScope';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function statusLabel(s: PurchaseOrderStatus): string {
  const map: Record<PurchaseOrderStatus, string> = {
    created: 'Criado',
    awaiting_nf: 'Aguardando NF',
    nf_issued: 'NF emitida',
    in_transit: 'Em trânsito',
    partially_received: 'Recebido parcial',
    fully_received: 'Concluído',
  };
  return map[s] ?? s;
}

export interface BuyerOrdersOverviewPanelProps {
  relaxedBuyerScope?: boolean;
}

export function BuyerOrdersOverviewPanel({ relaxedBuyerScope }: BuyerOrdersOverviewPanelProps) {
  const { currentUser } = useApp();
  const { purchaseOrders, isLoadingPurchases } = usePurchases();

  const mine = useMemo(
    () => filterOrdersForBuyer(purchaseOrders, currentUser, !!relaxedBuyerScope),
    [purchaseOrders, currentUser, relaxedBuyerScope],
  );

  const stats = useMemo(() => {
    const emAprovacao = mine.filter(
      (o) => o.statusAprovacao === 'pendente' || o.statusAprovacao === 'em_revisao',
    ).length;
    const posAprovacao = mine.filter(
      (o) =>
        o.statusAprovacao === 'aprovado' &&
        !['fully_received', 'partially_received'].includes(o.status),
    ).length;
    const logistica = mine.filter((o) =>
      ['nf_issued', 'in_transit', 'awaiting_nf'].includes(o.status),
    ).length;
    const concluidos = mine.filter((o) => o.status === 'fully_received').length;
    return { emAprovacao, posAprovacao, logistica, concluidos, total: mine.length };
  }, [mine]);

  const recent = useMemo(() => {
    return [...mine]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 15);
  }, [mine]);

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando pedidos…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Ordens de pedidos</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Visão geral dos pedidos de compra em andamento no seu escopo — aprovação, emissão de NF e entrega.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.emAprovacao}</p>
            <CardDescription className="text-xs mt-1">Aguardando alçada ou revisão</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pós-aprovação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.posAprovacao}</p>
            <CardDescription className="text-xs mt-1">Liberados, ainda não finalizados</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">NF / trânsito</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.logistica}</p>
            <CardDescription className="text-xs mt-1">Emissão ou transporte</CardDescription>
          </CardContent>
        </Card>
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold tabular-nums">{stats.concluidos}</p>
            <CardDescription className="text-xs mt-1">Recebimento total</CardDescription>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30">
          <CardTitle className="text-base">Pedidos recentes</CardTitle>
          <CardDescription>
            {stats.total} pedido(s) no escopo · use a tela <strong>Pedidos</strong> para ações e filtros completos.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recent.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4">
              Nenhum pedido no seu escopo ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">Referência</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Aprovação</TableHead>
                  <TableHead>Logística</TableHead>
                  <TableHead className="text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">
                      {o.numeroOmie ?? o.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="tabular-nums">{fmt(o.valorTotal)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-normal">
                        {o.statusAprovacao === 'aprovado'
                          ? 'Liberado'
                          : o.statusAprovacao === 'reprovado'
                            ? 'Rejeitado'
                            : 'Pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {statusLabel(o.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm">
                      {format(new Date(o.updatedAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
