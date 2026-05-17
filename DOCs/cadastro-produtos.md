# Cadastro de Produtos — Modelo de Dados

## Conceito central

Seguimos o padrão **Produto (template) → Variante (SKU)**, consagrado em ERPs como SAP, TOTVS e ERPNext.

```
Produto Genérico
│   ex: "Parafuso"
│
├── Variante A  →  M6 × 20mm | Aço Inox | Fornecedor X     [tem saldo]
├── Variante B  →  M6 × 20mm | Aço Carbono | Fornecedor Y  [tem saldo]
└── Variante C  →  M8 × 30mm | Aço Inox | Fornecedor X     [tem saldo]
```

- **Produto** define O QUE É o item: nome e unidade de medida base.
- **Variante** define QUAL EXATAMENTE é o item: combinação de atributos que o torna único e rastreável.
- **Estoque** é sempre calculado na variante. O saldo no produto é a soma das variantes.

> **Categorias estão fora do escopo atual.** Serão adicionadas futuramente com foco em classificação contábil (ativos, consumíveis, etc).

---

## Árvore de entidades

```
prd_unidades_medida     (ex: un, kg, m, L)
│   └── prd_conversoes_uom  (ex: 1 caixa = 12 un)
│
prd_atributos           (ex: Tamanho, Marca, Cor, Material)
│   └── prd_atributo_valores  (ex: M6, Aço Inox, Azul)
│
prd_produtos            (template genérico)
│   └── unidade_medida_id → prd_unidades_medida
│
prd_variantes           (SKU rastreável)
│   ├── produto_id    → prd_produtos
│   └── prd_variante_atributos  (N:N com prd_atributo_valores)
│
estoque                 (saldo por variante)
    └── variante_id   → prd_variantes
```

---

## Tabelas

### `unidades_medida`
Catálogo de unidades. Toda conversão parte da unidade base do produto.

| Coluna       | Tipo    | Descrição                        |
|--------------|---------|----------------------------------|
| `id`         | uuid PK |                                  |
| `nome`       | text NN | Ex: "Unidade", "Quilograma"      |
| `sigla`      | text NN | Ex: "un", "kg", "m", "L"        |
| `ativo`      | boolean |                                  |

### `conversoes_uom`
Fator de conversão entre unidades (ex: 1 caixa = 12 un).

| Coluna           | Tipo    | Descrição                                         |
|------------------|---------|---------------------------------------------------|
| `id`             | uuid PK |                                                   |
| `de_uom_id`      | uuid FK | Unidade origem (ex: caixa)                        |
| `para_uom_id`    | uuid FK | Unidade destino / base (ex: un)                   |
| `fator`          | numeric | Multiplicador: 1 caixa × 12 = 12 un               |
| `produto_id`     | uuid FK | Opcional — conversão específica de um produto     |

### `atributos`
Define os tipos de característica disponíveis para variantes.

| Coluna         | Tipo    | Descrição                                           |
|----------------|---------|-----------------------------------------------------|
| `id`           | uuid PK |                                                     |
| `nome`         | text NN | Ex: "Tamanho", "Marca", "Material", "Cor"           |
| `tipo_dado`    | text    | `texto`, `numero`, `lista` — controla o input no form |
| `ordem`        | integer | Ordem de exibição                                   |
| `ativo`        | boolean |                                                     |

### `atributo_valores`
Valores possíveis para cada atributo.

| Coluna          | Tipo    | Descrição                           |
|-----------------|---------|-------------------------------------|
| `id`            | uuid PK |                                     |
| `atributo_id`   | uuid FK | Referência para `atributos`         |
| `valor`         | text NN | Ex: "M6", "Aço Inox", "Azul", "3M" |
| `ordem`         | integer |                                     |

### `produtos`
Template genérico. Não tem saldo de estoque diretamente.

| Coluna               | Tipo        | Descrição                                         |
|----------------------|-------------|---------------------------------------------------|
| `id`                 | uuid PK     |                                                   |
| `codigo`             | text UNIQUE | Gerado automaticamente: `PRD-00001`               |
| `nome`               | text NN     | Ex: "Parafuso", "Papel Sulfite A4"                |
| `descricao`          | text        | Descrição técnica geral                           |
| `unidade_medida_id`  | uuid FK     | Unidade base padrão das variantes                 |
| `imagem_url`         | text        |                                                   |
| `ativo`              | boolean     | Default `true`                                    |
| `created_at`         | timestamptz |                                                   |
| `updated_at`         | timestamptz |                                                   |

### `produto_variantes`
SKU rastreável. Toda movimentação de estoque referencia esta tabela.

| Coluna               | Tipo        | Obrig. | Descrição                                          |
|----------------------|-------------|--------|----------------------------------------------------|
| `id`                 | uuid PK     | ✓      |                                                    |
| `produto_id`         | uuid FK     | ✓      | Produto genérico pai                               |
| `sku`                | text UNIQUE | —      | Código externo / código de barras                  |
| `chave_variante`     | text        | —      | Hash dos atributos para lookup rápido              |
| `unidade_medida_id`  | uuid FK     | —      | Sobrescreve a unidade do produto pai, se necessário |
| `preco_referencia`   | numeric     | —      | Preço base para cotações                           |
| `ativo`              | boolean     | ✓      | Default `true`                                     |
| `created_at`         | timestamptz | ✓      |                                                    |
| `updated_at`         | timestamptz | ✓      |                                                    |

### `variante_atributos`
Tabela N:N — liga cada variante aos seus atributos.

| Coluna               | Tipo    | Descrição                         |
|----------------------|---------|-----------------------------------|
| `variante_id`        | uuid FK |                                   |
| `atributo_valor_id`  | uuid FK |                                   |
| PK composta          |         | `(variante_id, atributo_valor_id)` |
| UNIQUE               |         | `(variante_id, atributo_id)` — impede dois valores do mesmo atributo na mesma variante |

---

## Cálculo de estoque

O saldo **macro** (produto) é a soma das variantes. O detalhamento em matriz mostra cada variante.

```sql
-- Saldo macro do produto
SELECT
  p.codigo,
  p.nome,
  SUM(e.quantidade_disponivel) AS saldo_total
FROM produtos p
JOIN produto_variantes pv ON pv.produto_id = p.id
JOIN estoque e ON e.variante_id = pv.id
WHERE p.id = :id
GROUP BY p.id;

-- Matriz de variantes (abertura)
SELECT
  pv.sku,
  array_agg(av.valor ORDER BY a.ordem) AS atributos,
  e.quantidade_disponivel
FROM produto_variantes pv
JOIN variante_atributos va ON va.variante_id = pv.id
JOIN atributo_valores av ON av.id = va.atributo_valor_id
JOIN atributos a ON a.id = av.atributo_id
JOIN estoque e ON e.variante_id = pv.id
WHERE pv.produto_id = :id
GROUP BY pv.id, e.quantidade_disponivel;
```

---

## Regras de negócio

| # | Regra |
|---|-------|
| 1 | **Nunca deletar** — produtos, variantes e categorias só são inativados. Histórico de movimentações permanece íntegro. |
| 2 | **Estoque sempre na variante** — saldo no produto é sempre calculado (soma), nunca armazenado. |
| 3 | **Variante mínima** — produto sem especificações pode ter uma única variante "padrão" (sem atributos). |
| 4 | **Unidade base** — se a variante não define `unidade_medida_id`, herda do produto. Todo cálculo usa a unidade base. |
| 5 | **Código gerado** — `produtos.codigo` é gerado por sequence e não é editável. |
| 6 | **SKU único** — quando informado, `produto_variantes.sku` deve ser globalmente único. |
| 7 | **Atributo único por variante** — a constraint `(variante_id, atributo_id)` impede dois valores de "Tamanho" na mesma variante. |

---

## Telas previstas

| Tela | Rota | Descrição |
|------|------|-----------|
| Listagem de produtos | `/cadastros/produtos` | DataTable com busca e filtro por status |
| Detalhe do produto | `/cadastros/produtos/:id` | Form do produto + lista de variantes em matriz |
| Unidades de medida | `/cadastros/unidades-medida` | CRUD simples + conversões |
| Atributos | `/cadastros/atributos` | CRUD de tipos e valores |

---

## Próximos passos

- [ ] Migration `003_produtos.sql`
- [ ] Tela `/cadastros/produtos` — listagem
- [ ] Tela `/cadastros/produtos/:id` — detalhe com matriz de variantes
