import { useApp } from '@/contexts/AppContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminPurchasesDashboard } from './admin/AdminPurchasesDashboard';
import { ManagerPurchasesDashboard } from './manager/ManagerPurchasesDashboard';
import { BuyerPurchasesDashboard } from './buyer/BuyerPurchasesDashboard';
import { RequesterPurchasesDashboard } from './requester/RequesterPurchasesDashboard';
import { WarehousePurchasesDashboard } from './warehouse/WarehousePurchasesDashboard';
import { FinancialPurchasesDashboard } from './financial/FinancialPurchasesDashboard';

export function PurchasesDashboard() {
  const { currentUser } = useApp();
  const role = currentUser?.role;

  if (role === 'developer') return <DeveloperPurchasesTabs />;
  if (role === 'admin' || role === 'controller') return <AdminPurchasesDashboard />;
  if (role === 'buyer') return <BuyerPurchasesDashboard />;
  if (role === 'warehouse') return <WarehousePurchasesDashboard />;
  if (role === 'financial') return <FinancialPurchasesDashboard />;
  if (role === 'requester') return <RequesterPurchasesDashboard />;
  return <RequesterPurchasesDashboard />;
}

function DeveloperPurchasesTabs() {
  return (
    <Tabs defaultValue="admin" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="admin">Admin</TabsTrigger>
        <TabsTrigger value="gestor">Gestor</TabsTrigger>
        <TabsTrigger value="comprador">Comprador</TabsTrigger>
        <TabsTrigger value="solicitante">Solicitante</TabsTrigger>
        <TabsTrigger value="almoxarifado">Almoxarifado</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
      </TabsList>
      <TabsContent value="admin"><AdminPurchasesDashboard /></TabsContent>
      <TabsContent value="gestor"><ManagerPurchasesDashboard /></TabsContent>
      <TabsContent value="comprador"><BuyerPurchasesDashboard /></TabsContent>
      <TabsContent value="solicitante"><RequesterPurchasesDashboard /></TabsContent>
      <TabsContent value="almoxarifado"><WarehousePurchasesDashboard /></TabsContent>
      <TabsContent value="financeiro"><FinancialPurchasesDashboard /></TabsContent>
    </Tabs>
  );
}
