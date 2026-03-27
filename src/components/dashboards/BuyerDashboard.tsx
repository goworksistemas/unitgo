import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Home,
  ClipboardCheck,
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Building2,
  ListOrdered,
  PackageCheck,
  Receipt,
  Sparkles,
  PieChart,
  Tags,
  Scale,
  BarChart3,
  Settings,
} from 'lucide-react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationSection } from '@/hooks/useNavigation';
import BuyerHomePanel from '@/components/purchases/buyer/BuyerHomePanel';
import BuyerPurchaseOrderForm from '@/components/purchases/BuyerPurchaseOrderForm';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useApp } from '@/contexts/AppContext';
import type { PurchaseRequestStatus } from '@/types/purchases';
import { Skeleton } from '@/components/ui/skeleton';

const BuyerPurchaseRequestsPanel = lazy(() => import('@/components/purchases/BuyerPurchaseRequestsPanel'));
const BuyerPurchaseOrdersPanel = lazy(() => import('@/components/purchases/BuyerPurchaseOrdersPanel'));
const BuyerApprovalsHubPanel = lazy(() => import('@/components/purchases/buyer/BuyerApprovalsHubPanel'));
const BuyerIndicatorsPanel = lazy(() => import('@/components/purchases/buyer/BuyerIndicatorsPanel'));
const BuyerQuotationsPanel = lazy(() => import('@/components/purchases/buyer/BuyerQuotationsPanel'));
const BuyerSuppliersContractsPanel = lazy(
  () =>
    import('@/components/purchases/admin/BuyerSuppliersContractsPanel').then((m) => ({
      default: m.BuyerSuppliersContractsPanel,
    }))
);
const BuyerOrdersOverviewPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerOrdersOverviewPanel').then((m) => ({
    default: m.BuyerOrdersOverviewPanel,
  }))
);
const BuyerReceivingsPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerReceivingsPanel').then((m) => ({ default: m.BuyerReceivingsPanel }))
);
const BuyerInvoicesPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerInvoicesPanel').then((m) => ({ default: m.BuyerInvoicesPanel }))
);
const BuyerPurchaseSuggestionsPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerPurchaseSuggestionsPanel').then((m) => ({
    default: m.BuyerPurchaseSuggestionsPanel,
  }))
);
const BuyerBudgetPlanningPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerBudgetPlanningPanel').then((m) => ({
    default: m.BuyerBudgetPlanningPanel,
  }))
);
const BuyerPurchaseReportsPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerPurchaseReportsPanel').then((m) => ({
    default: m.BuyerPurchaseReportsPanel,
  }))
);
const BuyerPurchaseSettingsPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerPurchaseSettingsPanel').then((m) => ({
    default: m.BuyerPurchaseSettingsPanel,
  }))
);
const BuyerSupplierCategoriesPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerSupplierCategoriesPanel').then((m) => ({
    default: m.BuyerSupplierCategoriesPanel,
  }))
);
const BuyerApprovalTiersInfoPanel = lazy(() =>
  import('@/components/purchases/buyer/BuyerApprovalTiersInfoPanel').then((m) => ({
    default: m.BuyerApprovalTiersInfoPanel,
  }))
);

const SECTION_META: Record<string, { title: string; subtitle?: string }> = {
  'buyer-home': {
    title: 'Início',
    subtitle: 'Resumo e atalhos do seu trabalho',
  },
  'buyer-sc': {
    title: 'Solicitações',
    subtitle: 'Solicitações de compra abertas pelos usuários — o ponto de entrada do fluxo',
  },
  'buyer-orders-overview': {
    title: 'Ordens de pedidos',
    subtitle: 'Visão geral dos pedidos de compra em andamento',
  },
  'buyer-quotations': {
    title: 'Cotações',
    subtitle: 'Cotações enviadas a fornecedores para uma requisição',
  },
  'buyer-orders': {
    title: 'Pedidos',
    subtitle: 'Pedidos de compra gerados a partir da cotação vencedora',
  },
  'buyer-approvals': {
    title: 'Aprovações',
    subtitle: 'SCs e pedidos aguardando gestão ou alçada',
  },
  'buyer-receivings': {
    title: 'Recebimentos',
    subtitle: 'Registro do recebimento físico dos itens comprados',
  },
  'buyer-invoices': {
    title: 'Notas recebidas',
    subtitle: 'Notas fiscais vinculadas aos pedidos recebidos',
  },
  'buyer-suggestions': {
    title: 'Sugestões de compras',
    subtitle: 'Itens com estoque abaixo do mínimo que precisam ser recomprados',
  },
  'buyer-budget': {
    title: 'Planejamento orçamentário',
    subtitle: 'Gastos previstos vs realizados por centro de custo ou contrato',
  },
  'buyer-suppliers': {
    title: 'Fornecedores e contratos',
    subtitle: 'Cadastro de fornecedores e contratos',
  },
  'buyer-mgmt-categories': {
    title: 'Categorias de fornecedor',
    subtitle: 'Classificação usada no cadastro de fornecedores',
  },
  'buyer-mgmt-approvals': {
    title: 'Alçadas de aprovação',
    subtitle: 'Fluxo de decisão para solicitações e pedidos',
  },
  'buyer-reports': {
    title: 'Relatórios',
    subtitle: 'Exportações e histórico de compras',
  },
  'buyer-purchase-config': {
    title: 'Configurações',
    subtitle: 'Moedas, centros de custo e orientações sobre regras do módulo',
  },
  'buyer-indicators': {
    title: 'Dashboard',
    subtitle: 'Volume e valor dos seus pedidos',
  },
};

const WORK_SECTION_ID = 'buyer-work';

function resolveBuyerPanelKey(activeSection: string, activeItem?: string): string {
  if (activeSection === WORK_SECTION_ID && activeItem) return activeItem;
  return activeSection;
}

function BuyerRouteSkeleton() {
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-6 shadow-sm">
      <div className="space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="flex flex-wrap gap-2 pt-2">
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-24" />
      </div>
      <Skeleton className="h-[280px] w-full rounded-lg" />
    </div>
  );
}

export interface BuyerDashboardProps {
  /** Quando true (modo dev “visualizar como comprador”), amplia filtros para fila global atribuída. */
  viewAsBuyerMode?: boolean;
}

export function BuyerDashboard({ viewAsBuyerMode }: BuyerDashboardProps) {
  const { currentUser } = useApp();
  const { refreshPurchases, purchaseRequests, purchaseOrders } = usePurchases();
  const { setTitle, setActiveSection } = useNavigation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const relaxed = !!viewAsBuyerMode;

  const approvalsBadge = useMemo(() => {
    if (!currentUser) return undefined;
    const myRequestIds = new Set(
      purchaseRequests
        .filter((r) => {
          if (!r.compradorId) return false;
          if (relaxed) return true;
          return r.compradorId === currentUser.id;
        })
        .map((r) => r.id)
    );
    const scN = purchaseRequests.filter(
      (r) =>
        myRequestIds.has(r.id) &&
        (['pending_manager', 'pending_director'] as PurchaseRequestStatus[]).includes(r.status)
    ).length;
    const pedN = purchaseOrders.filter((o) => {
      const sa = o.statusAprovacao ?? 'pendente';
      if (sa !== 'pendente' && sa !== 'em_revisao') return false;
      if (!o.compradorId) return false;
      if (relaxed) return true;
      return o.compradorId === currentUser.id;
    }).length;
    const n = scN + pedN;
    return n > 0 ? n : undefined;
  }, [currentUser, purchaseRequests, purchaseOrders, relaxed]);

  const navigationSections: NavigationSection[] = useMemo(
    () => [
      { id: 'buyer-home', label: 'Início', icon: Home, sidebarGroup: 'inicio' },
      {
        id: 'buyer-indicators',
        label: 'Dashboard',
        icon: LayoutDashboard,
        sidebarGroup: 'inicio',
      },
      {
        id: WORK_SECTION_ID,
        label: 'Compras',
        icon: ShoppingCart,
        sidebarGroup: 'modulos',
        items: [
          { id: 'buyer-sc', label: 'Solicitações', icon: FileText },
          { id: 'buyer-orders-overview', label: 'Ordens de pedidos', icon: ListOrdered },
          { id: 'buyer-quotations', label: 'Cotações', icon: FileSpreadsheet },
          { id: 'buyer-orders', label: 'Pedidos', icon: ShoppingCart },
          { id: 'buyer-approvals', label: 'Aprovações', icon: ClipboardCheck, badge: approvalsBadge },
          { id: 'buyer-receivings', label: 'Recebimentos', icon: PackageCheck },
          { id: 'buyer-invoices', label: 'Notas recebidas', icon: Receipt },
          { id: 'buyer-suggestions', label: 'Sugestões de compras', icon: Sparkles },
          { id: 'buyer-budget', label: 'Planejamento orçamentário', icon: PieChart },
          {
            id: 'buyer-suppliers',
            label: 'Fornecedores e contratos',
            icon: Building2,
            group: 'Gerenciamento',
          },
          {
            id: 'buyer-mgmt-categories',
            label: 'Categorias de fornecedor',
            icon: Tags,
            group: 'Gerenciamento',
          },
          {
            id: 'buyer-mgmt-approvals',
            label: 'Alçadas de aprovação',
            icon: Scale,
            group: 'Gerenciamento',
          },
          {
            id: 'buyer-reports',
            label: 'Relatórios',
            icon: BarChart3,
            group: 'Relatórios',
          },
          { id: 'buyer-purchase-config', label: 'Configurações', icon: Settings },
        ],
      },
    ],
    [approvalsBadge]
  );

  const { activeSection, activeItem } = useDashboardNav(
    navigationSections,
    SECTION_META['buyer-home'].title,
    SECTION_META['buyer-home'].subtitle,
    'buyer-home'
  );

  const panelKey = resolveBuyerPanelKey(activeSection, activeItem);

  useEffect(() => {
    if (activeSection === WORK_SECTION_ID && !activeItem) {
      setActiveSection(WORK_SECTION_ID, 'buyer-sc');
    }
  }, [activeSection, activeItem, setActiveSection]);

  useEffect(() => {
    const m = SECTION_META[panelKey] ?? SECTION_META['buyer-home'];
    const subtitle = viewAsBuyerMode
      ? `${m.subtitle ?? ''} · Pré-visualização (desenvolvedor)`.trim()
      : m.subtitle;
    setTitle(m.title, subtitle);
  }, [panelKey, viewAsBuyerMode, setTitle]);

  const openForm = (orderId: string | null) => {
    setEditingOrderId(orderId);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-[1600px] mx-auto">
      {panelKey === 'buyer-home' && <BuyerHomePanel relaxedBuyerScope={relaxed} />}

      <Suspense fallback={<BuyerRouteSkeleton />}>
        {panelKey === 'buyer-approvals' && (
          <BuyerApprovalsHubPanel relaxedBuyerScope={relaxed} onOpenOrder={(id) => openForm(id)} />
        )}

        {panelKey === 'buyer-indicators' && <BuyerIndicatorsPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-sc' && <BuyerPurchaseRequestsPanel simulatedBuyer={relaxed} />}

        {panelKey === 'buyer-orders-overview' && (
          <BuyerOrdersOverviewPanel relaxedBuyerScope={relaxed} />
        )}

        {panelKey === 'buyer-quotations' && <BuyerQuotationsPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-orders' && (
          <BuyerPurchaseOrdersPanel onOpenOrderForm={openForm} simulatedBuyer={relaxed} />
        )}

        {panelKey === 'buyer-suppliers' && <BuyerSuppliersContractsPanel />}

        {panelKey === 'buyer-receivings' && <BuyerReceivingsPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-invoices' && <BuyerInvoicesPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-suggestions' && (
          <BuyerPurchaseSuggestionsPanel relaxedBuyerScope={relaxed} />
        )}

        {panelKey === 'buyer-budget' && <BuyerBudgetPlanningPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-reports' && <BuyerPurchaseReportsPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-purchase-config' && <BuyerPurchaseSettingsPanel />}

        {panelKey === 'buyer-mgmt-categories' && <BuyerSupplierCategoriesPanel />}

        {panelKey === 'buyer-mgmt-approvals' && <BuyerApprovalTiersInfoPanel />}
      </Suspense>

      <BuyerPurchaseOrderForm
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setEditingOrderId(null);
        }}
        orderId={editingOrderId}
        onSaved={() => {
          refreshPurchases();
        }}
      />
    </div>
  );
}
