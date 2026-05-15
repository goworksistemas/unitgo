/**
 * Hook useListaPaginada — orquestra usePaginacao + chamada da API paginada.
 *
 * Modos:
 *  1) Modo RPC (telas com JOIN): informe `rpc: 'fn_listar_xxx'` e
 *     `paramsRpc` (filtros extras alem de busca/pagina/tamanho).
 *  2) Modo CRUD simples (1 tabela, sem JOIN): informe `tabela` e
 *     `colunasBusca` (colunas para ILIKE server-side).
 *
 * Recarrega automaticamente sempre que pagina/busca/filtros mudam.
 *
 * Uso (RPC):
 *   const lista = useListaPaginada<Item>({
 *     rpc: 'fn_listar_itens',
 *     paramsRpc: { categoriaId: '...', ativo: true },
 *   });
 *
 * Uso (CRUD simples):
 *   const lista = useListaPaginada<Moeda>({
 *     tabela: 'moedas',
 *     colunasBusca: ['codigo', 'nome'],
 *     ordenarPor: 'codigo',
 *   });
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, crud, rpcPaginado, type ResultadoPaginado } from '@/lib/api';
import { usePaginacao, type EstadoPaginacao, type OpcoesPaginacao } from './usePaginacao';

interface OpcoesBase<F extends Record<string, unknown>> extends OpcoesPaginacao<F> {
  /** Avisar erros via toast (default true). */
  toastErro?: boolean;
}

interface OpcoesRpc<F extends Record<string, unknown>> extends OpcoesBase<F> {
  rpc: string;
  /** Parametros extras enviados ao RPC alem de pBusca/pPagina/pTamanho. */
  paramsRpc?: Record<string, unknown>;
  tabela?: never;
  colunasBusca?: never;
}

interface OpcoesCrud<F extends Record<string, unknown>> extends OpcoesBase<F> {
  rpc?: never;
  paramsRpc?: never;
  tabela: string;
  /** Colunas para ILIKE no servidor (camelCase ou snake_case). */
  colunasBusca?: string[];
  /** Filtros de igualdade adicionais (campo: valor). */
  igualdade?: Record<string, unknown>;
}

export type OpcoesListaPaginada<F extends Record<string, unknown> = Record<string, unknown>> =
  | OpcoesRpc<F>
  | OpcoesCrud<F>;

export interface ResultadoListaPaginada<
  T extends { id: string },
  F extends Record<string, unknown> = Record<string, unknown>,
> {
  itens: T[];
  total: number;
  isLoading: boolean;
  erro: string | null;
  /** Recarrega a pagina atual. */
  recarregar: () => Promise<void>;
  /** Estado completo da paginacao (controles para UI). */
  paginacao: EstadoPaginacao<F>;
}

export function useListaPaginada<
  T extends { id: string },
  F extends Record<string, unknown> = Record<string, unknown>,
>(opts: OpcoesListaPaginada<F>): ResultadoListaPaginada<T, F> {
  const paginacao = usePaginacao<F>(opts);
  const [itens, setItens] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Identificador estavel das opcoes "estaticas" (rpc/tabela/colunas/params extras).
  const ehRpc = 'rpc' in opts && !!opts.rpc;
  const rpcNome = ehRpc ? opts.rpc : undefined;
  const paramsRpc = ehRpc ? opts.paramsRpc : undefined;
  const tabela = !ehRpc ? opts.tabela : undefined;
  const colunasBusca = !ehRpc ? opts.colunasBusca : undefined;
  const igualdadeExtra = !ehRpc ? opts.igualdade : undefined;

  const paramsRpcKey = JSON.stringify(paramsRpc ?? {});
  const colunasBuscaKey = JSON.stringify(colunasBusca ?? []);
  const igualdadeKey = JSON.stringify(igualdadeExtra ?? {});
  const filtrosKey = JSON.stringify(paginacao.filtros);

  const recarregar = useCallback(async () => {
    setIsLoading(true);
    setErro(null);
    try {
      let resultado: ResultadoPaginado<T>;

      if (rpcNome) {
        resultado = await rpcPaginado<T>(rpcNome, {
          ...(paramsRpc ?? {}),
          ...(paginacao.filtros as Record<string, unknown>),
          pBusca: paginacao.buscaDebounced || null,
          pPagina: paginacao.pagina,
          pTamanho: paginacao.tamanho,
        });
      } else if (tabela) {
        resultado = await crud<T>(tabela).listPaginado({
          pagina: paginacao.pagina,
          tamanho: paginacao.tamanho,
          busca: paginacao.buscaDebounced,
          colunasBusca: colunasBusca,
          ordenarPor: paginacao.ordenarPor,
          ascendente: paginacao.ascendente,
          igualdade: {
            ...(igualdadeExtra ?? {}),
            ...(paginacao.filtros as Record<string, unknown>),
          },
        });
      } else {
        throw new Error('useListaPaginada requer rpc ou tabela');
      }

      setItens(resultado.registros);
      setTotal(resultado.total);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar dados';
      setErro(msg);
      if (opts.toastErro !== false) toast.error(msg);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    rpcNome,
    tabela,
    paramsRpcKey,
    colunasBuscaKey,
    igualdadeKey,
    filtrosKey,
    paginacao.pagina,
    paginacao.tamanho,
    paginacao.buscaDebounced,
    paginacao.ordenarPor,
    paginacao.ascendente,
  ]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  return {
    itens,
    total,
    isLoading,
    erro,
    recarregar,
    paginacao,
  };
}
