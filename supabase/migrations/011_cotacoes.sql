-- ============================================================
-- 011_cotacoes.sql
-- Módulo Compras — Cotação (RFQ)
-- Pipeline:
--   aberta → respondida → vencedor_escolhido → aguardando_aprovacao_orcamento → orcamento_aprovado / cancelada
-- ============================================================

-- ------------------------------------------------------------
-- Sequence do número da cotação (COT-00001)
-- ------------------------------------------------------------
create sequence if not exists public.cmp_cotacoes_numero_seq start 1;

-- ------------------------------------------------------------
-- cmp_cotacoes — cabeçalho
-- ------------------------------------------------------------
create table public.cmp_cotacoes (
  id                    uuid         primary key default gen_random_uuid(),
  numero                text         not null unique default ('COT-' || lpad(nextval('public.cmp_cotacoes_numero_seq')::text, 5, '0')),
  empresa_id            uuid         not null references public.core_empresas(id),
  comprador_id          uuid         not null references public.profiles(id),
  titulo                text         not null,
  observacoes           text,
  prazo_resposta        date,
  status                text         not null default 'aberta'
                                     check (status in (
                                       'aberta',
                                       'respondida',
                                       'vencedor_escolhido',
                                       'aguardando_aprovacao_orcamento',
                                       'orcamento_aprovado',
                                       'cancelada'
                                     )),
  aprovador_id          uuid         references public.profiles(id),
  aprovado_em           timestamptz,
  motivo_reprovacao     text,
  cancelada_em          timestamptz,
  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

comment on table public.cmp_cotacoes is 'Cabeçalho da Cotação (RFQ). Pode partir de N SCs ou ser avulsa.';
comment on column public.cmp_cotacoes.numero is 'COT-00001 — sequencial global.';

create index cmp_cotacoes_status_idx     on public.cmp_cotacoes(status, created_at desc);
create index cmp_cotacoes_comprador_idx  on public.cmp_cotacoes(comprador_id);
create index cmp_cotacoes_empresa_idx    on public.cmp_cotacoes(empresa_id);

create trigger cmp_cotacoes_updated_at
  before update on public.cmp_cotacoes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_cotacoes_solicitacoes — N:N (cotação ↔ SCs originárias)
-- ------------------------------------------------------------
create table public.cmp_cotacoes_solicitacoes (
  cotacao_id      uuid not null references public.cmp_cotacoes(id) on delete cascade,
  solicitacao_id  uuid not null references public.cmp_solicitacoes_compra(id) on delete restrict,
  primary key (cotacao_id, solicitacao_id)
);

comment on table public.cmp_cotacoes_solicitacoes is 'N:N — quais SCs deram origem a esta cotação (vazio = avulsa).';

create index cmp_cot_solic_solic_idx on public.cmp_cotacoes_solicitacoes(solicitacao_id);

-- ------------------------------------------------------------
-- cmp_cotacoes_itens — linhas da cotação
-- ------------------------------------------------------------
create table public.cmp_cotacoes_itens (
  id                       uuid         primary key default gen_random_uuid(),
  cotacao_id               uuid         not null references public.cmp_cotacoes(id) on delete cascade,
  linha                    integer      not null,
  -- Rastreabilidade até o item da SC original (opcional — pode ser nulo se cotação avulsa)
  solicitacao_item_id      uuid         references public.cmp_solicitacoes_compra_itens(id) on delete set null,
  produto_id               uuid         not null references public.prd_produtos(id),
  variante_id              uuid         references public.prd_variantes(id),
  unidade_medida_id        uuid         not null references public.prd_unidades_medida(id),
  quantidade               numeric      not null check (quantidade > 0),
  observacao               text,
  created_at               timestamptz  not null default now(),
  unique (cotacao_id, linha)
);

create index cmp_cot_itens_cot_idx     on public.cmp_cotacoes_itens(cotacao_id);
create index cmp_cot_itens_produto_idx on public.cmp_cotacoes_itens(produto_id);
create index cmp_cot_itens_sc_item_idx on public.cmp_cotacoes_itens(solicitacao_item_id);

-- ------------------------------------------------------------
-- cmp_cotacoes_fornecedores — convites
-- ------------------------------------------------------------
create table public.cmp_cotacoes_fornecedores (
  id              uuid         primary key default gen_random_uuid(),
  cotacao_id      uuid         not null references public.cmp_cotacoes(id) on delete cascade,
  fornecedor_id   uuid         not null references public.cmp_fornecedores(id),
  status_convite  text         not null default 'convidado'
                               check (status_convite in ('convidado', 'respondido', 'recusado')),
  prazo_entrega_dias   integer,
  condicao_pagamento   text,
  observacao           text,
  respondido_em        timestamptz,
  created_at           timestamptz  not null default now(),
  unique (cotacao_id, fornecedor_id)
);

comment on table public.cmp_cotacoes_fornecedores is 'Fornecedores convidados para a cotação. As condições gerais (prazo e pagamento) ficam aqui; preços por item ficam em cmp_cotacoes_respostas_itens.';

create index cmp_cot_forn_cot_idx  on public.cmp_cotacoes_fornecedores(cotacao_id);
create index cmp_cot_forn_forn_idx on public.cmp_cotacoes_fornecedores(fornecedor_id);

-- ------------------------------------------------------------
-- cmp_cotacoes_respostas_itens — preço por item por fornecedor
-- ------------------------------------------------------------
create table public.cmp_cotacoes_respostas_itens (
  id                       uuid         primary key default gen_random_uuid(),
  cotacao_fornecedor_id    uuid         not null references public.cmp_cotacoes_fornecedores(id) on delete cascade,
  cotacao_item_id          uuid         not null references public.cmp_cotacoes_itens(id) on delete cascade,
  preco_unitario           numeric      not null check (preco_unitario >= 0),
  observacao               text,
  created_at               timestamptz  not null default now(),
  unique (cotacao_fornecedor_id, cotacao_item_id)
);

create index cmp_cot_resp_forn_idx on public.cmp_cotacoes_respostas_itens(cotacao_fornecedor_id);
create index cmp_cot_resp_item_idx on public.cmp_cotacoes_respostas_itens(cotacao_item_id);

-- ------------------------------------------------------------
-- cmp_cotacoes_escolhas — vencedor por item
-- ------------------------------------------------------------
create table public.cmp_cotacoes_escolhas (
  id                         uuid         primary key default gen_random_uuid(),
  cotacao_id                 uuid         not null references public.cmp_cotacoes(id) on delete cascade,
  cotacao_item_id            uuid         not null references public.cmp_cotacoes_itens(id) on delete cascade,
  cotacao_fornecedor_id      uuid         not null references public.cmp_cotacoes_fornecedores(id),
  preco_final_unitario       numeric      not null check (preco_final_unitario >= 0),
  observacao                 text,
  created_at                 timestamptz  not null default now(),
  unique (cotacao_id, cotacao_item_id)
);

comment on table public.cmp_cotacoes_escolhas is '1 linha por item escolhido. Suporta vencedor diferente por item (vencedor por fornecedor é um caso particular onde todos os itens apontam para o mesmo fornecedor).';

create index cmp_cot_esc_cot_idx  on public.cmp_cotacoes_escolhas(cotacao_id);
create index cmp_cot_esc_forn_idx on public.cmp_cotacoes_escolhas(cotacao_fornecedor_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cmp_cotacoes                  enable row level security;
alter table public.cmp_cotacoes_solicitacoes     enable row level security;
alter table public.cmp_cotacoes_itens            enable row level security;
alter table public.cmp_cotacoes_fornecedores     enable row level security;
alter table public.cmp_cotacoes_respostas_itens  enable row level security;
alter table public.cmp_cotacoes_escolhas         enable row level security;

grant usage, select on sequence public.cmp_cotacoes_numero_seq to authenticated;

grant select, insert, update, delete on public.cmp_cotacoes                 to authenticated;
grant select, insert, update, delete on public.cmp_cotacoes_solicitacoes    to authenticated;
grant select, insert, update, delete on public.cmp_cotacoes_itens           to authenticated;
grant select, insert, update, delete on public.cmp_cotacoes_fornecedores    to authenticated;
grant select, insert, update, delete on public.cmp_cotacoes_respostas_itens to authenticated;
grant select, insert, update, delete on public.cmp_cotacoes_escolhas        to authenticated;

-- SELECT: comprador/diretor/admin/gestor (sem restrição por SC para simplificar — todos do time veem)
create policy "cmp_cot_select" on public.cmp_cotacoes
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_cot_solic_select" on public.cmp_cotacoes_solicitacoes
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_cot_itens_select" on public.cmp_cotacoes_itens
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_cot_forn_select" on public.cmp_cotacoes_fornecedores
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_cot_resp_select" on public.cmp_cotacoes_respostas_itens
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_cot_esc_select" on public.cmp_cotacoes_escolhas
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

-- WRITE: comprador e admin criam/editam tudo
create policy "cmp_cot_write" on public.cmp_cotacoes
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_cot_solic_write" on public.cmp_cotacoes_solicitacoes
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_cot_itens_write" on public.cmp_cotacoes_itens
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_cot_forn_write" on public.cmp_cotacoes_fornecedores
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_cot_resp_write" on public.cmp_cotacoes_respostas_itens
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_cot_esc_write" on public.cmp_cotacoes_escolhas
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

-- ------------------------------------------------------------
-- Aprovações: 'cotacao' já é coberto por cmp_aprovacoes.documento_tipo?
-- A check antiga só aceitava 'solicitacao' e 'pedido'. Vamos atualizar.
-- ------------------------------------------------------------
alter table public.cmp_aprovacoes
  drop constraint if exists cmp_aprovacoes_documento_tipo_check;

alter table public.cmp_aprovacoes
  add constraint cmp_aprovacoes_documento_tipo_check
    check (documento_tipo in ('solicitacao','cotacao','pedido'));

-- Ajusta policy de SELECT de cmp_aprovacoes para cobrir cotações também
drop policy if exists "cmp_aprovacoes_select" on public.cmp_aprovacoes;

create policy "cmp_aprovacoes_select"
  on public.cmp_aprovacoes for select to authenticated
  using (
    -- Solicitações: solicitante, gestor do depto, ou perfis de compras
    (documento_tipo = 'solicitacao' and exists (
      select 1 from public.cmp_solicitacoes_compra sc
      where sc.id = documento_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() in ('admin', 'comprador', 'diretor')
          or public.is_gestor_departamento(sc.departamento_id)
        )
    ))
    -- Cotações e Pedidos: papéis de compras
    or (documento_tipo in ('cotacao','pedido')
        and public.get_my_role() in ('admin','comprador','diretor','gestor'))
  );
