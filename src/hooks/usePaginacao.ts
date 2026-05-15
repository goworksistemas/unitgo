/**
 * Hook usePaginacao — estado controlado de paginacao + busca com debounce.
 *
 * Gerencia: pagina (1-based), tamanho, busca (com debounce 300ms),
 * ordenacao e qualquer objeto de filtros customizados.
 *
 * Reseta a pagina para 1 sempre que filtros/busca/ordenacao/tamanho mudam.
 *
 * Uso:
 *   const pag = usePaginacao({ tamanho: 50 });
 *   <Input value={pag.busca} onChange={(e) => pag.setBusca(e.target.value)} />
 *   // pag.buscaDebounced -> usar este nos params da API
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface OpcoesPaginacao<F extends Record<string, unknown> = Record<string, unknown>> {
  /** Tamanho de pagina inicial. Default 50. */
  tamanho?: number;
  /** Pagina inicial (1-based). Default 1. */
  pagina?: number;
  /** Coluna inicial para ordenar. */
  ordenarPor?: string;
  /** Direcao inicial. Default true. */
  ascendente?: boolean;
  /** Filtros iniciais customizados (status, tipo, unidade etc). */
  filtros?: F;
  /** Tempo de debounce do campo de busca em ms. Default 300. */
  debounceMs?: number;
}

export interface EstadoPaginacao<F extends Record<string, unknown> = Record<string, unknown>> {
  pagina: number;
  tamanho: number;
  busca: string;
  /** Versao com debounce aplicado — usar para chamadas a API. */
  buscaDebounced: string;
  ordenarPor: string | undefined;
  ascendente: boolean;
  filtros: F;

  setPagina: (p: number) => void;
  setTamanho: (t: number) => void;
  setBusca: (b: string) => void;
  setOrdenacao: (coluna: string | undefined, ascendente?: boolean) => void;
  setFiltros: (f: F | ((anterior: F) => F)) => void;
  /** Atalho para resetar pagina = 1 (uso interno; raramente usado externamente). */
  resetarPagina: () => void;
}

export function usePaginacao<F extends Record<string, unknown> = Record<string, unknown>>(
  opts: OpcoesPaginacao<F> = {},
): EstadoPaginacao<F> {
  const debounceMs = opts.debounceMs ?? 300;
  const [pagina, setPaginaState] = useState(opts.pagina ?? 1);
  const [tamanho, setTamanhoState] = useState(opts.tamanho ?? 50);
  const [busca, setBuscaState] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<string | undefined>(opts.ordenarPor);
  const [ascendente, setAscendente] = useState<boolean>(opts.ascendente !== false);
  const [filtros, setFiltrosState] = useState<F>((opts.filtros ?? ({} as F)) as F);

  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      setBuscaDebounced(busca);
    }, debounceMs);
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [busca, debounceMs]);

  // Sempre que filtros, busca-debounced, tamanho ou ordenacao mudam,
  // volta para a primeira pagina.
  useEffect(() => {
    setPaginaState(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buscaDebounced, tamanho, ordenarPor, ascendente, JSON.stringify(filtros)]);

  const setPagina = useCallback((p: number) => setPaginaState(Math.max(1, p)), []);
  const setTamanho = useCallback((t: number) => setTamanhoState(Math.min(Math.max(t, 1), 200)), []);
  const setBusca = useCallback((b: string) => setBuscaState(b), []);
  const setOrdenacao = useCallback((coluna: string | undefined, asc = true) => {
    setOrdenarPor(coluna);
    setAscendente(asc);
  }, []);
  const setFiltros = useCallback((f: F | ((anterior: F) => F)) => {
    setFiltrosState((prev) => (typeof f === 'function' ? (f as (a: F) => F)(prev) : f));
  }, []);
  const resetarPagina = useCallback(() => setPaginaState(1), []);

  return {
    pagina,
    tamanho,
    busca,
    buscaDebounced,
    ordenarPor,
    ascendente,
    filtros,
    setPagina,
    setTamanho,
    setBusca,
    setOrdenacao,
    setFiltros,
    resetarPagina,
  };
}
