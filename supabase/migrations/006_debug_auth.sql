CREATE OR REPLACE FUNCTION public.debug_auth() RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jwt_claims jsonb;
BEGIN
  BEGIN
    v_jwt_claims := current_setting('request.jwt.claims', true)::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_jwt_claims := NULL;
  END;

  RETURN jsonb_build_object(
    'auth_uid',           auth.uid(),
    'auth_role',          auth.role(),
    'jwt_sub',            v_jwt_claims->>'sub',
    'jwt_email',          v_jwt_claims->>'email',
    'jwt_role',           v_jwt_claims->>'role',
    'jwt_exp',            v_jwt_claims->>'exp',
    'meu_usuario_id',     public.meu_usuario_id(),
    'usuario_encontrado', (
      SELECT jsonb_build_object('id', u.id, 'email', u.email, 'nome', u.nome)
        FROM public.usuarios u WHERE u.auth_usuario_id = auth.uid()
    ),
    'tem_perm_moedas_ler',      public.tem_permissao('cadastros.moedas', 'pode_ler'),
    'tem_perm_moedas_escrever', public.tem_permissao('cadastros.moedas', 'pode_escrever')
  );
END $$;

GRANT EXECUTE ON FUNCTION public.debug_auth() TO anon, authenticated;
