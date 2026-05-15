/**
 * Cliente API do SupplyGo.
 *
 * Acesso direto ao Supabase (sem Edge Function).
 * Usa o cliente singleton de @/utils/supabase/client.ts.
 *
 * Convencoes:
 *  - Frontend trabalha em camelCase
 *  - Banco trabalha em snake_case
 *  - Convertemos automaticamente ida e volta
 */
import { supabase } from '@/utils/supabase/client';
import type { PostgrestError } from '@supabase/supabase-js';

// Re-exporta o cliente Supabase para que paginas possam usar funcionalidades
// alem do CRUD generico (ex: insert em massa, upsert, in, etc).
export { supabase };

// ============================================================================
// Conversao snake_case <-> camelCase
// ============================================================================

const SNAKE_RE = /[A-Z]/g;
const CAMEL_RE = /_([a-z])/g;

export function toSnakeCase<T = unknown>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(toSnakeCase) as unknown as T;
  if (input instanceof Date) return input.toISOString() as unknown as T;
  if (typeof input !== 'object') return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as object)) {
    const snake = key.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
    if (value instanceof Date) {
      out[snake] = value.toISOString();
    } else if (value !== null && typeof value === 'object') {
      out[snake] = toSnakeCase(value);
    } else {
      out[snake] = value;
    }
  }
  return out as T;
}

export function toCamelCase<T = unknown>(input: T): T {
  if (input === null || input === undefined) return input;
  if (Array.isArray(input)) return input.map(toCamelCase) as unknown as T;
  if (typeof input !== 'object') return input;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input as object)) {
    const camel = key.replace(CAMEL_RE, (_, l: string) => l.toUpperCase());
    out[camel] =
      value !== null && typeof value === 'object' && !(value instanceof Date)
        ? toCamelCase(value)
        : value;
  }
  return out as T;
}

// ============================================================================
// Erros
// ============================================================================

export class ApiError extends Error {
  readonly code: string | null;
  readonly details: string | null;
  readonly hint: string | null;

  constructor(
    error: PostgrestError | { message: string; code?: string; details?: string; hint?: string },
  ) {
    super(error.message);
    this.name = 'ApiError';
    this.code = error.code ?? null;
    this.details = (error as PostgrestError).details ?? null;
    this.hint = (error as PostgrestError).hint ?? null;
  }
}

// ============================================================================
// CRUD generico
// ============================================================================

export interface CrudFiltros {
  /** Coluna usada para ordenar (em snake_case ou camelCase). */
  ordenarPor?: string;
  /** Direcao da ordenacao. Default: ascendente. */
  ascendente?: boolean;
  /** Limite de registros. */
  limite?: number;
  /** Filtros simples (igualdade): { ativo: true, status: 'active' }. */
  igualdade?: Record<string, unknown>;
}

/**
 * Resultado de uma consulta paginada (RPC fn_listar_* ou crud.list paginado).
 *
 * - `total`     -> contagem absoluta apos filtros (nao apenas da pagina).
 * - `registros` -> array de itens da pagina atual ja convertidos para camelCase.
 */
export interface ResultadoPaginado<T> {
  total: number;
  registros: T[];
}

/** Parametros padrao de paginacao usados em hooks/componentes. */
export interface ParametrosPaginacao {
  /** 1-based. */
  pagina: number;
  /** 1..200. Default 50. */
  tamanho: number;
  /** Termo de busca livre (ILIKE no servidor). */
  busca?: string;
  /** Coluna para ordenar (snake_case ou camelCase). */
  ordenarPor?: string;
  /** Default: ascendente. */
  ascendente?: boolean;
}

/** Filtros adicionais para `crud.list` paginado em CRUDs simples (sem RPC). */
export interface CrudFiltrosPaginado extends CrudFiltros {
  pagina: number;
  tamanho: number;
  /** Termo livre para ILIKE. */
  busca?: string;
  /** Colunas usadas na busca por ILIKE (snake_case ou camelCase). */
  colunasBusca?: string[];
}

/**
 * Cria um wrapper CRUD para uma tabela.
 *
 * Uso:
 *   const unidades = crud<Unidade>('unidades');
 *   const todas = await unidades.list();
 *   const u = await unidades.get(id);
 *   const nova = await unidades.create({ nome: 'X' });
 *   await unidades.update(id, { nome: 'Y' });
 *   await unidades.remove(id);
 */
export function crud<T = Record<string, unknown>>(tabela: string) {
  return {
    async list(filtros: CrudFiltros = {}): Promise<T[]> {
      let q = supabase.from(tabela).select('*');

      if (filtros.igualdade) {
        for (const [campo, valor] of Object.entries(filtros.igualdade)) {
          const snake = campo.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
          q = q.eq(snake, valor as never);
        }
      }
      if (filtros.ordenarPor) {
        const snake = filtros.ordenarPor.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
        q = q.order(snake, { ascending: filtros.ascendente !== false });
      }
      if (filtros.limite) {
        q = q.limit(filtros.limite);
      }

      const { data, error } = await q;
      if (error) throw new ApiError(error);
      return toCamelCase(data ?? []) as T[];
    },

    async get(id: string): Promise<T | null> {
      const { data, error } = await supabase.from(tabela).select('*').eq('id', id).maybeSingle();
      if (error) throw new ApiError(error);
      return data ? (toCamelCase(data) as T) : null;
    },

    async create(payload: Partial<T>): Promise<T> {
      const snake = toSnakeCase(payload) as Record<string, unknown>;
      const { data, error } = await supabase.from(tabela).insert(snake).select().single();
      if (error) throw new ApiError(error);
      return toCamelCase(data) as T;
    },

    async update(id: string, payload: Partial<T>): Promise<T> {
      const snake = toSnakeCase(payload) as Record<string, unknown>;
      const { data, error } = await supabase
        .from(tabela)
        .update(snake)
        .eq('id', id)
        .select()
        .single();
      if (error) throw new ApiError(error);
      return toCamelCase(data) as T;
    },

    async remove(id: string): Promise<void> {
      const { error } = await supabase.from(tabela).delete().eq('id', id);
      if (error) throw new ApiError(error);
    },

    /**
     * Lista paginada server-side usando `range()` + `count: 'exact'` do PostgREST.
     * Usado em CRUDs simples (sem JOIN). Para telas com JOIN, prefira `rpcPaginado`.
     */
    async listPaginado(filtros: CrudFiltrosPaginado): Promise<ResultadoPaginado<T>> {
      const tamanho = Math.min(Math.max(filtros.tamanho ?? 50, 1), 200);
      const pagina = Math.max(filtros.pagina ?? 1, 1);
      const inicio = (pagina - 1) * tamanho;
      const fim = inicio + tamanho - 1;

      let q = supabase.from(tabela).select('*', { count: 'exact' });

      if (filtros.igualdade) {
        for (const [campo, valor] of Object.entries(filtros.igualdade)) {
          const snake = campo.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
          q = q.eq(snake, valor as never);
        }
      }

      const termo = filtros.busca?.trim();
      if (termo && filtros.colunasBusca && filtros.colunasBusca.length > 0) {
        // Monta um OR com ILIKE para cada coluna pesquisavel.
        const partes = filtros.colunasBusca.map((col) => {
          const snake = col.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
          // PostgREST OR syntax usa virgulas; escapar virgula no termo.
          const termoEscapado = termo.replace(/[,()*]/g, ' ');
          return `${snake}.ilike.%${termoEscapado}%`;
        });
        q = q.or(partes.join(','));
      }

      if (filtros.ordenarPor) {
        const snake = filtros.ordenarPor.replace(SNAKE_RE, (l) => `_${l.toLowerCase()}`);
        q = q.order(snake, { ascending: filtros.ascendente !== false });
      }

      q = q.range(inicio, fim);

      const { data, error, count } = await q;
      if (error) throw new ApiError(error);
      return {
        total: count ?? 0,
        registros: toCamelCase(data ?? []) as T[],
      };
    },
  };
}

// ============================================================================
// RPC (functions do banco)
// ============================================================================

export async function rpc<T = unknown>(funcao: string, args?: Record<string, unknown>): Promise<T> {
  const argsSnake = args ? (toSnakeCase(args) as Record<string, unknown>) : undefined;
  const { data, error } = await supabase.rpc(funcao, argsSnake);
  if (error) throw new ApiError(error);
  return toCamelCase(data) as T;
}

/**
 * Chama uma RPC `fn_listar_*` que segue o padrao paginado do projeto
 * (RETURNS TABLE(total bigint, registros jsonb)) e devolve o resultado
 * tipado em camelCase.
 *
 * Uso:
 *   const { total, registros } = await rpcPaginado<Item>('fn_listar_itens', {
 *     pBusca: 'cad', pPagina: 1, pTamanho: 50,
 *   });
 */
export async function rpcPaginado<T>(
  funcao: string,
  args?: Record<string, unknown>,
): Promise<ResultadoPaginado<T>> {
  const argsSnake = args ? (toSnakeCase(args) as Record<string, unknown>) : undefined;
  const { data, error } = await supabase.rpc(funcao, argsSnake);
  if (error) throw new ApiError(error);

  // A RPC retorna `setof TABLE(total, registros)` -> chega como array com 1 linha.
  const linha = Array.isArray(data) ? data[0] : data;
  if (!linha) return { total: 0, registros: [] };

  const totalRaw = (linha as { total?: unknown }).total;
  const registrosRaw = (linha as { registros?: unknown }).registros ?? [];
  return {
    total: typeof totalRaw === 'number' ? totalRaw : Number(totalRaw ?? 0),
    registros: toCamelCase(registrosRaw) as T[],
  };
}
