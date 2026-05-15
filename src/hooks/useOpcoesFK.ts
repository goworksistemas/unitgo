/**
 * Hook auxiliar: carrega opcoes para selects de FK.
 *
 * Por padrao aplica um limite (200) e ordena pela coluna informada, para
 * evitar arrastar a tabela inteira em FKs grandes (ex: itens, fornecedores).
 * Se o universo for maior que `limite`, use o hook `useOpcoesFKBusca` em
 * conjunto com um combobox que busca on demand no servidor.
 *
 * Uso:
 *   const { opcoes: usuarios } = useOpcoesFK('usuarios', 'nome');
 *   // opcoes: [{ valor: '<uuid>', label: 'Fulano de Tal' }]
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { crud, rpcPaginado } from '@/lib/api';
import type { OpcaoSelect } from '@/components/crud/FormDialog';

interface Opts {
  /** Filtros igualdade (ex: { ativo: true }). */
  filtros?: Record<string, unknown>;
  /** Coluna para gerar o label. Pode ser uma funcao para concatenar. */
  labelFn?: (item: Record<string, unknown>) => string;
  /** Limite de registros carregados. Default 200. */
  limite?: number;
}

export function useOpcoesFK(
  tabela: string,
  campoLabel: string,
  opts: Opts = {},
): { opcoes: OpcaoSelect[]; isLoading: boolean } {
  const [opcoes, setOpcoes] = useState<OpcaoSelect[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    crud<{ id: string } & Record<string, unknown>>(tabela)
      .list({
        ordenarPor: campoLabel,
        igualdade: opts.filtros,
        limite: opts.limite ?? 200,
      })
      .then((lista) => {
        if (cancelado) return;
        setOpcoes(
          lista.map((item) => ({
            valor: item.id,
            label: opts.labelFn
              ? opts.labelFn(item)
              : String((item as Record<string, unknown>)[campoLabel] ?? item.id),
          })),
        );
      })
      .catch(() => {
        if (!cancelado) setOpcoes([]);
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, campoLabel, JSON.stringify(opts.filtros), opts.limite]);

  return { opcoes, isLoading };
}

// ============================================================================
// useOpcoesFKBusca — carrega opcoes via RPC paginada com busca server-side
// ============================================================================

interface OptsBusca {
  /** Nome da RPC `fn_listar_*` que retorna { total, registros }. */
  rpc: string;
  /** Campo do item usado como label (ex: 'nome', 'razaoSocial'). */
  campoLabel: string;
  /** Filtros extras enviados ao RPC (camelCase). */
  paramsRpc?: Record<string, unknown>;
  /** Tamanho de pagina retornado (default 50). */
  tamanho?: number;
  /** Debounce do termo em ms. Default 300. */
  debounceMs?: number;
  /** Termo de busca (controlado externamente). */
  busca: string;
}

/**
 * Variante do useOpcoesFK que delega a busca ao servidor via RPC.
 * Indicado para FKs com milhares de registros (itens, fornecedores, usuarios).
 *
 * Recebe `busca` (controlado pelo componente combobox) e retorna `opcoes`
 * + flag de loading + total e mais (carregar proxima pagina opcional).
 */
export function useOpcoesFKBusca(opts: OptsBusca): {
  opcoes: OpcaoSelect[];
  isLoading: boolean;
  total: number;
} {
  const [opcoes, setOpcoes] = useState<OpcaoSelect[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const debounceMs = opts.debounceMs ?? 300;
  const tamanho = opts.tamanho ?? 50;
  const timer = useRef<number | undefined>(undefined);
  const paramsKey = JSON.stringify(opts.paramsRpc ?? {});

  const buscar = useCallback(
    async (termo: string) => {
      setIsLoading(true);
      try {
        const res = await rpcPaginado<{ id: string } & Record<string, unknown>>(opts.rpc, {
          ...(opts.paramsRpc ?? {}),
          pBusca: termo || null,
          pPagina: 1,
          pTamanho: tamanho,
        });
        setOpcoes(
          res.registros.map((r) => ({
            valor: r.id,
            label: String(r[opts.campoLabel] ?? r.id),
          })),
        );
        setTotal(res.total);
      } catch {
        setOpcoes([]);
        setTotal(0);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [opts.rpc, opts.campoLabel, paramsKey, tamanho],
  );

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      void buscar(opts.busca);
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [opts.busca, debounceMs, buscar]);

  return { opcoes, isLoading, total };
}
