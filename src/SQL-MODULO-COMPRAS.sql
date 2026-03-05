-- =====================================================================
-- MÓDULO SISTEMA DE COMPRAS - SQL COMPLETO
-- =====================================================================
-- Acesse: Supabase Dashboard > SQL Editor > New Query
-- Cole este código completo e clique em "Run"
-- =====================================================================


-- =====================================================================
-- 1. CATEGORIAS DE FORNECEDOR
-- =====================================================================
CREATE TABLE IF NOT EXISTS supplier_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  CONSTRAINT chk_supplier_cat_status CHECK (status IN ('active', 'inactive'))
);


-- =====================================================================
-- 2. FORNECEDORES
-- =====================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social TEXT NOT NULL,
  cnpj TEXT NOT NULL,
  contato TEXT,
  email TEXT,
  telefone TEXT,
  categoria_id UUID REFERENCES supplier_categories(id) ON DELETE SET NULL,
  endereco TEXT,
  dados_bancarios JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_supplier_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT uq_supplier_cnpj UNIQUE (cnpj)
);

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
CREATE INDEX IF NOT EXISTS idx_suppliers_categoria ON suppliers(categoria_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_cnpj ON suppliers(cnpj);


-- =====================================================================
-- 3. CENTROS DE CUSTO
-- =====================================================================
CREATE TABLE IF NOT EXISTS cost_centers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  status TEXT NOT NULL DEFAULT 'active',

  CONSTRAINT chk_cost_center_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT uq_cost_center_codigo UNIQUE (codigo)
);

CREATE INDEX IF NOT EXISTS idx_cost_centers_status ON cost_centers(status);


-- =====================================================================
-- 4. CONTRATOS
-- =====================================================================
CREATE TABLE IF NOT EXISTS contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero TEXT NOT NULL,
  nome TEXT NOT NULL,
  cnpj_cliente TEXT,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  valor_consumido NUMERIC(15,2) NOT NULL DEFAULT 0,
  saldo NUMERIC(15,2) GENERATED ALWAYS AS (valor_total - valor_consumido) STORED,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  centro_custo_id UUID REFERENCES cost_centers(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_contract_status CHECK (status IN ('active', 'encerrado', 'suspenso')),
  CONSTRAINT chk_contract_valor CHECK (valor_total >= 0),
  CONSTRAINT chk_contract_consumido CHECK (valor_consumido >= 0),
  CONSTRAINT chk_contract_datas CHECK (data_fim >= data_inicio),
  CONSTRAINT uq_contract_numero UNIQUE (numero)
);

CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_centro_custo ON contracts(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_contracts_data_fim ON contracts(data_fim);


-- =====================================================================
-- 5. MOEDAS
-- =====================================================================
CREATE TABLE IF NOT EXISTS currencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,
  simbolo TEXT NOT NULL,
  nome TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',

  CONSTRAINT chk_currency_status CHECK (status IN ('active', 'inactive')),
  CONSTRAINT uq_currency_codigo UNIQUE (codigo)
);

-- Inserir moedas padrão
INSERT INTO currencies (codigo, simbolo, nome, status) VALUES
  ('BRL', 'R$', 'Real Brasileiro', 'active'),
  ('USD', '$', 'Dólar Americano', 'active'),
  ('EUR', '€', 'Euro', 'active')
ON CONFLICT (codigo) DO NOTHING;


-- =====================================================================
-- 6. SOLICITAÇÕES DE COMPRA
-- =====================================================================
CREATE TABLE IF NOT EXISTS purchase_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitante_id UUID NOT NULL,
  unidade_id UUID NOT NULL,
  centro_custo_id UUID NOT NULL REFERENCES cost_centers(id),
  cnpj_solicitante TEXT,
  contrato_id UUID REFERENCES contracts(id) ON DELETE SET NULL,
  justificativa TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_manager',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  aprovacoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_pr_status CHECK (status IN (
    'pending_manager',
    'approved_manager',
    'rejected_manager',
    'pending_director',
    'approved_director',
    'rejected_director',
    'in_quotation',
    'quotation_completed',
    'in_purchase',
    'completed'
  )),
  CONSTRAINT chk_pr_justificativa_min CHECK (char_length(justificativa) >= 10)
);

CREATE INDEX IF NOT EXISTS idx_purchase_requests_status ON purchase_requests(status);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_solicitante ON purchase_requests(solicitante_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_unidade ON purchase_requests(unidade_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_centro_custo ON purchase_requests(centro_custo_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_contrato ON purchase_requests(contrato_id);
CREATE INDEX IF NOT EXISTS idx_purchase_requests_created_at ON purchase_requests(created_at DESC);


-- =====================================================================
-- 7. COTAÇÕES
-- =====================================================================
CREATE TABLE IF NOT EXISTS quotations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id UUID NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
  fornecedor_id UUID NOT NULL REFERENCES suppliers(id),
  moeda_id UUID REFERENCES currencies(id),
  forma_pagamento TEXT,
  condicoes_pagamento TEXT,
  prazo_entrega INTEGER,
  observacoes TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  itens JSONB NOT NULL DEFAULT '[]'::jsonb,
  link_preenchimento TEXT,
  enviado_em TIMESTAMP WITH TIME ZONE,
  respondido_em TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_quotation_status CHECK (status IN (
    'draft', 'sent', 'responded', 'approved', 'rejected'
  )),
  CONSTRAINT chk_quotation_prazo CHECK (prazo_entrega IS NULL OR prazo_entrega >= 0)
);

CREATE INDEX IF NOT EXISTS idx_quotations_solicitacao ON quotations(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_quotations_fornecedor ON quotations(fornecedor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotations_link ON quotations(link_preenchimento);


-- =====================================================================
-- 8. PEDIDOS DE COMPRA
-- =====================================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id UUID NOT NULL REFERENCES quotations(id),
  numero_omie TEXT,
  valor_total NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  notas_fiscais JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_po_status CHECK (status IN (
    'created',
    'awaiting_nf',
    'nf_issued',
    'in_transit',
    'partially_received',
    'fully_received'
  )),
  CONSTRAINT chk_po_valor CHECK (valor_total >= 0)
);

CREATE INDEX IF NOT EXISTS idx_purchase_orders_cotacao ON purchase_orders(cotacao_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_numero_omie ON purchase_orders(numero_omie);


-- =====================================================================
-- 9. RECEBIMENTOS
-- =====================================================================
CREATE TABLE IF NOT EXISTS receivings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES purchase_orders(id),
  item_id TEXT NOT NULL,
  quantidade_esperada NUMERIC(10,2) NOT NULL,
  quantidade_recebida NUMERIC(10,2) NOT NULL DEFAULT 0,
  responsavel_id UUID NOT NULL,
  data_recebimento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  local_entrega TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT chk_receiving_status CHECK (status IN (
    'pending', 'partially_received', 'fully_received'
  )),
  CONSTRAINT chk_receiving_qtd_esperada CHECK (quantidade_esperada > 0),
  CONSTRAINT chk_receiving_qtd_recebida CHECK (quantidade_recebida >= 0),
  CONSTRAINT chk_receiving_qtd_max CHECK (quantidade_recebida <= quantidade_esperada)
);

CREATE INDEX IF NOT EXISTS idx_receivings_pedido ON receivings(pedido_id);
CREATE INDEX IF NOT EXISTS idx_receivings_status ON receivings(status);
CREATE INDEX IF NOT EXISTS idx_receivings_responsavel ON receivings(responsavel_id);


-- =====================================================================
-- 10. LOGS DE AUDITORIA (COMPRAS)
-- =====================================================================
CREATE TABLE IF NOT EXISTS purchase_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  type TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID NOT NULL,
  user_name TEXT NOT NULL,
  user_role TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_purchase_audit_timestamp ON purchase_audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_purchase_audit_type ON purchase_audit_logs(type);
CREATE INDEX IF NOT EXISTS idx_purchase_audit_user ON purchase_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_audit_entity ON purchase_audit_logs(entity_id);


-- =====================================================================
-- 11. FUNÇÃO: Atualizar updated_at automaticamente
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers de updated_at
CREATE OR REPLACE TRIGGER trg_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_purchase_requests_updated_at
  BEFORE UPDATE ON purchase_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_quotations_updated_at
  BEFORE UPDATE ON quotations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER trg_purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- =====================================================================
-- 12. FUNÇÃO: Recalcular saldo do contrato ao vincular NF
-- =====================================================================
CREATE OR REPLACE FUNCTION recalculate_contract_consumed()
RETURNS TRIGGER AS $$
DECLARE
  v_contrato_id UUID;
  v_total NUMERIC(15,2);
BEGIN
  -- Buscar contrato vinculado à solicitação do pedido
  SELECT pr.contrato_id INTO v_contrato_id
  FROM purchase_orders po
  JOIN quotations q ON q.id = po.cotacao_id
  JOIN purchase_requests pr ON pr.id = q.solicitacao_id
  WHERE po.id = NEW.pedido_id
  AND pr.contrato_id IS NOT NULL;

  IF v_contrato_id IS NOT NULL THEN
    -- Somar valores das NFs de todos os pedidos vinculados ao contrato
    SELECT COALESCE(SUM((nf->>'valor')::NUMERIC), 0) INTO v_total
    FROM purchase_orders po
    JOIN quotations q ON q.id = po.cotacao_id
    JOIN purchase_requests pr ON pr.id = q.solicitacao_id,
    LATERAL jsonb_array_elements(po.notas_fiscais) AS nf
    WHERE pr.contrato_id = v_contrato_id;

    UPDATE contracts
    SET valor_consumido = v_total
    WHERE id = v_contrato_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_recalc_contract_on_receiving
  AFTER INSERT OR UPDATE ON receivings
  FOR EACH ROW EXECUTE FUNCTION recalculate_contract_consumed();


-- =====================================================================
-- 13. RLS (Row Level Security) — Habilitar para todas as tabelas
-- =====================================================================
ALTER TABLE supplier_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_centers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE currencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE receivings ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_audit_logs ENABLE ROW LEVEL SECURITY;

-- Política permissiva para service_role (Edge Functions usam service_role)
CREATE POLICY "service_role_all" ON supplier_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON cost_centers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON contracts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON currencies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON purchase_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON quotations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON purchase_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON receivings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON purchase_audit_logs FOR ALL USING (true) WITH CHECK (true);


-- =====================================================================
-- PRONTO! Todas as tabelas do módulo de compras criadas ✅
-- =====================================================================
-- Tabelas criadas:
--   ✅ supplier_categories    (Categorias de fornecedor)
--   ✅ suppliers               (Fornecedores)
--   ✅ cost_centers            (Centros de custo)
--   ✅ contracts               (Contratos)
--   ✅ currencies              (Moedas - com dados padrão BRL/USD/EUR)
--   ✅ purchase_requests       (Solicitações de compra)
--   ✅ quotations              (Cotações)
--   ✅ purchase_orders         (Pedidos de compra)
--   ✅ receivings              (Recebimentos)
--   ✅ purchase_audit_logs     (Logs de auditoria)
--
-- Triggers criados:
--   ✅ updated_at automático em suppliers, contracts, purchase_requests,
--      quotations, purchase_orders
--   ✅ Recálculo automático do valor_consumido do contrato ao registrar
--      recebimento
--
-- Observações:
--   • O campo "saldo" em contracts é GENERATED ALWAYS (calculado automaticamente)
--   • itens e aprovacoes em purchase_requests são JSONB (arrays de objetos)
--   • notas_fiscais em purchase_orders é JSONB (array de objetos)
--   • dados_bancarios em suppliers é JSONB (objeto)
-- =====================================================================
