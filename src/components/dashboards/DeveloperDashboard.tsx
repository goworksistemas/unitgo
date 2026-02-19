import { useMemo, useEffect, useRef } from 'react';
import { Users, Building2, Package, List, TestTube2, Eye, LayoutDashboard, Settings2, ArrowLeft } from 'lucide-react';
import { ProductsListPanel } from '../panels/ProductsListPanel';
import { TestFlowPanel } from '../panels/TestFlowPanel';
import { AdminResetPasswordDialog } from '../auth/AdminResetPasswordDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationSection } from '@/hooks/useNavigation';

import { useDeveloperState } from '../developer/useDeveloperState';
import { UserManagementPanel } from '../developer/UserManagementPanel';
import { EditUserDialog } from '../developer/EditUserDialog';
import { UnitManagementPanel } from '../developer/UnitManagementPanel';
import { EditUnitDialog } from '../developer/EditUnitDialog';
import { ItemCreationPanel } from '../developer/ItemCreationPanel';
import { EditItemDialog } from '../developer/EditItemDialog';
import { ViewAsPanel } from '../developer/ViewAsPanel';
import { SystemOverviewPanel } from '../developer/SystemOverviewPanel';
import { Button } from '../ui/button';

const roleLabels: Record<string, string> = {
  controller: 'Controlador',
  admin: 'Administrador',
  warehouse: 'Almoxarifado',
  driver: 'Motorista',
  designer: 'Designer',
  requester: 'Solicitante',
};

export function DeveloperDashboard() {
  const state = useDeveloperState();
  const { setSections, setTitle, setActiveSection: navSetActive } = useNavigation();

  const navigationSections: NavigationSection[] = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'admin',
      label: 'Admin',
      icon: Settings2,
      items: [
        { id: 'users', label: 'Usuários', icon: Users },
        { id: 'units', label: 'Unidades', icon: Building2 },
        { id: 'items', label: 'Criar Produto', icon: Package },
        { id: 'products-list', label: 'Ver Produtos', icon: List },
        { id: 'test-flow', label: 'Testar Fluxo', icon: TestTube2 },
      ],
    },
    { id: 'view-as', label: 'Visualizar como', icon: Eye },
  ], []);

  const { activeSection, activeItem } = useDashboardNav(
    navigationSections,
    'Painel do Desenvolvedor',
    'Gestão do Sistema',
    'dashboard'
  );

  const prevViewAsRoleRef = useRef(state.viewAsRole);

  useEffect(() => {
    const wasViewingAs = prevViewAsRoleRef.current;
    prevViewAsRoleRef.current = state.viewAsRole;

    if (!state.viewAsRole && wasViewingAs) {
      setSections(navigationSections);
      setTitle('Painel do Desenvolvedor', 'Gestão do Sistema');
      navSetActive('view-as');
    }
  }, [state.viewAsRole, navigationSections, setSections, setTitle, navSetActive]);

  if (state.viewAsRole) {
    return (
      <div className="relative">
        <div className="sticky top-0 z-40 bg-gradient-to-r from-primary to-secondary text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5" />
                <div>
                  <p className="text-sm font-medium">Modo de Visualização Ativo</p>
                  <p className="text-xs opacity-90">
                    Visualizando como: <span className="font-bold">{roleLabels[state.viewAsRole] || state.viewAsRole}</span>
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="secondary"
                className="gap-2 bg-white dark:bg-card text-primary hover:bg-white/90 dark:hover:bg-card/90"
                onClick={() => state.setViewAsRole(null)}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar ao Dev
              </Button>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <ViewAsPanel viewAsRole={state.viewAsRole} setViewAsRole={state.setViewAsRole} />
        </div>
      </div>
    );
  }

  if (activeSection === 'dashboard') {
    return (
      <>
        <SystemOverviewPanel />
        <DeveloperDialogs state={state} />
      </>
    );
  }

  if (activeSection === 'admin') {
    const adminSection = activeItem || 'users';
    return (
      <>
        {adminSection === 'users' && (
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
        {adminSection === 'items' && (
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
        {adminSection === 'units' && (
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
        {adminSection === 'products-list' && (
          <div className="space-y-4">
            <ProductsListPanel />
          </div>
        )}
        {adminSection === 'test-flow' && (
          <div className="space-y-4">
            <TestFlowPanel />
          </div>
        )}
        <DeveloperDialogs state={state} />
      </>
    );
  }

  if (activeSection === 'view-as') {
    return (
      <>
        <ViewAsPanel viewAsRole={state.viewAsRole} setViewAsRole={state.setViewAsRole} />
        <DeveloperDialogs state={state} />
      </>
    );
  }

  return null;
}

function DeveloperDialogs({ state }: { state: ReturnType<typeof useDeveloperState> }) {
  return (
    <>
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
