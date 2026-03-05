import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { LogIn, Mail, Lock, Eye, EyeOff, UserPlus } from 'lucide-react';
import { GoworkLogo } from '../shared/GoworkLogo';
import { authService } from '../../utils/auth';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { projectId, publicAnonKey, functionSlug } from '../../utils/supabase/info';
import { User } from '../../types';

export function LoginPage() {
  const { login, users, updateUser } = useApp();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showFirstUserSetup, setShowFirstUserSetup] = useState(false);
  const [loginError, setLoginError] = useState(false);
  const [userRequiringPasswordChange, setUserRequiringPasswordChange] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [firstUserData, setFirstUserData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleRealLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setLoginError(false);
    
    if (!formData.email || !formData.password) {
      toast.error('Preencha email e senha');
      setLoginError(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.signIn(formData);
      
      console.log('🔑 Login response:', response);
      console.log('🔑 Token salvo?', localStorage.getItem('gowork_auth_token') ? 'Sim' : 'Não');
      
      if (!response.user || !response.user.id) {
        throw new Error('Dados de usuário inválidos retornados do servidor');
      }
      
      // Check if the user requires password change BEFORE login
      if (response.user.require_password_change) {
        console.log('🔐 Usuário precisa trocar senha:', response.user);
        setUserRequiringPasswordChange(response.user);
        setIsLoading(false);
        return; // Don't login yet
      }
      
      toast.success('Login realizado com sucesso!');
      // Login with the user from response
      login(response.user.id);
    } catch (error: any) {
      console.error('Login error:', error);
      setLoginError(true);
      toast.error(error.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChanged = () => {
    // After password change, complete the login
    if (userRequiringPasswordChange) {
      toast.success('Senha alterada! Acessando sistema...');
      login(userRequiringPasswordChange.id);
      setUserRequiringPasswordChange(null);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Clear error when user starts typing
    if (loginError) {
      setLoginError(false);
    }
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleFirstUserInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFirstUserData({
      ...firstUserData,
      [name]: value,
    });
  };

  const handleFirstUserSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!firstUserData.name || !firstUserData.email || !firstUserData.password) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (firstUserData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/${functionSlug}/auth/signup`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`,
          },
          body: JSON.stringify({
            email: firstUserData.email,
            password: firstUserData.password,
            name: firstUserData.name,
            role: 'developer',
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar usuário');
      }
      
      toast.success('Primeiro usuário criado com sucesso! Agora você pode fazer login.');
      setShowFirstUserSetup(false);
      setFormData({
        email: firstUserData.email,
        password: firstUserData.password,
      });
      setFirstUserData({
        name: '',
        email: '',
        password: '',
      });
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'Erro ao criar usuário');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-secondary/5 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-3 md:p-4 relative">
      {/* Background Animation (estilo pipego) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-20 bg-rotate-gradient"
          aria-hidden
        />
      </div>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8 flex flex-col items-center">
          <div className="mb-4">
            <GoworkLogo variant="compact" size="large" />
          </div>
          <h1 className="text-slate-900 dark:text-white mb-2">Sistema de Controle de Estoque</h1>
          <p className="text-muted-foreground text-sm md:text-base">Gerencie móveis e materiais de todas as unidades</p>
        </div>

        {/* Login Card */}
        <Card className="border-2 shadow-xl">
          <CardHeader className="pb-4 border-b">
            <div className="flex items-center gap-2 justify-center mb-2">
              <LogIn className="w-5 h-5 text-primary" />
              <CardTitle className="text-lg md:text-xl">Acessar Sistema</CardTitle>
            </div>
            <CardDescription className="text-center">
              Entre com suas credenciais de acesso
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleRealLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`h-11 ${loginError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Senha
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleInputChange}
                    disabled={isLoading}
                    className={`h-11 pr-10 ${loginError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    autoComplete="current-password"
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
                {loginError && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                    Email ou senha incorretos
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
                    Entrando...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </span>
                )}
              </Button>
              
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-primary hover:underline"
                  disabled={isLoading}
                >
                  Esqueci minha senha
                </button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            © 2024 Gowork - Sistema de Controle de Estoque
          </p>
        </div>
        
        <ForgotPasswordDialog
          open={showForgotPassword}
          onOpenChange={setShowForgotPassword}
        />
        
        <ChangePasswordDialog
          open={userRequiringPasswordChange !== null}
          onOpenChange={() => setUserRequiringPasswordChange(null)}
          user={userRequiringPasswordChange}
          onPasswordChanged={handlePasswordChanged}
        />
      </div>
    </div>
  );
}