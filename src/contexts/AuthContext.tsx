/**
 * AuthContext — gerencia sessao do Supabase Auth.
 *
 * Estado:
 *  - `sessao` (Session do supabase-js)
 *  - `authUsuarioId` (auth.users.id)
 *  - `isLoading` (durante hidratacao inicial)
 *
 * Metodos:
 *  - signUp({ email, password, nome })
 *  - signIn({ email, password })
 *  - signOut()
 *  - recuperarSenha(email)
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase/client';

interface AuthContextValue {
  sessao: Session | null;
  authUsuarioId: string | null;
  isLoading: boolean;
  signUp: (params: { email: string; password: string; nome: string }) => Promise<{ ehPrimeiraConta?: boolean }>;
  signIn: (params: { email: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  recuperarSenha: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hidratacao inicial + listener de mudanca de sessao
  useEffect(() => {
    let cancelado = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelado) return;
      setSessao(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, novaSessao) => {
      setSessao(novaSessao);
      setIsLoading(false);
    });

    return () => {
      cancelado = true;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async ({ email, password, nome }: { email: string; password: string; nome: string }) => {
      // Verificar se ja existe alguem em usuarios via RPC publica.
      // (Nao podemos consultar a tabela `usuarios` direto: anon e bloqueado pelo RLS.)
      const { data: ehPrimeiraData, error: rpcErro } = await supabase.rpc('eh_primeira_conta');
      const ehPrimeiraConta = rpcErro ? false : Boolean(ehPrimeiraData);

      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { nome: nome.trim() } },
      });

      if (error) {
        throw new Error(error.message);
      }

      return { ehPrimeiraConta };
    },
    [],
  );

  const signIn = useCallback(async ({ email, password }: { email: string; password: string }) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSessao(null);
  }, []);

  const recuperarSenha = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      throw new Error(error.message);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessao,
      authUsuarioId: sessao?.user.id ?? null,
      isLoading,
      signUp,
      signIn,
      signOut,
      recuperarSenha,
    }),
    [sessao, isLoading, signUp, signIn, signOut, recuperarSenha],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() precisa estar dentro de <AuthProvider>');
  }
  return ctx;
}
