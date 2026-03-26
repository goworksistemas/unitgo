import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useDialogContainer } from '@/contexts/DialogContainerContext';
import { cn } from '@/lib/utils';
import { api } from '@/utils/api';
import { supabase } from '@/utils/supabase/client';
import { toast } from 'sonner';
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
  /** `null` = carregando; array = opções (pode ser vazio) */
  const [departmentOptions, setDepartmentOptions] = useState<{ id: string; name: string }[] | null>(null);
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
    if (!isEditUserDialogOpen) {
      setDepartmentOptions(null);
      return;
    }
    let cancelled = false;
    setDepartmentOptions(null);

    type DeptRow = { id: string; name: string; isActive?: boolean; is_active?: boolean };

    const rowToOption = (d: DeptRow) => {
      const inactive = d.isActive === false || d.is_active === false;
      return { id: d.id, name: inactive ? `${d.name} (inativo)` : d.name };
    };

    (async () => {
      const byId = new Map<string, { id: string; name: string }>();

      const merge = (rows: DeptRow[]) => {
        for (const r of rows) {
          if (r?.id) byId.set(r.id, rowToOption(r));
        }
      };

      try {
        const raw = await api.departments.getAll();
        if (!cancelled && Array.isArray(raw) && raw.length > 0) {
          merge(raw as DeptRow[]);
        }
      } catch {
        /* tenta Supabase abaixo */
      }

      try {
        const { data, error } = await supabase
          .from('org_departments')
          .select('id, name, is_active')
          .order('name');
        if (!cancelled && !error && Array.isArray(data) && data.length > 0) {
          merge(data as DeptRow[]);
        }
      } catch {
        /* ignore */
      }

      if (cancelled) return;

      const sorted = Array.from(byId.values()).sort((a, b) =>
        a.name.localeCompare(b.name, 'pt-BR')
      );

      if (sorted.length === 0) {
        toast.error(
          'Nenhum departamento carregado. Faça deploy da rota GET /departments na Edge Function e confira o RLS da tabela departments no Supabase.'
        );
      }

      setDepartmentOptions(sorted);
    })();

    return () => {
      cancelled = true;
    };
  }, [isEditUserDialogOpen]);

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
              departmentOptions={departmentOptions}
              preservedDepartmentId={userForm.departmentId}
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
