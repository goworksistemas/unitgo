/**
 * Hook useView — leitura de views do Supabase.
 *
 * As views sao read-only e nao tem PK, por isso nao usam o `useCrud` (que
 * espera `T extends { id: string }` e expoe create/update/delete). Este hook
 * expoe somente list + recarregar, com os mesmos filtros opcionais.
 *
 * Uso:
 *   const { itens, isLoading, recarregar, count } = useView<ViewEstoqueAbaixoMinimo>(
 *     'estoques_abaixo_minimo',
 *     { ordenarPor: 'deficit', ascendente: false },
 *   );
 */
import { useCallback, useEffect, useState } from 'react';
import { ApiError, supabase, toCamelCase } from '@/lib/api';
import type { CrudFiltros } from '@/lib/api';

interface UseViewOpts extends Omit<CrudFiltros, 'igualdade'> {
  filtros?: CrudFiltros['igualdade'];
  /** Se true, nao carrega ao montar. Usuario chama `recarregar()` manualmente. */
  manual?: boolean;
  /** Se true, nao busca dados (util para gating por permissao). */
  habilitado?: boolean;
}

interface UseViewResult<T> {
  itens: T[];
  count: number;
  isLoading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const SNAKE_RE = /[A-Z]/g;

export function useView<T>(view: string, opts: UseViewOpts = {}): UseViewResult<T> {
  const habilitado = opts.habilitado !== false;
  const [itens, setItens] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(habilitado && !opts.manual);
  const [erro, setErro] = useState<string | null>(null);

  // Chave estavel das dependencias dos filtros (extraida para fora do array)
  const filtrosKey = JSON.stringify(opts.filtros);

  const recarregar = useCallback(async () => {
    if (!habilitado) {
      setItens([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setErro(null);
    try {
      let q = supabase.from(view).select('*', { count: 'exact' });

      if (opts.filtros) {
        for (const [campo, valor] of Object.entries(opts.filtros)) {
          const snake = campo.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
          q = q.eq(snake, valor as never);
        }
      }
      if (opts.ordenarPor) {
        const snake = opts.ordenarPor.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
        q = q.order(snake, { ascending: opts.ascendente !== false });
      }
      if (opts.limite) {
        q = q.limit(opts.limite);
      }

      const { data, error } = await q;
      if (error) throw new ApiError(error);
      setItens(toCamelCase(data ?? []) as T[]);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar dados';
      setErro(msg);
      setItens([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, habilitado, opts.ordenarPor, opts.ascendente, opts.limite, filtrosKey]);

  useEffect(() => {
    if (!opts.manual) void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregar]);

  return { itens, count: itens.length, isLoading, erro, recarregar };
}
