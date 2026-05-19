import { supabase } from '@/lib/supabase'

/**
 * Wrapper tipado para as RPCs do módulo de Compras (migration 017).
 *
 * Por que não usar `supabase.rpc(...)` direto? O tipo `Functions` do
 * `Database` é gerado e às vezes fica em cache no TS server enquanto a
 * tipagem completa não é reprocessada. Este helper centraliza o cast
 * para que cada componente apenas declare o tipo do payload esperado:
 *
 *   const { data, error } = await rpcCompras<RpcDetalheSolicitacao>(
 *     'cmp_detalhe_solicitacao', { p_id: scId }
 *   )
 */
export type ComprasRpc =
  | 'cmp_historico'
  | 'cmp_detalhe_solicitacao'
  | 'cmp_detalhe_cotacao'
  | 'cmp_detalhe_pedido'
  | 'cmp_painel_solicitacao'
  | 'cmp_painel_cotacao'
  | 'cmp_painel_pedido'
  | 'cmp_linha_tempo'

type RpcResp<T> = { data: T | null; error: { message: string; details?: string; code?: string } | null }

/**
 * Cliente Supabase com a função `rpc` digitada como `unknown` para que
 * possamos chamar RPCs não conhecidas pelos tipos gerados (a tipagem do
 * `Database['public']['Functions']` às vezes fica em cache no TS server).
 *
 * ATENÇÃO: precisamos chamar `supabase.rpc(...)` mantendo o `this`. Não dá
 * para fazer `const rpc = supabase.rpc; rpc(...)` — isso quebra com
 * `Cannot read properties of undefined (reading 'rest')` porque o cliente
 * Supabase usa `this.rest` internamente.
 */
type SupabaseComRpc = {
  rpc: (
    fn: string,
    args?: Record<string, unknown>
  ) => Promise<RpcResp<unknown>>
}

export async function rpcCompras<T>(
  fn: ComprasRpc,
  args: Record<string, unknown> = {}
): Promise<RpcResp<T>> {
  const client = supabase as unknown as SupabaseComRpc
  const r = await client.rpc(fn, args)
  return { data: r.data as T | null, error: r.error }
}
