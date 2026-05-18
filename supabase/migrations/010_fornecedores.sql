-- ============================================================
-- 010_fornecedores.sql
-- Cadastro mínimo de fornecedores.
-- Prefixo: cmp_
-- ============================================================

create table public.cmp_fornecedores (
  id              uuid         primary key default gen_random_uuid(),
  cnpj_cpf        text         unique,
  razao_social    text         not null,
  nome_fantasia   text,
  email           text,
  telefone        text,
  observacoes     text,
  ativo           boolean      not null default true,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table public.cmp_fornecedores is 'Cadastro mínimo de fornecedores e prestadores de serviço.';
comment on column public.cmp_fornecedores.cnpj_cpf is 'CNPJ ou CPF, sem formatação. UNIQUE.';

create trigger cmp_fornecedores_updated_at
  before update on public.cmp_fornecedores
  for each row execute function public.set_updated_at();

create index cmp_fornecedores_razao_idx on public.cmp_fornecedores using gin (to_tsvector('portuguese', razao_social));
create index cmp_fornecedores_ativo_idx on public.cmp_fornecedores(ativo);

alter table public.cmp_fornecedores enable row level security;

grant select, insert, update on public.cmp_fornecedores to authenticated;

-- Todos autenticados podem ler fornecedores
create policy "cmp_fornecedores_select" on public.cmp_fornecedores
  for select to authenticated using (true);

-- Apenas admin/comprador podem manter fornecedores
create policy "cmp_fornecedores_write" on public.cmp_fornecedores
  for all to authenticated
  using (public.get_my_role() in ('admin', 'comprador'))
  with check (public.get_my_role() in ('admin', 'comprador'));
