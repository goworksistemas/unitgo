/**
 * Regras de aprovação por faixa de valor (`approval_config`) com filtro opcional por setor (department).
 *
 * Fluxo:
 * 1. Busca em `approval_config` as faixas ativas que cobrem o valor informado.
 * 2. Se `departmentId` foi informado, filtra apenas as faixas vinculadas àquele setor
 *    (via `approval_config_departments`) — ou faixas sem vínculo algum (valem para todos).
 * 3. Prioriza a maior `valor_limite_min` compatível (regra mais restritiva).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ApprovalConfigEscopo } from '@/types/purchases';

export interface AprovadorNecessario {
  userId: string | null;
  roleName: string;
}

interface FetchFaixaOpts {
  valorTotal: number;
  supabase: SupabaseClient;
  roleFilter: { op: 'eq' | 'neq'; roleName: string } | null;
  departmentId?: string;
}

/**
 * Busca a faixa de aprovação compatível com o valor e (opcionalmente) com o setor.
 * Quando `departmentId` é informado, retorna faixas que:
 *   - Estejam explicitamente vinculadas àquele setor, OU
 *   - Não tenham nenhum setor vinculado (regra global).
 */
async function fetchFaixa({ valorTotal, supabase, roleFilter, departmentId }: FetchFaixaOpts) {
  let q = supabase
    .from('approval_config')
    .select('id, user_id, role_name')
    .eq('active', true)
    .lte('valor_limite_min', valorTotal)
    .or(`valor_limite_max.is.null,valor_limite_max.gte.${valorTotal}`);

  if (roleFilter) {
    q = roleFilter.op === 'eq'
      ? q.eq('role_name', roleFilter.roleName)
      : q.neq('role_name', roleFilter.roleName);
  }

  q = q.order('valor_limite_min', { ascending: false });

  if (!departmentId) {
    return q.limit(1).maybeSingle();
  }

  const { data: allRows, error } = await q;
  if (error || !allRows || allRows.length === 0) {
    return { data: null, error };
  }

  const configIds = allRows.map((r: { id: string }) => r.id);
  const { data: links } = await supabase
    .from('approval_config_departments')
    .select('approval_config_id, department_id')
    .in('approval_config_id', configIds);

  const linkMap = new Map<string, string[]>();
  for (const l of (links || []) as { approval_config_id: string; department_id: string }[]) {
    const arr = linkMap.get(l.approval_config_id) || [];
    arr.push(l.department_id);
    linkMap.set(l.approval_config_id, arr);
  }

  const match = allRows.find((r: { id: string }) => {
    const depts = linkMap.get(r.id);
    if (!depts || depts.length === 0) return true;
    return depts.includes(departmentId);
  });

  return { data: match ?? null, error: null };
}

/**
 * Retorna o aprovador necessário conforme valor, escopo e setor.
 * Para `pedido`, se não houver linha com role_name = 'pedido', tenta linhas que não sejam de requisição (legado).
 */
export async function getAprovadorNecessario(
  valorTotal: number,
  supabase: SupabaseClient,
  escopo: ApprovalConfigEscopo = 'pedido',
  departmentId?: string
): Promise<AprovadorNecessario> {
  const { data, error } = await fetchFaixa({
    valorTotal,
    supabase,
    roleFilter: escopo === 'pedido'
      ? { op: 'eq', roleName: 'pedido' }
      : { op: 'eq', roleName: 'requisicao' },
    departmentId,
  });

  if (error) {
    console.error('Erro ao buscar aprovador:', error);
    return { userId: null, roleName: escopo };
  }

  let row = data;

  if (!row && escopo === 'pedido') {
    const second = await fetchFaixa({
      valorTotal,
      supabase,
      roleFilter: { op: 'neq', roleName: 'requisicao' },
      departmentId,
    });
    if (second.error) {
      console.error('Erro ao buscar aprovador (fallback pedido):', second.error);
      return { userId: null, roleName: 'pedido' };
    }
    row = second.data;
  }

  if (!row) {
    return { userId: null, roleName: escopo };
  }
  return {
    userId: row.user_id ?? null,
    roleName: row.role_name ?? escopo,
  };
}

/**
 * Verifica se o usuário está cadastrado como aprovador (qualquer faixa ativa).
 * Passe `escopo` para restringir a pedidos ou apenas requisições.
 */
export async function isUserAprovador(
  userId: string,
  supabase: SupabaseClient,
  escopo?: ApprovalConfigEscopo
): Promise<boolean> {
  let q = supabase.from('approval_config').select('id').eq('user_id', userId).eq('active', true);
  if (escopo) {
    q = q.eq('role_name', escopo);
  }
  const { data, error } = await q.limit(1).maybeSingle();

  if (error) return false;
  return !!data;
}
