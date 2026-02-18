import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { GoworkLogo } from '../shared/GoworkLogo';
import { supabase } from '../../utils/supabase/client';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check if user has valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error('Sessão inválida. Solicite um novo link.');
        navigate('/');
      }
      setIsChecking(false);
    });
  }, [navigate]);

  const validatePasswords = () => {
    // Reset error state
    setHasError(false);
    setErrorMessage('');

    if (!password) {
      setHasError(true);
      setErrorMessage('Digite uma senha');
      toast.error('Digite uma senha');
      return false;
    }

    if (password.length < 6) {
      setHasError(true);
      setErrorMessage('A senha deve ter pelo menos 6 caracteres');
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return false;
    }

    if (!confirmPassword) {
      setHasError(true);
      setErrorMessage('Confirme sua senha');
      toast.error('Confirme sua senha');
      return false;
    }

    if (password !== confirmPassword) {
      setHasError(true);
      setErrorMessage('As senhas não coincidem');
      toast.error('As senhas não coincidem');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePasswords()) {
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      
      if (error) throw error;

      toast.success('Senha redefinida com sucesso!');
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      setTimeout(() => navigate('/'), 1500);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Erro ao redefinir senha');
      setHasError(true);
      setErrorMessage(error.message || 'Erro ao redefinir senha');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error when user starts typing
    if (hasError) {
      setHasError(false);
      setErrorMessage('');
    }
    setter(e.target.value);
  };

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 md:p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center space-y-4">
            <GoworkLogo variant="full" size="large" />
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-muted-foreground">Validando sessão...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 md:p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 flex flex-col items-center">
          <div className="mb-4">
            <GoworkLogo variant="full" size="large" />
          </div>
          <h1 className="text-slate-900 dark:text-white mb-2">Sistema de Controle de Estoque</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gerencie móveis e materiais de todas as unidades</p>
        </div>

        {/* Reset Password Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-2 justify-center mb-2">
              <Key className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg md:text-xl">Redefinir Senha</CardTitle>
            </div>
            <CardDescription className="text-center">
              Digite sua nova senha
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={handleInputChange(setPassword)}
                    disabled={isLoading}
                    className={`h-11 pr-10 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoFocus
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
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Digite novamente"
                  value={confirmPassword}
                  onChange={handleInputChange(setConfirmPassword)}
                  disabled={isLoading}
                  className={`h-11 ${hasError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {hasError && errorMessage && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                    {errorMessage}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-primary hover:bg-primary/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Redefinindo...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Redefinir Senha
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            © 2024 Gowork - Sistema de Controle de Estoque
          </p>
        </div>
      </div>
    </div>
  );
}
