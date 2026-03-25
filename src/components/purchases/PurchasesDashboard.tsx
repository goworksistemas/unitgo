import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPurchasesDashboard } from './admin/AdminPurchasesDashboard';
import { RequesterPurchasesDashboard } from './requester/RequesterPurchasesDashboard';
import { WarehousePurchasesDashboard } from './warehouse/WarehousePurchasesDashboard';
import { PurchasesModulePlaceholder } from './PurchasesModulePlaceholder';

/** Painel legado por papel — usado em ferramentas de desenvolvimento / pré-visualização. */
export function PurchasesDashboard() {
  return (
    <Tabs defaultValue="solicitante" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="solicitante">Solicitante</TabsTrigger>
        <TabsTrigger value="almoxarifado">Almoxarifado</TabsTrigger>
        <TabsTrigger value="admin">Admin / gestor</TabsTrigger>
        <TabsTrigger value="comprador">Comprador</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro (compras)</TabsTrigger>
      </TabsList>
      <TabsContent value="solicitante">
        <RequesterPurchasesDashboard />
      </TabsContent>
      <TabsContent value="almoxarifado">
        <WarehousePurchasesDashboard />
      </TabsContent>
      <TabsContent value="admin">
        <AdminPurchasesDashboard />
      </TabsContent>
      <TabsContent value="comprador">
        <PurchasesModulePlaceholder title="Comprador" />
      </TabsContent>
      <TabsContent value="financeiro">
        <PurchasesModulePlaceholder title="Financeiro — compras" />
      </TabsContent>
    </Tabs>
  );
}
