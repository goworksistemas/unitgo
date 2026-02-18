import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { ShieldAlert, Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { authService } from '../../utils/auth';
import { User } from '../../types';

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | null;
  onPasswordChanged: () => void;
}

export function ChangePasswordDialog({ open, onOpenChange, user, onPasswordChanged }: ChangePasswordDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const passwordsMatch = formData.newPassword === formData.confirmPassword;
  const passwordLengthValid = formData.newPassword.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.newPassword || !formData.confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!user) {
      toast.error('Erro: usuário não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      // Atualizar senha via authService
      await authService.updatePassword(user.id, formData.newPassword);
      
      toast.success('Senha alterada com sucesso! Você já pode acessar o sistema.');
      
      // Resetar form
      setFormData({
        newPassword: '',
        confirmPassword: '',
      });
      
      // Callback para continuar login
      onPasswordChanged();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md" 
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-left">Troca de Senha Obrigatória</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-left">
            {user.firstLogin 
              ? 'Este é seu primeiro acesso. Por segurança, você deve criar uma nova senha pessoal antes de continuar.'
              : 'Por motivos de segurança, você precisa alterar sua senha antes de acessar o sistema.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-800 dark:text-amber-200">
                Esta ação foi solicitada por um administrador. Crie uma senha forte e memorável.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha *</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={formData.newPassword}
                onChange={(e) => handleInputChange('newPassword', e.target.value)}
                disabled={isLoading}
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formData.newPassword && (
              <div className="flex items-center gap-2 text-xs">
                {passwordLengthValid ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className={passwordLengthValid ? 'text-green-600' : 'text-red-600'}>
                  Mínimo 6 caracteres
                </span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha *</Label>
            <div className="relative">
              <Input
                id="confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                disabled={isLoading}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
            {formData.confirmPassword && (
              <div className="flex items-center gap-2 text-xs">
                {passwordsMatch ? (
                  <CheckCircle2 className="w-3 h-3 text-green-600" />
                ) : (
                  <AlertCircle className="w-3 h-3 text-red-600" />
                )}
                <span className={passwordsMatch ? 'text-green-600' : 'text-red-600'}>
                  {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
                </span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full bg-amber-600 hover:bg-amber-700"
              disabled={isLoading || !passwordLengthValid || !passwordsMatch}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Alterar Senha e Continuar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}