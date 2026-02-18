import { useMemo } from 'react';
import { Users, Building2, Package, List, TestTube2, Eye } from 'lucide-react';
import { ProductsListPanel } from '../panels/ProductsListPanel';
import { TestFlowPanel } from '../panels/TestFlowPanel';
import { AdminResetPasswordDialog } from '../auth/AdminResetPasswordDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';

import { useDeveloperState } from '../developer/useDeveloperState';
import { UserManagementPanel } from '../developer/UserManagementPanel';
import { EditUserDialog } from '../developer/EditUserDialog';
import { UnitManagementPanel } from '../developer/UnitManagementPanel';
import { EditUnitDialog } from '../developer/EditUnitDialog';
import { ItemCreationPanel } from '../developer/ItemCreationPanel';
import { EditItemDialog } from '../developer/EditItemDialog';
import { ViewAsPanel } from '../developer/ViewAsPanel';

export function DeveloperDashboard() {
  const state = useDeveloperState();

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'units', label: 'Unidades', icon: Building2 },
    { id: 'items', label: 'Criar Produto', icon: Package },
    { id: 'products-list', label: 'Ver Produtos', icon: List },
    { id: 'test-flow', label: 'Testar Fluxo', icon: TestTube2 },
    { id: 'view-as', label: 'Visualizar Como', icon: Eye },
  ], []);

  const { activeSection: activeTab } = useDashboardNav(
    navigationSections,
    'Painel do Desenvolvedor',
    'Gestão do Sistema',
    'users'
  );

  if (state.viewAsRole) {
    return <ViewAsPanel viewAsRole={state.viewAsRole} setViewAsRole={state.setViewAsRole} />;
  }

  return (
    <>
      {activeTab === 'view-as' && (
        <ViewAsPanel viewAsRole={state.viewAsRole} setViewAsRole={state.setViewAsRole} />
      )}

      {activeTab === 'users' && (
        <UserManagementPanel
          users={state.users}
          units={state.units}
          isAddUserDialogOpen={state.isAddUserDialogOpen}
          setIsAddUserDialogOpen={state.setIsAddUserDialogOpen}
          userForm={state.userForm}
          setUserForm={state.setUserForm}
          handleAddUser={state.handleAddUser}
          handleEditUser={state.handleEditUser}
          handleDeleteUser={state.handleDeleteUser}
          handleRequestPasswordChange={state.handleRequestPasswordChange}
          setSelectedUser={state.setSelectedUser}
          setIsResetPasswordDialogOpen={state.setIsResetPasswordDialogOpen}
        />
      )}

      {activeTab === 'items' && (
        <ItemCreationPanel
          items={state.items}
          categories={state.categories}
          isAddItemDialogOpen={state.isAddItemDialogOpen}
          setIsAddItemDialogOpen={state.setIsAddItemDialogOpen}
          itemForm={state.itemForm}
          setItemForm={state.setItemForm}
          isUploadingImage={state.isUploadingImage}
          handleAddItem={state.handleAddItem}
          handleEditItem={state.handleEditItem}
          handleImageUpload={state.handleImageUpload}
        />
      )}

      {activeTab === 'units' && (
        <UnitManagementPanel
          units={state.units}
          isAddUnitDialogOpen={state.isAddUnitDialogOpen}
          setIsAddUnitDialogOpen={state.setIsAddUnitDialogOpen}
          unitForm={state.unitForm}
          setUnitForm={state.setUnitForm}
          handleAddUnit={state.handleAddUnit}
          handleEditUnit={state.handleEditUnit}
          handleDeleteUnit={state.handleDeleteUnit}
          handleInitSchema={state.handleInitSchema}
          getWarehouseUnitId={state.getWarehouseUnitId}
        />
      )}

      {activeTab === 'products-list' && (
        <div className="space-y-4">
          <ProductsListPanel />
        </div>
      )}

      {activeTab === 'test-flow' && (
        <div className="space-y-4">
          <TestFlowPanel />
        </div>
      )}

      <EditUserDialog
        isEditUserDialogOpen={state.isEditUserDialogOpen}
        setIsEditUserDialogOpen={state.setIsEditUserDialogOpen}
        userForm={state.userForm}
        setUserForm={state.setUserForm}
        units={state.units}
        handleUpdateUser={state.handleUpdateUser}
      />

      <EditItemDialog
        isEditItemDialogOpen={state.isEditItemDialogOpen}
        setIsEditItemDialogOpen={state.setIsEditItemDialogOpen}
        itemForm={state.itemForm}
        setItemForm={state.setItemForm}
        categories={state.categories}
        isUploadingImage={state.isUploadingImage}
        handleUpdateItem={state.handleUpdateItem}
        handleImageUpload={state.handleImageUpload}
      />

      <EditUnitDialog
        isEditUnitDialogOpen={state.isEditUnitDialogOpen}
        setIsEditUnitDialogOpen={state.setIsEditUnitDialogOpen}
        unitForm={state.unitForm}
        setUnitForm={state.setUnitForm}
        handleUpdateUnit={state.handleUpdateUnit}
      />

      {state.selectedUser && (
        <AdminResetPasswordDialog
          open={state.isResetPasswordDialogOpen}
          onOpenChange={state.setIsResetPasswordDialogOpen}
          userId={state.selectedUser.id}
          userName={state.selectedUser.name}
        />
      )}
    </>
  );
}
