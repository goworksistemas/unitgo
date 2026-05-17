# Módulo de Compras — SupplyGo

## Pipeline completo

```
Solicitação de Compra
        ↓
  Aprovação da SC
        ↓
     Cotação
  (múltiplos fornecedores)
        ↓
  Análise & Escolha
        ↓
  Pedido de Compra
        ↓
  Aprovação do Pedido
        ↓
  Envio ao Fornecedor
        ↓
    Recebimento
  (conferência física)
        ↓
  Conferência com NF
        ↓
  Entrada no Estoque
```

---

## Etapas detalhadas

### 1. Solicitação de Compra (SC)
O departamento abre uma solicitação descrevendo o que precisa, quantidade, urgência e data limite.
- Pode conter N itens (produto ou serviço)
- Vinculada a uma unidade de negócio e centro de custo
- Status: `rascunho → aguardando_aprovacao → aprovada → reprovada → cancelada`

### 2. Aprovação da SC
O gestor responsável aprova ou reprova. Pode ter múltiplos níveis (valor limite por aprovador).
- Registro de quem aprovou, quando e observações

### 3. Cotação (RFQ — Request for Quotation)
O comprador convida N fornecedores a cotarem os itens da SC.
- Uma cotação pode agrupar itens de múltiplas SCs aprovadas
- Prazo de resposta definido
- Status: `aberta → respondida → encerrada → cancelada`

### 4. Resposta dos Fornecedores
Cada fornecedor convidado responde com preço unitário, prazo de entrega, frete, tributos e condições de pagamento.
- Comparativo automático entre respostas
- Comprador marca a resposta vencedora por item ou por resposta completa

### 5. Pedido de Compra (PC / PO)
Gerado a partir da resposta vencedora. Documento formal para o fornecedor.
- Vincula ao fornecedor, forma e condição de pagamento, local de entrega
- Status: `rascunho → aguardando_aprovacao → aprovado → enviado → parcialmente_recebido → recebido → cancelado`

### 6. Aprovação do Pedido
Fluxo de aprovação por valor, similar à SC.

### 7. Envio ao Fornecedor
Confirmação de que o PO foi enviado. Pode gerar e-mail automático (futuro).

### 8. Recebimento Físico
Mercadoria chega. O almoxarife registra o recebimento com quantidade real, condições e eventuais divergências.
- Pode ser parcial (vários recebimentos para um mesmo PO)

### 9. Conferência com Nota Fiscal
NF recebida é confrontada com o PO: CNPJ, itens, quantidades, valores, tributos.
- NF pode cobrir parcialmente um PO ou múltiplos POs

### 10. Entrada no Estoque
Após conferência aprovada, os itens são lançados no estoque da unidade de destino.

---

## Tabelas de apoio (Cadastros)

Estas tabelas precisam existir **antes** do módulo de compras. São master data compartilhados por outros módulos futuros.

| Tabela | Descrição | Campos-chave |
|---|---|---|
| `empresas` | Empresa(s) que usam o sistema | CNPJ, razão social, nome fantasia |
| `unidades_negocio` | Filiais, obras, centros (onde comprar/entregar) | nome, empresa_id, endereço |
| `fornecedores` | Cadastro de fornecedores/prestadores | CNPJ/CPF, razão social, contatos, banco |
| `fornecedores_contatos` | Contatos múltiplos por fornecedor | nome, email, telefone, cargo |
| `itens` | Catálogo de produtos e serviços | código, descrição, grupo, unidade de medida |
| `grupos_itens` | Categorias/famílias de itens | nome, código NCM (opcional) |
| `unidades_medida` | UN, KG, CX, M², LT, HH... | sigla, nome |
| `moedas` | BRL, USD, EUR | código ISO, símbolo |
| `formas_pagamento` | Boleto, PIX, transferência, cartão | nome |
| `condicoes_pagamento` | À vista, 30 dias, 30/60/90... | desconto, parcelas, prazo em dias |
| `centros_custo` | Centro de custo para rateio | código, nome, empresa_id |
| `contas_contabeis` | Plano de contas simplificado | código, descrição, tipo |
| `aprovadores` | Regras de aprovação por valor e módulo | modulo, valor_min, valor_max, usuario_id |

---

## Tabelas do Módulo de Compras

| Tabela | Descrição |
|---|---|
| `solicitacoes_compra` | Cabeçalho da SC |
| `solicitacoes_compra_itens` | Itens da SC |
| `cotacoes` | Cabeçalho da cotação (RFQ) |
| `cotacoes_solicitacoes` | N:N — SCs vinculadas à cotação |
| `cotacoes_fornecedores` | Fornecedores convidados para a cotação |
| `cotacoes_respostas` | Resposta por fornecedor |
| `cotacoes_respostas_itens` | Itens cotados em cada resposta |
| `pedidos_compra` | Cabeçalho do Pedido de Compra |
| `pedidos_compra_itens` | Itens do pedido |
| `aprovacoes` | Log de aprovações (SC e PC) |
| `notas_fiscais` | NF entrada |
| `notas_fiscais_itens` | Itens da NF |
| `notas_fiscais_pedidos` | N:N — NF vinculada a pedido(s) |
| `recebimentos` | Cabeçalho do recebimento físico |
| `recebimentos_itens` | Itens recebidos (com divergências) |

---

## Questões em aberto (definir antes de escrever o SQL)

1. **Multi-empresa**: o sistema vai operar para mais de uma empresa no mesmo banco? (afeta todas as tabelas com `empresa_id`)
2. **Aprovação**: aprovação por **valor** (ex: acima de R$10k vai para um nível superior) ou apenas por **papel** (gestor sempre aprova)?
3. **Itens livres**: nas SCs, o solicitante pode digitar um item que não existe no catálogo (`itens`)? Ou é obrigatório vincular ao catálogo?
4. **Serviços**: o módulo precisa tratar serviços (NF de serviço, ISSQN) além de produtos (NF de mercadoria, ICMS/IPI)?
5. **Contratos**: existe a figura de "compra por contrato" (fornecedor já definido, sem cotação)?
6. **Estoque**: o módulo de estoque vai ser construído junto ou em seguida? (define se `recebimentos_itens` já grava em `saldo_estoque` diretamente)
