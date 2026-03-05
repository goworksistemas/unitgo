import { useMemo } from 'react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { ClipboardList, FileText, Package, Building2 } from 'lucide-react';
import { ApprovedPurchaseRequestsPanel } from '../purchases/buyer/ApprovedPurchaseRequestsPanel';
import { QuotationManagementPanel } from '../purchases/buyer/QuotationManagementPanel';
import { BuyerPurchaseOrdersPanel } from '../purchases/buyer/BuyerPurchaseOrdersPanel';
import { SupplierManagementPanel } from '../purchases/admin/SupplierManagementPanel';

export function BuyerDashboard() {
  const navigationSections: NavigationSection[] = useMemo(
    () => [
      { id: 'approved-requests', label: 'Solicitações Aprovadas', icon: ClipboardList },
      { id: 'quotations', label: 'Cotações', icon: FileText },
      { id: 'orders', label: 'Pedidos', icon: Package },
      { id: 'suppliers', label: 'Fornecedores', icon: Building2 },
    ],
    []
  );

  const { activeSection } = useDashboardNav(
    navigationSections,
    'Painel do Comprador',
    'Gestão de Compras',
    'approved-requests'
  );

  switch (activeSection) {
    case 'quotations': return <QuotationManagementPanel />;
    case 'orders': return <BuyerPurchaseOrdersPanel />;
    case 'suppliers': return <SupplierManagementPanel />;
    case 'approved-requests':
    default: return <ApprovedPurchaseRequestsPanel />;
  }
}
