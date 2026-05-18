-- ============================================================
-- 007_core.sql
-- Tabelas-núcleo compartilhadas por todos os módulos (Compras, Estoque, etc).
--   - core_empresas          (multi-empresa)
--   - core_unidades_negocio  (filial/obra/centro, com gestor responsável)
--   - core_centros_custo     (rateio de gasto)
-- Também:
--   - Estende user_role com gestor, diretor, comprador.
--   - Adiciona prd_produtos.tipo (produto/servico) e prd_produtos.empresa_id (opcional).
-- ============================================================

-- ------------------------------------------------------------
-- Roles adicionais
-- ------------------------------------------------------------
alter type public.user_role add value if not exists 'gestor';
alter type public.user_role add value if not exists 'diretor';
alter type public.user_role add value if not exists 'comprador';

-- ------------------------------------------------------------
-- core_empresas
-- ------------------------------------------------------------
create table public.core_empresas (
  id              uuid         primary key default gen_random_uuid(),
  razao_social    text         not null,
  nome_fantasia   text,
  cnpj            text         unique,
  ativo           boolean      not null default true,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table public.core_empresas is 'Empresas operadas pelo sistema (multi-empresa).';

create trigger core_empresas_updated_at
  before update on public.core_empresas
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- core_unidades_negocio
-- Onde a compra é solicitada/entregue. Tem um gestor responsável
-- que aprova as Solicitações de Compra dessa unidade.
-- ------------------------------------------------------------
create table public.core_unidades_negocio (
  id           uuid         primary key default gen_random_uuid(),
  empresa_id   uuid         not null references public.core_empresas(id) on delete restrict,
  codigo       text         not null,
  nome         text         not null,
  gestor_id    uuid         references public.profiles(id) on delete set null,
  ativo        boolean      not null default true,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  unique (empresa_id, codigo)
);

comment on table public.core_unidades_negocio is 'Unidades operacionais (filial, obra, almoxarifado). gestor_id é o aprovador padrão das SCs da unidade.';

create trigger core_unidades_negocio_updated_at
  before update on public.core_unidades_negocio
  for each row execute function public.set_updated_at();

create index core_unidades_negocio_empresa_idx on public.core_unidades_negocio(empresa_id);
create index core_unidades_negocio_gestor_idx  on public.core_unidades_negocio(gestor_id);

-- ------------------------------------------------------------
-- core_centros_custo
-- ------------------------------------------------------------
create table public.core_centros_custo (
  id           uuid         primary key default gen_random_uuid(),
  empresa_id   uuid         not null references public.core_empresas(id) on delete restrict,
  codigo       text         not null,
  nome         text         not null,
  ativo        boolean      not null default true,
  created_at   timestamptz  not null default now(),
  updated_at   timestamptz  not null default now(),
  unique (empresa_id, codigo)
);

comment on table public.core_centros_custo is 'Centros de custo para rateio (ex: ADM-01, OPER-PROD).';

create trigger core_centros_custo_updated_at
  before update on public.core_centros_custo
  for each row execute function public.set_updated_at();

create index core_centros_custo_empresa_idx on public.core_centros_custo(empresa_id);

-- ------------------------------------------------------------
-- Extensões em prd_produtos: tipo + empresa
-- ------------------------------------------------------------
alter table public.prd_produtos
  add column tipo text not null default 'produto' check (tipo in ('produto', 'servico'));

comment on column public.prd_produtos.tipo is 'produto: bem físico com estoque. servico: sem estoque, vira NF de serviço.';

alter table public.prd_produtos
  add column empresa_id uuid references public.core_empresas(id) on delete set null;

comment on column public.prd_produtos.empresa_id is 'NULL = produto compartilhado entre todas as empresas; preenchido = exclusivo da empresa.';

create index prd_produtos_empresa_idx on public.prd_produtos(empresa_id);
create index prd_produtos_tipo_idx    on public.prd_produtos(tipo);

-- ------------------------------------------------------------
-- RLS — core_*
-- Leitura: todo autenticado.
-- Escrita: admin (próximas iterações podem refinar para gestor/diretor por empresa).
-- ------------------------------------------------------------
alter table public.core_empresas         enable row level security;
alter table public.core_unidades_negocio enable row level security;
alter table public.core_centros_custo    enable row level security;

grant select, insert, update on public.core_empresas         to authenticated;
grant select, insert, update on public.core_unidades_negocio to authenticated;
grant select, insert, update on public.core_centros_custo    to authenticated;

create policy "core_empresas_select"         on public.core_empresas         for select to authenticated using (true);
create policy "core_unidades_negocio_select" on public.core_unidades_negocio for select to authenticated using (true);
create policy "core_centros_custo_select"    on public.core_centros_custo    for select to authenticated using (true);

create policy "core_empresas_write"
  on public.core_empresas for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "core_unidades_negocio_write"
  on public.core_unidades_negocio for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

create policy "core_centros_custo_write"
  on public.core_centros_custo for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- Seed mínimo: 1 empresa + 1 unidade + 1 centro de custo padrão
-- Permite que o módulo de Compras funcione imediatamente.
-- ------------------------------------------------------------
do $$
declare
  v_empresa_id uuid;
begin
  insert into public.core_empresas (razao_social, nome_fantasia)
    values ('Empresa Padrão', 'Empresa Padrão')
    returning id into v_empresa_id;

  insert into public.core_unidades_negocio (empresa_id, codigo, nome)
    values (v_empresa_id, 'MTZ', 'Matriz');

  insert into public.core_centros_custo (empresa_id, codigo, nome) values
    (v_empresa_id, 'ADM',  'Administrativo'),
    (v_empresa_id, 'OPER', 'Operacional');
end $$;
