-- ============================================================
-- 018_mercadolivre.sql
-- Integração com Mercado Livre (lado comprador)
--
-- Modelo:
--   ml_credenciais     → conta ML conectada (1 ou mais por empresa)
--   ml_pedidos         → cada compra trazida do ML (raw_json sempre preservado)
--   ml_pedidos_itens   → itens da compra (1:N)
--   ml_envios          → estado logístico do shipment
--   ml_notas_fiscais   → NFs do pack, com binário no Supabase Storage
--   ml_webhook_eventos → log + idempotência das notificações do ML
--
--   cmp_pedidos_compra ganha ml_pedido_id e origem (manual/cotacao/mercadolivre)
-- ============================================================

-- ------------------------------------------------------------
-- ml_credenciais
-- ------------------------------------------------------------
create table public.ml_credenciais (
  id                 uuid         primary key default gen_random_uuid(),
  empresa_id         uuid         not null references public.core_empresas(id) on delete cascade,
  ml_user_id         bigint       not null,
  nickname           text,
  email              text,
  site_id            text,                -- MLB, MLA, MLM, etc.
  access_token       text         not null,
  refresh_token      text         not null,
  token_obtido_em    timestamptz  not null default now(),
  token_expira_em    timestamptz  not null,
  scopes             text[],
  ativo              boolean      not null default true,
  ultima_sync        timestamptz,
  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),
  unique (empresa_id, ml_user_id)
);

comment on table public.ml_credenciais is
  'Credenciais OAuth de uma conta ML conectada à empresa. access_token vence em 6h, refresh_token rotaciona a cada renovação.';

create index ml_cred_empresa_idx on public.ml_credenciais(empresa_id);
create index ml_cred_user_idx    on public.ml_credenciais(ml_user_id);

create trigger ml_cred_updated_at
  before update on public.ml_credenciais
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ml_pedidos
-- ------------------------------------------------------------
create table public.ml_pedidos (
  id                 uuid         primary key default gen_random_uuid(),
  credencial_id      uuid         not null references public.ml_credenciais(id) on delete cascade,
  ml_order_id        bigint       not null,
  ml_pack_id         bigint,
  ml_shipment_id     bigint,

  status             text,
  status_detail      text,
  data_criacao       timestamptz,
  data_fechamento    timestamptz,

  total              numeric,
  moeda              text,

  vendedor_id        bigint,
  vendedor_nickname  text,

  raw_json           jsonb        not null,

  pedido_compra_id   uuid         references public.cmp_pedidos_compra(id) on delete set null,

  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),

  unique (credencial_id, ml_order_id)
);

comment on table public.ml_pedidos is
  'Pedido trazido do Mercado Livre. raw_json preservado para evolução de campos.';

create index ml_ped_pack_idx       on public.ml_pedidos(ml_pack_id);
create index ml_ped_shipment_idx   on public.ml_pedidos(ml_shipment_id);
create index ml_ped_status_idx     on public.ml_pedidos(status, data_criacao desc);
create index ml_ped_pc_idx         on public.ml_pedidos(pedido_compra_id);

create trigger ml_ped_updated_at
  before update on public.ml_pedidos
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ml_pedidos_itens
-- ------------------------------------------------------------
create table public.ml_pedidos_itens (
  id                 uuid         primary key default gen_random_uuid(),
  ml_pedido_id       uuid         not null references public.ml_pedidos(id) on delete cascade,
  ml_item_id         text         not null,
  variation_id       bigint,
  titulo             text,
  quantidade         numeric,
  preco_unitario     numeric,
  thumbnail          text,
  raw_json           jsonb        not null,
  created_at         timestamptz  not null default now()
);

create index ml_pedi_pedido_idx on public.ml_pedidos_itens(ml_pedido_id);
create index ml_pedi_item_idx   on public.ml_pedidos_itens(ml_item_id);

-- ------------------------------------------------------------
-- ml_envios
-- ------------------------------------------------------------
create table public.ml_envios (
  id                 uuid         primary key default gen_random_uuid(),
  credencial_id      uuid         not null references public.ml_credenciais(id) on delete cascade,
  ml_shipment_id     bigint       not null,

  status             text,
  substatus          text,
  tracking_number    text,
  tracking_method    text,
  logistic_type      text,
  service_id         bigint,

  data_estimada      timestamptz,
  data_entrega       timestamptz,

  status_history     jsonb,
  raw_json           jsonb        not null,

  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),

  unique (credencial_id, ml_shipment_id)
);

comment on table public.ml_envios is
  'Estado logístico (rastreio) de um shipment do ML.';

create index ml_env_status_idx     on public.ml_envios(status, updated_at desc);
create index ml_env_tracking_idx   on public.ml_envios(tracking_number);

create trigger ml_env_updated_at
  before update on public.ml_envios
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ml_notas_fiscais
-- ------------------------------------------------------------
create table public.ml_notas_fiscais (
  id                 uuid         primary key default gen_random_uuid(),
  credencial_id      uuid         not null references public.ml_credenciais(id) on delete cascade,
  ml_pack_id         bigint       not null,
  ml_doc_id          text         not null,

  filename           text,
  file_type          text         check (file_type in ('xml','pdf')),
  data_emissao       timestamptz,

  -- Caminho no bucket "mercadolivre-nf" do Supabase Storage
  storage_path       text,

  -- Campos extraídos para busca/exibição
  numero_nf          text,
  serie              text,
  chave_acesso       text,
  cnpj_emitente      text,
  valor_total        numeric,

  -- Reconciliação opcional com NF interna
  nf_interna_id      uuid         references public.cmp_notas_fiscais(id) on delete set null,

  raw_metadata       jsonb,

  created_at         timestamptz  not null default now(),
  updated_at         timestamptz  not null default now(),

  unique (ml_pack_id, ml_doc_id)
);

comment on table public.ml_notas_fiscais is
  'NF anexada a um pack do ML. Arquivo em Supabase Storage; campos chave extraídos para busca.';

create index ml_nf_pack_idx        on public.ml_notas_fiscais(ml_pack_id);
create index ml_nf_chave_idx       on public.ml_notas_fiscais(chave_acesso);
create index ml_nf_nf_interna_idx  on public.ml_notas_fiscais(nf_interna_id);

create trigger ml_nf_updated_at
  before update on public.ml_notas_fiscais
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- ml_webhook_eventos
-- ------------------------------------------------------------
create table public.ml_webhook_eventos (
  id                 uuid         primary key default gen_random_uuid(),
  topic              text         not null,
  resource           text         not null,
  ml_user_id         bigint,
  application_id     bigint,
  attempts           integer,
  sent_at            timestamptz,
  received_at        timestamptz  not null default now(),
  processed_at       timestamptz,
  status             text         not null default 'pending'
                                   check (status in ('pending','processing','done','error','ignored')),
  error_message      text,
  raw_payload        jsonb        not null
);

comment on table public.ml_webhook_eventos is
  'Log de notificações recebidas do ML, com chave de idempotência (topic, resource, sent_at).';

-- A chave (topic, resource, sent_at) garante idempotência mesmo se o ML reentregar a mesma notificação
create unique index ml_wh_idem_idx on public.ml_webhook_eventos(topic, resource, sent_at);
create index ml_wh_status_idx     on public.ml_webhook_eventos(status, received_at);
create index ml_wh_user_idx       on public.ml_webhook_eventos(ml_user_id);

-- ------------------------------------------------------------
-- Acréscimos em cmp_pedidos_compra
-- ------------------------------------------------------------
alter table public.cmp_pedidos_compra
  add column ml_pedido_id  uuid references public.ml_pedidos(id) on delete set null,
  add column origem        text not null default 'manual'
    check (origem in ('manual','cotacao','mercadolivre'));

create index cmp_pc_ml_idx     on public.cmp_pedidos_compra(ml_pedido_id);
create index cmp_pc_origem_idx on public.cmp_pedidos_compra(origem);

-- ============================================================
-- RLS
-- ============================================================
alter table public.ml_credenciais       enable row level security;
alter table public.ml_pedidos           enable row level security;
alter table public.ml_pedidos_itens     enable row level security;
alter table public.ml_envios            enable row level security;
alter table public.ml_notas_fiscais     enable row level security;
alter table public.ml_webhook_eventos   enable row level security;

grant select, insert, update, delete on public.ml_credenciais     to authenticated;
grant select, insert, update, delete on public.ml_pedidos         to authenticated;
grant select, insert, update, delete on public.ml_pedidos_itens   to authenticated;
grant select, insert, update, delete on public.ml_envios          to authenticated;
grant select, insert, update, delete on public.ml_notas_fiscais   to authenticated;
grant select                         on public.ml_webhook_eventos to authenticated;

-- Credenciais: somente admin/diretor podem ler ou escrever
create policy "ml_cred_select" on public.ml_credenciais
  for select to authenticated
  using (public.get_my_role() in ('admin','diretor'));

create policy "ml_cred_write" on public.ml_credenciais
  for all to authenticated
  using (public.get_my_role() in ('admin','diretor'))
  with check (public.get_my_role() in ('admin','diretor'));

-- Pedidos/envios/itens/NFs: time de compras pode ler; alterações só por compradores e admin
create policy "ml_ped_select" on public.ml_pedidos
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));
create policy "ml_ped_write" on public.ml_pedidos
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));

create policy "ml_pedi_select" on public.ml_pedidos_itens
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));
create policy "ml_pedi_write" on public.ml_pedidos_itens
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));

create policy "ml_env_select" on public.ml_envios
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));
create policy "ml_env_write" on public.ml_envios
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));

create policy "ml_nf_select" on public.ml_notas_fiscais
  for select to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor','gestor'));
create policy "ml_nf_write" on public.ml_notas_fiscais
  for all to authenticated
  using (public.get_my_role() in ('admin','comprador','diretor'))
  with check (public.get_my_role() in ('admin','comprador','diretor'));

-- Eventos de webhook: somente leitura para admin/diretor (debug)
create policy "ml_wh_select" on public.ml_webhook_eventos
  for select to authenticated
  using (public.get_my_role() in ('admin','diretor'));

-- ============================================================
-- RPC para vincular/desvincular pedido ML ↔ pedido de compra
-- ============================================================
create or replace function public.ml_vincular_pedido_compra(
  p_ml_pedido_id    uuid,
  p_pedido_compra_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.get_my_role() not in ('admin','comprador','diretor') then
    raise exception 'Sem permissão para vincular pedidos';
  end if;

  update public.ml_pedidos
     set pedido_compra_id = p_pedido_compra_id
   where id = p_ml_pedido_id;

  update public.cmp_pedidos_compra
     set ml_pedido_id = p_ml_pedido_id,
         origem       = 'mercadolivre'
   where id = p_pedido_compra_id;
end;
$$;

create or replace function public.ml_desvincular_pedido_compra(
  p_ml_pedido_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pc_id uuid;
begin
  if public.get_my_role() not in ('admin','comprador','diretor') then
    raise exception 'Sem permissão para desvincular pedidos';
  end if;

  select pedido_compra_id into v_pc_id from public.ml_pedidos where id = p_ml_pedido_id;

  update public.ml_pedidos
     set pedido_compra_id = null
   where id = p_ml_pedido_id;

  if v_pc_id is not null then
    update public.cmp_pedidos_compra
       set ml_pedido_id = null
     where id = v_pc_id;
  end if;
end;
$$;

grant execute on function public.ml_vincular_pedido_compra(uuid, uuid) to authenticated;
grant execute on function public.ml_desvincular_pedido_compra(uuid)    to authenticated;

-- ============================================================
-- Storage bucket para arquivos de NF
-- ============================================================
-- Executar manualmente no SQL Editor depois (ou criar pelo painel Storage)
-- O bucket é privado: o frontend baixa via signed URL gerada pela Edge Function.
insert into storage.buckets (id, name, public)
values ('mercadolivre-nf', 'mercadolivre-nf', false)
on conflict (id) do nothing;

-- Policies do bucket: somente service_role escreve; usuários autenticados leem por signed URL
create policy "ml_nf_storage_read" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'mercadolivre-nf'
    and public.get_my_role() in ('admin','comprador','diretor','gestor')
  );
