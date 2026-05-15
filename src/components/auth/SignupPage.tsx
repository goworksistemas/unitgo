/**
 * Tela de cadastro de conta.
 *
 * Fluxo:
 *  - Usuario preenche nome, email, senha
 *  - Chama supabase.auth.signUp (com user_metadata.nome)
 *  - Trigger no banco cria linha em `usuarios`
 *  - Se for a primeira conta, atribui perfil DEV automaticamente
 */
import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, Sparkles, User as UserIcon, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

const logoSupplyGo = '/logo_supply.png';

const inputClassName =
  'border-slate-600 bg-slate-800/60 pl-10 pr-10 text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20';

export function SignupPage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!nome.trim() || !email.trim() || !password) {
      toast.error('Preencha todos os campos');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (password !== confirmar) {
      toast.error('As senhas nao coincidem');
      return;
    }

    setIsLoading(true);
    try {
      const { ehPrimeiraConta } = await signUp({ email, password, nome });

      if (ehPrimeiraConta) {
        toast.success('Conta criada! Voce e a primeira conta — perfil DEV atribuido.', {
          duration: 6000,
        });
      } else {
        toast.success('Conta criada! Aguarde um administrador atribuir suas permissoes.', {
          duration: 6000,
        });
      }

      // Em geral, signUp loga automaticamente (depende da configuracao de email confirm).
      // Independente disso, voltamos para a tela de login.
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar conta';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logoSupplyGo} alt="SupplyGo" className="mx-auto mb-4 h-12" />
          <h1 className="text-2xl font-semibold text-white">Criar conta</h1>
          <p className="mt-1 text-sm text-slate-400">SupplyGo — Controle de Estoque & Compras</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur"
        >
          <div className="flex items-start gap-2 rounded-md border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-200">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              Se voce for o <strong>primeiro</strong> a se cadastrar no sistema, ganha acesso total
              automaticamente (perfil DEV).
            </span>
          </div>

          <div className="relative">
            <UserIcon
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              type="text"
              placeholder="Seu nome completo"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={inputClassName}
              autoComplete="name"
            />
          </div>

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
              placeholder="Senha (min. 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClassName}
              autoComplete="new-password"
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

          <div className="relative">
            <Lock
              className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Confirme a senha"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              className={inputClassName}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            <UserPlus className="mr-2 h-4 w-4" />
            {isLoading ? 'Criando conta...' : 'Criar conta'}
          </Button>

          <div className="pt-2 text-center text-sm">
            <span className="text-slate-400">Ja tem conta? </span>
            <Link to="/login" className="text-blue-400 hover:text-blue-300">
              Fazer login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
