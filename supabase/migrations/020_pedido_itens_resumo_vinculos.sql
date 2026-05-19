-- Resumo de itens para tooltips de pedidos vinculados (SC / Cotação / painéis)

create or replace function public._cmp_pedido_itens_resumo(p_pedido_id uuid)
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'linha', i.linha,
    'nome', coalesce(pr.nome, '—'),
    'codigo', pr.codigo,
    'quantidade', i.quantidade,
    'unidade', um.sigla,
    'preco_unitario', i.preco_unitario,
    'total', i.quantidade * i.preco_unitario,
    'quantidade_recebida', i.quantidade_recebida
  ) order by i.linha), '[]'::jsonb)
  from public.cmp_pedidos_compra_itens i
  left join public.prd_produtos pr on pr.id = i.produto_id
  left join public.prd_unidades_medida um on um.id = i.unidade_medida_id
  where i.pedido_id = p_pedido_id;
$$;

-- Atualiza cmp_detalhe_solicitacao: pedidos passam a incluir itens_resumo
create or replace function public.cmp_detalhe_solicitacao(p_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sc           jsonb;
  v_itens        jsonb;
  v_cotacoes     jsonb;
  v_pedidos      jsonb;
  v_recebimentos jsonb;
  v_historico    jsonb;
  v_cot_ids      uuid[];
  v_ped_ids      uuid[];
begin
  select jsonb_build_object(
    'id', sc.id, 'numero', sc.numero, 'status', sc.status,
    'prioridade', sc.prioridade,
    'empresa_id', sc.empresa_id, 'departamento_id', sc.departamento_id,
    'solicitante_id', sc.solicitante_id, 'aprovador_id', sc.aprovador_id,
    'data_necessaria', sc.data_necessaria,
    'justificativa', sc.justificativa, 'observacoes', sc.observacoes,
    'aprovado_em', sc.aprovado_em, 'cancelada_em', sc.cancelada_em,
    'motivo_reprovacao', sc.motivo_reprovacao,
    'enviada_em', sc.enviada_em,
    'created_at', sc.created_at, 'updated_at', sc.updated_at,
    'empresa', case when e.id is not null then jsonb_build_object(
                  'id', e.id, 'razao_social', e.razao_social, 'nome_fantasia', e.nome_fantasia,
                  'cnpj', e.cnpj
                ) else null end,
    'departamento', case when d.id is not null then jsonb_build_object(
                  'id', d.id, 'codigo', d.codigo, 'nome', d.nome,
                  'gestor_id', d.gestor_id,
                  'gestor', public._cmp_profile_mini(d.gestor_id)
                ) else null end,
    'solicitante', public._cmp_profile_mini(sc.solicitante_id),
    'aprovador',   public._cmp_profile_mini(sc.aprovador_id)
  )
  into v_sc
  from public.cmp_solicitacoes_compra sc
  left join public.core_empresas      e on e.id = sc.empresa_id
  left join public.core_departamentos d on d.id = sc.departamento_id
  where sc.id = p_id;

  if v_sc is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'solicitacao_id', i.solicitacao_id, 'linha', i.linha,
    'produto_id', i.produto_id, 'variante_id', i.variante_id,
    'unidade_medida_id', i.unidade_medida_id,
    'quantidade', i.quantidade, 'preco_estimado', i.preco_estimado,
    'observacao', i.observacao, 'status_item', i.status_item,
    'created_at', i.created_at, 'updated_at', i.updated_at,
    'produto', case when pr.id is not null then jsonb_build_object(
                  'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome,
                  'tipo', pr.tipo, 'imagem_url', pr.imagem_url
                ) else null end,
    'unidade_medida', case when um.id is not null then jsonb_build_object(
                  'id', um.id, 'nome', um.nome, 'sigla', um.sigla
                ) else null end
  ) order by i.linha), '[]'::jsonb)
  into v_itens
  from public.cmp_solicitacoes_compra_itens i
  left join public.prd_produtos        pr on pr.id = i.produto_id
  left join public.prd_unidades_medida um on um.id = i.unidade_medida_id
  where i.solicitacao_id = p_id;

  select array_agg(cotacao_id) into v_cot_ids
    from public.cmp_cotacoes_solicitacoes
   where solicitacao_id = p_id;

  with cots as (
    select c.*
      from public.cmp_cotacoes c
     where c.id = any (coalesce(v_cot_ids, array[]::uuid[]))
  ),
  cots_agg as (
    select c.*,
           (select count(*) from public.cmp_cotacoes_itens ci where ci.cotacao_id = c.id) as itens_count,
           (select count(*) from public.cmp_cotacoes_fornecedores cf where cf.cotacao_id = c.id) as fornecedores_count,
           (select coalesce(sum(ci.quantidade * e.preco_final_unitario), 0)
              from public.cmp_cotacoes_escolhas e
              join public.cmp_cotacoes_itens ci on ci.id = e.cotacao_item_id
             where e.cotacao_id = c.id) as total_escolhido
      from cots c
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'status', c.status,
    'comprador', public._cmp_profile_mini(c.comprador_id),
    'prazo_resposta', c.prazo_resposta,
    'created_at', c.created_at,
    'itens_count', c.itens_count,
    'fornecedores_count', c.fornecedores_count,
    'total_escolhido', c.total_escolhido
  ) order by c.created_at desc), '[]'::jsonb)
  into v_cotacoes
  from cots_agg c;

  select array_agg(distinct pid) into v_ped_ids from (
    select p.id as pid
      from public.cmp_pedidos_compra p
     where p.cotacao_id = any (coalesce(v_cot_ids, array[]::uuid[]))
    union
    select pi.pedido_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
     where si.solicitacao_id = p_id
  ) sub;

  with peds as (
    select p.*,
           (select coalesce(sum(pi.quantidade * pi.preco_unitario), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as total,
           (select coalesce(sum(pi.quantidade), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_total,
           (select coalesce(sum(pi.quantidade_recebida), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_recebida
      from public.cmp_pedidos_compra p
     where p.id = any (coalesce(v_ped_ids, array[]::uuid[]))
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status,
    'cotacao_id', p.cotacao_id, 'fornecedor_id', p.fornecedor_id,
    'fornecedor', public._cmp_fornecedor_mini(p.fornecedor_id),
    'created_at', p.created_at, 'enviado_em', p.enviado_em,
    'total', p.total, 'qtd_total', p.qtd_total, 'qtd_recebida', p.qtd_recebida,
    'itens_resumo', public._cmp_pedido_itens_resumo(p.id)
  ) order by p.created_at desc), '[]'::jsonb)
  into v_pedidos
  from peds p;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'numero', r.numero, 'pedido_id', r.pedido_id,
    'data_recebimento', r.data_recebimento, 'observacoes', r.observacoes,
    'pedido_numero', p.numero
  ) order by r.data_recebimento desc), '[]'::jsonb)
  into v_recebimentos
  from public.cmp_recebimentos r
  join public.cmp_pedidos_compra p on p.id = r.pedido_id
  where r.pedido_id = any (coalesce(v_ped_ids, array[]::uuid[]));

  v_historico := public.cmp_historico('solicitacao', p_id);

  return jsonb_build_object(
    'sc',            v_sc,
    'itens',         v_itens,
    'cotacoes',      v_cotacoes,
    'pedidos',       v_pedidos,
    'recebimentos',  v_recebimentos,
    'historico',     v_historico
  );
end;
$$;

-- Atualiza cmp_detalhe_cotacao: pedidos com itens_resumo
create or replace function public.cmp_detalhe_cotacao(p_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_cot          jsonb;
  v_itens        jsonb;
  v_fornecedores jsonb;
  v_escolhas     jsonb;
  v_respostas    jsonb;
  v_scs          jsonb;
  v_pedidos      jsonb;
  v_historico    jsonb;
begin
  select jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'titulo', c.titulo, 'status', c.status,
    'empresa_id', c.empresa_id, 'comprador_id', c.comprador_id,
    'aprovador_id', c.aprovador_id, 'aprovado_em', c.aprovado_em,
    'prazo_resposta', c.prazo_resposta, 'observacoes', c.observacoes,
    'motivo_reprovacao', c.motivo_reprovacao,
    'cancelada_em', c.cancelada_em,
    'created_at', c.created_at, 'updated_at', c.updated_at,
    'empresa', case when e.id is not null then jsonb_build_object(
                  'id', e.id, 'razao_social', e.razao_social, 'nome_fantasia', e.nome_fantasia, 'cnpj', e.cnpj
                ) else null end,
    'comprador', public._cmp_profile_mini(c.comprador_id),
    'aprovador', public._cmp_profile_mini(c.aprovador_id)
  )
  into v_cot
  from public.cmp_cotacoes c
  left join public.core_empresas e on e.id = c.empresa_id
  where c.id = p_id;

  if v_cot is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'cotacao_id', i.cotacao_id, 'linha', i.linha,
    'solicitacao_item_id', i.solicitacao_item_id,
    'produto_id', i.produto_id, 'unidade_medida_id', i.unidade_medida_id,
    'quantidade', i.quantidade, 'observacao', i.observacao,
    'created_at', i.created_at,
    'produto', case when pr.id is not null then jsonb_build_object(
                  'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome,
                  'tipo', pr.tipo, 'imagem_url', pr.imagem_url
                ) else null end,
    'unidade_medida', case when um.id is not null then jsonb_build_object(
                  'id', um.id, 'nome', um.nome, 'sigla', um.sigla
                ) else null end
  ) order by i.linha), '[]'::jsonb)
  into v_itens
  from public.cmp_cotacoes_itens i
  left join public.prd_produtos pr on pr.id = i.produto_id
  left join public.prd_unidades_medida um on um.id = i.unidade_medida_id
  where i.cotacao_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', cf.id, 'cotacao_id', cf.cotacao_id, 'fornecedor_id', cf.fornecedor_id,
    'status_convite', cf.status_convite,
    'prazo_entrega_dias', cf.prazo_entrega_dias,
    'condicao_pagamento', cf.condicao_pagamento,
    'observacao', cf.observacao,
    'respondido_em', cf.respondido_em,
    'created_at', cf.created_at,
    'fornecedor', public._cmp_fornecedor_mini(cf.fornecedor_id)
  ) order by cf.created_at), '[]'::jsonb)
  into v_fornecedores
  from public.cmp_cotacoes_fornecedores cf
  where cf.cotacao_id = p_id;

  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  into v_respostas
  from public.cmp_cotacoes_respostas_itens r
  where r.cotacao_fornecedor_id in (
    select id from public.cmp_cotacoes_fornecedores where cotacao_id = p_id
  );

  select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
  into v_escolhas
  from public.cmp_cotacoes_escolhas e
  where e.cotacao_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id, 'numero', sc.numero, 'status', sc.status
  )), '[]'::jsonb)
  into v_scs
  from public.cmp_cotacoes_solicitacoes vinc
  join public.cmp_solicitacoes_compra sc on sc.id = vinc.solicitacao_id
  where vinc.cotacao_id = p_id;

  with peds as (
    select p.*,
           (select coalesce(sum(pi.quantidade * pi.preco_unitario), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as total,
           (select coalesce(sum(pi.quantidade), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_total,
           (select coalesce(sum(pi.quantidade_recebida), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_recebida
      from public.cmp_pedidos_compra p
     where p.cotacao_id = p_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status,
    'fornecedor', public._cmp_fornecedor_mini(p.fornecedor_id),
    'created_at', p.created_at,
    'total', p.total, 'qtd_total', p.qtd_total, 'qtd_recebida', p.qtd_recebida,
    'itens_resumo', public._cmp_pedido_itens_resumo(p.id)
  ) order by p.created_at desc), '[]'::jsonb)
  into v_pedidos
  from peds p;

  v_historico := public.cmp_historico('cotacao', p_id);

  return jsonb_build_object(
    'cotacao',      v_cot,
    'itens',        v_itens,
    'fornecedores', v_fornecedores,
    'respostas',    v_respostas,
    'escolhas',     v_escolhas,
    'scs_vinculadas', v_scs,
    'pedidos',      v_pedidos,
    'historico',    v_historico
  );
end;
$$;
