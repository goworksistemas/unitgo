-- ============================================================
-- 008_compras_solicitacoes.sql
-- Módulo Compras — primeira entrega: Solicitação de Compra (SC)
-- Prefixo: cmp_
--
-- Estados da SC:
--   rascunho → aguardando_aprovacao → aprovada → atendida
--                                  └→ reprovada
--   * cancelada pode ocorrer em qualquer estado anterior a "atendida"
--
-- Fluxo de aprovação (esta migration cobre só o nível 1):
--   rascunho → (solicitante envia) → aguardando_aprovacao
--   aguardando_aprovacao → (gestor da unidade OU admin aprova) → aprovada
--   aguardando_aprovacao → (gestor reprova) → reprovada
-- ============================================================

-- ------------------------------------------------------------
-- Sequence do número da SC (SC-00001)
-- ------------------------------------------------------------
create sequence if not exists public.cmp_solicitacoes_compra_numero_seq start 1;

-- ------------------------------------------------------------
-- cmp_solicitacoes_compra — cabeçalho
-- ------------------------------------------------------------
create table public.cmp_solicitacoes_compra (
  id                    uuid         primary key default gen_random_uuid(),
  numero                text         not null unique default ('SC-' || lpad(nextval('public.cmp_solicitacoes_compra_numero_seq')::text, 5, '0')),

  empresa_id            uuid         not null references public.core_empresas(id),
  unidade_negocio_id    uuid         not null references public.core_unidades_negocio(id),
  centro_custo_id       uuid         references public.core_centros_custo(id),

  solicitante_id        uuid         not null references public.profiles(id),

  data_necessaria       date,
  prioridade            text         not null default 'normal'
                                     check (prioridade in ('baixa', 'normal', 'alta', 'urgente')),

  justificativa         text,
  observacoes           text,

  status                text         not null default 'rascunho'
                                     check (status in ('rascunho','aguardando_aprovacao','aprovada','reprovada','cancelada','atendida')),

  aprovador_id          uuid         references public.profiles(id),
  aprovado_em           timestamptz,
  motivo_reprovacao     text,

  enviada_em            timestamptz,
  cancelada_em          timestamptz,

  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now()
);

comment on table public.cmp_solicitacoes_compra is 'Cabeçalho da Solicitação de Compra. numero é gerado automaticamente.';
comment on column public.cmp_solicitacoes_compra.numero is 'SC-00001 — sequencial global, gerado pelo banco.';

create index cmp_sc_status_idx       on public.cmp_solicitacoes_compra(status, created_at desc);
create index cmp_sc_solicitante_idx  on public.cmp_solicitacoes_compra(solicitante_id);
create index cmp_sc_unidade_idx      on public.cmp_solicitacoes_compra(unidade_negocio_id);
create index cmp_sc_empresa_idx      on public.cmp_solicitacoes_compra(empresa_id);

create trigger cmp_sc_updated_at
  before update on public.cmp_solicitacoes_compra
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_solicitacoes_compra_itens
-- ------------------------------------------------------------
create table public.cmp_solicitacoes_compra_itens (
  id                    uuid         primary key default gen_random_uuid(),
  solicitacao_id        uuid         not null references public.cmp_solicitacoes_compra(id) on delete cascade,
  linha                 integer      not null,

  produto_id            uuid         not null references public.prd_produtos(id),
  variante_id           uuid         references public.prd_variantes(id),
  unidade_medida_id     uuid         not null references public.prd_unidades_medida(id),

  quantidade            numeric      not null check (quantidade > 0),
  preco_estimado        numeric      check (preco_estimado >= 0),

  centro_custo_id       uuid         references public.core_centros_custo(id),
  observacao            text,

  status_item           text         not null default 'pendente'
                                     check (status_item in ('pendente','em_cotacao','em_pedido','atendido','cancelado')),

  created_at            timestamptz  not null default now(),
  updated_at            timestamptz  not null default now(),

  unique (solicitacao_id, linha)
);

comment on table public.cmp_solicitacoes_compra_itens is 'Itens da SC. status_item é granular para suportar atendimento parcial via cotação/pedido.';

create index cmp_sc_itens_sc_idx       on public.cmp_solicitacoes_compra_itens(solicitacao_id);
create index cmp_sc_itens_produto_idx  on public.cmp_solicitacoes_compra_itens(produto_id);

create trigger cmp_sc_itens_updated_at
  before update on public.cmp_solicitacoes_compra_itens
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_aprovacoes — log genérico (SC agora, PC depois)
-- ------------------------------------------------------------
create table public.cmp_aprovacoes (
  id               uuid         primary key default gen_random_uuid(),
  documento_tipo   text         not null check (documento_tipo in ('solicitacao','pedido')),
  documento_id    uuid         not null,
  nivel            integer      not null default 1,
  aprovador_id     uuid         not null references public.profiles(id),
  acao             text         not null check (acao in ('enviou','aprovou','reprovou','cancelou','encaminhou')),
  comentario       text,
  created_at       timestamptz  not null default now()
);

comment on table public.cmp_aprovacoes is 'Log de eventos de aprovação. Usada para a timeline na tela de detalhe.';

create index cmp_aprovacoes_doc_idx on public.cmp_aprovacoes(documento_tipo, documento_id, created_at);

-- ------------------------------------------------------------
-- Helper: é gestor da unidade da SC?
-- ------------------------------------------------------------
create or replace function public.is_gestor_unidade(p_unidade_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.core_unidades_negocio u
    where u.id = p_unidade_id
      and u.gestor_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cmp_solicitacoes_compra        enable row level security;
alter table public.cmp_solicitacoes_compra_itens  enable row level security;
alter table public.cmp_aprovacoes                 enable row level security;

grant usage, select on sequence public.cmp_solicitacoes_compra_numero_seq to authenticated;

grant select, insert, update, delete on public.cmp_solicitacoes_compra        to authenticated;
grant select, insert, update, delete on public.cmp_solicitacoes_compra_itens  to authenticated;
grant select, insert                 on public.cmp_aprovacoes                 to authenticated;

-- ── SC: SELECT ─────────────────────────────────────────────
-- Vê quem: solicitante, gestor da unidade, ou perfis de compras (admin/comprador/diretor)
create policy "cmp_sc_select"
  on public.cmp_solicitacoes_compra for select
  to authenticated
  using (
    solicitante_id = auth.uid()
    or public.get_my_role() in ('admin', 'comprador', 'diretor')
    or public.is_gestor_unidade(unidade_negocio_id)
  );

-- ── SC: INSERT ─────────────────────────────────────────────
-- Qualquer autenticado pode criar uma SC para si mesmo, em rascunho.
create policy "cmp_sc_insert"
  on public.cmp_solicitacoes_compra for insert
  to authenticated
  with check (
    solicitante_id = auth.uid()
    and status in ('rascunho', 'aguardando_aprovacao')
  );

-- ── SC: UPDATE ─────────────────────────────────────────────
-- Solicitante: pode editar enquanto rascunho; pode enviar (rascunho → aguardando_aprovacao); pode cancelar (não-atendida).
-- Gestor da unidade ou admin: pode aprovar/reprovar quando aguardando_aprovacao.
create policy "cmp_sc_update_solicitante"
  on public.cmp_solicitacoes_compra for update
  to authenticated
  using (solicitante_id = auth.uid())
  with check (solicitante_id = auth.uid())
;

create policy "cmp_sc_update_aprovador"
  on public.cmp_solicitacoes_compra for update
  to authenticated
  using (
    public.get_my_role() = 'admin'
    or public.is_gestor_unidade(unidade_negocio_id)
  )
  with check (
    public.get_my_role() = 'admin'
    or public.is_gestor_unidade(unidade_negocio_id)
  );

-- ── SC: DELETE ─────────────────────────────────────────────
-- Apenas solicitante e enquanto rascunho. Admins também.
create policy "cmp_sc_delete"
  on public.cmp_solicitacoes_compra for delete
  to authenticated
  using (
    (solicitante_id = auth.uid() and status = 'rascunho')
    or public.get_my_role() = 'admin'
  );

-- ── Itens da SC: herda a permissão da SC pai via EXISTS ───
create policy "cmp_sc_itens_select"
  on public.cmp_solicitacoes_compra_itens for select
  to authenticated
  using (
    exists (
      select 1
      from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() in ('admin', 'comprador', 'diretor')
          or public.is_gestor_unidade(sc.unidade_negocio_id)
        )
    )
  );

create policy "cmp_sc_itens_write"
  on public.cmp_solicitacoes_compra_itens for all
  to authenticated
  using (
    exists (
      select 1
      from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() = 'admin'
        )
    )
  )
  with check (
    exists (
      select 1
      from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() = 'admin'
        )
    )
  );

-- ── Aprovações: SELECT segue a SC ─────────────────────────
create policy "cmp_aprovacoes_select"
  on public.cmp_aprovacoes for select
  to authenticated
  using (
    documento_tipo <> 'solicitacao'
    or exists (
      select 1
      from public.cmp_solicitacoes_compra sc
      where sc.id = documento_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() in ('admin', 'comprador', 'diretor')
          or public.is_gestor_unidade(sc.unidade_negocio_id)
        )
    )
  );

-- INSERT: o próprio usuário registra a ação dele
create policy "cmp_aprovacoes_insert"
  on public.cmp_aprovacoes for insert
  to authenticated
  with check (aprovador_id = auth.uid());
