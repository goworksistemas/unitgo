SELECT jsonb_build_object(
  'role_atual', current_user,
  'database', current_database(),
  'search_path_global', current_setting('search_path'),

  '01_schema_public_existe', (
    SELECT to_jsonb(n) FROM (
      SELECT nspname, nspowner::regrole::text AS owner
        FROM pg_namespace WHERE nspname = 'public'
    ) n
  ),

  '02_grants_no_schema_public', (
    SELECT jsonb_agg(jsonb_build_object('grantee', grantee, 'privilege', privilege_type))
      FROM information_schema.usage_privileges
     WHERE object_schema = 'public' AND object_type = 'SCHEMA'
  ),

  '03_total_tabelas_public', (
    SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public'
  ),

  '04_tabelas_e_rls', (
    SELECT jsonb_agg(jsonb_build_object(
      'tabela', c.relname,
      'rls_enabled', c.relrowsecurity,
      'owner', c.relowner::regrole::text
    ) ORDER BY c.relname)
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
  ),

  '05_grants_em_moedas', (
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee, 'privilege', privilege_type, 'grantor', grantor
    ))
      FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = 'moedas'
  ),

  '06_grants_em_usuarios', (
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee, 'privilege', privilege_type
    ))
      FROM information_schema.role_table_grants
     WHERE table_schema = 'public' AND table_name = 'usuarios'
  ),

  '07_default_privileges_no_public', (
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', acl.grantee::regrole::text,
      'object_type', CASE acl.objtype
                       WHEN 'r' THEN 'TABLE'
                       WHEN 'S' THEN 'SEQUENCE'
                       WHEN 'f' THEN 'FUNCTION'
                       WHEN 'T' THEN 'TYPE'
                       WHEN 'n' THEN 'SCHEMA'
                       ELSE acl.objtype::text
                     END,
      'priv', acl.privilege_type
    ))
      FROM (
        SELECT (aclexplode(defaclacl)).grantee AS grantee,
               (aclexplode(defaclacl)).privilege_type AS privilege_type,
               defaclobjtype AS objtype
          FROM pg_default_acl da
          JOIN pg_namespace n ON n.oid = da.defaclnamespace
         WHERE n.nspname = 'public'
      ) acl
  ),

  '08_policies_em_moedas', (
    SELECT jsonb_agg(jsonb_build_object(
      'policy', policyname, 'cmd', cmd, 'roles', roles,
      'qual', qual, 'with_check', with_check, 'permissive', permissive
    ))
      FROM pg_policies WHERE schemaname = 'public' AND tablename = 'moedas'
  ),

  '09_total_policies_public', (
    SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public'
  ),

  '10_funcoes_helpers', (
    SELECT jsonb_agg(jsonb_build_object(
      'funcao', p.proname,
      'lang', l.lanname,
      'volatility', p.provolatile,
      'security_definer', p.prosecdef,
      'settings', p.proconfig,
      'owner', p.proowner::regrole::text
    ))
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l  ON l.oid = p.prolang
     WHERE n.nspname = 'public'
       AND p.proname IN ('meu_usuario_id','tem_permissao','meu_perfil','fn_handle_new_auth_user','eh_primeira_conta','debug_auth')
  ),

  '11_grants_funcoes_helpers', (
    SELECT jsonb_agg(jsonb_build_object(
      'funcao', routine_name, 'grantee', grantee, 'privilege', privilege_type
    ))
      FROM information_schema.routine_privileges
     WHERE routine_schema = 'public'
       AND routine_name IN ('meu_usuario_id','tem_permissao','meu_perfil','fn_handle_new_auth_user','eh_primeira_conta','debug_auth')
  ),

  '12_usuarios', (
    SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'email', email, 'auth_uid', auth_usuario_id, 'ativo', ativo
    ))
      FROM public.usuarios
  ),

  '13_perfis_e_qtd_rotas', (
    SELECT jsonb_agg(jsonb_build_object(
      'codigo', pa.codigo, 'ativo', pa.ativo, 'qtd_rotas', cnt
    ))
      FROM (
        SELECT pa.id, pa.codigo, pa.ativo, COUNT(par.rota_id) AS cnt
          FROM public.perfis_acesso pa
          LEFT JOIN public.perfis_acesso_rotas par ON par.perfil_id = pa.id
         GROUP BY pa.id, pa.codigo, pa.ativo
      ) pa
  ),

  '14_vinculos_usuario_perfil', (
    SELECT jsonb_agg(jsonb_build_object('email', u.email, 'perfil', p.codigo))
      FROM public.usuarios_perfis up
      JOIN public.usuarios u      ON u.id = up.usuario_id
      JOIN public.perfis_acesso p ON p.id = up.perfil_id
  ),

  '15_total_rotas', (SELECT COUNT(*) FROM public.rotas_sistema),

  '16_dev_em_moedas', (
    SELECT to_jsonb(x) FROM (
      SELECT pa.codigo AS perfil, par.pode_ler, par.pode_escrever, par.pode_excluir, par.pode_aprovar
        FROM public.perfis_acesso_rotas par
        JOIN public.perfis_acesso pa ON pa.id = par.perfil_id
        JOIN public.rotas_sistema rs ON rs.id = par.rota_id
       WHERE rs.codigo = 'cadastros.moedas' AND pa.codigo = 'DEV'
    ) x
  ),

  '17_auth_users_count', (SELECT COUNT(*) FROM auth.users),

  '18_postgrest_publish_check', (
    SELECT to_jsonb(s) FROM (
      SELECT name, setting FROM pg_settings WHERE name = 'pgrst.db_schemas'
    ) s
  ),

  '19_table_acl_raw_moedas', (
    SELECT to_jsonb(c) FROM (
      SELECT relname, relacl::text
        FROM pg_class
       WHERE relname = 'moedas' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
    ) c
  ),

  '20_table_acl_raw_usuarios', (
    SELECT to_jsonb(c) FROM (
      SELECT relname, relacl::text
        FROM pg_class
       WHERE relname = 'usuarios' AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname='public')
    ) c
  )
) AS visao_global;
