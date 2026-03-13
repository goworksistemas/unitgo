import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LogIn, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import logoGowork from '../../assets/gowork-removebg-preview.png';
import { authService } from '../../utils/auth';
import { toast } from 'sonner';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { projectId, publicAnonKey, functionSlug } from '../../utils/supabase/info';
import { User } from '../../types';

const inputClassName =
  'border-slate-600 bg-slate-800/60 pl-10 pr-10 text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20';

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
    <div className="dark flex min-h-screen">
      {/* Lado esquerdo — Logo centralizado */}
      <div className="hidden w-1/2 items-center justify-center bg-gradient-to-br from-slate-900 via-blue-950 to-cyan-950 px-8 lg:flex">
        <div className="flex flex-col items-center justify-center text-center">
          <img
            src={logoGowork}
            alt="Gowork"
            className="max-h-[75vh] w-auto max-w-full object-contain"
          />
          <p className="mt-10 max-w-sm text-lg leading-relaxed text-slate-300">
            Acesso seguro para colaboradores e gestores. Gerencie móveis e
            materiais de todas as unidades.
          </p>
        </div>
      </div>

      {/* Lado direito — Formulário de Login */}
      <div className="flex flex-1 flex-col justify-center bg-slate-950 px-6 py-12 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-center rounded-xl bg-slate-900 p-8 lg:hidden">
            <img
              src={logoGowork}
              alt="Gowork"
              className="h-36 w-auto object-contain sm:h-44"
            />
          </div>

          <h1 className="text-2xl font-bold text-white">Acessar Sistema</h1>
          <p className="mt-2 text-slate-300">
            Entre com suas credenciais de acesso
          </p>

          <form onSubmit={handleRealLogin} className="mt-8 space-y-5">
            {loginError && (
              <div className="rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-300">
                Email ou senha incorretos
              </div>
            )}

            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-slate-200"
              >
                E-mail *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`${inputClassName} ${loginError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  autoComplete="email"
                  autoFocus
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-200"
              >
                Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  className={`${inputClassName} ${loginError ? 'border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20' : ''}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Entrar
                </span>
              )}
            </Button>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
                disabled={isLoading}
              >
                Esqueci minha senha
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-xs text-slate-500">
            © 2024 Gowork - Sistema de Controle de Estoque
          </p>
        </div>
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
  );
}