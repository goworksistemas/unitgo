-- ============================================================
-- 013_recebimentos_nf.sql
-- Módulo Compras — Recebimento físico e Conferência com NF
--
-- Permite recebimentos parciais. Trigger atualiza quantidade_recebida nos itens
-- do pedido e ajusta status do item e do pedido automaticamente.
-- ============================================================

-- ------------------------------------------------------------
-- cmp_notas_fiscais — criado antes para o recebimento poder referenciar
-- ------------------------------------------------------------
create table public.cmp_notas_fiscais (
  id                  uuid         primary key default gen_random_uuid(),
  cnpj_emitente       text         not null,
  fornecedor_id       uuid         references public.cmp_fornecedores(id),
  numero              text         not null,
  serie               text,
  data_emissao        date         not null,
  valor_total         numeric      not null check (valor_total >= 0),
  chave_acesso        text,
  observacoes         text,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

comment on table public.cmp_notas_fiscais is 'NF de entrada (mercadoria ou serviço). Digitada manualmente nesta versão.';

-- Unicidade composta — não dá pra usar UNIQUE direto com coalesce, vai por índice
create unique index cmp_nf_uniq_idx
  on public.cmp_notas_fiscais(cnpj_emitente, numero, coalesce(serie, ''));

create index cmp_nf_cnpj_idx        on public.cmp_notas_fiscais(cnpj_emitente);
create index cmp_nf_fornecedor_idx  on public.cmp_notas_fiscais(fornecedor_id);
create index cmp_nf_data_idx        on public.cmp_notas_fiscais(data_emissao desc);

create trigger cmp_nf_updated_at
  before update on public.cmp_notas_fiscais
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_recebimentos — cabeçalho
-- ------------------------------------------------------------
create sequence if not exists public.cmp_recebimentos_numero_seq start 1;

create table public.cmp_recebimentos (
  id                  uuid         primary key default gen_random_uuid(),
  numero              text         not null unique default ('REC-' || lpad(nextval('public.cmp_recebimentos_numero_seq')::text, 5, '0')),
  pedido_id           uuid         not null references public.cmp_pedidos_compra(id),
  recebedor_id        uuid         not null references public.profiles(id),
  data_recebimento    timestamptz  not null default now(),
  observacoes         text,
  nf_id               uuid         references public.cmp_notas_fiscais(id) on delete set null,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

comment on table public.cmp_recebimentos is 'Recebimento físico (pode ser parcial). nf_id opcional — pode conferir NF depois.';

create index cmp_rec_pedido_idx on public.cmp_recebimentos(pedido_id);
create index cmp_rec_data_idx   on public.cmp_recebimentos(data_recebimento desc);
create index cmp_rec_nf_idx     on public.cmp_recebimentos(nf_id);

create trigger cmp_rec_updated_at
  before update on public.cmp_recebimentos
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- cmp_recebimentos_itens
-- ------------------------------------------------------------
create table public.cmp_recebimentos_itens (
  id                    uuid         primary key default gen_random_uuid(),
  recebimento_id        uuid         not null references public.cmp_recebimentos(id) on delete cascade,
  pedido_item_id        uuid         not null references public.cmp_pedidos_compra_itens(id),
  quantidade_recebida   numeric      not null check (quantidade_recebida >= 0),
  divergencia           text,
  observacao            text,
  created_at            timestamptz  not null default now(),
  unique (recebimento_id, pedido_item_id)
);

create index cmp_rec_itens_rec_idx on public.cmp_recebimentos_itens(recebimento_id);
create index cmp_rec_itens_pi_idx  on public.cmp_recebimentos_itens(pedido_item_id);

-- ------------------------------------------------------------
-- cmp_notas_fiscais_pedidos — N:N (NF pode cobrir vários POs e vice-versa)
-- ------------------------------------------------------------
create table public.cmp_notas_fiscais_pedidos (
  nf_id        uuid not null references public.cmp_notas_fiscais(id) on delete cascade,
  pedido_id    uuid not null references public.cmp_pedidos_compra(id) on delete restrict,
  primary key (nf_id, pedido_id)
);

create index cmp_nf_ped_pedido_idx on public.cmp_notas_fiscais_pedidos(pedido_id);

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.cmp_notas_fiscais         enable row level security;
alter table public.cmp_recebimentos          enable row level security;
alter table public.cmp_recebimentos_itens    enable row level security;
alter table public.cmp_notas_fiscais_pedidos enable row level security;

grant usage, select on sequence public.cmp_recebimentos_numero_seq to authenticated;

grant select, insert, update, delete on public.cmp_notas_fiscais         to authenticated;
grant select, insert, update, delete on public.cmp_recebimentos          to authenticated;
grant select, insert, update, delete on public.cmp_recebimentos_itens    to authenticated;
grant select, insert, update, delete on public.cmp_notas_fiscais_pedidos to authenticated;

-- SELECT — papéis de compras
create policy "cmp_nf_select" on public.cmp_notas_fiscais
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_rec_select" on public.cmp_recebimentos
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_rec_itens_select" on public.cmp_recebimentos_itens
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

create policy "cmp_nf_ped_select" on public.cmp_notas_fiscais_pedidos
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));

-- WRITE — comprador e admin
create policy "cmp_nf_write" on public.cmp_notas_fiscais
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_rec_write" on public.cmp_recebimentos
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_rec_itens_write" on public.cmp_recebimentos_itens
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

create policy "cmp_nf_ped_write" on public.cmp_notas_fiscais_pedidos
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador'))
  with check (public.get_my_role() in ('admin','comprador'));

-- ------------------------------------------------------------
-- Trigger: ao inserir/atualizar recebimento_item, recalcula quantidade_recebida
-- no item do pedido e ajusta status do item e do pedido.
-- ------------------------------------------------------------
create or replace function public.atualizar_recebimento_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pedido_item_id uuid;
  v_pedido_id      uuid;
  v_qty_pedida     numeric;
  v_total_recebido numeric;
  v_todos_recebidos boolean;
  v_algum_recebido  boolean;
begin
  v_pedido_item_id := coalesce(new.pedido_item_id, old.pedido_item_id);

  select pedido_id, quantidade
    into v_pedido_id, v_qty_pedida
    from public.cmp_pedidos_compra_itens
   where id = v_pedido_item_id;

  if v_pedido_id is null then
    return coalesce(new, old);
  end if;

  -- Soma o que já foi recebido para esse item
  select coalesce(sum(quantidade_recebida), 0)
    into v_total_recebido
    from public.cmp_recebimentos_itens
   where pedido_item_id = v_pedido_item_id;

  update public.cmp_pedidos_compra_itens
     set quantidade_recebida = v_total_recebido,
         status_item = case
           when v_total_recebido >= v_qty_pedida then 'recebido'
           when v_total_recebido > 0             then 'parcialmente_recebido'
           else 'pendente'
         end
   where id = v_pedido_item_id;

  -- Recalcula status do pedido com base em todos os itens não cancelados
  select bool_and(quantidade_recebida >= quantidade),
         bool_or(quantidade_recebida > 0)
    into v_todos_recebidos, v_algum_recebido
    from public.cmp_pedidos_compra_itens
   where pedido_id = v_pedido_id
     and status_item <> 'cancelado';

  update public.cmp_pedidos_compra
     set status = case
       when status in ('cancelado','rascunho','aguardando_aprovacao') then status
       when v_todos_recebidos then 'recebido'
       when v_algum_recebido  then 'parcialmente_recebido'
       else status
     end
   where id = v_pedido_id;

  return coalesce(new, old);
end;
$$;

create trigger cmp_rec_itens_atualiza_pedido
  after insert or update or delete on public.cmp_recebimentos_itens
  for each row execute function public.atualizar_recebimento_pedido();
