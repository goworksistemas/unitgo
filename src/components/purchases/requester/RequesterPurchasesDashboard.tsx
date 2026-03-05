import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreatePurchaseRequestPanel } from './CreatePurchaseRequestPanel';
import { MyPurchaseRequestsPanel } from './MyPurchaseRequestsPanel';

export function RequesterPurchasesDashboard() {
  return (
    <Tabs defaultValue="nova-solicitacao" className="space-y-4">
      <TabsList>
        <TabsTrigger value="nova-solicitacao">Nova Solicitação</TabsTrigger>
        <TabsTrigger value="minhas-solicitacoes">Minhas Solicitações</TabsTrigger>
      </TabsList>
      <TabsContent value="nova-solicitacao"><CreatePurchaseRequestPanel /></TabsContent>
      <TabsContent value="minhas-solicitacoes"><MyPurchaseRequestsPanel /></TabsContent>
    </Tabs>
  );
}
