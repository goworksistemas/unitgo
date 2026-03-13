-- =====================================================================
-- MOCK DATA - MÓDULO SISTEMA DE COMPRAS
-- =====================================================================
-- Execute após o SQL-MODULO-COMPRAS.sql
-- IDs são gerados automaticamente pelo banco
-- =====================================================================

-- UUIDs fictícios para solicitante_id, unidade_id e responsavel_id
-- (referenciam auth.users ou units - substitua pelos IDs reais do seu ambiente)
-- solicitante: a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d
-- unidade:     b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e
-- responsavel: c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f

-- =====================================================================
-- 1. CATEGORIAS DE FORNECEDOR
-- =====================================================================
INSERT INTO supplier_categories (nome, descricao, status)
SELECT 'Material de Escritório', 'Fornecedores de papelaria e material de escritório', 'active'
WHERE NOT EXISTS (SELECT 1 FROM supplier_categories WHERE nome = 'Material de Escritório');
INSERT INTO supplier_categories (nome, descricao, status)
SELECT 'Tecnologia', 'Equipamentos de TI, eletrônicos e periféricos', 'active'
WHERE NOT EXISTS (SELECT 1 FROM supplier_categories WHERE nome = 'Tecnologia');
INSERT INTO supplier_categories (nome, descricao, status)
SELECT 'Limpeza', 'Produtos e equipamentos de limpeza', 'active'
WHERE NOT EXISTS (SELECT 1 FROM supplier_categories WHERE nome = 'Limpeza');
INSERT INTO supplier_categories (nome, descricao, status)
SELECT 'Mobiliário', 'Móveis e equipamentos para escritório', 'active'
WHERE NOT EXISTS (SELECT 1 FROM supplier_categories WHERE nome = 'Mobiliário');
INSERT INTO supplier_categories (nome, descricao, status)
SELECT 'Serviços', 'Prestadores de serviços gerais', 'active'
WHERE NOT EXISTS (SELECT 1 FROM supplier_categories WHERE nome = 'Serviços');

-- =====================================================================
-- 2. FORNECEDORES
-- =====================================================================
INSERT INTO suppliers (razao_social, cnpj, contato, email, telefone, categoria_id, endereco, dados_bancarios, status)
SELECT
  'Papelaria Central Ltda',
  '12.345.678/0001-90',
  'João Silva',
  'vendas@papelariacentral.com.br',
  '(11) 3333-4444',
  (SELECT id FROM supplier_categories WHERE nome = 'Material de Escritório' LIMIT 1),
  'Rua das Flores, 100 - São Paulo/SP',
  '{"banco":"Itaú","agencia":"1234","conta":"56789-0","pix":"12.345.678/0001-90"}'::jsonb,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE cnpj = '12.345.678/0001-90');

INSERT INTO suppliers (razao_social, cnpj, contato, email, telefone, categoria_id, endereco, dados_bancarios, status)
SELECT
  'Tech Solutions S.A.',
  '98.765.432/0001-10',
  'Maria Santos',
  'compras@techsolutions.com.br',
  '(11) 5555-6666',
  (SELECT id FROM supplier_categories WHERE nome = 'Tecnologia' LIMIT 1),
  'Av. Paulista, 1000 - São Paulo/SP',
  '{"banco":"Bradesco","agencia":"5678","conta":"12345-6","pix":"compras@techsolutions.com.br"}'::jsonb,
  'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE cnpj = '98.765.432/0001-10');

INSERT INTO suppliers (razao_social, cnpj, contato, email, telefone, categoria_id, endereco, status)
SELECT
  'Limpeza Pro Ltda',
  '11.222.333/0001-44',
  'Pedro Oliveira',
  'contato@limpezapro.com.br',
  '(11) 7777-8888',
  (SELECT id FROM supplier_categories WHERE nome = 'Limpeza' LIMIT 1),
  'Rua Augusta, 500 - São Paulo/SP',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE cnpj = '11.222.333/0001-44');

INSERT INTO suppliers (razao_social, cnpj, contato, email, telefone, categoria_id, endereco, status)
SELECT
  'Móveis Corporativos S.A.',
  '55.666.777/0001-88',
  'Ana Costa',
  'vendas@moveiscorp.com.br',
  '(11) 9999-0000',
  (SELECT id FROM supplier_categories WHERE nome = 'Mobiliário' LIMIT 1),
  'Av. Faria Lima, 2000 - São Paulo/SP',
  'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE cnpj = '55.666.777/0001-88');

-- =====================================================================
-- 3. CENTROS DE CUSTO
-- =====================================================================
INSERT INTO cost_centers (codigo, nome, descricao, status) VALUES
  ('CC-001', 'Administrativo', 'Centro de custo para despesas administrativas', 'active'),
  ('CC-002', 'Operações', 'Centro de custo para operações gerais', 'active'),
  ('CC-003', 'TI', 'Centro de custo para tecnologia da informação', 'active'),
  ('CC-004', 'Infraestrutura', 'Centro de custo para manutenção e infraestrutura', 'active')
ON CONFLICT (codigo) DO NOTHING;

-- =====================================================================
-- 4. CONTRATOS
-- =====================================================================
INSERT INTO contracts (numero, nome, cnpj_cliente, valor_total, valor_consumido, data_inicio, data_fim, centro_custo_id, status)
SELECT
  'CT-2025-001',
  'Contrato Manutenção Predial',
  '12.345.678/0001-99',
  150000.00,
  25000.00,
  '2025-01-01',
  '2025-12-31',
  (SELECT id FROM cost_centers WHERE codigo = 'CC-004' LIMIT 1),
  'active'
WHERE NOT EXISTS (SELECT 1 FROM contracts WHERE numero = 'CT-2025-001');

INSERT INTO contracts (numero, nome, cnpj_cliente, valor_total, valor_consumido, data_inicio, data_fim, centro_custo_id, status)
SELECT
  'CT-2025-002',
  'Contrato Material de Escritório',
  '12.345.678/0001-99',
  80000.00,
  0,
  '2025-01-01',
  '2025-12-31',
  (SELECT id FROM cost_centers WHERE codigo = 'CC-001' LIMIT 1),
  'active'
WHERE NOT EXISTS (SELECT 1 FROM contracts WHERE numero = 'CT-2025-002');

-- =====================================================================
-- 5. SOLICITAÇÕES DE COMPRA
-- =====================================================================
INSERT INTO purchase_requests (solicitante_id, unidade_id, centro_custo_id, cnpj_solicitante, contrato_id, justificativa, status, itens, aprovacoes)
SELECT
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  (SELECT id FROM cost_centers WHERE codigo = 'CC-001' LIMIT 1),
  '12.345.678/0001-99',
  (SELECT id FROM contracts WHERE numero = 'CT-2025-002' LIMIT 1),
  'Necessário repor material de escritório para a equipe da unidade Paulista. Papel A4, canetas e grampeadores em falta.',
  'completed',
  '[
    {"id":"item-1","solicitacaoId":"","descricao":"Papel A4 75g 500 folhas","quantidade":50,"unidadeMedida":"resma","observacao":"Branco"},
    {"id":"item-2","solicitacaoId":"","descricao":"Caneta esferográfica azul","quantidade":100,"unidadeMedida":"un","observacao":""},
    {"id":"item-3","solicitacaoId":"","descricao":"Grampeador pequeno","quantidade":10,"unidadeMedida":"un","observacao":""}
  ]'::jsonb,
  '[
    {"id":"aprov-1","userId":"m1","userName":"Gerente Comercial","role":"manager","action":"approved","justificativa":"Aprovado conforme necessidade","timestamp":"2025-02-15T10:00:00Z"},
    {"id":"aprov-2","userId":"d1","userName":"Diretor Financeiro","role":"director","action":"approved","justificativa":"Dentro do orçamento","timestamp":"2025-02-16T14:30:00Z"}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM purchase_requests WHERE justificativa LIKE 'Necessário repor material de escritório%' LIMIT 1);

INSERT INTO purchase_requests (solicitante_id, unidade_id, centro_custo_id, justificativa, status, itens, aprovacoes)
SELECT
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  (SELECT id FROM cost_centers WHERE codigo = 'CC-003' LIMIT 1),
  'Aquisição de notebooks para novos colaboradores do time de TI. Total de 5 unidades necessárias para onboarding.',
  'in_quotation',
  '[
    {"id":"item-4","solicitacaoId":"","descricao":"Notebook 15 polegadas 16GB RAM","quantidade":5,"unidadeMedida":"un","observacao":"SSD 512GB mínimo"}
  ]'::jsonb,
  '[
    {"id":"aprov-3","userId":"m1","userName":"Gerente TI","role":"manager","action":"approved","timestamp":"2025-03-01T09:00:00Z"},
    {"id":"aprov-4","userId":"d1","userName":"Diretor","role":"director","action":"approved","timestamp":"2025-03-02T11:00:00Z"}
  ]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM purchase_requests WHERE justificativa LIKE 'Aquisição de notebooks%' LIMIT 1);

INSERT INTO purchase_requests (solicitante_id, unidade_id, centro_custo_id, justificativa, status, itens, aprovacoes)
SELECT
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e',
  (SELECT id FROM cost_centers WHERE codigo = 'CC-004' LIMIT 1),
  'Produtos de limpeza para manutenção mensal das áreas comuns. Detergente, álcool e panos de limpeza.',
  'pending_manager',
  '[
    {"id":"item-5","solicitacaoId":"","descricao":"Detergente neutro 5L","quantidade":20,"unidadeMedida":"un","observacao":""},
    {"id":"item-6","solicitacaoId":"","descricao":"Álcool 70% 1L","quantidade":30,"unidadeMedida":"un","observacao":""},
    {"id":"item-7","solicitacaoId":"","descricao":"Pano de limpeza microfibra","quantidade":50,"unidadeMedida":"un","observacao":""}
  ]'::jsonb,
  '[]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM purchase_requests WHERE justificativa LIKE 'Produtos de limpeza para manutenção%' LIMIT 1);

-- =====================================================================
-- 6. COTAÇÕES (vinculadas à 1ª solicitação - completed)
-- =====================================================================
INSERT INTO quotations (solicitacao_id, fornecedor_id, moeda_id, forma_pagamento, condicoes_pagamento, prazo_entrega, observacoes, status, itens, enviado_em, respondido_em)
SELECT
  (SELECT id FROM purchase_requests WHERE status = 'completed' ORDER BY created_at LIMIT 1),
  (SELECT id FROM suppliers WHERE cnpj = '12.345.678/0001-90' LIMIT 1),
  (SELECT id FROM currencies WHERE codigo = 'BRL' LIMIT 1),
  'Boleto',
  '30 dias',
  5,
  'Entrega na recepção',
  'approved',
  '[
    {"id":"qitem-1","cotacaoId":"","itemSolicitacaoId":"item-1","descricao":"Papel A4 75g 500 folhas","quantidade":50,"unidadeMedida":"resma","precoUnitario":18.90,"valorTotal":945.00},
    {"id":"qitem-2","cotacaoId":"","itemSolicitacaoId":"item-2","descricao":"Caneta esferográfica azul","quantidade":100,"unidadeMedida":"un","precoUnitario":1.50,"valorTotal":150.00},
    {"id":"qitem-3","cotacaoId":"","itemSolicitacaoId":"item-3","descricao":"Grampeador pequeno","quantidade":10,"unidadeMedida":"un","precoUnitario":12.00,"valorTotal":120.00}
  ]'::jsonb,
  '2025-02-20T09:00:00Z'::timestamptz,
  '2025-02-21T14:00:00Z'::timestamptz
WHERE EXISTS (SELECT 1 FROM purchase_requests WHERE status = 'completed' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM quotations q JOIN purchase_requests pr ON q.solicitacao_id = pr.id WHERE pr.status = 'completed' LIMIT 1);

-- =====================================================================
-- 7. PEDIDOS DE COMPRA (vinculados à cotação aprovada)
-- =====================================================================
INSERT INTO purchase_orders (cotacao_id, numero_omie, valor_total, status, notas_fiscais, observacoes)
SELECT
  (SELECT q.id FROM quotations q WHERE q.status = 'approved' ORDER BY q.created_at LIMIT 1),
  'PC-2025-001',
  1215.00,
  'fully_received',
  '[
    {"numero":"123456","valor":1215.00,"dataEmissao":"2025-02-25","chaveAcesso":"35250212345678000199550010001234561123456789"}
  ]'::jsonb,
  'Entrega realizada conforme combinado'
WHERE EXISTS (SELECT 1 FROM quotations WHERE status = 'approved' LIMIT 1)
  AND NOT EXISTS (SELECT 1 FROM purchase_orders WHERE numero_omie = 'PC-2025-001');

-- =====================================================================
-- 8. RECEBIMENTOS (vinculados ao pedido)
-- =====================================================================
INSERT INTO receivings (pedido_id, item_id, quantidade_esperada, quantidade_recebida, responsavel_id, local_entrega, status, observacoes)
SELECT
  (SELECT id FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1),
  'item-1',
  50,
  50,
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'Recepção - Paulista 302',
  'fully_received',
  'Papel A4 recebido integralmente'
WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1);

INSERT INTO receivings (pedido_id, item_id, quantidade_esperada, quantidade_recebida, responsavel_id, local_entrega, status)
SELECT
  (SELECT id FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1),
  'item-2',
  100,
  100,
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'Recepção - Paulista 302',
  'fully_received'
WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1);

INSERT INTO receivings (pedido_id, item_id, quantidade_esperada, quantidade_recebida, responsavel_id, local_entrega, status)
SELECT
  (SELECT id FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1),
  'item-3',
  10,
  10,
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'Recepção - Paulista 302',
  'fully_received'
WHERE EXISTS (SELECT 1 FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1);

-- =====================================================================
-- 9. LOGS DE AUDITORIA
-- =====================================================================
INSERT INTO purchase_audit_logs (type, action, user_id, user_name, user_role, entity_id, details)
SELECT
  'purchase_request',
  'created',
  'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d',
  'Solicitante Mock',
  'requester',
  (SELECT id FROM purchase_requests WHERE status = 'completed' ORDER BY created_at LIMIT 1),
  '{"justificativa":"Solicitação de material de escritório"}'::jsonb;

INSERT INTO purchase_audit_logs (type, action, user_id, user_name, user_role, entity_id, details)
SELECT
  'quotation',
  'approved',
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'Comprador Mock',
  'controller',
  (SELECT id FROM quotations WHERE status = 'approved' ORDER BY created_at LIMIT 1),
  '{"valor_total":1215.00}'::jsonb;

INSERT INTO purchase_audit_logs (type, action, user_id, user_name, user_role, entity_id, details)
SELECT
  'purchase_order',
  'received',
  'c3d4e5f6-a7b8-6c7d-0e1f-2a3b4c5d6e7f',
  'Almoxarife Mock',
  'warehouse',
  (SELECT id FROM purchase_orders WHERE numero_omie = 'PC-2025-001' LIMIT 1),
  '{"status":"fully_received"}'::jsonb;

-- =====================================================================
-- PRONTO! Dados mock inseridos ✅
-- =====================================================================
-- Resumo:
--   • 5 categorias de fornecedor
--   • 4 fornecedores
--   • 4 centros de custo
--   • 2 contratos
--   • 3 solicitações de compra (pending_manager, in_quotation, completed)
--   • 1 cotação aprovada
--   • 1 pedido de compra totalmente recebido
--   • 3 recebimentos (itens do pedido)
--   • 3 logs de auditoria
--
-- IMPORTANTE: Os UUIDs solicitante_id, unidade_id e responsavel_id são fictícios.
-- Substitua por IDs reais de auth.users e units do seu projeto.
-- =====================================================================
