-- Seed: Todos os grupos de acesso do sistema
-- Execute no Supabase SQL Editor (após SQL-MIGRATION-ACCESS-GROUPS-APROVACAO.sql)
-- Idempotente: pode rodar várias vezes sem duplicar

-- ============================================================
-- 1. Aprovadores Financeiros
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'aprovadores_financeiros', 'Aprovadores Financeiros', 'Aprovam pedidos de compra (3ª camada)'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'aprovadores_financeiros');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['compras.aprovacoes', 'compras.pedidos']) AS t
WHERE g.codigo = 'aprovadores_financeiros'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 2. Compradores
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'compradores', 'Compradores', 'Acesso completo ao fluxo de compras (solicitações, cotações, pedidos, fornecedores)'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'compradores');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['compras.solicitacoes', 'compras.cotacoes', 'compras.pedidos', 'compras.fornecedores']) AS t
WHERE g.codigo = 'compradores'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 3. Admin Compras
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'admin_compras', 'Admin Compras', 'Gestão de compras: gestor, diretoria, centros de custo, contratos'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'admin_compras');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['compras.gestor', 'compras.diretoria', 'compras.centros_custo', 'compras.contratos']) AS t
WHERE g.codigo = 'admin_compras'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 4. Estoque
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'estoque', 'Estoque', 'Acesso a materiais, móveis e empréstimos'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'estoque');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['estoque.materiais', 'estoque.moveis', 'estoque.emprestimos']) AS t
WHERE g.codigo = 'estoque'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 5. Almoxarifado
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'almoxarifado', 'Almoxarifado', 'Visão geral, solicitações e logística'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'almoxarifado');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['almox.visao', 'almox.solicitacoes', 'almox.logistica']) AS t
WHERE g.codigo = 'almoxarifado'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 6. Financeiro
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'financeiro', 'Financeiro', 'Visão executiva, contratos, centros de custo, alertas e relatórios'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'financeiro');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['financeiro.visao', 'financeiro.contratos', 'financeiro.centros_custo', 'financeiro.alertas', 'financeiro.relatorios']) AS t
WHERE g.codigo = 'financeiro'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 7. Solicitante
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'solicitante', 'Solicitante', 'Estoque disponível, nova solicitação, minhas solicitações e recebimentos'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'solicitante');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['solicitante.estoque', 'solicitante.nova', 'solicitante.minhas', 'solicitante.recebimentos']) AS t
WHERE g.codigo = 'solicitante'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 8. Designer
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'designer', 'Designer', 'Visão geral e projetos'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'designer');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['designer.visao', 'designer.projetos']) AS t
WHERE g.codigo = 'designer'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 9. Motorista
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'motorista', 'Motorista', 'Entregas'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'motorista');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['motorista.entregas']) AS t
WHERE g.codigo = 'motorista'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- 10. Admin Sistema
-- ============================================================
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'admin_sistema', 'Admin Sistema', 'Gestão de usuários, unidades, produtos e grupos de acesso'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'admin_sistema');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['admin.usuarios', 'admin.unidades', 'admin.produtos', 'admin.grupos_acesso']) AS t
WHERE g.codigo = 'admin_sistema'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- ============================================================
-- MEMBROS: usuários atuais nos respectivos grupos (por role)
-- ============================================================
-- Mapeamento: users.role → access_groups.codigo
-- approval_config.user_id → aprovadores_financeiros

-- Aprovadores Financeiros (tabela approval_config + role financial)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, ac.user_id
FROM access_groups g
CROSS JOIN approval_config ac
WHERE g.codigo = 'aprovadores_financeiros'
  AND ac.user_id IS NOT NULL
  AND ac.active = true
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = ac.user_id);

INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'financial'
WHERE g.codigo = 'aprovadores_financeiros'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Compradores (role = buyer)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'buyer'
WHERE g.codigo = 'compradores'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Admin Compras (role = admin)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'admin'
WHERE g.codigo = 'admin_compras'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Estoque (controller e warehouse - ambos têm acesso a estoque)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role IN ('controller', 'warehouse')
WHERE g.codigo = 'estoque'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Almoxarifado (role = warehouse, controller)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role IN ('warehouse', 'controller')
WHERE g.codigo = 'almoxarifado'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Financeiro (role = financial)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'financial'
WHERE g.codigo = 'financeiro'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Solicitante (role = requester, executor)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role IN ('requester', 'executor')
WHERE g.codigo = 'solicitante'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Designer (role = designer)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'designer'
WHERE g.codigo = 'designer'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Motorista (role = driver)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role = 'driver'
WHERE g.codigo = 'motorista'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);

-- Admin Sistema (role = admin, controller, developer)
INSERT INTO access_group_members (group_id, user_id)
SELECT g.id, u.id
FROM access_groups g
JOIN users u ON u.role IN ('admin', 'controller', 'developer')
WHERE g.codigo = 'admin_sistema'
  AND NOT EXISTS (SELECT 1 FROM access_group_members WHERE group_id = g.id AND user_id = u.id);
