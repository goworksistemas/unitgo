import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierManagementPanel } from './SupplierManagementPanel';
import { ContractManagementPanel } from './ContractManagementPanel';

/** Cadastros de compra no perfil comprador: fornecedores e contratos (sempre vinculados a um fornecedor). */
export function BuyerSuppliersContractsPanel() {
  return (
    <Tabs defaultValue="fornecedores" className="space-y-4">
      <TabsList>
        <TabsTrigger value="fornecedores">Fornecedores</TabsTrigger>
        <TabsTrigger value="contratos">Contratos</TabsTrigger>
      </TabsList>
      <TabsContent value="fornecedores">
        <SupplierManagementPanel />
      </TabsContent>
      <TabsContent value="contratos">
        <ContractManagementPanel />
      </TabsContent>
    </Tabs>
  );
}
