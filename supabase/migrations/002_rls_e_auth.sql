-- ============================================================================
-- 002_rls_e_auth.sql
-- SupplyGo — RLS, funcoes auxiliares e trigger de cadastro
-- ============================================================================
-- Roda DEPOIS de 001_schema_completo.sql.
--
-- Este script:
--  1. Cria funcoes helper (meu_usuario_id, tem_permissao, meu_perfil)
--  2. Cria trigger em auth.users que cria linha em usuarios automaticamente
--     (e atribui perfil DEV se for a primeira conta)
--  3. Habilita RLS em todas as tabelas
--  4. Cria policies SELECT/INSERT/UPDATE/DELETE para cada tabela usando
--     tem_permissao(rota_codigo, flag) com base nas rotas_sistema
--
-- Como rodar:
--   1) Abrir Supabase Studio
--   2) SQL Editor -> New Query
--   3) Colar e Run
-- ============================================================================


-- ============================================================================
-- 1. FUNCOES HELPER
-- ============================================================================

-- 1.1 meu_usuario_id() — retorna o id interno (usuarios.id) do usuario logado
CREATE OR REPLACE FUNCTION meu_usuario_id() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT id FROM usuarios WHERE auth_usuario_id = auth.uid() LIMIT 1
$$;

-- 1.2 tem_permissao(codigo_rota, flag) — checa permissao efetiva
-- flag: 'pode_ler' | 'pode_escrever' | 'pode_excluir' | 'pode_aprovar'
-- Combina perfis_acesso_rotas (via usuarios_perfis) com usuarios_rotas_extras (OR)
CREATE OR REPLACE FUNCTION tem_permissao(p_codigo_rota text, p_flag text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_usuario_id uuid;
  v_rota_id    uuid;
BEGIN
  -- Sem auth.uid() (servico/anonimo) -> nega
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_usuario_id FROM usuarios WHERE auth_usuario_id = auth.uid();
  IF v_usuario_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_rota_id FROM rotas_sistema WHERE codigo = p_codigo_rota;
  IF v_rota_id IS NULL THEN
    RETURN false;
  END IF;

  -- via perfis
  IF EXISTS (
    SELECT 1
      FROM perfis_acesso_rotas par
      JOIN usuarios_perfis up ON up.perfil_id = par.perfil_id
     WHERE up.usuario_id = v_usuario_id
       AND par.rota_id = v_rota_id
       AND CASE p_flag
             WHEN 'pode_ler'      THEN par.pode_ler
             WHEN 'pode_escrever' THEN par.pode_escrever
             WHEN 'pode_excluir'  THEN par.pode_excluir
             WHEN 'pode_aprovar'  THEN par.pode_aprovar
             ELSE false
           END = true
  ) THEN
    RETURN true;
  END IF;

  -- via rotas extras
  IF EXISTS (
    SELECT 1
      FROM usuarios_rotas_extras ure
     WHERE ure.usuario_id = v_usuario_id
       AND ure.rota_id = v_rota_id
       AND CASE p_flag
             WHEN 'pode_ler'      THEN ure.pode_ler
             WHEN 'pode_escrever' THEN ure.pode_escrever
             WHEN 'pode_excluir'  THEN ure.pode_excluir
             WHEN 'pode_aprovar'  THEN ure.pode_aprovar
             ELSE false
           END = true
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END $$;

-- 1.3 meu_perfil() — RPC chamada pelo frontend para hidratar o estado
-- Retorna { usuario, perfis, rotasPermitidas }
-- O frontend usa rotasPermitidas para montar a sidebar dinamica.
CREATE OR REPLACE FUNCTION meu_perfil() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE
  v_usuario_id uuid;
  v_resultado  jsonb;
BEGIN
  SELECT id INTO v_usuario_id FROM usuarios WHERE auth_usuario_id = auth.uid();
  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object('usuario', null, 'perfis', '[]'::jsonb, 'rotasPermitidas', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'usuario', to_jsonb(u.*),
    'perfis', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'codigo', p.codigo, 'nome', p.nome, 'descricao', p.descricao
      ))
        FROM perfis_acesso p
        JOIN usuarios_perfis up ON up.perfil_id = p.id
       WHERE up.usuario_id = u.id
    ), '[]'::jsonb),
    'rotasPermitidas', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', rs.id,
        'codigo', rs.codigo,
        'caminho', rs.caminho,
        'nome', rs.nome,
        'modulo', rs.modulo,
        'icone', rs.icone,
        'ordem', rs.ordem,
        'podeLer', max_pode_ler,
        'podeEscrever', max_pode_escrever,
        'podeExcluir', max_pode_excluir,
        'podeAprovar', max_pode_aprovar
      ) ORDER BY rs.modulo, rs.ordem)
        FROM (
          SELECT rota_id,
                 BOOL_OR(pode_ler)      AS max_pode_ler,
                 BOOL_OR(pode_escrever) AS max_pode_escrever,
                 BOOL_OR(pode_excluir)  AS max_pode_excluir,
                 BOOL_OR(pode_aprovar)  AS max_pode_aprovar
            FROM (
              SELECT par.rota_id, par.pode_ler, par.pode_escrever, par.pode_excluir, par.pode_aprovar
                FROM perfis_acesso_rotas par
                JOIN usuarios_perfis up ON up.perfil_id = par.perfil_id
               WHERE up.usuario_id = u.id
              UNION ALL
              SELECT ure.rota_id, ure.pode_ler, ure.pode_escrever, ure.pode_excluir, ure.pode_aprovar
                FROM usuarios_rotas_extras ure
               WHERE ure.usuario_id = u.id
            ) sub
           GROUP BY rota_id
        ) consolidado
        JOIN rotas_sistema rs ON rs.id = consolidado.rota_id
       WHERE rs.ativo = true
         AND consolidado.max_pode_ler = true
    ), '[]'::jsonb)
  )
    INTO v_resultado
    FROM usuarios u
   WHERE u.id = v_usuario_id;

  RETURN v_resultado;
END $$;

-- Permitir que o role 'authenticated' chame as funcoes
GRANT EXECUTE ON FUNCTION meu_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION tem_permissao(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION meu_perfil() TO authenticated;


-- ============================================================================
-- 2. TRIGGER de cadastro automatico
-- ============================================================================
-- Quando alguem se cadastra no Supabase Auth (auth.users), criamos
-- automaticamente a linha em `usuarios`. Se for a primeira conta do sistema,
-- atribuimos perfil DEV automaticamente (acesso total).
--
-- O frontend so precisa chamar:
--   await supabase.auth.signUp({ email, password, options: { data: { nome } } });
-- e o resto acontece via trigger.

CREATE OR REPLACE FUNCTION fn_handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_usuario_id   uuid;
  v_nome         text;
  v_total        int;
  v_perfil_dev   uuid;
BEGIN
  -- Extrair nome do user_metadata; se nao tiver, usar o email
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email);

  -- Criar linha em usuarios
  INSERT INTO usuarios (auth_usuario_id, nome, email, ativo)
  VALUES (NEW.id, v_nome, NEW.email, true)
  RETURNING id INTO v_usuario_id;

  -- Verificar se e a primeira conta
  SELECT COUNT(*) INTO v_total FROM usuarios;

  IF v_total = 1 THEN
    -- Atribuir perfil DEV automaticamente
    SELECT id INTO v_perfil_dev FROM perfis_acesso WHERE codigo = 'DEV';
    IF v_perfil_dev IS NOT NULL THEN
      INSERT INTO usuarios_perfis (usuario_id, perfil_id, criado_por_usuario_id)
      VALUES (v_usuario_id, v_perfil_dev, v_usuario_id);
    END IF;
  END IF;

  RETURN NEW;
END $$;

-- Anexar trigger em auth.users
DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION fn_handle_new_auth_user();


-- ============================================================================
-- 3. HABILITAR RLS em todas as tabelas do schema public
-- ============================================================================
-- Sem RLS, qualquer usuario autenticado leria/escreveria tudo via supabase-js.
-- Com RLS, todas as queries passam pelas policies abaixo.
-- Importante: NAO usar FORCE ROW LEVEL SECURITY senao o proprio dono
-- (postgres role) tambem fica restrito, e o trigger em auth.users quebra.
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;


-- ============================================================================
-- 4. HELPER PARA CRIAR POLICIES PADRAO
-- ============================================================================
-- Cria 4 policies padrao (SELECT/INSERT/UPDATE/DELETE) para uma tabela,
-- usando tem_permissao(rota_codigo, flag) para cada operacao.
CREATE OR REPLACE FUNCTION criar_policies_padrao(p_tabela text, p_codigo_rota text)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_select', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_insert', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_update', p_tabela);
  EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p_tabela || '_delete', p_tabela);

  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (tem_permissao(%L, %L))',
    p_tabela || '_select', p_tabela, p_codigo_rota, 'pode_ler'
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (tem_permissao(%L, %L))',
    p_tabela || '_insert', p_tabela, p_codigo_rota, 'pode_escrever'
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (tem_permissao(%L, %L)) WITH CHECK (tem_permissao(%L, %L))',
    p_tabela || '_update', p_tabela, p_codigo_rota, 'pode_escrever', p_codigo_rota, 'pode_escrever'
  );
  EXECUTE format(
    'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (tem_permissao(%L, %L))',
    p_tabela || '_delete', p_tabela, p_codigo_rota, 'pode_excluir'
  );
END $$;


-- ============================================================================
-- 5. POLICIES POR TABELA
-- ============================================================================

-- 5.1 ADMIN
SELECT criar_policies_padrao('unidades',           'admin.unidades');
SELECT criar_policies_padrao('departamentos',      'admin.departamentos');
SELECT criar_policies_padrao('empresas_emitentes', 'admin.empresas-emitentes');
SELECT criar_policies_padrao('alcadas_aprovacao',                'admin.alcadas-aprovacao');
SELECT criar_policies_padrao('alcadas_aprovacao_departamentos',  'admin.alcadas-aprovacao');
SELECT criar_policies_padrao('perfis_acesso',         'admin.perfis-acesso');
SELECT criar_policies_padrao('perfis_acesso_rotas',   'admin.perfis-acesso');
SELECT criar_policies_padrao('usuarios_perfis',       'admin.perfis-acesso');
SELECT criar_policies_padrao('usuarios_rotas_extras', 'admin.perfis-acesso');
SELECT criar_policies_padrao('rotas_sistema',         'admin.rotas-sistema');

-- 5.2 USUARIOS (caso especial: ler a propria linha sempre, e admin com permissao)
DROP POLICY IF EXISTS usuarios_select ON public.usuarios;
DROP POLICY IF EXISTS usuarios_insert ON public.usuarios;
DROP POLICY IF EXISTS usuarios_update ON public.usuarios;
DROP POLICY IF EXISTS usuarios_delete ON public.usuarios;

-- SELECT: ve a propria linha OU tem permissao admin.usuarios.pode_ler
CREATE POLICY usuarios_select ON public.usuarios
  FOR SELECT TO authenticated
  USING (
    auth_usuario_id = auth.uid()
    OR tem_permissao('admin.usuarios', 'pode_ler')
  );

-- INSERT: bloqueado para clientes (criacao via trigger em auth.users com SECURITY DEFINER)
-- Admin com permissao pode criar via UI tambem.
CREATE POLICY usuarios_insert ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (tem_permissao('admin.usuarios', 'pode_escrever'));

-- UPDATE: pode atualizar a propria linha (limitada) OU tem permissao admin
CREATE POLICY usuarios_update ON public.usuarios
  FOR UPDATE TO authenticated
  USING (
    auth_usuario_id = auth.uid()
    OR tem_permissao('admin.usuarios', 'pode_escrever')
  )
  WITH CHECK (
    auth_usuario_id = auth.uid()
    OR tem_permissao('admin.usuarios', 'pode_escrever')
  );

-- DELETE: apenas via permissao admin
CREATE POLICY usuarios_delete ON public.usuarios
  FOR DELETE TO authenticated
  USING (tem_permissao('admin.usuarios', 'pode_excluir'));


-- 5.3 CADASTROS
SELECT criar_policies_padrao('moedas',                'cadastros.moedas');
SELECT criar_policies_padrao('unidades_medida',       'cadastros.unidades-medida');
SELECT criar_policies_padrao('formas_pagamento',      'cadastros.formas-pagamento');
SELECT criar_policies_padrao('condicoes_pagamento',   'cadastros.condicoes-pagamento');
SELECT criar_policies_padrao('categorias',            'cadastros.categorias');
SELECT criar_policies_padrao('itens',                 'cadastros.itens');
SELECT criar_policies_padrao('fornecedores',          'cadastros.fornecedores');
SELECT criar_policies_padrao('categorias_fornecedor', 'cadastros.categorias-fornecedor');


-- 5.4 ESTOQUE
SELECT criar_policies_padrao('estoques_unidade', 'estoque.saldos');
SELECT criar_policies_padrao('movimentacoes',    'estoque.movimentacoes');


-- 5.5 SOLICITACOES OPERACIONAIS
-- Tabela unica `solicitacoes` com tipos: material/furniture_to_unit/furniture_removal/loan
-- Cada tipo mapeia para uma rota especifica para SELECT por tipo. Mas para
-- simplificar agora: usar permissao geral em qualquer das 4 rotas para SELECT.
DROP POLICY IF EXISTS solicitacoes_select ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_insert ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_update ON public.solicitacoes;
DROP POLICY IF EXISTS solicitacoes_delete ON public.solicitacoes;

CREATE POLICY solicitacoes_select ON public.solicitacoes
  FOR SELECT TO authenticated
  USING (
    tem_permissao('solicitacoes.material', 'pode_ler')
    OR tem_permissao('solicitacoes.movel', 'pode_ler')
    OR tem_permissao('solicitacoes.retirada-movel', 'pode_ler')
    OR tem_permissao('solicitacoes.emprestimo', 'pode_ler')
    OR tem_permissao('solicitacoes.aprovacao-gestor', 'pode_ler')
    OR solicitado_por_usuario_id = meu_usuario_id()
  );

-- INSERT: usuario com permissao em pelo menos uma das rotas de solicitacao
CREATE POLICY solicitacoes_insert ON public.solicitacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    tem_permissao('solicitacoes.material', 'pode_escrever')
    OR tem_permissao('solicitacoes.movel', 'pode_escrever')
    OR tem_permissao('solicitacoes.retirada-movel', 'pode_escrever')
    OR tem_permissao('solicitacoes.emprestimo', 'pode_escrever')
  );

-- UPDATE: o solicitante pode editar a propria enquanto pendente,
-- ou usuario com permissao de aprovacao_gestor ou da rota especifica
CREATE POLICY solicitacoes_update ON public.solicitacoes
  FOR UPDATE TO authenticated
  USING (
    tem_permissao('solicitacoes.material', 'pode_escrever')
    OR tem_permissao('solicitacoes.movel', 'pode_escrever')
    OR tem_permissao('solicitacoes.retirada-movel', 'pode_escrever')
    OR tem_permissao('solicitacoes.emprestimo', 'pode_escrever')
    OR tem_permissao('solicitacoes.aprovacao-gestor', 'pode_aprovar')
    OR (solicitado_por_usuario_id = meu_usuario_id() AND status IN ('pending','pending_designer','pending_approval'))
  )
  WITH CHECK (true);

CREATE POLICY solicitacoes_delete ON public.solicitacoes
  FOR DELETE TO authenticated
  USING (
    tem_permissao('solicitacoes.material', 'pode_excluir')
    OR tem_permissao('solicitacoes.movel', 'pode_excluir')
    OR tem_permissao('solicitacoes.retirada-movel', 'pode_excluir')
    OR tem_permissao('solicitacoes.emprestimo', 'pode_excluir')
  );


-- 5.6 ENTREGAS
SELECT criar_policies_padrao('lotes_entrega',        'entregas.lotes');
SELECT criar_policies_padrao('lotes_entrega_itens',  'entregas.lotes');

-- confirmacoes_entrega: 3 tipos diferentes (driver/reception/requester)
-- mapeiam para rotas distintas. Simplificacao: qualquer das 3 permite SELECT.
DROP POLICY IF EXISTS confirmacoes_entrega_select ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_insert ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_update ON public.confirmacoes_entrega;
DROP POLICY IF EXISTS confirmacoes_entrega_delete ON public.confirmacoes_entrega;

CREATE POLICY confirmacoes_entrega_select ON public.confirmacoes_entrega
  FOR SELECT TO authenticated
  USING (
    tem_permissao('entregas.lotes', 'pode_ler')
    OR tem_permissao('entregas.recepcao', 'pode_ler')
    OR tem_permissao('entregas.conferencia', 'pode_ler')
  );

CREATE POLICY confirmacoes_entrega_insert ON public.confirmacoes_entrega
  FOR INSERT TO authenticated
  WITH CHECK (
    (tipo = 'driver_delivery'    AND tem_permissao('entregas.lotes', 'pode_escrever'))
    OR (tipo = 'reception_receipt' AND tem_permissao('entregas.recepcao', 'pode_escrever'))
    OR (tipo = 'requester_confirm' AND tem_permissao('entregas.conferencia', 'pode_escrever'))
  );

CREATE POLICY confirmacoes_entrega_update ON public.confirmacoes_entrega
  FOR UPDATE TO authenticated
  USING (tem_permissao('entregas.lotes', 'pode_escrever'))
  WITH CHECK (true);

CREATE POLICY confirmacoes_entrega_delete ON public.confirmacoes_entrega
  FOR DELETE TO authenticated
  USING (tem_permissao('entregas.lotes', 'pode_excluir'));


-- 5.7 COMPRAS — Solicitacoes de compra
SELECT criar_policies_padrao('solicitacoes_compra',       'compras.solicitacoes');
SELECT criar_policies_padrao('solicitacoes_compra_itens', 'compras.solicitacoes');

-- 5.8 COMPRAS — Cotacoes
SELECT criar_policies_padrao('cotacoes',                 'compras.cotacoes');
SELECT criar_policies_padrao('cotacoes_solicitacoes',    'compras.cotacoes');
SELECT criar_policies_padrao('cotacoes_fornecedores',    'compras.cotacoes');
SELECT criar_policies_padrao('cotacoes_respostas',       'compras.cotacoes');
SELECT criar_policies_padrao('cotacoes_respostas_itens', 'compras.cotacoes');

-- 5.9 COMPRAS — Pedidos
SELECT criar_policies_padrao('pedidos_compra',                'compras.pedidos');
SELECT criar_policies_padrao('pedidos_compra_itens',          'compras.pedidos');
SELECT criar_policies_padrao('pedidos_compra_solicitacoes',   'compras.pedidos');

-- pedidos_compra_aprovacoes: SELECT por permissao em pedidos OU aprovacao-diretoria
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_select ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_insert ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_update ON public.pedidos_compra_aprovacoes;
DROP POLICY IF EXISTS pedidos_compra_aprovacoes_delete ON public.pedidos_compra_aprovacoes;

CREATE POLICY pedidos_compra_aprovacoes_select ON public.pedidos_compra_aprovacoes
  FOR SELECT TO authenticated
  USING (
    tem_permissao('compras.pedidos', 'pode_ler')
    OR tem_permissao('compras.aprovacao-diretoria', 'pode_ler')
  );

CREATE POLICY pedidos_compra_aprovacoes_insert ON public.pedidos_compra_aprovacoes
  FOR INSERT TO authenticated
  WITH CHECK (tem_permissao('compras.aprovacao-diretoria', 'pode_aprovar'));

CREATE POLICY pedidos_compra_aprovacoes_update ON public.pedidos_compra_aprovacoes
  FOR UPDATE TO authenticated
  USING (tem_permissao('compras.aprovacao-diretoria', 'pode_aprovar'))
  WITH CHECK (true);

CREATE POLICY pedidos_compra_aprovacoes_delete ON public.pedidos_compra_aprovacoes
  FOR DELETE TO authenticated
  USING (tem_permissao('compras.aprovacao-diretoria', 'pode_excluir'));

-- 5.10 COMPRAS — NF / Contratos / Recebimentos
SELECT criar_policies_padrao('notas_fiscais',         'compras.notas-fiscais');
SELECT criar_policies_padrao('notas_fiscais_pedidos', 'compras.notas-fiscais');
SELECT criar_policies_padrao('contratos',             'compras.contratos');
SELECT criar_policies_padrao('recebimentos_compra',   'compras.recebimentos');


-- 5.11 AUDITORIA — log_atividades (append-only, escrita via trigger SECURITY DEFINER)
DROP POLICY IF EXISTS log_atividades_select ON public.log_atividades;
DROP POLICY IF EXISTS log_atividades_insert ON public.log_atividades;
DROP POLICY IF EXISTS log_atividades_update ON public.log_atividades;
DROP POLICY IF EXISTS log_atividades_delete ON public.log_atividades;

-- SELECT: precisa permissao de auditoria.timeline
CREATE POLICY log_atividades_select ON public.log_atividades
  FOR SELECT TO authenticated
  USING (tem_permissao('auditoria.timeline', 'pode_ler'));

-- INSERT/UPDATE/DELETE: bloqueado para clientes (so triggers SECURITY DEFINER escrevem)
CREATE POLICY log_atividades_insert ON public.log_atividades
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- (sem policy de UPDATE/DELETE: append-only — qualquer tentativa eh negada)


-- 5.12 NOTIFICACOES — usuario so ve as proprias
DROP POLICY IF EXISTS notificacoes_select ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_insert ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_update ON public.notificacoes;
DROP POLICY IF EXISTS notificacoes_delete ON public.notificacoes;

CREATE POLICY notificacoes_select ON public.notificacoes
  FOR SELECT TO authenticated
  USING (
    usuario_id = meu_usuario_id()
    OR tem_permissao('auditoria.notificacoes', 'pode_ler')
  );

-- INSERT: backend cria via trigger; UI nao cria diretamente (mas permitido com permissao)
CREATE POLICY notificacoes_insert ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (tem_permissao('auditoria.notificacoes', 'pode_escrever'));

-- UPDATE: usuario marca a propria como lida/arquivada
CREATE POLICY notificacoes_update ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (usuario_id = meu_usuario_id())
  WITH CHECK (usuario_id = meu_usuario_id());

CREATE POLICY notificacoes_delete ON public.notificacoes
  FOR DELETE TO authenticated
  USING (
    usuario_id = meu_usuario_id()
    OR tem_permissao('auditoria.notificacoes', 'pode_excluir')
  );


-- ============================================================================
-- 6. VERIFICACAO
-- ============================================================================
-- Apos rodar este script, valide com:
--   SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';
--     -- esperado: ~150 policies (38 tabelas x 4 + algumas customizadas)
--
--   SELECT tablename FROM pg_tables WHERE schemaname='public'
--     AND rowsecurity = false;
--     -- esperado: 0 linhas (todas com RLS habilitado)


-- ============================================================================
-- FIM
-- Como o frontend chama meu_perfil():
--
--   const { data, error } = await supabase.rpc('meu_perfil');
--   // data: { usuario, perfis, rotasPermitidas }
--
-- Como o frontend cria conta (primeira conta vira DEV automaticamente):
--
--   await supabase.auth.signUp({
--     email,
--     password,
--     options: { data: { nome: 'Fulano' } },
--   });
-- ============================================================================
