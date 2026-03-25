import { useEffect, useMemo, useState } from 'react';
import {
  Home,
  ClipboardCheck,
  BarChart3,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Building2,
} from 'lucide-react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationSection } from '@/hooks/useNavigation';
import BuyerPurchaseRequestsPanel from '@/components/purchases/BuyerPurchaseRequestsPanel';
import BuyerPurchaseOrdersPanel from '@/components/purchases/BuyerPurchaseOrdersPanel';
import BuyerPurchaseOrderForm from '@/components/purchases/BuyerPurchaseOrderForm';
import { SupplierManagementPanel } from '@/components/purchases/admin/SupplierManagementPanel';
import BuyerHomePanel from '@/components/purchases/buyer/BuyerHomePanel';
import BuyerApprovalsHubPanel from '@/components/purchases/buyer/BuyerApprovalsHubPanel';
import BuyerIndicatorsPanel from '@/components/purchases/buyer/BuyerIndicatorsPanel';
import BuyerQuotationsPanel from '@/components/purchases/buyer/BuyerQuotationsPanel';
import { usePurchases } from '@/contexts/PurchaseContext';

const SECTION_META: Record<string, { title: string; subtitle?: string }> = {
  'buyer-home': {
    title: 'Home',
    subtitle: 'Resumo do que está pendente para o comprador',
  },
  'buyer-approvals': {
    title: 'Central de Aprovações',
    subtitle: 'SCs e pedidos aguardando aprovação ou alçada',
  },
  'buyer-indicators': {
    title: 'Indicadores',
    subtitle: 'Volume, valor e evolução dos pedidos',
  },
  'buyer-sc': {
    title: 'Solicitação de Compra',
    subtitle: 'SCs atribuídas — cotar, gerar pedido, acompanhar',
  },
  'buyer-quotations': {
    title: 'Cotação',
    subtitle: 'Cotações com fornecedores para as SCs recebidas',
  },
  'buyer-orders': {
    title: 'Pedidos de Compra',
    subtitle: 'Pedidos gerados — aprovação e entrega',
  },
  'buyer-suppliers': {
    title: 'Fornecedores',
    subtitle: 'Cadastro e consulta de fornecedores',
  },
};

export interface BuyerDashboardProps {
  /** Quando true (modo dev “visualizar como comprador”), amplia filtros para fila global atribuída. */
  viewAsBuyerMode?: boolean;
}

export function BuyerDashboard({ viewAsBuyerMode }: BuyerDashboardProps) {
  const { refreshPurchases } = usePurchases();
  const { setTitle } = useNavigation();
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const navigationSections: NavigationSection[] = useMemo(
    () => [
      { id: 'buyer-home', label: 'Home', icon: Home },
      { id: 'buyer-approvals', label: 'Central de Aprovações', icon: ClipboardCheck },
      { id: 'buyer-indicators', label: 'Indicadores', icon: BarChart3 },
      { id: 'buyer-sc', label: 'Solicitação de Compra', icon: FileText },
      { id: 'buyer-quotations', label: 'Cotação', icon: FileSpreadsheet },
      { id: 'buyer-orders', label: 'Pedidos de Compra', icon: ShoppingCart },
      { id: 'buyer-suppliers', label: 'Fornecedores', icon: Building2 },
    ],
    []
  );

  const { activeSection } = useDashboardNav(
    navigationSections,
    SECTION_META['buyer-home'].title,
    SECTION_META['buyer-home'].subtitle,
    'buyer-home'
  );

  useEffect(() => {
    const m = SECTION_META[activeSection] ?? SECTION_META['buyer-home'];
    const subtitle = viewAsBuyerMode
      ? `${m.subtitle ?? ''} · Pré-visualização (desenvolvedor)`.trim()
      : m.subtitle;
    setTitle(m.title, subtitle);
  }, [activeSection, viewAsBuyerMode, setTitle]);

  const openForm = (orderId: string | null) => {
    setEditingOrderId(orderId);
    setFormOpen(true);
  };

  const relaxed = !!viewAsBuyerMode;

  return (
    <div className="space-y-4 p-4 md:p-6 max-w-[1600px] mx-auto">
      {activeSection === 'buyer-home' && <BuyerHomePanel relaxedBuyerScope={relaxed} />}

      {activeSection === 'buyer-approvals' && (
        <BuyerApprovalsHubPanel
          relaxedBuyerScope={relaxed}
          onOpenOrder={(id) => openForm(id)}
        />
      )}

      {activeSection === 'buyer-indicators' && <BuyerIndicatorsPanel relaxedBuyerScope={relaxed} />}

      {activeSection === 'buyer-sc' && (
        <BuyerPurchaseRequestsPanel simulatedBuyer={relaxed} />
      )}

      {activeSection === 'buyer-quotations' && <BuyerQuotationsPanel relaxedBuyerScope={relaxed} />}

      {activeSection === 'buyer-orders' && (
        <BuyerPurchaseOrdersPanel onOpenOrderForm={openForm} simulatedBuyer={relaxed} />
      )}

      {activeSection === 'buyer-suppliers' && <SupplierManagementPanel />}

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
