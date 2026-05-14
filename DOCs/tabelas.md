# Tabelas do Sistema — SupplyGo

Lista direta. **42 tabelas** (39 core + 3 auxiliares N:N). Nomes em pt-br snake_case. Valores de enum em inglês.

---

## Identidade & Organização

### `usuarios`

Pessoas que usam o sistema. Vinculado ao Supabase Auth. **Não tem perfil hardcoded** — perfis vêm de `usuarios_perfis` (N:N com `perfis_acesso`).


| Coluna                    | Tipo        | Descrição                              |
| ------------------------- | ----------- | -------------------------------------- |
| id                        | uuid PK     |                                        |
| auth_usuario_id           | uuid UK     | FK p/ auth.users do Supabase           |
| nome                      | text        |                                        |
| email                     | text UK     |                                        |
| cargo                     | text        |                                        |
| unidades_ids              | uuid[]      | unidades que o usuário atende          |
| departamento_id           | uuid FK     |                                        |
| codigo_diario             | text        | 6 dígitos do dia (QR de entrega)       |
| codigo_diario_gerado_em   | timestamptz |                                        |
| exige_troca_senha         | boolean     |                                        |
| ativo                     | boolean     |                                        |
| criado_em / atualizado_em | timestamptz |                                        |


---

### `unidades`

Prédios/escritórios da Gowork.


| Coluna                    | Tipo        | Descrição                     |
| ------------------------- | ----------- | ----------------------------- |
| id                        | uuid PK     |                               |
| nome                      | text        |                               |
| endereco                  | text        |                               |
| andares                   | jsonb       | `["Térreo", "1º andar", ...]` |
| status                    | text        | `active | inactive`           |
| criado_em / atualizado_em | timestamptz |                               |


---

### `departamentos`

Setores funcionais (Obras, Arquitetura, Facilities, TI...).


| Coluna                    | Tipo        | Descrição       |
| ------------------------- | ----------- | --------------- |
| id                        | uuid PK     |                 |
| nome                      | text        |                 |
| descricao                 | text        |                 |
| responsavel_usuario_id    | uuid FK     | gestor do depto |
| ativo                     | boolean     |                 |
| criado_em / atualizado_em | timestamptz |                 |


---

### `empresas_emitentes`

Os 4 CNPJs da Gowork (Goevo Offices, Co-Services, +2). Apenas o básico para identificar.


| Coluna                    | Tipo        | Descrição              |
| ------------------------- | ----------- | ---------------------- |
| id                        | uuid PK     |                        |
| razao_social              | text        |                        |
| nome_fantasia             | text        |                        |
| cnpj                      | text UK     | 14 dígitos sem máscara |
| ativo                     | boolean     |                        |
| criado_em / atualizado_em | timestamptz |                        |


---

### `moedas`

Moedas suportadas (BRL padrão).


| Coluna    | Tipo        | Descrição         |
| --------- | ----------- | ----------------- |
| id        | uuid PK     |                   |
| codigo    | text UK     | `BRL | USD | EUR` |
| simbolo   | text        | `R$ | $ | €`      |
| nome      | text        |                   |
| ativo     | boolean     |                   |
| criado_em | timestamptz |                   |


---

## Listas Cadastráveis

Tabelas auxiliares cadastráveis pelo admin (substituem enums hardcoded).

### `unidades_medida`

Unidades de medida usadas em itens e pedidos (`un`, `kg`, `m`, `l`, `cx`...).


| Coluna    | Tipo        | Descrição                            |
| --------- | ----------- | ------------------------------------ |
| id        | uuid PK     |                                      |
| codigo    | text UK     | `un`, `kg`, `m`, `l`, `cx`, `par`    |
| nome      | text        | "Unidade", "Quilograma", "Metro"...  |
| descricao | text        |                                      |
| ativo     | boolean     |                                      |
| criado_em | timestamptz |                                      |


---

### `formas_pagamento`

Formas de pagamento aceitas em cotações e pedidos.


| Coluna    | Tipo        | Descrição                                                                |
| --------- | ----------- | ------------------------------------------------------------------------ |
| id        | uuid PK     |                                                                          |
| codigo    | text UK     | `pix`, `cartao_credito`, `cartao_debito`, `boleto`, `transferencia`, `dinheiro` |
| nome      | text        | nome legível                                                             |
| descricao | text        |                                                                          |
| ativo     | boolean     |                                                                          |
| criado_em | timestamptz |                                                                          |


---

### `condicoes_pagamento`

Condições de pagamento (à vista, parcelado, etc.).


| Coluna    | Tipo        | Descrição                                                       |
| --------- | ----------- | --------------------------------------------------------------- |
| id        | uuid PK     |                                                                 |
| codigo    | text UK     | `a_vista`, `7_dias`, `15_dias`, `30_dias`, `30_60`, `30_60_90`  |
| nome      | text        | nome legível                                                    |
| descricao | text        |                                                                 |
| dias      | int         | nº de dias até vencimento (0 = à vista; null = parcelado)       |
| ativo     | boolean     |                                                                 |
| criado_em | timestamptz |                                                                 |


---

## Catálogo

### `categorias`

Agrupador livre de itens (Mobiliário, Eletrônicos, Limpeza...).


| Coluna    | Tipo        | Descrição |
| --------- | ----------- | --------- |
| id        | uuid PK     |           |
| nome      | text        |           |
| descricao | text        |           |
| ativo     | boolean     |           |
| criado_em | timestamptz |           |


---

### `itens`

Catálogo unificado de produtos E móveis (flag `eh_movel` decide o fluxo).


| Coluna                       | Tipo        | Descrição                               |
| ---------------------------- | ----------- | --------------------------------------- |
| id                           | uuid PK     |                                         |
| produto_codigo               | int UK      | código numérico legível                 |
| categoria_id                 | uuid FK     |                                         |
| nome                         | text        |                                         |
| descricao                    | text        |                                         |
| marca / modelo               | text        |                                         |
| unidade_medida_id            | uuid FK     | FK p/ `unidades_medida`                 |
| url_imagem                   | text        |                                         |
| eh_movel                     | boolean     | true = passa por designer               |
| eh_consumivel                | boolean     | item consumido (não retorna ao estoque) |
| permite_emprestimo           | boolean     |                                         |
| exige_termo_responsabilidade | boolean     |                                         |
| dias_emprestimo_padrao       | int         |                                         |
| quantidade_minima_padrao     | numeric     | alerta de ressuprimento                 |
| preco_referencia             | numeric     | última compra ou média                  |
| fornecedor_preferencial_id   | uuid FK     | sugestão automática em cotação          |
| ativo                        | boolean     |                                         |
| criado_em / atualizado_em    | timestamptz |                                         |


---

## Estoque

### `estoques_unidade`

Saldo de cada item em cada unidade.


| Coluna                    | Tipo        | Descrição               |
| ------------------------- | ----------- | ----------------------- |
| id                        | uuid PK     |                         |
| item_id                   | uuid FK     | UNIQUE com unidade_id   |
| unidade_id                | uuid FK     |                         |
| quantidade                | numeric     | CHECK >= 0              |
| quantidade_minima         | numeric     | alerta de ressuprimento |
| criado_em / atualizado_em | timestamptz |                         |


---

### `movimentacoes`

TUDO que mexe estoque. Trigger atualiza `estoques_unidade` automaticamente.


| Coluna                                 | Tipo        | Descrição                                                                  |
| -------------------------------------- | ----------- | -------------------------------------------------------------------------- |
| id                                     | uuid PK     |                                                                            |
| tipo                                   | text        | `entry | exit | transfer | loan_out | loan_return | disposal | adjustment` |
| item_id                                | uuid FK     |                                                                            |
| quantidade                             | numeric     | sempre >0 (exceto adjustment, que pode ser negativo)                       |
| usuario_id                             | uuid FK     | quem executou                                                              |
| unidade_id                             | uuid FK     | unidade afetada (entry/exit/loan/disposal/adjustment)                      |
| unidade_origem_id / unidade_destino_id | uuid FK     | usadas em transfer                                                         |
| tomador_usuario_id                     | uuid FK     | quem pegou emprestado (loan_out)                                           |
| emprestimo_devolucao_prevista          | timestamptz | data esperada de devolução                                                 |
| movimentacao_origem_id                 | uuid FK     | loan_return aponta para loan_out                                           |
| solicitacao_id                         | uuid FK     | se veio de uma solicitação                                                 |
| lote_entrega_id                        | uuid FK     | se foi entregue em lote                                                    |
| pedido_compra_id                       | uuid FK     | se foi recebimento de compra                                               |
| nota_fiscal_id                         | uuid FK     | se foi recebimento com NF                                                  |
| observacoes                            | text        |                                                                            |
| ordem_servico                          | text        | OS de execução                                                             |
| motivo_descarte                        | text        | obrigatório quando tipo=disposal                                           |
| metadados                              | jsonb       | campos raros/futuros                                                       |
| criado_em                              | timestamptz |                                                                            |


---

## Solicitações Operacionais

### `solicitacoes`

Pedidos internos: material, móvel-para-unidade, retirada-de-móvel, empréstimo. NÃO inclui compras.


| Coluna                                    | Tipo                  | Descrição                                                 |
| ----------------------------------------- | --------------------- | --------------------------------------------------------- |
| id                                        | uuid PK               |                                                           |
| numero                                    | text UK               | `SOL-2026-00001` (gerado)                                 |
| tipo                                      | text                  | `material | furniture_to_unit | furniture_removal | loan` |
| status                                    | text                  | varia por tipo (ver abaixo)                               |
| item_id                                   | uuid FK               |                                                           |
| quantidade                                | numeric               |                                                           |
| unidade_solicitante_id                    | uuid FK               |                                                           |
| solicitado_por_usuario_id                 | uuid FK               |                                                           |
| andar_destino                             | text                  | `furniture_to_unit`                                       |
| localizacao_detalhe                       | text                  | onde ficará                                               |
| justificativa                             | text                  | `furniture_to_unit`, `loan`                               |
| urgencia                                  | text                  | `low | medium | high`                                     |
| aprovado_por_usuario_id                   | uuid FK               |                                                           |
| aprovado_em                               | timestamptz           |                                                           |
| designer_usuario_id                       | uuid FK               | `furniture_*`                                             |
| designer_decidido_em                      | timestamptz           |                                                           |
| decisao_descarte                          | text                  | `storage | disposal` (`furniture_removal`)                |
| justificativa_descarte                    | text                  |                                                           |
| emprestimo_devolucao_prevista             | timestamptz           | tipo=loan                                                 |
| tomador_usuario_id                        | uuid FK               | tipo=loan                                                 |
| controlador_aprovador_id                  | uuid FK               | tipo=loan                                                 |
| motivo_rejeicao                           | text                  |                                                           |
| rejeitado_por_usuario_id                  | uuid FK               |                                                           |
| rejeitado_em                              | timestamptz           |                                                           |
| codigo_qr                                 | text                  | confirmação                                               |
| separado_por_usuario_id / separado_em     | uuid FK / timestamptz | almox que separou                                         |
| pronto_retirada_em                        | timestamptz           |                                                           |
| retirado_por_usuario_id / retirado_em     | uuid FK / timestamptz |                                                           |
| entregue_em / concluido_em / cancelado_em | timestamptz           |                                                           |
| observacoes                               | text                  |                                                           |
| criado_em / atualizado_em                 | timestamptz           |                                                           |


**Status por tipo:**

- `material`: pending → approved → awaiting_pickup → out_for_delivery → delivery_confirmed → received_confirmed → completed | rejected | cancelled
- `furniture_to_unit`: pending_designer → approved_designer → approved_storage → separated → awaiting_delivery → in_transit → pending_confirmation → completed | rejected
- `furniture_removal`: pending_designer → approved_storage|approved_disposal → awaiting_pickup → in_transit → completed | rejected
- `loan`: pending_approval → approved → awaiting_pickup → active → returned | overdue | rejected

---

## Entregas

### `lotes_entrega`

Agrupamento de solicitações que vão juntas (mesmo motorista, mesma unidade, mesmo dia).


| Coluna                                                   | Tipo        | Descrição                                                                       |
| -------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| id                                                       | uuid PK     |                                                                                 |
| numero                                                   | text UK     | `LOTE-2026-00001`                                                               |
| unidade_destino_id                                       | uuid FK     |                                                                                 |
| motorista_usuario_id                                     | uuid FK     |                                                                                 |
| codigo_qr                                                | text UK     |                                                                                 |
| status                                                   | text        | `pending | in_transit | delivered | received_confirmed | completed | cancelled` |
| despachado_em / entregue_em / recebido_em / concluido_em | timestamptz |                                                                                 |
| observacoes                                              | text        |                                                                                 |
| criado_em / atualizado_em                                | timestamptz |                                                                                 |


---

### `lotes_entrega_itens`

N solicitações por lote (tabela normalizada).


| Coluna         | Tipo        | Descrição                 |
| -------------- | ----------- | ------------------------- |
| id             | uuid PK     |                           |
| lote_id        | uuid FK     | UNIQUE com solicitacao_id |
| solicitacao_id | uuid FK     |                           |
| ordem          | int         | ordem visual p/ motorista |
| criado_em      | timestamptz |                           |


---

### `confirmacoes_entrega`

Cada confirmação gera linha (motorista entregou + recepção recebeu + solicitante conferiu).


| Coluna                    | Tipo        | Descrição                                                 |
| ------------------------- | ----------- | --------------------------------------------------------- |
| id                        | uuid PK     |                                                           |
| lote_id                   | uuid FK     |                                                           |
| solicitacao_id            | uuid FK     | confirmação individual sem lote                           |
| tipo                      | text        | `driver_delivery | reception_receipt | requester_confirm` |
| confirmado_por_usuario_id | uuid FK     | quem clicou no botão                                      |
| recebido_por_usuario_id   | uuid FK     | validado por daily_code                                   |
| url_foto                  | text        | Storage                                                   |
| url_assinatura            | text        | base64 ou Storage                                         |
| localizacao               | jsonb       | `{latitude, longitude}`                                   |
| codigo_diario             | text        | daily_code usado                                          |
| observacoes               | text        |                                                           |
| criado_em                 | timestamptz |                                                           |


---

## Compras — Cadastros

### `categorias_fornecedor`

Tipo de fornecedor (Móveis, Mercado Livre, Café, Limpeza...).


| Coluna    | Tipo        | Descrição |
| --------- | ----------- | --------- |
| id        | uuid PK     |           |
| nome      | text UK     |           |
| descricao | text        |           |
| ativo     | boolean     |           |
| criado_em | timestamptz |           |


---

### `fornecedores`

Empresas/PFs que fornecem.


| Coluna                                                             | Tipo                    | Descrição                                      |
| ------------------------------------------------------------------ | ----------------------- | ---------------------------------------------- |
| id                                                                 | uuid PK                 |                                                |
| razao_social                                                       | text                    |                                                |
| nome_fantasia                                                      | text                    |                                                |
| cnpj                                                               | text UK                 | nullable                                       |
| cpf                                                                | text UK                 | nullable (autônomo)                            |
| inscricao_estadual                                                 | text                    |                                                |
| categoria_id                                                       | uuid FK                 |                                                |
| contato_nome / contato_email / contato_telefone / contato_whatsapp | text                    |                                                |
| endereco                                                           | jsonb                   |                                                |
| dados_bancarios                                                    | jsonb                   | `{banco, agencia, conta, pix, tipo_chave_pix}` |
| total_pedidos / valor_total_comprado / ultima_compra_em            | métricas denormalizadas | atualizadas por trigger/job                    |
| nota_avaliacao                                                     | numeric                 | 0.00-5.00                                      |
| status                                                             | text                    | `active | inactive | blocked`                  |
| observacoes                                                        | text                    |                                                |
| criado_em / atualizado_em                                          | timestamptz             |                                                |


---

## Compras — Solicitações de Compra

### `solicitacoes_compra`

Pedidos de compra (ANTES da cotação). Separada de `solicitacoes` operacional.


| Coluna                                                               | Tipo        | Descrição                                                                                                                                             |
| -------------------------------------------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| id                                                                   | uuid PK     |                                                                                                                                                       |
| numero                                                               | text UK     | `SC-2026-00001`                                                                                                                                       |
| solicitante_id                                                       | uuid FK     |                                                                                                                                                       |
| unidade_id                                                           | uuid FK     |                                                                                                                                                       |
| departamento_id                                                      | uuid FK     |                                                                                                                                                       |
| empresa_emitente_id                                                  | uuid FK     | qual CNPJ vai emitir                                                                                                                                  |
| contrato_id                                                          | uuid FK     | se ligada a contrato                                                                                                                                  |
| fornecedor_sugerido_id                                               | uuid FK     | sugestão do solicitante                                                                                                                               |
| link_referencia                                                      | text        | URL externa                                                                                                                                           |
| justificativa                                                        | text        |                                                                                                                                                       |
| urgencia                                                             | text        | `low | medium | high`                                                                                                                                 |
| status                                                               | text        | `pending_manager | approved_manager | rejected_manager | in_quotation | quotation_completed | pending_director | in_purchase | completed | cancelled` |
| aprovador_gestor_id                                                  | uuid FK     | aprovador técnico                                                                                                                                     |
| gestor_aprovado_em / gestor_aprovado_por_id / gestor_motivo_rejeicao |             |                                                                                                                                                       |
| comprador_id                                                         | uuid FK     | atribuído após aprovação                                                                                                                              |
| atribuido_em                                                         | timestamptz |                                                                                                                                                       |
| anexos                                                               | jsonb       | `[{nome, url}]`                                                                                                                                       |
| cancelado_em / motivo_cancelamento                                   |             |                                                                                                                                                       |
| criado_em / atualizado_em                                            | timestamptz |                                                                                                                                                       |


---

### `solicitacoes_compra_itens`

Itens de uma solicitação de compra.


| Coluna           | Tipo    | Descrição              |
| ---------------- | ------- | ---------------------- |
| id               | uuid PK |                        |
| solicitacao_id   | uuid FK | ON DELETE CASCADE      |
| item_id          | uuid FK | nullable (item ad-hoc) |
| descricao         | text    | obrigatório            |
| codigo            | text    | SKU comercial          |
| quantidade        | numeric |                        |
| unidade_medida_id | uuid FK | FK p/ `unidades_medida`|
| conta_contabil    | text    |                        |
| data_necessidade | date    |                        |
| prioridade       | text    | `normal | emergencial` |
| observacao       | text    |                        |
| ordem            | int     |                        |


---

## Compras — Cotações

### `cotacoes`

Cotação multi-fornecedor (substitui pré-pedido também).


| Coluna                            | Tipo        | Descrição                                                                      |
| --------------------------------- | ----------- | ------------------------------------------------------------------------------ |
| id                                | uuid PK     |                                                                                |
| numero                            | text UK     | `COT-2026-00001`                                                               |
| comprador_id                      | uuid FK     |                                                                                |
| data_limite_resposta              | timestamptz |                                                                                |
| observacoes_fornecedor            | text        | texto do email                                                                 |
| local_entrega_unidade_id          | uuid FK     | default = estoque central                                                      |
| link_preenchimento                | text        | URL pública                                                                    |
| enviar_email_fornecedor           | boolean     |                                                                                |
| copiar_solicitante_email          | boolean     |                                                                                |
| status                            | text        | `draft | sent | partially_responded | fully_responded | finalized | cancelled` |
| fornecedor_vencedor_id            | uuid FK     |                                                                                |
| finalizada_em / finalizada_por_id |             |                                                                                |
| criado_em / atualizado_em         | timestamptz |                                                                                |


---

### `cotacoes_solicitacoes`

N:N — quais solicitações estão na cotação.


| Coluna         | Tipo    | Descrição |
| -------------- | ------- | --------- |
| cotacao_id     | uuid PK |           |
| solicitacao_id | uuid PK |           |


---

### `cotacoes_fornecedores`

Fornecedores convidados na cotação.


| Coluna           | Tipo        | Descrição                 |
| ---------------- | ----------- | ------------------------- |
| id               | uuid PK     |                           |
| cotacao_id       | uuid FK     | UNIQUE com fornecedor_id  |
| fornecedor_id    | uuid FK     |                           |
| email_enviado_em | timestamptz |                           |
| link_token       | text UK     | token único do fornecedor |


---

### `cotacoes_respostas`

Resposta de cada fornecedor na cotação.


| Coluna                                                   | Tipo        | Descrição                                  |
| -------------------------------------------------------- | ----------- | ------------------------------------------ |
| id                                                       | uuid PK     |                                            |
| cotacao_id                                               | uuid FK     |                                            |
| cotacao_fornecedor_id                                    | uuid FK     |                                            |
| fornecedor_id                                            | uuid FK     |                                            |
| moeda_id                                                 | uuid FK     |                                            |
| forma_pagamento_id                                       | uuid FK     | FK p/ `formas_pagamento`                   |
| condicoes_pagamento_id                                   | uuid FK     | FK p/ `condicoes_pagamento`                |
| prazo_entrega_dias                                       | int         |                                            |
| data_previsao_entrega                                    | date        |                                            |
| valor_subtotal / valor_frete / valor_desconto            | numeric     |                                            |
| percentual_ipi / percentual_icms / percentual_pis_cofins | numeric     |                                            |
| valor_total                                              | numeric     |                                            |
| status                                                   | text        | `pending | responded | declined | expired` |
| respondido_em                                            | timestamptz |                                            |
| observacoes_fornecedor                                   | text        |                                            |
| anexos                                                   | jsonb       | PDFs orçamentos                            |
| criado_em / atualizado_em                                | timestamptz |                                            |


---

### `cotacoes_respostas_itens`

Preço de cada item na resposta.


| Coluna                     | Tipo          | Descrição                  |
| -------------------------- | ------------- | -------------------------- |
| id                         | uuid PK       |                            |
| resposta_id                | uuid FK       |                            |
| solicitacao_compra_item_id | uuid FK       |                            |
| preco_unitario             | numeric(15,4) |                            |
| quantidade                 | numeric       | pode diferir da solicitada |
| total_item                 | numeric       |                            |
| observacoes                | text          |                            |


---

## Compras — Pedidos

### `pedidos_compra`

Pedido fechado (após cotação ou direto). Vai para alçada.


| Coluna                                                                       | Tipo        | Descrição                                                                                                                                                                |
| ---------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| id                                                                           | uuid PK     |                                                                                                                                                                          |
| numero                                                                       | text UK     | `PED-2026-00001`                                                                                                                                                         |
| cotacao_id                                                                   | uuid FK     | nullable                                                                                                                                                                 |
| fornecedor_id                                                                | uuid FK     |                                                                                                                                                                          |
| empresa_emitente_id                                                          | uuid FK     | qual CNPJ emite                                                                                                                                                          |
| comprador_id                                                                 | uuid FK     |                                                                                                                                                                          |
| solicitante_principal_id                                                     | uuid FK     |                                                                                                                                                                          |
| contrato_id                                                                  | uuid FK     |                                                                                                                                                                          |
| local_entrega_unidade_id                                                     | uuid FK     |                                                                                                                                                                          |
| passa_pelo_estoque                                                           | boolean     | se false: vai direto p/ unidade                                                                                                                                          |
| contato_fornecedor_nome / contato_fornecedor_email                           | text        |                                                                                                                                                                          |
| moeda_id                                                                     | uuid FK     |                                                                                                                                                                          |
| forma_pagamento_id                                                           | uuid FK     | FK p/ `formas_pagamento`                                                                                                                                                 |
| condicoes_pagamento_id                                                       | uuid FK     | FK p/ `condicoes_pagamento`                                                                                                                                              |
| valor_subtotal / valor_frete / valor_desconto / valor_impostos / valor_total | numeric     |                                                                                                                                                                          |
| status                                                                       | text        | `draft | pending_approval | approved | rejected | sent_to_supplier | awaiting_nf | nf_issued | in_transit | partially_received | fully_received | completed | cancelled` |
| status_aprovacao                                                             | text        | `pendente | aprovado | reprovado | em_revisao`                                                                                                                           |
| versao_aprovacao                                                             | int         | incrementa em resend                                                                                                                                                     |
| aprovador_alcada_id                                                          | uuid FK     | quem precisa aprovar                                                                                                                                                     |
| enviado_fornecedor_em / data_previsao_entrega / cancelado_em                 |             |                                                                                                                                                                          |
| motivo_cancelamento / observacoes                                            | text        |                                                                                                                                                                          |
| anexos                                                                       | jsonb       |                                                                                                                                                                          |
| criado_em / atualizado_em                                                    | timestamptz |                                                                                                                                                                          |


---

### `pedidos_compra_itens`

Itens do pedido.


| Coluna                     | Tipo          | Descrição               |
| -------------------------- | ------------- | ----------------------- |
| id                         | uuid PK       |                         |
| pedido_id                  | uuid FK       | CASCADE                 |
| solicitacao_compra_item_id | uuid FK       | origem                  |
| item_id                    | uuid FK       | nullable                |
| descricao                  | text          |                         |
| codigo                     | text          |                         |
| quantidade                 | numeric       |                         |
| preco_unitario             | numeric(15,4) |                         |
| valor_total                | numeric       |                         |
| unidade_medida_id          | uuid FK       | FK p/ `unidades_medida` |
| ordem                      | int           |                         |


---

### `pedidos_compra_solicitacoes`

N:N — 1 pedido pode atender N solicitações de compra.


| Coluna         | Tipo    | Descrição |
| -------------- | ------- | --------- |
| pedido_id      | uuid PK |           |
| solicitacao_id | uuid PK |           |


---

### `pedidos_compra_aprovacoes`

Histórico versionado de aprovações.


| Coluna           | Tipo        | Descrição                                       |
| ---------------- | ----------- | ----------------------------------------------- |
| id               | uuid PK     |                                                 |
| pedido_id        | uuid FK     |                                                 |
| versao           | int         | corresponde a `pedidos_compra.versao_aprovacao` |
| aprovador_id     | uuid FK     |                                                 |
| acao             | text        | `pendente | aprovado | reprovado | reenviado`   |
| observacao       | text        |                                                 |
| valor_referencia | numeric     | valor na hora                                   |
| criado_em        | timestamptz |                                                 |


---

## Compras — Alçadas

### `alcadas_aprovacao`

Quem aprova pedidos por faixa de valor (Sanchez ≤4999, Mike ≥5000).


| Coluna                              | Tipo        | Descrição               |
| ----------------------------------- | ----------- | ----------------------- |
| id                                  | uuid PK     |                         |
| escopo                              | text        | `pedido | requisicao`   |
| usuario_id                          | uuid FK     | aprovador específico    |
| perfil_aprovador                    | text        | alternativa por perfil  |
| valor_limite_min / valor_limite_max | numeric     | max nullable = sem teto |
| ativo                               | boolean     |                         |
| criado_em / atualizado_em           | timestamptz |                         |


---

### `alcadas_aprovacao_departamentos`

Limita alçada a departamentos específicos.


| Coluna          | Tipo    | Descrição |
| --------------- | ------- | --------- |
| alcada_id       | uuid PK |           |
| departamento_id | uuid PK |           |


---

## Compras — NF / Contratos / Recebimento

### `notas_fiscais`

NF-e do fornecedor. Suporta entrada, devolução e serviço.


| Coluna                                                                       | Tipo        | Descrição                                |
| ---------------------------------------------------------------------------- | ----------- | ---------------------------------------- |
| id                                                                           | uuid PK     |                                          |
| numero                                                                       | text        | UNIQUE com cnpj_emissor                  |
| serie                                                                        | text        |                                          |
| chave_acesso                                                                 | text UK     | 44 dígitos SEFAZ                         |
| tipo                                                                         | text        | `entrada | devolucao | servico`          |
| fornecedor_id                                                                | uuid FK     |                                          |
| cnpj_emissor                                                                 | text        | denormalizado                            |
| empresa_emitente_id                                                          | uuid FK     | qual CNPJ Gowork                         |
| moeda_id                                                                     | uuid FK     |                                          |
| valor_produtos / valor_frete / valor_desconto / valor_impostos / valor_total | numeric     |                                          |
| data_emissao                                                                 | timestamptz |                                          |
| data_entrada                                                                 | timestamptz | quando lançada                           |
| data_vencimento                                                              | date        |                                          |
| status                                                                       | text        | `received | paid | cancelled | returned` |
| url_xml / url_pdf / url_boleto                                               | text        |                                          |
| lancada_por_usuario_id                                                       | uuid FK     |                                          |
| observacoes                                                                  | text        |                                          |
| criado_em / atualizado_em                                                    | timestamptz |                                          |


---

### `notas_fiscais_pedidos`

N:N entre NF e Pedido.


| Coluna           | Tipo    | Descrição                       |
| ---------------- | ------- | ------------------------------- |
| nota_fiscal_id   | uuid PK |                                 |
| pedido_compra_id | uuid PK |                                 |
| valor_alocado    | numeric | quando NF cobre parte do pedido |


---

### `contratos`

Contratos com fornecedores. Trigger debita saldo automaticamente.


| Coluna                    | Tipo              | Descrição                                    |
| ------------------------- | ----------------- | -------------------------------------------- |
| id                        | uuid PK           |                                              |
| numero                    | text UK           | `CTR-2026-001`                               |
| nome                      | text              |                                              |
| fornecedor_id             | uuid FK           |                                              |
| empresa_emitente_id       | uuid FK           |                                              |
| departamento_id           | uuid FK           |                                              |
| valor_total               | numeric           |                                              |
| valor_consumido           | numeric           | atualizado por trigger                       |
| saldo                     | numeric GENERATED | `valor_total - valor_consumido`              |
| data_inicio / data_fim    | date              |                                              |
| status                    | text              | `active | concluded | suspended | cancelled` |
| url_contrato_pdf          | text              |                                              |
| observacoes               | text              |                                              |
| criado_em / atualizado_em | timestamptz       |                                              |


---

### `recebimentos_compra`

Chegada física do item (pode ser parcial). Status `complete` gera entrada no estoque.


| Coluna                                                                                 | Tipo        | Descrição                                       |
| -------------------------------------------------------------------------------------- | ----------- | ----------------------------------------------- |
| id                                                                                     | uuid PK     |                                                 |
| pedido_id                                                                              | uuid FK     |                                                 |
| pedido_item_id                                                                         | uuid FK     |                                                 |
| nota_fiscal_id                                                                         | uuid FK     |                                                 |
| unidade_recebimento_id                                                                 | uuid FK     |                                                 |
| quantidade_esperada / quantidade_recebida / quantidade_avariada / quantidade_devolvida | numeric     |                                                 |
| data_recebimento                                                                       | timestamptz |                                                 |
| recebido_por_usuario_id / conferido_por_usuario_id                                     | uuid FK     |                                                 |
| url_foto_recebimento                                                                   | text        |                                                 |
| status                                                                                 | text        | `pending_check | partial | complete | rejected` |
| observacoes                                                                            | text        |                                                 |
| criado_em / atualizado_em                                                              | timestamptz |                                                 |


---

## Auditoria & Notificações

### `log_atividades`

Timeline genérica de qualquer entidade. Append-only.


| Coluna                        | Tipo        | Descrição                                                                        |
| ----------------------------- | ----------- | -------------------------------------------------------------------------------- |
| id                            | uuid PK     |                                                                                  |
| tipo_entidade                 | text        | `solicitacao | pedido_compra | lote_entrega | movimentacao | usuario | contrato` |
| entidade_id                   | uuid        |                                                                                  |
| acao                          | text        | `created | approved | rejected | status_changed | shipped | delivered`           |
| usuario_id                    | uuid FK     | nullable (sistema)                                                               |
| status_anterior / status_novo | text        |                                                                                  |
| dados                         | jsonb       | snapshot/contexto                                                                |
| ip_origem                     | inet        |                                                                                  |
| user_agent                    | text        |                                                                                  |
| criado_em                     | timestamptz |                                                                                  |


---

### `notificacoes`

Caixa de entrada do usuário (com lido/não lido).


| Coluna                                          | Tipo        | Descrição                                          |
| ----------------------------------------------- | ----------- | -------------------------------------------------- |
| id                                              | uuid PK     |                                                    |
| usuario_id                                      | uuid FK     |                                                    |
| tipo                                            | text        | `request_approved | delivery_ready | loan_overdue` |
| prioridade                                      | text        | `low | normal | high | urgent`                     |
| titulo                                          | text        |                                                    |
| mensagem                                        | text        |                                                    |
| link_acao                                       | text        | URL relativa do app                                |
| tipo_entidade / entidade_id                     | text / uuid |                                                    |
| lido_em / arquivado_em                          | timestamptz |                                                    |
| enviado_email / enviado_whatsapp / enviado_push | boolean     | canais externos                                    |
| criado_em                                       | timestamptz |                                                    |


---

## Perfis e Permissões (sistema dinâmico, sem hardcode)

Tudo cadastrável pelo admin. Sem enum `developer | admin | controller | ...` no código. Cada perfil libera N rotas; cada usuário tem N perfis (e pode ganhar rotas extras avulsas).

### `perfis_acesso`

Perfis cadastráveis pelo admin (Desenvolvedor, Comprador, CL, Designer, ou qualquer outro que ele inventar).


| Coluna                    | Tipo        | Descrição                             |
| ------------------------- | ----------- | ------------------------------------- |
| id                        | uuid PK     |                                       |
| codigo                    | text UK     | `DEV`, `CL`, `COMPRADOR`              |
| nome                      | text        | nome legível                          |
| descricao                 | text        |                                       |
| eh_protegido              | boolean     | true = não pode ser excluído (ex: DEV)|
| ativo                     | boolean     |                                       |
| criado_em / atualizado_em | timestamptz |                                       |


---

### `rotas_sistema`

Catálogo de TODAS as rotas/recursos do sistema. Dev cadastra; admin atribui aos perfis.


| Coluna                    | Tipo        | Descrição                                                    |
| ------------------------- | ----------- | ------------------------------------------------------------ |
| id                        | uuid PK     |                                                              |
| caminho                   | text UK     | `/almoxarifado/estoque`, `/compras/fornecedores`             |
| codigo                    | text UK     | identificador estável usado no front (`almox.estoque`)       |
| nome                      | text        | nome exibido no menu                                         |
| descricao                 | text        |                                                              |
| modulo                    | text        | agrupador visual: `almoxarifado`, `compras`, `design`, `admin`|
| icone                     | text        | nome do ícone Lucide (ex: `package`, `truck`)                |
| ordem                     | int         | ordem de exibição no menu                                    |
| eh_publica                | boolean     | true = qualquer logado acessa (ex: dashboard inicial)        |
| ativo                     | boolean     |                                                              |
| criado_em / atualizado_em | timestamptz |                                                              |


---

### `perfis_acesso_rotas`

N:N — quais rotas cada perfil libera (com permissões granulares).


| Coluna        | Tipo        | Descrição                                |
| ------------- | ----------- | ---------------------------------------- |
| perfil_id     | uuid PK     | CASCADE                                  |
| rota_id       | uuid PK     | CASCADE                                  |
| pode_ler      | boolean     | listar/ver detalhe                       |
| pode_escrever | boolean     | criar/editar                             |
| pode_excluir  | boolean     | deletar                                  |
| pode_aprovar  | boolean     | aprovar/rejeitar (fluxos de aprovação)   |
| criado_em     | timestamptz |                                          |


---

### `usuarios_perfis`

Usuário pode ter N perfis (substitui o enum `usuarios.perfil`).


| Coluna                | Tipo        | Descrição |
| --------------------- | ----------- | --------- |
| usuario_id            | uuid PK     | CASCADE   |
| perfil_id             | uuid PK     | CASCADE   |
| criado_em             | timestamptz |           |
| criado_por_usuario_id | uuid FK     |           |


---

### `usuarios_rotas_extras`

Rotas concedidas individualmente a um usuário (fora dos perfis dele).


| Coluna                | Tipo        | Descrição           |
| --------------------- | ----------- | ------------------- |
| usuario_id            | uuid PK     | CASCADE             |
| rota_id               | uuid PK     | CASCADE             |
| pode_ler              | boolean     |                     |
| pode_escrever         | boolean     |                     |
| pode_excluir          | boolean     |                     |
| pode_aprovar          | boolean     |                     |
| motivo                | text        | justificativa       |
| criado_em             | timestamptz |                     |
| criado_por_usuario_id | uuid FK     |                     |


---

**Como o backend resolve permissão de um usuário em uma rota:**

```
permissao_efetiva(usuario, rota) =
    UNIAO de:
      - perfis_acesso_rotas WHERE perfil_id IN (perfis do usuário)
                              AND rota_id = rota
      - usuarios_rotas_extras WHERE usuario_id = usuario
                                AND rota_id = rota
```

Se houver linha em qualquer um dos dois com `pode_*=true`, a ação é permitida.

---

## Resumo


| Domínio                                                                            | Tabelas |
| ---------------------------------------------------------------------------------- | ------- |
| Identidade & Org                                                                   | 5       |
| Listas Cadastráveis                                                                | 3       |
| Catálogo                                                                           | 2       |
| Estoque                                                                            | 2       |
| Solicitações operacionais                                                          | 1       |
| Entregas                                                                           | 3       |
| Compras (cadastros + sol + cotações + pedidos + alçadas + NF + contratos + receb.) | 16      |
| Auditoria & Notificações                                                           | 2       |
| Perfis e Permissões                                                                | 5       |
| **TOTAL CORE**                                                                     | **39**  |


> Mais 3 tabelas auxiliares N:N (`cotacoes_solicitacoes`, `pedidos_compra_solicitacoes`, `notas_fiscais_pedidos`) → totalizando **42 tabelas**.

**Convenções:**

- Todos os `id` são `uuid` com `DEFAULT gen_random_uuid()`
- Todas têm `criado_em` (e `atualizado_em` quando muta)
- Valores de enum (`status`, `tipo`, `acao`) em inglês
- Datas terminam em `_em` (`criado_em`, `aprovado_em`, `concluido_em`)
- Booleanos com prefixo `eh_` (`eh_movel`, `eh_consumivel`)
- FKs no padrão `<entidade>_id`
- Sem acento, snake_case, sem cedilha

**Notas sobre FKs ambíguas:**

A coluna `solicitacao_id` aparece em duas situações com tabelas-mãe diferentes:
- Em `lotes_entrega_itens` e `confirmacoes_entrega` → aponta para `solicitacoes` (operacionais)
- Em `cotacoes_solicitacoes` e `pedidos_compra_solicitacoes` → aponta para `solicitacoes_compra`

Contexto fica claro pelo nome da tabela-mãe; nada a corrigir, só registrar.

---

## Listas Cadastráveis vs Hardcoded

Decisão final sobre campos com lista fixa:

### Viraram tabelas cadastráveis (3)

| Antes (text + enum) | Agora (uuid FK) | Tabela criada |
|---|---|---|
| `unidade_medida` (text) em `itens`, `solicitacoes_compra_itens`, `pedidos_compra_itens` | `unidade_medida_id` (uuid FK) | `unidades_medida` |
| `forma_pagamento` (text) em `cotacoes_respostas`, `pedidos_compra` | `forma_pagamento_id` (uuid FK) | `formas_pagamento` |
| `condicoes_pagamento` (text) em `cotacoes_respostas`, `pedidos_compra` | `condicoes_pagamento_id` (uuid FK) | `condicoes_pagamento` |

### Continuam como CHECK constraint hardcoded (2)

| Campo | Tabela | Valores fixos |
|---|---|---|
| `urgencia` | `solicitacoes`, `solicitacoes_compra` | `low \| medium \| high` |
| `prioridade` | `solicitacoes_compra_itens` | `normal \| emergencial` |

### Continuam hardcoded por natureza (não são listas, são máquinas de estado)

Status (`pending`, `approved`, `in_transit`, etc.), tipos (`tipo` em `movimentacoes`/`solicitacoes`), ações (`acao` em `pedidos_compra_aprovacoes`, `log_atividades`). O código depende deles e virar string mágica seria pior. Ficam como CHECK constraint.

---

## Funcionalidades do Sistema

Lista exaustiva, agrupada por módulo. O que o sistema permite fazer hoje, com base nas tabelas e regras definidas.

### Cadastros & Administração

- Cadastro de **usuários** vinculados ao Supabase Auth
- Atribuição de N **unidades** a cada usuário (`unidades_ids`)
- Cadastro de **unidades** com lista de andares
- Cadastro de **departamentos** com responsável
- Cadastro de **empresas emitentes** (CNPJs Gowork) — base mínima
- Cadastro de **moedas** suportadas (BRL, USD, EUR...)
- Cadastro de **unidades de medida** (un, kg, m, l, cx, par...)
- Cadastro de **formas de pagamento** (pix, cartão, boleto, transferência, dinheiro)
- Cadastro de **condições de pagamento** (à vista, 30 dias, 30/60/90...)
- Cadastro de **categorias** de itens
- Cadastro de **itens** (produtos e móveis no mesmo catálogo, distinção via `eh_movel`)
- Cadastro de **categorias de fornecedor**
- Cadastro de **fornecedores** (PJ via CNPJ ou PF via CPF; com endereço, contatos, dados bancários)

### Perfis & Permissões (sistema dinâmico)

- Cadastro de **perfis de acesso** quantos quiser (Desenvolvedor, CL, Comprador, Designer, qualquer outro)
- Catálogo de **rotas do sistema** com módulo, ícone e ordem
- Atribuição de **N rotas** por perfil com 4 permissões granulares: `pode_ler`, `pode_escrever`, `pode_excluir`, `pode_aprovar`
- Atribuição de **N perfis** por usuário
- Concessão de **rotas avulsas** a um usuário específico (com motivo registrado)
- Marcar perfis como **protegidos** (não excluíveis, ex: DEV)
- Resolução automática de permissão efetiva: união de perfis + rotas extras
- Login via Supabase Auth + troca de senha forçada
- **Código diário** de 6 dígitos por usuário (renovado todo dia, usado em QR de entrega)

### Estoque

- Saldo por par (item × unidade) em `estoques_unidade`
- Quantidade mínima e alerta de **ressuprimento**
- Registro de **movimentações** com 7 tipos:
  - `entry` (entrada de material)
  - `exit` (saída/consumo)
  - `transfer` (transferência entre unidades)
  - `loan_out` (retirada por empréstimo)
  - `loan_return` (devolução de empréstimo)
  - `disposal` (descarte com justificativa)
  - `adjustment` (ajuste de inventário, pode ser negativo)
- **Trigger automático** atualiza saldo em `estoques_unidade` sempre que entra movimentação
- **CHECK** garante saldo nunca negativo
- Vínculo de movimentação com **solicitação**, **lote de entrega**, **pedido de compra** ou **NF** (rastreabilidade)
- Campo **ordem de serviço** para movimentações operacionais
- Histórico completo (queries por item, unidade, usuário, período)

### Solicitações Operacionais

- 4 tipos cobertos pela mesma tabela:
  - `material` — pedido de material para a unidade
  - `furniture_to_unit` — controlador pede móvel para sua unidade (passa por designer)
  - `furniture_removal` — solicitação de retirada de móvel (designer decide armazenar ou descartar)
  - `loan` — empréstimo de item (controlador aprova)
- Numeração legível: `SOL-2026-00001`
- Justificativa, urgência e andar de destino
- Fluxo de **aprovação técnica** (gestor) e **decisão de designer** (móveis)
- Decisão de **descarte** com justificativa obrigatória
- Designação de **tomador** distinto do solicitante (loan)
- **QR Code** para confirmação na entrega
- **Status flow específico** por tipo (validado por CHECK constraint)
- Cancelamento e rejeição com motivo

### Entregas & Recebimento Interno

- **Lote de entrega** agrupando N solicitações (mesma unidade destino + motorista)
- Numeração legível: `LOTE-2026-00001`
- **QR Code do lote** para conferência
- 3 tipos de **confirmação de entrega**:
  - `driver_delivery` — motorista marca como entregue
  - `reception_receipt` — recepção recebe pacote (sem responsabilidade de conteúdo)
  - `requester_confirm` — solicitante (CL/Assistente) confere conteúdo
- Foto, assinatura digital e geolocalização opcionais em cada confirmação
- Validação cruzada por **código diário** do destinatário
- Status flow do lote: `pending → in_transit → delivered → received_confirmed → completed`

### Compras

#### Solicitação de compra
- Cadastro de **solicitação de compra** com N itens
- Numeração legível: `SC-2026-00001`
- Anexos (orçamentos do solicitante)
- Vínculo opcional a **contrato** existente
- Sugestão de fornecedor pelo solicitante
- Indicação de **CNPJ emissor** desejado (qual empresa compra)
- Item pode ser ad-hoc (sem catálogo) ou referenciar `itens`
- Conta contábil, data de necessidade, prioridade por item
- **1ª aprovação técnica** (gestor da área, sem ver valor)
- Atribuição automática a um comprador após aprovação

#### Cotação
- Cotação **multi-fornecedor** (1 ou N) — pré-pedido foi unificado em cotação
- Numeração legível: `COT-2026-00001`
- Cotação **agrega N solicitações de compra** (1 só pedido para vários solicitantes pedindo mesmo item)
- Email automático para cada fornecedor com **link público único** (token por fornecedor)
- Local de entrega configurável (default: estoque central)
- Resposta do fornecedor com: valor, frete, desconto, prazo, condições, anexos PDF
- Tributos discriminados: IPI, ICMS, PIS/COFINS
- **Comparação visual** das respostas
- Escolha do **fornecedor vencedor**
- Status: draft → sent → partially_responded → fully_responded → finalized

#### Pedido de compra
- Geração de pedido a partir de cotação (ou direto)
- Numeração legível: `PED-2026-00001`
- 1 pedido pode atender **N solicitações de compra**
- Vínculo opcional a **contrato**
- Local de entrega: estoque ou unidade direta (`passa_pelo_estoque` true/false)
- **Aprovação por alçada** de valor + departamento (configurável)
- **Versionamento** de aprovação (resend após reprovação cria nova versão)
- Histórico completo de aprovações (quem, quando, ação, observação, valor da época)
- Status flow: draft → pending_approval → approved → sent_to_supplier → awaiting_nf → nf_issued → in_transit → partially_received → fully_received → completed
- Cancelamento com motivo
- Anexos no pedido

#### Alçadas de aprovação
- Configuração por faixa de valor (`min`/`max`)
- Aprovador específico (`usuario_id`) ou por perfil
- Restrição opcional a **departamentos específicos**
- Escopo: aplicada a `pedido` ou `requisicao`

#### Notas Fiscais
- Lançamento de NF-e do fornecedor (input manual da chave SEFAZ)
- 3 tipos: `entrada`, `devolucao`, `servico`
- Vínculo **N:N** com pedidos (1 NF pode parcialmente cobrir 1 pedido; 1 pedido pode ter N NFs)
- Anexos: XML, PDF (DANFE), boleto
- Status: received → paid / cancelled / returned
- Tributos discriminados

#### Recebimento
- **Recebimento parcial ou total** por item
- Quantidades: esperada, recebida, avariada, devolvida
- Foto do recebimento
- Conferência por CL/Assistente
- **Trigger automático** gera entrada em `estoques_unidade` quando status `complete`
- Pedido com `passa_pelo_estoque=false` entra direto na unidade destino, sem passar pelo almox

### Contratos

- Cadastro de contratos com fornecedor e CNPJ Gowork
- Numeração legível: `CTR-2026-001`
- Valor total e período de vigência
- **N pedidos** vinculados ao contrato
- **Trigger automático**: cada NF lançada em pedido vinculado debita o saldo
- `saldo` é coluna **GENERATED** (`valor_total - valor_consumido`)
- **Bloqueio** de novo pedido se saldo esgotado (validação na app + CHECK constraint)
- Status: active → concluded / suspended / cancelled
- PDF do contrato anexado
- Vínculo a departamento responsável

### Auditoria

- **Log genérico** (`log_atividades`) de qualquer entidade
- Captura: quem, quando, ação, status anterior, status novo, contexto JSONB, IP, user agent
- Reconstrução de **timeline** de qualquer entidade via única query
- Append-only (registros não editáveis)
- Acionado em mudanças de status, aprovações, rejeições, entregas

### Notificações

- Caixa de entrada **in-app** por usuário
- 4 níveis de prioridade (low / normal / high / urgent)
- Marcação de lido / não lido / arquivado
- Link de ação (URL relativa para abrir no app)
- Vínculo opcional a entidade (tipo + id)
- Indicação de envio em canais externos (email / whatsapp / push)
- Eventos típicos: solicitação aprovada, lote pronto p/ entrega, empréstimo atrasado, contrato esgotando

### Cross-cutting (transversais)

- Geração automática de **número legível** em solicitações, lotes, cotações, pedidos, contratos
- Trigger `set_updated_at` em todas as tabelas com `atualizado_em`
- Soft delete via `ativo=false` ou `cancelado_em` (não há `DELETE` em entidades de negócio)
- Validação de saldo não-negativo em `estoques_unidade`
- Validação de combinação `tipo × status` em `solicitacoes` (CHECK constraint)
- Validação de combinação `acao × campos obrigatórios` em `movimentacoes` (CHECK constraint)
- Mecânica de daily code segura (renovação por dia)

