-- ============================================================================
-- 000_drop_all.sql
-- SupplyGo — Reset completo do banco (rodar ANTES de 001_schema_completo.sql)
-- ============================================================================
-- ATENCAO: este script apaga TUDO do schema `public`. Use apenas em DEV.
-- Nao toca em `auth.*` (Supabase Auth) nem em `storage.*` (Supabase Storage).
-- Se quiser apagar usuarios do Auth tambem, use o bloco no final (comentado).
--
-- Como rodar:
--   1) Abrir Supabase Studio (projeto dtcklkhvrsyxjjjmuquw)
--   2) SQL Editor -> New Query
--   3) Copiar e colar este arquivo inteiro
--   4) Run
--   5) Em seguida, rodar 001_schema_completo.sql
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. DROP SCHEMA public CASCADE (apaga todas as tabelas, views, funcoes,
--    triggers, sequencias, indices e tipos do schema public de uma vez)
-- ----------------------------------------------------------------------------
DROP SCHEMA IF EXISTS public CASCADE;


-- ----------------------------------------------------------------------------
-- 2. Recriar schema public limpo
-- ----------------------------------------------------------------------------
CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL   ON SCHEMA public TO postgres, service_role;

-- Permitir que roles padrao do Supabase usem objetos novos criados em public
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES    TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO postgres, service_role;


-- ----------------------------------------------------------------------------
-- 3. Verificacao: schema public deve estar vazio
-- ----------------------------------------------------------------------------
-- Rode estas queries depois para confirmar:
--   SELECT COUNT(*) FROM information_schema.tables    WHERE table_schema = 'public';   -- = 0
--   SELECT COUNT(*) FROM information_schema.views     WHERE table_schema = 'public';   -- = 0
--   SELECT COUNT(*) FROM information_schema.routines  WHERE routine_schema = 'public'; -- = 0
--   SELECT COUNT(*) FROM information_schema.sequences WHERE sequence_schema = 'public';-- = 0


-- ============================================================================
-- BLOCO OPCIONAL — apagar usuarios do Supabase Auth tambem
-- ============================================================================
-- Descomentar APENAS se quiser realmente apagar todos os usuarios cadastrados
-- no Supabase Auth (login/senha). Isso vai deslogar todo mundo e perder os
-- vinculos com auth_usuario_id.
--
-- DELETE FROM auth.users;
-- DELETE FROM auth.identities;
-- DELETE FROM auth.sessions;
-- DELETE FROM auth.refresh_tokens;
-- ============================================================================


-- ============================================================================
-- BLOCO OPCIONAL — apagar arquivos do Supabase Storage
-- ============================================================================
-- Descomentar APENAS se quiser apagar todos os arquivos enviados (fotos de
-- recebimento, anexos de cotacao, etc.).
--
-- DELETE FROM storage.objects;
-- DELETE FROM storage.buckets;
-- ============================================================================


-- ============================================================================
-- FIM
-- Agora rode 001_schema_completo.sql para criar tudo do zero.
-- ============================================================================
