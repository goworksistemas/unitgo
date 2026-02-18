import React, { useState, useEffect } from 'react';
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
import { toast } from 'sonner';
import { Lock, Loader2, Eye, EyeOff, User } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface AdminResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function AdminResetPasswordDialog({ 
  open, 
  onOpenChange, 
  userId, 
  userName 
}: AdminResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>();

  // Get token from localStorage when dialog opens
  useEffect(() => {
    if (open) {
      const token = localStorage.getItem('gowork_auth_token') || undefined;
      console.log('🔐 AdminResetPasswordDialog - Token:', token ? 'Token encontrado' : 'Token NÃO encontrado');
      setAccessToken(token);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('🔐 AdminResetPasswordDialog - Iniciando redefinição de senha...');
    console.log('🔐 AdminResetPasswordDialog - userId:', userId);
    console.log('🔐 AdminResetPasswordDialog - userName:', userName);
    console.log('🔐 AdminResetPasswordDialog - accessToken:', accessToken ? 'Token encontrado' : 'Token NÃO encontrado');
    
    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }

    if (!accessToken) {
      console.error('❌ Token de autenticação não encontrado!');
      toast.error('Token de autenticação não encontrado');
      return;
    }

    setIsLoading(true);
    try {
      console.log('🔐 Enviando requisição para redefinir senha...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/auth/admin-reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, newPassword }),
        }
      );

      const data = await response.json();
      console.log('🔐 Resposta do servidor:', data);

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao redefinir senha');
      }

      toast.success(`Senha de ${userName} redefinida com sucesso!`);
      setNewPassword('');
      setConfirmPassword('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('❌ Error resetting user password:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Redefinir Senha do Usuário
          </DialogTitle>
          <DialogDescription>
            Definir nova senha para: <strong>{userName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-new-password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Nova Senha
            </Label>
            <div className="relative">
              <Input
                id="admin-new-password"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Digite a nova senha (mín. 6 caracteres)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowNewPassword(!showNewPassword)}
                tabIndex={-1}
              >
                {showNewPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-confirm-password">Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                id="admin-confirm-password"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Digite novamente a nova senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                tabIndex={-1}
              >
                {showConfirmPassword ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              ⚠️ <strong>Atenção:</strong> Esta ação irá alterar a senha do usuário imediatamente. 
              Certifique-se de comunicar a nova senha ao usuário de forma segura.
            </p>
          </div>

          <DialogFooter>
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
              Redefinir Senha
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}