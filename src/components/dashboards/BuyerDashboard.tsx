import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  Home,
  ClipboardCheck,
  BarChart3,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Building2,
  Briefcase,
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
const SupplierManagementPanel = lazy(
  () =>
    import('@/components/purchases/admin/SupplierManagementPanel').then((m) => ({
      default: m.SupplierManagementPanel,
    }))
);

const SECTION_META: Record<string, { title: string; subtitle?: string }> = {
  'buyer-home': {
    title: 'Início',
    subtitle: 'Resumo e atalhos do seu trabalho',
  },
  'buyer-sc': {
    title: 'Solicitações de compra',
    subtitle: 'SCs da sua fila — itens a cotar e acompanhar',
  },
  'buyer-quotations': {
    title: 'Cotações',
    subtitle: 'Propostas de fornecedores vinculadas às suas SCs',
  },
  'buyer-orders': {
    title: 'Pedidos de compra',
    subtitle: 'PCs emitidos — aprovação, envio e entrega',
  },
  'buyer-approvals': {
    title: 'Fila de aprovações',
    subtitle: 'SCs e pedidos aguardando gestão ou alçada',
  },
  'buyer-indicators': {
    title: 'Indicadores',
    subtitle: 'Volume e valor dos seus pedidos',
  },
  'buyer-suppliers': {
    title: 'Fornecedores',
    subtitle: 'Cadastro e consulta',
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
      { id: 'buyer-home', label: 'Início', icon: Home },
      {
        id: WORK_SECTION_ID,
        label: 'Operação',
        icon: Briefcase,
        items: [
          { id: 'buyer-sc', label: 'Solicitações', icon: FileText },
          { id: 'buyer-quotations', label: 'Cotações', icon: FileSpreadsheet },
          { id: 'buyer-orders', label: 'Pedidos', icon: ShoppingCart },
          { id: 'buyer-approvals', label: 'Aprovações', icon: ClipboardCheck, badge: approvalsBadge },
        ],
      },
      { id: 'buyer-indicators', label: 'Indicadores', icon: BarChart3 },
      { id: 'buyer-suppliers', label: 'Fornecedores', icon: Building2 },
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

        {panelKey === 'buyer-quotations' && <BuyerQuotationsPanel relaxedBuyerScope={relaxed} />}

        {panelKey === 'buyer-orders' && (
          <BuyerPurchaseOrdersPanel onOpenOrderForm={openForm} simulatedBuyer={relaxed} />
        )}

        {panelKey === 'buyer-suppliers' && <SupplierManagementPanel />}
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
