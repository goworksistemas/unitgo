/**
 * Tela de login.
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const logoSupplyGo = '/logo_supply.png';

const inputClassName =
  'border-slate-600 bg-slate-800/60 pl-10 pr-10 text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20';

export function LoginPage() {
  const { signIn, recuperarSenha } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [erro, setErro] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro(false);
    if (!email || !password) {
      toast.error('Preencha email e senha');
      setErro(true);
      return;
    }

    setIsLoading(true);
    try {
      await signIn({ email, password });
      toast.success('Bem-vindo de volta!');
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao entrar';
      toast.error(msg);
      setErro(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEsqueci = async () => {
    if (!email) {
      toast.error('Digite seu email para recuperar a senha');
      return;
    }
    try {
      await recuperarSenha(email);
      toast.success('Enviamos instrucoes para seu email');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao enviar email';
      toast.error(msg);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logoSupplyGo} alt="SupplyGo" className="mx-auto mb-4 h-12" />
          <h1 className="text-2xl font-semibold text-white">Acesse sua conta</h1>
          <p className="mt-1 text-sm text-slate-400">SupplyGo — Controle de Estoque & Compras</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur"
        >
          <div className="relative">
            <Mail
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              type="email"
              placeholder="email@empresa.com.br"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClassName}
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-slate-400 hover:text-slate-200"
              tabIndex={-1}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {erro && (
            <p className="text-sm text-red-400">
              Credenciais invalidas. Verifique e tente novamente.
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            <LogIn className="mr-2 h-4 w-4" />
            {isLoading ? 'Entrando...' : 'Entrar'}
          </Button>

          <div className="flex items-center justify-between pt-2 text-sm">
            <button
              type="button"
              onClick={handleEsqueci}
              className="text-blue-400 hover:text-blue-300"
            >
              Esqueci minha senha
            </button>
            <Link to="/signup" className="text-blue-400 hover:text-blue-300">
              Criar conta
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
