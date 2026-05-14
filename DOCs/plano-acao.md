# Plano de Ação — Reconstrução do SupplyGo

Base: schema novo de [tabelas.md](tabelas.md) + decisões da [analise_reuniao.md](analise_reuniao.md).

**Objetivo:** reconstruir o sistema com banco totalmente novo, reaproveitando partes do código atual onde fizer sentido. Nada está em produção, podemos quebrar tudo.

---

## Princípios

1. **Banco novo do zero** — drop completo do schema atual, recriação com as 38 tabelas
2. **Reaproveitar UI** — componentes shadcn/ui, layout, hooks de navegação, pattern de telas
3. **Reescrever** — Edge Function (monolito de 3.300 linhas vira modular), AppContext (1.594 linhas vira contextos por domínio), tipos TS, cliente API
4. **Sem hardcode** — perfis cadastráveis, rotas catalogadas, permissões granulares
5. **Sem integrações externas** nesta primeira reconstrução (Omie, ML, Network Go, Dexter ficam para V2)
6. **Idioma do banco**: pt-br snake_case nos identificadores; valores de enum em inglês
7. **Tipos TS no front**: pt-camelCase (consequência da conversão automática)

---

## Fase 0 — Pré-requisitos (resolver ANTES de codificar)

Decisões pendentes que travam o trabalho. Sem isso, qualquer fase posterior gera retrabalho.

| # | Item | Quem decide | Status |
|---|---|---|---|
| 0.1 | Razão social + CNPJ das 4 empresas emitentes | Sanchez/Mike | **RESOLVIDO** — Go Offices Latam, Co Built-To-Suit, Co-Rent, Co-Services |
| 0.2 | Caixinha (cartão Suhaila) entra no sistema? | Sanchez | **RESOLVIDO** — fora do MVP |
| 0.3 | Campos hardcode → tabelas? | PO | **RESOLVIDO** — `unidades_medida`, `formas_pagamento`, `condicoes_pagamento` viram tabelas. `urgencia` e `prioridade` ficam CHECK |
| 0.4 | Termo de isenção da recepção | RH/Diretoria | **RESOLVIDO** — codificar fluxo agora; termo a parte |
| 0.5 | Camadas de aprovação | Sanchez | **RESOLVIDO** — 2 camadas (gestor → diretoria por alçada). Comprador apenas executa |
| 0.6 | Lista inicial de rotas | Tech Lead | **RESOLVIDO** — proposta padrão aceita (ver Anexo A no fim deste doc) |
| 0.7 | Lista inicial de perfis padrão | Tech Lead | **RESOLVIDO** — só **DEV + ADMIN** no seed; resto criamos via UI |

**Critério de pronto da fase:** todos os itens acima respondidos por escrito.

**Status atual:** 7 de 7 resolvidos. Pronto para iniciar Fase 1.

---

## Fase 1 — Backend: Banco de Dados

Recriar o banco do zero com as 38 tabelas + triggers + views + seed mínimo.

### Tarefas

1. **Backup do banco atual** (mesmo não estando em produção)
2. **DROP SCHEMA public CASCADE** + recriar
3. **Extensões**: `pgcrypto` para `gen_random_uuid()`
4. **Criar 42 tabelas** em ordem de dependência (Identidade → Listas Cadastráveis → Catálogo → Estoque → Solicitações → Entregas → Compras → Auditoria → Permissões)
5. **Índices** (~50, conforme listados em [tabelas.md](tabelas.md))
6. **Funções**:
   - `fn_set_updated_at()` (genérica, aplicada em massa)
   - `fn_aplicar_movimentacao()` (mantém saldo de `estoques_unidade`)
   - `fn_recebimento_gera_movimentacao()` (recebimento `complete` → `entry`)
   - `fn_recalcular_contrato_consumido()` (NF debita contrato)
   - `fn_gerar_numero_legivel()` (SOL/SC/COT/PED/LOTE/CTR)
   - `fn_log_status_change()` (mudança de status grava em `log_atividades`)
7. **Triggers**: aplicar nas tabelas certas
8. **Views**: `emprestimos_ativos`, `emprestimos_atrasados`, `solicitacoes_pendentes`, `pedidos_aguardando_aprovacao`, `contratos_proximos_vencimento`, `estoques_abaixo_minimo`, `solicitacoes_tempo_etapas`
9. **Seed inicial**:
   - **Moedas**: BRL, USD, EUR
   - **Empresas emitentes**: 4 placeholders (`EMPRESA-1` a `EMPRESA-4`) — substituir pelos dados reais quando 0.1 for resolvido
   - **Unidades de medida**: `un, kg, m, l, cx, par, conjunto, dz` (com nomes legíveis)
   - **Formas de pagamento**: `pix, cartao_credito, cartao_debito, boleto, transferencia, dinheiro`
   - **Condições de pagamento**: `a_vista (0d), 7_dias, 15_dias, 30_dias, 30_60, 30_60_90, 60_dias`
   - **Categorias básicas**: Mobiliário, Eletrônicos, Limpeza, Café, Construção, Material de Escritório
   - **Categorias de fornecedor**: E-commerce, Distribuidor, Fabricante, Prestador de Serviço, Marketplace
   - **Perfis padrão**: apenas DEV (acesso total) + ADMIN (acesso a todos os cadastros)
   - **Rotas do sistema**: ~33 rotas (ver Anexo A no fim do plano)
   - **Vínculo perfil DEV → todas as rotas** (com `pode_ler=pode_escrever=pode_excluir=pode_aprovar=true`)
   - **Vínculo perfil ADMIN → rotas administrativas** (`admin.*`, `cadastros.*`, leitura ampla, sem aprovação)
10. **Smoke test**: inserir 1 usuário, 1 unidade, 1 item, 1 movimento; verificar saldo automático

### Critério de pronto

- [ ] `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'` retorna 42
- [ ] Trigger de movimentação atualiza saldo corretamente (testar com SQL direto)
- [ ] Trigger de contrato debita ao vincular NF (testar com SQL direto)
- [ ] Seed permite login do usuário DEV inicial

### Dependências
Fase 0 — apenas 0.1 (CNPJs reais) ainda pendente, mas não bloqueia (placeholders).

---

## Fase 2 — Backend: Edge Function modular

Reescrever a Edge Function em arquivos por domínio (hoje é 1 monolito de 3.300 linhas).

### Tarefas

1. **Estrutura de pastas** dentro de `supabase/functions/<slug>/`:
   ```
   index.ts                   ← entry point Hono
   middleware/
     auth.ts                  ← validação JWT real (Supabase Auth)
     permissions.ts           ← resolver de permissão por rota
     case-conversion.ts       ← snake↔camel
     cors.ts
   routes/
     auth.ts
     usuarios.ts
     unidades.ts
     departamentos.ts
     empresas-emitentes.ts
     moedas.ts
     categorias.ts
     itens.ts
     estoques-unidade.ts
     movimentacoes.ts
     solicitacoes.ts
     lotes-entrega.ts
     confirmacoes-entrega.ts
     fornecedores.ts
     solicitacoes-compra.ts
     cotacoes.ts
     pedidos-compra.ts
     alcadas.ts
     notas-fiscais.ts
     contratos.ts
     recebimentos.ts
     log-atividades.ts
     notificacoes.ts
     perfis-acesso.ts
     rotas-sistema.ts
   services/
     numero-legivel.ts        ← geração de SOL/PED/etc
     status-machine.ts        ← validação de transição de status
     permissions-check.ts     ← consulta efetiva de permissão
   helpers/
     supabase-client.ts
     types.ts
   ```
2. **Substituir validação fake** (`getAuthToken` retorna `publicAnonKey`) por **JWT real** com `auth.getUser(jwt)`
3. **Middleware de permissão** lê rota do request, busca perfil do usuário, valida `pode_*` na rota
4. **Endpoints CRUD** padrão para cada recurso (GET list, GET :id, POST, PUT :id, DELETE :id)
5. **Endpoints específicos**:
   - `POST /solicitacoes/:id/aprovar` (técnica)
   - `POST /solicitacoes/:id/rejeitar`
   - `POST /solicitacoes/:id/separar`
   - `POST /lotes-entrega/:id/confirmar`
   - `POST /pedidos-compra/:id/aprovar` (alçada)
   - `POST /pedidos-compra/:id/rejeitar`
   - `POST /pedidos-compra/:id/reenviar` (incrementa `versao_aprovacao`)
   - `POST /recebimentos/:id/conferir`
6. **Conversão automática** snake↔camel (manter helper atual de `src/utils/api.ts`)
7. **Logs** em `log_atividades` para todas as ações relevantes
8. **Endpoint de seed** removido (seed só via SQL)

### Critério de pronto

- [ ] Cada arquivo de rota com no máximo 300 linhas
- [ ] Middleware de auth rejeita request sem JWT válido (não anon key)
- [ ] Middleware de permissão rejeita acesso não autorizado a rota
- [ ] CRUD básico funcional para todas as 38 tabelas
- [ ] Endpoints específicos (aprovar/rejeitar/etc) testados manualmente

### Dependências
Fase 1 concluída.

---

## Fase 3 — Frontend: fundação

Camada baixa do frontend: tipos, cliente API, contextos por domínio.

### Tarefas

1. **`src/types/`** — reescrever:
   - `usuario.ts`, `unidade.ts`, `item.ts`, `solicitacao.ts`, `movimentacao.ts`, `lote-entrega.ts`...
   - Tipos em pt-camelCase (`Usuario.nome`, `Solicitacao.aprovadoPorUsuarioId`)
   - Status em inglês (mantém compatibilidade com banco)
   - Apagar `purchase.ts` antigo
2. **`src/utils/api.ts`** — reescrever cliente:
   - Manter conversão snake↔camel
   - Trocar `Bearer publicAnonKey` por `Bearer accessToken` real
   - Endpoints organizados por domínio (`api.usuarios.list()`, `api.solicitacoes.aprovar(id)`)
3. **`src/utils/auth.ts`** — manter estrutura existente, ajustar para nova rota de session
4. **`src/contexts/`** — quebrar `AppContext` (1.594 linhas) em:
   - `AuthContext` — sessão, usuário corrente
   - `UnidadesContext` — unidades + departamentos + empresas
   - `CatalogoContext` — itens + categorias + fornecedores
   - `EstoqueContext` — saldos + movimentações
   - `SolicitacoesContext` — solicitações operacionais
   - `EntregasContext` — lotes + confirmações
   - `ComprasContext` — solicitações_compra + cotações + pedidos + NFs + contratos
   - `PermissoesContext` — perfis + rotas + permissão efetiva (substitui `AllowedTabsProvider`)
   - **OU** migrar tudo para **TanStack Query** (recomendação: avaliar custo)
5. **Hook `useRota(codigo)`** retorna `{ podeLer, podeEscrever, podeExcluir, podeAprovar }`
6. **`src/lib/format.ts`** — manter helpers de formatação (datas, status, badges) com novos status

### Critério de pronto

- [ ] App roda local sem erros de tipo
- [ ] Login funciona com JWT real
- [ ] Hook de permissão bloqueia render de botão quando `podeEscrever=false`
- [ ] Cada contexto tem no máximo 400 linhas (vs 1.594 atual)

### Dependências
Fase 2 concluída.

---

## Fase 4 — Frontend: telas administrativas

Cadastros e configuração inicial. Sem fluxos operacionais ainda.

### Tarefas

1. **Login & sessão** (reaproveita `src/components/auth/`)
2. **Layout** (reaproveita `AppLayout` + `AppSidebar`, adapta sidebar para ler `rotas_sistema`)
3. **Cadastro de Perfis e Rotas**:
   - Tela de perfis (CRUD) com lista de rotas e checkboxes de permissão
   - Tela de rotas do sistema (CRUD — só DEV)
   - Tela de usuários com atribuição de perfis (N) + rotas extras
4. **Cadastros básicos** (CRUD):
   - Unidades (com andares JSONB editável)
   - Departamentos (com responsável)
   - Empresas emitentes (CNPJ)
   - Moedas
   - **Unidades de medida** (`un`, `kg`, `m`, `l`, `cx`...)
   - **Formas de pagamento** (`pix`, `cartao_credito`, `boleto`...)
   - **Condições de pagamento** (`a_vista`, `30_dias`, `30_60_90`...)
   - Categorias
   - Itens (catálogo unificado, com `eh_movel`)
   - Categorias de fornecedor
   - Fornecedores (PJ ou PF)

### Critério de pronto

- [ ] DEV consegue criar todos os cadastros via UI
- [ ] Sidebar é renderizada dinamicamente a partir das rotas permitidas
- [ ] Permissões granulares (ler/escrever/excluir) funcionam visualmente

### Dependências
Fase 3 concluída.

---

## Fase 5 — Frontend: fluxos operacionais

Estoque + Solicitações + Entregas. Núcleo do sistema.

### Tarefas

1. **Estoque**:
   - Listagem `estoques_unidade` por unidade (saldo + alerta abaixo do mínimo)
   - Tela de movimentações (filtros por tipo/item/unidade/período)
   - Form de nova movimentação (entry/exit/transfer/disposal/adjustment)
   - Histórico do item (timeline)
2. **Solicitações operacionais** (4 tipos numa única tela com filtro por `tipo`):
   - Form de criação (campos variam por tipo)
   - Listagem com badges de status
   - Tela de detalhe com **timeline** (lê `log_atividades`)
   - Botões de aprovação (gestor / designer / controlador) gated por permissão `pode_aprovar`
   - Confirmação por QR Code (daily code)
3. **Lotes de entrega**:
   - Almoxarife agrupa solicitações em lote
   - Atribuição de motorista
   - Geração de QR Code
   - Motorista vê fila de entregas
4. **Confirmações**:
   - 3 tipos: `driver_delivery`, `reception_receipt`, `requester_confirm`
   - Foto + assinatura + geolocalização
   - Validação por daily code

### Critério de pronto

- [ ] Solicitante cria pedido de material; almox separa; motorista entrega; recepção recebe; CL confere — fluxo end-to-end rodando
- [ ] Empréstimo: solicitante pede; controlador aprova; almox libera; tomador recebe; tomador devolve
- [ ] Móvel: controlador pede; designer aprova; almox separa; motorista entrega
- [ ] Retirada de móvel: solicitante pede; designer decide armazenar/descartar; almox processa
- [ ] Saldo de estoque atualiza automaticamente (verificar via SQL)
- [ ] Timeline aparece corretamente em cada solicitação

### Dependências
Fase 4 concluída.

---

## Fase 6 — Frontend: módulo Compras

Pipeline completo da reunião: Solicitação → Aprovação Gestor → Cotação → Aprovação Diretoria → Pedido → NF → Recebimento.

### Tarefas

1. **Solicitação de compra**:
   - Form com itens (catálogo + ad-hoc), justificativa, urgência, anexos
   - Seleção de empresa emitente (CNPJ)
   - Vinculação opcional a contrato
2. **Aprovação técnica** (gestor):
   - Tela do gestor lista pendentes
   - Aprovar / rejeitar (com motivo)
3. **Cotação**:
   - Comprador agrupa solicitações
   - Adiciona N fornecedores
   - Sistema gera **link público** com token único por fornecedor
   - Email automático (envio simples via Edge Function — sem Dexter)
   - Tela do fornecedor (rota pública) preenche valores
   - Comparativo de respostas
   - Escolha de fornecedor vencedor
4. **Pedido de compra**:
   - Geração a partir de cotação
   - Local de entrega (estoque ou unidade direta)
   - Aprovação por **alçada** (`alcadas_aprovacao` + departamento)
   - Versionamento de aprovação (resend)
   - Histórico em `pedidos_compra_aprovacoes`
5. **Notas fiscais**:
   - Lançamento manual (input chave SEFAZ + valores + anexos)
   - Vínculo N:N com pedidos
   - Status: received → paid / cancelled / returned
6. **Contratos**:
   - CRUD com pedidos vinculados
   - Saldo calculado automaticamente
   - Bloqueio de pedido quando esgotado
7. **Recebimento**:
   - Recebimento parcial ou total
   - Quantidades: esperada/recebida/avariada/devolvida
   - Foto + conferência por CL
   - Trigger gera entrada no estoque
8. **Alçadas**:
   - Tela de cadastro de regras (faixa de valor + departamento + aprovador)

### Critério de pronto

- [ ] Solicitante cria solicitação de compra → gestor aprova → comprador cota com 3 fornecedores → fornecedor responde via link → comprador escolhe → diretor aprova por alçada → comprador envia para fornecedor → NF lançada → recebimento → entrada no estoque
- [ ] Cancelamento e re-aprovação funcionam
- [ ] Contrato debita corretamente
- [ ] Pedido bloqueado se contrato esgotado

### Dependências
Fase 5 concluída.

---

## Fase 7 — Auditoria, Notificações e Polimentos

Funcionalidades transversais que ficam visíveis em todo o sistema.

### Tarefas

1. **Timeline genérica** (componente reutilizável que lê `log_atividades`)
2. **Tela de notificações in-app** (badge de não-lidas, marcar como lido, arquivar)
3. **Dashboard "tempo por etapa"** (gargalos de aprovação) usando view `solicitacoes_tempo_etapas`
4. **Dashboard "estoques abaixo do mínimo"** (alerta de ressuprimento)
5. **Dashboard "empréstimos atrasados"**
6. **Dashboard "contratos próximos do vencimento"**
7. **Dashboard "pedidos aguardando aprovação"** (visão do diretor)
8. **Auto-logout por inatividade** (manter `useInactivityLogout`)
9. **Dark mode** (manter `ThemeContext`)
10. **Eslint + Prettier + Husky** (configurar do zero)
11. **GitHub Actions**: lint + typecheck + build em PRs

### Critério de pronto

- [ ] Cada solicitação/pedido tem timeline visível
- [ ] Notificação aparece quando aprovação é necessária
- [ ] Dashboards renderizam dados reais
- [ ] CI roda em PRs

### Dependências
Fase 6 concluída.

---

## Fora de escopo desta reconstrução (V2)

Listado para registro. **NÃO fazer agora.**

| Item | Por quê fica para V2 |
|---|---|
| Integração **Omie** (sync bidirecional) | Reunião pediu, mas exige decisão sobre 4 contas Omie + credenciais |
| Integração **Mercado Livre** (status + NF auto) | Depende de OAuth ML + estudo técnico |
| Integração **Network Go** (recepção) | Network Go expõe API? Depende de Angela |
| Integração **Dexter** (WhatsApp + OCR PDF) | Funcionalidade extra, não bloqueia MVP |
| Compra recorrente / assinaturas | Citado mas sem desenho de fluxo |
| Multi-moeda real (conversão) | Há `moedas` mas conversão não foi modelada |
| Aprovação fora do horário / delegação SLA | Complexo, V2 |
| PWA / uso offline (motorista) | Bom ter, não bloqueia |

---

## Reaproveitamento de código

### MANTER (com pequenos ajustes)
- `src/components/ui/*` — shadcn/ui completo (51 componentes)
- `src/components/layout/AppLayout.tsx` e `AppSidebar.tsx` (adaptar p/ ler rotas dinâmicas)
- `src/hooks/useNavigation.ts`
- `src/hooks/useInactivityLogout.ts`
- `src/components/auth/LoginPage.tsx`, `ResetPasswordPage.tsx`, `ChangePasswordDialog.tsx`
- `src/lib/utils.ts`, `src/lib/format.ts` (atualizar status novos)
- `src/components/shared/QRCodeScanner.tsx`, `DeliveryQRCode.tsx`, `DailyCodeDisplay.tsx`
- `src/utils/dailyCode.ts`
- `src/utils/auth.ts` (ajustar endpoints)
- Estilos: `src/index.css`, `src/styles/`
- Configuração: `vite.config.ts`, `tsconfig.json`, `tailwind`, `components.json`

### REESCREVER
- `src/contexts/AppContext.tsx` (1.594 linhas → vários menores)
- `src/contexts/PurchaseContext.tsx` (vira `ComprasContext` com novos endpoints)
- `src/utils/api.ts` (cliente novo com endpoints organizados)
- `src/types/index.ts` e `src/types/purchases.ts` (tipos novos pt-camelCase)
- Todos os dashboards específicos por perfil (vão virar telas dinâmicas baseadas em rotas permitidas)
- `supabase/functions/<slug>/index.ts` (3.300 linhas → arquivos modulares)

### DESCARTAR
- `src/lib/mockData.ts` (30 KB de seed mockado)
- `src/components/panels/TestFlowPanel.tsx`
- `src/SQL-MIGRATION-FURNITURE-REQUESTS.md` e `INSTRUCOES-RAPIDAS.md`
- Edge Function endpoints `/seed`, `/migrate-*`, `/init-schema`, `/fix-delivery-tables`
- Endpoints e código de `furniture-*`, `loans` (legados, agora unificados)
- `purchase_audit_logs` (substituído por `log_atividades`)
- `kv_store_46b247d8` (resíduo do MVP)
- Arquivos resíduo: `test.txt`, `src/test.ts`, `src/test.tsx`

---

## Riscos

| Risco | Probabilidade | Mitigação |
|---|---|---|
| Decisões da Fase 0 atrasam | Alta | Cada item tem dono nomeado; bloquear início da Fase 1 sem 0.1 + 0.6 + 0.7 |
| Sistema de permissões dinâmicas se torna complexo | Média | Começar com modelo simples (4 flags) e evoluir só se aparecer demanda |
| Contextos divididos quebram performance (muitos providers) | Baixa | Avaliar TanStack Query desde já como alternativa |
| Reescrita do Edge Function trava por dependência circular | Baixa | Estrutura de pastas planejada na Fase 2 evita isso |
| Frontend precisa de telas que não foram listadas | Média | Cada fase tem espaço para refinamento; não tentar entregar 100% na primeira passada |
| Caixinha (P0.2) bagunça contas a pagar | Média | Decisão de gestão; tecnicamente é só registrar como NF tipo "caixinha" |
| Compras via Mercado Livre sem integração ML real | Alta | MVP: comprador lança manualmente como se fosse fornecedor comum |

---

## Estimativa grosseira de esforço

| Fase | Esforço | Quem |
|---|---|---|
| 0 — Pré-requisitos | 2-3 dias (calendário) | PO + stakeholders |
| 1 — Banco | 3-5 dias | 1 backend |
| 2 — Edge Function | 8-12 dias | 1 backend |
| 3 — Frontend fundação | 5-7 dias | 1 frontend |
| 4 — Telas admin | 8-10 dias | 1 frontend |
| 5 — Fluxos operacionais | 12-15 dias | 1 frontend (idealmente 2) |
| 6 — Compras | 15-20 dias | 1 frontend (idealmente 2) |
| 7 — Polimentos | 5-7 dias | 1 frontend |
| **Total** | **~60-80 dias-pessoa** | |

> Estimativa otimista assumindo equipe enxuta e sem retrabalho grande. Realisticamente: somar 30% de buffer.

---

## Sequência mínima de marcos visíveis

Para ter algo demonstrável o quanto antes:

1. **Marco 1 (fim da Fase 1)**: banco rodando, seed populado, possível ver no Supabase Studio
2. **Marco 2 (fim da Fase 4)**: DEV consegue cadastrar tudo via UI (ainda sem fluxo operacional)
3. **Marco 3 (fim da Fase 5)**: solicitação de material end-to-end funciona — primeiro caso de uso real
4. **Marco 4 (fim da Fase 6)**: pipeline de compras funciona — segundo caso de uso real
5. **Marco 5 (fim da Fase 7)**: sistema completo, pronto para piloto numa unidade

---

## Anexo A — Lista inicial de rotas (`rotas_sistema`)

33 rotas iniciais agrupadas em 7 módulos. Esta é a carga do seed.

### Módulo `admin` (gestão de usuários, permissões e parametrização)

| `codigo` | `nome` | Descrição |
|---|---|---|
| `admin.usuarios` | Usuários | CRUD de usuários e atribuição de perfis |
| `admin.unidades` | Unidades | CRUD de unidades e andares |
| `admin.departamentos` | Departamentos | CRUD de setores |
| `admin.empresas-emitentes` | Empresas Emitentes | CRUD dos CNPJs Gowork |
| `admin.perfis-acesso` | Perfis de Acesso | CRUD de perfis e atribuição de rotas |
| `admin.rotas-sistema` | Rotas do Sistema | CRUD de rotas (só DEV) |
| `admin.alcadas-aprovacao` | Alçadas | Configuração de aprovadores por valor + departamento |

### Módulo `cadastros` (catálogos auxiliares)

| `codigo` | `nome` |
|---|---|
| `cadastros.moedas` | Moedas |
| `cadastros.categorias` | Categorias de Itens |
| `cadastros.itens` | Itens (Catálogo) |
| `cadastros.fornecedores` | Fornecedores |
| `cadastros.categorias-fornecedor` | Categorias de Fornecedor |
| `cadastros.unidades-medida` | Unidades de Medida |
| `cadastros.formas-pagamento` | Formas de Pagamento |
| `cadastros.condicoes-pagamento` | Condições de Pagamento |

### Módulo `estoque`

| `codigo` | `nome` |
|---|---|
| `estoque.saldos` | Saldos por Unidade |
| `estoque.movimentacoes` | Movimentações |

### Módulo `solicitacoes` (operacionais)

| `codigo` | `nome` |
|---|---|
| `solicitacoes.material` | Pedido de Material |
| `solicitacoes.movel` | Solicitação de Móvel |
| `solicitacoes.retirada-movel` | Retirada de Móvel |
| `solicitacoes.emprestimo` | Empréstimo |
| `solicitacoes.aprovacao-gestor` | Aprovação Gestor |

### Módulo `entregas`

| `codigo` | `nome` |
|---|---|
| `entregas.lotes` | Lotes de Entrega |
| `entregas.recepcao` | Recepção (recebimento físico) |
| `entregas.conferencia` | Conferência (CL/Assistente) |

### Módulo `compras`

| `codigo` | `nome` |
|---|---|
| `compras.solicitacoes` | Solicitações de Compra |
| `compras.cotacoes` | Cotações |
| `compras.pedidos` | Pedidos de Compra |
| `compras.aprovacao-diretoria` | Aprovação Diretoria |
| `compras.notas-fiscais` | Notas Fiscais |
| `compras.contratos` | Contratos |
| `compras.recebimentos` | Recebimentos |

### Módulo `auditoria`

| `codigo` | `nome` |
|---|---|
| `auditoria.timeline` | Timeline (log de atividades) |
| `auditoria.notificacoes` | Notificações |

### Total: 33 rotas no seed inicial

Novas rotas podem ser cadastradas a qualquer momento via tela `admin.rotas-sistema` (acessível apenas pelo perfil DEV).
