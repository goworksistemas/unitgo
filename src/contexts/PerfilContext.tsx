/**
 * PerfilContext — carrega `meu_perfil()` do banco apos login.
 *
 * Fornece:
 *  - usuario interno (linha em `usuarios`)
 *  - perfis do usuario
 *  - rotas permitidas (com flags de permissao consolidadas)
 *  - helpers: temPermissao(rotaCodigo, flag), rotaPermitida(rotaCodigo)
 *  - recarregar() para revalidar quando admin muda permissoes
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
import { rpc } from '@/lib/api';
import type { FlagPermissao, MeuPerfil, Perfil, RotaPermitida, Usuario } from '@/types';
import { useAuth } from './AuthContext';

interface PerfilContextValue {
  usuario: Usuario | null;
  perfis: Perfil[];
  rotasPermitidas: RotaPermitida[];
  isLoading: boolean;
  erroCarga: string | null;
  /** Verifica se o usuario tem `flag` na rota indicada (por codigo). */
  temPermissao: (rotaCodigo: string, flag: FlagPermissao) => boolean;
  /** Retorna a rota permitida (ou undefined). Util para exibir nome/icone. */
  rotaPermitida: (rotaCodigo: string) => RotaPermitida | undefined;
  /** Refaz a chamada de `meu_perfil()`. Chamar quando admin altera permissoes. */
  recarregar: () => Promise<void>;
}

const PerfilContext = createContext<PerfilContextValue | undefined>(undefined);

export function PerfilProvider({ children }: { children: ReactNode }) {
  const { sessao, isLoading: authCarregando } = useAuth();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [rotasPermitidas, setRotasPermitidas] = useState<RotaPermitida[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!sessao) {
      setUsuario(null);
      setPerfis([]);
      setRotasPermitidas([]);
      setIsLoading(false);
      setErroCarga(null);
      return;
    }
    setIsLoading(true);
    setErroCarga(null);
    try {
      const data = await rpc<MeuPerfil>('meu_perfil');
      setUsuario(data?.usuario ?? null);
      setPerfis(data?.perfis ?? []);
      setRotasPermitidas(data?.rotasPermitidas ?? []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar perfil';
      setErroCarga(msg);
      setUsuario(null);
      setPerfis([]);
      setRotasPermitidas([]);
    } finally {
      setIsLoading(false);
    }
  }, [sessao]);

  useEffect(() => {
    if (authCarregando) return;
    void carregar();
  }, [authCarregando, carregar]);

  const temPermissao = useCallback(
    (rotaCodigo: string, flag: FlagPermissao) => {
      const rota = rotasPermitidas.find((r) => r.codigo === rotaCodigo);
      return rota ? rota[flag] === true : false;
    },
    [rotasPermitidas],
  );

  const rotaPermitida = useCallback(
    (rotaCodigo: string) => rotasPermitidas.find((r) => r.codigo === rotaCodigo),
    [rotasPermitidas],
  );

  const value = useMemo<PerfilContextValue>(
    () => ({
      usuario,
      perfis,
      rotasPermitidas,
      isLoading,
      erroCarga,
      temPermissao,
      rotaPermitida,
      recarregar: carregar,
    }),
    [usuario, perfis, rotasPermitidas, isLoading, erroCarga, temPermissao, rotaPermitida, carregar],
  );

  return <PerfilContext.Provider value={value}>{children}</PerfilContext.Provider>;
}

export function usePerfil(): PerfilContextValue {
  const ctx = useContext(PerfilContext);
  if (!ctx) {
    throw new Error('usePerfil() precisa estar dentro de <PerfilProvider>');
  }
  return ctx;
}
