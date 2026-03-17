import { useState, useCallback, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { usePurchases } from '@/contexts/PurchaseContext';
import { ApprovedPurchaseRequestsPanel } from './ApprovedPurchaseRequestsPanel';
import { QuotationsView } from './QuotationsView';
import { BuyerPurchaseOrdersPanel } from './BuyerPurchaseOrdersPanel';
import { PurchaseOrderApprovalPanel } from './PurchaseOrderApprovalPanel';
import { SupplierManagementPanel } from '../admin/SupplierManagementPanel';

const PURCHASE_TABS = [
  { id: 'solicitacoes', label: 'Solicitações Aprovadas' },
  { id: 'cotacoes', label: 'Cotações' },
  { id: 'pedidos', label: 'Pedidos' },
  { id: 'aprovacoes', label: 'Aprovações' },
  { id: 'fornecedores', label: 'Fornecedores' },
] as const;

export function BuyerPurchasesDashboard() {
  const { semAtribuicao, canAccessTab, pendentesAprovacao } = usePurchases();

  const visibleTabs = useMemo(
    () => PURCHASE_TABS.filter((t) => canAccessTab(t.id)),
    [canAccessTab]
  );

  const [activeTab, setActiveTab] = useState(() => visibleTabs[0]?.id ?? 'solicitacoes');
  const [createQuotationSolicitacaoId, setCreateQuotationSolicitacaoId] = useState<string | undefined>();

  const handleNavigateToCreateQuotation = useCallback((solicitacaoId?: string) => {
    setCreateQuotationSolicitacaoId(solicitacaoId);
    setActiveTab('cotacoes');
  }, []);

  const handleQuotationsViewReset = useCallback(() => {
    setCreateQuotationSolicitacaoId(undefined);
  }, []);

  if (visibleTabs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Nenhuma aba de compras habilitada para seu usuário.
      </div>
    );
  }

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList>
        {visibleTabs.map((tab) => (
          <TabsTrigger key={tab.id} value={tab.id}>
            {tab.label}
            {tab.id === 'solicitacoes' && semAtribuicao > 0 && (
              <Badge variant="secondary" className="ml-1.5">{semAtribuicao}</Badge>
            )}
            {tab.id === 'aprovacoes' && pendentesAprovacao > 0 && (
              <Badge variant="secondary" className="ml-1.5">{pendentesAprovacao}</Badge>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {canAccessTab('solicitacoes') && (
        <TabsContent value="solicitacoes">
          <ApprovedPurchaseRequestsPanel onNavigateToCreateQuotation={handleNavigateToCreateQuotation} />
        </TabsContent>
      )}
      {canAccessTab('cotacoes') && (
        <TabsContent value="cotacoes">
          <QuotationsView
            initialCreateSolicitacaoId={createQuotationSolicitacaoId}
            onViewReset={handleQuotationsViewReset}
          />
        </TabsContent>
      )}
      {canAccessTab('pedidos') && (
        <TabsContent value="pedidos"><BuyerPurchaseOrdersPanel /></TabsContent>
      )}
      {canAccessTab('aprovacoes') && (
        <TabsContent value="aprovacoes"><PurchaseOrderApprovalPanel /></TabsContent>
      )}
      {canAccessTab('fornecedores') && (
        <TabsContent value="fornecedores"><SupplierManagementPanel /></TabsContent>
      )}
    </Tabs>
  );
}
