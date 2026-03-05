import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierManagementPanel } from './SupplierManagementPanel';
import { CostCenterManagementPanel } from './CostCenterManagementPanel';
import { ContractManagementPanel } from './ContractManagementPanel';

export function PurchaseCatalogsPanel() {
  return (
    <Tabs defaultValue="fornecedores" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        <TabsTrigger value="centros-custo">Centros de Custo</TabsTrigger>
        <TabsTrigger value="contratos">Contratos</TabsTrigger>
      </TabsList>
      <TabsContent value="fornecedores"><SupplierManagementPanel /></TabsContent>
      <TabsContent value="centros-custo"><CostCenterManagementPanel /></TabsContent>
      <TabsContent value="contratos"><ContractManagementPanel /></TabsContent>
    </Tabs>
  );
}
