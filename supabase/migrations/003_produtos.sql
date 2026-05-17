-- ============================================================
-- 003_produtos.sql
-- Módulo de cadastro de produtos
-- Modelo: Produto (template) → Variante (SKU)
-- Estoque sempre calculado na variante
-- Prefixo: prd_
-- ============================================================

-- ------------------------------------------------------------
-- Unidades de medida
-- ------------------------------------------------------------
create table public.prd_unidades_medida (
  id     uuid        primary key default gen_random_uuid(),
  nome   text        not null,
  sigla  text        not null unique,
  ativo  boolean     not null default true
);

comment on table public.prd_unidades_medida is 'Catálogo de unidades de medida (un, kg, m, L…)';

-- ------------------------------------------------------------
-- Conversões entre unidades
-- ------------------------------------------------------------
create table public.prd_conversoes_uom (
  id           uuid    primary key default gen_random_uuid(),
  de_uom_id    uuid    not null references public.prd_unidades_medida(id),
  para_uom_id  uuid    not null references public.prd_unidades_medida(id),
  fator        numeric not null check (fator > 0),
  produto_id   uuid    -- FK para prd_produtos (adicionada abaixo após criar a tabela)
);

comment on table public.prd_conversoes_uom is 'Fator de conversão entre unidades (ex: 1 caixa = 12 un). produto_id = null significa conversão global.';

-- ------------------------------------------------------------
-- Atributos (tipos de característica das variantes)
-- ------------------------------------------------------------
create table public.prd_atributos (
  id         uuid     primary key default gen_random_uuid(),
  nome       text     not null unique,
  tipo_dado  text     not null default 'texto' check (tipo_dado in ('texto', 'numero', 'lista')),
  ordem      integer  not null default 0,
  ativo      boolean  not null default true
);

comment on table public.prd_atributos is 'Tipos de característica disponíveis para variantes (Tamanho, Material, Cor…)';

-- ------------------------------------------------------------
-- Valores possíveis por atributo
-- ------------------------------------------------------------
create table public.prd_atributo_valores (
  id           uuid    primary key default gen_random_uuid(),
  atributo_id  uuid    not null references public.prd_atributos(id) on delete cascade,
  valor        text    not null,
  ordem        integer not null default 0,
  unique (atributo_id, valor)
);

comment on table public.prd_atributo_valores is 'Valores possíveis para cada atributo (M6, Aço Inox, Azul…)';

-- ------------------------------------------------------------
-- Produtos (template genérico — sem saldo direto)
-- ------------------------------------------------------------
create sequence if not exists public.prd_produtos_codigo_seq start 1;

create table public.prd_produtos (
  id                  uuid         primary key default gen_random_uuid(),
  codigo              text         not null unique default ('PRD-' || lpad(nextval('public.prd_produtos_codigo_seq')::text, 5, '0')),
  nome                text         not null,
  descricao           text,
  unidade_medida_id   uuid         not null references public.prd_unidades_medida(id),
  imagem_url          text,
  ativo               boolean      not null default true,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

comment on table public.prd_produtos is 'Template genérico de produto. Não tem saldo de estoque diretamente.';
comment on column public.prd_produtos.codigo is 'Gerado automaticamente. Não editável.';

-- FK de prd_conversoes_uom → prd_produtos (opcional)
alter table public.prd_conversoes_uom
  add constraint prd_conversoes_uom_produto_id_fkey
  foreign key (produto_id) references public.prd_produtos(id) on delete set null;

-- ------------------------------------------------------------
-- Variantes (SKU rastreável)
-- ------------------------------------------------------------
create table public.prd_variantes (
  id                  uuid         primary key default gen_random_uuid(),
  produto_id          uuid         not null references public.prd_produtos(id),
  sku                 text         unique,
  chave_variante      text,
  unidade_medida_id   uuid         references public.prd_unidades_medida(id),
  preco_referencia    numeric      check (preco_referencia >= 0),
  ativo               boolean      not null default true,
  created_at          timestamptz  not null default now(),
  updated_at          timestamptz  not null default now()
);

comment on table public.prd_variantes is 'SKU rastreável. Toda movimentação de estoque referencia esta tabela.';
comment on column public.prd_variantes.chave_variante is 'Hash dos atributos para lookup/deduplicação rápida.';
comment on column public.prd_variantes.unidade_medida_id is 'Sobrescreve a unidade do produto pai quando preenchida.';

-- ------------------------------------------------------------
-- Relação N:N entre variantes e atributo_valores
-- atributo_id é desnormalizado para permitir constraint simples
-- ------------------------------------------------------------
create table public.prd_variante_atributos (
  variante_id        uuid not null references public.prd_variantes(id) on delete cascade,
  atributo_valor_id  uuid not null references public.prd_atributo_valores(id),
  atributo_id        uuid not null references public.prd_atributos(id),
  primary key (variante_id, atributo_valor_id),
  unique (variante_id, atributo_id)
);

comment on table public.prd_variante_atributos is 'Liga cada variante aos seus valores de atributo (N:N). atributo_id desnormalizado para garantir unicidade por atributo.';

-- ------------------------------------------------------------
-- Indexes de performance
-- ------------------------------------------------------------
create index prd_produtos_ativo_idx         on public.prd_produtos (ativo);
create index prd_produtos_nome_idx          on public.prd_produtos using gin (to_tsvector('portuguese', nome));
create index prd_variantes_produto_idx      on public.prd_variantes (produto_id);
create index prd_variantes_ativo_idx        on public.prd_variantes (ativo);
create index prd_atributo_valores_attr_idx  on public.prd_atributo_valores (atributo_id);

-- ------------------------------------------------------------
-- Trigger: atualiza updated_at automaticamente
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger prd_produtos_updated_at
  before update on public.prd_produtos
  for each row execute function public.set_updated_at();

create trigger prd_variantes_updated_at
  before update on public.prd_variantes
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.prd_unidades_medida    enable row level security;
alter table public.prd_conversoes_uom     enable row level security;
alter table public.prd_atributos          enable row level security;
alter table public.prd_atributo_valores   enable row level security;
alter table public.prd_produtos           enable row level security;
alter table public.prd_variantes          enable row level security;
alter table public.prd_variante_atributos enable row level security;

grant usage, select on sequence public.prd_produtos_codigo_seq to authenticated;

grant select, insert, update on public.prd_unidades_medida    to authenticated;
grant select, insert, update on public.prd_conversoes_uom     to authenticated;
grant select, insert, update on public.prd_atributos          to authenticated;
grant select, insert, update on public.prd_atributo_valores   to authenticated;
grant select, insert, update on public.prd_produtos           to authenticated;
grant select, insert, update on public.prd_variantes          to authenticated;
grant select, insert, update on public.prd_variante_atributos to authenticated;

-- Leitura: todos os autenticados
create policy "prd_unidades_medida_select"    on public.prd_unidades_medida    for select to authenticated using (true);
create policy "prd_conversoes_uom_select"     on public.prd_conversoes_uom     for select to authenticated using (true);
create policy "prd_atributos_select"          on public.prd_atributos          for select to authenticated using (true);
create policy "prd_atributo_valores_select"   on public.prd_atributo_valores   for select to authenticated using (true);
create policy "prd_produtos_select"           on public.prd_produtos           for select to authenticated using (true);
create policy "prd_variantes_select"          on public.prd_variantes          for select to authenticated using (true);
create policy "prd_variante_atributos_select" on public.prd_variante_atributos for select to authenticated using (true);

-- Escrita: somente admins
create policy "prd_unidades_medida_write"    on public.prd_unidades_medida    for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_conversoes_uom_write"     on public.prd_conversoes_uom     for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_atributos_write"          on public.prd_atributos          for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_atributo_valores_write"   on public.prd_atributo_valores   for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_produtos_write"           on public.prd_produtos           for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_variantes_write"          on public.prd_variantes          for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');
create policy "prd_variante_atributos_write" on public.prd_variante_atributos for all to authenticated using (public.get_my_role() = 'admin') with check (public.get_my_role() = 'admin');

-- ------------------------------------------------------------
-- Dados iniciais — unidades comuns
-- ------------------------------------------------------------
insert into public.prd_unidades_medida (nome, sigla) values
  ('Unidade',      'un'),
  ('Quilograma',   'kg'),
  ('Grama',        'g'),
  ('Metro',        'm'),
  ('Centímetro',   'cm'),
  ('Litro',        'L'),
  ('Mililitro',    'mL'),
  ('Caixa',        'cx'),
  ('Par',          'par'),
  ('Rolo',         'rl');
