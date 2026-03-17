-- Migration: Aprovação financeira do pedido (3ª camada)
-- Execute no Supabase SQL Editor
-- Alçadas: até R$ 4.999,99 → Sanches | R$ 5.000+ → Maikel

-- ============================================================
-- 1. Tabela de configuração de aprovação
-- ============================================================
CREATE TABLE IF NOT EXISTS approval_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role_name varchar(50) NOT NULL,
  user_id uuid REFERENCES auth.users(id),
  valor_limite_max numeric,
  valor_limite_min numeric DEFAULT 0,
  active boolean DEFAULT true
);

-- Índice para busca por valor
CREATE INDEX IF NOT EXISTS idx_approval_config_valor
  ON approval_config(valor_limite_min, valor_limite_max) WHERE active = true;

-- Seed inicial (substituir user_id pelos UUIDs reais dos usuários Sanches e Maikel)
INSERT INTO approval_config (role_name, user_id, valor_limite_min, valor_limite_max)
SELECT 'sanches', NULL, 0, 4999.99
WHERE NOT EXISTS (SELECT 1 FROM approval_config WHERE role_name = 'sanches');

INSERT INTO approval_config (role_name, user_id, valor_limite_min, valor_limite_max)
SELECT 'maikel', NULL, 5000, NULL
WHERE NOT EXISTS (SELECT 1 FROM approval_config WHERE role_name = 'maikel');

-- ============================================================
-- 2. Tabela de aprovações de pedido
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_order_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  aprovador_id uuid REFERENCES auth.users(id),
  acao varchar(20) NOT NULL CHECK (acao IN ('pendente', 'aprovado', 'reprovado', 'reenviado')),
  observacao text,
  valor_referencia numeric,
  versao int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_poa_pedido ON purchase_order_approvals(pedido_id);
CREATE INDEX IF NOT EXISTS idx_poa_versao ON purchase_order_approvals(pedido_id, versao);

-- ============================================================
-- 3. Colunas no purchase_orders
-- ============================================================
ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS status_aprovacao varchar(30) DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS versao int DEFAULT 1,
  ADD COLUMN IF NOT EXISTS aprovador_necessario_id uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS comprador_id uuid REFERENCES auth.users(id);

-- Constraint para status_aprovacao (só se não existir)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_po_status_aprovacao'
  ) THEN
    ALTER TABLE purchase_orders
      ADD CONSTRAINT chk_po_status_aprovacao
      CHECK (status_aprovacao IN ('pendente', 'aprovado', 'reprovado', 'em_revisao'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Índices para filtros comuns
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status_aprovacao
  ON purchase_orders(status_aprovacao);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_aprovador
  ON purchase_orders(aprovador_necessario_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_comprador
  ON purchase_orders(comprador_id);

-- ============================================================
-- 4. RLS (aprovadores e compradores veem seus pedidos)
-- ============================================================
-- Nota: Se o projeto usa service_role nas Edge Functions,
-- as policies abaixo podem ser opcionais. Descomente para uso com RLS direto.
/*
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aprovador_ver_pedidos" ON purchase_orders;
CREATE POLICY "aprovador_ver_pedidos" ON purchase_orders
  FOR SELECT TO authenticated
  USING (
    aprovador_necessario_id = auth.uid()
    OR comprador_id = auth.uid()
  );
*/
