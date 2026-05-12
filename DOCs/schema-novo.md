# Proposta de Schema Novo — SupplyGo

> Documento de planejamento. Sistema **não está em produção** — pode ser apagado e recriado.
> Compras (`purchase_*`) está em desenvolvimento — **não será tocado nesta refatoração**.

---

## 1. Princípios de design

1. **Mínimo de tabelas necessárias** — sem fragmentação por sub-tipo
2. **Catálogo unificado** — produtos e móveis numa só tabela (flag `eh_movel`)
3. **Movimentações unificadas** — uma única tabela para entrada/saída/transferência/empréstimo/descarte
4. **Pedidos unificados** — uma tabela para todos os fluxos (material, móvel→unidade, retirada de móvel)
5. **Auditoria genérica** — `log_atividades` substitui timelines reconstruídas à mão
6. **Sem prefixos redundantes** — nome da tabela já indica o domínio
7. **JSONB com critério** — usar para metadados raros, NÃO para campos consultáveis
8. **Idioma**: tabelas e colunas em pt-br sem acento e snake_case; valores de `status` e `tipo` em inglês (facilita logs e integrações)

---

## 2. Resumo: 19 tabelas core (+ 11 de compras intocadas)

```
┌─ Identidade & Organização (5) ──────────────────────┐
│  usuarios, unidades, departamentos,                 │
│  centros_custo, moedas                              │
└─────────────────────────────────────────────────────┘

┌─ Catálogo (3) ──────────────────────────────────────┐
│  categorias                                         │
│  itens               (com eh_movel)                 │
│  itens_seriais       (seriais únicos)               │
└─────────────────────────────────────────────────────┘

┌─ Estoque (2) ───────────────────────────────────────┐
│  estoques_unidade    (saldo por unidade)            │
│  movimentacoes       (TUDO: entry, exit, transfer,  │
│                       loan_out, loan_return,        │
│                       disposal, adjustment)         │
└─────────────────────────────────────────────────────┘

┌─ Pedidos (1) ───────────────────────────────────────┐
│  solicitacoes        (TUDO: material,               │
│                       furniture_to_unit,            │
│                       furniture_removal, loan)      │
└─────────────────────────────────────────────────────┘

┌─ Entregas (2) ──────────────────────────────────────┐
│  lotes_entrega                                      │
│  confirmacoes_entrega                               │
└─────────────────────────────────────────────────────┘

┌─ Auditoria (1) ─────────────────────────────────────┐
│  log_atividades                                     │
└─────────────────────────────────────────────────────┘

┌─ Permissões (4) ────────────────────────────────────┐
│  grupos_acesso, grupos_acesso_abas,                 │
│  grupos_acesso_membros, usuarios_abas_extras        │
└─────────────────────────────────────────────────────┘

┌─ Notificações (1) ──────────────────────────────────┐
│  notificacoes                                       │
└─────────────────────────────────────────────────────┘

┌─ Compras (em dev — INTOCADAS) ──────────────────────┐
│  purchase_*  (11 tabelas)                           │
└─────────────────────────────────────────────────────┘

TOTAL CORE: 19 tabelas
```

---

## 3. Definição detalhada das tabelas core

### 3.1 Identidade & Organização

#### `usuarios`
```sql
id                          uuid PK DEFAULT gen_random_uuid()
auth_usuario_id             uuid UNIQUE  -- FK para auth.users do Supabase
nome                        text NOT NULL
email                       text UNIQUE NOT NULL
perfil                      text NOT NULL  -- ver enum abaixo
cargo                       text
unidade_primaria_id         uuid REFERENCES unidades
unidades_adicionais_ids     uuid[]
departamento_id             uuid REFERENCES departamentos
tipo_almoxarifado           text  -- 'storage'|'delivery' (apenas para perfil=warehouse)
tipo_admin                  text  -- 'units'|'warehouse' (apenas para perfil=admin)
codigo_diario               text  -- 6 dígitos
codigo_diario_gerado_em     timestamptz
exige_troca_senha           boolean DEFAULT false
criado_em                   timestamptz DEFAULT now()
atualizado_em               timestamptz DEFAULT now()
```

**Perfis permitidos** (CHECK constraint, valores em inglês):
`developer | admin | controller | warehouse | driver | designer | requester | buyer | financial | purchases_admin`

> Pendência: o perfil `executor` ainda é necessário ou pode ser absorvido por `controller`?

#### `unidades`
```sql
id            uuid PK
nome          text NOT NULL
endereco      text
tipo          text  -- 'office'|'warehouse'|...
andares       jsonb DEFAULT '[]'::jsonb  -- ["Térreo", "1º andar", ...]
status        text DEFAULT 'active'  -- 'active'|'inactive'
criado_em     timestamptz DEFAULT now()
atualizado_em timestamptz DEFAULT now()
```

#### `departamentos`
```sql
id            uuid PK
nome          text NOT NULL
descricao     text
ativo         boolean DEFAULT true
responsavel_usuario_id uuid REFERENCES usuarios
criado_em     timestamptz DEFAULT now()
atualizado_em timestamptz DEFAULT now()
```

#### `centros_custo`
```sql
id          uuid PK
codigo      text NOT NULL UNIQUE
nome        text NOT NULL
descricao   text
status      text DEFAULT 'active'
criado_em   timestamptz DEFAULT now()
```

#### `moedas`
```sql
id        uuid PK
codigo    text NOT NULL UNIQUE  -- 'BRL'|'USD'|'EUR'
simbolo   text NOT NULL
nome      text NOT NULL
status    text DEFAULT 'active'
```

---

### 3.2 Catálogo

#### `categorias`
```sql
id          uuid PK
nome        text NOT NULL
descricao   text
criado_em   timestamptz DEFAULT now()
```

#### `itens` (catálogo unificado produto + móvel)
```sql
id                              uuid PK
produto_codigo                  int UNIQUE  -- código numérico legível
categoria_id                    uuid REFERENCES categorias
nome                            text NOT NULL
descricao                       text
marca                           text
modelo                          text
unidade_medida                  text NOT NULL  -- 'un'|'kg'|'m'|...
url_imagem                      text
eh_movel                        boolean DEFAULT false  -- unifica produto/móvel
eh_consumivel                   boolean DEFAULT false
eh_serial_unico                 boolean DEFAULT false  -- exige serial individual
exige_termo_responsabilidade    boolean DEFAULT false
dias_emprestimo_padrao          int
quantidade_minima_padrao        int DEFAULT 0
ativo                           boolean DEFAULT true
criado_em                       timestamptz DEFAULT now()
atualizado_em                   timestamptz DEFAULT now()
```

#### `itens_seriais` (instâncias com serial único)
```sql
id              uuid PK
item_id         uuid REFERENCES itens NOT NULL
numero_serial   text NOT NULL
unidade_id      uuid REFERENCES unidades  -- onde está
status          text DEFAULT 'available'  -- 'available'|'in_use'|'on_loan'|'lost'|'discarded'
observacoes     text
criado_em       timestamptz DEFAULT now()
atualizado_em   timestamptz DEFAULT now()

UNIQUE (item_id, numero_serial)
```

> Pendência: criar essa tabela já ou só quando aparecer demanda real de rastreio por serial?

---

### 3.3 Estoque & Movimentações

#### `estoques_unidade`
```sql
id                  uuid PK
item_id             uuid REFERENCES itens NOT NULL
unidade_id          uuid REFERENCES unidades NOT NULL
quantidade          numeric DEFAULT 0
quantidade_minima   numeric DEFAULT 0
localizacao         text  -- 'Prateleira A1', 'Almox 2'
criado_em           timestamptz DEFAULT now()
atualizado_em       timestamptz DEFAULT now()

UNIQUE (item_id, unidade_id)
```

#### `movimentacoes` (TODOS os tipos)
```sql
id                          uuid PK
tipo                        text NOT NULL  -- ver enum abaixo
item_id                     uuid REFERENCES itens NOT NULL
quantidade                  numeric NOT NULL
usuario_id                  uuid REFERENCES usuarios NOT NULL  -- quem executou

-- Localização (semântica varia por tipo)
unidade_id                  uuid REFERENCES unidades   -- entrada/saída simples
unidade_origem_id           uuid REFERENCES unidades   -- transferência: origem
unidade_destino_id          uuid REFERENCES unidades   -- transferência: destino

-- Empréstimo (preenchido quando tipo='loan_out' ou 'loan_return')
tomador_usuario_id              uuid REFERENCES usuarios     -- quem pegou emprestado
emprestimo_devolucao_prevista   timestamptz                  -- data prevista de devolução
movimentacao_origem_id          uuid REFERENCES movimentacoes -- loan_return aponta para o loan_out original

-- Vínculos
solicitacao_id              uuid REFERENCES solicitacoes      -- se veio de um pedido
lote_id                     uuid REFERENCES lotes_entrega     -- se foi entregue em lote
serial_id                   uuid REFERENCES itens_seriais     -- se for serial único

-- Metadados
observacoes                 text
ordem_servico               text   -- ordem de serviço (executor)
metadados                   jsonb DEFAULT '{}'::jsonb  -- campos raros/futuros

criado_em                   timestamptz DEFAULT now()
```

**Enum `tipo`** (CHECK constraint, valores em inglês):
```
'entry'        -- entrada de material no almox
'exit'         -- saída/consumo do almox
'transfer'     -- transferência entre unidades (usa unidade_origem_id + unidade_destino_id)
'loan_out'     -- retirada por empréstimo (usa tomador_usuario_id + emprestimo_devolucao_prevista)
'loan_return'  -- devolução de empréstimo (usa movimentacao_origem_id)
'disposal'     -- descarte
'adjustment'   -- ajuste de inventário (positivo ou negativo)
```

**Trigger automático** (mantém `estoques_unidade` consistente):
```sql
CREATE OR REPLACE FUNCTION fn_aplicar_movimentacao() RETURNS trigger AS $$
BEGIN
  CASE NEW.tipo
    WHEN 'entry', 'loan_return' THEN
      UPDATE estoques_unidade SET quantidade = quantidade + NEW.quantidade
        WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_id;
    WHEN 'exit', 'loan_out', 'disposal' THEN
      UPDATE estoques_unidade SET quantidade = quantidade - NEW.quantidade
        WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_id;
    WHEN 'transfer' THEN
      UPDATE estoques_unidade SET quantidade = quantidade - NEW.quantidade
        WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_origem_id;
      UPDATE estoques_unidade SET quantidade = quantidade + NEW.quantidade
        WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_destino_id;
    WHEN 'adjustment' THEN
      UPDATE estoques_unidade SET quantidade = quantidade + NEW.quantidade  -- pode ser negativo
        WHERE item_id = NEW.item_id AND unidade_id = NEW.unidade_id;
  END CASE;
  RETURN NEW;
END $$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_aplicar_movimentacao AFTER INSERT ON movimentacoes
  FOR EACH ROW EXECUTE FUNCTION fn_aplicar_movimentacao();
```

**Views úteis para empréstimos:**
```sql
CREATE VIEW emprestimos_ativos AS
SELECT m.*
FROM movimentacoes m
WHERE m.tipo = 'loan_out'
  AND NOT EXISTS (
    SELECT 1 FROM movimentacoes r
    WHERE r.tipo = 'loan_return' AND r.movimentacao_origem_id = m.id
  );

CREATE VIEW emprestimos_atrasados AS
SELECT * FROM emprestimos_ativos WHERE emprestimo_devolucao_prevista < now();
```

---

### 3.4 Pedidos

#### `solicitacoes` (unifica 3 tabelas em 1)
```sql
id                          uuid PK
tipo                        text NOT NULL  -- 'material'|'furniture_to_unit'|'furniture_removal'|'loan'
status                      text NOT NULL  -- ver matriz abaixo

item_id                     uuid REFERENCES itens NOT NULL
quantidade                  numeric NOT NULL
unidade_solicitante_id      uuid REFERENCES unidades NOT NULL
solicitado_por_usuario_id   uuid REFERENCES usuarios NOT NULL
andar_destino               text                       -- furniture_to_unit
localizacao_detalhe         text                       -- furniture_to_unit (onde ficará)
justificativa               text                       -- furniture_to_unit
urgencia                    text DEFAULT 'medium'      -- 'low'|'medium'|'high'

-- Aprovações (genéricas)
aprovado_por_usuario_id     uuid REFERENCES usuarios
aprovado_em                 timestamptz
designer_usuario_id         uuid REFERENCES usuarios   -- furniture_*
designer_decidido_em        timestamptz
decisao_descarte            text                       -- 'storage'|'disposal' (furniture_removal)
justificativa_descarte      text
motivo_rejeicao             text

-- Execução
codigo_qr                   text                       -- código de confirmação
pronto_retirada_em          timestamptz
retirado_por_usuario_id     uuid REFERENCES usuarios
retirado_em                 timestamptz
entregue_em                 timestamptz
concluido_em                timestamptz

observacoes                 text
criado_em                   timestamptz DEFAULT now()
atualizado_em               timestamptz DEFAULT now()
```

**Matriz de status por tipo** (valores em inglês):

| tipo | Estados válidos |
|---|---|
| `material` | `pending` → `approved` → `awaiting_pickup` → `out_for_delivery` → `delivery_confirmed` → `received_confirmed` → `completed` / `rejected` / `cancelled` |
| `furniture_to_unit` | `pending_designer` → `approved_designer` → `approved_storage` → `separated` → `awaiting_delivery` → `in_transit` → `pending_confirmation` → `completed` / `rejected` |
| `furniture_removal` | `pending_designer` → `approved_storage` / `approved_disposal` → `awaiting_pickup` → `in_transit` → `completed` / `rejected` |
| `loan` | `pending_approval` → `approved` → `awaiting_pickup` → `active` → `returned` / `overdue` / `rejected` |

**CHECK constraint** garante combinações válidas:
```sql
ALTER TABLE solicitacoes ADD CONSTRAINT chk_solicitacao_status CHECK (
  (tipo = 'material' AND status IN ('pending','approved','awaiting_pickup','out_for_delivery','delivery_confirmed','received_confirmed','completed','rejected','cancelled'))
  OR (tipo = 'furniture_to_unit' AND status IN ('pending_designer','approved_designer','approved_storage','separated','awaiting_delivery','in_transit','pending_confirmation','completed','rejected'))
  OR (tipo = 'furniture_removal' AND status IN ('pending_designer','approved_storage','approved_disposal','awaiting_pickup','in_transit','completed','rejected'))
  OR (tipo = 'loan' AND status IN ('pending_approval','approved','awaiting_pickup','active','returned','overdue','rejected'))
);
```

---

### 3.5 Entregas

#### `lotes_entrega`
```sql
id                  uuid PK
unidade_destino_id  uuid REFERENCES unidades NOT NULL
motorista_usuario_id uuid REFERENCES usuarios NOT NULL
codigo_qr           text NOT NULL UNIQUE
status              text NOT NULL  -- 'pending'|'in_transit'|'delivered'|'received_confirmed'|'completed'
solicitacao_ids     uuid[] NOT NULL  -- IDs de solicitacoes no lote (qualquer tipo)
despachado_em       timestamptz
entregue_em         timestamptz
concluido_em        timestamptz
observacoes         text
criado_em           timestamptz DEFAULT now()
```

> Pendência: `solicitacao_ids` como array Postgres OU tabela `lotes_entrega_itens` normalizada? Array é simples (1 query), normalizada é mais flexível (joins fáceis).

#### `confirmacoes_entrega`
```sql
id                          uuid PK
lote_id                     uuid REFERENCES lotes_entrega
solicitacao_id              uuid REFERENCES solicitacoes  -- confirmação individual (sem lote)
tipo                        text NOT NULL  -- 'delivery'|'receipt'|'requester'
confirmado_por_usuario_id   uuid REFERENCES usuarios NOT NULL
recebido_por_usuario_id     uuid REFERENCES usuarios       -- validado por codigo_diario
url_foto                    text
url_assinatura              text
localizacao                 jsonb  -- {latitude, longitude}
codigo_diario               text   -- código usado na confirmação
observacoes                 text
criado_em                   timestamptz DEFAULT now()

CHECK (lote_id IS NOT NULL OR solicitacao_id IS NOT NULL)
```

---

### 3.6 Auditoria

#### `log_atividades` (timeline genérica)
```sql
id              uuid PK
tipo_entidade   text NOT NULL  -- 'solicitacao'|'movimentacao'|'lote_entrega'|'usuario'|...
entidade_id     uuid NOT NULL
acao            text NOT NULL  -- 'created'|'approved'|'rejected'|'shipped'|'delivered'|...
usuario_id      uuid REFERENCES usuarios
dados           jsonb DEFAULT '{}'::jsonb  -- snapshot/detalhes flexíveis
criado_em       timestamptz DEFAULT now()

INDEX idx_log_entidade (tipo_entidade, entidade_id, criado_em DESC)
INDEX idx_log_usuario (usuario_id, criado_em DESC)
```

**Uso típico:**
```sql
-- Toda mudança de status grava aqui
INSERT INTO log_atividades (tipo_entidade, entidade_id, acao, usuario_id, dados)
VALUES (
  'solicitacao', '<uuid>', 'approved',
  '<usuario_uuid>',
  '{"from_status":"pending","to_status":"approved","reason":null}'::jsonb
);

-- Timeline de uma solicitação (1 query):
SELECT * FROM log_atividades
 WHERE tipo_entidade = 'solicitacao' AND entidade_id = '<uuid>'
 ORDER BY criado_em;
```

---

### 3.7 Permissões

#### `grupos_acesso`
```sql
id          uuid PK
codigo      text NOT NULL UNIQUE
nome        text NOT NULL
descricao   text
criado_em   timestamptz DEFAULT now()
```

#### `grupos_acesso_abas`
```sql
grupo_id    uuid REFERENCES grupos_acesso NOT NULL
aba_id      text NOT NULL  -- ex: 'almox.estoque', 'compras_admin.fornecedores'
PRIMARY KEY (grupo_id, aba_id)
```

#### `grupos_acesso_membros`
```sql
grupo_id    uuid REFERENCES grupos_acesso NOT NULL
usuario_id  uuid REFERENCES usuarios NOT NULL
criado_em   timestamptz DEFAULT now()
PRIMARY KEY (grupo_id, usuario_id)
```

#### `usuarios_abas_extras`
```sql
usuario_id  uuid REFERENCES usuarios NOT NULL
aba_id      text NOT NULL
PRIMARY KEY (usuario_id, aba_id)
```

---

### 3.8 Notificações

#### `notificacoes`
```sql
id              uuid PK
usuario_id      uuid REFERENCES usuarios NOT NULL
tipo            text NOT NULL  -- 'request_approved'|'delivery_ready'|...
titulo          text NOT NULL
mensagem        text
tipo_entidade   text  -- ligar com log_atividades se quiser
entidade_id     uuid
lido_em         timestamptz
criado_em       timestamptz DEFAULT now()

INDEX idx_notif_usuario_naolidas (usuario_id, criado_em DESC) WHERE lido_em IS NULL
```

---

## 4. Comparativo antes/depois

| Domínio | Antes | Depois | Redução |
|---|---|---|---|
| Org/Identidade | 5 (`org_*`, `users`) | 5 (`usuarios`, `unidades`, `departamentos`, `centros_custo`, `moedas`) | 0 |
| Catálogo | 2 (`stock_categories`, `stock_items`) + `stock_unique_product_instances` | 3 (`categorias`, `itens`, `itens_seriais`) | 0 |
| Estoque | 4 (`stock_unit_stocks`, `stock_movements`, `stock_simple_movements`, `stock_loans`) | 2 (`estoques_unidade`, `movimentacoes`) | **-50%** |
| Pedidos | 3 (`stock_requests`, `furniture_requests_to_designer`, `furniture_removal_requests`) | 1 (`solicitacoes`) | **-67%** |
| Móveis | 1 (`furniture_transfers`) | 0 (vira `movimentacoes` tipo `transfer`) | **-100%** |
| Entregas | 2 (`purchase_delivery_*`) | 2 (`lotes_entrega`, `confirmacoes_entrega`) | 0 |
| Auditoria | 0 dedicada | 1 (`log_atividades`) | +1 |
| Permissões | 4 | 4 | 0 |
| Notificações | 1 | 1 | 0 |
| Resíduo | 1 (`kv_store_46b247d8`) | 0 | **-100%** |
| **Total core** | **23** | **19** | **-17%** |

---

## 5. Impacto no código (frontend)

### 5.1 Convenção de nomes resultante

- **Banco**: pt-br sem acento, `snake_case` → `usuarios.nome`, `solicitacoes.aprovado_por_usuario_id`, `movimentacoes.unidade_origem_id`
- **JSON da API**: igual ao banco → `{ "nome": "...", "aprovado_por_usuario_id": "..." }`
- **Tipos TypeScript**: pt-br sem acento, `camelCase` (gerado pela conversão automática em `apiRequest`) → `Usuario.nome`, `Solicitacao.aprovadoPorUsuarioId`, `Movimentacao.unidadeOrigemId`

A conversão `toSnakeCase`/`toCamelCase` em `src/utils/api.ts` continua válida — **ela só converte separadores, não traduz idioma**, então o casamento é automático. Convenção já existe parcialmente em `purchase_*` (`PurchaseRequest.solicitanteId`, `justificativa`, `aprovacoes`).

### 5.2 Arquivos que somem
- `src/contexts/AppContext.tsx`: blocos de `furnitureTransfers`, `furnitureRemovalRequests`, `furnitureRequestsToDesigner` viram **filtros sobre `solicitacoes`**
- `src/utils/api.ts`: endpoints `/furniture-*`, `/movements` (legado), `/loans` desaparecem
- Edge Function: ~600 linhas de rotas duplicadas removidas

### 5.3 Endpoints da Edge Function (após refatoração)
- `GET/POST /movimentacoes` (único, com filtro `?tipo=`)
- `GET/POST /solicitacoes` (único, com filtro `?tipo=`)
- Removidos: `/furniture-transfers/*`, `/furniture-removal-requests/*`, `/furniture-requests-to-designer/*`, `/loans/*`, `/stock-requests/*`

> Decisão de URL: rotas em pt (`/solicitacoes`, `/usuarios`) seguem a convenção do banco e da API. Coerente com a escolha do idioma.

### 5.4 Componentes que se beneficiam
- **1 painel de timeline** funciona para qualquer entidade (lê de `log_atividades`)
- **1 painel de pedidos** com filtro de `tipo` substitui 3 painéis
- **1 painel de movimentações** unificado

### 5.5 Tela "Detalhes da Solicitação"
Layout único:
```
┌─────────────────────────────────────────┐
│  CABEÇALHO  (solicitacao.tipo, status,  │
│              item, quantidade,          │
│              solicitante)               │
├─────────────────────────────────────────┤
│  LINHA DO TEMPO                         │
│  (SELECT FROM log_atividades            │
│   WHERE tipo_entidade='solicitacao'     │
│     AND entidade_id = ?)                │
└─────────────────────────────────────────┘
```

---

## 6. Pendências para confirmação antes do SQL

| # | Decisão | Status |
|---|---|---|
| 1 | Empréstimos embutidos em `movimentacoes` (sem tabela própria) | Confirmado |
| 2 | Refatorar do zero, schema novo | Confirmado |
| 3 | Tabelas e colunas em pt-br sem acento; valores de enum em inglês | Confirmado |
| 4 | Manter `executor` ou absorver em `controller`? | Pendente |
| 5 | Criar `itens_seriais` agora ou depois? | Pendente |
| 6 | `lotes_entrega.solicitacao_ids` como array OU tabela normalizada? | Pendente |
| 7 | `loan` é `solicitacao.tipo` (precisa aprovação) ou cria `movimentacao` direto? | Pendente |
| 8 | `notificacoes` continua tabela própria ou vira filtro sobre `log_atividades`? | Pendente |
| 9 | Compras (`purchase_*`) — refatorar agora ou depois? | Pendente |

---

## 7. Próximos passos (após aprovação deste schema)

1. Validar este documento com você (resolver pendências 4 a 9)
2. Escrever migração SQL completa (`DROP` + `CREATE` em ordem)
3. Atualizar `src/types/index.ts` com novos tipos TS (em pt-camelCase)
4. Refatorar Edge Function (consolidar rotas, prefixos em pt)
5. Refatorar `AppContext` para os novos endpoints
6. Refatorar componentes UI (1 painel por entidade unificada)
7. Recriar seed de dados

---

## 8. Glossário pt ↔ en (referência)

### Tabelas

| Inglês (descarte) | Português (definitivo) |
|---|---|
| users | `usuarios` |
| units | `unidades` |
| departments | `departamentos` |
| cost_centers | `centros_custo` |
| currencies | `moedas` |
| categories | `categorias` |
| items | `itens` |
| item_instances | `itens_seriais` |
| unit_stocks | `estoques_unidade` |
| movements | `movimentacoes` |
| requests | `solicitacoes` |
| delivery_batches | `lotes_entrega` |
| delivery_confirmations | `confirmacoes_entrega` |
| activity_log | `log_atividades` |
| notifications | `notificacoes` |
| access_groups | `grupos_acesso` |
| access_group_tabs | `grupos_acesso_abas` |
| access_group_members | `grupos_acesso_membros` |
| user_extra_tabs | `usuarios_abas_extras` |

### Colunas comuns

| Inglês | Português |
|---|---|
| `id` | `id` |
| `created_at` | `criado_em` |
| `updated_at` | `atualizado_em` |
| `name` | `nome` |
| `description` | `descricao` |
| `notes` | `observacoes` |
| `status` | `status` (mantém) |
| `type` | `tipo` |
| `active` | `ativo` |
| `metadata` | `metadados` |
| `email` | `email` (mantém) |
| `address` | `endereco` |
| `floors` | `andares` |

### Foreign keys

| Inglês | Português |
|---|---|
| `user_id` | `usuario_id` |
| `unit_id` | `unidade_id` |
| `item_id` | `item_id` |
| `category_id` | `categoria_id` |
| `request_id` | `solicitacao_id` |
| `batch_id` | `lote_id` |
| `department_id` | `departamento_id` |
| `instance_id` | `serial_id` |
| `parent_movement_id` | `movimentacao_origem_id` |
| `auth_user_id` | `auth_usuario_id` |
| `from_unit_id` / `to_unit_id` | `unidade_origem_id` / `unidade_destino_id` |
| `target_unit_id` | `unidade_destino_id` |
| `requesting_unit_id` | `unidade_solicitante_id` |
| `primary_unit_id` | `unidade_primaria_id` |
| `additional_unit_ids` | `unidades_adicionais_ids` |

### Específicas de domínio — Estoque/Catálogo

| Inglês | Português |
|---|---|
| `quantity` | `quantidade` |
| `minimum_quantity` | `quantidade_minima` |
| `unit_of_measure` | `unidade_medida` |
| `is_furniture` | `eh_movel` |
| `is_consumable` | `eh_consumivel` |
| `is_unique_product` | `eh_serial_unico` |
| `requires_responsibility_term` | `exige_termo_responsabilidade` |
| `default_loan_days` | `dias_emprestimo_padrao` |
| `default_minimum_quantity` | `quantidade_minima_padrao` |
| `serial_number` | `numero_serial` |
| `image_url` | `url_imagem` |
| `brand` | `marca` |
| `model` | `modelo` |
| `product_id` | `produto_codigo` |
| `location` | `localizacao` |

### Específicas de domínio — Movimentações

| Inglês | Português |
|---|---|
| `borrower_user_id` | `tomador_usuario_id` |
| `loan_due_date` | `emprestimo_devolucao_prevista` |
| `service_order` | `ordem_servico` |
| `payload` | `dados` |

### Específicas de domínio — Solicitações

| Inglês | Português |
|---|---|
| `requested_by_user_id` | `solicitado_por_usuario_id` |
| `approved_by_user_id` | `aprovado_por_usuario_id` |
| `approved_at` | `aprovado_em` |
| `designer_user_id` | `designer_usuario_id` |
| `target_floor` | `andar_destino` |
| `location_detail` | `localizacao_detalhe` |
| `justification` | `justificativa` |
| `urgency` | `urgencia` |
| `disposal_decision` | `decisao_descarte` |
| `disposal_justification` | `justificativa_descarte` |
| `rejected_reason` | `motivo_rejeicao` |
| `qr_code` | `codigo_qr` |
| `ready_for_pickup_at` | `pronto_retirada_em` |
| `picked_up_by_user_id` | `retirado_por_usuario_id` |
| `picked_up_at` | `retirado_em` |
| `delivered_at` | `entregue_em` |
| `completed_at` | `concluido_em` |

### Específicas de domínio — Entregas/Confirmações

| Inglês | Português |
|---|---|
| `driver_user_id` | `motorista_usuario_id` |
| `dispatched_at` | `despachado_em` |
| `request_ids` | `solicitacao_ids` |
| `confirmed_by_user_id` | `confirmado_por_usuario_id` |
| `received_by_user_id` | `recebido_por_usuario_id` |
| `photo_url` | `url_foto` |
| `signature_url` | `url_assinatura` |
| `daily_code` | `codigo_diario` |
| `daily_code_generated_at` | `codigo_diario_gerado_em` |

### Específicas de domínio — Usuários/Permissões

| Inglês | Português |
|---|---|
| `role` | `perfil` |
| `job_title` | `cargo` |
| `warehouse_type` | `tipo_almoxarifado` |
| `admin_type` | `tipo_admin` |
| `require_password_change` | `exige_troca_senha` |
| `tab_id` | `aba_id` |
| `group_id` | `grupo_id` |

### Específicas de domínio — Auditoria/Notificações

| Inglês | Português |
|---|---|
| `entity_type` | `tipo_entidade` |
| `entity_id` | `entidade_id` |
| `action` | `acao` |
| `read_at` | `lido_em` |
| `title` | `titulo` |
| `message` | `mensagem` |

### Termos preservados em inglês/sigla

`id`, `email`, `auth`, `qr`, `url`, `cnpj`, `pix`, `status`, `jsonb`, `uuid`
