-- ============================================================================
-- 014_paginacao.sql
-- SupplyGo — Paginacao server-side + busca acelerada
-- ============================================================================
-- Objetivo:
--   1) Habilitar pg_trgm e criar indices GIN trigram para acelerar buscas
--      com ILIKE em colunas pesquisaveis livremente.
--   2) Criar RPCs `fn_listar_*` dedicadas, paginadas e com JOINs prontos,
--      para todas as telas que possuem listagens com dados relacionados
--      (evita N+1 no cliente).
--
-- Padrao de RPC:
--   RETURNS TABLE(total bigint, registros jsonb)
--   - `total`     -> contagem absoluta apos aplicar filtros.
--   - `registros` -> array jsonb com a pagina solicitada. Conteudo em
--                    snake_case (cliente converte com toCamelCase).
--   - Parametros:
--     p_pagina  >= 1 (default 1)
--     p_tamanho 1..200 (default 50)
--     p_busca   texto livre (default NULL, vazio = sem filtro)
--     demais filtros opcionais por entidade (default NULL = nao filtra).
--
-- Como rodar: SQL Editor do Supabase Studio.
-- ============================================================================


-- ============================================================================
-- 1. EXTENSAO E INDICES TRIGRAM
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Indices GIN trigram para acelerar ILIKE '%busca%' em colunas pesquisaveis.
-- Usa IF NOT EXISTS para ser idempotente.
CREATE INDEX IF NOT EXISTS idx_itens_nome_trgm
  ON itens USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_itens_descricao_trgm
  ON itens USING gin (descricao gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_fornecedores_razao_social_trgm
  ON fornecedores USING gin (razao_social gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_fantasia_trgm
  ON fornecedores USING gin (nome_fantasia gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj_trgm
  ON fornecedores USING gin (cnpj gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_usuarios_nome_trgm
  ON usuarios USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_usuarios_email_trgm
  ON usuarios USING gin (email gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_unidades_nome_trgm
  ON unidades USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_departamentos_nome_trgm
  ON departamentos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_empresas_emitentes_razao_trgm
  ON empresas_emitentes USING gin (razao_social gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_categorias_nome_trgm
  ON categorias USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_categorias_fornecedor_nome_trgm
  ON categorias_fornecedor USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_unidades_medida_nome_trgm
  ON unidades_medida USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_moedas_nome_trgm
  ON moedas USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_nome_trgm
  ON formas_pagamento USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_condicoes_pagamento_nome_trgm
  ON condicoes_pagamento USING gin (nome gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_numero_trgm
  ON solicitacoes USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_sol_compra_numero_trgm
  ON solicitacoes_compra USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_pedidos_numero_trgm
  ON pedidos_compra USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_cotacoes_numero_trgm
  ON cotacoes USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_nf_numero_trgm
  ON notas_fiscais USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contratos_numero_trgm
  ON contratos USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_contratos_nome_trgm
  ON contratos USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lotes_numero_trgm
  ON lotes_entrega USING gin (numero gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_notificacoes_titulo_trgm
  ON notificacoes USING gin (titulo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_rotas_nome_trgm
  ON rotas_sistema USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_perfis_nome_trgm
  ON perfis_acesso USING gin (nome gin_trgm_ops);


-- ============================================================================
-- 2. FUNCAO HELPER — clamp de pagina/tamanho
-- ============================================================================
-- Retorna offset e limit normalizados. Usada por todas as RPCs.
CREATE OR REPLACE FUNCTION fn_paginacao_clamp(p_pagina int, p_tamanho int)
RETURNS TABLE(v_offset int, v_limit int)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    (GREATEST(COALESCE(p_pagina, 1), 1) - 1) * LEAST(GREATEST(COALESCE(p_tamanho, 50), 1), 200),
    LEAST(GREATEST(COALESCE(p_tamanho, 50), 1), 200);
$$;


-- ============================================================================
-- 3. RPCs DE LISTAGEM PAGINADA
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 3.1 ITENS — catalogo com categoria, unidade de medida e fornecedor prefer.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_itens(
  p_busca               text    DEFAULT NULL,
  p_categoria_id        uuid    DEFAULT NULL,
  p_ativo               boolean DEFAULT NULL,
  p_eh_movel            boolean DEFAULT NULL,
  p_eh_consumivel       boolean DEFAULT NULL,
  p_permite_emprestimo  boolean DEFAULT NULL,
  p_pagina              int     DEFAULT 1,
  p_tamanho             int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      i.*,
      c.nome                AS categoria_nome,
      um.nome               AS unidade_medida_nome,
      um.codigo             AS unidade_medida_codigo,
      f.razao_social        AS fornecedor_preferencial_nome
    FROM itens i
    LEFT JOIN categorias c        ON c.id = i.categoria_id
    LEFT JOIN unidades_medida um  ON um.id = i.unidade_medida_id
    LEFT JOIN fornecedores f      ON f.id = i.fornecedor_preferencial_id
    WHERE (p_categoria_id IS NULL OR i.categoria_id = p_categoria_id)
      AND (p_ativo IS NULL OR i.ativo = p_ativo)
      AND (p_eh_movel IS NULL OR i.eh_movel = p_eh_movel)
      AND (p_eh_consumivel IS NULL OR i.eh_consumivel = p_eh_consumivel)
      AND (p_permite_emprestimo IS NULL OR i.permite_emprestimo = p_permite_emprestimo)
      AND (
        v_busca IS NULL
        OR i.nome ILIKE '%'||v_busca||'%'
        OR COALESCE(i.descricao, '') ILIKE '%'||v_busca||'%'
        OR COALESCE(i.marca, '')     ILIKE '%'||v_busca||'%'
        OR COALESCE(i.modelo, '')    ILIKE '%'||v_busca||'%'
        OR COALESCE(i.produto_codigo::text, '') = v_busca
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY nome ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.2 FORNECEDORES — com categoria
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_fornecedores(
  p_busca           text    DEFAULT NULL,
  p_status          text    DEFAULT NULL,
  p_categoria_id    uuid    DEFAULT NULL,
  p_pagina          int     DEFAULT 1,
  p_tamanho         int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      f.*,
      cf.nome AS categoria_nome
    FROM fornecedores f
    LEFT JOIN categorias_fornecedor cf ON cf.id = f.categoria_id
    WHERE (p_status IS NULL OR f.status = p_status)
      AND (p_categoria_id IS NULL OR f.categoria_id = p_categoria_id)
      AND (
        v_busca IS NULL
        OR f.razao_social ILIKE '%'||v_busca||'%'
        OR COALESCE(f.nome_fantasia, '') ILIKE '%'||v_busca||'%'
        OR COALESCE(f.cnpj, '') ILIKE '%'||v_busca||'%'
        OR COALESCE(f.cpf, '')  ILIKE '%'||v_busca||'%'
        OR COALESCE(f.contato_email, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY razao_social ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.3 USUARIOS — com departamento
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_usuarios(
  p_busca           text    DEFAULT NULL,
  p_ativo           boolean DEFAULT NULL,
  p_departamento_id uuid    DEFAULT NULL,
  p_pagina          int     DEFAULT 1,
  p_tamanho         int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      u.*,
      d.nome AS departamento_nome
    FROM usuarios u
    LEFT JOIN departamentos d ON d.id = u.departamento_id
    WHERE (p_ativo IS NULL OR u.ativo = p_ativo)
      AND (p_departamento_id IS NULL OR u.departamento_id = p_departamento_id)
      AND (
        v_busca IS NULL
        OR u.nome ILIKE '%'||v_busca||'%'
        OR u.email ILIKE '%'||v_busca||'%'
        OR COALESCE(u.cargo, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY nome ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.4 MOVIMENTACOES — com item, unidade, usuario
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_movimentacoes(
  p_busca       text         DEFAULT NULL,
  p_tipo        text         DEFAULT NULL,
  p_item_id     uuid         DEFAULT NULL,
  p_unidade_id  uuid         DEFAULT NULL,
  p_data_de     timestamptz  DEFAULT NULL,
  p_data_ate    timestamptz  DEFAULT NULL,
  p_pagina      int          DEFAULT 1,
  p_tamanho     int          DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      m.*,
      i.nome  AS item_nome,
      i.produto_codigo,
      un.nome AS unidade_nome,
      uo.nome AS unidade_origem_nome,
      ud.nome AS unidade_destino_nome,
      us.nome AS usuario_nome,
      ut.nome AS tomador_nome
    FROM movimentacoes m
    JOIN itens     i  ON i.id = m.item_id
    LEFT JOIN unidades un ON un.id = m.unidade_id
    LEFT JOIN unidades uo ON uo.id = m.unidade_origem_id
    LEFT JOIN unidades ud ON ud.id = m.unidade_destino_id
    JOIN usuarios  us ON us.id = m.usuario_id
    LEFT JOIN usuarios  ut ON ut.id = m.tomador_usuario_id
    WHERE (p_tipo IS NULL OR m.tipo = p_tipo)
      AND (p_item_id IS NULL OR m.item_id = p_item_id)
      AND (p_unidade_id IS NULL
           OR m.unidade_id = p_unidade_id
           OR m.unidade_origem_id = p_unidade_id
           OR m.unidade_destino_id = p_unidade_id)
      AND (p_data_de  IS NULL OR m.criado_em >= p_data_de)
      AND (p_data_ate IS NULL OR m.criado_em <= p_data_ate)
      AND (
        v_busca IS NULL
        OR i.nome ILIKE '%'||v_busca||'%'
        OR COALESCE(m.observacoes, '')  ILIKE '%'||v_busca||'%'
        OR COALESCE(m.ordem_servico, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.5 SALDOS por unidade — estoques_unidade + itens + unidade
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_saldos(
  p_busca                 text    DEFAULT NULL,
  p_unidade_id            uuid    DEFAULT NULL,
  p_item_id               uuid    DEFAULT NULL,
  p_apenas_abaixo_minimo  boolean DEFAULT NULL,
  p_pagina                int     DEFAULT 1,
  p_tamanho               int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      eu.*,
      i.nome                AS item_nome,
      i.produto_codigo,
      i.categoria_id        AS item_categoria_id,
      un.nome               AS unidade_nome,
      (eu.quantidade_minima - eu.quantidade) AS deficit
    FROM estoques_unidade eu
    JOIN itens    i  ON i.id  = eu.item_id
    JOIN unidades un ON un.id = eu.unidade_id
    WHERE (p_unidade_id IS NULL OR eu.unidade_id = p_unidade_id)
      AND (p_item_id IS NULL OR eu.item_id = p_item_id)
      AND (
        p_apenas_abaixo_minimo IS NOT TRUE
        OR (eu.quantidade_minima > 0 AND eu.quantidade < eu.quantidade_minima)
      )
      AND (
        v_busca IS NULL
        OR i.nome  ILIKE '%'||v_busca||'%'
        OR un.nome ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY item_nome ASC, unidade_nome ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.6 SOLICITACOES operacionais — material, movel, retirada, emprestimo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_solicitacoes(
  p_tipo          text    DEFAULT NULL,
  p_status        text    DEFAULT NULL,
  p_busca         text    DEFAULT NULL,
  p_unidade_id    uuid    DEFAULT NULL,
  p_solicitante_id uuid   DEFAULT NULL,
  p_data_de       timestamptz DEFAULT NULL,
  p_data_ate      timestamptz DEFAULT NULL,
  p_pagina        int     DEFAULT 1,
  p_tamanho       int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      s.*,
      i.nome  AS item_nome,
      un.nome AS unidade_nome,
      us.nome AS solicitante_nome,
      ut.nome AS tomador_nome
    FROM solicitacoes s
    JOIN itens    i  ON i.id  = s.item_id
    JOIN unidades un ON un.id = s.unidade_solicitante_id
    JOIN usuarios us ON us.id = s.solicitado_por_usuario_id
    LEFT JOIN usuarios ut ON ut.id = s.tomador_usuario_id
    WHERE (p_tipo IS NULL OR s.tipo = p_tipo)
      AND (p_status IS NULL OR s.status = p_status)
      AND (p_unidade_id IS NULL OR s.unidade_solicitante_id = p_unidade_id)
      AND (p_solicitante_id IS NULL OR s.solicitado_por_usuario_id = p_solicitante_id)
      AND (p_data_de  IS NULL OR s.criado_em >= p_data_de)
      AND (p_data_ate IS NULL OR s.criado_em <= p_data_ate)
      AND (
        v_busca IS NULL
        OR COALESCE(s.numero, '') ILIKE '%'||v_busca||'%'
        OR i.nome ILIKE '%'||v_busca||'%'
        OR us.nome ILIKE '%'||v_busca||'%'
        OR COALESCE(s.justificativa, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.7 SOLICITACOES DE COMPRA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_solicitacoes_compra(
  p_status          text DEFAULT NULL,
  p_busca           text DEFAULT NULL,
  p_solicitante_id  uuid DEFAULT NULL,
  p_comprador_id    uuid DEFAULT NULL,
  p_unidade_id      uuid DEFAULT NULL,
  p_pagina          int  DEFAULT 1,
  p_tamanho         int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      sc.*,
      us.nome AS solicitante_nome,
      uc.nome AS comprador_nome,
      un.nome AS unidade_nome,
      d.nome  AS departamento_nome,
      (SELECT count(*) FROM solicitacoes_compra_itens sci WHERE sci.solicitacao_id = sc.id) AS total_itens
    FROM solicitacoes_compra sc
    JOIN usuarios us ON us.id = sc.solicitante_id
    LEFT JOIN usuarios uc      ON uc.id = sc.comprador_id
    LEFT JOIN unidades un      ON un.id = sc.unidade_id
    LEFT JOIN departamentos d  ON d.id  = sc.departamento_id
    WHERE (p_status IS NULL OR sc.status = p_status)
      AND (p_solicitante_id IS NULL OR sc.solicitante_id = p_solicitante_id)
      AND (p_comprador_id IS NULL OR sc.comprador_id = p_comprador_id)
      AND (p_unidade_id IS NULL OR sc.unidade_id = p_unidade_id)
      AND (
        v_busca IS NULL
        OR COALESCE(sc.numero, '') ILIKE '%'||v_busca||'%'
        OR sc.justificativa ILIKE '%'||v_busca||'%'
        OR us.nome ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.8 COTACOES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_cotacoes(
  p_status        text DEFAULT NULL,
  p_busca         text DEFAULT NULL,
  p_comprador_id  uuid DEFAULT NULL,
  p_pagina        int  DEFAULT 1,
  p_tamanho       int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      ct.*,
      uc.nome AS comprador_nome,
      fv.razao_social AS fornecedor_vencedor_nome,
      un.nome AS local_entrega_nome,
      (SELECT count(*) FROM cotacoes_fornecedores cf WHERE cf.cotacao_id = ct.id)         AS total_fornecedores,
      (SELECT count(*) FROM cotacoes_respostas cr
        WHERE cr.cotacao_id = ct.id AND cr.status = 'responded')                          AS total_respostas
    FROM cotacoes ct
    JOIN usuarios uc           ON uc.id = ct.comprador_id
    LEFT JOIN fornecedores fv  ON fv.id = ct.fornecedor_vencedor_id
    LEFT JOIN unidades un      ON un.id = ct.local_entrega_unidade_id
    WHERE (p_status IS NULL OR ct.status = p_status)
      AND (p_comprador_id IS NULL OR ct.comprador_id = p_comprador_id)
      AND (
        v_busca IS NULL
        OR COALESCE(ct.numero, '') ILIKE '%'||v_busca||'%'
        OR uc.nome ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.9 PEDIDOS DE COMPRA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_pedidos_compra(
  p_status            text DEFAULT NULL,
  p_status_aprovacao  text DEFAULT NULL,
  p_busca             text DEFAULT NULL,
  p_fornecedor_id     uuid DEFAULT NULL,
  p_comprador_id      uuid DEFAULT NULL,
  p_aprovador_id      uuid DEFAULT NULL,
  p_empresa_emitente_id uuid DEFAULT NULL,
  p_pagina            int  DEFAULT 1,
  p_tamanho           int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      pc.*,
      f.razao_social  AS fornecedor_razao_social,
      f.nome_fantasia AS fornecedor_nome_fantasia,
      ee.razao_social AS empresa_emitente_razao_social,
      uc.nome         AS comprador_nome,
      ua.nome         AS aprovador_nome
    FROM pedidos_compra pc
    JOIN fornecedores f       ON f.id  = pc.fornecedor_id
    JOIN empresas_emitentes ee ON ee.id = pc.empresa_emitente_id
    JOIN usuarios uc           ON uc.id = pc.comprador_id
    LEFT JOIN usuarios ua      ON ua.id = pc.aprovador_alcada_id
    WHERE (p_status IS NULL OR pc.status = p_status)
      AND (p_status_aprovacao IS NULL OR pc.status_aprovacao = p_status_aprovacao)
      AND (p_fornecedor_id IS NULL OR pc.fornecedor_id = p_fornecedor_id)
      AND (p_comprador_id IS NULL OR pc.comprador_id = p_comprador_id)
      AND (p_aprovador_id IS NULL OR pc.aprovador_alcada_id = p_aprovador_id)
      AND (p_empresa_emitente_id IS NULL OR pc.empresa_emitente_id = p_empresa_emitente_id)
      AND (
        v_busca IS NULL
        OR COALESCE(pc.numero, '') ILIKE '%'||v_busca||'%'
        OR f.razao_social ILIKE '%'||v_busca||'%'
        OR COALESCE(f.nome_fantasia, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.10 NOTAS FISCAIS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_notas_fiscais(
  p_status              text DEFAULT NULL,
  p_busca               text DEFAULT NULL,
  p_fornecedor_id       uuid DEFAULT NULL,
  p_empresa_emitente_id uuid DEFAULT NULL,
  p_data_de             timestamptz DEFAULT NULL,
  p_data_ate            timestamptz DEFAULT NULL,
  p_pagina              int  DEFAULT 1,
  p_tamanho             int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      nf.*,
      f.razao_social  AS fornecedor_razao_social,
      ee.razao_social AS empresa_emitente_razao_social
    FROM notas_fiscais nf
    JOIN fornecedores f        ON f.id  = nf.fornecedor_id
    JOIN empresas_emitentes ee ON ee.id = nf.empresa_emitente_id
    WHERE (p_status IS NULL OR nf.status = p_status)
      AND (p_fornecedor_id IS NULL OR nf.fornecedor_id = p_fornecedor_id)
      AND (p_empresa_emitente_id IS NULL OR nf.empresa_emitente_id = p_empresa_emitente_id)
      AND (p_data_de  IS NULL OR nf.data_emissao >= p_data_de)
      AND (p_data_ate IS NULL OR nf.data_emissao <= p_data_ate)
      AND (
        v_busca IS NULL
        OR nf.numero ILIKE '%'||v_busca||'%'
        OR COALESCE(nf.chave_acesso, '') ILIKE '%'||v_busca||'%'
        OR f.razao_social ILIKE '%'||v_busca||'%'
        OR nf.cnpj_emissor ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY data_emissao DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.11 RECEBIMENTOS DE COMPRA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_recebimentos(
  p_status        text DEFAULT NULL,
  p_busca         text DEFAULT NULL,
  p_pedido_id     uuid DEFAULT NULL,
  p_unidade_id    uuid DEFAULT NULL,
  p_pagina        int  DEFAULT 1,
  p_tamanho       int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      r.*,
      pc.numero        AS pedido_numero,
      pci.descricao    AS item_descricao,
      i.nome           AS item_nome,
      un.nome          AS unidade_recebimento_nome,
      ur.nome          AS recebido_por_nome,
      uc.nome          AS conferido_por_nome,
      nf.numero        AS nota_fiscal_numero
    FROM recebimentos_compra r
    JOIN pedidos_compra pc        ON pc.id  = r.pedido_id
    JOIN pedidos_compra_itens pci ON pci.id = r.pedido_item_id
    LEFT JOIN itens i             ON i.id   = pci.item_id
    JOIN unidades un              ON un.id  = r.unidade_recebimento_id
    JOIN usuarios ur              ON ur.id  = r.recebido_por_usuario_id
    LEFT JOIN usuarios uc         ON uc.id  = r.conferido_por_usuario_id
    LEFT JOIN notas_fiscais nf    ON nf.id  = r.nota_fiscal_id
    WHERE (p_status IS NULL OR r.status = p_status)
      AND (p_pedido_id IS NULL OR r.pedido_id = p_pedido_id)
      AND (p_unidade_id IS NULL OR r.unidade_recebimento_id = p_unidade_id)
      AND (
        v_busca IS NULL
        OR COALESCE(pc.numero, '') ILIKE '%'||v_busca||'%'
        OR pci.descricao ILIKE '%'||v_busca||'%'
        OR COALESCE(i.nome, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY data_recebimento DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.12 CONTRATOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_contratos(
  p_status              text DEFAULT NULL,
  p_busca               text DEFAULT NULL,
  p_fornecedor_id       uuid DEFAULT NULL,
  p_empresa_emitente_id uuid DEFAULT NULL,
  p_pagina              int  DEFAULT 1,
  p_tamanho             int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.*,
      f.razao_social  AS fornecedor_razao_social,
      ee.razao_social AS empresa_emitente_razao_social,
      d.nome          AS departamento_nome,
      (c.data_fim - CURRENT_DATE) AS dias_para_vencer,
      CASE WHEN c.valor_total > 0
           THEN (c.saldo / c.valor_total * 100)
           ELSE NULL
      END AS percentual_saldo
    FROM contratos c
    JOIN fornecedores f        ON f.id  = c.fornecedor_id
    JOIN empresas_emitentes ee ON ee.id = c.empresa_emitente_id
    LEFT JOIN departamentos d  ON d.id  = c.departamento_id
    WHERE (p_status IS NULL OR c.status = p_status)
      AND (p_fornecedor_id IS NULL OR c.fornecedor_id = p_fornecedor_id)
      AND (p_empresa_emitente_id IS NULL OR c.empresa_emitente_id = p_empresa_emitente_id)
      AND (
        v_busca IS NULL
        OR c.numero ILIKE '%'||v_busca||'%'
        OR c.nome   ILIKE '%'||v_busca||'%'
        OR f.razao_social ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY data_fim ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.13 LOTES DE ENTREGA
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_lotes_entrega(
  p_status              text DEFAULT NULL,
  p_busca               text DEFAULT NULL,
  p_unidade_destino_id  uuid DEFAULT NULL,
  p_motorista_id        uuid DEFAULT NULL,
  p_pagina              int  DEFAULT 1,
  p_tamanho             int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      le.*,
      un.nome AS unidade_destino_nome,
      um.nome AS motorista_nome,
      (SELECT count(*) FROM lotes_entrega_itens lei WHERE lei.lote_id = le.id) AS total_solicitacoes
    FROM lotes_entrega le
    JOIN unidades un ON un.id = le.unidade_destino_id
    JOIN usuarios um ON um.id = le.motorista_usuario_id
    WHERE (p_status IS NULL OR le.status = p_status)
      AND (p_unidade_destino_id IS NULL OR le.unidade_destino_id = p_unidade_destino_id)
      AND (p_motorista_id IS NULL OR le.motorista_usuario_id = p_motorista_id)
      AND (
        v_busca IS NULL
        OR COALESCE(le.numero, '') ILIKE '%'||v_busca||'%'
        OR le.codigo_qr ILIKE '%'||v_busca||'%'
        OR um.nome ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.14 LOG DE ATIVIDADES (timeline)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_log_atividades(
  p_tipo_entidade text DEFAULT NULL,
  p_entidade_id   uuid DEFAULT NULL,
  p_acao          text DEFAULT NULL,
  p_usuario_id    uuid DEFAULT NULL,
  p_data_de       timestamptz DEFAULT NULL,
  p_data_ate      timestamptz DEFAULT NULL,
  p_busca         text DEFAULT NULL,
  p_pagina        int  DEFAULT 1,
  p_tamanho       int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      l.*,
      u.nome AS usuario_nome
    FROM log_atividades l
    LEFT JOIN usuarios u ON u.id = l.usuario_id
    WHERE (p_tipo_entidade IS NULL OR l.tipo_entidade = p_tipo_entidade)
      AND (p_entidade_id IS NULL OR l.entidade_id = p_entidade_id)
      AND (p_acao IS NULL OR l.acao = p_acao)
      AND (p_usuario_id IS NULL OR l.usuario_id = p_usuario_id)
      AND (p_data_de  IS NULL OR l.criado_em >= p_data_de)
      AND (p_data_ate IS NULL OR l.criado_em <= p_data_ate)
      AND (
        v_busca IS NULL
        OR l.acao ILIKE '%'||v_busca||'%'
        OR l.tipo_entidade ILIKE '%'||v_busca||'%'
        OR COALESCE(u.nome, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 3.15 NOTIFICACOES (do usuario logado)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_notificacoes(
  p_usuario_id        uuid    DEFAULT NULL,
  p_apenas_nao_lidas  boolean DEFAULT NULL,
  p_apenas_nao_arquivadas boolean DEFAULT TRUE,
  p_busca             text    DEFAULT NULL,
  p_pagina            int     DEFAULT 1,
  p_tamanho           int     DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT n.*
    FROM notificacoes n
    WHERE (p_usuario_id IS NULL OR n.usuario_id = p_usuario_id)
      AND (p_apenas_nao_lidas IS NOT TRUE OR n.lido_em IS NULL)
      AND (p_apenas_nao_arquivadas IS NOT TRUE OR n.arquivado_em IS NULL)
      AND (
        v_busca IS NULL
        OR n.titulo ILIKE '%'||v_busca||'%'
        OR COALESCE(n.mensagem, '') ILIKE '%'||v_busca||'%'
        OR n.tipo ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ============================================================================
-- 4. RPCs DE DASHBOARDS PAGINADOS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 4.1 Estoques abaixo do minimo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_estoques_abaixo_minimo(
  p_busca       text DEFAULT NULL,
  p_unidade_id  uuid DEFAULT NULL,
  p_pagina      int  DEFAULT 1,
  p_tamanho     int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      eu.*,
      i.nome           AS item_nome,
      i.produto_codigo,
      un.nome          AS unidade_nome,
      (eu.quantidade_minima - eu.quantidade) AS deficit
    FROM estoques_unidade eu
    JOIN itens i     ON i.id  = eu.item_id
    JOIN unidades un ON un.id = eu.unidade_id
    WHERE eu.quantidade < eu.quantidade_minima
      AND i.ativo = true
      AND (p_unidade_id IS NULL OR eu.unidade_id = p_unidade_id)
      AND (
        v_busca IS NULL
        OR i.nome  ILIKE '%'||v_busca||'%'
        OR un.nome ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY deficit DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 4.2 Emprestimos atrasados (loan_out sem loan_return e prazo vencido)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_emprestimos_atrasados(
  p_busca       text DEFAULT NULL,
  p_unidade_id  uuid DEFAULT NULL,
  p_pagina      int  DEFAULT 1,
  p_tamanho     int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      m.*,
      i.nome  AS item_nome,
      un.nome AS unidade_nome,
      us.nome AS usuario_nome,
      ut.nome AS tomador_nome,
      EXTRACT(DAY FROM (now() - m.emprestimo_devolucao_prevista))::int AS dias_atraso
    FROM movimentacoes m
    JOIN itens     i  ON i.id  = m.item_id
    LEFT JOIN unidades un ON un.id = m.unidade_id
    JOIN usuarios  us ON us.id = m.usuario_id
    LEFT JOIN usuarios ut ON ut.id = m.tomador_usuario_id
    WHERE m.tipo = 'loan_out'
      AND m.emprestimo_devolucao_prevista < now()
      AND NOT EXISTS (
        SELECT 1 FROM movimentacoes r
        WHERE r.tipo = 'loan_return' AND r.movimentacao_origem_id = m.id
      )
      AND (p_unidade_id IS NULL OR m.unidade_id = p_unidade_id)
      AND (
        v_busca IS NULL
        OR i.nome ILIKE '%'||v_busca||'%'
        OR COALESCE(ut.nome, '') ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY dias_atraso DESC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 4.3 Contratos vencendo
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_contratos_vencendo(
  p_busca       text DEFAULT NULL,
  p_dias_limite int  DEFAULT 30,
  p_pagina      int  DEFAULT 1,
  p_tamanho     int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      c.*,
      f.razao_social  AS fornecedor_razao_social,
      (c.data_fim - CURRENT_DATE) AS dias_para_vencer,
      CASE WHEN c.valor_total > 0
           THEN (c.saldo / c.valor_total * 100)
           ELSE NULL
      END AS percentual_saldo
    FROM contratos c
    JOIN fornecedores f ON f.id = c.fornecedor_id
    WHERE c.status = 'active'
      AND (
        (c.data_fim - CURRENT_DATE) <= COALESCE(p_dias_limite, 30)
        OR (c.valor_total > 0 AND c.saldo / c.valor_total < 0.10)
      )
      AND (
        v_busca IS NULL
        OR c.numero ILIKE '%'||v_busca||'%'
        OR c.nome   ILIKE '%'||v_busca||'%'
        OR f.razao_social ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY dias_para_vencer ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ----------------------------------------------------------------------------
-- 4.4 Pedidos aguardando aprovacao
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fn_listar_pedidos_aguardando(
  p_busca         text DEFAULT NULL,
  p_aprovador_id  uuid DEFAULT NULL,
  p_pagina        int  DEFAULT 1,
  p_tamanho       int  DEFAULT 50
)
RETURNS TABLE(total bigint, registros jsonb)
LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE
  v_offset int;
  v_limit  int;
  v_busca  text := NULLIF(trim(coalesce(p_busca, '')), '');
BEGIN
  SELECT c.v_offset, c.v_limit INTO v_offset, v_limit
    FROM fn_paginacao_clamp(p_pagina, p_tamanho) c;

  RETURN QUERY
  WITH base AS (
    SELECT
      pc.*,
      f.razao_social  AS fornecedor_razao_social,
      uc.nome         AS comprador_nome,
      ua.nome         AS aprovador_nome
    FROM pedidos_compra pc
    JOIN fornecedores f   ON f.id  = pc.fornecedor_id
    JOIN usuarios uc      ON uc.id = pc.comprador_id
    LEFT JOIN usuarios ua ON ua.id = pc.aprovador_alcada_id
    WHERE pc.status_aprovacao = 'pendente'
      AND (p_aprovador_id IS NULL OR pc.aprovador_alcada_id = p_aprovador_id)
      AND (
        v_busca IS NULL
        OR COALESCE(pc.numero, '') ILIKE '%'||v_busca||'%'
        OR f.razao_social ILIKE '%'||v_busca||'%'
      )
  ),
  pagina AS (
    SELECT * FROM base
    ORDER BY criado_em ASC
    OFFSET v_offset LIMIT v_limit
  )
  SELECT
    (SELECT count(*) FROM base)::bigint,
    COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM pagina p), '[]'::jsonb);
END $$;


-- ============================================================================
-- 5. GRANTs
-- ============================================================================
GRANT EXECUTE ON FUNCTION fn_paginacao_clamp(int, int)               TO authenticated, anon;

GRANT EXECUTE ON FUNCTION fn_listar_itens(text, uuid, boolean, boolean, boolean, boolean, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_fornecedores(text, text, uuid, int, int)               TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_usuarios(text, boolean, uuid, int, int)                TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_movimentacoes(text, text, uuid, uuid, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_saldos(text, uuid, uuid, boolean, int, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_solicitacoes(text, text, text, uuid, uuid, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_solicitacoes_compra(text, text, uuid, uuid, uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_cotacoes(text, text, uuid, int, int)                   TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_pedidos_compra(text, text, text, uuid, uuid, uuid, uuid, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_notas_fiscais(text, text, uuid, uuid, timestamptz, timestamptz, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_recebimentos(text, text, uuid, uuid, int, int)         TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_contratos(text, text, uuid, uuid, int, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_lotes_entrega(text, text, uuid, uuid, int, int)        TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_log_atividades(text, uuid, text, uuid, timestamptz, timestamptz, text, int, int) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_notificacoes(uuid, boolean, boolean, text, int, int)   TO authenticated;

GRANT EXECUTE ON FUNCTION fn_listar_estoques_abaixo_minimo(text, uuid, int, int)           TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_emprestimos_atrasados(text, uuid, int, int)            TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_contratos_vencendo(text, int, int, int)                TO authenticated;
GRANT EXECUTE ON FUNCTION fn_listar_pedidos_aguardando(text, uuid, int, int)               TO authenticated;


-- ============================================================================
-- 6. RECARREGAR PostgREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================================
-- FIM
-- ============================================================================
