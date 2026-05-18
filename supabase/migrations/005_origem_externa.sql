-- ============================================================
-- 005_origem_externa.sql
-- Rastreabilidade de origem (importacoes externas tipo GoEvo)
-- + unidades de medida adicionais usadas no catalogo importado
-- ============================================================

-- ------------------------------------------------------------
-- codigo_origem: rastreia o codigo do sistema externo de origem.
-- Permite reimportacao idempotente e merge.
-- ------------------------------------------------------------
alter table public.prd_produtos
  add column codigo_origem text;

comment on column public.prd_produtos.codigo_origem is
  'Codigos do sistema externo agregados nesse produto (CSV). Ex: "goevo:000002,goevo:000010".';

create index prd_produtos_codigo_origem_idx
  on public.prd_produtos (codigo_origem);

alter table public.prd_variantes
  add column codigo_origem text unique;

comment on column public.prd_variantes.codigo_origem is
  'Codigo unico no sistema externo de origem. Ex: "goevo:000002".';

create index prd_variantes_codigo_origem_idx
  on public.prd_variantes (codigo_origem);

-- ------------------------------------------------------------
-- Unidades de medida adicionais.
-- Insere apenas as que faltam (on conflict do nothing pela sigla unica).
-- Siglas mantidas exatamente como vem do GoEvo para preservar a granularidade.
-- ------------------------------------------------------------
insert into public.prd_unidades_medida (nome, sigla) values
  ('Peca',                'PC'),
  ('Peca (cedilha)',      'PÇ'),
  ('Peca (legado)',       'PE'),
  ('Metro Quadrado',      'M2'),
  ('Metro Cubico',        'M3'),
  ('Kit',                 'KI'),
  ('Kit (alternativo)',   'KT'),
  ('Barra',               'BR'),
  ('Cento',               'CT'),
  ('Cento (alternativo)', 'CE'),
  ('Pacote',              'PT'),
  ('Jogo',                'JG'),
  ('Galao',               'GL'),
  ('Conjunto',            'CJ'),
  ('Chapa',               'CH'),
  ('Saco',                'SC'),
  ('Saco (alternativo)',  'SA'),
  ('Lata',                'LA'),
  ('Lata (alternativo)',  'LT'),
  ('Balde',               'BD'),
  ('Bobina',              'BB'),
  ('Bobina (alternativo)', 'BO'),
  ('Disco',               'DI'),
  ('Garrafao',            'GF'),
  ('Sortido',             'SR'),
  ('Tonelada',            'T'),
  ('Cabo',                'CA'),
  ('Quilate',             'QT'),
  ('Metro (legado)',      'MT'),
  ('Par (alternativo)',   'PR'),
  ('Par (alternativo 2)', 'PA'),
  ('Sem unidade',         '1')
on conflict (sigla) do nothing;
