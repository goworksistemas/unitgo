import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import type { User, UserRole } from '@/types';
import type { UserFormState } from './types';

const INITIAL_USER_FORM: UserFormState = {
  name: '',
  email: '',
  password: '',
  role: 'controller',
  primaryUnitId: '',
  additionalUnitIds: [],
  warehouseType: undefined,
  adminType: undefined,
  jobTitle: '',
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
    if (userForm.role !== 'designer' && userForm.role !== 'admin' && userForm.role !== 'developer' && !userForm.primaryUnitId) {
      toast.error('Selecione a unidade primária');
      return;
    }
    if (userForm.role === 'admin' && !userForm.adminType) {
      toast.error('Selecione o tipo de administrador');
      return;
    }

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/auth/signup`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            email: userForm.email,
            password: userForm.password,
            name: userForm.name,
            role: userForm.role,
            primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? undefined : userForm.primaryUnitId,
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

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      name: user.name, email: user.email, password: '',
      role: user.role, primaryUnitId: user.primaryUnitId || '',
      additionalUnitIds: user.additionalUnitIds || [],
      warehouseType: user.warehouseType, adminType: user.adminType,
      jobTitle: user.jobTitle || '',
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

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/users/${selectedUser.id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${publicAnonKey}` },
          body: JSON.stringify({
            name: userForm.name, email: userForm.email, role: userForm.role,
            primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? null : userForm.primaryUnitId,
            additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : null,
            warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : null,
            adminType: userForm.role === 'admin' ? userForm.adminType : null,
            jobTitle: userForm.jobTitle || null,
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
        primaryUnitId: userForm.role === 'designer' || userForm.role === 'admin' || userForm.role === 'developer' ? undefined : userForm.primaryUnitId,
        additionalUnitIds: userForm.role === 'controller' ? userForm.additionalUnitIds : undefined,
        warehouseType: userForm.role === 'warehouse' ? userForm.warehouseType : undefined,
        adminType: userForm.role === 'admin' ? userForm.adminType : undefined,
        jobTitle: userForm.jobTitle,
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
    isAddUserDialogOpen, setIsAddUserDialogOpen,
    isEditUserDialogOpen, setIsEditUserDialogOpen,
    isResetPasswordDialogOpen, setIsResetPasswordDialogOpen,
    selectedUser, setSelectedUser,
    userForm, setUserForm,
    handleAddUser, handleEditUser, handleUpdateUser,
    handleDeleteUser, handleRequestPasswordChange,
  };
}
