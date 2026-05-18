-- ============================================================
-- 012_pedidos_compra.sql
-- Módulo Compras — Pedido de Compra (PO)
-- Status:
--   rascunho → aguardando_aprovacao → aprovado → enviado → parcialmente_recebido → recebido / cancelado
--
-- Geração: 1 pedido por fornecedor vencedor de uma cotação aprovada.
-- ============================================================

create sequence if not exists public.cmp_pedidos_compra_numero_seq start 1;

-- ------------------------------------------------------------
-- cmp_pedidos_compra — cabeçalho
-- ------------------------------------------------------------
create table public.cmp_pedidos_compra (
  id                        uuid         primary key default gen_random_uuid(),
  numero                    text         not null unique default ('PC-' || lpad(nextval('public.cmp_pedidos_compra_numero_seq')::text, 5, '0')),
  empresa_id                uuid         not null references public.core_empresas(id),
  fornecedor_id             uuid         not null references public.cmp_fornecedores(id),
  cotacao_id                uuid         references public.cmp_cotacoes(id) on delete set null,
  comprador_id              uuid         not null references public.profiles(id),
  prazo_entrega_dias        integer,
  condicao_pagamento        text,
  observacoes               text,
  status                    text         not null default 'aprovado'
                                         check (status in (
                                           'rascunho',
                                           'aguardando_aprovacao',
                                           'aprovado',
                                           'enviado',
                                           'parcialmente_recebido',
                                           'recebido',
                                           'cancelado'
                                         )),
  aprovador_id              uuid         references public.profiles(id),
  aprovado_em               timestamptz,
  enviado_em                timestamptz,
  cancelada_em              timestamptz,
  motivo_cancelamento       text,
  created_at                timestamptz  not null default now(),
  updated_at                timestamptz  not null default now()
);

comment on table public.cmp_pedidos_compra is 'Pedido de Compra (PO). 1 PO = 1 fornecedor. Default status já é "aprovado" porque na maioria dos casos o PO é gerado após o orçamento ser aprovado.';

create index cmp_pc_status_idx       on public.cmp_pedidos_compra(status, created_at desc);
create index cmp_pc_fornecedor_idx   on public.cmp_pedidos_compra(fornecedor_id);
create index cmp_pc_cotacao_idx      on public.cmp_pedidos_compra(cotacao_id);
create index cmp_pc_comprador_idx    on public.cmp_pedidos_compra(comprador_id);
create index cmp_pc_empresa_idx      on public.cmp_pedidos_compra(empresa_id);

create trigger cmp_pc_updated_at
  before update on public.cmp_pedidos_compra
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_pedidos_compra_itens — linhas
-- ------------------------------------------------------------
create table public.cmp_pedidos_compra_itens (
  id                       uuid         primary key default gen_random_uuid(),
  pedido_id                uuid         not null references public.cmp_pedidos_compra(id) on delete cascade,
  linha                    integer      not null,

  -- Rastreabilidade até cotação e SC original
  cotacao_item_id          uuid         references public.cmp_cotacoes_itens(id) on delete set null,
  solicitacao_item_id      uuid         references public.cmp_solicitacoes_compra_itens(id) on delete set null,

  produto_id               uuid         not null references public.prd_produtos(id),
  variante_id              uuid         references public.prd_variantes(id),
  unidade_medida_id        uuid         not null references public.prd_unidades_medida(id),

  quantidade               numeric      not null check (quantidade > 0),
  preco_unitario           numeric      not null check (preco_unitario >= 0),
  quantidade_recebida      numeric      not null default 0 check (quantidade_recebida >= 0),
  observacao               text,

  status_item              text         not null default 'pendente'
                                        check (status_item in ('pendente','parcialmente_recebido','recebido','cancelado')),

  created_at               timestamptz  not null default now(),
  updated_at               timestamptz  not null default now(),

  unique (pedido_id, linha)
);

create index cmp_pc_itens_pc_idx      on public.cmp_pedidos_compra_itens(pedido_id);
create index cmp_pc_itens_produto_idx on public.cmp_pedidos_compra_itens(produto_id);
create index cmp_pc_itens_sc_idx      on public.cmp_pedidos_compra_itens(solicitacao_item_id);
create index cmp_pc_itens_cot_idx     on public.cmp_pedidos_compra_itens(cotacao_item_id);

create trigger cmp_pc_itens_updated_at
  before update on public.cmp_pedidos_compra_itens
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cmp_pedidos_compra       enable row level security;
alter table public.cmp_pedidos_compra_itens enable row level security;

grant usage, select on sequence public.cmp_pedidos_compra_numero_seq to authenticated;

grant select, insert, update, delete on public.cmp_pedidos_compra       to authenticated;
grant select, insert, update, delete on public.cmp_pedidos_compra_itens to authenticated;

create policy "cmp_pc_select" on public.cmp_pedidos_compra
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_pc_write" on public.cmp_pedidos_compra
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));

create policy "cmp_pc_itens_select" on public.cmp_pedidos_compra_itens
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_pc_itens_write" on public.cmp_pedidos_compra_itens
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));
