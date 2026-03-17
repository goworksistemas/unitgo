/**
 * Regras de aprovação financeira para pedidos de compra.
 * Alçadas: até R$ 4.999,99 → Sanches | R$ 5.000+ → Maikel
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface AprovadorNecessario {
  userId: string | null;
  roleName: string;
}

/**
 * Retorna o aprovador necessário com base no valor total do pedido.
 * Consulta a tabela approval_config para faixas de valor.
 */
export async function getAprovadorNecessario(
  valorTotal: number,
  supabase: SupabaseClient
): Promise<AprovadorNecessario> {
  const { data, error } = await supabase
    .from('approval_config')
    .select('user_id, role_name')
    .eq('active', true)
    .lte('valor_limite_min', valorTotal)
    .or(`valor_limite_max.is.null,valor_limite_max.gte.${valorTotal}`)
    .order('valor_limite_min', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('Erro ao buscar aprovador:', error);
    return { userId: null, roleName: 'sanches' };
  }
  if (!data) {
    return { userId: null, roleName: 'sanches' };
  }
  return {
    userId: data.user_id ?? null,
    roleName: data.role_name ?? 'sanches',
  };
}

/**
 * Verifica se o usuário logado é aprovador (está em approval_config).
 */
export async function isUserAprovador(
  userId: string,
  supabase: SupabaseClient
): Promise<boolean> {
  const { data, error } = await supabase
    .from('approval_config')
    .select('id')
    .eq('user_id', userId)
    .eq('active', true)
    .limit(1)
    .maybeSingle();

  if (error) return false;
  return !!data;
}
