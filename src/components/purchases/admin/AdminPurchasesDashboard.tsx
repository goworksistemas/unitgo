import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PurchaseCatalogsPanel } from './PurchaseCatalogsPanel';
import { PurchaseRequestApprovalPanel } from './PurchaseRequestApprovalPanel';

export function AdminPurchasesDashboard() {
  return (
    <Tabs defaultValue="solicitacoes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="cadastros">Cadastros</TabsTrigger>
        <TabsTrigger value="solicitacoes">Solicitações Pendentes</TabsTrigger>
      </TabsList>
      <TabsContent value="cadastros"><PurchaseCatalogsPanel /></TabsContent>
      <TabsContent value="solicitacoes"><PurchaseRequestApprovalPanel /></TabsContent>
    </Tabs>
  );
}
