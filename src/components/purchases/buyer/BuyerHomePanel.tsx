import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, FileText, ShoppingCart, Timer } from 'lucide-react';

interface BuyerHomePanelProps {
  /** Quando true (ex.: dev “visualizar como comprador”), mostra fila de todas as SCs com comprador atribuído. */
  relaxedBuyerScope?: boolean;
}

export default function BuyerHomePanel({ relaxedBuyerScope }: BuyerHomePanelProps) {
  const { currentUser } = useApp();
  const { purchaseRequests, quotations, purchaseOrders, isLoadingPurchases } = usePurchases();

  const stats = useMemo(() => {
    if (!currentUser) {
      return {
        scParaTrabalhar: 0,
        cotacoesAbertas: 0,
        pedidosEmAprovacao: 0,
        scEmAprovacao: 0,
      };
    }
    const mySc = purchaseRequests.filter((r) => {
      if (!r.compradorId) return false;
      if (relaxedBuyerScope) return true;
      return r.compradorId === currentUser.id;
    });

    const scParaTrabalhar = mySc.filter((r) =>
      ['in_quotation', 'quotation_completed', 'in_purchase'].includes(r.status)
    ).length;

    const myScIds = new Set(mySc.map((r) => r.id));
    const cotacoesAbertas = quotations.filter(
      (q) => myScIds.has(q.solicitacaoId) && ['draft', 'sent', 'responded'].includes(q.status)
    ).length;

    const pedidosEmAprovacao = purchaseOrders.filter((o) => {
      if (!o.compradorId) return false;
      if (!relaxedBuyerScope && o.compradorId !== currentUser.id) return false;
      const sa = o.statusAprovacao ?? 'pendente';
      return sa === 'pendente' || sa === 'em_revisao';
    }).length;

    const scEmAprovacao = mySc.filter((r) =>
      ['pending_manager', 'pending_director'].includes(r.status)
    ).length;

    return { scParaTrabalhar, cotacoesAbertas, pedidosEmAprovacao, scEmAprovacao };
  }, [currentUser, purchaseRequests, quotations, purchaseOrders, relaxedBuyerScope]);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando resumo…</CardContent>
      </Card>
    );
  }

  const tiles = [
    {
      title: 'SCs na sua fila',
      value: stats.scParaTrabalhar,
      desc: 'Cotar, concluir cotação ou acompanhar compra',
      icon: FileText,
    },
    {
      title: 'Cotações em andamento',
      value: stats.cotacoesAbertas,
      desc: 'Rascunho, enviadas ou aguardando resposta',
      icon: ClipboardList,
    },
    {
      title: 'Pedidos em aprovação',
      value: stats.pedidosEmAprovacao,
      desc: 'Aguardando alçada / revisão',
      icon: ShoppingCart,
    },
    {
      title: 'SCs em aprovação gestão',
      value: stats.scEmAprovacao,
      desc: 'Gestor ou diretoria ainda não liberaram',
      icon: Timer,
    },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Página inicial do comprador</h2>
        <p className="text-sm text-muted-foreground">
          Resumo do que está pendente para você trabalhar ou acompanhar.
          {relaxedBuyerScope && (
            <span className="block mt-1 text-amber-700 dark:text-amber-400">
              Modo pré-visualização: métricas consideram todas as SCs com comprador atribuído.
            </span>
          )}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((t) => (
          <Card key={t.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{t.title}</CardTitle>
              <t.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums">{t.value}</div>
              <CardDescription className="text-xs mt-1">{t.desc}</CardDescription>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
