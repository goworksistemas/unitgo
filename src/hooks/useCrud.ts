/**
 * Hook useCrud — encapsula list/create/update/delete + estado.
 *
 * Uso:
 *   const { itens, isLoading, criar, atualizar, excluir, recarregar } = useCrud<Moeda>('moedas', {
 *     ordenarPor: 'codigo',
 *   });
 */
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError, crud, type CrudFiltros } from '@/lib/api';

interface UseCrudOpts {
  ordenarPor?: string;
  ascendente?: boolean;
  filtros?: CrudFiltros['igualdade'];
  /** Se true, nao carrega ao montar. Usuario chama `recarregar()` manualmente. */
  manual?: boolean;
}

interface UseCrudResult<T> {
  itens: T[];
  isLoading: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
  criar: (payload: Partial<T>) => Promise<T | null>;
  atualizar: (id: string, payload: Partial<T>) => Promise<T | null>;
  excluir: (id: string) => Promise<boolean>;
}

export function useCrud<T extends { id: string }>(
  tabela: string,
  opts: UseCrudOpts = {},
): UseCrudResult<T> {
  const [itens, setItens] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(!opts.manual);
  const [erro, setErro] = useState<string | null>(null);

  const cli = crud<T>(tabela);

  const recarregar = useCallback(async () => {
    setIsLoading(true);
    setErro(null);
    try {
      const lista = await cli.list({
        ordenarPor: opts.ordenarPor,
        ascendente: opts.ascendente,
        igualdade: opts.filtros,
      });
      setItens(lista);
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar dados';
      setErro(msg);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, opts.ordenarPor, opts.ascendente, JSON.stringify(opts.filtros)]);

  useEffect(() => {
    if (!opts.manual) void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recarregar]);

  const criar = useCallback(
    async (payload: Partial<T>) => {
      try {
        const novo = await cli.create(payload);
        setItens((prev) => [...prev, novo]);
        toast.success('Registro criado');
        return novo;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao criar';
        toast.error(msg);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabela],
  );

  const atualizar = useCallback(
    async (id: string, payload: Partial<T>) => {
      try {
        const upd = await cli.update(id, payload);
        setItens((prev) => prev.map((it) => (it.id === id ? upd : it)));
        toast.success('Registro atualizado');
        return upd;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao atualizar';
        toast.error(msg);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabela],
  );

  const excluir = useCallback(
    async (id: string) => {
      try {
        await cli.remove(id);
        setItens((prev) => prev.filter((it) => it.id !== id));
        toast.success('Registro excluido');
        return true;
      } catch (e) {
        const msg = e instanceof ApiError ? e.message : 'Erro ao excluir';
        toast.error(msg);
        return false;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabela],
  );

  return { itens, isLoading, erro, recarregar, criar, atualizar, excluir };
}
