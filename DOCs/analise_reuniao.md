# Análise da Reunião — Módulo de Compras

Reunião de ~1h21min com 3 participantes definindo o escopo do módulo de **Compras** que está em desenvolvimento. Documento bruto (transcrição de áudio com algumas confusões de fala). Abaixo, a destilação útil.

---

## 1. Atores

| Palestrante | Papel | Contribuição |
|---|---|---|
| **Palestrante 1** (líder/produto) | Conduziu a reunião, decisões finais, conhece o sistema técnico | Define arquitetura e prioridades |
| **Palestrante 2 — Kat / Ketty** | Especialista de compras na operação atual (Goevo + Omie) | Trouxe todas as dores reais e o fluxo prático |
| **Palestrante 3 — Thiago** | Desenvolvedor do sistema novo | Validou viabilidade técnica das ideias |

---

## 2. Decisões Tomadas (consolidadas)

### 2.1 Pipeline final: 3 objetos, 5 fases

```
[Solicitação] → [Aprovação Gestor (técnica/sem valor)] → [Cotação] → [Aprovação Diretoria (com valor, alçada)] → [Pedido]
                                                            ↑
                                            (1 ou N fornecedores;
                                             antigo "pré-pedido" eliminado)
```

**Decisão importante:** o conceito de "pré-pedido" da Goevo foi **eliminado**. Como pré-pedido e cotação têm os mesmos campos, fica apenas **cotação** (que pode ter 1 fornecedor único ou múltiplos para comparação).

### 2.2 Aprovações: 2 camadas (não 3)

| Camada | Aprovador | O que vê | Quando |
|---|---|---|---|
| **1ª — Gestor da área** | Daniel (obras), Amanda (arquitetura), Suhaila (facilities)... | Solicitação **sem valor** | Logo após solicitação |
| **2ª — Diretoria** | Sanchez até R$ 4.999 / Mike a partir de R$ 5.000 | Pedido **com valor**, fornecedor, anexos | Após cotação fechada |

Já está modelado em `purchase_approval_config` (alçadas por valor + departamento), mas hoje o sistema **pula a 1ª camada** — vai direto pra 2ª. Bug a corrigir.

### 2.3 Integração Omie (CRÍTICA)

- **Eliminar o vai-e-volta** entre sistema interno e Omie
- Cadastros (fornecedor, produto) **passam a ser feitos no novo sistema** com botão "Sincronizar com Omie"
- **Rotina automática**: 1x/dia + botão manual (restrito a admin/gestor) para sync sob demanda
- Notas fiscais lançadas no novo sistema → vão automaticamente para `contas a pagar` do Omie
- Período inicial: auditoria dupla (operador confere os dois sistemas)

### 2.4 Recebimento (a maior dor de cabeça)

Decisão final pragmática:

| Quem | Responsabilidade | Como |
|---|---|---|
| **Recepção (terceirizada)** | Recebe pacote, **NÃO confere conteúdo** | Aba "Entregas Gowork" dentro do **Network Go** (sistema deles) |
| **CL / Assistente solicitante** | Confere quantidade e qualidade | Notificação Dexter + WhatsApp ao recepcionar; abre o pedido no sistema |
| **Outro CL/Assistente** (substituto) | Pode receber em nome do solicitante | Fica como **responsável** no log |

**Mecanismo de auditoria:** log de quem-recebeu-quando + quem-conferiu-quando. Termo de isenção da recepção sobre conteúdo.

### 2.5 Múltiplas notas fiscais por pedido

- 1 pedido pode ter N notas fiscais (ex: 10 cadeiras em 5 pacotes do Mercado Livre = 5 notas)
- Status "entrega parcial" enquanto não vincular todas
- **Não** será detalhado "qual item está em qual nota" — só vínculo nota↔pedido (decisão consciente para simplificar)

### 2.6 Pedidos de múltiplos solicitantes unificados

- 2 solicitações idênticas (ex: cadeiras de unidades diferentes) → 1 cotação → 1 pedido
- Mecanismo similar ao **lote de entregas** que já existe
- Modelo: Cotação tem N solicitações + N fornecedores

### 2.7 Local de entrega

- Campo presente na **cotação** e no **pedido**
- Pré-preenchido como "Estoque Central"
- Permite alterar para qualquer unidade (entrega direta)
- **Lógica do estoque:** se entrega for direta na unidade, **NÃO** passar pelo estoque — fazer transferência lógica direto fornecedor→unidade

### 2.8 Contratos

Hierarquia: **Contrato → Pedidos → Notas Fiscais**

- Contrato tem: valor total, fornecedor, departamento, centro de custo, data início/fim
- Cada pedido emitido **debita** do contrato
- Sistema **bloqueia** novo pedido se contrato esgotou
- Nota fiscal vai automaticamente baixando o saldo
- Hoje quem controla é o engenheiro Daniel **via planilha** — risco de erro humano

### 2.9 CNPJs múltiplos (4 empresas)

- Mencionados: **Goevo Offices**, **Co-Services**, e mais 2 (não nominados)
- Co-Services usa: café, sachê de açúcar, materiais de copa/limpeza recorrentes
- Resto vai para Goevo Offices (provavelmente)
- Sistema deve **pré-selecionar** o CNPJ por categoria de produto e permitir alterar

### 2.10 Indicadores / Kanban

- Visualização Kanban por etapa (sem drag-and-drop, só visual)
- Tempo em cada etapa (alerta para "ficou 30 dias na mesa do gestor")
- Histórico por produto / centro de custo / período (essa parte já é replicação do que existe na Goevo)

---

## 3. Funcionalidades Avançadas Citadas (priorizar depois)

| # | Feature | Quem usa | Esforço |
|---|---|---|---|
| 1 | E-mail automático ao fornecedor com link de cotação | Compras | **Já parcialmente implementado** em `quotations` (`linkPreenchimento`) |
| 2 | Dexter (LLM) lê PDF de orçamento e preenche cotação automaticamente | Compras | Alto — integração com IA |
| 3 | Integração API Mercado Livre (status pedido + nota fiscal automática) | Compras + Recebimento | Médio — depende de OAuth ML |
| 4 | Notificação WhatsApp via Dexter quando pacote chega | CLs/Assistentes | Baixo se Dexter já existe |
| 5 | Sugestão de fornecedor baseada em histórico do produto | Compras | Médio (ML/lookup) |
| 6 | Dashboard de tempo médio por etapa (gargalos de aprovação) | Diretoria | Médio (já é só agregar log) |
| 7 | Bloqueio automático de pedido quando contrato esgotou | Compras + Obras | Baixo (já tem `valor_consumido`/`saldo` em `purchase_contracts`) |

---

## 4. Comparativo: o que já existe × o que falta

### Já implementado (parcialmente) no schema atual

| Conceito da reunião | Tabela atual | Status |
|---|---|---|
| Solicitação | `purchase_requests` (com `itens`, `aprovacoes` JSONB) | OK |
| Cotação multi-fornecedor | `purchase_quotations` | OK |
| Pedido | `purchase_orders` (com `notas_fiscais` JSONB, `numero_omie`) | OK |
| Aprovação por alçada | `purchase_approval_config` (valor_min/max + role + dept) | OK no banco |
| Itens normalizados do pedido | `purchase_order_items` | OK |
| Histórico de aprovação versionado | `purchase_order_approvals` (com `versao`) | OK |
| Recebimento | `purchase_receivings` (parcial/total) | OK |
| Contratos com baixa por NF | `purchase_contracts` + trigger `recalculate_contract_consumed` | **OK e elegante** — já usa NFs do JSONB para recalcular |
| Fornecedores | `purchase_suppliers` (CNPJ, dados bancários) | OK |
| Centros de custo | `org_cost_centers` | OK |
| Departamentos | `org_departments` | OK |
| Moedas | `org_currencies` | OK |
| Centro de custo vinculado a contrato | `purchase_contracts.centro_custo_id` | OK |

### Gaps do schema atual em relação à reunião

| Item da reunião | Gap | Impacto |
|---|---|---|
| **Pré-pedido eliminado** | Frontend ainda diferencia pré-pedido vs cotação | Refatoração frontend |
| **2 camadas de aprovação respeitadas** | Sistema atual pula a 1ª (bug citado) | Crítico — investigar |
| **CNPJ por empresa (4 CNPJs)** | Não há tabela `empresas`/`cnpjs_emitentes` no banco. Hoje `cnpj_solicitante` é texto livre em `purchase_requests` | Modelar |
| **Categoria → CNPJ padrão** (Co-Services vs Goevo Offices) | Não existe regra de roteamento por categoria | Modelar |
| **Pedido único agrupando N solicitações** | `purchase_orders.cotacao_id` é 1:1 com cotação. Não há ligação direta múltipla pedido↔solicitações | Modelar (provavelmente via cotação que une N solicitações) |
| **Local de entrega na cotação/pedido** | Não há campo `local_entrega` em `purchase_orders`/`purchase_quotations` | Adicionar coluna |
| **Integração Omie bidirecional automatizada** | Hoje só tem `numero_omie` como referência manual | Construir job de sync |
| **Integração Mercado Livre (status + NF auto)** | Inexistente | Construir integração |
| **Integração Network Go (recepção)** | Inexistente | Construir integração |
| **Notificação Dexter/WhatsApp** | Há `notifications` interna, mas sem canal externo | Construir webhook Dexter |
| **Dashboard de tempo por etapa** | Não há `purchase_audit_logs` específico para compras (só genérico citado em `doc.md`) | Modelar — usar `log_atividades` proposto no `schema-novo.md` |
| **Categorização de produto → CNPJ/Co-Services** | Sem regra | Adicionar campo em `stock_items` (tipo `cnpj_emitente_padrao`) |

---

## 5. Pontos de Atenção (riscos e ambiguidades)

### 5.1 Decisões pendentes na própria reunião

A reunião encerrou com vários "isso vai ser discutido depois". Lista do que ficou aberto:

1. **API Mercado Livre** — depende de estudo técnico (OAuth, escopo de leitura) que ninguém validou ainda
2. **API Network Go** — não está claro se Network Go expõe API ou se a integração será via webhook reverso
3. **Termo de isenção da recepção** — questão jurídica/RH (não técnica), mas afeta o fluxo
4. **CNPJs específicos** — só 2 dos 4 foram nomeados (Goevo Offices, Co-Services)
5. **Quem trata caixinha (cartão Suhaila)** — citado como "furo" mas não houve decisão de como entrar no sistema
6. **Integração RL** — Angela mencionou trocar para sistema com API; depende de cronograma externo
7. **Dexter ler PDF de orçamento** — citado como ideia "extra", sem priorização

### 5.2 Inconsistências internas da reunião

- Em vários momentos foi dito "duas aprovações", mas a sequência narrada tem na verdade **3 pessoas** envolvidas (gestor da área + diretor por alçada + comprador interno) — vale revalidar com Sanchez
- A Kat afirma que "no sistema novo, o solicitante seleciona aprovador SC e técnico" — isso conflita com a regra de alçada automática. **Como reconciliar?** Provavelmente: técnico é manual (escolhe-se o gestor da área); diretoria é automático (pelo valor). Mas precisa confirmar.
- "Pedido pode ter mais de uma nota fiscal" mas "não vamos detalhar o que tem em cada nota" — perde-se rastreabilidade fiscal granular. Decisão consciente para reduzir complexidade, mas tem custo na hora de auditoria CAPEX (foi citado como dor própria do líder).

### 5.3 Pontos NÃO abordados na reunião e que vão aparecer na implementação

| Tema | Por que importa |
|---|---|
| **Cancelamento e re-cotação** | Como cancelar um pedido já enviado ao fornecedor? Reabrir cotação? |
| **Notas fiscais de DEVOLUÇÃO** | O que acontece quando produto é devolvido ao fornecedor? Como entra no Omie? |
| **Anexos em cada etapa** (orçamento PDF, contrato, NF) | Bucket Supabase Storage já existe, mas estrutura não foi discutida |
| **Compra recorrente / assinaturas** (ex: café mensal) | Mencionado mas sem desenho de fluxo |
| **Aprovação fora do horário comercial** | Se aprovação leva 30 dias, alguém precisa de delegação/SLA |
| **Multi-moeda real** | Existe `org_currencies` mas como funciona conversão? |
| **Fornecedor PJ vs PF** | Tem campo CNPJ — e quando for autônomo (CPF)? |
| **NF de serviço × NF de produto** | Tributação diferente, mas o fluxo é o mesmo? |
| **Permissões dentro de Compras** | Ex: comprador A vê só seus pedidos? |
| **Auditoria de mudança de fornecedor pós-cotação** | Comum trocar fornecedor por causa de OS — como rastrear? |

---

## 6. Recomendações Prioritárias

### Curto prazo (validar com Kat e Sanchez antes de codificar)

1. **Confirmar 2 vs 3 camadas de aprovação** com Sanchez
2. **Listar os 4 CNPJs** completos (com razão social) e a regra de roteamento
3. **Validar com Angela** se Network Go terá API e em qual prazo
4. **Pedir à Kat o levantamento de categorias→CNPJ→fornecedor padrão** (ela tem isso na cabeça mas não documentado)
5. **Definir se "compra via caixinha"** entra no sistema (e como)

### Médio prazo (modelo de dados)

6. **Adicionar tabela `empresas_emitentes`** (4 CNPJs como entidades) e FK em `purchase_orders.empresa_emitente_id`
7. **Adicionar `local_entrega_unidade_id`** em `purchase_quotations` e `purchase_orders`
8. **Adicionar `cnpj_emitente_padrao_id`** em `stock_items` (categoria de produto sugere CNPJ)
9. **Modelar relação N:N solicitações ↔ cotação** (hoje é 1:1) — uma cotação agrega múltiplas solicitações idênticas
10. **Aplicar a proposta de `log_atividades`** do `schema-novo.md` para registrar tempo em cada fase

### Longo prazo (integrações)

11. **Job de sincronização Omie** (rotina diária + botão manual)
12. **Integração API Mercado Livre** (POC primeiro)
13. **Webhook Network Go** ↔ módulo de Recebimento
14. **Conector Dexter** para WhatsApp + leitura de PDF de cotação

---

## 7. Próximos Passos definidos NA reunião

> "Eu vou transcrever isso daqui, montar um escopo mais detalhado, vou passar pro Thiago, ele vai bater com as coisas que ele tem ali, depois provavelmente vai montar um Mock, aí esse Mock a gente vai te apresentar, mostrar como ele vai funcionar. Depois que montar esse Mock a gente desenvolve com produção efetiva."

**Sequência ideal:**
1. Transcrever ✅ (este `reuniao.md`)
2. **Escopo detalhado** ⏳ (pode ser este documento de análise como base)
3. **Bater com Thiago** sobre aderência ao código atual ⏳
4. **Mock visual** (Figma/protótipo) — pendente
5. **Validação com Sanchez** — pendente
6. **Desenvolvimento** — pendente

---

## 8. Conclusão

A reunião foi **rica em decisões operacionais** (pipeline, recebimento, integrações) mas **frágil em modelagem técnica** — várias coisas foram ditas em alto nível e cabem múltiplas implementações. O schema atual de compras (11 tabelas em `purchase_*`) cobre **uns 70%** do que foi discutido; faltam principalmente:

- Modelagem das **4 empresas emitentes** (CNPJs)
- Relação **N solicitações → 1 cotação → 1 pedido**
- Campo de **local de entrega** explícito
- **Integrações externas** (Omie sync bidirecional, Mercado Livre, Network Go, Dexter)
- **Roteamento por categoria** (categoria de produto → CNPJ + Co-Services vs Goevo)

O ponto mais sensível é a **dor de recebimento** — não é problema técnico, é organizacional: ninguém quer assumir conferência. A solução proposta (recepção recebe sem responsabilidade + CL confere) precisa de **suporte da diretoria via termo formal** antes de virar fluxo. Sem isso, qualquer sistema vai apanhar.

**Antes de qualquer linha de código nova de compras**, recomendo:

1. Reservar 30 min com a Kat para fechar os pontos da seção 5.1
2. Reservar 30 min com Sanchez para validar a arquitetura de aprovação e os 4 CNPJs
3. Decidir se compras será refatorada **junto** com a refatoração de schema do core (ver `schema-novo.md` pendência #9) ou **depois**

Quando essas respostas vierem, aí sim faz sentido o Mock e o desenvolvimento. Posso transformar esta análise num documento estruturado em `DOCs/escopo-compras.md` se você quiser ter tudo num só lugar.