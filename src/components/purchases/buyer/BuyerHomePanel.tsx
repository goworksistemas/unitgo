import { useMemo } from 'react';
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardList,
  FileText,
  LayoutList,
  ShoppingCart,
  Timer,
} from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useNavigation } from '@/hooks/useNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const WORK_SECTION_ID = 'buyer-work';

interface BuyerHomePanelProps {
  /** Quando true (ex.: dev “visualizar como comprador”), mostra fila de todas as SCs com comprador atribuído. */
  relaxedBuyerScope?: boolean;
}

export default function BuyerHomePanel({ relaxedBuyerScope }: BuyerHomePanelProps) {
  const { currentUser } = useApp();
  const { purchaseRequests, quotations, purchaseOrders, isLoadingPurchases } = usePurchases();
  const { setActiveSection } = useNavigation();

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
      <div className="rounded-xl border border-border/60 bg-card p-8 text-center text-muted-foreground text-sm">
        Carregando resumo…
      </div>
    );
  }

  const tiles: {
    title: string;
    value: number;
    hint: string;
    icon: typeof FileText;
    section: string;
    item?: string;
  }[] = [
    {
      title: 'Itens a tratar nas SCs',
      value: stats.scParaTrabalhar,
      hint: 'Cotação em andamento ou aguardando pedido',
      icon: FileText,
      section: WORK_SECTION_ID,
      item: 'buyer-sc',
    },
    {
      title: 'Cotações abertas',
      value: stats.cotacoesAbertas,
      hint: 'Rascunho, enviadas ou com resposta do fornecedor',
      icon: ClipboardList,
      section: WORK_SECTION_ID,
      item: 'buyer-quotations',
    },
    {
      title: 'Pedidos em aprovação',
      value: stats.pedidosEmAprovacao,
      hint: 'Alçada ou revisão pendente',
      icon: ShoppingCart,
      section: WORK_SECTION_ID,
      item: 'buyer-orders',
    },
    {
      title: 'SCs com gestão',
      value: stats.scEmAprovacao,
      hint: 'Aguardando gestor ou diretoria',
      icon: Timer,
      section: WORK_SECTION_ID,
      item: 'buyer-approvals',
    },
  ];

  const go = (section: string, item?: string) => {
    if (item) setActiveSection(section, item);
    else setActiveSection(section);
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Olá — seu painel de compras</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Use os números abaixo para priorizar o dia. Cada bloco abre a tela certa em um clique.
          {relaxedBuyerScope && (
            <span className="block mt-2 text-amber-700 dark:text-amber-400">
              Pré-visualização: métricas incluem todas as SCs com comprador atribuído.
            </span>
          )}
        </p>
      </header>

      <section aria-label="Resumo operacional">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Prioridades
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {tiles.map((t) => (
            <button
              key={t.title}
              type="button"
              onClick={() => go(t.section, t.item)}
              className={cn(
                'text-left rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-all',
                'hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">{t.title}</p>
                  <p className="text-3xl font-semibold tabular-nums tracking-tight">{t.value}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.hint}</p>
                </div>
                <t.icon className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" aria-hidden />
              </div>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
                Abrir
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Atalhos">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-3">
          Acesso rápido
        </h2>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="flex flex-col gap-2 sm:flex-row sm:flex-wrap p-4">
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => go(WORK_SECTION_ID, 'buyer-sc')}>
              <LayoutList className="h-4 w-4" />
              Lista de solicitações
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => go(WORK_SECTION_ID, 'buyer-quotations')}>
              <ClipboardList className="h-4 w-4" />
              Cotações
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => go(WORK_SECTION_ID, 'buyer-orders')}>
              <ShoppingCart className="h-4 w-4" />
              Pedidos
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => go('buyer-indicators')}>
              <BarChart3 className="h-4 w-4" />
              Indicadores
            </Button>
            <Button variant="outline" size="sm" className="justify-start gap-2" onClick={() => go('buyer-suppliers')}>
              <Building2 className="h-4 w-4" />
              Fornecedores
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
