import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export interface BuyerInvoicesPanelProps {
  relaxedBuyerScope?: boolean;
}

export function BuyerInvoicesPanel({ relaxedBuyerScope }: BuyerInvoicesPanelProps) {
  const { currentUser } = useApp();
  const { purchaseOrders, isLoadingPurchases } = usePurchases();

  const rows = useMemo(() => {
    const mine = filterOrdersForBuyer(purchaseOrders, currentUser, !!relaxedBuyerScope);
    const out: {
      orderId: string;
      orderRef: string;
      numero: string;
      valor: number;
      dataEmissao: Date;
      chave?: string;
    }[] = [];
    for (const o of mine) {
      const nfs = o.notasFiscais ?? [];
      for (const n of nfs) {
        out.push({
          orderId: o.id,
          orderRef: o.numeroOmie ?? o.id.slice(0, 8),
          numero: n.numero,
          valor: n.valor,
          dataEmissao: n.dataEmissao instanceof Date ? n.dataEmissao : new Date(n.dataEmissao as unknown as string),
          chave: n.chaveAcesso,
        });
      }
    }
    return out.sort((a, b) => b.dataEmissao.getTime() - a.dataEmissao.getTime());
  }, [purchaseOrders, currentUser, relaxedBuyerScope]);

  if (isLoadingPurchases) {
    return (
      <Card className="border-border/60 shadow-sm">
        <CardContent className="py-14 text-center text-sm text-muted-foreground">
          Carregando notas…
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Notas recebidas</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Notas fiscais vinculadas aos pedidos recebidos no seu escopo (dados informados no cadastro do pedido).
        </p>
      </header>

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30">
          <CardTitle className="text-base">Notas fiscais</CardTitle>
          <CardDescription>
            {rows.length === 0
              ? 'Nenhuma NF cadastrada nos pedidos.'
              : `${rows.length} nota(s) encontrada(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4 max-w-lg mx-auto">
              Inclua número, valor e data ao registrar a NF no pedido de compra. Integrações futuras podem puxar
              automaticamente da prefeitura ou ERP.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Pedido</TableHead>
                  <TableHead>Nº NF</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Emissão</TableHead>
                  <TableHead>Chave de acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={`${r.orderId}-${r.numero}-${i}`}>
                    <TableCell className="font-mono text-xs">{r.orderRef}</TableCell>
                    <TableCell className="font-medium">{r.numero}</TableCell>
                    <TableCell className="tabular-nums">{fmt(r.valor)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(r.dataEmissao, 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[200px] truncate text-muted-foreground">
                      {r.chave ?? '—'}
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
