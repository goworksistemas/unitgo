-- ============================================================
-- 014_alcadas_aprovacao.sql
-- Alçada de aprovação por valor + pessoa específica.
--
-- Regra: cadastra-se faixas (valor_min, valor_max) com um aprovador (pessoa).
-- Quando um pedido é criado, o sistema escolhe automaticamente quem deve
-- aprovar com base no valor total do pedido.
-- ============================================================

create table public.cmp_alcadas_aprovacao (
  id              uuid         primary key default gen_random_uuid(),
  empresa_id      uuid         not null references public.core_empresas(id),
  valor_min       numeric      not null default 0 check (valor_min >= 0),
  valor_max       numeric      check (valor_max is null or valor_max >= valor_min),
  aprovador_id    uuid         not null references public.profiles(id),
  ordem           integer      not null default 0,
  ativo           boolean      not null default true,
  created_at      timestamptz  not null default now(),
  updated_at      timestamptz  not null default now()
);

comment on table public.cmp_alcadas_aprovacao is
  'Alçada de aprovação de pedido por valor. valor_max = null significa "sem limite superior".';

comment on column public.cmp_alcadas_aprovacao.aprovador_id is
  'Pessoa específica que aprova essa faixa (em vez de role genérica).';

create trigger cmp_alcadas_updated_at
  before update on public.cmp_alcadas_aprovacao
  for each row execute function public.set_updated_at();

create index cmp_alcadas_empresa_idx     on public.cmp_alcadas_aprovacao(empresa_id);
create index cmp_alcadas_aprovador_idx   on public.cmp_alcadas_aprovacao(aprovador_id);

-- ------------------------------------------------------------
-- Função helper: descobre quem deve aprovar um pedido de R$X numa empresa
-- ------------------------------------------------------------
create or replace function public.get_aprovador_alcada(
  p_empresa_id uuid,
  p_valor numeric
)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select aprovador_id
    from public.cmp_alcadas_aprovacao
   where empresa_id = p_empresa_id
     and ativo = true
     and valor_min <= p_valor
     and (valor_max is null or valor_max >= p_valor)
   order by ordem asc, valor_min desc
   limit 1;
$$;

comment on function public.get_aprovador_alcada(uuid, numeric) is
  'Retorna o uuid do aprovador para um valor X na empresa. NULL se nenhuma alçada cobre o valor.';

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cmp_alcadas_aprovacao enable row level security;

grant select, insert, update, delete on public.cmp_alcadas_aprovacao to authenticated;

create policy "cmp_alcadas_select" on public.cmp_alcadas_aprovacao
  for select to authenticated using (true);

create policy "cmp_alcadas_write" on public.cmp_alcadas_aprovacao
  for all to authenticated
  using (public.get_my_role() = 'admin')
  with check (public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- Coluna no pedido: registrar qual alçada foi aplicada (auditoria)
-- ------------------------------------------------------------
alter table public.cmp_pedidos_compra
  add column alcada_id uuid references public.cmp_alcadas_aprovacao(id) on delete set null;

comment on column public.cmp_pedidos_compra.alcada_id is
  'Alçada usada para definir o aprovador deste pedido (auditoria).';
