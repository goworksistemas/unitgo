-- ============================================================
-- 017_compras_rpcs_performance.sql
--
-- Objetivo: reduzir drasticamente o tempo de carregamento das telas
-- do módulo de Compras consolidando 5-15 queries por tela em UMA
-- única chamada RPC que devolve JSONB pronto pro frontend.
--
-- Estrutura do arquivo:
--   1. Índices (joins, filtros e ORDER BY frequentes)
--   2. Funções privadas auxiliares (resolução de nomes/avatares)
--   3. Funções de histórico consolidado
--   4. RPCs de detalhe (Solicitação / Cotação / Pedido)
--   5. RPCs de painel (versão leve usada pelas listas expansíveis)
--   6. RPC da Linha do Tempo (5 etapas do processo)
--   7. GRANTs
--
-- Todas as funções são STABLE + SECURITY INVOKER (RLS preservado).
-- Não há SECURITY DEFINER em nenhuma função: o usuário continua
-- vendo apenas o que as policies já permitem.
-- ============================================================


-- ============================================================
-- 1. ÍNDICES (idempotentes)
-- ============================================================

-- ── Solicitações ─────────────────────────────────────────────
create index if not exists idx_cmp_sc_status_created
  on public.cmp_solicitacoes_compra (status, created_at desc);
create index if not exists idx_cmp_sc_solicitante
  on public.cmp_solicitacoes_compra (solicitante_id);
create index if not exists idx_cmp_sc_departamento
  on public.cmp_solicitacoes_compra (departamento_id);
create index if not exists idx_cmp_sc_empresa
  on public.cmp_solicitacoes_compra (empresa_id);
create index if not exists idx_cmp_sc_numero
  on public.cmp_solicitacoes_compra (numero text_pattern_ops);

create index if not exists idx_cmp_sc_itens_sc
  on public.cmp_solicitacoes_compra_itens (solicitacao_id, linha);
create index if not exists idx_cmp_sc_itens_produto
  on public.cmp_solicitacoes_compra_itens (produto_id);
create index if not exists idx_cmp_sc_itens_status
  on public.cmp_solicitacoes_compra_itens (status_item);

-- ── Cotações ─────────────────────────────────────────────────
create index if not exists idx_cmp_cot_status_created
  on public.cmp_cotacoes (status, created_at desc);
create index if not exists idx_cmp_cot_comprador
  on public.cmp_cotacoes (comprador_id);
create index if not exists idx_cmp_cot_empresa
  on public.cmp_cotacoes (empresa_id);
create index if not exists idx_cmp_cot_numero
  on public.cmp_cotacoes (numero text_pattern_ops);

create index if not exists idx_cmp_cot_sol_cot
  on public.cmp_cotacoes_solicitacoes (cotacao_id);
create index if not exists idx_cmp_cot_sol_sc
  on public.cmp_cotacoes_solicitacoes (solicitacao_id);

create index if not exists idx_cmp_cot_itens_cot
  on public.cmp_cotacoes_itens (cotacao_id, linha);
create index if not exists idx_cmp_cot_itens_sc_item
  on public.cmp_cotacoes_itens (solicitacao_item_id);
create index if not exists idx_cmp_cot_itens_produto
  on public.cmp_cotacoes_itens (produto_id);

create index if not exists idx_cmp_cot_forn_cot
  on public.cmp_cotacoes_fornecedores (cotacao_id);
create index if not exists idx_cmp_cot_forn_forn
  on public.cmp_cotacoes_fornecedores (fornecedor_id);

create index if not exists idx_cmp_cot_resp_cf
  on public.cmp_cotacoes_respostas_itens (cotacao_fornecedor_id);
create index if not exists idx_cmp_cot_resp_item
  on public.cmp_cotacoes_respostas_itens (cotacao_item_id);

create index if not exists idx_cmp_cot_esc_cot
  on public.cmp_cotacoes_escolhas (cotacao_id);
create index if not exists idx_cmp_cot_esc_item
  on public.cmp_cotacoes_escolhas (cotacao_item_id);

-- ── Pedidos ─────────────────────────────────────────────────
create index if not exists idx_cmp_ped_status_created
  on public.cmp_pedidos_compra (status, created_at desc);
create index if not exists idx_cmp_ped_cotacao
  on public.cmp_pedidos_compra (cotacao_id);
create index if not exists idx_cmp_ped_fornecedor
  on public.cmp_pedidos_compra (fornecedor_id);
create index if not exists idx_cmp_ped_comprador
  on public.cmp_pedidos_compra (comprador_id);
create index if not exists idx_cmp_ped_aprovador
  on public.cmp_pedidos_compra (aprovador_id);
create index if not exists idx_cmp_ped_numero
  on public.cmp_pedidos_compra (numero text_pattern_ops);

create index if not exists idx_cmp_ped_itens_ped
  on public.cmp_pedidos_compra_itens (pedido_id, linha);
create index if not exists idx_cmp_ped_itens_sc_item
  on public.cmp_pedidos_compra_itens (solicitacao_item_id);
create index if not exists idx_cmp_ped_itens_cot_item
  on public.cmp_pedidos_compra_itens (cotacao_item_id);

-- ── Recebimentos ─────────────────────────────────────────────
create index if not exists idx_cmp_rec_pedido
  on public.cmp_recebimentos (pedido_id, data_recebimento desc);
create index if not exists idx_cmp_rec_recebedor
  on public.cmp_recebimentos (recebedor_id);

-- ── Aprovações ───────────────────────────────────────────────
create index if not exists idx_cmp_aprov_doc
  on public.cmp_aprovacoes (documento_tipo, documento_id, created_at);


-- ============================================================
-- 2. HELPERS PRIVADAS
-- ============================================================

-- Resolve nome amigável (nome > email) de um profile pelo id.
-- Retorna null se id null ou não encontrado.
create or replace function public._cmp_profile_nome(p_id uuid)
returns text
language sql
stable
as $$
  select coalesce(p.nome, p.email)
    from public.profiles p
   where p.id = p_id;
$$;

-- Retorna jsonb mínimo de um profile (id, nome, email) ou null.
create or replace function public._cmp_profile_mini(p_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object('id', p.id, 'nome', p.nome, 'email', p.email)
    from public.profiles p
   where p.id = p_id;
$$;

-- Retorna jsonb mínimo de um fornecedor.
create or replace function public._cmp_fornecedor_mini(p_id uuid)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
           'id', f.id,
           'razao_social', f.razao_social,
           'nome_fantasia', f.nome_fantasia,
           'cnpj_cpf', f.cnpj_cpf
         )
    from public.cmp_fornecedores f
   where f.id = p_id;
$$;


-- ============================================================
-- 3. HISTÓRICO CONSOLIDADO
-- ============================================================
--
-- Estrutura de cada evento:
-- {
--   "id":             "<chave estável>",                      -- pra React key
--   "quando":         "<timestamptz ISO>",                    -- ordenação
--   "fonte":          "solicitacao|cotacao|pedido|recebimento|fornecedor",
--   "acao":           "criou|enviou|aprovou|reprovou|cancelou|encaminhou
--                      |respondeu|recusou|escolheu|convidou
--                      |marcou_enviado|registrou_recebimento",
--   "titulo":         "<frase legível>",                      -- ex.: "criou a solicitação"
--   "quem":           "<nome ou email>" | null,
--   "comentario":     "<motivo/observação>" | null,
--   "link_tipo":      "solicitacao|cotacao|pedido" | null,    -- pra navegar
--   "link_id":        "<uuid>" | null,
--   "contexto_numero":"<COT-... | PC-...>" | null             -- badge
-- }
--
-- O frontend mapeia (fonte, acao) → tom + ícone visualmente.

-- ── 3.1 Eventos de UMA solicitação (sem expandir vínculos) ──
create or replace function public._cmp_eventos_solicitacao(p_id uuid)
returns setof jsonb
language sql
stable
as $$
  -- Criação
  select jsonb_build_object(
    'id',     'sc-criada-'||sc.id,
    'quando', sc.created_at,
    'fonte',  'solicitacao',
    'acao',   'criou',
    'titulo', 'criou a solicitação',
    'quem',   public._cmp_profile_nome(sc.solicitante_id),
    'link_tipo', 'solicitacao',
    'link_id', sc.id,
    'contexto_numero', sc.numero
  )
  from public.cmp_solicitacoes_compra sc
  where sc.id = p_id

  union all

  -- Aprovações
  select jsonb_build_object(
    'id',     'sc-apr-'||a.id,
    'quando', a.created_at,
    'fonte',  'solicitacao',
    'acao',   a.acao::text,
    'titulo', case a.acao::text
                when 'enviou'     then 'enviou a solicitação para aprovação'
                when 'aprovou'    then 'aprovou a solicitação'
                when 'reprovou'   then 'reprovou a solicitação'
                when 'cancelou'   then 'cancelou a solicitação'
                when 'encaminhou' then 'encaminhou a solicitação'
                else a.acao::text
              end,
    'quem',       public._cmp_profile_nome(a.aprovador_id),
    'comentario', a.comentario,
    'link_tipo',  'solicitacao',
    'link_id',    a.documento_id,
    'contexto_numero', sc.numero
  )
  from public.cmp_aprovacoes a
  join public.cmp_solicitacoes_compra sc on sc.id = a.documento_id
  where a.documento_tipo = 'solicitacao' and a.documento_id = p_id;
$$;

-- ── 3.2 Eventos de UMA cotação (criação, convites, respostas, escolhas, aprovações) ──
create or replace function public._cmp_eventos_cotacao(p_id uuid)
returns setof jsonb
language sql
stable
as $$
  -- Criação
  select jsonb_build_object(
    'id',     'cot-criada-'||c.id,
    'quando', c.created_at,
    'fonte',  'cotacao',
    'acao',   'criou',
    'titulo', 'iniciou a cotação',
    'quem',   public._cmp_profile_nome(c.comprador_id),
    'link_tipo', 'cotacao',
    'link_id', c.id,
    'contexto_numero', c.numero
  )
  from public.cmp_cotacoes c where c.id = p_id

  union all

  -- Aprovações
  select jsonb_build_object(
    'id',     'cot-apr-'||a.id,
    'quando', a.created_at,
    'fonte',  'cotacao',
    'acao',   a.acao::text,
    'titulo', case a.acao::text
                when 'enviou'     then 'enviou a cotação para aprovação'
                when 'aprovou'    then 'aprovou a cotação'
                when 'reprovou'   then 'reprovou a cotação'
                when 'cancelou'   then 'cancelou a cotação'
                when 'encaminhou' then 'encaminhou a cotação'
                else a.acao::text
              end,
    'quem',       public._cmp_profile_nome(a.aprovador_id),
    'comentario', a.comentario,
    'link_tipo',  'cotacao',
    'link_id',    a.documento_id,
    'contexto_numero', c.numero
  )
  from public.cmp_aprovacoes a
  join public.cmp_cotacoes c on c.id = a.documento_id
  where a.documento_tipo = 'cotacao' and a.documento_id = p_id

  union all

  -- Convite a fornecedor
  select jsonb_build_object(
    'id',     'forn-conv-'||cf.id,
    'quando', cf.created_at,
    'fonte',  'fornecedor',
    'acao',   'convidou',
    'titulo', 'convidou '||coalesce(f.nome_fantasia, f.razao_social, 'fornecedor'),
    'link_tipo', 'cotacao',
    'link_id', cf.cotacao_id,
    'contexto_numero', c.numero
  )
  from public.cmp_cotacoes_fornecedores cf
  join public.cmp_fornecedores f on f.id = cf.fornecedor_id
  join public.cmp_cotacoes c on c.id = cf.cotacao_id
  where cf.cotacao_id = p_id

  union all

  -- Resposta (ou recusa) de fornecedor
  select jsonb_build_object(
    'id',     'forn-resp-'||cf.id,
    'quando', cf.respondido_em,
    'fonte',  'fornecedor',
    'acao',   case cf.status_convite::text when 'recusado' then 'recusou' else 'respondeu' end,
    'titulo', case cf.status_convite::text
                when 'recusado' then 'recusou a cotação'
                else 'respondeu a cotação'
              end,
    'quem',       coalesce(f.nome_fantasia, f.razao_social),
    'link_tipo',  'cotacao',
    'link_id',    cf.cotacao_id,
    'contexto_numero', c.numero
  )
  from public.cmp_cotacoes_fornecedores cf
  join public.cmp_fornecedores f on f.id = cf.fornecedor_id
  join public.cmp_cotacoes c on c.id = cf.cotacao_id
  where cf.cotacao_id = p_id and cf.respondido_em is not null

  union all

  -- Escolha de vencedor (agrupa por cotação+fornecedor+segundo)
  select jsonb_build_object(
    'id',     'cot-esc-'||min(e.id::text),
    'quando', min(e.created_at),
    'fonte',  'cotacao',
    'acao',   'escolheu',
    'titulo', 'escolheu '||coalesce(f.nome_fantasia, f.razao_social, 'fornecedor')||' como vencedor',
    'link_tipo', 'cotacao',
    'link_id', e.cotacao_id,
    'contexto_numero', c.numero
  )
  from public.cmp_cotacoes_escolhas e
  join public.cmp_cotacoes_fornecedores cf on cf.id = e.cotacao_fornecedor_id
  join public.cmp_fornecedores f on f.id = cf.fornecedor_id
  join public.cmp_cotacoes c on c.id = e.cotacao_id
  where e.cotacao_id = p_id
  group by e.cotacao_id, e.cotacao_fornecedor_id, f.nome_fantasia, f.razao_social, c.numero,
           date_trunc('second', e.created_at);
$$;

-- ── 3.3 Eventos de UM pedido (criação, aprovações, envio, recebimentos) ──
create or replace function public._cmp_eventos_pedido(p_id uuid)
returns setof jsonb
language sql
stable
as $$
  -- Criação
  select jsonb_build_object(
    'id',     'ped-criado-'||p.id,
    'quando', p.created_at,
    'fonte',  'pedido',
    'acao',   'criou',
    'titulo', 'criou o pedido',
    'quem',   public._cmp_profile_nome(p.comprador_id),
    'link_tipo', 'pedido',
    'link_id', p.id,
    'contexto_numero', p.numero
  )
  from public.cmp_pedidos_compra p where p.id = p_id

  union all

  -- Envio ao fornecedor
  select jsonb_build_object(
    'id',     'ped-enviado-'||p.id,
    'quando', p.enviado_em,
    'fonte',  'pedido',
    'acao',   'marcou_enviado',
    'titulo', 'enviou o pedido ao fornecedor',
    'link_tipo', 'pedido',
    'link_id', p.id,
    'contexto_numero', p.numero
  )
  from public.cmp_pedidos_compra p
  where p.id = p_id and p.enviado_em is not null

  union all

  -- Aprovações
  select jsonb_build_object(
    'id',     'ped-apr-'||a.id,
    'quando', a.created_at,
    'fonte',  'pedido',
    'acao',   a.acao::text,
    'titulo', case a.acao::text
                when 'enviou'     then 'enviou o pedido para aprovação'
                when 'aprovou'    then 'aprovou o pedido'
                when 'reprovou'   then 'reprovou o pedido'
                when 'cancelou'   then 'cancelou o pedido'
                when 'encaminhou' then 'encaminhou o pedido'
                else a.acao::text
              end,
    'quem',       public._cmp_profile_nome(a.aprovador_id),
    'comentario', a.comentario,
    'link_tipo',  'pedido',
    'link_id',    a.documento_id,
    'contexto_numero', p.numero
  )
  from public.cmp_aprovacoes a
  join public.cmp_pedidos_compra p on p.id = a.documento_id
  where a.documento_tipo = 'pedido' and a.documento_id = p_id

  union all

  -- Recebimentos
  select jsonb_build_object(
    'id',     'rec-'||r.id,
    'quando', r.data_recebimento,
    'fonte',  'recebimento',
    'acao',   'registrou_recebimento',
    'titulo', 'registrou recebimento '||r.numero,
    'quem',       public._cmp_profile_nome(r.recebedor_id),
    'comentario', r.observacoes,
    'link_tipo',  'pedido',
    'link_id',    r.pedido_id,
    'contexto_numero', p.numero
  )
  from public.cmp_recebimentos r
  join public.cmp_pedidos_compra p on p.id = r.pedido_id
  where r.pedido_id = p_id;
$$;

-- ── 3.4 RPC PÚBLICA: histórico consolidado ──
-- p_tipo ∈ ('solicitacao', 'cotacao', 'pedido')
-- Para 'solicitacao': inclui eventos da SC + de cada cotação vinculada
-- + de cada pedido (via cotação ou direto via solicitacao_item_id) + recebimentos.
-- Para 'cotacao': inclui eventos da cotação + pedidos gerados a partir dela.
-- Para 'pedido': inclui apenas eventos do pedido + recebimentos.
create or replace function public.cmp_historico(p_tipo text, p_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_cot_ids uuid[];
  v_ped_ids uuid[];
  v_eventos jsonb;
begin
  if p_tipo = 'solicitacao' then
    -- Cotações vinculadas
    select array_agg(cotacao_id) into v_cot_ids
      from public.cmp_cotacoes_solicitacoes
     where solicitacao_id = p_id;

    -- Pedidos: via cotação OU diretos (matchando solicitacao_item_id dos itens)
    select array_agg(distinct pid) into v_ped_ids from (
      select cotacao_id::uuid as ignore, p.id as pid
        from public.cmp_pedidos_compra p
       where p.cotacao_id = any (coalesce(v_cot_ids, array[]::uuid[]))
      union
      select null::uuid, pi.pedido_id
        from public.cmp_pedidos_compra_itens pi
        join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
       where si.solicitacao_id = p_id
    ) sub;

    with eventos as (
      select * from public._cmp_eventos_solicitacao(p_id)
      union all
      select e.* from unnest(coalesce(v_cot_ids, array[]::uuid[])) cot_id, lateral public._cmp_eventos_cotacao(cot_id) e
      union all
      select e.* from unnest(coalesce(v_ped_ids, array[]::uuid[])) ped_id, lateral public._cmp_eventos_pedido(ped_id) e
    )
    select coalesce(jsonb_agg(ev order by (ev->>'quando')::timestamptz desc), '[]'::jsonb)
      into v_eventos
      from eventos e(ev)
     where ev->>'quando' is not null;

  elsif p_tipo = 'cotacao' then
    select array_agg(id) into v_ped_ids
      from public.cmp_pedidos_compra
     where cotacao_id = p_id;

    with eventos as (
      select * from public._cmp_eventos_cotacao(p_id)
      union all
      select e.* from unnest(coalesce(v_ped_ids, array[]::uuid[])) ped_id, lateral public._cmp_eventos_pedido(ped_id) e
    )
    select coalesce(jsonb_agg(ev order by (ev->>'quando')::timestamptz desc), '[]'::jsonb)
      into v_eventos
      from eventos e(ev)
     where ev->>'quando' is not null;

  elsif p_tipo = 'pedido' then
    select coalesce(jsonb_agg(ev order by (ev->>'quando')::timestamptz desc), '[]'::jsonb)
      into v_eventos
      from public._cmp_eventos_pedido(p_id) e(ev)
     where ev->>'quando' is not null;

  else
    raise exception 'p_tipo inválido: %', p_tipo;
  end if;

  return v_eventos;
end;
$$;


-- ============================================================
-- 4. RPC: DETALHE DA SOLICITAÇÃO
-- ============================================================
--
-- Retorna em UMA chamada: SC + itens + cotações vinculadas (com totais)
-- + pedidos vinculados (com totais) + recebimentos + histórico.
--
-- Substitui ~8 round-trips da SolicitacaoDetalhePage.
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
  -- ── SC + relacionados (1 row) ──
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

  -- ── Itens (com produto e unidade) ──
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

  -- ── Cotações vinculadas ──
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

  -- ── Pedidos vinculados (via cotação OU direto via solicitacao_item_id) ──
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
    'total', p.total, 'qtd_total', p.qtd_total, 'qtd_recebida', p.qtd_recebida
  ) order by p.created_at desc), '[]'::jsonb)
  into v_pedidos
  from peds p;

  -- ── Recebimentos (dos pedidos vinculados) ──
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'numero', r.numero, 'pedido_id', r.pedido_id,
    'data_recebimento', r.data_recebimento, 'observacoes', r.observacoes,
    'pedido_numero', p.numero
  ) order by r.data_recebimento desc), '[]'::jsonb)
  into v_recebimentos
  from public.cmp_recebimentos r
  join public.cmp_pedidos_compra p on p.id = r.pedido_id
  where r.pedido_id = any (coalesce(v_ped_ids, array[]::uuid[]));

  -- ── Histórico consolidado ──
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


-- ============================================================
-- 5. RPC: DETALHE DA COTAÇÃO
-- ============================================================
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

  -- Itens
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

  -- Fornecedores
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

  -- Respostas (restritas aos fornecedores desta cotação)
  select coalesce(jsonb_agg(to_jsonb(r)), '[]'::jsonb)
  into v_respostas
  from public.cmp_cotacoes_respostas_itens r
  where r.cotacao_fornecedor_id in (
    select id from public.cmp_cotacoes_fornecedores where cotacao_id = p_id
  );

  -- Escolhas
  select coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
  into v_escolhas
  from public.cmp_cotacoes_escolhas e
  where e.cotacao_id = p_id;

  -- SCs vinculadas (mini)
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id, 'numero', sc.numero, 'status', sc.status
  )), '[]'::jsonb)
  into v_scs
  from public.cmp_cotacoes_solicitacoes vinc
  join public.cmp_solicitacoes_compra sc on sc.id = vinc.solicitacao_id
  where vinc.cotacao_id = p_id;

  -- Pedidos gerados (mini com totais)
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
    'total', p.total, 'qtd_total', p.qtd_total, 'qtd_recebida', p.qtd_recebida
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


-- ============================================================
-- 6. RPC: DETALHE DO PEDIDO
-- ============================================================
create or replace function public.cmp_detalhe_pedido(p_id uuid)
returns jsonb
language plpgsql
stable
as $$
declare
  v_ped         jsonb;
  v_itens       jsonb;
  v_recebimentos jsonb;
  v_scs_origem  jsonb;
  v_historico   jsonb;
  v_sc_ids      uuid[];
begin
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
    'cotacao', case when c.id is not null then jsonb_build_object(
                  'id', c.id, 'numero', c.numero, 'status', c.status
                ) else null end,
    'comprador', public._cmp_profile_mini(p.comprador_id),
    'aprovador', public._cmp_profile_mini(p.aprovador_id)
  )
  into v_ped
  from public.cmp_pedidos_compra p
  left join public.core_empresas e on e.id = p.empresa_id
  left join public.cmp_cotacoes  c on c.id = p.cotacao_id
  where p.id = p_id;

  if v_ped is null then
    return null;
  end if;

  -- Itens
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

  -- Recebimentos
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'numero', r.numero, 'data_recebimento', r.data_recebimento,
    'observacoes', r.observacoes,
    'recebedor', public._cmp_profile_mini(r.recebedor_id)
  ) order by r.data_recebimento desc), '[]'::jsonb)
  into v_recebimentos
  from public.cmp_recebimentos r
  where r.pedido_id = p_id;

  -- SCs origem: via cotação OU via solicitacao_item_id dos itens
  with sc_ids as (
    select distinct vinc.solicitacao_id
      from public.cmp_cotacoes_solicitacoes vinc
     where vinc.cotacao_id = (select cotacao_id from public.cmp_pedidos_compra where id = p_id)
    union
    select distinct si.solicitacao_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
     where pi.pedido_id = p_id
  )
  select array_agg(solicitacao_id) into v_sc_ids from sc_ids;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', sc.id, 'numero', sc.numero, 'status', sc.status
  )), '[]'::jsonb)
  into v_scs_origem
  from public.cmp_solicitacoes_compra sc
  where sc.id = any (coalesce(v_sc_ids, array[]::uuid[]));

  v_historico := public.cmp_historico('pedido', p_id);

  return jsonb_build_object(
    'pedido',       v_ped,
    'itens',        v_itens,
    'recebimentos', v_recebimentos,
    'scs_origem',   v_scs_origem,
    'historico',    v_historico
  );
end;
$$;


-- ============================================================
-- 7. RPC: LINHA DO TEMPO (5 etapas)
-- ============================================================
--
-- Recebe um dos 3 ids (sempre passar só 1 não-nulo) e retorna
-- as 5 etapas com status e contagens. Substitui as várias
-- queries do _LinhaTempoProcesso.tsx.
create or replace function public.cmp_linha_tempo(
  p_sc_id     uuid default null,
  p_cot_id    uuid default null,
  p_pedido_id uuid default null
)
returns jsonb
language plpgsql
stable
as $$
declare
  v_sc_id        uuid := p_sc_id;
  v_cot_ids      uuid[];
  v_ped_ids      uuid[];
  v_sc           jsonb;
  v_cotacoes_lst jsonb;
  v_pedidos_lst  jsonb;
  v_recebs_count integer;
begin
  -- Resolve scId a partir de cotação ou pedido, se necessário.
  if v_sc_id is null and p_cot_id is not null then
    select min(solicitacao_id) into v_sc_id
      from public.cmp_cotacoes_solicitacoes
     where cotacao_id = p_cot_id;
  end if;
  if v_sc_id is null and p_pedido_id is not null then
    select min(si.solicitacao_id) into v_sc_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
     where pi.pedido_id = p_pedido_id;
    if v_sc_id is null then
      select min(vinc.solicitacao_id) into v_sc_id
        from public.cmp_pedidos_compra p
        join public.cmp_cotacoes_solicitacoes vinc on vinc.cotacao_id = p.cotacao_id
       where p.id = p_pedido_id;
    end if;
  end if;

  -- SC mini
  if v_sc_id is not null then
    select jsonb_build_object('id', sc.id, 'numero', sc.numero, 'status', sc.status,
                              'created_at', sc.created_at, 'aprovado_em', sc.aprovado_em)
      into v_sc
      from public.cmp_solicitacoes_compra sc where sc.id = v_sc_id;

    select array_agg(cotacao_id) into v_cot_ids
      from public.cmp_cotacoes_solicitacoes where solicitacao_id = v_sc_id;
  end if;

  -- Cotações vinculadas
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id, 'numero', c.numero, 'status', c.status,
    'created_at', c.created_at, 'aprovado_em', c.aprovado_em
  ) order by c.created_at desc), '[]'::jsonb)
  into v_cotacoes_lst
  from public.cmp_cotacoes c
  where c.id = any (coalesce(v_cot_ids, array[]::uuid[]));

  -- Pedidos: via cotação OU diretos via solicitacao_item_id
  select array_agg(distinct pid) into v_ped_ids from (
    select p.id as pid
      from public.cmp_pedidos_compra p
     where p.cotacao_id = any (coalesce(v_cot_ids, array[]::uuid[]))
    union
    select pi.pedido_id
      from public.cmp_pedidos_compra_itens pi
      join public.cmp_solicitacoes_compra_itens si on si.id = pi.solicitacao_item_id
     where si.solicitacao_id = v_sc_id
  ) sub;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'numero', p.numero, 'status', p.status,
    'created_at', p.created_at, 'enviado_em', p.enviado_em, 'aprovado_em', p.aprovado_em
  ) order by p.created_at desc), '[]'::jsonb)
  into v_pedidos_lst
  from public.cmp_pedidos_compra p
  where p.id = any (coalesce(v_ped_ids, array[]::uuid[]));

  -- Recebimentos: total (count) dos pedidos vinculados
  select count(*) into v_recebs_count
    from public.cmp_recebimentos
   where pedido_id = any (coalesce(v_ped_ids, array[]::uuid[]));

  return jsonb_build_object(
    'sc',               v_sc,
    'cotacoes',         v_cotacoes_lst,
    'pedidos',          v_pedidos_lst,
    'recebimentos_qtd', v_recebs_count
  );
end;
$$;


-- ============================================================
-- 8. RPCs DE PAINEL (versão enxuta, sem histórico)
--    Usadas pelas linhas expansíveis das listagens.
-- ============================================================

create or replace function public.cmp_painel_solicitacao(p_id uuid)
returns jsonb
language sql
stable
as $$
  with detalhe as (select public.cmp_detalhe_solicitacao(p_id) as d)
  select case
    when (select d from detalhe) is null then null
    else jsonb_build_object(
      'sc',           (select d->'sc'           from detalhe),
      'itens',        (select d->'itens'        from detalhe),
      'cotacoes',     (select d->'cotacoes'     from detalhe),
      'pedidos',      (select d->'pedidos'      from detalhe),
      'recebimentos', (select d->'recebimentos' from detalhe)
    )
  end;
$$;

create or replace function public.cmp_painel_cotacao(p_id uuid)
returns jsonb
language sql
stable
as $$
  with detalhe as (select public.cmp_detalhe_cotacao(p_id) as d)
  select case
    when (select d from detalhe) is null then null
    else jsonb_build_object(
      'cotacao',        (select d->'cotacao'        from detalhe),
      'itens',          (select d->'itens'          from detalhe),
      'fornecedores',   (select d->'fornecedores'   from detalhe),
      'escolhas',       (select d->'escolhas'       from detalhe),
      'scs_vinculadas', (select d->'scs_vinculadas' from detalhe),
      'pedidos',        (select d->'pedidos'        from detalhe)
    )
  end;
$$;

create or replace function public.cmp_painel_pedido(p_id uuid)
returns jsonb
language sql
stable
as $$
  with detalhe as (select public.cmp_detalhe_pedido(p_id) as d)
  select case
    when (select d from detalhe) is null then null
    else jsonb_build_object(
      'pedido',       (select d->'pedido'       from detalhe),
      'itens',        (select d->'itens'        from detalhe),
      'recebimentos', (select d->'recebimentos' from detalhe),
      'scs_origem',   (select d->'scs_origem'   from detalhe)
    )
  end;
$$;


-- ============================================================
-- 9. GRANTs
-- ============================================================

grant execute on function public.cmp_historico(text, uuid)              to authenticated;
grant execute on function public.cmp_detalhe_solicitacao(uuid)          to authenticated;
grant execute on function public.cmp_detalhe_cotacao(uuid)              to authenticated;
grant execute on function public.cmp_detalhe_pedido(uuid)               to authenticated;
grant execute on function public.cmp_painel_solicitacao(uuid)           to authenticated;
grant execute on function public.cmp_painel_cotacao(uuid)               to authenticated;
grant execute on function public.cmp_painel_pedido(uuid)                to authenticated;
grant execute on function public.cmp_linha_tempo(uuid, uuid, uuid)      to authenticated;

-- (helpers ficam restritas — não dou grant pra forçar uso via RPCs públicas)
