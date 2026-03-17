import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/utils/api';
import type { DeveloperState } from './types';
import { UserFormFields } from './UserFormFields';
import { UserAccessFields } from './UserAccessFields';
import type { AccessGroup } from '@/types';

type Props = Pick<DeveloperState,
  | 'isEditUserDialogOpen' | 'setIsEditUserDialogOpen'
  | 'userForm' | 'setUserForm' | 'units'
  | 'handleUpdateUser'
  | 'selectedUser'
>;

export function EditUserDialog({
  isEditUserDialogOpen, setIsEditUserDialogOpen,
  userForm, setUserForm, units,
  handleUpdateUser,
  selectedUser,
}: Props) {
  const [groups, setGroups] = useState<AccessGroup[]>([]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await api.accessGroups.getAll();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    }
  }, []);

  useEffect(() => {
    if (isEditUserDialogOpen) {
      loadGroups();
    }
  }, [isEditUserDialogOpen, loadGroups]);

  useEffect(() => {
    if (isEditUserDialogOpen && selectedUser) {
      api.accessGroups.getUserAccess(selectedUser.id).then((res: { groupIds?: string[]; extraTabs?: string[] }) => {
        setUserForm((prev) => ({
          ...prev,
          groupIds: res.groupIds ?? [],
          extraTabs: res.extraTabs ?? [],
        }));
      }).catch(() => {});
    }
  }, [isEditUserDialogOpen, selectedUser?.id]);

  return (
    <Dialog open={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>Atualize os dados do usuário e o acesso às abas</DialogDescription>
        </DialogHeader>
        <UserFormFields
          userForm={userForm}
          setUserForm={setUserForm}
          units={units}
          idPrefix="edit-"
        />
        <UserAccessFields
          groupIds={userForm.groupIds}
          extraTabs={userForm.extraTabs}
          onGroupIdsChange={(ids) => setUserForm((prev) => ({ ...prev, groupIds: ids }))}
          onExtraTabsChange={(ids) => setUserForm((prev) => ({ ...prev, extraTabs: ids }))}
          groups={groups}
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
