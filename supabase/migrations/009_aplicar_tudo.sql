-- ============================================================================
-- 009_aplicar_tudo.sql
-- Script unico, linear, idempotente. Roda inteiro de cima a baixo.
--
-- Faz:
--   1) Funcoes helper (meu_usuario_id, tem_permissao, meu_perfil) com search_path
--   2) Trigger de cadastro (fn_handle_new_auth_user) e RPC eh_primeira_conta
--   3) Habilita RLS em todas as tabelas
--   4) Cria todas as policies (drop + create)
--   5) GRANTs e DEFAULT PRIVILEGES
--   6) Sincroniza usuarios <- auth.users (caso tabela usuarios esteja vazia)
--   7) Garante perfil DEV no primeiro usuario
-- ============================================================================


-- ============================================================================
-- 1. FUNCOES HELPER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.meu_usuario_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT id FROM public.usuarios WHERE auth_usuario_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.tem_permissao(p_codigo_rota text, p_flag text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_usuario_id uuid; v_rota_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_usuario_id FROM public.usuarios WHERE auth_usuario_id = auth.uid();
  IF v_usuario_id IS NULL THEN RETURN false; END IF;
  SELECT id INTO v_rota_id FROM public.rotas_sistema WHERE codigo = p_codigo_rota;
  IF v_rota_id IS NULL THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.perfis_acesso_rotas par
    JOIN public.usuarios_perfis up ON up.perfil_id = par.perfil_id
    WHERE up.usuario_id = v_usuario_id AND par.rota_id = v_rota_id
      AND CASE p_flag
            WHEN 'pode_ler'      THEN par.pode_ler
            WHEN 'pode_escrever' THEN par.pode_escrever
            WHEN 'pode_excluir'  THEN par.pode_excluir
            WHEN 'pode_aprovar'  THEN par.pode_aprovar
            ELSE false END = true
  ) THEN RETURN true; END IF;

  IF EXISTS (
    SELECT 1 FROM public.usuarios_rotas_extras ure
    WHERE ure.usuario_id = v_usuario_id AND ure.rota_id = v_rota_id
      AND CASE p_flag
            WHEN 'pode_ler'      THEN ure.pode_ler
            WHEN 'pode_escrever' THEN ure.pode_escrever
            WHEN 'pode_excluir'  THEN ure.pode_excluir
            WHEN 'pode_aprovar'  THEN ure.pode_aprovar
            ELSE false END = true
  ) THEN RETURN true; END IF;

  RETURN false;
END $$;

CREATE OR REPLACE FUNCTION public.meu_perfil() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_usuario_id uuid; v_resultado jsonb;
BEGIN
  SELECT id INTO v_usuario_id FROM public.usuarios WHERE auth_usuario_id = auth.uid();
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('usuario', null, 'perfis', '[]'::jsonb, 'rotasPermitidas', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'usuario', to_jsonb(u.*),
    'perfis', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('id',p.id,'codigo',p.codigo,'nome',p.nome,'descricao',p.descricao))
        FROM public.perfis_acesso p
        JOIN public.usuarios_perfis up ON up.perfil_id = p.id
       WHERE up.usuario_id = u.id
    ), '[]'::jsonb),
    'rotasPermitidas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.id, 'codigo', rs.codigo, 'caminho', rs.caminho, 'nome', rs.nome,
        'modulo', rs.modulo, 'icone', rs.icone, 'ordem', rs.ordem,
        'podeLer', max_pode_ler, 'podeEscrever', max_pode_escrever,
        'podeExcluir', max_pode_excluir, 'podeAprovar', max_pode_aprovar
      ) ORDER BY rs.modulo, rs.ordem)
        FROM (
          SELECT rota_id,
                 BOOL_OR(pode_ler)      AS max_pode_ler,
                 BOOL_OR(pode_escrever) AS max_pode_escrever,
                 BOOL_OR(pode_excluir)  AS max_pode_excluir,
                 BOOL_OR(pode_aprovar)  AS max_pode_aprovar
            FROM (
              SELECT par.rota_id, par.pode_ler, par.pode_escrever, par.pode_excluir, par.pode_aprovar
                FROM public.perfis_acesso_rotas par
                JOIN public.usuarios_perfis up ON up.perfil_id = par.perfil_id
               WHERE up.usuario_id = u.id
              UNION ALL
              SELECT ure.rota_id, ure.pode_ler, ure.pode_escrever, ure.pode_excluir, ure.pode_aprovar
                FROM public.usuarios_rotas_extras ure
               WHERE ure.usuario_id = u.id
            ) sub GROUP BY rota_id
        ) consolidado
        JOIN public.rotas_sistema rs ON rs.id = consolidado.rota_id
       WHERE rs.ativo = true AND consolidado.max_pode_ler = true
    ), '[]'::jsonb)
  ) INTO v_resultado FROM public.usuarios u WHERE u.id = v_usuario_id;

  RETURN v_resultado;
END $$;


-- ============================================================================
-- 2. TRIGGER de cadastro automatico + RPC eh_primeira_conta
-- ============================================================================

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.fn_handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_usuario_id uuid; v_nome text; v_total int; v_perfil_dev uuid;
BEGIN
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email);
  INSERT INTO public.usuarios (auth_usuario_id, nome, email, ativo)
  VALUES (NEW.id, v_nome, NEW.email, true)
  RETURNING id INTO v_usuario_id;

  SELECT COUNT(*) INTO v_total FROM public.usuarios;
  IF v_total = 1 THEN
    SELECT id INTO v_perfil_dev FROM public.perfis_acesso WHERE codigo = 'DEV';
    IF v_perfil_dev IS NOT NULL THEN
      INSERT INTO public.usuarios_perfis (usuario_id, perfil_id, criado_por_usuario_id)
      VALUES (v_usuario_id, v_perfil_dev, v_usuario_id);
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'fn_handle_new_auth_user falhou para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_auth_user();

GRANT EXECUTE ON FUNCTION public.fn_handle_new_auth_user() TO supabase_auth_admin;

CREATE OR REPLACE FUNCTION public.eh_primeira_conta() RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.usuarios;
  RETURN v_total = 0;
END $$;


-- ============================================================================
-- 3. ENABLE RLS em todas as tabelas (idempotente)
-- ============================================================================
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;


-- ============================================================================
-- 4. HELPER PARA CRIAR POLICIES PADRAO
-- ============================================================================
CREATE OR REPLACE FUNCTION public.criar_policies_padrao(p_tabela text, p_codigo_rota text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_select', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_insert', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_update', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_delete', p_tabela);
  EXECUTE format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.tem_permissao(%L, %L))',
    p_tabela || '_select', p_tabela, p_codigo_rota, 'pode_ler');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (public.tem_permissao(%L, %L))',
    p_tabela || '_insert', p_tabela, p_codigo_rota, 'pode_escrever');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (public.tem_permissao(%L, %L)) WITH CHECK (public.tem_permissao(%L, %L))',
    p_tabela || '_update', p_tabela, p_codigo_rota, 'pode_escrever', p_codigo_rota, 'pode_escrever');
  EXECUTE format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (public.tem_permissao(%L, %L))',
    p_tabela || '_delete', p_tabela, p_codigo_rota, 'pode_excluir');
END $$;


-- ============================================================================
-- 5. POLICIES POR TABELA
-- ============================================================================

-- 5.1 ADMIN
SELECT public.criar_policies_padrao('unidades',           'admin.unidades');
SELECT public.criar_policies_padrao('departamentos',      'admin.departamentos');
SELECT public.criar_policies_padrao('empresas_emitentes', 'admin.empresas-emitentes');
SELECT public.criar_policies_padrao('alcadas_aprovacao',                'admin.alcadas-aprovacao');
SELECT public.criar_policies_padrao('perfis_acesso',         'admin.perfis-acesso');
SELECT public.criar_policies_padrao('perfis_acesso_rotas',   'admin.perfis-acesso');
SELECT public.criar_policies_padrao('usuarios_perfis',       'admin.perfis-acesso');
SELECT public.criar_policies_padrao('usuarios_rotas_extras', 'admin.perfis-acesso');
SELECT public.criar_policies_padrao('rotas_sistema',         'admin.rotas-sistema');

-- 5.2 USUARIOS (caso especial)
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
DROP POLICY IF EXISTS usuarios_delete ON public.usuarios;

CREATE POLICY usuarios_select ON public.usuarios FOR SELECT TO authenticated
  USING (auth_usuario_id = auth.uid() OR public.tem_permissao('admin.usuarios', 'pode_ler'));

CREATE POLICY usuarios_insert ON public.usuarios FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao('admin.usuarios', 'pode_escrever'));

CREATE POLICY usuarios_update ON public.usuarios FOR UPDATE TO authenticated
  USING (auth_usuario_id = auth.uid() OR public.tem_permissao('admin.usuarios', 'pode_escrever'))
  WITH CHECK (auth_usuario_id = auth.uid() OR public.tem_permissao('admin.usuarios', 'pode_escrever'));

CREATE POLICY usuarios_delete ON public.usuarios FOR DELETE TO authenticated
  USING (public.tem_permissao('admin.usuarios', 'pode_excluir'));

-- 5.3 CADASTROS
SELECT public.criar_policies_padrao('moedas',                'cadastros.moedas');
SELECT public.criar_policies_padrao('unidades_medida',       'cadastros.unidades-medida');
SELECT public.criar_policies_padrao('formas_pagamento',      'cadastros.formas-pagamento');
SELECT public.criar_policies_padrao('condicoes_pagamento',   'cadastros.condicoes-pagamento');
SELECT public.criar_policies_padrao('categorias',            'cadastros.categorias');
SELECT public.criar_policies_padrao('itens',                 'cadastros.itens');
SELECT public.criar_policies_padrao('fornecedores',          'cadastros.fornecedores');
SELECT public.criar_policies_padrao('categorias_fornecedor', 'cadastros.categorias-fornecedor');

-- 5.4 ESTOQUE
SELECT public.criar_policies_padrao('estoques_unidade', 'estoque.saldos');
SELECT public.criar_policies_padrao('movimentacoes',    'estoque.movimentacoes');

-- 5.5 SOLICITACOES
DROP POLICY IF EXISTS solicitacoes_select ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_insert ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_update ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_delete ON public.solicitacoes;

CREATE POLICY solicitacoes_select ON public.solicitacoes FOR SELECT TO authenticated
  USING (
    public.tem_permissao('solicitacoes.material', 'pode_ler')
    OR public.tem_permissao('solicitacoes.movel', 'pode_ler')
    OR public.tem_permissao('solicitacoes.retirada-movel', 'pode_ler')
    OR public.tem_permissao('solicitacoes.emprestimo', 'pode_ler')
    OR public.tem_permissao('solicitacoes.aprovacao-gestor', 'pode_ler')
    OR solicitado_por_usuario_id = public.meu_usuario_id()
  );

CREATE POLICY solicitacoes_insert ON public.solicitacoes FOR INSERT TO authenticated
  WITH CHECK (
    public.tem_permissao('solicitacoes.material', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.movel', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.retirada-movel', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.emprestimo', 'pode_escrever')
  );

CREATE POLICY solicitacoes_update ON public.solicitacoes FOR UPDATE TO authenticated
  USING (
    public.tem_permissao('solicitacoes.material', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.movel', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.retirada-movel', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.emprestimo', 'pode_escrever')
    OR public.tem_permissao('solicitacoes.aprovacao-gestor', 'pode_aprovar')
    OR (solicitado_por_usuario_id = public.meu_usuario_id() AND status IN ('pending','pending_designer','pending_approval'))
  )
  WITH CHECK (true);

CREATE POLICY solicitacoes_delete ON public.solicitacoes FOR DELETE TO authenticated
  USING (
    public.tem_permissao('solicitacoes.material', 'pode_excluir')
    OR public.tem_permissao('solicitacoes.movel', 'pode_excluir')
    OR public.tem_permissao('solicitacoes.retirada-movel', 'pode_excluir')
    OR public.tem_permissao('solicitacoes.emprestimo', 'pode_excluir')
  );

-- 5.6 ENTREGAS
SELECT public.criar_policies_padrao('lotes_entrega',        'entregas.lotes');
SELECT public.criar_policies_padrao('lotes_entrega_itens',  'entregas.lotes');

DROP POLICY IF EXISTS confirmacoes_entrega_select ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_insert ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_update ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_delete ON public.confirmacoes_entrega;

CREATE POLICY confirmacoes_entrega_select ON public.confirmacoes_entrega FOR SELECT TO authenticated
  USING (
    public.tem_permissao('entregas.lotes', 'pode_ler')
    OR public.tem_permissao('entregas.recepcao', 'pode_ler')
    OR public.tem_permissao('entregas.conferencia', 'pode_ler')
  );

CREATE POLICY confirmacoes_entrega_insert ON public.confirmacoes_entrega FOR INSERT TO authenticated
  WITH CHECK (
    (tipo = 'driver_delivery'    AND public.tem_permissao('entregas.lotes', 'pode_escrever'))
    OR (tipo = 'reception_receipt' AND public.tem_permissao('entregas.recepcao', 'pode_escrever'))
    OR (tipo = 'requester_confirm' AND public.tem_permissao('entregas.conferencia', 'pode_escrever'))
  );

CREATE POLICY confirmacoes_entrega_update ON public.confirmacoes_entrega FOR UPDATE TO authenticated
  USING (public.tem_permissao('entregas.lotes', 'pode_escrever')) WITH CHECK (true);

CREATE POLICY confirmacoes_entrega_delete ON public.confirmacoes_entrega FOR DELETE TO authenticated
  USING (public.tem_permissao('entregas.lotes', 'pode_excluir'));

-- 5.7 COMPRAS
SELECT public.criar_policies_padrao('solicitacoes_compra',       'compras.solicitacoes');
SELECT public.criar_policies_padrao('solicitacoes_compra_itens', 'compras.solicitacoes');
SELECT public.criar_policies_padrao('cotacoes',                 'compras.cotacoes');
SELECT public.criar_policies_padrao('cotacoes_solicitacoes',    'compras.cotacoes');
SELECT public.criar_policies_padrao('cotacoes_fornecedores',    'compras.cotacoes');
SELECT public.criar_policies_padrao('cotacoes_respostas',       'compras.cotacoes');
SELECT public.criar_policies_padrao('cotacoes_respostas_itens', 'compras.cotacoes');
SELECT public.criar_policies_padrao('pedidos_compra',                'compras.pedidos');
SELECT public.criar_policies_padrao('pedidos_compra_itens',          'compras.pedidos');
SELECT public.criar_policies_padrao('pedidos_compra_solicitacoes',   'compras.pedidos');

DROP POLICY IF EXISTS pedidos_compra_aprovacoes_select ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_insert ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_update ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_delete ON public.pedidos_compra_aprovacoes;

CREATE POLICY pedidos_compra_aprovacoes_select ON public.pedidos_compra_aprovacoes FOR SELECT TO authenticated
  USING (public.tem_permissao('compras.pedidos', 'pode_ler') OR public.tem_permissao('compras.aprovacao-diretoria', 'pode_ler'));
CREATE POLICY pedidos_compra_aprovacoes_insert ON public.pedidos_compra_aprovacoes FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao('compras.aprovacao-diretoria', 'pode_aprovar'));
CREATE POLICY pedidos_compra_aprovacoes_update ON public.pedidos_compra_aprovacoes FOR UPDATE TO authenticated
  USING (public.tem_permissao('compras.aprovacao-diretoria', 'pode_aprovar')) WITH CHECK (true);
CREATE POLICY pedidos_compra_aprovacoes_delete ON public.pedidos_compra_aprovacoes FOR DELETE TO authenticated
  USING (public.tem_permissao('compras.aprovacao-diretoria', 'pode_excluir'));

SELECT public.criar_policies_padrao('notas_fiscais',         'compras.notas-fiscais');
SELECT public.criar_policies_padrao('notas_fiscais_pedidos', 'compras.notas-fiscais');
SELECT public.criar_policies_padrao('contratos',             'compras.contratos');
SELECT public.criar_policies_padrao('recebimentos_compra',   'compras.recebimentos');

-- 5.8 AUDITORIA
DROP POLICY IF EXISTS log_atividades_select ON public.log_atividades;
DROP POLICY IF EXISTS log_atividades_insert ON public.log_atividades;
CREATE POLICY log_atividades_select ON public.log_atividades FOR SELECT TO authenticated
  USING (public.tem_permissao('auditoria.timeline', 'pode_ler'));
CREATE POLICY log_atividades_insert ON public.log_atividades FOR INSERT TO authenticated
  WITH CHECK (false);

-- 5.9 NOTIFICACOES
DROP POLICY IF EXISTS notificacoes_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_update ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_delete ON public.notificacoes;
CREATE POLICY notificacoes_select ON public.notificacoes FOR SELECT TO authenticated
  USING (usuario_id = public.meu_usuario_id() OR public.tem_permissao('auditoria.notificacoes', 'pode_ler'));
CREATE POLICY notificacoes_insert ON public.notificacoes FOR INSERT TO authenticated
  WITH CHECK (public.tem_permissao('auditoria.notificacoes', 'pode_escrever'));
CREATE POLICY notificacoes_update ON public.notificacoes FOR UPDATE TO authenticated
  USING (usuario_id = public.meu_usuario_id()) WITH CHECK (usuario_id = public.meu_usuario_id());
CREATE POLICY notificacoes_delete ON public.notificacoes FOR DELETE TO authenticated
  USING (usuario_id = public.meu_usuario_id() OR public.tem_permissao('auditoria.notificacoes', 'pode_excluir'));


-- ============================================================================
-- 6. GRANTS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT SELECT                          ON ALL TABLES    IN SCHEMA public TO anon;
GRANT ALL                             ON ALL TABLES    IN SCHEMA public TO service_role;

GRANT USAGE, SELECT                   ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                   ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL                             ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.meu_usuario_id()            TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_permissao(text, text)   TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_perfil()                TO authenticated;
GRANT EXECUTE ON FUNCTION public.eh_primeira_conta()         TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT                          ON TABLES    TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON TABLES    TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                   ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE                         ON FUNCTIONS TO anon, authenticated, service_role;


-- ============================================================================
-- 7. SINCRONIZAR usuarios <- auth.users (se tabela usuarios estiver vazia)
--    e atribuir perfil DEV ao primeiro
-- ============================================================================
INSERT INTO public.usuarios (auth_usuario_id, nome, email, ativo)
SELECT au.id,
       COALESCE(au.raw_user_meta_data->>'nome', au.email),
       au.email,
       true
  FROM auth.users au
  LEFT JOIN public.usuarios u ON u.auth_usuario_id = au.id
 WHERE u.id IS NULL;

INSERT INTO public.usuarios_perfis (usuario_id, perfil_id)
SELECT u.id, (SELECT id FROM public.perfis_acesso WHERE codigo = 'DEV')
  FROM public.usuarios u
  LEFT JOIN public.usuarios_perfis up ON up.usuario_id = u.id
 WHERE up.usuario_id IS NULL
   AND EXISTS (SELECT 1 FROM public.perfis_acesso WHERE codigo = 'DEV');


-- ============================================================================
-- 8. RELOAD DO POSTGREST
-- ============================================================================
NOTIFY pgrst, 'reload schema';
