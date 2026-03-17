import { useMemo, useState, useCallback } from 'react';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';
import { useAllowedTabs } from '@/hooks/useAllowedTabs';
import { ClipboardList, FileText, Package, Building2, ScrollText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { ApprovedPurchaseRequestsPanel } from '../purchases/buyer/ApprovedPurchaseRequestsPanel';
import { QuotationsView } from '../purchases/buyer/QuotationsView';
import { BuyerPurchaseOrdersPanel } from '../purchases/buyer/BuyerPurchaseOrdersPanel';
import { SupplierManagementPanel } from '../purchases/admin/SupplierManagementPanel';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';

const SECTION_TAB_MAP: Record<string, string> = {
  'approved-requests': 'compras.solicitacoes',
  'quotations': 'compras.cotacoes',
  'orders': 'compras.pedidos',
  'suppliers': 'compras.fornecedores',
};

export function BuyerDashboard() {
  const { canAccessTab } = useAllowedTabs();

  const allSections: NavigationSection[] = useMemo(
    () => [
      { id: 'approved-requests', label: 'Solicitações Aprovadas', icon: ClipboardList },
      { id: 'quotations', label: 'Cotações', icon: FileText },
      { id: 'orders', label: 'Pedidos', icon: Package },
      { id: 'suppliers', label: 'Fornecedores', icon: Building2 },
    ],
    []
  );

  const navigationSections = useMemo(
    () => allSections.filter((s) => {
      const tabId = SECTION_TAB_MAP[s.id];
      return !tabId || canAccessTab(tabId);
    }),
    [allSections, canAccessTab]
  );

  const { activeSection, setActiveSection } = useDashboardNav(
    navigationSections,
    'Painel do Comprador',
    'Gestão de Compras',
    'approved-requests'
  );

  const [createQuotationSolicitacaoId, setCreateQuotationSolicitacaoId] = useState<string | undefined>();
  const handleNavigateToCreateQuotation = useCallback((solicitacaoId?: string) => {
    setCreateQuotationSolicitacaoId(solicitacaoId);
    setActiveSection('quotations');
  }, [setActiveSection]);

  switch (activeSection) {
    case 'quotations':
      return (
        <QuotationsView
          initialCreateSolicitacaoId={createQuotationSolicitacaoId}
          onViewReset={() => setCreateQuotationSolicitacaoId(undefined)}
        />
      );
    case 'orders': return <BuyerPurchaseOrdersPanel />;
    case 'suppliers': return <SupplierManagementPanel />;
    case 'approved-requests':
    default:
      return (
        <Tabs defaultValue="solicitacoes" className="w-full">
          <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
            <TabsTrigger
              value="solicitacoes"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
            >
              <ClipboardList className="h-4 w-4 shrink-0" />
              Solicitações Aprovadas
            </TabsTrigger>
            <TabsTrigger
              value="historico"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
            >
              <ScrollText className="h-4 w-4 shrink-0" />
              Histórico
            </TabsTrigger>
          </TabsList>
          <TabsContent value="solicitacoes" className="mt-4">
            <ApprovedPurchaseRequestsPanel onNavigateToCreateQuotation={handleNavigateToCreateQuotation} />
          </TabsContent>
          <TabsContent value="historico" className="mt-4">
            <UnitMovementsHistory />
          </TabsContent>
        </Tabs>
      );
  }
}
