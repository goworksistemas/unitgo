import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { authService } from '../../utils/auth';
import type { UserRole } from '../../types';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateUserDialog({ open, onOpenChange }: CreateUserDialogProps) {
  const { units } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    name: string;
    role: UserRole;
    primaryUnitId: string;
    warehouseType: string;
    requirePasswordChange: boolean;
  }>({
    email: '',
    password: '',
    name: '',
    role: 'requester',
    primaryUnitId: '',
    warehouseType: '',
    requirePasswordChange: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password || !formData.name || !formData.role) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    // Validações específicas por role
    if (formData.role === 'warehouse' && !formData.warehouseType) {
      toast.error('Selecione o tipo de almoxarifado');
      return;
    }

    if (formData.role === 'controller' && !formData.primaryUnitId) {
      toast.error('Selecione a unidade principal do controlador');
      return;
    }

    setIsLoading(true);
    try {
      await authService.signUp(formData);
      
      toast.success('Usuário criado com sucesso!');
      setFormData({
        email: '',
        password: '',
        name: '',
        role: 'requester',
        primaryUnitId: '',
        warehouseType: '',
        requirePasswordChange: false,
      });
      onOpenChange(false);
      
      // Recarregar a página para atualizar a lista de usuários
      window.location.reload();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Criar Novo Usuário
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do novo usuário do sistema
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="create-name">Nome Completo *</Label>
            <Input
              id="create-name"
              placeholder="João da Silva"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              disabled={isLoading}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-email">Email *</Label>
            <Input
              id="create-email"
              type="email"
              placeholder="joao@gowork.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-password">Senha *</Label>
            <Input
              id="create-password"
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="create-role">Perfil *</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => handleInputChange('role', value as UserRole)}
              disabled={isLoading}
            >
              <SelectTrigger id="create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="controller">Controlador</SelectItem>
                <SelectItem value="warehouse">Almoxarifado</SelectItem>
                <SelectItem value="designer">Designer</SelectItem>
                <SelectItem value="developer">Desenvolvedor</SelectItem>
                <SelectItem value="requester">Solicitante</SelectItem>
                <SelectItem value="buyer">Comprador</SelectItem>
                <SelectItem value="financial">Financeiro</SelectItem>
                <SelectItem value="purchases_admin">Admin Compras</SelectItem>
                <SelectItem value="executor">Executor</SelectItem>
                <SelectItem value="driver">Motorista</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.role === 'warehouse' && (
            <div className="space-y-2">
              <Label htmlFor="warehouse-type">Tipo de Almoxarifado *</Label>
              <Select
                value={formData.warehouseType}
                onValueChange={(value) => handleInputChange('warehouseType', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="warehouse-type">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="central">Central</SelectItem>
                  <SelectItem value="unit">Unidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {(formData.role === 'controller' || formData.role === 'warehouse') && (
            <div className="space-y-2">
              <Label htmlFor="primary-unit">
                Unidade Principal {formData.role === 'controller' ? '*' : '(Opcional)'}
              </Label>
              <Select
                value={formData.primaryUnitId}
                onValueChange={(value) => handleInputChange('primaryUnitId', value)}
                disabled={isLoading}
              >
                <SelectTrigger id="primary-unit">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {units.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Opção para forçar troca de senha no primeiro acesso */}
          <div className="flex items-center space-x-2 p-3 bg-muted rounded-md">
            <Checkbox
              id="require-password-change"
              checked={formData.requirePasswordChange}
              onCheckedChange={(checked) =>
                setFormData(prev => ({ ...prev, requirePasswordChange: checked as boolean }))
              }
              disabled={isLoading}
            />
            <Label
              htmlFor="require-password-change"
              className="text-sm cursor-pointer"
            >
              Forçar troca de senha no primeiro acesso
            </Label>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Criar Usuário
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}