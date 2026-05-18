-- ============================================================
-- 009_departamentos_refatora_sc.sql
-- Refatora o modelo de Compras conforme o fluxo real:
--   - Remove core_unidades_negocio e core_centros_custo (não existem no negócio)
--   - Cria core_departamentos (catálogo GLOBAL, com gestor responsável)
--   - profiles.departamento_id (cada usuário pertence a 1 departamento)
--   - cmp_solicitacoes_compra passa a referenciar departamento (não unidade)
--   - Remove centro_custo_id do cabeçalho e dos itens
--   - Aprovação da SC: gestor do departamento do solicitante
-- ============================================================

-- ------------------------------------------------------------
-- 0) Limpa dados de Compras anteriores (a estrutura velha vai morrer)
--    Cuidado: descarta SCs/itens/aprovações existentes.
-- ------------------------------------------------------------
truncate table public.cmp_aprovacoes;
truncate table public.cmp_solicitacoes_compra cascade;

-- ------------------------------------------------------------
-- 1) Derruba policies e função antigas (dependem de unidade_negocio_id)
-- ------------------------------------------------------------
drop policy if exists "cmp_sc_select"             on public.cmp_solicitacoes_compra;
drop policy if exists "cmp_sc_insert"             on public.cmp_solicitacoes_compra;
drop policy if exists "cmp_sc_update_solicitante" on public.cmp_solicitacoes_compra;
drop policy if exists "cmp_sc_update_aprovador"   on public.cmp_solicitacoes_compra;
drop policy if exists "cmp_sc_delete"             on public.cmp_solicitacoes_compra;

drop policy if exists "cmp_sc_itens_select"       on public.cmp_solicitacoes_compra_itens;
drop policy if exists "cmp_sc_itens_write"        on public.cmp_solicitacoes_compra_itens;

drop policy if exists "cmp_aprovacoes_select"     on public.cmp_aprovacoes;
drop policy if exists "cmp_aprovacoes_insert"     on public.cmp_aprovacoes;

drop function if exists public.is_gestor_unidade(uuid);

-- ------------------------------------------------------------
-- 2) Apaga tabelas obsoletas
-- ------------------------------------------------------------
drop table if exists public.core_centros_custo    cascade;
drop table if exists public.core_unidades_negocio cascade;

-- ------------------------------------------------------------
-- 3) Cria core_departamentos (catálogo GLOBAL)
-- ------------------------------------------------------------
create table public.core_departamentos (
  id          uuid         primary key default gen_random_uuid(),
  codigo      text         unique,
  nome        text         not null unique,
  descricao   text,
  gestor_id   uuid         references public.profiles(id) on delete set null,
  ativo       boolean      not null default true,
  created_at  timestamptz  not null default now(),
  updated_at  timestamptz  not null default now()
);

comment on table public.core_departamentos is
  'Departamentos da organização (catálogo global). gestor_id aprova as SCs criadas por usuários do departamento.';

create trigger core_departamentos_updated_at
  before update on public.core_departamentos
  for each row execute function public.set_updated_at();

create index core_departamentos_gestor_idx on public.core_departamentos(gestor_id);

alter table public.core_departamentos enable row level security;

grant select, insert, update on public.core_departamentos to authenticated;

create policy "core_departamentos_select" on public.core_departamentos
  for select to authenticated using (true);

create policy "core_departamentos_write" on public.core_departamentos
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- 4) profiles.departamento_id
-- ------------------------------------------------------------
alter table public.profiles
  add column departamento_id uuid references public.core_departamentos(id) on delete set null;

comment on column public.profiles.departamento_id is
  'Departamento ao qual o usuário pertence. Usado para determinar o aprovador da SC.';

create index profiles_departamento_idx on public.profiles(departamento_id);

-- ------------------------------------------------------------
-- 5) Refatora cmp_solicitacoes_compra
--    Remove unidade_negocio_id e centro_custo_id; adiciona departamento_id.
-- ------------------------------------------------------------
alter table public.cmp_solicitacoes_compra
  drop column if exists unidade_negocio_id,
  drop column if exists centro_custo_id;

alter table public.cmp_solicitacoes_compra
  add column departamento_id uuid not null references public.core_departamentos(id);

create index cmp_sc_departamento_idx on public.cmp_solicitacoes_compra(departamento_id);

-- Itens não têm mais centro de custo
alter table public.cmp_solicitacoes_compra_itens
  drop column if exists centro_custo_id;

-- ------------------------------------------------------------
-- 6) Helpers para RLS
-- ------------------------------------------------------------
-- Usuário logado é o gestor deste departamento?
create or replace function public.is_gestor_departamento(p_depto_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.core_departamentos d
    where d.id = p_depto_id
      and d.gestor_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------
-- 7) Recria policies da SC apontando para departamento
-- ------------------------------------------------------------

-- SELECT: solicitante, gestor do depto, ou perfis de compras
create policy "cmp_sc_select"
  on public.cmp_solicitacoes_compra for select to authenticated
  using (
    solicitante_id = auth.uid()
    or public.get_my_role() in ('admin', 'comprador', 'diretor')
    or public.is_gestor_departamento(departamento_id)
  );

-- INSERT: usuário cria pra si próprio
create policy "cmp_sc_insert"
  on public.cmp_solicitacoes_compra for insert to authenticated
  with check (
    solicitante_id = auth.uid()
    and status in ('rascunho', 'aguardando_aprovacao')
  );

-- UPDATE do solicitante
create policy "cmp_sc_update_solicitante"
  on public.cmp_solicitacoes_compra for update to authenticated
  using (solicitante_id = auth.uid())
  with check (solicitante_id = auth.uid());

-- UPDATE do aprovador (gestor do departamento ou admin)
create policy "cmp_sc_update_aprovador"
  on public.cmp_solicitacoes_compra for update to authenticated
  using (
    public.get_my_role() = 'admin'
    or public.is_gestor_departamento(departamento_id)
  )
  with check (
    public.get_my_role() = 'admin'
    or public.is_gestor_departamento(departamento_id)
  );

-- DELETE
create policy "cmp_sc_delete"
  on public.cmp_solicitacoes_compra for delete to authenticated
  using (
    (solicitante_id = auth.uid() and status = 'rascunho')
    or public.get_my_role() = 'admin'
  );

-- Itens da SC (segue a SC pai)
create policy "cmp_sc_itens_select"
  on public.cmp_solicitacoes_compra_itens for select to authenticated
  using (
    exists (
      select 1 from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() in ('admin', 'comprador', 'diretor')
          or public.is_gestor_departamento(sc.departamento_id)
        )
    )
  );

create policy "cmp_sc_itens_write"
  on public.cmp_solicitacoes_compra_itens for all to authenticated
  using (
    exists (
      select 1 from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() = 'admin'
        )
    )
  )
  with check (
    exists (
      select 1 from public.cmp_solicitacoes_compra sc
      where sc.id = solicitacao_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() = 'admin'
        )
    )
  );

-- Aprovações (SELECT)
create policy "cmp_aprovacoes_select"
  on public.cmp_aprovacoes for select to authenticated
  using (
    documento_tipo <> 'solicitacao'
    or exists (
      select 1 from public.cmp_solicitacoes_compra sc
      where sc.id = documento_id
        and (
          sc.solicitante_id = auth.uid()
          or public.get_my_role() in ('admin', 'comprador', 'diretor')
          or public.is_gestor_departamento(sc.departamento_id)
        )
    )
  );

create policy "cmp_aprovacoes_insert"
  on public.cmp_aprovacoes for insert to authenticated
  with check (aprovador_id = auth.uid());

-- ------------------------------------------------------------
-- 8) Permitir admins atualizarem profile.departamento_id
--    (já existe policy profiles_update_admin via get_my_role(), basta GRANT que já está)
-- ------------------------------------------------------------
