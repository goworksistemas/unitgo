import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import type { DeveloperState } from './types';
import { CreateUserWizard } from './CreateUserWizard';
import { UserTable } from './UserTable';

type Props = Pick<DeveloperState,
  | 'users' | 'units'
  | 'isAddUserDialogOpen' | 'setIsAddUserDialogOpen'
  | 'userForm' | 'setUserForm' | 'resetUserForm'
  | 'handleAddUser' | 'handleEditUser' | 'handleDeleteUser'
  | 'handleRequestPasswordChange'
  | 'setSelectedUser' | 'setIsResetPasswordDialogOpen'
>;

export function UserManagementPanel({
  users, units,
  isAddUserDialogOpen, setIsAddUserDialogOpen,
  userForm, setUserForm, resetUserForm,
  handleAddUser, handleEditUser, handleDeleteUser,
  handleRequestPasswordChange,
  setSelectedUser, setIsResetPasswordDialogOpen,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestão de Usuários</h2>
          <p className="text-sm text-muted-foreground">Crie, edite ou remova usuários do sistema</p>
        </div>
        <Dialog
          open={isAddUserDialogOpen}
          onOpenChange={(open) => {
            setIsAddUserDialogOpen(open);
            if (open) resetUserForm();
          }}
        >
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90">
              <PlusCircle className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar novo usuário</DialogTitle>
              <DialogDescription>
                Em duas etapas: identificação e depois perfil com acesso às unidades.
              </DialogDescription>
            </DialogHeader>
            <CreateUserWizard
              dialogOpen={isAddUserDialogOpen}
              userForm={userForm}
              setUserForm={setUserForm}
              units={units}
              onCancel={() => setIsAddUserDialogOpen(false)}
              onSubmit={handleAddUser}
              idPrefix="add-"
            />
          </DialogContent>
        </Dialog>
      </div>

      <UserTable
        users={users}
        units={units}
        handleEditUser={handleEditUser}
        handleDeleteUser={handleDeleteUser}
        handleRequestPasswordChange={handleRequestPasswordChange}
        setSelectedUser={setSelectedUser}
        setIsResetPasswordDialogOpen={setIsResetPasswordDialogOpen}
      />
    </div>
  );
}
