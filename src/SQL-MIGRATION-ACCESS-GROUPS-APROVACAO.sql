-- Migration: Sistema global de grupos de acesso por aba
-- Execute no Supabase SQL Editor
-- Modelo: grupo → abas + grupo → membros (N:N)
-- Abrange TODOS os módulos do sistema (Compras, Estoque, Financeiro, Admin, etc.)

-- ============================================================
-- 0. Remover tabelas e colunas antigas (se existirem)
-- ============================================================
DROP TABLE IF EXISTS purchase_access_group_members CASCADE;
DROP TABLE IF EXISTS purchase_access_group_tabs CASCADE;
DROP TABLE IF EXISTS purchase_access_groups CASCADE;
-- allowed_purchase_tabs: removido em SQL-MIGRATION-USER-EXTRA-TABS.sql (após migrar dados)

-- ============================================================
-- 1. Grupos de acesso
-- ============================================================
CREATE TABLE IF NOT EXISTS access_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo varchar(50) NOT NULL UNIQUE,
  nome varchar(100) NOT NULL,
  descricao text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- 2. Abas do grupo (quais tabs o grupo libera)
-- ============================================================
CREATE TABLE IF NOT EXISTS access_group_tabs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  tab_id varchar(80) NOT NULL,
  CONSTRAINT uq_access_group_tab UNIQUE (group_id, tab_id)
);

CREATE INDEX IF NOT EXISTS idx_agt_group ON access_group_tabs(group_id);

-- ============================================================
-- 3. Membros do grupo
-- ============================================================
CREATE TABLE IF NOT EXISTS access_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES access_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  CONSTRAINT uq_access_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_agm_group ON access_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_agm_user ON access_group_members(user_id);

-- ============================================================
-- 4. Catálogo global de tab_ids
-- ============================================================
-- Módulo              | tab_id                           | Descrição
-- --------------------|----------------------------------|----------------------------
-- Compras (buyer)     | compras.solicitacoes             | Solicitações Aprovadas
-- Compras (buyer)     | compras.cotacoes                 | Cotações
-- Compras (buyer)     | compras.pedidos                  | Pedidos
-- Compras (buyer)     | compras.aprovacoes               | Aprovações Financeiras
-- Compras (buyer)     | compras.fornecedores             | Fornecedores
-- Compras (admin)     | compras.gestor                   | Solicitações Gestor
-- Compras (admin)     | compras.diretoria                | Aprovações Diretoria
-- Compras (admin)     | compras.centros_custo            | Centros de Custo
-- Compras (admin)     | compras.contratos                | Contratos
-- Estoque             | estoque.materiais                | Materiais
-- Estoque             | estoque.moveis                   | Móveis
-- Estoque             | estoque.emprestimos              | Empréstimos
-- Almoxarifado        | almox.solicitacoes               | Solicitações
-- Almoxarifado        | almox.logistica                  | Logística
-- Financeiro          | financeiro.contratos             | Dashboard Contratos
-- Financeiro          | financeiro.centros_custo         | Centros de Custo
-- Financeiro          | financeiro.alertas               | Alertas
-- Financeiro          | financeiro.relatorios            | Relatórios
-- Admin               | admin.usuarios                   | Gestão Usuários
-- Admin               | admin.unidades                   | Gestão Unidades
-- Admin               | admin.produtos                   | Catálogo Produtos
-- Admin               | admin.grupos_acesso              | Grupos de Acesso
-- Solicitante         | solicitante.nova                 | Nova Solicitação
-- Solicitante         | solicitante.minhas               | Minhas Solicitações
-- Solicitante         | solicitante.recebimentos         | Recebimentos
-- Designer            | designer.projetos                | Projetos
-- Motorista           | motorista.entregas               | Entregas

-- ============================================================
-- 5. Seed: grupos padrão
-- ============================================================

-- Grupo: Aprovadores Financeiros
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'aprovadores_financeiros', 'Aprovadores Financeiros', 'Aprovam pedidos de compra (3ª camada)'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'aprovadores_financeiros');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['compras.aprovacoes', 'compras.pedidos']) AS t
WHERE g.codigo = 'aprovadores_financeiros'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);

-- Grupo: Compradores
INSERT INTO access_groups (codigo, nome, descricao)
SELECT 'compradores', 'Compradores', 'Acesso completo ao fluxo de compras (solicitações, cotações, pedidos, fornecedores)'
WHERE NOT EXISTS (SELECT 1 FROM access_groups WHERE codigo = 'compradores');

INSERT INTO access_group_tabs (group_id, tab_id)
SELECT g.id, t FROM access_groups g,
  unnest(ARRAY['compras.solicitacoes', 'compras.cotacoes', 'compras.pedidos', 'compras.fornecedores']) AS t
WHERE g.codigo = 'compradores'
  AND NOT EXISTS (SELECT 1 FROM access_group_tabs WHERE group_id = g.id AND tab_id = t);
