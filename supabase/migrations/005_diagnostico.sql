SELECT jsonb_build_object(
  '1_usuarios', (
    SELECT jsonb_agg(jsonb_build_object(
      'id', u.id, 'email', u.email, 'nome', u.nome,
      'auth_usuario_id', u.auth_usuario_id, 'ativo', u.ativo
    ))
    FROM public.usuarios u
  ),
  '2_perfis', (
    SELECT jsonb_agg(jsonb_build_object(
      'codigo', codigo, 'nome', nome, 'ativo', ativo
    ))
    FROM public.perfis_acesso
  ),
  '3_vinculos_usuario_perfil', (
    SELECT jsonb_agg(jsonb_build_object(
      'email', u.email, 'perfil', p.codigo
    ))
    FROM public.usuarios_perfis up
    JOIN public.usuarios u      ON u.id = up.usuario_id
    JOIN public.perfis_acesso p ON p.id = up.perfil_id
  ),
  '4_total_rotas', (SELECT COUNT(*) FROM public.rotas_sistema),
  '5_rotas_por_perfil', (
    SELECT jsonb_agg(jsonb_build_object(
      'perfil', pa.codigo, 'qtd', cnt
    ))
    FROM (
      SELECT pa.codigo, COUNT(par.rota_id) AS cnt
        FROM public.perfis_acesso pa
        LEFT JOIN public.perfis_acesso_rotas par ON par.perfil_id = pa.id
       GROUP BY pa.codigo
    ) pa
  ),
  '6_rota_moedas', (
    SELECT jsonb_build_object(
      'id', id, 'codigo', codigo, 'caminho', caminho, 'ativo', ativo
    )
    FROM public.rotas_sistema WHERE codigo = 'cadastros.moedas'
  ),
  '7_permissoes_dev_em_moedas', (
    SELECT jsonb_build_object(
      'perfil', pa.codigo,
      'pode_ler', par.pode_ler,
      'pode_escrever', par.pode_escrever,
      'pode_excluir', par.pode_excluir,
      'pode_aprovar', par.pode_aprovar
    )
    FROM public.perfis_acesso_rotas par
    JOIN public.perfis_acesso pa ON pa.id = par.perfil_id
    JOIN public.rotas_sistema rs ON rs.id = par.rota_id
    WHERE rs.codigo = 'cadastros.moedas' AND pa.codigo = 'DEV'
  ),
  '8_policies_moedas', (
    SELECT jsonb_agg(jsonb_build_object(
      'policy', policyname, 'cmd', cmd, 'usando', qual, 'check', with_check
    ))
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'moedas'
  ),
  '9_rls_moedas_habilitada', (
    SELECT c.relrowsecurity
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'moedas'
  ),
  '10_funcoes', (
    SELECT jsonb_agg(jsonb_build_object(
      'funcao', proname, 'security_definer', prosecdef, 'settings', proconfig
    ))
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND proname IN ('meu_usuario_id', 'tem_permissao', 'meu_perfil')
  )
) AS diagnostico;
