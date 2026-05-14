/**
 * Tela de redefinicao de senha (chega via email do Supabase Auth).
 *
 * O Supabase Auth envia o link com hash contendo access_token.
 * O cliente supabase-js detecta automaticamente (detectSessionInUrl: true)
 * e abre uma sessao temporaria. A partir dela, chamamos updateUser({ password }).
 */
import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/utils/supabase/client';

const logoSupplyGo = '/logo_supply.png';

const inputClassName =
  'border-slate-600 bg-slate-800/60 pl-10 pr-10 text-white placeholder:text-slate-400 focus-visible:border-blue-400 focus-visible:ring-2 focus-visible:ring-blue-400/20';

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenValido, setTokenValido] = useState<boolean | null>(null);

  // Aguarda o supabase-js processar o hash da URL (PKCE flow)
  useEffect(() => {
    const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') {
        setTokenValido(true);
      }
    });
    // Timeout: se em 3s nao detectou recovery, considera token invalido
    const timeout = setTimeout(() => {
      supabase.auth.getSession().then(({ data }) => {
        setTokenValido(!!data.session);
      });
    }, 3000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Senha precisa ter ao menos 6 caracteres');
      return;
    }
    if (password !== confirmar) {
      toast.error('As senhas nao coincidem');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Senha atualizada com sucesso');
      navigate('/login', { replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao redefinir senha';
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img src={logoSupplyGo} alt="SupplyGo" className="h-12 mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-white">Redefinir senha</h1>
          <p className="text-slate-400 text-sm mt-1">Defina uma nova senha para sua conta</p>
        </div>

        {tokenValido === false ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-red-200">
            <p className="font-semibold mb-2">Link invalido ou expirado</p>
            <p className="text-sm mb-4">Solicite um novo email de recuperacao na tela de login.</p>
            <Button variant="outline" onClick={() => navigate('/login')}>
              Voltar para login
            </Button>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-900/40 p-6 backdrop-blur"
          >
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClassName}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" aria-hidden />
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirme a senha"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
                className={inputClassName}
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading || tokenValido === null}>
              <KeyRound className="h-4 w-4 mr-2" />
              {isLoading ? 'Salvando...' : 'Redefinir senha'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
