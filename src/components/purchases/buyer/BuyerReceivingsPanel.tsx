import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import type { Receiving, ReceivingStatus } from '@/types/purchases';
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

function receivingStatusLabel(s: ReceivingStatus): string {
  const map: Record<ReceivingStatus, string> = {
    pending: 'Pendente',
    partially_received: 'Parcial',
    fully_received: 'Completo',
  };
  return map[s];
}

export interface BuyerReceivingsPanelProps {
  relaxedBuyerScope?: boolean;
}

export function BuyerReceivingsPanel({ relaxedBuyerScope }: BuyerReceivingsPanelProps) {
  const { currentUser, getItemById } = useApp();
  const { receivings, purchaseOrders, isLoadingPurchases } = usePurchases();

  const myOrderIds = useMemo(() => {
    const mine = filterOrdersForBuyer(purchaseOrders, currentUser, !!relaxedBuyerScope);
    return new Set(mine.map((o) => o.id));
  }, [purchaseOrders, currentUser, relaxedBuyerScope]);

  const rows = useMemo(() => {
    return receivings
      .filter((r) => myOrderIds.has(r.pedidoId))
      .map((r) => ({
        ...r,
        itemName: getItemById(r.itemId)?.name ?? r.itemId.slice(0, 8),
        orderRef: purchaseOrders.find((o) => o.id === r.pedidoId),
      }))
      .sort(
        (a, b) =>
          new Date(b.dataRecebimento).getTime() - new Date(a.dataRecebimento).getTime(),
      );
  }, [receivings, myOrderIds, getItemById, purchaseOrders]);

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando recebimentos…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Recebimentos</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Registro do recebimento físico dos itens comprados, vinculado aos seus pedidos.
        </p>
      </header>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30">
          <CardTitle className="text-base">Histórico</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? 'Nenhum recebimento registrado para os seus pedidos.'
              : `${rows.length} lançamento(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4">
              Quando o almoxarifado ou a unidade registrar recebimento contra um pedido seu, as linhas
              aparecerão aqui.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pedido</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Qtd. esperada</TableHead>
                  <TableHead className="text-right">Qtd. recebida</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">
                      {r.orderRef?.numeroOmie ?? r.pedidoId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">{r.itemName}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantidadeEsperada}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.quantidadeRecebida}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {receivingStatusLabel(r.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
                      {r.localEntrega}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {format(new Date(r.dataRecebimento), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
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
