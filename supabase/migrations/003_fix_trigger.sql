-- ============================================================================
-- 003_fix_trigger.sql
-- Corrige o trigger fn_handle_new_auth_user e adiciona RPC eh_primeira_conta.
-- ============================================================================
-- O trigger anterior nao qualificava os nomes de schema, fazendo o Postgres
-- procurar `usuarios` no schema `auth` (porque o trigger e disparado em
-- auth.users). Com `SET search_path` explicito + nomes qualificados, isso
-- nao acontece mais.
--
-- Tambem criamos uma funcao publica `eh_primeira_conta()` que pode ser
-- chamada pelo frontend (ate por anon, sem JWT) para saber se a tabela
-- usuarios esta vazia. Ela e SECURITY DEFINER e bypassa o RLS.
-- ============================================================================


-- ============================================================================
-- 1. Recriar trigger de cadastro com search_path fixo
-- ============================================================================

DROP TRIGGER IF EXISTS trg_handle_new_auth_user ON auth.users;
DROP FUNCTION IF EXISTS public.fn_handle_new_auth_user();

CREATE OR REPLACE FUNCTION public.fn_handle_new_auth_user() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_usuario_id   uuid;
  v_nome         text;
  v_total        int;
  v_perfil_dev   uuid;
BEGIN
  -- Extrair nome do user_metadata; fallback para email
  v_nome := COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email);

  -- Criar linha em public.usuarios
  INSERT INTO public.usuarios (auth_usuario_id, nome, email, ativo)
  VALUES (NEW.id, v_nome, NEW.email, true)
  RETURNING id INTO v_usuario_id;

  -- Verificar se e a primeira conta
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
  -- Logar erro mas nao impedir a criacao do usuario no auth.users
  -- (caso contrario o signup retorna 500 e o user ja foi criado em auth.users
  -- mas sem entrada em usuarios — situacao zumbi).
  RAISE WARNING 'fn_handle_new_auth_user falhou para %: %', NEW.id, SQLERRM;
  RETURN NEW;
END $$;

-- Anexar trigger
CREATE TRIGGER trg_handle_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_auth_user();

-- Garantir que o role que dispara o INSERT em auth.users (supabase_auth_admin)
-- pode executar a funcao. Em geral nao e necessario porque triggers herdam,
-- mas concedemos explicitamente para evitar surpresas.
GRANT EXECUTE ON FUNCTION public.fn_handle_new_auth_user() TO supabase_auth_admin;


-- ============================================================================
-- 2. RPC eh_primeira_conta()
-- ============================================================================
-- Retorna true se a tabela `usuarios` esta vazia.
-- Pode ser chamada antes do signup para o frontend saber se vai virar DEV.
-- SECURITY DEFINER + GRANT to anon permite chamar SEM autenticacao.

CREATE OR REPLACE FUNCTION public.eh_primeira_conta() RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total int;
BEGIN
  SELECT COUNT(*) INTO v_total FROM public.usuarios;
  RETURN v_total = 0;
END $$;

GRANT EXECUTE ON FUNCTION public.eh_primeira_conta() TO anon, authenticated;


-- ============================================================================
-- VALIDACAO
-- ============================================================================
-- Apos rodar, valide com:
--
--   SELECT public.eh_primeira_conta();
--   -- deve retornar true (se nao tem usuarios) ou false
--
--   -- Verificar se o trigger existe:
--   SELECT tgname FROM pg_trigger WHERE tgname = 'trg_handle_new_auth_user';
--
-- Se voce ja tinha tentado um signup que falhou, podem ter ficado linhas
-- zumbi em auth.users sem entrada em usuarios. Para limpar:
--
--   DELETE FROM auth.users
--    WHERE id NOT IN (SELECT auth_usuario_id FROM public.usuarios WHERE auth_usuario_id IS NOT NULL);
-- ============================================================================
