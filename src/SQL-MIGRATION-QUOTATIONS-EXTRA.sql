-- Migration: Novos campos na tabela quotations
-- Execute no Supabase SQL Editor antes de usar as novas funcionalidades de cotações

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS data_previsao_entrega DATE,
  ADD COLUMN IF NOT EXISTS frete NUMERIC(15,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS desconto NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ipi NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS icms NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pis_cofins NUMERIC(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS anexos JSONB DEFAULT '[]'::jsonb;
