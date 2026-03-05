import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApprovedPurchaseRequestsPanel } from './ApprovedPurchaseRequestsPanel';
import { QuotationManagementPanel } from './QuotationManagementPanel';
import { BuyerPurchaseOrdersPanel } from './BuyerPurchaseOrdersPanel';
import { SupplierManagementPanel } from '../admin/SupplierManagementPanel';

export function BuyerPurchasesDashboard() {
  return (
    <Tabs defaultValue="solicitacoes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="solicitacoes">Solicitações Aprovadas</TabsTrigger>
        <TabsTrigger value="cotacoes">Cotações</TabsTrigger>
        <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
        <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
      </TabsList>
      <TabsContent value="solicitacoes"><ApprovedPurchaseRequestsPanel /></TabsContent>
      <TabsContent value="cotacoes"><QuotationManagementPanel /></TabsContent>
      <TabsContent value="pedidos"><BuyerPurchaseOrdersPanel /></TabsContent>
      <TabsContent value="fornecedores"><SupplierManagementPanel /></TabsContent>
    </Tabs>
  );
}
