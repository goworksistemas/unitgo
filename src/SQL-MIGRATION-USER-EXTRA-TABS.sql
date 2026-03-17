-- Migration: Abas extras por usuário
-- Permite dar acesso direto a abas específicas além dos grupos
-- Execute após SQL-MIGRATION-ACCESS-GROUPS-APROVACAO.sql

-- ============================================================
-- 1. Tabela user_extra_tabs
-- ============================================================
CREATE TABLE IF NOT EXISTS user_extra_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tab_id varchar(80) NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_user_extra_tab UNIQUE (user_id, tab_id)
);

CREATE INDEX IF NOT EXISTS idx_user_extra_tabs_user ON user_extra_tabs(user_id);

-- ============================================================
-- 2. Migrar allowed_purchase_tabs antigos para user_extra_tabs
-- Converte perfis de acesso antigos em abas extras no novo sistema
-- ============================================================
DO $$
DECLARE
  r RECORD;
  tab_val TEXT;
  tab_id_normalized TEXT;
  old_tabs TEXT[];
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'allowed_purchase_tabs'
  ) THEN
    FOR r IN SELECT id, allowed_purchase_tabs FROM users WHERE allowed_purchase_tabs IS NOT NULL AND array_length(allowed_purchase_tabs, 1) > 0
    LOOP
      old_tabs := r.allowed_purchase_tabs;
      FOREACH tab_val IN ARRAY old_tabs
      LOOP
        tab_val := trim(both from tab_val);
        IF tab_val != '' THEN
          -- Normalizar: se não tem ponto (módulo), adiciona prefixo compras.
          IF position('.' in tab_val) = 0 THEN
            tab_id_normalized := 'compras.' || tab_val;
          ELSE
            tab_id_normalized := tab_val;
          END IF;
          INSERT INTO user_extra_tabs (user_id, tab_id)
          VALUES (r.id, tab_id_normalized)
          ON CONFLICT (user_id, tab_id) DO NOTHING;
        END IF;
      END LOOP;
    END LOOP;
  END IF;
END $$;

-- ============================================================
-- 3. Remover coluna antiga de perfis de acesso
-- ============================================================
ALTER TABLE users DROP COLUMN IF EXISTS allowed_purchase_tabs;
