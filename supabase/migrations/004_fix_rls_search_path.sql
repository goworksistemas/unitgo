-- ============================================================================
-- 004_fix_rls_search_path.sql
-- Corrige funcoes auxiliares de RLS adicionando SET search_path = public.
-- Roda inteiro de cima a baixo. Nao precisa escolher nada.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.meu_usuario_id() RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.usuarios WHERE auth_usuario_id = auth.uid() LIMIT 1
$$;


CREATE OR REPLACE FUNCTION public.tem_permissao(p_codigo_rota text, p_flag text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_rota_id    uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_usuario_id
    FROM public.usuarios
   WHERE auth_usuario_id = auth.uid();
  IF v_usuario_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT id INTO v_rota_id
    FROM public.rotas_sistema
   WHERE codigo = p_codigo_rota;
  IF v_rota_id IS NULL THEN
    RETURN false;
  END IF;

  IF EXISTS (
    SELECT 1
      FROM public.perfis_acesso_rotas par
      JOIN public.usuarios_perfis     up  ON up.perfil_id = par.perfil_id
     WHERE up.usuario_id = v_usuario_id
       AND par.rota_id   = v_rota_id
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

  IF EXISTS (
    SELECT 1
      FROM public.usuarios_rotas_extras ure
     WHERE ure.usuario_id = v_usuario_id
       AND ure.rota_id    = v_rota_id
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


CREATE OR REPLACE FUNCTION public.meu_perfil() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id uuid;
  v_resultado  jsonb;
BEGIN
  SELECT id INTO v_usuario_id
    FROM public.usuarios
   WHERE auth_usuario_id = auth.uid();

  IF v_usuario_id IS NULL THEN
    RETURN jsonb_build_object(
      'usuario', null,
      'perfis', '[]'::jsonb,
      'rotasPermitidas', '[]'::jsonb
    );
  END IF;

  SELECT jsonb_build_object(
    'usuario', to_jsonb(u.*),
    'perfis', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', p.id, 'codigo', p.codigo, 'nome', p.nome, 'descricao', p.descricao
      ))
        FROM public.perfis_acesso p
        JOIN public.usuarios_perfis up ON up.perfil_id = p.id
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
                FROM public.perfis_acesso_rotas par
                JOIN public.usuarios_perfis up ON up.perfil_id = par.perfil_id
               WHERE up.usuario_id = u.id
              UNION ALL
              SELECT ure.rota_id, ure.pode_ler, ure.pode_escrever, ure.pode_excluir, ure.pode_aprovar
                FROM public.usuarios_rotas_extras ure
               WHERE ure.usuario_id = u.id
            ) sub
           GROUP BY rota_id
        ) consolidado
        JOIN public.rotas_sistema rs ON rs.id = consolidado.rota_id
       WHERE rs.ativo = true
         AND consolidado.max_pode_ler = true
    ), '[]'::jsonb)
  )
    INTO v_resultado
    FROM public.usuarios u
   WHERE u.id = v_usuario_id;

  RETURN v_resultado;
END $$;


GRANT EXECUTE ON FUNCTION public.meu_usuario_id()          TO authenticated;
GRANT EXECUTE ON FUNCTION public.tem_permissao(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.meu_perfil()              TO authenticated;
