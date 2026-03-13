import { useMemo } from 'react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { ClipboardList, FileText, Package, Building2, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ApprovedPurchaseRequestsPanel } from '../purchases/buyer/ApprovedPurchaseRequestsPanel';
import { QuotationManagementPanel } from '../purchases/buyer/QuotationManagementPanel';
import { BuyerPurchaseOrdersPanel } from '../purchases/buyer/BuyerPurchaseOrdersPanel';
import { SupplierManagementPanel } from '../purchases/admin/SupplierManagementPanel';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';

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
    default:
      return (
        <Tabs defaultValue="solicitacoes" className="w-full">
          <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0">
            <TabsTrigger
              value="solicitacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-foreground text-muted-foreground px-3 py-2 text-xs data-[state=active]:font-medium"
            >
              Solicitações Aprovadas
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:text-foreground text-muted-foreground px-3 py-2 text-xs data-[state=active]:font-medium flex items-center gap-1.5"
            >
              <ScrollText className="h-3.5 w-3.5" />
              Histórico
            </TabsTrigger>
          </TabsList>
          <TabsContent value="solicitacoes" className="mt-4">
            <ApprovedPurchaseRequestsPanel />
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <UnitMovementsHistory />
          </TabsContent>
        </Tabs>
      );
  }
}
