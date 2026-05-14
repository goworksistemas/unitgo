-- ============================================================================
-- 001_schema_completo.sql
-- SupplyGo — Schema completo do banco de dados (Fase 1)
-- ============================================================================
-- Objetivo: criar do zero o schema do SupplyGo em um único script.
-- ATENCAO: este script faz DROP SCHEMA public CASCADE. Tudo que existir hoje
--          em public sera apagado. Sistema nao esta em producao, apenas dev.
--
-- Como rodar:
--   1) Abrir Supabase Studio (projeto dtcklkhvrsyxjjjmuquw)
--   2) SQL Editor -> New Query
--   3) Copiar e colar este arquivo inteiro
--   4) Run
--
-- Convencoes:
--   - Tabelas e colunas em pt-br snake_case sem acento
--   - Valores de status/tipo/acao em ingles via CHECK constraint
--   - Datas com sufixo `_em`; booleanos com prefixo `eh_`
--   - FKs no padrao `<entidade>_id`
--   - Toda tabela tem `id uuid PK DEFAULT gen_random_uuid()` e `criado_em`
--   - Tabelas mutaveis tambem tem `atualizado_em`
-- ============================================================================


-- ============================================================================
-- 1. RESET DO SCHEMA
-- ============================================================================
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;


-- ============================================================================
-- 2. EXTENSOES
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================================
-- 3. TABELAS — NIVEL 0 (sem dependencias)
-- ============================================================================

-- 3.1 moedas
CREATE TABLE moedas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  simbolo       text NOT NULL,
  nome          text NOT NULL,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.2 empresas_emitentes (4 CNPJs Gowork)
CREATE TABLE empresas_emitentes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social    text NOT NULL,
  nome_fantasia   text,
  cnpj            text NOT NULL UNIQUE,
  ativo           boolean NOT NULL DEFAULT true,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  atualizado_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_empresas_cnpj_formato CHECK (cnpj ~ '^[0-9]{14}$')
);

-- 3.3 departamentos
CREATE TABLE departamentos (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome                        text NOT NULL,
  descricao                   text,
  responsavel_usuario_id      uuid,  -- FK adicionada apos criar usuarios
  ativo                       boolean NOT NULL DEFAULT true,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now()
);

-- 3.4 unidades_medida
CREATE TABLE unidades_medida (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  nome          text NOT NULL,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.5 formas_pagamento
CREATE TABLE formas_pagamento (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  nome          text NOT NULL,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.6 condicoes_pagamento
CREATE TABLE condicoes_pagamento (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  nome          text NOT NULL,
  descricao     text,
  dias          int,  -- 0 = a vista; null = parcelado
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.7 categorias (de itens)
CREATE TABLE categorias (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.8 categorias_fornecedor
CREATE TABLE categorias_fornecedor (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL UNIQUE,
  descricao     text,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now()
);

-- 3.9 perfis_acesso
CREATE TABLE perfis_acesso (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        text NOT NULL UNIQUE,
  nome          text NOT NULL,
  descricao     text,
  eh_protegido  boolean NOT NULL DEFAULT false,  -- true = nao pode ser excluido
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

-- 3.10 rotas_sistema
CREATE TABLE rotas_sistema (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  caminho       text NOT NULL UNIQUE,
  codigo        text NOT NULL UNIQUE,
  nome          text NOT NULL,
  descricao     text,
  modulo        text,
  icone         text,
  ordem         int NOT NULL DEFAULT 0,
  eh_publica    boolean NOT NULL DEFAULT false,
  ativo         boolean NOT NULL DEFAULT true,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);


-- ============================================================================
-- 4. TABELAS — NIVEL 1 (Identidade & Catalogo)
-- ============================================================================

-- 4.1 unidades (predios/escritorios da Gowork)
CREATE TABLE unidades (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome          text NOT NULL,
  endereco      text,
  andares       jsonb NOT NULL DEFAULT '[]'::jsonb,
  status        text NOT NULL DEFAULT 'active',
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_unidades_status CHECK (status IN ('active', 'inactive'))
);

-- 4.2 fornecedores
CREATE TABLE fornecedores (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  razao_social                text NOT NULL,
  nome_fantasia               text,
  cnpj                        text UNIQUE,
  cpf                         text UNIQUE,
  inscricao_estadual          text,
  categoria_id                uuid REFERENCES categorias_fornecedor(id),
  contato_nome                text,
  contato_email               text,
  contato_telefone            text,
  contato_whatsapp            text,
  endereco                    jsonb NOT NULL DEFAULT '{}'::jsonb,
  dados_bancarios             jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_pedidos               int NOT NULL DEFAULT 0,
  valor_total_comprado        numeric(15,2) NOT NULL DEFAULT 0,
  ultima_compra_em            timestamptz,
  nota_avaliacao              numeric(3,2),
  status                      text NOT NULL DEFAULT 'active',
  observacoes                 text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_fornecedores_status CHECK (status IN ('active','inactive','blocked')),
  CONSTRAINT chk_fornecedores_documento CHECK (cnpj IS NOT NULL OR cpf IS NOT NULL),
  CONSTRAINT chk_fornecedores_cnpj_formato CHECK (cnpj IS NULL OR cnpj ~ '^[0-9]{14}$'),
  CONSTRAINT chk_fornecedores_cpf_formato CHECK (cpf IS NULL OR cpf ~ '^[0-9]{11}$')
);

-- 4.3 usuarios (vinculado ao Supabase Auth)
CREATE TABLE usuarios (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_usuario_id             uuid UNIQUE,  -- FK para auth.users
  nome                        text NOT NULL,
  email                       text NOT NULL UNIQUE,
  cargo                       text,
  unidades_ids                uuid[] NOT NULL DEFAULT '{}',
  departamento_id             uuid REFERENCES departamentos(id),
  codigo_diario               text,
  codigo_diario_gerado_em     timestamptz,
  exige_troca_senha           boolean NOT NULL DEFAULT false,
  ativo                       boolean NOT NULL DEFAULT true,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now()
);

-- agora podemos adicionar a FK em departamentos.responsavel_usuario_id
ALTER TABLE departamentos
  ADD CONSTRAINT fk_departamentos_responsavel
  FOREIGN KEY (responsavel_usuario_id) REFERENCES usuarios(id);

-- 4.4 itens (catalogo unificado: produto + movel via eh_movel)
CREATE TABLE itens (
  id                            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_codigo                int UNIQUE,
  categoria_id                  uuid REFERENCES categorias(id),
  nome                          text NOT NULL,
  descricao                     text,
  marca                         text,
  modelo                        text,
  unidade_medida_id             uuid REFERENCES unidades_medida(id),
  url_imagem                    text,
  eh_movel                      boolean NOT NULL DEFAULT false,
  eh_consumivel                 boolean NOT NULL DEFAULT false,
  permite_emprestimo            boolean NOT NULL DEFAULT false,
  exige_termo_responsabilidade  boolean NOT NULL DEFAULT false,
  dias_emprestimo_padrao        int,
  quantidade_minima_padrao      numeric(15,3) NOT NULL DEFAULT 0,
  preco_referencia              numeric(15,2),
  fornecedor_preferencial_id    uuid REFERENCES fornecedores(id),
  ativo                         boolean NOT NULL DEFAULT true,
  criado_em                     timestamptz NOT NULL DEFAULT now(),
  atualizado_em                 timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_itens_consumivel_movel CHECK (NOT (eh_movel AND eh_consumivel))
);


-- ============================================================================
-- 5. TABELAS — NIVEL 2 (Estoque + Solicitacoes + Contratos)
-- ============================================================================

-- 5.1 estoques_unidade (saldo por par item x unidade)
CREATE TABLE estoques_unidade (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id             uuid NOT NULL REFERENCES itens(id),
  unidade_id          uuid NOT NULL REFERENCES unidades(id),
  quantidade          numeric(15,3) NOT NULL DEFAULT 0,
  quantidade_minima   numeric(15,3) NOT NULL DEFAULT 0,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_estoques_unidade UNIQUE (item_id, unidade_id),
  CONSTRAINT chk_estoques_qtd_nao_negativa CHECK (quantidade >= 0)
);

-- 5.2 solicitacoes (operacionais: material, movel_to_unit, movel_removal, loan)
CREATE TABLE solicitacoes (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                          text UNIQUE,
  tipo                            text NOT NULL,
  status                          text NOT NULL,
  item_id                         uuid NOT NULL REFERENCES itens(id),
  quantidade                      numeric(15,3) NOT NULL,
  unidade_solicitante_id          uuid NOT NULL REFERENCES unidades(id),
  solicitado_por_usuario_id       uuid NOT NULL REFERENCES usuarios(id),
  andar_destino                   text,
  localizacao_detalhe             text,
  justificativa                   text,
  urgencia                        text NOT NULL DEFAULT 'medium',
  aprovado_por_usuario_id         uuid REFERENCES usuarios(id),
  aprovado_em                     timestamptz,
  designer_usuario_id             uuid REFERENCES usuarios(id),
  designer_decidido_em            timestamptz,
  decisao_descarte                text,
  justificativa_descarte          text,
  emprestimo_devolucao_prevista   timestamptz,
  tomador_usuario_id              uuid REFERENCES usuarios(id),
  controlador_aprovador_id        uuid REFERENCES usuarios(id),
  motivo_rejeicao                 text,
  rejeitado_por_usuario_id        uuid REFERENCES usuarios(id),
  rejeitado_em                    timestamptz,
  codigo_qr                       text,
  separado_por_usuario_id         uuid REFERENCES usuarios(id),
  separado_em                     timestamptz,
  pronto_retirada_em              timestamptz,
  retirado_por_usuario_id         uuid REFERENCES usuarios(id),
  retirado_em                     timestamptz,
  entregue_em                     timestamptz,
  concluido_em                    timestamptz,
  cancelado_em                    timestamptz,
  observacoes                     text,
  criado_em                       timestamptz NOT NULL DEFAULT now(),
  atualizado_em                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_solicitacoes_tipo CHECK (tipo IN ('material','furniture_to_unit','furniture_removal','loan')),
  CONSTRAINT chk_solicitacoes_urgencia CHECK (urgencia IN ('low','medium','high')),
  CONSTRAINT chk_solicitacoes_decisao_descarte CHECK (
    decisao_descarte IS NULL OR decisao_descarte IN ('storage','disposal')
  ),
  CONSTRAINT chk_solicitacoes_status CHECK (
    (tipo = 'material' AND status IN (
      'pending','approved','awaiting_pickup','out_for_delivery',
      'delivery_confirmed','received_confirmed','completed','rejected','cancelled'
    )) OR
    (tipo = 'furniture_to_unit' AND status IN (
      'pending_designer','approved_designer','approved_storage','separated',
      'awaiting_delivery','in_transit','pending_confirmation','completed','rejected','cancelled'
    )) OR
    (tipo = 'furniture_removal' AND status IN (
      'pending_designer','approved_storage','approved_disposal',
      'awaiting_pickup','in_transit','completed','rejected','cancelled'
    )) OR
    (tipo = 'loan' AND status IN (
      'pending_approval','approved','awaiting_pickup','active',
      'returned','overdue','rejected','cancelled'
    ))
  )
);

-- 5.3 contratos (com fornecedor, debita saldo automaticamente)
CREATE TABLE contratos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero              text NOT NULL UNIQUE,
  nome                text NOT NULL,
  fornecedor_id       uuid NOT NULL REFERENCES fornecedores(id),
  empresa_emitente_id uuid NOT NULL REFERENCES empresas_emitentes(id),
  departamento_id     uuid REFERENCES departamentos(id),
  valor_total         numeric(15,2) NOT NULL,
  valor_consumido     numeric(15,2) NOT NULL DEFAULT 0,
  saldo               numeric(15,2) GENERATED ALWAYS AS (valor_total - valor_consumido) STORED,
  data_inicio         date NOT NULL,
  data_fim            date NOT NULL,
  status              text NOT NULL DEFAULT 'active',
  url_contrato_pdf    text,
  observacoes         text,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  atualizado_em       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_contratos_status CHECK (status IN ('active','concluded','suspended','cancelled')),
  CONSTRAINT chk_contratos_datas CHECK (data_fim >= data_inicio),
  CONSTRAINT chk_contratos_consumido CHECK (valor_consumido >= 0 AND valor_consumido <= valor_total)
);

-- 5.4 solicitacoes_compra (separada das operacionais)
CREATE TABLE solicitacoes_compra (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                      text UNIQUE,
  solicitante_id              uuid NOT NULL REFERENCES usuarios(id),
  unidade_id                  uuid REFERENCES unidades(id),
  departamento_id             uuid REFERENCES departamentos(id),
  empresa_emitente_id         uuid REFERENCES empresas_emitentes(id),
  contrato_id                 uuid REFERENCES contratos(id),
  fornecedor_sugerido_id      uuid REFERENCES fornecedores(id),
  link_referencia             text,
  justificativa               text NOT NULL,
  urgencia                    text NOT NULL DEFAULT 'medium',
  status                      text NOT NULL DEFAULT 'pending_manager',
  aprovador_gestor_id         uuid REFERENCES usuarios(id),
  gestor_aprovado_em          timestamptz,
  gestor_aprovado_por_id      uuid REFERENCES usuarios(id),
  gestor_motivo_rejeicao      text,
  comprador_id                uuid REFERENCES usuarios(id),
  atribuido_em                timestamptz,
  anexos                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  cancelado_em                timestamptz,
  motivo_cancelamento         text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_sol_compra_urgencia CHECK (urgencia IN ('low','medium','high')),
  CONSTRAINT chk_sol_compra_status CHECK (status IN (
    'pending_manager','approved_manager','rejected_manager',
    'in_quotation','quotation_completed',
    'pending_director','in_purchase','completed','cancelled'
  ))
);

-- 5.5 solicitacoes_compra_itens
CREATE TABLE solicitacoes_compra_itens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  solicitacao_id      uuid NOT NULL REFERENCES solicitacoes_compra(id) ON DELETE CASCADE,
  item_id             uuid REFERENCES itens(id),
  descricao           text NOT NULL,
  codigo              text,
  quantidade          numeric(15,3) NOT NULL,
  unidade_medida_id   uuid REFERENCES unidades_medida(id),
  conta_contabil      text,
  data_necessidade    date,
  prioridade          text NOT NULL DEFAULT 'normal',
  observacao          text,
  ordem               int NOT NULL DEFAULT 0,
  CONSTRAINT chk_sol_compra_itens_prioridade CHECK (prioridade IN ('normal','emergencial'))
);


-- ============================================================================
-- 6. TABELAS — NIVEL 3 (Cotacoes)
-- ============================================================================

-- 6.1 cotacoes
CREATE TABLE cotacoes (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                      text UNIQUE,
  comprador_id                uuid NOT NULL REFERENCES usuarios(id),
  data_limite_resposta        timestamptz,
  observacoes_fornecedor      text,
  local_entrega_unidade_id    uuid REFERENCES unidades(id),
  link_preenchimento          text,
  enviar_email_fornecedor     boolean NOT NULL DEFAULT true,
  copiar_solicitante_email    boolean NOT NULL DEFAULT false,
  status                      text NOT NULL DEFAULT 'draft',
  fornecedor_vencedor_id      uuid REFERENCES fornecedores(id),
  finalizada_em               timestamptz,
  finalizada_por_id           uuid REFERENCES usuarios(id),
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cotacoes_status CHECK (status IN (
    'draft','sent','partially_responded','fully_responded','finalized','cancelled'
  ))
);

-- 6.2 cotacoes_solicitacoes (N:N - quais solicitacoes estao na cotacao)
CREATE TABLE cotacoes_solicitacoes (
  cotacao_id        uuid NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  solicitacao_id    uuid NOT NULL REFERENCES solicitacoes_compra(id),
  PRIMARY KEY (cotacao_id, solicitacao_id)
);

-- 6.3 cotacoes_fornecedores (fornecedores convidados)
CREATE TABLE cotacoes_fornecedores (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id          uuid NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  fornecedor_id       uuid NOT NULL REFERENCES fornecedores(id),
  email_enviado_em    timestamptz,
  link_token          text UNIQUE,
  CONSTRAINT uq_cotacoes_fornecedores UNIQUE (cotacao_id, fornecedor_id)
);

-- 6.4 cotacoes_respostas (resposta de cada fornecedor)
CREATE TABLE cotacoes_respostas (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cotacao_id                  uuid NOT NULL REFERENCES cotacoes(id) ON DELETE CASCADE,
  cotacao_fornecedor_id       uuid NOT NULL REFERENCES cotacoes_fornecedores(id),
  fornecedor_id               uuid NOT NULL REFERENCES fornecedores(id),
  moeda_id                    uuid REFERENCES moedas(id),
  forma_pagamento_id          uuid REFERENCES formas_pagamento(id),
  condicoes_pagamento_id      uuid REFERENCES condicoes_pagamento(id),
  prazo_entrega_dias          int,
  data_previsao_entrega       date,
  valor_subtotal              numeric(15,2),
  valor_frete                 numeric(15,2) NOT NULL DEFAULT 0,
  valor_desconto              numeric(15,2) NOT NULL DEFAULT 0,
  percentual_ipi              numeric(5,2) NOT NULL DEFAULT 0,
  percentual_icms             numeric(5,2) NOT NULL DEFAULT 0,
  percentual_pis_cofins       numeric(5,2) NOT NULL DEFAULT 0,
  valor_total                 numeric(15,2),
  status                      text NOT NULL DEFAULT 'pending',
  respondido_em               timestamptz,
  observacoes_fornecedor      text,
  anexos                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cot_resp_status CHECK (status IN ('pending','responded','declined','expired'))
);

-- 6.5 cotacoes_respostas_itens (preco por item na resposta)
CREATE TABLE cotacoes_respostas_itens (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id                 uuid NOT NULL REFERENCES cotacoes_respostas(id) ON DELETE CASCADE,
  solicitacao_compra_item_id  uuid NOT NULL REFERENCES solicitacoes_compra_itens(id),
  preco_unitario              numeric(15,4),
  quantidade                  numeric(15,3),
  total_item                  numeric(15,2),
  observacoes                 text,
  CONSTRAINT uq_cot_resp_itens UNIQUE (resposta_id, solicitacao_compra_item_id)
);


-- ============================================================================
-- 7. TABELAS — NIVEL 3 (Pedidos de Compra + Alcadas + NF + Recebimentos)
-- ============================================================================

-- 7.1 pedidos_compra
CREATE TABLE pedidos_compra (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                      text UNIQUE,
  cotacao_id                  uuid REFERENCES cotacoes(id),
  fornecedor_id               uuid NOT NULL REFERENCES fornecedores(id),
  empresa_emitente_id         uuid NOT NULL REFERENCES empresas_emitentes(id),
  comprador_id                uuid NOT NULL REFERENCES usuarios(id),
  solicitante_principal_id    uuid REFERENCES usuarios(id),
  contrato_id                 uuid REFERENCES contratos(id),
  local_entrega_unidade_id    uuid REFERENCES unidades(id),
  passa_pelo_estoque          boolean NOT NULL DEFAULT true,
  contato_fornecedor_nome     text,
  contato_fornecedor_email    text,
  moeda_id                    uuid REFERENCES moedas(id),
  forma_pagamento_id          uuid REFERENCES formas_pagamento(id),
  condicoes_pagamento_id      uuid REFERENCES condicoes_pagamento(id),
  valor_subtotal              numeric(15,2),
  valor_frete                 numeric(15,2) NOT NULL DEFAULT 0,
  valor_desconto              numeric(15,2) NOT NULL DEFAULT 0,
  valor_impostos              numeric(15,2) NOT NULL DEFAULT 0,
  valor_total                 numeric(15,2) NOT NULL,
  status                      text NOT NULL DEFAULT 'pending_approval',
  status_aprovacao            text NOT NULL DEFAULT 'pendente',
  versao_aprovacao            int NOT NULL DEFAULT 1,
  aprovador_alcada_id         uuid REFERENCES usuarios(id),
  enviado_fornecedor_em       timestamptz,
  data_previsao_entrega       date,
  cancelado_em                timestamptz,
  motivo_cancelamento         text,
  observacoes                 text,
  anexos                      jsonb NOT NULL DEFAULT '[]'::jsonb,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_pedidos_status CHECK (status IN (
    'draft','pending_approval','approved','rejected','sent_to_supplier',
    'awaiting_nf','nf_issued','in_transit','partially_received','fully_received',
    'completed','cancelled'
  )),
  CONSTRAINT chk_pedidos_status_aprovacao CHECK (
    status_aprovacao IN ('pendente','aprovado','reprovado','em_revisao')
  )
);

-- 7.2 pedidos_compra_itens
CREATE TABLE pedidos_compra_itens (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id                   uuid NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  solicitacao_compra_item_id  uuid REFERENCES solicitacoes_compra_itens(id),
  item_id                     uuid REFERENCES itens(id),
  descricao                   text NOT NULL,
  codigo                      text,
  quantidade                  numeric(15,3) NOT NULL,
  preco_unitario              numeric(15,4) NOT NULL,
  valor_total                 numeric(15,2) NOT NULL,
  unidade_medida_id           uuid REFERENCES unidades_medida(id),
  ordem                       int NOT NULL DEFAULT 0
);

-- 7.3 pedidos_compra_solicitacoes (N:N - 1 pedido pode atender N solicitacoes)
CREATE TABLE pedidos_compra_solicitacoes (
  pedido_id           uuid NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  solicitacao_id      uuid NOT NULL REFERENCES solicitacoes_compra(id),
  PRIMARY KEY (pedido_id, solicitacao_id)
);

-- 7.4 pedidos_compra_aprovacoes (historico versionado)
CREATE TABLE pedidos_compra_aprovacoes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id           uuid NOT NULL REFERENCES pedidos_compra(id) ON DELETE CASCADE,
  versao              int NOT NULL,
  aprovador_id        uuid REFERENCES usuarios(id),
  acao                text NOT NULL,
  observacao          text,
  valor_referencia    numeric(15,2),
  criado_em           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_aprovacoes_acao CHECK (acao IN ('pendente','aprovado','reprovado','reenviado'))
);

-- 7.5 alcadas_aprovacao (faixa de valor + departamento opcional)
CREATE TABLE alcadas_aprovacao (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo                      text NOT NULL,
  usuario_id                  uuid REFERENCES usuarios(id),
  perfil_aprovador            text,
  valor_limite_min            numeric(15,2) NOT NULL DEFAULT 0,
  valor_limite_max            numeric(15,2),
  ativo                       boolean NOT NULL DEFAULT true,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_alcadas_escopo CHECK (escopo IN ('pedido','requisicao')),
  CONSTRAINT chk_alcadas_aprovador CHECK (
    usuario_id IS NOT NULL OR perfil_aprovador IS NOT NULL
  ),
  CONSTRAINT chk_alcadas_faixa CHECK (
    valor_limite_max IS NULL OR valor_limite_max > valor_limite_min
  )
);

-- 7.6 alcadas_aprovacao_departamentos (vinculo opcional N:N)
CREATE TABLE alcadas_aprovacao_departamentos (
  alcada_id           uuid NOT NULL REFERENCES alcadas_aprovacao(id) ON DELETE CASCADE,
  departamento_id     uuid NOT NULL REFERENCES departamentos(id),
  PRIMARY KEY (alcada_id, departamento_id)
);

-- 7.7 notas_fiscais
CREATE TABLE notas_fiscais (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                      text NOT NULL,
  serie                       text,
  chave_acesso                text UNIQUE,
  tipo                        text NOT NULL DEFAULT 'entrada',
  fornecedor_id               uuid NOT NULL REFERENCES fornecedores(id),
  cnpj_emissor                text NOT NULL,
  empresa_emitente_id         uuid NOT NULL REFERENCES empresas_emitentes(id),
  moeda_id                    uuid REFERENCES moedas(id),
  valor_produtos              numeric(15,2),
  valor_frete                 numeric(15,2) NOT NULL DEFAULT 0,
  valor_desconto              numeric(15,2) NOT NULL DEFAULT 0,
  valor_impostos              numeric(15,2) NOT NULL DEFAULT 0,
  valor_total                 numeric(15,2) NOT NULL,
  data_emissao                timestamptz NOT NULL,
  data_entrada                timestamptz,
  data_vencimento             date,
  status                      text NOT NULL DEFAULT 'received',
  url_xml                     text,
  url_pdf                     text,
  url_boleto                  text,
  lancada_por_usuario_id      uuid REFERENCES usuarios(id),
  observacoes                 text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_nf_tipo CHECK (tipo IN ('entrada','devolucao','servico')),
  CONSTRAINT chk_nf_status CHECK (status IN ('received','paid','cancelled','returned')),
  CONSTRAINT uq_nf_numero_emissor UNIQUE (numero, cnpj_emissor)
);

-- 7.8 notas_fiscais_pedidos (N:N)
CREATE TABLE notas_fiscais_pedidos (
  nota_fiscal_id      uuid NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
  pedido_compra_id    uuid NOT NULL REFERENCES pedidos_compra(id),
  valor_alocado       numeric(15,2),
  PRIMARY KEY (nota_fiscal_id, pedido_compra_id)
);

-- 7.9 recebimentos_compra
CREATE TABLE recebimentos_compra (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id                   uuid NOT NULL REFERENCES pedidos_compra(id),
  pedido_item_id              uuid NOT NULL REFERENCES pedidos_compra_itens(id),
  nota_fiscal_id              uuid REFERENCES notas_fiscais(id),
  unidade_recebimento_id      uuid NOT NULL REFERENCES unidades(id),
  quantidade_esperada         numeric(15,3) NOT NULL,
  quantidade_recebida         numeric(15,3) NOT NULL,
  quantidade_avariada         numeric(15,3) NOT NULL DEFAULT 0,
  quantidade_devolvida        numeric(15,3) NOT NULL DEFAULT 0,
  data_recebimento            timestamptz NOT NULL DEFAULT now(),
  recebido_por_usuario_id     uuid NOT NULL REFERENCES usuarios(id),
  conferido_por_usuario_id    uuid REFERENCES usuarios(id),
  url_foto_recebimento        text,
  status                      text NOT NULL DEFAULT 'pending_check',
  observacoes                 text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_recebimentos_status CHECK (status IN ('pending_check','partial','complete','rejected')),
  CONSTRAINT chk_recebimentos_qtd CHECK (
    quantidade_recebida >= 0 AND
    quantidade_avariada <= quantidade_recebida AND
    quantidade_devolvida <= quantidade_recebida
  )
);


-- ============================================================================
-- 8. TABELAS — NIVEL 4 (Entregas)
-- ============================================================================

-- 8.1 lotes_entrega
CREATE TABLE lotes_entrega (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                      text UNIQUE,
  unidade_destino_id          uuid NOT NULL REFERENCES unidades(id),
  motorista_usuario_id        uuid NOT NULL REFERENCES usuarios(id),
  codigo_qr                   text NOT NULL UNIQUE,
  status                      text NOT NULL DEFAULT 'pending',
  despachado_em               timestamptz,
  entregue_em                 timestamptz,
  recebido_em                 timestamptz,
  concluido_em                timestamptz,
  observacoes                 text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  atualizado_em               timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_lotes_status CHECK (status IN (
    'pending','in_transit','delivered','received_confirmed','completed','cancelled'
  ))
);

-- 8.2 lotes_entrega_itens (normalizada — N solicitacoes por lote)
CREATE TABLE lotes_entrega_itens (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id             uuid NOT NULL REFERENCES lotes_entrega(id) ON DELETE CASCADE,
  solicitacao_id      uuid NOT NULL REFERENCES solicitacoes(id),
  ordem               int NOT NULL DEFAULT 0,
  criado_em           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_lotes_entrega_itens UNIQUE (lote_id, solicitacao_id)
);

-- 8.3 confirmacoes_entrega (3 tipos: motorista, recepcao, solicitante)
CREATE TABLE confirmacoes_entrega (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lote_id                     uuid REFERENCES lotes_entrega(id),
  solicitacao_id              uuid REFERENCES solicitacoes(id),
  tipo                        text NOT NULL,
  confirmado_por_usuario_id   uuid NOT NULL REFERENCES usuarios(id),
  recebido_por_usuario_id     uuid REFERENCES usuarios(id),
  url_foto                    text,
  url_assinatura              text,
  localizacao                 jsonb,
  codigo_diario               text,
  observacoes                 text,
  criado_em                   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_confirmacoes_tipo CHECK (tipo IN ('driver_delivery','reception_receipt','requester_confirm')),
  CONSTRAINT chk_confirmacoes_vinculo CHECK (
    lote_id IS NOT NULL OR solicitacao_id IS NOT NULL
  )
);


-- ============================================================================
-- 9. TABELAS — NIVEL 5 (Movimentacoes — depende de varias tabelas)
-- ============================================================================

-- 9.1 movimentacoes (TUDO em uma so tabela)
CREATE TABLE movimentacoes (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo                            text NOT NULL,
  item_id                         uuid NOT NULL REFERENCES itens(id),
  quantidade                      numeric(15,3) NOT NULL,
  usuario_id                      uuid NOT NULL REFERENCES usuarios(id),
  unidade_id                      uuid REFERENCES unidades(id),
  unidade_origem_id               uuid REFERENCES unidades(id),
  unidade_destino_id              uuid REFERENCES unidades(id),
  tomador_usuario_id              uuid REFERENCES usuarios(id),
  emprestimo_devolucao_prevista   timestamptz,
  movimentacao_origem_id          uuid REFERENCES movimentacoes(id),
  solicitacao_id                  uuid REFERENCES solicitacoes(id),
  lote_entrega_id                 uuid REFERENCES lotes_entrega(id),
  pedido_compra_id                uuid REFERENCES pedidos_compra(id),
  nota_fiscal_id                  uuid REFERENCES notas_fiscais(id),
  observacoes                     text,
  ordem_servico                   text,
  motivo_descarte                 text,
  metadados                       jsonb NOT NULL DEFAULT '{}'::jsonb,
  criado_em                       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_movimentacoes_tipo CHECK (tipo IN (
    'entry','exit','transfer','loan_out','loan_return','disposal','adjustment'
  )),
  CONSTRAINT chk_movimentacoes_transfer CHECK (
    tipo <> 'transfer' OR (unidade_origem_id IS NOT NULL AND unidade_destino_id IS NOT NULL)
  ),
  CONSTRAINT chk_movimentacoes_loan_out CHECK (
    tipo <> 'loan_out' OR (tomador_usuario_id IS NOT NULL AND emprestimo_devolucao_prevista IS NOT NULL)
  ),
  CONSTRAINT chk_movimentacoes_loan_return CHECK (
    tipo <> 'loan_return' OR movimentacao_origem_id IS NOT NULL
  ),
  CONSTRAINT chk_movimentacoes_quantidade CHECK (
    tipo = 'adjustment' OR quantidade > 0
  )
);


-- ============================================================================
-- 10. TABELAS — Auditoria & Notificacoes
-- ============================================================================

-- 10.1 log_atividades (timeline generica de qualquer entidade — append-only)
CREATE TABLE log_atividades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_entidade   text NOT NULL,
  entidade_id     uuid NOT NULL,
  acao            text NOT NULL,
  usuario_id      uuid REFERENCES usuarios(id),
  status_anterior text,
  status_novo     text,
  dados           jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_origem       inet,
  user_agent      text,
  criado_em       timestamptz NOT NULL DEFAULT now()
);

-- 10.2 notificacoes (caixa de entrada in-app)
CREATE TABLE notificacoes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id      uuid NOT NULL REFERENCES usuarios(id),
  tipo            text NOT NULL,
  prioridade      text NOT NULL DEFAULT 'normal',
  titulo          text NOT NULL,
  mensagem        text,
  link_acao       text,
  tipo_entidade   text,
  entidade_id     uuid,
  lido_em         timestamptz,
  arquivado_em    timestamptz,
  enviado_email   boolean NOT NULL DEFAULT false,
  enviado_whatsapp boolean NOT NULL DEFAULT false,
  enviado_push    boolean NOT NULL DEFAULT false,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_notificacoes_prioridade CHECK (prioridade IN ('low','normal','high','urgent'))
);


-- ============================================================================
-- 11. TABELAS — Perfis & Permissoes (sistema dinamico)
-- ============================================================================

-- 11.1 perfis_acesso_rotas (N:N — quais rotas cada perfil libera)
CREATE TABLE perfis_acesso_rotas (
  perfil_id       uuid NOT NULL REFERENCES perfis_acesso(id) ON DELETE CASCADE,
  rota_id         uuid NOT NULL REFERENCES rotas_sistema(id) ON DELETE CASCADE,
  pode_ler        boolean NOT NULL DEFAULT false,
  pode_escrever   boolean NOT NULL DEFAULT false,
  pode_excluir    boolean NOT NULL DEFAULT false,
  pode_aprovar    boolean NOT NULL DEFAULT false,
  criado_em       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (perfil_id, rota_id)
);

-- 11.2 usuarios_perfis (N:N — usuario pode ter N perfis)
CREATE TABLE usuarios_perfis (
  usuario_id              uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  perfil_id               uuid NOT NULL REFERENCES perfis_acesso(id) ON DELETE CASCADE,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  criado_por_usuario_id   uuid REFERENCES usuarios(id),
  PRIMARY KEY (usuario_id, perfil_id)
);

-- 11.3 usuarios_rotas_extras (rotas individuais fora dos perfis)
CREATE TABLE usuarios_rotas_extras (
  usuario_id              uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rota_id                 uuid NOT NULL REFERENCES rotas_sistema(id) ON DELETE CASCADE,
  pode_ler                boolean NOT NULL DEFAULT false,
  pode_escrever           boolean NOT NULL DEFAULT false,
  pode_excluir            boolean NOT NULL DEFAULT false,
  pode_aprovar            boolean NOT NULL DEFAULT false,
  motivo                  text,
  criado_em               timestamptz NOT NULL DEFAULT now(),
  criado_por_usuario_id   uuid REFERENCES usuarios(id),
  PRIMARY KEY (usuario_id, rota_id)
);


-- ============================================================================
-- 12. INDICES
-- ============================================================================

-- Identidade & Org
CREATE INDEX idx_usuarios_departamento ON usuarios(departamento_id);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo) WHERE ativo = true;
CREATE INDEX idx_unidades_status ON unidades(status);
CREATE INDEX idx_departamentos_ativo ON departamentos(ativo);
CREATE INDEX idx_empresas_emitentes_ativo ON empresas_emitentes(ativo);

-- Catalogo
CREATE INDEX idx_itens_categoria ON itens(categoria_id);
CREATE INDEX idx_itens_eh_movel ON itens(eh_movel) WHERE ativo = true;
CREATE INDEX idx_itens_ativo ON itens(ativo);
CREATE INDEX idx_itens_fornecedor_pref ON itens(fornecedor_preferencial_id);
CREATE INDEX idx_itens_unidade_medida ON itens(unidade_medida_id);
CREATE INDEX idx_itens_busca ON itens USING GIN (
  to_tsvector('portuguese', nome || ' ' || COALESCE(descricao, ''))
);

-- Estoque
CREATE INDEX idx_estoques_unidade ON estoques_unidade(unidade_id);
CREATE INDEX idx_estoques_item ON estoques_unidade(item_id);
CREATE INDEX idx_estoques_abaixo_minimo ON estoques_unidade(item_id, unidade_id)
  WHERE quantidade < quantidade_minima;

-- Movimentacoes
CREATE INDEX idx_mov_tipo ON movimentacoes(tipo, criado_em DESC);
CREATE INDEX idx_mov_item ON movimentacoes(item_id, criado_em DESC);
CREATE INDEX idx_mov_unidade ON movimentacoes(unidade_id, criado_em DESC);
CREATE INDEX idx_mov_unidade_origem ON movimentacoes(unidade_origem_id) WHERE tipo = 'transfer';
CREATE INDEX idx_mov_unidade_destino ON movimentacoes(unidade_destino_id) WHERE tipo = 'transfer';
CREATE INDEX idx_mov_tomador ON movimentacoes(tomador_usuario_id) WHERE tipo = 'loan_out';
CREATE INDEX idx_mov_origem ON movimentacoes(movimentacao_origem_id) WHERE tipo = 'loan_return';
CREATE INDEX idx_mov_solicitacao ON movimentacoes(solicitacao_id);
CREATE INDEX idx_mov_pedido_compra ON movimentacoes(pedido_compra_id);
CREATE INDEX idx_mov_emprestimo_atrasado ON movimentacoes(emprestimo_devolucao_prevista) WHERE tipo = 'loan_out';

-- Solicitacoes operacionais
CREATE INDEX idx_solicitacoes_tipo_status ON solicitacoes(tipo, status);
CREATE INDEX idx_solicitacoes_solicitante ON solicitacoes(solicitado_por_usuario_id, criado_em DESC);
CREATE INDEX idx_solicitacoes_unidade ON solicitacoes(unidade_solicitante_id, criado_em DESC);
CREATE INDEX idx_solicitacoes_item ON solicitacoes(item_id);
CREATE INDEX idx_solicitacoes_designer ON solicitacoes(designer_usuario_id) WHERE designer_usuario_id IS NOT NULL;
CREATE INDEX idx_solicitacoes_emprestimo_atrasado ON solicitacoes(emprestimo_devolucao_prevista)
  WHERE tipo = 'loan' AND status = 'active';
CREATE INDEX idx_solicitacoes_pendentes ON solicitacoes(tipo, criado_em)
  WHERE status IN ('pending','pending_designer','pending_approval');

-- Entregas
CREATE INDEX idx_lotes_unidade_destino ON lotes_entrega(unidade_destino_id, status);
CREATE INDEX idx_lotes_motorista ON lotes_entrega(motorista_usuario_id, status);
CREATE INDEX idx_lotes_status ON lotes_entrega(status);
CREATE INDEX idx_lotes_itens_lote ON lotes_entrega_itens(lote_id, ordem);
CREATE INDEX idx_lotes_itens_solicitacao ON lotes_entrega_itens(solicitacao_id);
CREATE INDEX idx_confirm_lote ON confirmacoes_entrega(lote_id, criado_em);
CREATE INDEX idx_confirm_solicitacao ON confirmacoes_entrega(solicitacao_id, criado_em);
CREATE INDEX idx_confirm_tipo ON confirmacoes_entrega(tipo, criado_em DESC);

-- Compras
CREATE INDEX idx_fornecedores_status ON fornecedores(status);
CREATE INDEX idx_fornecedores_categoria ON fornecedores(categoria_id);
CREATE INDEX idx_fornecedores_busca ON fornecedores USING GIN (
  to_tsvector('portuguese', razao_social || ' ' || COALESCE(nome_fantasia, ''))
);
CREATE INDEX idx_sol_compra_status ON solicitacoes_compra(status);
CREATE INDEX idx_sol_compra_solicitante ON solicitacoes_compra(solicitante_id, criado_em DESC);
CREATE INDEX idx_sol_compra_comprador ON solicitacoes_compra(comprador_id) WHERE comprador_id IS NOT NULL;
CREATE INDEX idx_sol_compra_pendentes ON solicitacoes_compra(status, criado_em)
  WHERE status IN ('pending_manager','approved_manager','pending_director');
CREATE INDEX idx_sol_compra_itens_sol ON solicitacoes_compra_itens(solicitacao_id, ordem);
CREATE INDEX idx_sol_compra_itens_item ON solicitacoes_compra_itens(item_id);
CREATE INDEX idx_cotacoes_comprador ON cotacoes(comprador_id, status);
CREATE INDEX idx_cotacoes_status ON cotacoes(status);
CREATE INDEX idx_cot_sol_cotacao ON cotacoes_solicitacoes(cotacao_id);
CREATE INDEX idx_cot_sol_solicitacao ON cotacoes_solicitacoes(solicitacao_id);
CREATE INDEX idx_cot_forn_cotacao ON cotacoes_fornecedores(cotacao_id);
CREATE INDEX idx_cot_resp_cotacao ON cotacoes_respostas(cotacao_id);
CREATE INDEX idx_cot_resp_fornecedor ON cotacoes_respostas(fornecedor_id);
CREATE INDEX idx_cot_resp_status ON cotacoes_respostas(status);
CREATE INDEX idx_cot_resp_itens_resposta ON cotacoes_respostas_itens(resposta_id);
CREATE INDEX idx_pedidos_status ON pedidos_compra(status);
CREATE INDEX idx_pedidos_fornecedor ON pedidos_compra(fornecedor_id);
CREATE INDEX idx_pedidos_comprador ON pedidos_compra(comprador_id, criado_em DESC);
CREATE INDEX idx_pedidos_aprovador ON pedidos_compra(aprovador_alcada_id) WHERE status_aprovacao = 'pendente';
CREATE INDEX idx_pedidos_contrato ON pedidos_compra(contrato_id) WHERE contrato_id IS NOT NULL;
CREATE INDEX idx_pedidos_empresa ON pedidos_compra(empresa_emitente_id);
CREATE INDEX idx_ped_itens_pedido ON pedidos_compra_itens(pedido_id, ordem);
CREATE INDEX idx_ped_itens_item ON pedidos_compra_itens(item_id);
CREATE INDEX idx_aprovacoes_pedido ON pedidos_compra_aprovacoes(pedido_id, versao, criado_em);
CREATE INDEX idx_aprovacoes_aprovador ON pedidos_compra_aprovacoes(aprovador_id, criado_em DESC);
CREATE INDEX idx_alcadas_ativo ON alcadas_aprovacao(escopo, ativo, valor_limite_min);

-- NF / Contratos / Recebimentos
CREATE INDEX idx_nf_fornecedor ON notas_fiscais(fornecedor_id, data_emissao DESC);
CREATE INDEX idx_nf_empresa ON notas_fiscais(empresa_emitente_id, data_emissao DESC);
CREATE INDEX idx_nf_status ON notas_fiscais(status);
CREATE INDEX idx_nf_data_emissao ON notas_fiscais(data_emissao DESC);
CREATE INDEX idx_nf_chave ON notas_fiscais(chave_acesso) WHERE chave_acesso IS NOT NULL;
CREATE INDEX idx_nf_pedidos_nf ON notas_fiscais_pedidos(nota_fiscal_id);
CREATE INDEX idx_nf_pedidos_pedido ON notas_fiscais_pedidos(pedido_compra_id);
CREATE INDEX idx_contratos_status ON contratos(status);
CREATE INDEX idx_contratos_fornecedor ON contratos(fornecedor_id);
CREATE INDEX idx_contratos_empresa ON contratos(empresa_emitente_id);
CREATE INDEX idx_contratos_periodo ON contratos(data_inicio, data_fim);
CREATE INDEX idx_recebimentos_pedido ON recebimentos_compra(pedido_id);
CREATE INDEX idx_recebimentos_item ON recebimentos_compra(pedido_item_id);
CREATE INDEX idx_recebimentos_nf ON recebimentos_compra(nota_fiscal_id);
CREATE INDEX idx_recebimentos_status ON recebimentos_compra(status);
CREATE INDEX idx_recebimentos_unidade ON recebimentos_compra(unidade_recebimento_id, data_recebimento DESC);

-- Auditoria & Notificacoes
CREATE INDEX idx_log_entidade ON log_atividades(tipo_entidade, entidade_id, criado_em DESC);
CREATE INDEX idx_log_usuario ON log_atividades(usuario_id, criado_em DESC);
CREATE INDEX idx_log_acao ON log_atividades(acao, criado_em DESC);
CREATE INDEX idx_notif_usuario_naolidas ON notificacoes(usuario_id, criado_em DESC)
  WHERE lido_em IS NULL AND arquivado_em IS NULL;
CREATE INDEX idx_notif_entidade ON notificacoes(tipo_entidade, entidade_id);
CREATE INDEX idx_notif_tipo ON notificacoes(tipo, criado_em DESC);

-- Permissoes
CREATE INDEX idx_perfis_acesso_ativo ON perfis_acesso(ativo);
CREATE INDEX idx_rotas_sistema_modulo ON rotas_sistema(modulo, ordem);
CREATE INDEX idx_rotas_sistema_ativo ON rotas_sistema(ativo);
CREATE INDEX idx_perfis_rotas_perfil ON perfis_acesso_rotas(perfil_id);
CREATE INDEX idx_perfis_rotas_rota ON perfis_acesso_rotas(rota_id);
CREATE INDEX idx_usuarios_perfis_usuario ON usuarios_perfis(usuario_id);
CREATE INDEX idx_usuarios_perfis_perfil ON usuarios_perfis(perfil_id);
CREATE INDEX idx_usuarios_rotas_extras_usuario ON usuarios_rotas_extras(usuario_id);


-- ============================================================================
-- 13. SEQUENCIAS (numeros legiveis SOL/SC/COT/PED/LOTE/CTR)
-- ============================================================================
CREATE SEQUENCE seq_solicitacoes START 1;
CREATE SEQUENCE seq_solicitacoes_compra START 1;
CREATE SEQUENCE seq_cotacoes START 1;
CREATE SEQUENCE seq_pedidos_compra START 1;
CREATE SEQUENCE seq_lotes_entrega START 1;
CREATE SEQUENCE seq_contratos START 1;


-- ============================================================================
-- 14. FUNCOES PL/pgSQL
-- ============================================================================

-- 14.1 Trigger generico set_updated_at
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- 14.2 Aplicar movimentacao no estoque (TRIGGER CRITICO)
CREATE OR REPLACE FUNCTION fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  CASE NEW.tipo
    WHEN 'entry', 'loan_return' THEN
      INSERT INTO estoques_unidade (item_id, unidade_id, quantidade)
        VALUES (NEW.item_id, NEW.unidade_id, NEW.quantidade)
      ON CONFLICT (item_id, unidade_id) DO UPDATE
        SET quantidade = estoques_unidade.quantidade + NEW.quantidade,
            atualizado_em = now();

    WHEN 'exit', 'loan_out', 'disposal' THEN
      UPDATE estoques_unidade
        SET quantidade = quantidade - NEW.quantidade,
            atualizado_em = now()
      WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Estoque inexistente para item % na unidade %', NEW.item_id, NEW.unidade_id;
      END IF;

    WHEN 'transfer' THEN
      UPDATE estoques_unidade
        SET quantidade = quantidade - NEW.quantidade, atualizado_em = now()
      WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_origem_id;
      IF NOT FOUND THEN
        RAISE EXCEPTION 'Estoque inexistente na unidade origem % para item %', NEW.unidade_origem_id, NEW.item_id;
      END IF;
      INSERT INTO estoques_unidade (item_id, unidade_id, quantidade)
        VALUES (NEW.item_id, NEW.unidade_destino_id, NEW.quantidade)
      ON CONFLICT (item_id, unidade_id) DO UPDATE
        SET quantidade = estoques_unidade.quantidade + NEW.quantidade,
            atualizado_em = now();

    WHEN 'adjustment' THEN
      INSERT INTO estoques_unidade (item_id, unidade_id, quantidade)
        VALUES (NEW.item_id, NEW.unidade_id, GREATEST(NEW.quantidade, 0))
      ON CONFLICT (item_id, unidade_id) DO UPDATE
        SET quantidade = estoques_unidade.quantidade + NEW.quantidade,
            atualizado_em = now();
  END CASE;

  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14.3 Recebimento gera movimentacao automatica
CREATE OR REPLACE FUNCTION fn_recebimento_gera_movimentacao() RETURNS trigger AS $$
DECLARE
  v_item_id uuid;
  v_qtd_efetiva numeric(15,3);
BEGIN
  IF NEW.status = 'complete' AND (OLD.status IS NULL OR OLD.status <> 'complete') THEN
    SELECT pci.item_id INTO v_item_id
      FROM pedidos_compra_itens pci
     WHERE pci.id = NEW.pedido_item_id;

    v_qtd_efetiva := NEW.quantidade_recebida - NEW.quantidade_avariada - NEW.quantidade_devolvida;

    IF v_item_id IS NOT NULL AND v_qtd_efetiva > 0 THEN
      INSERT INTO movimentacoes (
        tipo, item_id, quantidade, usuario_id,
        unidade_id, pedido_compra_id, nota_fiscal_id, observacoes
      ) VALUES (
        'entry', v_item_id, v_qtd_efetiva, NEW.recebido_por_usuario_id,
        NEW.unidade_recebimento_id, NEW.pedido_id, NEW.nota_fiscal_id,
        'Entrada automatica via recebimento de compra'
      );
    END IF;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14.4 Recalcular consumido do contrato
CREATE OR REPLACE FUNCTION fn_recalcular_contrato_consumido() RETURNS trigger AS $$
DECLARE
  v_contrato_id uuid;
  v_total numeric(15,2);
BEGIN
  SELECT pc.contrato_id INTO v_contrato_id
    FROM pedidos_compra pc
   WHERE pc.id = COALESCE(NEW.pedido_compra_id, OLD.pedido_compra_id)
     AND pc.contrato_id IS NOT NULL;

  IF v_contrato_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(nf.valor_total), 0) INTO v_total
    FROM notas_fiscais nf
    JOIN notas_fiscais_pedidos nfp ON nfp.nota_fiscal_id = nf.id
    JOIN pedidos_compra pc ON pc.id = nfp.pedido_compra_id
   WHERE pc.contrato_id = v_contrato_id
     AND nf.status NOT IN ('cancelled','returned');

  UPDATE contratos
     SET valor_consumido = v_total,
         atualizado_em = now()
   WHERE id = v_contrato_id;

  RETURN COALESCE(NEW, OLD);
END $$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14.5 Log generico de mudanca de status
CREATE OR REPLACE FUNCTION fn_log_status_change() RETURNS trigger AS $$
DECLARE
  v_tipo_entidade text := TG_ARGV[0];
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO log_atividades (
      tipo_entidade, entidade_id, acao, usuario_id,
      status_anterior, status_novo, dados
    ) VALUES (
      v_tipo_entidade,
      NEW.id,
      'status_changed',
      NULLIF(current_setting('app.usuario_id', true), '')::uuid,
      OLD.status,
      NEW.status,
      jsonb_build_object('numero', COALESCE(NEW.numero, NEW.id::text))
    );
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- 14.6 Helper de numero legivel
CREATE OR REPLACE FUNCTION fn_gerar_numero_legivel(prefixo text, sequencia regclass) RETURNS text AS $$
BEGIN
  RETURN prefixo || '-' || EXTRACT(YEAR FROM now()) || '-' ||
         LPAD(NEXTVAL(sequencia)::text, 5, '0');
END $$ LANGUAGE plpgsql;

-- 14.7 Triggers de geracao de numero por entidade
CREATE OR REPLACE FUNCTION fn_numero_solicitacao() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('SOL', 'seq_solicitacoes');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_numero_solicitacao_compra() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('SC', 'seq_solicitacoes_compra');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_numero_cotacao() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('COT', 'seq_cotacoes');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_numero_pedido_compra() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('PED', 'seq_pedidos_compra');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_numero_lote_entrega() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('LOTE', 'seq_lotes_entrega');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_numero_contrato() RETURNS trigger AS $$
BEGIN
  IF NEW.numero IS NULL THEN
    NEW.numero := fn_gerar_numero_legivel('CTR', 'seq_contratos');
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;


-- ============================================================================
-- 15. TRIGGERS
-- ============================================================================

-- 15.1 set_updated_at em todas as tabelas com 'atualizado_em'
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT table_name FROM information_schema.columns
     WHERE column_name = 'atualizado_em' AND table_schema = 'public'
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_set_updated_at_%I BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION fn_set_updated_at()',
       t, t
    );
  END LOOP;
END $$;

-- 15.2 Trigger nuclear: aplicar movimentacao no estoque
CREATE TRIGGER trg_aplicar_movimentacao
  AFTER INSERT ON movimentacoes
  FOR EACH ROW EXECUTE FUNCTION fn_aplicar_movimentacao();

-- 15.3 Recebimento complete -> entry no estoque
CREATE TRIGGER trg_recebimento_gera_movimentacao
  AFTER INSERT OR UPDATE OF status ON recebimentos_compra
  FOR EACH ROW EXECUTE FUNCTION fn_recebimento_gera_movimentacao();

-- 15.4 Recalculo de contrato (3 triggers — vincular/desvincular/cancelar NF)
CREATE TRIGGER trg_recalc_contrato_insert
  AFTER INSERT ON notas_fiscais_pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_contrato_consumido();

CREATE TRIGGER trg_recalc_contrato_delete
  AFTER DELETE ON notas_fiscais_pedidos
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_contrato_consumido();

CREATE TRIGGER trg_recalc_contrato_status
  AFTER UPDATE OF status ON notas_fiscais
  FOR EACH ROW EXECUTE FUNCTION fn_recalcular_contrato_consumido();

-- 15.5 Log de mudanca de status nas entidades-chave
CREATE TRIGGER trg_log_status_solicitacoes
  AFTER UPDATE OF status ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('solicitacao');

CREATE TRIGGER trg_log_status_solicitacoes_compra
  AFTER UPDATE OF status ON solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('solicitacao_compra');

CREATE TRIGGER trg_log_status_pedidos
  AFTER UPDATE OF status ON pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('pedido_compra');

CREATE TRIGGER trg_log_status_lotes
  AFTER UPDATE OF status ON lotes_entrega
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('lote_entrega');

CREATE TRIGGER trg_log_status_recebimentos
  AFTER UPDATE OF status ON recebimentos_compra
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('recebimento_compra');

CREATE TRIGGER trg_log_status_contratos
  AFTER UPDATE OF status ON contratos
  FOR EACH ROW EXECUTE FUNCTION fn_log_status_change('contrato');

-- 15.6 Triggers de geracao de numero legivel
CREATE TRIGGER trg_numero_solicitacao
  BEFORE INSERT ON solicitacoes
  FOR EACH ROW EXECUTE FUNCTION fn_numero_solicitacao();

CREATE TRIGGER trg_numero_solicitacao_compra
  BEFORE INSERT ON solicitacoes_compra
  FOR EACH ROW EXECUTE FUNCTION fn_numero_solicitacao_compra();

CREATE TRIGGER trg_numero_cotacao
  BEFORE INSERT ON cotacoes
  FOR EACH ROW EXECUTE FUNCTION fn_numero_cotacao();

CREATE TRIGGER trg_numero_pedido_compra
  BEFORE INSERT ON pedidos_compra
  FOR EACH ROW EXECUTE FUNCTION fn_numero_pedido_compra();

CREATE TRIGGER trg_numero_lote_entrega
  BEFORE INSERT ON lotes_entrega
  FOR EACH ROW EXECUTE FUNCTION fn_numero_lote_entrega();

CREATE TRIGGER trg_numero_contrato
  BEFORE INSERT ON contratos
  FOR EACH ROW EXECUTE FUNCTION fn_numero_contrato();


-- ============================================================================
-- 16. VIEWS
-- ============================================================================

-- 16.1 Emprestimos ativos (loan_out sem loan_return correspondente)
CREATE OR REPLACE VIEW emprestimos_ativos AS
SELECT m.*
  FROM movimentacoes m
 WHERE m.tipo = 'loan_out'
   AND NOT EXISTS (
     SELECT 1 FROM movimentacoes r
      WHERE r.tipo = 'loan_return' AND r.movimentacao_origem_id = m.id
   );

-- 16.2 Emprestimos atrasados
CREATE OR REPLACE VIEW emprestimos_atrasados AS
SELECT * FROM emprestimos_ativos
 WHERE emprestimo_devolucao_prevista < now();

-- 16.3 Solicitacoes pendentes (para badge de menu)
CREATE OR REPLACE VIEW solicitacoes_pendentes AS
SELECT s.*,
       i.nome AS item_nome,
       u.nome AS solicitante_nome,
       un.nome AS unidade_nome
  FROM solicitacoes s
  JOIN itens i ON i.id = s.item_id
  JOIN usuarios u ON u.id = s.solicitado_por_usuario_id
  JOIN unidades un ON un.id = s.unidade_solicitante_id
 WHERE s.status IN (
   'pending','pending_designer','pending_approval',
   'approved','awaiting_pickup','awaiting_delivery'
 );

-- 16.4 Pedidos aguardando aprovacao por alcada
CREATE OR REPLACE VIEW pedidos_aguardando_aprovacao AS
SELECT pc.*,
       f.razao_social AS fornecedor_razao_social,
       u.nome AS comprador_nome,
       a.nome AS aprovador_nome
  FROM pedidos_compra pc
  JOIN fornecedores f ON f.id = pc.fornecedor_id
  JOIN usuarios u ON u.id = pc.comprador_id
  LEFT JOIN usuarios a ON a.id = pc.aprovador_alcada_id
 WHERE pc.status_aprovacao = 'pendente';

-- 16.5 Contratos proximos do vencimento ou com saldo baixo
CREATE OR REPLACE VIEW contratos_proximos_vencimento AS
SELECT c.*,
       f.razao_social AS fornecedor_razao_social,
       (c.data_fim - CURRENT_DATE) AS dias_para_vencer,
       (c.saldo / NULLIF(c.valor_total, 0) * 100) AS percentual_saldo
  FROM contratos c
  JOIN fornecedores f ON f.id = c.fornecedor_id
 WHERE c.status = 'active'
   AND (c.data_fim - CURRENT_DATE <= 30
        OR c.saldo / NULLIF(c.valor_total, 0) < 0.10);

-- 16.6 Estoques abaixo do minimo (alerta de ressuprimento)
CREATE OR REPLACE VIEW estoques_abaixo_minimo AS
SELECT eu.*,
       i.nome AS item_nome,
       i.produto_codigo,
       un.nome AS unidade_nome,
       (eu.quantidade_minima - eu.quantidade) AS deficit
  FROM estoques_unidade eu
  JOIN itens i ON i.id = eu.item_id
  JOIN unidades un ON un.id = eu.unidade_id
 WHERE eu.quantidade < eu.quantidade_minima
   AND i.ativo = true;

-- 16.7 Tempo medio em cada etapa de solicitacoes (dashboard de gargalos)
CREATE OR REPLACE VIEW solicitacoes_tempo_etapas AS
SELECT s.id,
       s.numero,
       s.tipo,
       s.status,
       s.criado_em,
       s.aprovado_em,
       s.concluido_em,
       EXTRACT(EPOCH FROM (s.aprovado_em - s.criado_em))/3600 AS horas_ate_aprovacao,
       EXTRACT(EPOCH FROM (s.concluido_em - s.aprovado_em))/3600 AS horas_aprovacao_a_conclusao,
       EXTRACT(EPOCH FROM (s.concluido_em - s.criado_em))/3600 AS horas_total
  FROM solicitacoes s
 WHERE s.concluido_em IS NOT NULL;


-- ============================================================================
-- 17. SEED INICIAL
-- ============================================================================

-- 17.1 Moedas
INSERT INTO moedas (codigo, simbolo, nome) VALUES
  ('BRL', 'R$', 'Real Brasileiro'),
  ('USD', '$',  'Dolar Americano'),
  ('EUR', '€',  'Euro');

-- 17.2 Empresas Emitentes (4 CNPJs reais Gowork)
INSERT INTO empresas_emitentes (razao_social, nome_fantasia, cnpj) VALUES
  ('Go Offices Latam S/A',                                                'Go Offices',       '31680138000102'),
  ('Co Built-To-Suit Escritorios Sob Encomenda LTDA',                     'Co Built-To-Suit', '37846311000852'),
  ('Co-Rent Locacao de Espacos LTDA',                                     'Co-Rent',          '37845214000845'),
  ('Co-Services do Brasil Servicos Combinados de Apoio A Edificios LTDA', 'Co-Services',      '37335910000135');

-- 17.3 Unidades de Medida
INSERT INTO unidades_medida (codigo, nome, descricao) VALUES
  ('un',       'Unidade',    'Unidade simples'),
  ('kg',       'Quilograma', 'Massa em quilos'),
  ('g',        'Grama',      'Massa em gramas'),
  ('m',        'Metro',      'Comprimento em metros'),
  ('m2',       'Metro quadrado', 'Area'),
  ('m3',       'Metro cubico',   'Volume'),
  ('l',        'Litro',      'Volume em litros'),
  ('cx',       'Caixa',      'Caixa fechada'),
  ('par',      'Par',        'Conjunto de 2'),
  ('conjunto', 'Conjunto',   'Conjunto multiplo'),
  ('dz',       'Duzia',      '12 unidades'),
  ('pct',      'Pacote',     'Pacote');

-- 17.4 Formas de Pagamento
INSERT INTO formas_pagamento (codigo, nome) VALUES
  ('pix',             'PIX'),
  ('cartao_credito',  'Cartao de Credito'),
  ('cartao_debito',   'Cartao de Debito'),
  ('boleto',          'Boleto Bancario'),
  ('transferencia',   'Transferencia Bancaria'),
  ('dinheiro',        'Dinheiro');

-- 17.5 Condicoes de Pagamento
INSERT INTO condicoes_pagamento (codigo, nome, dias) VALUES
  ('a_vista',     'A vista',                     0),
  ('7_dias',      '7 dias',                      7),
  ('15_dias',     '15 dias',                     15),
  ('30_dias',     '30 dias',                     30),
  ('30_60',       '30/60 dias',                  NULL),
  ('30_60_90',    '30/60/90 dias',               NULL),
  ('60_dias',     '60 dias',                     60),
  ('faturado',    'Faturado mensal',             NULL);

-- 17.6 Categorias de Itens
INSERT INTO categorias (nome, descricao) VALUES
  ('Mobiliario',           'Moveis em geral'),
  ('Eletronicos',          'Equipamentos eletronicos'),
  ('Material de Escritorio', 'Papelaria e suprimentos de escritorio'),
  ('Limpeza e Higiene',    'Produtos de limpeza e higiene'),
  ('Cafe e Copa',          'Cafe, acucar, materiais de copa'),
  ('Material de Construcao', 'Insumos de obra'),
  ('Equipamentos Tecnicos', 'Ferramentas e equipamentos especializados');

-- 17.7 Categorias de Fornecedor
INSERT INTO categorias_fornecedor (nome, descricao) VALUES
  ('E-commerce',           'Mercado Livre, Shopee, Amazon'),
  ('Distribuidor',         'Distribuidor de produtos'),
  ('Fabricante',           'Fabricante direto'),
  ('Prestador de Servico', 'Servicos especializados'),
  ('Marketplace Direto',   'Venda direta'),
  ('Importador',           'Importador de produtos');

-- 17.8 Perfis de Acesso (apenas DEV + ADMIN no seed inicial)
INSERT INTO perfis_acesso (codigo, nome, descricao, eh_protegido) VALUES
  ('DEV',   'Desenvolvedor', 'Acesso total ao sistema (incluindo cadastro de rotas)', true),
  ('ADMIN', 'Administrador', 'Acesso a cadastros e administracao basica',             true);

-- 17.9 Rotas do Sistema (33 rotas — Anexo A do plano-acao.md)
INSERT INTO rotas_sistema (caminho, codigo, nome, descricao, modulo, icone, ordem) VALUES
  -- admin (7)
  ('/admin/usuarios',           'admin.usuarios',           'Usuarios',           'CRUD de usuarios e atribuicao de perfis',           'admin',         'users',       1),
  ('/admin/unidades',           'admin.unidades',           'Unidades',           'CRUD de unidades e andares',                        'admin',         'building',    2),
  ('/admin/departamentos',      'admin.departamentos',      'Departamentos',      'CRUD de setores',                                   'admin',         'briefcase',   3),
  ('/admin/empresas-emitentes', 'admin.empresas-emitentes', 'Empresas Emitentes', 'CRUD dos CNPJs Gowork',                             'admin',         'landmark',    4),
  ('/admin/perfis-acesso',      'admin.perfis-acesso',      'Perfis de Acesso',   'CRUD de perfis e atribuicao de rotas',              'admin',         'shield',      5),
  ('/admin/rotas-sistema',      'admin.rotas-sistema',      'Rotas do Sistema',   'CRUD de rotas (so DEV)',                            'admin',         'route',       6),
  ('/admin/alcadas-aprovacao',  'admin.alcadas-aprovacao',  'Alcadas',            'Configuracao de aprovadores por valor + departamento','admin',       'gavel',       7),
  -- cadastros (8)
  ('/cadastros/moedas',                'cadastros.moedas',                'Moedas',                'Moedas suportadas',                  'cadastros',     'coins',       1),
  ('/cadastros/categorias',            'cadastros.categorias',            'Categorias de Itens',   'Agrupador do catalogo',              'cadastros',     'tag',         2),
  ('/cadastros/itens',                 'cadastros.itens',                 'Itens (Catalogo)',      'Catalogo unificado de produtos e moveis','cadastros', 'package',     3),
  ('/cadastros/fornecedores',          'cadastros.fornecedores',          'Fornecedores',          'CRUD de fornecedores',               'cadastros',     'truck',       4),
  ('/cadastros/categorias-fornecedor', 'cadastros.categorias-fornecedor', 'Categorias Fornecedor', 'Tipos de fornecedor',                'cadastros',     'tags',        5),
  ('/cadastros/unidades-medida',       'cadastros.unidades-medida',       'Unidades de Medida',    'un, kg, m, l, cx...',                'cadastros',     'ruler',       6),
  ('/cadastros/formas-pagamento',      'cadastros.formas-pagamento',      'Formas de Pagamento',   'pix, cartao, boleto...',             'cadastros',     'credit-card', 7),
  ('/cadastros/condicoes-pagamento',   'cadastros.condicoes-pagamento',   'Condicoes de Pagamento', 'a vista, 30 dias, 30/60/90...',     'cadastros',     'calendar',    8),
  -- estoque (2)
  ('/estoque/saldos',         'estoque.saldos',         'Saldos por Unidade', 'Visao de saldos com alerta de minimo', 'estoque', 'box',         1),
  ('/estoque/movimentacoes',  'estoque.movimentacoes',  'Movimentacoes',      'Historico de entradas e saidas',       'estoque', 'arrow-right', 2),
  -- solicitacoes (5)
  ('/solicitacoes/material',          'solicitacoes.material',          'Pedido de Material',     'Material para a unidade',                    'solicitacoes', 'clipboard-list', 1),
  ('/solicitacoes/movel',             'solicitacoes.movel',             'Solicitacao de Movel',   'Movel para unidade (passa por designer)',    'solicitacoes', 'sofa',           2),
  ('/solicitacoes/retirada-movel',    'solicitacoes.retirada-movel',    'Retirada de Movel',      'Designer decide armazenar ou descartar',     'solicitacoes', 'trash-2',        3),
  ('/solicitacoes/emprestimo',        'solicitacoes.emprestimo',        'Emprestimo',             'Emprestimo de item (controlador aprova)',    'solicitacoes', 'rotate-ccw',     4),
  ('/solicitacoes/aprovacao-gestor',  'solicitacoes.aprovacao-gestor',  'Aprovacao Gestor',       'Tela de aprovacao tecnica',                  'solicitacoes', 'check-square',   5),
  -- entregas (3)
  ('/entregas/lotes',         'entregas.lotes',         'Lotes de Entrega',  'Agrupamento de solicitacoes para motorista',   'entregas', 'truck',     1),
  ('/entregas/recepcao',      'entregas.recepcao',      'Recepcao',          'Recepcao recebe pacote (sem responsabilidade de conteudo)', 'entregas', 'inbox', 2),
  ('/entregas/conferencia',   'entregas.conferencia',   'Conferencia',       'CL/Assistente confere conteudo',               'entregas', 'check',     3),
  -- compras (7)
  ('/compras/solicitacoes',       'compras.solicitacoes',       'Solicitacoes de Compra', 'Solicitar compra (pre-aprovacao)',    'compras', 'file-plus',  1),
  ('/compras/cotacoes',           'compras.cotacoes',           'Cotacoes',               'Cotacao multi-fornecedor',            'compras', 'file-text',  2),
  ('/compras/pedidos',            'compras.pedidos',            'Pedidos de Compra',      'Pedido fechado para fornecedor',      'compras', 'file-check', 3),
  ('/compras/aprovacao-diretoria','compras.aprovacao-diretoria','Aprovacao Diretoria',    'Tela de aprovacao por alcada',        'compras', 'gavel',      4),
  ('/compras/notas-fiscais',      'compras.notas-fiscais',      'Notas Fiscais',          'Lancamento e gestao de NF',           'compras', 'receipt',    5),
  ('/compras/contratos',          'compras.contratos',          'Contratos',              'Contratos com baixa automatica',      'compras', 'file-lock',  6),
  ('/compras/recebimentos',       'compras.recebimentos',       'Recebimentos',           'Recebimento parcial ou total',        'compras', 'package-2',  7),
  -- auditoria (2)
  ('/auditoria/timeline',     'auditoria.timeline',     'Timeline',     'Historico de atividades de qualquer entidade', 'auditoria', 'history', 1),
  ('/auditoria/notificacoes', 'auditoria.notificacoes', 'Notificacoes', 'Caixa de entrada in-app',                      'auditoria', 'bell',    2);

-- 17.10 Vinculos perfis_acesso_rotas
-- DEV: todas as rotas com permissao total (ler, escrever, excluir, aprovar)
INSERT INTO perfis_acesso_rotas (perfil_id, rota_id, pode_ler, pode_escrever, pode_excluir, pode_aprovar)
SELECT
  (SELECT id FROM perfis_acesso WHERE codigo = 'DEV'),
  r.id,
  true, true, true, true
FROM rotas_sistema r;

-- ADMIN: admin.* (escrever) + cadastros.* (escrever) + auditoria.* (ler) + tudo o resto (ler)
-- Sem permissao de aprovar (aprovacao tem alcada propria)
INSERT INTO perfis_acesso_rotas (perfil_id, rota_id, pode_ler, pode_escrever, pode_excluir, pode_aprovar)
SELECT
  (SELECT id FROM perfis_acesso WHERE codigo = 'ADMIN'),
  r.id,
  true,
  CASE WHEN r.modulo IN ('admin','cadastros') AND r.codigo <> 'admin.rotas-sistema' THEN true ELSE false END,
  CASE WHEN r.modulo IN ('admin','cadastros') AND r.codigo <> 'admin.rotas-sistema' THEN true ELSE false END,
  false
FROM rotas_sistema r;


-- ============================================================================
-- 17.11 GRANTs e DEFAULT PRIVILEGES
-- ============================================================================
-- DROP SCHEMA public CASCADE (no inicio) apaga os DEFAULT PRIVILEGES que o
-- Supabase configura por padrao. Sem isso, PostgREST nao consegue ler/gravar
-- nas tabelas mesmo com RLS permitindo. Reaplicamos aqui.

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT SELECT                          ON ALL TABLES    IN SCHEMA public TO anon;
GRANT ALL                             ON ALL TABLES    IN SCHEMA public TO service_role;

GRANT USAGE, SELECT                   ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT                   ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL                             ON ALL SEQUENCES IN SCHEMA public TO service_role;

GRANT EXECUTE                         ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE                         ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE                         ON ALL FUNCTIONS IN SCHEMA public TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES    TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT                          ON TABLES    TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON TABLES    TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                   ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT                   ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL                             ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE                         ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE                         ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE                         ON FUNCTIONS TO service_role;


-- ============================================================================
-- 18. INSTRUCOES POS-EXECUCAO
-- ============================================================================
-- 1) Verificar contagem de tabelas (deve ser 38):
--    SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';
--
-- 2) Criar usuario DEV no Supabase Auth (via Studio > Authentication > Add user):
--    email: dev@supplygo.local  (ou seu email real)
--    password: <defina uma senha>
--    Anote o UUID gerado.
--
-- 3) Inserir o usuario na tabela 'usuarios' e vincular ao perfil DEV:
--    INSERT INTO usuarios (auth_usuario_id, nome, email)
--      VALUES ('<uuid_do_auth>', 'Desenvolvedor', 'dev@supplygo.local')
--      RETURNING id;
--    -- pegar o id retornado e usar abaixo:
--    INSERT INTO usuarios_perfis (usuario_id, perfil_id)
--      VALUES ('<id_usuario>', (SELECT id FROM perfis_acesso WHERE codigo='DEV'));
--
-- 4) Smoke test do trigger de movimentacao:
--    -- criar 1 unidade, 1 categoria, 1 unidade_medida, 1 item, 1 estoque, 1 movimento entry
--    -- e verificar se o saldo apareceu em estoques_unidade.
--
-- 5) Verificar permissao DEV vs ADMIN:
--    SELECT codigo, COUNT(*) FROM perfis_acesso pa
--      JOIN perfis_acesso_rotas par ON par.perfil_id = pa.id
--      GROUP BY codigo;
--    -- Esperado: DEV = 33; ADMIN = 33 (todas com leitura)
-- ============================================================================
-- FIM
-- ============================================================================
