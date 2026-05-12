# Análise do Projeto — SupplyGo / GoWork (Controle de Estoque)

> Documento técnico vivo do projeto. Última varredura: maio/2026.

## 1. Visão Geral

Sistema web **interno** para gestão completa de **estoque, móveis, entregas e compras** das unidades **Gowork**. É uma SPA (Single Page Application) construída em **React + TypeScript** com backend **serverless** rodando em **Supabase Edge Functions** (Hono + Deno) sobre **PostgreSQL**.

- **Nome no `package.json`**: `controle-de-estoque`
- **Versão `package.json`**: `0.1.0`
- **Versão `public/version.json`**: `0.1.2` (build `2026-02-19`) — divergente do `package.json`
- **Origem do design**: Figma (ver `README.md` raiz)
- **Branding**: cores oficiais Gowork (`#3F76FF`, `#00C5E9`, `#606060`)
- **Project ID Supabase**: `dtcklkhvrsyxjjjmuquw`
- **Slug da Edge Function**: `make-server-46b247d8`
- **Idioma da UI**: PT-BR (datas, status, labels traduzidos em `src/lib/format.ts`)

### Métricas rápidas do código

| Item | Quantidade |
|---|---|
| Componentes `.tsx` (todos) | **218** |
| Componentes shadcn/ui | **51** |
| Dialogs | **25** |
| Painéis reutilizáveis | **13** |
| Dashboards (1 por perfil) | **9** |
| Linhas em `AppContext.tsx` | **1.594** |
| Linhas em `PurchaseContext.tsx` | **512** |
| Linhas na Edge Function `index.ts` | **3.300** |
| Endpoints HTTP expostos | **100** |
| Tabelas no banco | **41** |
| Funções PL/pgSQL | **6** |
| Triggers | **~22** |
| Arquivos de teste (`*.test.*`) | **13** |

---

## 2. Stack Tecnológica

### Frontend
| Camada | Tecnologia |
|---|---|
| Build/Bundler | **Vite 6** + `@vitejs/plugin-react-swc` |
| UI | **React 18** + **TypeScript 5.6** |
| Estilo | **Tailwind CSS 4** (via `@tailwindcss/vite`) |
| Componentes | **shadcn/ui** (Radix primitives em `components/ui`) |
| Roteamento | **React Router v6** (`future: { v7_startTransition, v7_relativeSplatPath }`) |
| Forms | `react-hook-form` |
| Charts | `recharts` |
| Datas | `date-fns` |
| Notificações | `sonner` |
| Ícones | `lucide-react` |
| QR Code | `qrcode.react`, `html5-qrcode`, `jsqr` |
| Testes | `vitest` + `@testing-library/*` + `jsdom` |

### Backend / Infra
- **Supabase** (PostgreSQL, Auth, Storage, Realtime)
- **Edge Function** única em `supabase/functions/make-server-46b247d8/index.ts` (~135 KB, **3.300 linhas, 100 endpoints**) — servidor **Hono** com service role bypassando RLS
- Conversão automática `camelCase ↔ snake_case` nas requisições/respostas (`src/utils/api.ts`)
- **PostgreSQL 15+** (Supabase) com **41 tabelas**, **6 funções PL/pgSQL** e **22 triggers** (em sua maioria `update_updated_at`)
- **Storage** (Supabase) — bucket usado em `/upload-image` e `/upload-quotation-attachment`

### Variáveis de ambiente (frontend)

```env
VITE_SUPABASE_PROJECT_ID=dtcklkhvrsyxjjjmuquw
VITE_SUPABASE_ANON_KEY=<jwt-anon>
VITE_SUPABASE_FUNCTION_SLUG=make-server-46b247d8
```

Lidas em `src/utils/supabase/info.tsx`. O backend (Edge Function) consome `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` via `Deno.env`.

### Configuração de build/lint

- **`tsconfig.json`**: `strict: true`, `target: ES2020`, alias `@/*` → `./src/*`, exclui `src/supabase`.
- **`vite.config.ts`**: porta `3000`, `target: esnext`, plugin `react-swc`, Tailwind como plugin Vite, Vitest com `jsdom` e `setupFiles: ./src/test/setup.ts`.
- **`components.json`** (shadcn): style `default`, baseColor `neutral`, CSS em `src/index.css`, ícones `lucide`.
- **Não há `.eslintrc` nem `prettier.config`** — formatação confiada ao SWC + TS strict.

---

## 3. Estrutura de Diretórios

```
supplygo/
├── public/                       Assets estáticos
├── supabase/
│   ├── config.toml
│   ├── schema.json               Snapshot do schema (430 KB)
│   └── functions/make-server-46b247d8/index.ts   Backend Hono
├── src/
│   ├── App.tsx                   Bootstrap + Theme + Roteamento
│   ├── main.tsx
│   ├── components/
│   │   ├── ui/                   shadcn/ui (~50 componentes)
│   │   ├── layout/               AppLayout, AppSidebar
│   │   ├── auth/                 Login, ResetPassword, ChangePassword
│   │   ├── dashboards/           9 dashboards (1 por perfil)
│   │   ├── admin/, admin-units/, admin-warehouse/
│   │   ├── controller/, designer/, developer/
│   │   ├── delivery/, requester/, warehouse/
│   │   ├── purchases/            Módulo de compras (admin/buyer/requester/warehouse/shared)
│   │   ├── dialogs/              25+ modais
│   │   ├── panels/               13 painéis reutilizáveis
│   │   └── shared/               GoworkLogo, QRCodeScanner, ItemCard...
│   ├── contexts/
│   │   ├── AppContext.tsx        ⚠️ 67 KB — estado global (usuários, estoque, pedidos, entregas)
│   │   ├── PurchaseContext.tsx   ~20 KB — estado do módulo de compras
│   │   ├── AllowedTabsProvider.tsx
│   │   └── DialogContainerContext.tsx
│   ├── hooks/                    useNavigation, useAllowedTabs, useDashboardNav, useInactivityLogout
│   ├── types/                    index.ts + purchases.ts
│   ├── utils/                    api.ts, auth.ts, approvalRules.ts, dailyCode.ts, supabase/
│   ├── lib/                      format.ts, mockData.ts, userProfile.ts, utils.ts (+ testes)
│   ├── styles/                   globals.css
│   └── DOCUMENTACAO-TECNICA.md   ⚠️ 75 KB de documentação técnica
└── package.json, vite.config.ts, tsconfig.json, components.json
```

---

## 4. Modelo de Domínio

### 4.1 Perfis de usuário (`UserRole` em `src/types/index.ts`)
11 perfis com dashboards próprios:

| Role | Dashboard | Função |
|---|---|---|
| `developer` | `DeveloperDashboard` | Acesso total — catálogo, usuários, sistema |
| `controller` / `executor` | `ControllerDashboard` | Controlador (almox + admin) |
| `admin` | `AdminDashboard` | Admin operacional + 1ª camada compras |
| `warehouse` | `WarehouseDashboard` | Almoxarife (separação/entrega) |
| `driver` | `DriverDashboard` | Motorista (entregas via QR) |
| `designer` | `DesignerDashboard` | Avalia retiradas de móveis |
| `requester` | `RequesterDashboard` | Solicita materiais |
| `buyer` | `BuyerDashboard` | Comprador (cotações/pedidos) |
| `financial` | `FinancialDashboard` | Contratos, centros de custo |
| `purchases_admin` | `PurchasesAdminDashboard` | Admin do módulo de compras |

Há um sistema adicional de **Access Groups** com tabs permitidas por usuário (`AllowedTabsProvider` + endpoints `/access-groups`, `/user-allowed-tabs`).

### 4.2 Entidades principais
- **Cadastro**: `User`, `Unit`, `Floor`, `Category`, `Item` (com flag `isFurniture`), `UnitStock`
- **Operacional**: `Movement`, `SimpleMovement`, `Loan`, `Request`
- **Móveis**: `FurnitureTransfer`, `FurnitureRemovalRequest`, `FurnitureRequestToDesigner`
- **Entregas**: `DeliveryBatch`, `DeliveryConfirmation`
- **Compras**: `Supplier`, `SupplierCategory`, `CostCenter`, `Contract`, `Currency`, `PurchaseRequest`, `Quotation`, `PurchaseOrder` (com `PurchaseOrderApproval`), `Receiving`

### 4.3 Fluxos centrais
- **Pedido de material**: `pending → approved → awaiting_pickup → out_for_delivery → delivery_confirmed → received_confirmed → completed`
- **Móvel para unidade**: passa por designer → almoxarifado → motorista → confirmação por **código diário do solicitante**
- **Retirada de móvel**: designer decide entre **armazenar** ou **descartar** (com justificativa)
- **Compra**: requisição → aprovação gerente → aprovação diretor → cotação → pedido → aprovação por alçada → recebimento

### 4.4 Status (enums centrais)

#### `RequestStatus` (pedidos de material)
`pending | approved | processing | awaiting_pickup | out_for_delivery | delivery_confirmed | received_confirmed | completed | rejected | cancelled`

#### `FurnitureRequestToDesigner.status`
`pending_designer → approved_designer → approved_storage → separated → awaiting_delivery → in_transit → pending_confirmation → completed | rejected`

#### `FurnitureRemovalRequest.status`
`pending → approved_storage | approved_disposal → awaiting_pickup → in_transit → completed | rejected`

#### `PurchaseRequestStatus`
`pending_manager → approved_manager → pending_director → approved_director → in_quotation → quotation_completed → in_purchase → completed` (+ `rejected_manager` / `rejected_director`)

#### `PurchaseOrderStatus` + `StatusAprovacao`
- Status de execução: `created | awaiting_nf | nf_issued | in_transit | partially_received | fully_received`
- Status de aprovação: `pendente | aprovado | reprovado | em_revisao` (com versionamento via campo `versao`)

#### `DeliveryBatch.status`
`pending | in_transit | delivery_confirmed | received_confirmed | completed | pending_confirmation | confirmed_by_requester | delivered`

### 4.5 Mapeamento de labels e badges (`src/lib/format.ts`)

Centraliza:
- `getRoleName(role)` — nome humano (`developer → "Desenvolvedor"` etc.)
- `getRoleBadge(role)` — sigla de 3 letras (`DEV`, `ADM`, `ALM`, `CMP`, `MOT`, `ACO`...)
- `getRoleBadgeVariant(role)` — variante visual do `<Badge>`
- `getStatusConfig(status)` — `{ label, variant }` para 18 status
- `formatDate`, `formatDateShort`, `formatRelativeTimePast` — todos em `pt-BR`
- `replaceUnitIdsWithNames(text, units)` — substitui UUIDs por nomes em logs/notas

---

## 5. Schema do Banco (Supabase / PostgreSQL)

Arquivo `supabase/schema.json` documenta **41 tabelas** organizadas por prefixo de domínio:

### 5.1 Tabelas por domínio

#### Core / Organização (`org_*`, `users`)
| Tabela | Função |
|---|---|
| `users` | Usuários do sistema (perfil, unidade primária, depto, daily_code) |
| `org_units` | Unidades Gowork (com `floors` JSONB) |
| `org_departments` | Setores/departamentos |
| `org_cost_centers` | Centros de custo (compras) |
| `org_currencies` | Moedas suportadas |

#### Estoque (`stock_*`)
| Tabela | Função |
|---|---|
| `stock_categories` | Categorias de itens |
| `stock_items` | Catálogo de produtos/móveis (flag `is_furniture`) |
| `stock_unit_stocks` | Estoque por unidade (qtd + mínimo + localização) |
| `stock_movements` | Histórico legado (entrada/saída/empréstimo/devolução/ajuste) |
| `stock_simple_movements` | **Versão simplificada** que dispara trigger `handle_inventory_movement` |
| `stock_loans` | Empréstimos com `expected_return_date` |
| `stock_requests` | Solicitações de materiais do almox |
| `stock_unique_product_instances` | Instâncias com serial único |

#### Móveis (`furniture_*`)
| Tabela | Função |
|---|---|
| `furniture_transfers` | Transferências entre unidades |
| `furniture_removal_requests` | Retiradas avaliadas pelo designer |
| `furniture_requests_to_designer` | Solicitação de móvel → designer → almox → motorista (com `qr_code`) |

#### Compras (`purchase_*`)
| Tabela | Função |
|---|---|
| `purchase_requests` | Requisições com `itens` e `aprovacoes` em JSONB |
| `purchase_quotations` | Cotações (com `frete`, `desconto`, `ipi`, `icms`, `pis_cofins`, `anexos`) |
| `purchase_orders` | Pedidos (com `notas_fiscais` JSONB, `numero_omie`, `versao`, `status_aprovacao`) |
| `purchase_order_items` | Itens do pedido normalizados |
| `purchase_order_approvals` | Histórico de aprovações por versão (ação: `pendente/aprovado/reprovado/reenviado`) |
| `purchase_approval_config` | **Alçadas**: faixas `valor_min/valor_max` + `role_name` (`pedido`/`requisicao`) |
| `purchase_approval_config_departments` | Vincula alçadas a setores específicos |
| `purchase_suppliers` | Fornecedores (CNPJ, dados bancários, contato) |
| `purchase_supplier_categories` | Categorias de fornecedores |
| `purchase_contracts` | Contratos (valor, consumido, saldo recalculado por trigger) |
| `purchase_receivings` | Recebimentos (esperado x recebido, parcial/total) |
| `purchase_delivery_batches` | Lotes de entrega de pedidos |
| `purchase_delivery_confirmations` | Confirmações com foto/assinatura |

#### Acesso / Permissões
| Tabela | Função |
|---|---|
| `access_groups` | Grupos com `codigo`, `nome`, `descricao` |
| `access_group_tabs` | Tabs (módulos) liberados por grupo |
| `access_group_members` | Vínculo usuário ↔ grupo |
| `user_extra_tabs` | Tabs avulsas concedidas direto ao usuário |

#### Outras
| Tabela | Função |
|---|---|
| `kv_store_46b247d8` | Key-value JSONB genérico (legado/seed) |
| `notifications` | Notificações in-app |

### 5.2 Funções PL/pgSQL

| Função | Tipo | Descrição |
|---|---|---|
| `update_updated_at_column()` | trigger | Atualiza `updated_at = NOW()` (genérica, usada em ~15 tabelas) |
| `set_updated_at()` | trigger | Variante alternativa do mesmo padrão |
| `fn_departments_updated_at()` | trigger | Específica para `org_departments` |
| `fn_approval_config_updated_at()` | trigger | Específica para `purchase_approval_config` |
| `handle_inventory_movement()` | trigger `SECURITY DEFINER` | **Atualiza `stock_unit_stocks` automaticamente** ao inserir em `stock_simple_movements` (`entry/return` somam, `consumption/loan` subtraem) |
| `recalculate_contract_consumed()` | trigger | Recalcula `valor_consumido` em `purchase_contracts` somando NFs dos pedidos vinculados |

### 5.3 Triggers principais

- `on_stock_movement` em `stock_simple_movements AFTER INSERT` → mantém `stock_unit_stocks` consistente
- `trg_*_updated_at` em todas as tabelas com `updated_at`
- Trigger de recálculo de contrato em `purchase_orders`

---

## 6. Pontos Fortes da Arquitetura

- **TypeScript estrito** com tipos de domínio bem documentados (JSDoc) em `src/types/`.
- **shadcn/ui** completo (51 componentes) cobrindo a UI inteira de forma consistente.
- **Dark mode** via `ThemeContext` persistido em `localStorage.gowork_theme`.
- **Auto-logout** após 1h de inatividade com aviso 5 min antes (`useInactivityLogout`).
- **CORS hardening** com middleware Hono + injeção de headers em **todas** as respostas.
- **Resiliência**: listas de compras retornam `[]` em caso de falha (`purchasesListResponse`), evitando 500 no front.
- **Resiliência de sessão**: erros de rede/5xx **não deslogam** o usuário (`AuthBootstrapState = 'offline'`).
- **Auditoria** via `purchase_audit_logs`, `purchase_order_approvals` (versionado), e log master de movimentações.
- **Sistema de QR Code diário** com renovação automática para confirmar entregas com segurança.
- **Triggers PostgreSQL** garantem consistência de estoque e contratos sem depender da camada de aplicação.
- **Realtime** Supabase no `PurchaseContext` (debounced refresh evita flood de re-renders).
- **Conversão automática** `camelCase ↔ snake_case` em `apiRequest` — frontend trabalha em camelCase, banco em snake_case.

---

## 7. Catálogo de Endpoints (Edge Function)

Todos prefixados por `/functions/v1/make-server-46b247d8`. Total: **100 endpoints** em ~25 grupos.

### 7.1 Auth (`/auth/*`)
| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/signup` | Cria usuário no Supabase Auth + linha em `users` |
| POST | `/auth/signin` | Login (email/senha) — retorna `access_token`, `refresh_token`, `user` |
| GET | `/auth/session` | Valida token atual; usado no bootstrap |
| POST | `/auth/signout` | Invalida sessão |
| POST | `/auth/update-password` | Troca de senha autenticada |
| POST | `/auth/change-password` | Variante (validação adicional) |
| POST | `/auth/clear-password-flags` | Remove `requirePasswordChange/firstLogin` |
| POST | `/auth/request-password-reset` | Envia email de reset |
| POST | `/auth/validate-reset-token` | Valida token vindo no link |
| POST | `/auth/reset-password-with-token` | Define nova senha via token |
| POST | `/auth/reset-password` | Variante legada |
| POST | `/auth/admin-reset-password` | Admin força reset para outro usuário |

### 7.2 Cadastros básicos
| Recurso | Rotas |
|---|---|
| Users | `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` |
| Units | `GET /units`, `POST /units`, `PUT /units/:id` |
| Categories | `GET /categories`, `POST /categories` |
| Floors | `GET /floors`, `POST /floors`, `PUT /floors/:id`, `DELETE /floors/:id` |
| Items | `GET /items`, `POST /items`, `PUT /items/:id` |
| Departments | `GET /departments` |
| Currencies | `GET /currencies` |

### 7.3 Estoque & operações
| Recurso | Rotas |
|---|---|
| Unit Stocks | `GET/POST /unit-stocks`, `PUT /unit-stocks/:id` |
| Requests | `GET/POST /requests`, `PUT /requests/:id` |
| Movements | `GET/POST /movements` (atualiza estoque via trigger) |
| Loans | `GET/POST /loans`, `PUT /loans/:id` |
| Individual Items | `GET/POST /individual-items`, `PUT /individual-items/:id` |

### 7.4 Móveis
| Recurso | Rotas |
|---|---|
| Furniture Transfers | `GET/POST /furniture-transfers`, `PUT /furniture-transfers/:id` |
| Furniture Removal | `GET/POST /furniture-removal-requests`, `PUT /furniture-removal-requests/:id` |
| Furniture → Designer | `GET/POST /furniture-requests-to-designer`, `PUT /furniture-requests-to-designer/:id` |

### 7.5 Entregas
| Recurso | Rotas |
|---|---|
| Delivery Batches | `GET/POST /delivery-batches`, `PUT /delivery-batches/:id` |
| Delivery Confirmations | `GET/POST /delivery-confirmations` |
| Manutenção | `POST /fix-delivery-tables` (utilitário de correção) |

### 7.6 Módulo de Compras
| Recurso | Rotas |
|---|---|
| Suppliers | `GET/POST /suppliers`, `PUT/DELETE /suppliers/:id` |
| Supplier Categories | `GET/POST /supplier-categories`, `PUT /supplier-categories/:id` |
| Cost Centers | `GET/POST /cost-centers`, `PUT /cost-centers/:id` |
| Contracts | `GET/POST /contracts`, `PUT /contracts/:id` |
| Purchase Requests | `GET/POST /purchase-requests`, `PUT /purchase-requests/:id` |
| Aprovação requisição (gerente) | `PUT /purchase-requests/:id/approve-manager` & `/reject-manager` |
| Aprovação requisição (diretor) | `PUT /purchase-requests/:id/approve-director` & `/reject-director` |
| Quotations | `GET/POST /quotations`, `PUT /quotations/:id` |
| Purchase Orders | `GET/POST /purchase-orders`, `PUT /purchase-orders/:id` |
| Aprovação pedido | `POST /purchase-orders/:id/approve` & `/reject` & `/resend` |
| Receivings | `GET/POST /receivings` |
| Uploads | `POST /upload-image`, `POST /upload-quotation-attachment` |

### 7.7 Permissões / Access Groups
| Rota | Função |
|---|---|
| `GET/POST /access-groups`, `PUT/DELETE /access-groups/:id` | CRUD de grupos |
| `POST /access-groups/:id/members`, `DELETE /access-groups/:groupId/members/:userId` | Membros |
| `GET/PUT /user-access/:userId` | Snapshot grupos + tabs extras do usuário |
| `GET /user-allowed-tabs/:userId` | Tabs liberadas (união grupos + extras) |

### 7.8 Manutenção / Migrações
| Rota | Função |
|---|---|
| `GET /health` | Healthcheck |
| `POST /init-schema` | Cria tabelas faltantes |
| `POST /seed` | Popula dados iniciais (chamada no bootstrap) |
| `POST /migrate-unit-stocks` | Migração legada |
| `POST /migrate-text-to-uuid` | Migração de IDs |
| `POST /add-admin-type-column` | Migração legada |
| `GET /developer/check-furniture-table` | Verifica integridade da tabela de móveis |

---

## 8. Camada de Estado no Frontend

### 8.1 `AppContext` (1.594 linhas)

Estado global em `src/contexts/AppContext.tsx`:
- **Coleções**: `users`, `units`, `items`, `categories`, `unitStocks`, `movements`, `loans`, `requests`, `furnitureTransfers`, `furnitureRemovalRequests`, `furnitureRequestsToDesigner`, `deliveryBatches`, `deliveryConfirmations`
- **Sessão**: `currentUser`, `currentUnit`, `isLoading`
- **Bootstrap unificado**: valida sessão (`authService.validateAuthState`) → carrega 13 endpoints em paralelo (`Promise.allSettled`) → restaura usuário e gera `dailyCode` se expirado
- **API**: ~35 funções de mutation (addX, updateX, deleteX, confirmX) + getters (`getItemById`, `getStockForItem`...)
- **Resiliência**: `validateAuthState` distingue `valid | offline | logged_out` — falhas de rede/5xx **não deslogam** o usuário
- **Daily Code**: gerado/renovado automaticamente para perfis que não sejam `admin`/`driver`

### 8.2 `PurchaseContext` (512 linhas)

Estado do módulo de compras com **realtime debounced** via `supabase.channel(...)`:
- Coleções: `purchaseRequests`, `suppliers`, `supplierCategories`, `costCenters`, `contracts`, `currencies`, `quotations`, `purchaseOrders`, `receivings`
- Operações: `createPurchaseRequest`, aprovações em 2 camadas (gerente/diretor), CRUD de fornecedores/contratos/cotações, fluxo de pedido com `approve/reject/resend`
- `loadPurchases(silent?)` — atualização "silenciosa" para realtime sem ligar spinner global

### 8.3 Outros providers
- **`AllowedTabsProvider`** — usa `api.accessGroups.getUserTabs(userId)` para liberar tabs por usuário; `admin/developer/controller` ganham acesso total automaticamente; `purchases_admin` recebe apenas tabs com prefixo `compras_admin.`
- **`DialogContainerContext`** — alvo de `Portal` para diálogos shadcn (mantém z-index e foco corretos)
- **`ThemeContext`** (no próprio `App.tsx`) — `light/dark` persistido em `localStorage.gowork_theme`
- **`DeveloperViewContext`** — permite ao perfil `developer` simular outros perfis

### 8.4 Hooks customizados
| Hook | Função |
|---|---|
| `useApp()` | Acesso ao `AppContext` |
| `usePurchases()` | Acesso ao `PurchaseContext` |
| `useAllowedTabs()` | `canAccessTab(tabId)`, `refreshTabs()` |
| `useNavigation()` | Sidebar (sections, activeSection, title/subtitle) |
| `useDashboardNav()` | Wrapper que registra sections + título no provider |
| `useInactivityLogout(onLogout, isLoggedIn, onWarning?)` | Timer 60min com aviso aos 55min |

---

## 9. Autenticação & Segurança

### 9.1 Storage de sessão (`src/utils/auth.ts`)
Chaves em `localStorage`:
```
gowork_auth_token       // access_token
gowork_refresh_token    // refresh_token
gowork_current_user     // User normalizado (camelCase)
gowork_pending_user_id  // entre login e validação
```

### 9.2 Fluxo de bootstrap
1. `App` inicia, `AppProvider` chama `authService.hasStoredSession()`
2. Se sim, faz `GET /auth/session` com `Bearer <token>`:
   - `200 OK` → `valid` (pode atualizar tokens)
   - `401/403` → tenta `POST /auth/refresh`; se falhar `→ logged_out`
   - `5xx/timeout/rede` → `offline` (mantém sessão local)
3. Em paralelo, dispara seed (`/seed`) com timeout de 8s e marca `gowork_db_initialized`
4. Carrega 13 datasets via `Promise.allSettled`
5. Restaura `currentUser` e regenera `dailyCode` se expirado

### 9.3 Inatividade
`useInactivityLogout`:
- 1h de inatividade → toast + `logout()`
- 55 min → toast de aviso ("5 min para deslogar")
- Eventos monitorados: `mousedown`, `keydown`, `scroll`, `touchstart`, `click` (sem `mousemove` para não esgotar CPU)

### 9.4 Daily Code (QR de entrega)
`src/utils/dailyCode.ts`:
- `generateRandomDailyCode()` → 6 dígitos via `crypto.getRandomValues`
- `isDailyCodeExpired(generatedAt)` — comparação por data ISO (`YYYY-MM-DD`)
- `formatDailyCode("123456")` → `"123-456"`
- Renovado automaticamente no bootstrap quando data ≠ hoje

### 9.5 Regras de aprovação por alçada (`src/utils/approvalRules.ts`)
Função `getAprovadorNecessario(valorTotal, supabase, escopo, departmentId?)`:
1. Busca em `purchase_approval_config` faixas ativas que cobrem o valor (`valor_limite_min ≤ total ≤ valor_limite_max`)
2. Filtra por `role_name` (`pedido` ou `requisicao`)
3. Se `departmentId` informado → mantém apenas faixas vinculadas àquele setor (via `purchase_approval_config_departments`) **ou** sem vínculo (globais)
4. Prioriza a maior `valor_limite_min` (regra mais restritiva)
5. Fallback: para `pedido` sem match, tenta linhas que não sejam `requisicao` (legado)

---

## 10. Scripts Disponíveis (`package.json`)

```bash
npm run dev        # Vite dev server na porta 3000
npm run build      # Build de produção (target esnext, dist/)
npm run preview    # Preview do build
npm run test       # Vitest watch
npm run test:run   # Vitest single-run
```

---

## 11. Fluxos de Negócio Detalhados

### 11.1 Pedido de material (Solicitante → Almox → Motorista)

```
Solicitante         Admin          Almoxarifado     Motorista        Solicitante
    |                 |                  |               |                |
    |-- POST /requests-->                |               |                |
    |                 |--PUT approve---->|               |                |
    |                 |                  |--createBatch->|                |
    |                 |                  |  (QR Code)    |--scan QR ----->|
    |                 |                  |               |  (daily_code)  |
    |                 |                  |               |--confirm ----->|
    |                 |                  |               |                |
       trigger handle_inventory_movement atualiza stock_unit_stocks
```

### 11.2 Móvel para unidade (Designer-mediado)

1. Controlador faz `POST /furniture-requests-to-designer` (status `pending_designer`)
2. Designer aprova (`approved_designer`) ou rejeita
3. Almox storage aprova (`approved_storage`) e separa (`separated`)
4. Almox cria delivery batch (`awaiting_delivery → in_transit`)
5. Motorista entrega; solicitante valida com **daily_code** → `pending_confirmation` → `completed`

### 11.3 Retirada de móvel (Solicitante → Designer → Almox)

1. Solicitante: `POST /furniture-removal-requests` (`pending`)
2. Designer decide: `approved_storage` (volta ao almox) **ou** `approved_disposal` (descarte com `disposalJustification`)
3. Almox/motorista coleta (`awaiting_pickup → in_transit`)
4. Recebimento no almox: `completed`; se `storage`, atualiza `stock_unit_stocks`

### 11.4 Compra (multi-camada de aprovação)

```
Requisitante      Gerente         Diretor       Comprador     Aprovador alçada    Almox
     |               |                |              |               |              |
     |--PR(create)-->| (pending_mgr)  |              |               |              |
     |               |--approve_mgr-->| (pending_dir)|               |              |
     |               |                |--approve_dir>| (in_quotation)|              |
     |               |                |              |--Quotation--->|              |
     |               |                |              |--PO(create)-->| (pendente)   |
     |               |                |              |               |--approve---->|
     |               |                |              |               |              |--receive
     |
   trigger recalculate_contract_consumed atualiza purchase_contracts.valor_consumido
```

- Aprovador definido por `getAprovadorNecessario(valor, escopo, departmentId)`
- Reprovação dispara `acao = 'reprovado'`; comprador pode `resend` criando **nova `versao`**
- Recebimento parcial (`partially_received`) ou total (`fully_received`) em `purchase_receivings`

### 11.5 Sistema de Access Groups

- Tabs do app têm IDs estáveis (ex: `compras_admin.fornecedores`, `almox.estoque`)
- Cada `access_group` tem N tabs liberadas (`access_group_tabs`)
- Usuário pode estar em vários grupos (`access_group_members`) **+** receber tabs avulsas (`user_extra_tabs`)
- Endpoint `GET /user-allowed-tabs/:userId` retorna a **união** dos dois conjuntos
- Perfis `admin/developer/controller` bypassam — recebem `true` em `canAccessTab`
- Perfil `purchases_admin` é restrito a tabs com prefixo `compras_admin.`

---

## 12. Pontos de Atenção & Riscos

### 12.1 Arquitetura
1. **`AppContext.tsx` com 1.594 linhas** concentra estado + CRUD + business logic. Refatorar em contextos menores (`AuthContext`, `InventoryContext`, `DeliveriesContext`, `FurnitureContext`) ou migrar para **Zustand/Jotai/TanStack Query** reduziria acoplamento e re-renders.
2. **Edge Function monolítica de 3.300 linhas** — separar em arquivos por domínio (`auth.ts`, `users.ts`, `purchases.ts`...) e montar `app.route()` por sub-app Hono melhora a manutenção e tempo de cold start.
3. **`PurchaseContext` em paralelo a `AppContext`** — alguns dados (ex.: `users`, `units`) são carregados nos dois; vale unificar via cache (TanStack Query).

### 12.2 Segurança
4. **`getAuthToken()` retorna sempre `publicAnonKey`** (`src/utils/api.ts`, comentário admite que o backend não valida JWT customizado). Como a Edge Function usa `service_role`, qualquer chamada com a anon key tem **poder total**. Migrar para validar `access_token` real (`auth.getUser(jwt)`) e criar middleware de role no Hono é **prioridade**.
5. **CORS aberto** (`Access-Control-Allow-Origin: *`) — aceitável em ambiente interno, mas em produção web restringir ao domínio.
6. **Daily code de 6 dígitos** sem rate limit visível na rota de validação. Boas práticas: máximo 5 tentativas/usuário/hora.

### 12.3 Dados
7. **Divergência de versão**: `package.json` = `0.1.0`, `public/version.json` = `0.1.2`. Definir fonte única e atualizar no fluxo de release (regra do projeto).
8. **`mockData.ts` (30 KB)** ainda em `src/lib/` — confirmar se é apenas seed/dev ou se algum componente importa em produção.
9. **`gowork_db_initialized`** trava o seed após primeira execução; versionar a chave (`gowork_db_initialized_v2`) ao mudar o seed.
10. **Pedidos com `itens` e `aprovacoes` em JSONB** dificultam queries analíticas — considerar normalizar (`purchase_order_items` já está normalizada, `purchase_request_items` ainda não).

### 12.4 Operacional
11. **Sem ESLint/Prettier configurados** — adicionar `eslint-config-react`, `eslint-plugin-react-hooks`, `prettier` evita inconsistências.
12. **Sem `.github/workflows`** — apesar do guia mencionar deploy automático na branch `producao`. Adicionar workflow de:
    - `lint + typecheck + test` em PRs
    - `build + supabase functions deploy + version.json bump` em push para `producao`
13. **README raiz com 5 linhas**, conteúdo real está em `src/README.md`. Promover para a raiz do repositório.
14. **Documentação espalhada**: `src/DOCUMENTACAO-TECNICA.md` (75 KB), `src/INSTRUCOES-RAPIDAS.md`, `src/SQL-MIGRATION-FURNITURE-REQUESTS.md`, `src/components/NAVEGACAO-*.md`. Centralizar em `/DOCs` (este diretório).
15. **Arquivos resíduo**: `test.txt` (raiz), `src/test.ts`, `src/test.tsx` — candidatos a remoção.

### 12.5 Testes
16. **13 arquivos `.test.*`** apenas (cobrem `format`, `userProfile`, `utils` e alguns `ui/*`). Cobertura de fluxos críticos (login, pedidos, aprovações) **inexistente**.
17. **Sem testes E2E** (Playwright/Cypress). Recomendado para fluxos multi-perfil.

---

## 13. Roadmap Técnico Sugerido

### Curto prazo (sprint)
- [ ] Reconciliar `package.json` ↔ `version.json` e automatizar bump
- [ ] Adicionar ESLint + Prettier + Husky (pre-commit)
- [ ] Configurar GitHub Actions (lint + typecheck + test em PRs)
- [ ] Remover arquivos resíduo (`test.txt`, `src/test.ts`, `src/test.tsx`)
- [ ] Mover `DOCUMENTACAO-TECNICA.md` & afins para `/DOCs`
- [ ] Promover `src/README.md` para raiz

### Médio prazo
- [ ] Implementar **validação real de JWT** no backend + middleware de role
- [ ] Quebrar a Edge Function em sub-apps Hono por domínio
- [ ] Quebrar `AppContext` em contextos por domínio (ou migrar para TanStack Query)
- [ ] Adicionar rate limit em `/auth/*` e validações de daily_code
- [ ] Cobertura de testes ≥ 50% nas funções críticas (auth, approvalRules, dailyCode, format)

### Longo prazo
- [ ] Suíte E2E (Playwright) cobrindo os 5 fluxos centrais (pedido, móvel, retirada, compra, recebimento)
- [ ] PWA (manifest + service worker) para uso offline em campo (motorista)
- [ ] Dashboard de auditoria (consumo dos endpoints + logs de aprovação)
- [ ] Internacionalização (i18n) — atualmente PT-BR hard-coded

---

## 14. Resumo Executivo

| Aspecto | Situação |
|---|---|
| **Maturidade funcional** | Alta — 11 perfis, 9 dashboards, 100 endpoints, 41 tabelas, fluxos completos |
| **Maturidade arquitetural** | Média — contextos gigantes, Edge Function monolítica, sem CI/lint |
| **Cobertura funcional** | Estoque + móveis + entregas + compras + auditoria + access groups |
| **Stack** | Moderna (Vite 6, React 18, TS 5.6 strict, Tailwind 4, Hono/Deno, Supabase) |
| **Arquitetura** | Frontend SPA + 1 Edge Function monolítica + PostgreSQL com triggers |
| **Cobertura de testes** | Baixa — 13 arquivos `.test.*`, sem E2E |
| **Riscos principais** | Auth com anon key, contextos de 1.5k+ linhas, divergência de versão, sem CI |
| **Próximos passos prioritários** | (1) Validação real de JWT no backend; (2) ESLint+Prettier+Husky; (3) GitHub Actions de CI; (4) Refatorar `AppContext`; (5) Modularizar Edge Function |

---

## 15. Glossário

| Termo | Definição |
|---|---|
| **Daily Code** | Código numérico de 6 dígitos único por usuário/dia, usado como QR para confirmar entregas |
| **Alçada** | Faixa de valor (`valor_limite_min/max`) que define qual usuário precisa aprovar uma compra |
| **Lote de Entrega** | Agrupamento de múltiplos pedidos atribuídos a um motorista com QR único |
| **Access Group** | Conjunto de tabs (módulos) liberadas para grupo de usuários |
| **Tab Extra** | Tab liberada individualmente a um usuário, fora dos grupos |
| **Storage warehouse** | Almox que armazena materiais/móveis (vs. `delivery` que apenas movimenta) |
| **Escopo (`pedido`/`requisicao`)** | Diferencia regras de aprovação aplicadas a `purchase_orders` vs `purchase_requests` |
| **Versão de pedido** | Incrementada quando comprador faz `resend` após reprovação |

---

> Documento mantido em `DOCs/doc.md`. Para aprofundamento em áreas específicas (refatoração do `AppContext`, modularização da Edge Function, módulo de compras, segurança), criar arquivos dedicados nesta mesma pasta (`DOCs/<topico>.md`).