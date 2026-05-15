# scripts

Scripts utilitários de manutenção do SupplyGo. Rodam localmente, sem dependências
externas (apenas Node 18+).

## `importar-cubano.mjs`

Processa `temp/cubano.json` (catálogo bruto da Cubano com ~5.200 produtos) e
gera uma migration SQL pronta para popular a tabela `itens`.

### O que o pipeline faz

1. **Normalização** dos nomes
   - Decodifica HTML entities (`&quot;` → `"`)
   - Remove prefixos lixo (`**`, `(**)`, `[SK]`, `(SKU 019)`, `???`, etc.)
   - Remove acentos e força UPPERCASE
   - Colapsa espaços duplos

2. **Descarte** de não-itens
   - Fragmentos truncados (parênteses desbalanceados, texto livre > 180 chars)
   - Strings curtas demais (< 3 caracteres úteis)
   - Serviços (`FORNECIMENTO E INSTALAÇÃO`, `VISITA TÉCNICA`, `MÃO DE OBRA`,
     `MANUTENÇÃO`, `TREINAMENTO`, `FRETE`, ...)

3. **Deduplicação** por chave normalizada (mesmo produto com códigos diferentes
   vira **1 item só**). Mantém todos os códigos originais como histórico no
   campo `descricao`.

4. **Inferência inteligente** por palavras-chave usando o seed atual do banco:
   - `categoria_id` → uma das 7 categorias do seed (Mobiliário, Eletrônicos,
     Material de Escritório, Limpeza e Higiene, Café e Copa, Equipamentos
     Técnicos, Material de Construção)
   - `unidade_medida_id` → uma das 12 unidades (`un`, `kg`, `l`, `m2`, `cx`,
     `dz`, `pct`, `par`, `conjunto`, ...). Default `un` quando ambíguo.
   - `eh_movel` → mesa, cadeira, sofá, armário, etc.
   - `eh_consumivel` → tudo que não é móvel
   - `permite_emprestimo` + `dias_emprestimo_padrao = 7` → ferramentas,
     equipamentos compartilháveis (parafusadeira, furadeira, multímetro,
     notebook, projetor, compressor, ...)

### Saídas geradas

| Arquivo                                       | Para que serve                                          |
| --------------------------------------------- | ------------------------------------------------------- |
| `supabase/migrations/013_seed_itens_cubano.sql` | **Migration final pronta para rodar no Supabase**       |
| `temp/itens_processados.json`                 | Auditoria item-a-item (revisar antes de aplicar)        |
| `temp/itens_descartados.json`                 | Tudo que foi descartado e por quê                       |

### Como rodar

```powershell
npm run import:cubano
```

Saída esperada no console:

```
======================================================================
 Importacao Cubano -> SupplyGo
======================================================================
 Entradas no JSON ............... 5178
 Descartados (lixo / servico) ... 142
 Itens unicos apos dedup ........ 4923
----------------------------------------------------------------------
 Distribuicao por categoria:
   Material de Construcao         2841
   Equipamentos Tecnicos           812
   ...
----------------------------------------------------------------------
```

### Aplicar no banco

1. Abrir Supabase Studio do projeto
2. SQL Editor → New query
3. Colar o conteúdo de `supabase/migrations/013_seed_itens_cubano.sql`
4. Run

A migration é **idempotente** (usa `NOT EXISTS` por nome). Pode rodar várias
vezes sem duplicar.

### Ajustar a classificação

Tudo está em `scripts/importar-cubano.mjs`:

- Categorias e palavras-chave → const `CATEGORIAS`
- Unidades de medida → const `UNIDADES_PADRAO`
- Móveis → const `KEYWORDS_MOVEL`
- Emprestáveis → const `KEYWORDS_EMPRESTAVEL`
- Filtros de descarte → const `PADROES_SERVICO` e função `ehFragmentoOuLixo`

Edite, rode `npm run import:cubano` de novo e a migration é regerada.
