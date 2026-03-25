import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { projectId, publicAnonKey, functionSlug } from '@/utils/supabase/info';
import { api } from '@/utils/api';
import type { User, UserRole } from '@/types';
import type { UserFormState } from './types';

const INITIAL_USER_FORM: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'requester',
  primaryUnitId: '',
  additionalUnitIds: [],
  departmentId: '',
  warehouseType: undefined,
  adminType: undefined,
  jobTitle: '',
  groupIds: [],
  extraTabs: [],
};

export function useUserHandlers() {
  const { users, units, currentUser, updateUser, deleteUser, logout } = useApp();

  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>({ ...INITIAL_USER_FORM });

  const resetUserForm = () => setUserForm({ ...INITIAL_USER_FORM });

  const handleAddUser = async () => {
    if (!userForm.name || !userForm.email || !userForm.role || !userForm.password) {
      toast.error('Preencha os campos obrigatórios (nome, email, senha e perfil)');
      return;
    }
    if (
      userForm.role !== 'designer' &&
      userForm.role !== 'admin' &&
      userForm.role !== 'developer' &&
      userForm.role !== 'purchases_admin' &&
      !userForm.primaryUnitId
    ) {
      toast.error('Selecione a unidade primária');
      return;
    }
    if (userForm.role === 'admin' && !userForm.adminType) {
      toast.error('Selecione o tipo de administrador');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${functionSlug}/auth/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            name: userForm.name,
            role: userForm.role,
            primaryUnitId:
              userForm.role === 'designer' ||
              userForm.role === 'admin' ||
              userForm.role === 'developer' ||
              userForm.role === 'purchases_admin'
                ? undefined
                : userForm.primaryUnitId,
            additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : undefined,
            warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : undefined,
            adminType: userForm.role === 'admin' ? userForm.adminType : undefined,
            jobTitle: userForm.jobTitle || undefined,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao criar usuário');
      }
      await response.json();
      toast.success(`Usuário ${userForm.name} criado com sucesso!`);
      setIsAddUserDialogOpen(false);
      resetUserForm();
      window.location.reload();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    }
  };

  const handleEditUser = async (user: User) => {
    let groupIds: string[] = [];
    let extraTabs: string[] = [];
    try {
      const res = await api.accessGroups.getUserAccess(user.id);
      const r = res as { groupIds?: string[]; extraTabs?: string[] };
      groupIds = Array.isArray(r.groupIds) ? r.groupIds : [];
      extraTabs = Array.isArray(r.extraTabs) ? r.extraTabs : [];
    } catch {
      // Mantém listas vazias; usuário ainda pode editar e salvar
    }

    setSelectedUser(user);
    setUserForm({
      name: user.name, email: user.email, password: '',
      role: user.role, primaryUnitId: user.primaryUnitId || '',
      additionalUnitIds: user.additionalUnitIds || [],
      departmentId: user.departmentId ?? '',
      warehouseType: user.warehouseType, adminType: user.adminType,
      jobTitle: user.jobTitle || '',
      groupIds,
      extraTabs,
    });
    setIsEditUserDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    if (!userForm.name || !userForm.email || !userForm.role) {
      toast.error('Preencha os campos obrigatórios (nome, email e perfil)');
      return;
    }
    if (userForm.role === 'admin' && !userForm.adminType) {
      toast.error('Selecione o tipo de administrador');
      return;
    }

    const isEditingSelf = currentUser?.id === selectedUser.id;
    const roleChanged = selectedUser.role !== userForm.role;

    const uuidOrNull = (v: string | undefined) =>
      v && String(v).trim() !== '' ? String(v).trim() : null;
    const primaryUnitId =
      userForm.role === 'designer' ||
      userForm.role === 'admin' ||
      userForm.role === 'developer' ||
      userForm.role === 'purchases_admin'
        ? null
        : uuidOrNull(userForm.primaryUnitId);
    const additionalUnitIds =
      userForm.role === 'controller'
        ? (userForm.additionalUnitIds || []).filter((id) => id && String(id).trim() !== '')
        : null;

    const groupIdsPayload = (userForm.groupIds ?? []).filter((id) => id && String(id).trim() !== '');
    const extraTabsPayload = (userForm.extraTabs ?? []).filter((id) => id && String(id).trim() !== '');

    try {
      // Chamar fetch direto (sem apiRequest) para evitar toSnakeCase —
      // a Edge Function deployada espera camelCase: groupIds / extraTabs
      const accessRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${functionSlug}/user-access/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({ groupIds: groupIdsPayload, extraTabs: extraTabsPayload }),
        }
      );
      if (!accessRes.ok) {
        const err = await accessRes.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao salvar grupos/abas extras');
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${functionSlug}/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            name: userForm.name, email: userForm.email, role: userForm.role,
            primaryUnitId,
            additionalUnitIds,
            warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : null,
            adminType: userForm.role === 'admin' ? userForm.adminType : null,
            jobTitle: userForm.jobTitle || null,
            departmentId: uuidOrNull(userForm.departmentId),
            password: userForm.password || undefined,
          }),
        }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao atualizar usuário');
      }
      await response.json();
      updateUser(selectedUser.id, {
        name: userForm.name, email: userForm.email, role: userForm.role,
        primaryUnitId:
          userForm.role === 'designer' ||
          userForm.role === 'admin' ||
          userForm.role === 'developer' ||
          userForm.role === 'purchases_admin'
            ? undefined
            : primaryUnitId || undefined,
        additionalUnitIds: userForm.role === 'controller' ? additionalUnitIds || undefined : undefined,
        warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : undefined,
        adminType: userForm.role === 'admin' ? userForm.adminType : undefined,
        jobTitle: userForm.jobTitle,
        departmentId: uuidOrNull(userForm.departmentId),
      });
      toast.success('Usuário atualizado com sucesso');
      setIsEditUserDialogOpen(false);
      setSelectedUser(null);
      resetUserForm();
      if (isEditingSelf && roleChanged) {
        toast.info('Seu perfil foi alterado. Faça login novamente.', { duration: 3000 });
        setTimeout(() => logout(), 1500);
      }
    } catch (error: any) {
      console.error('Erro ao atualizar usuário:', error);
      toast.error(error.message || 'Erro ao atualizar usuário');
    }
  };

  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      deleteUser(userId);
      toast.success('Usuário excluído com sucesso');
    }
  };

  const handleRequestPasswordChange = (user: User) => {
    if (window.confirm(`Solicitar que ${user.name} altere a senha no próximo login?`)) {
      updateUser(user.id, { requirePasswordChange: true });
      toast.success('Solicitação enviada! O usuário deverá alterar a senha no próximo acesso.');
    }
  };

  return {
    users, units, currentUser,
    resetUserForm,
    isAddUserDialogOpen, setIsAddUserDialogOpen,
    isEditUserDialogOpen, setIsEditUserDialogOpen,
    isResetPasswordDialogOpen, setIsResetPasswordDialogOpen,
    selectedUser, setSelectedUser,
    userForm, setUserForm,
    handleAddUser, handleEditUser, handleUpdateUser,
    handleDeleteUser, handleRequestPasswordChange,
  };
}
