-- Vínculos do processo: mesmos dados ricos da tela de SC nas RPCs de COT e PC

-- Cotação vinculada (tooltip / card)
create or replace function public._cmp_cotacao_vinculo_rico(p_cotacao_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', c.id,
    'numero', c.numero,
    'titulo', c.titulo,
    'status', c.status,
    'comprador', public._cmp_profile_mini(c.comprador_id),
    'prazo_resposta', c.prazo_resposta,
    'created_at', c.created_at,
    'itens_count', (
      select count(*)::int
        from public.cmp_cotacoes_itens ci
       where ci.cotacao_id = c.id
    ),
    'fornecedores_count', (
      select count(*)::int
        from public.cmp_cotacoes_fornecedores cf
       where cf.cotacao_id = c.id
    ),
    'total_escolhido', (
      select coalesce(sum(ci.quantidade * e.preco_final_unitario), 0)
        from public.cmp_cotacoes_escolhas e
        join public.cmp_cotacoes_itens ci on ci.id = e.cotacao_item_id
       where e.cotacao_id = c.id
    )
  )
  from public.cmp_cotacoes c
  where c.id = p_cotacao_id;
$$;

-- Pedidos vinculados (mesma cotação) com totais e itens_resumo
create or replace function public._cmp_pedidos_vinculo_cotacao(p_cotacao_id uuid)
returns jsonb
language sql
stable
as $$
  with peds as (
    select p.*,
           (select coalesce(sum(pi.quantidade * pi.preco_unitario), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as total,
           (select coalesce(sum(pi.quantidade), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_total,
           (select coalesce(sum(pi.quantidade_recebida), 0)
              from public.cmp_pedidos_compra_itens pi where pi.pedido_id = p.id) as qtd_recebida
      from public.cmp_pedidos_compra p
     where p.cotacao_id = p_cotacao_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'numero', p.numero,
    'status', p.status,
    'cotacao_id', p.cotacao_id,
    'fornecedor', public._cmp_fornecedor_mini(p.fornecedor_id),
    'created_at', p.created_at,
    'enviado_em', p.enviado_em,
    'total', p.total,
    'qtd_total', p.qtd_total,
    'qtd_recebida', p.qtd_recebida,
    'itens_resumo', public._cmp_pedido_itens_resumo(p.id)
  ) order by p.created_at desc), '[]'::jsonb)
  from peds p;
$$;

-- SCs vinculadas (empresa + departamento para tooltip)
create or replace function public._cmp_scs_vinculo_rico(p_sc_ids uuid[])
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id,
    'numero', sc.numero,
    'status', sc.status,
    'created_at', sc.created_at,
    'empresa', case when e.id is not null then jsonb_build_object(
      'nome_fantasia', e.nome_fantasia,
      'razao_social', e.razao_social
    ) else null end,
    'departamento', case when d.id is not null then jsonb_build_object(
      'codigo', d.codigo,
      'nome', d.nome
    ) else null end
  ) order by sc.created_at desc), '[]'::jsonb)
  from public.cmp_solicitacoes_compra sc
  left join public.core_empresas e on e.id = sc.empresa_id
  left join public.core_departamentos d on d.id = sc.departamento_id
  where sc.id = any (coalesce(p_sc_ids, array[]::uuid[]));
$$;

-- ── cmp_detalhe_pedido: cotação rica, SCs ricas, pedidos da cotação ──
create or replace function public.cmp_detalhe_pedido(p_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_ped            jsonb;
  v_itens          jsonb;
  v_recebimentos   jsonb;
  v_scs_origem     jsonb;
  v_pedidos_vinc   jsonb;
  v_historico      jsonb;
  v_sc_ids         uuid[];
  v_cotacao_id     uuid;
begin
  select p.cotacao_id into v_cotacao_id
    from public.cmp_pedidos_compra p
   where p.id = p_id;

  select jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status,
    'empresa_id', p.empresa_id, 'fornecedor_id', p.fornecedor_id,
    'cotacao_id', p.cotacao_id,
    'comprador_id', p.comprador_id, 'aprovador_id', p.aprovador_id,
    'prazo_entrega_dias', p.prazo_entrega_dias,
    'condicao_pagamento', p.condicao_pagamento,
    'observacoes', p.observacoes,
    'aprovado_em', p.aprovado_em, 'enviado_em', p.enviado_em,
    'cancelada_em', p.cancelada_em, 'motivo_cancelamento', p.motivo_cancelamento,
    'created_at', p.created_at, 'updated_at', p.updated_at,
    'empresa', case when e.id is not null then jsonb_build_object(
      'id', e.id, 'razao_social', e.razao_social, 'nome_fantasia', e.nome_fantasia, 'cnpj', e.cnpj
    ) else null end,
    'fornecedor', public._cmp_fornecedor_mini(p.fornecedor_id),
    'cotacao', case when v_cotacao_id is not null
      then public._cmp_cotacao_vinculo_rico(v_cotacao_id)
      else null end,
    'comprador', public._cmp_profile_mini(p.comprador_id),
    'aprovador', public._cmp_profile_mini(p.aprovador_id)
  )
  into v_ped
  from public.cmp_pedidos_compra p
  left join public.core_empresas e on e.id = p.empresa_id
  where p.id = p_id;

  if v_ped is null then
    return null;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', i.id, 'pedido_id', i.pedido_id, 'linha', i.linha,
    'solicitacao_item_id', i.solicitacao_item_id, 'cotacao_item_id', i.cotacao_item_id,
    'produto_id', i.produto_id, 'unidade_medida_id', i.unidade_medida_id,
    'quantidade', i.quantidade, 'preco_unitario', i.preco_unitario,
    'quantidade_recebida', i.quantidade_recebida,
    'observacao', i.observacao, 'status_item', i.status_item,
    'produto', case when pr.id is not null then jsonb_build_object(
      'id', pr.id, 'codigo', pr.codigo, 'nome', pr.nome,
      'tipo', pr.tipo, 'imagem_url', pr.imagem_url
    ) else null end,
    'unidade_medida', case when um.id is not null then jsonb_build_object(
      'id', um.id, 'nome', um.nome, 'sigla', um.sigla
    ) else null end
  ) order by i.linha), '[]'::jsonb)
  into v_itens
  from public.cmp_pedidos_compra_itens i
  left join public.prd_produtos pr on pr.id = i.produto_id
  left join public.prd_unidades_medida um on um.id = i.unidade_medida_id
  where i.pedido_id = p_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'numero', r.numero, 'data_recebimento', r.data_recebimento,
    'observacoes', r.observacoes,
    'recebedor', public._cmp_profile_mini(r.recebedor_id)
  ) order by r.data_recebimento desc), '[]'::jsonb)
  into v_recebimentos
  from public.cmp_recebimentos r
  where r.pedido_id = p_id;

  with sc_ids as (
    select distinct vinc.solicitacao_id
      from public.cmp_cotacoes_solicitacoes vinc
     where vinc.cotacao_id = v_cotacao_id
    union
    select distinct si.solicitacao_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
     where pi.pedido_id = p_id
  )
  select array_agg(solicitacao_id) into v_sc_ids from sc_ids;

  v_scs_origem := public._cmp_scs_vinculo_rico(v_sc_ids);

  if v_cotacao_id is not null then
    v_pedidos_vinc := public._cmp_pedidos_vinculo_cotacao(v_cotacao_id);
  else
    v_pedidos_vinc := '[]'::jsonb;
  end if;

  v_historico := public.cmp_historico('pedido', p_id);

  return jsonb_build_object(
    'pedido',         v_ped,
    'itens',          v_itens,
    'recebimentos',   v_recebimentos,
    'scs_origem',     v_scs_origem,
    'pedidos_vinc',   v_pedidos_vinc,
    'historico',      v_historico
  );
end;
$$;

-- ── cmp_detalhe_cotacao: SCs vinculadas com empresa/departamento ──
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
  v_sc_ids       uuid[];
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

  select array_agg(vinc.solicitacao_id) into v_sc_ids
    from public.cmp_cotacoes_solicitacoes vinc
   where vinc.cotacao_id = p_id;

  v_scs := public._cmp_scs_vinculo_rico(v_sc_ids);

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
    'cotacao_id', p.cotacao_id,
    'fornecedor', public._cmp_fornecedor_mini(p.fornecedor_id),
    'created_at', p.created_at,
    'enviado_em', p.enviado_em,
    'total', p.total, 'qtd_total', p.qtd_total, 'qtd_recebida', p.qtd_recebida,
    'itens_resumo', public._cmp_pedido_itens_resumo(p.id)
  ) order by p.created_at desc), '[]'::jsonb)
  into v_pedidos
  from peds p;

  v_historico := public.cmp_historico('cotacao', p_id);

  return jsonb_build_object(
    'cotacao',        v_cot,
    'itens',          v_itens,
    'fornecedores',   v_fornecedores,
    'respostas',      v_respostas,
    'escolhas',       v_escolhas,
    'scs_vinculadas', v_scs,
    'pedidos',        v_pedidos,
    'historico',      v_historico
  );
end;
$$;
