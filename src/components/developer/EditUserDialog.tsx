import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDialogContainer } from '@/contexts/DialogContainerContext';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import type { DeveloperState } from './types';
import { UserFormFields } from './UserFormFields';
import { UserAccessGroups, UserAccessExtraTabs } from './UserAccessFields';
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
  const dialogContainer = useDialogContainer();

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
      <DialogContent
          container={dialogContainer}
          draggable={false}
          className={cn(
            'sm:!max-w-[900px] sm:!min-w-[500px] max-h-[95vh] overflow-y-auto p-5 flex flex-col',
            dialogContainer
              ? '!absolute !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 w-[calc(100%-2rem)]'
              : 'w-[95vw]'
          )}
        >
        <div className="flex flex-col gap-3 flex-1 min-h-0">
        <DialogHeader className="text-left pb-3 shrink-0">
          <DialogTitle className="text-lg">Editar Usuário</DialogTitle>
          <DialogDescription className="text-sm">
            Atualize os dados e o acesso às abas
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 min-h-0">
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Dados do usuário
            </h3>
            <UserFormFields
              userForm={userForm}
              setUserForm={setUserForm}
              units={units}
              idPrefix="edit-"
            />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Grupos de acesso
            </h3>
            <UserAccessGroups
              groupIds={userForm.groupIds ?? []}
              onGroupIdsChange={(ids) => setUserForm((prev) => ({ ...prev, groupIds: ids }))}
              groups={groups}
              idPrefix="edit-"
            />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-2">
              Abas extras
            </h3>
            <UserAccessExtraTabs
              extraTabs={userForm.extraTabs ?? []}
              onExtraTabsChange={(ids) => setUserForm((prev) => ({ ...prev, extraTabs: ids }))}
              idPrefix="edit-"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-3 mt-2 border-t shrink-0">
          <Button variant="outline" onClick={() => setIsEditUserDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateUser}>Salvar Alterações</Button>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
