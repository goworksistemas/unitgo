import { useCallback } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, FileSpreadsheet } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { filterOrdersForBuyer, filterRequestsForBuyer } from './buyerScope';

function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface BuyerPurchaseReportsPanelProps {
  relaxedBuyerScope?: boolean;
}

export function BuyerPurchaseReportsPanel({ relaxedBuyerScope }: BuyerPurchaseReportsPanelProps) {
  const { currentUser } = useApp();
  const { purchaseRequests, purchaseOrders, quotations, isLoadingPurchases } = usePurchases();

  const exportRequests = useCallback(() => {
    const rows = filterRequestsForBuyer(purchaseRequests, currentUser, !!relaxedBuyerScope);
    const header = 'ID;Status;Valor;Atualizado';
    const lines = rows.map((r) => {
      return `${r.id};${r.status};;${format(new Date(r.updatedAt), 'yyyy-MM-dd', { locale: ptBR })}`;
    });
    downloadCsv(`solicitacoes-compra-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, [header, ...lines].join('\n'));
    toast.success('Arquivo de solicitações gerado.');
  }, [purchaseRequests, currentUser, relaxedBuyerScope]);

  const exportOrders = useCallback(() => {
    const rows = filterOrdersForBuyer(purchaseOrders, currentUser, !!relaxedBuyerScope);
    const header = 'ID;Status;StatusAprovacao;Valor;Criado';
    const lines = rows.map((o) =>
      [
        o.id,
        o.status,
        o.statusAprovacao ?? '',
        (o.valorTotal ?? 0).toFixed(2),
        format(new Date(o.createdAt), 'yyyy-MM-dd', { locale: ptBR }),
      ].join(';'),
    );
    downloadCsv(`pedidos-compra-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, [header, ...lines].join('\n'));
    toast.success('Arquivo de pedidos gerado.');
  }, [purchaseOrders, currentUser, relaxedBuyerScope]);

  const exportQuotations = useCallback(() => {
    const myReqIds = new Set(
      filterRequestsForBuyer(purchaseRequests, currentUser, !!relaxedBuyerScope).map((r) => r.id),
    );
    const rows = quotations.filter((q) => myReqIds.has(q.solicitacaoId));
    const header = 'ID;Solicitacao;Status;Valor;Atualizado';
    const lines = rows.map((q) =>
      [
        q.id,
        q.solicitacaoId,
        q.status,
        (q.totalGeral ?? 0).toFixed(2),
        format(new Date(q.updatedAt), 'yyyy-MM-dd', { locale: ptBR }),
      ].join(';'),
    );
    downloadCsv(`cotacoes-${format(new Date(), 'yyyyMMdd-HHmm')}.csv`, [header, ...lines].join('\n'));
    toast.success('Arquivo de cotações gerado.');
  }, [quotations, purchaseRequests, currentUser, relaxedBuyerScope]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Exportações em CSV para análise externa e auditoria — limitadas ao seu escopo de comprador.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            </div>
            <CardTitle className="text-base pt-2">Solicitações de compra</CardTitle>
            <CardDescription>Linhas com status, referência e data de atualização.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full gap-2"
              variant="secondary"
              disabled={isLoadingPurchases}
              onClick={exportRequests}
            >
              <Download className="h-4 w-4" />
              Baixar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm flex flex-col">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400">
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            </div>
            <CardTitle className="text-base pt-2">Cotações</CardTitle>
            <CardDescription>Cotações vinculadas às suas solicitações.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full gap-2"
              variant="secondary"
              disabled={isLoadingPurchases}
              onClick={exportQuotations}
            >
              <Download className="h-4 w-4" />
              Baixar CSV
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm flex flex-col md:col-span-2 xl:col-span-1">
          <CardHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" aria-hidden />
            </div>
            <CardTitle className="text-base pt-2">Pedidos de compra</CardTitle>
            <CardDescription>Status logístico, aprovação e valores.</CardDescription>
          </CardHeader>
          <CardContent className="mt-auto pt-0">
            <Button
              className="w-full gap-2"
              variant="secondary"
              disabled={isLoadingPurchases}
              onClick={exportOrders}
            >
              <Download className="h-4 w-4" />
              Baixar CSV
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed border-border/80 bg-muted/20">
        <CardContent className="py-4 text-sm text-muted-foreground">
          Relatórios agendados e painéis executivos podem ser conectados ao BI corporativo em uma próxima etapa.
        </CardContent>
      </Card>
    </div>
  );
}
