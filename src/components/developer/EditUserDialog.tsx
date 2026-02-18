import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { DeveloperState } from './types';
import { UserFormFields } from './UserFormFields';

type Props = Pick<DeveloperState,
  | 'isEditUserDialogOpen' | 'setIsEditUserDialogOpen'
  | 'userForm' | 'setUserForm' | 'units'
  | 'handleUpdateUser'
>;

export function EditUserDialog({
  isEditUserDialogOpen, setIsEditUserDialogOpen,
  userForm, setUserForm, units,
  handleUpdateUser,
}: Props) {
  return (
    <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Atualize os dados do usuário</DialogDescription>
        </DialogHeader>
        <UserFormFields
          userForm={userForm}
          setUserForm={setUserForm}
          units={units}
          idPrefix="edit-"
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
