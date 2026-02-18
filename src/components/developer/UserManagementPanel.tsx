import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { PlusCircle } from 'lucide-react';
import type { DeveloperState } from './types';
import { UserFormFields } from './UserFormFields';
import { UserTable } from './UserTable';

type Props = Pick<DeveloperState,
  | 'users' | 'units'
  | 'isAddUserDialogOpen' | 'setIsAddUserDialogOpen'
  | 'userForm' | 'setUserForm'
  | 'handleAddUser' | 'handleEditUser' | 'handleDeleteUser'
  | 'handleRequestPasswordChange'
  | 'setSelectedUser' | 'setIsResetPasswordDialogOpen'
>;

export function UserManagementPanel({
  users, units,
  isAddUserDialogOpen, setIsAddUserDialogOpen,
  userForm, setUserForm,
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
        <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90">
              <PlusCircle className="w-4 h-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuário</DialogTitle>
              <DialogDescription>Preencha os dados do novo usuário. A senha será enviada por email.</DialogDescription>
            </DialogHeader>
            <UserFormFields userForm={userForm} setUserForm={setUserForm} units={units} showPassword idPrefix="add-" />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleAddUser} className="bg-primary hover:bg-primary/90">Criar Usuário</Button>
            </div>
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
