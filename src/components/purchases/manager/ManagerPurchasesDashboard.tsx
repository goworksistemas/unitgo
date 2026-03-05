import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ManagerPurchaseRequestsPanel } from './ManagerPurchaseRequestsPanel';
import { ManagerApprovalHistoryPanel } from './ManagerApprovalHistoryPanel';

export function ManagerPurchasesDashboard() {
  return (
    <Tabs defaultValue="solicitacoes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="solicitacoes">Solicitações da Minha Área</TabsTrigger>
        <TabsTrigger value="historico">Histórico de Aprovações</TabsTrigger>
      </TabsList>
      <TabsContent value="solicitacoes"><ManagerPurchaseRequestsPanel /></TabsContent>
      <TabsContent value="historico"><ManagerApprovalHistoryPanel /></TabsContent>
    </Tabs>
  );
}
