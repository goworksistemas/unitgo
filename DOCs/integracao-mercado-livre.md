# Integração Mercado Livre — Guia de Deploy

Este documento descreve o passo-a-passo para colocar a integração no ar.
A implementação está em três camadas:

1. **Banco** — migration `018_mercadolivre.sql`
2. **Edge Functions** — `supabase/functions/ml-*`
3. **Frontend** — `src/pages/cadastros/MercadoLivrePage.tsx` + `src/pages/compras/MlPedidosPage.tsx`

URLs do projeto (referência):

- Project URL: `https://<SEU_PROJECT_REF>.supabase.co`
- Edge Function base: `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/`

---

## 1. Cadastrar a aplicação no DevCenter do Mercado Livre

Logado **na conta ML que vai ser monitorada** (a conta de comprador da empresa):

1. Acesse https://developers.mercadolivre.com.br/devcenter
2. Clique em **"Criar aplicação"**
3. Preencha:
   - **Nome curto**: `SupplyGO`
   - **Nome longo**: `SupplyGO - Integração de Compras`
   - **Descrição**: "Acompanhamento de pedidos de compra realizados no Mercado Livre"
   - **URI de redirect (Redirect URI)**:
     ```
     https://<SEU_PROJECT_REF>.supabase.co/functions/v1/ml-oauth-callback
     ```
   - **Tópicos de notificação**: marque
     - `orders_v2`
     - `shipments`
     - `invoices`
     - `messages` (opcional, para mensagens com vendedor)
   - **Notifications callback URL (Webhook)**:
     ```
     https://<SEU_PROJECT_REF>.supabase.co/functions/v1/ml-webhook
     ```
   - **Escopos**: marque `read`, `write`, `offline_access` (esse último é
     obrigatório para receber `refresh_token`).

4. Salve e **anote**:
   - **App ID** (também chamado `client_id`)
   - **Secret Key** (também chamado `client_secret`)

> ⚠️ Não compartilhe a Secret Key. Ela vai como secret no Supabase, nunca no
> código nem no `.env` do frontend.

---

## 2. Aplicar a migration no banco

No Supabase Dashboard → **SQL Editor**:

1. Cole o conteúdo de `supabase/migrations/018_mercadolivre.sql`
2. Execute.

Isso cria as 6 tabelas, RLS, RPCs (`ml_vincular_pedido_compra` /
`ml_desvincular_pedido_compra`) e o bucket privado `mercadolivre-nf` no Storage.

> Se já tiver `cmp_pedidos_compra` populado, o `ALTER TABLE` adiciona as
> colunas `ml_pedido_id` e `origem` (default `'manual'`), sem afetar registros
> existentes.

---

## 3. Cadastrar Secrets no Supabase

No Supabase Dashboard → **Project Settings → Edge Functions → Secrets**,
adicione **exatamente estas chaves**:

| Chave | Valor |
|---|---|
| `ML_CLIENT_ID` | App ID copiado do DevCenter |
| `ML_CLIENT_SECRET` | Secret Key do DevCenter |
| `ML_REDIRECT_URI` | `https://<SEU_PROJECT_REF>.supabase.co/functions/v1/ml-oauth-callback` |
| `FRONTEND_URL` | URL pública do seu app (ex: `https://supplygo.seudominio.com` ou `http://localhost:5173` em dev) |

> `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` já são fornecidos automaticamente
> pelo Supabase para Edge Functions — não precisa cadastrar.

---

## 4. Subir as 4 Edge Functions

No Supabase Dashboard → **Edge Functions → Create a new function**, criar uma
de cada vez. Para cada função, copiar o conteúdo do arquivo `index.ts`
correspondente e salvar.

| Nome da função | Arquivo fonte | `verify_jwt` |
|---|---|---|
| `ml-oauth-callback` | `supabase/functions/ml-oauth-callback/index.ts` | **off** |
| `ml-webhook` | `supabase/functions/ml-webhook/index.ts` | **off** |
| `ml-sync-resource` | `supabase/functions/ml-sync-resource/index.ts` | **off** |
| `ml-refresh-tokens` | `supabase/functions/ml-refresh-tokens/index.ts` | **off** |

> Todas com `verify_jwt = off` (a proteção é manual: as 2 últimas exigem
> Bearer com `SUPABASE_SERVICE_ROLE_KEY`; o callback e o webhook não podem
> exigir JWT porque o ML não envia).

⚠️ As três funções importam de `_shared/`. No painel do Supabase, ao criar
cada função, é preciso **incluir os arquivos compartilhados na mesma função**
(o painel suporta múltiplos arquivos). Suba os arquivos:

- `_shared/cors.ts`
- `_shared/supabase.ts`
- `_shared/ml.ts`
- `_shared/nfe.ts` (apenas em `ml-sync-resource`)

Alternativa **muito mais simples**: instalar o Supabase CLI uma vez e usar
`supabase functions deploy ml-oauth-callback --no-verify-jwt` (e idem para as
outras 3). O CLI sobe `_shared/` automaticamente. Comando completo:

```bash
supabase functions deploy ml-oauth-callback  --no-verify-jwt
supabase functions deploy ml-webhook         --no-verify-jwt
supabase functions deploy ml-sync-resource   --no-verify-jwt
supabase functions deploy ml-refresh-tokens  --no-verify-jwt
```

---

## 5. Configurar o cron de renovação de token

`access_token` vence em 6 horas. O cron `ml-refresh-tokens` deve rodar a
cada 1 hora.

Opção A — **pg_cron** (no Supabase já vem habilitado, executar no SQL Editor):

```sql
select cron.schedule(
  'ml_refresh_tokens',
  '0 * * * *',  -- a cada hora cheia
  $$
    select net.http_post(
      url     := 'https://<SEU_PROJECT_REF>.supabase.co/functions/v1/ml-refresh-tokens',
      headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
    );
  $$
);
```

> Para usar `current_setting('app.settings.service_role_key')` é preciso
> definir a setting via `alter database postgres set "app.settings.service_role_key" = '<sua_key>'`.
> Alternativa mais simples: colocar a service_role_key direto no SQL acima
> (não recomendado por segurança, mas funciona).

Opção B — **serviço externo** (cron-job.org, GitHub Actions etc.) chamando:

```
POST https://<SEU_PROJECT_REF>.supabase.co/functions/v1/ml-refresh-tokens
Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
```

---

## 6. Conectar a primeira conta ML

1. Acesse o sistema com usuário `admin` ou `diretor`.
2. Vá em **Cadastros → Mercado Livre**.
3. Selecione a empresa que vai conectar à conta ML.
4. Clique em **"Conectar conta Mercado Livre"**.
5. O navegador abre `auth.mercadolivre.com.br`, faz login com a conta de
   comprador, autoriza, e é redirecionado de volta com sucesso.

A primeira conexão dispara automaticamente um sync inicial dos últimos 50
pedidos.

---

## 7. Validar o webhook

Após uma compra (ou alteração de uma compra existente) na conta ML
conectada, em até alguns segundos deve aparecer um registro novo em
`ml_webhook_eventos` com `status = 'done'`.

Para debug, em SQL:

```sql
select id, topic, resource, status, error_message, received_at, processed_at
  from ml_webhook_eventos
 order by received_at desc
 limit 20;
```

---

## Tabelas criadas (resumo)

| Tabela | Conteúdo |
|---|---|
| `ml_credenciais` | OAuth tokens da conta ML (1:N com empresa) |
| `ml_pedidos` | Pedidos importados do ML (1 row = 1 compra) |
| `ml_pedidos_itens` | Itens de cada pedido |
| `ml_envios` | Estado logístico do shipment |
| `ml_notas_fiscais` | NFs do pack, com binário no Storage |
| `ml_webhook_eventos` | Log + idempotência das notificações |

E 2 colunas novas em `cmp_pedidos_compra`:

- `ml_pedido_id` — vínculo com `ml_pedidos`
- `origem` — `'manual'` | `'cotacao'` | `'mercadolivre'`

---

## Endpoints do ML usados

| Função | Endpoint | Onde é chamado |
|---|---|---|
| OAuth — trocar code | `POST /oauth/token` (grant `authorization_code`) | `ml-oauth-callback` |
| OAuth — refresh | `POST /oauth/token` (grant `refresh_token`) | `ml-refresh-tokens`, `_shared/ml.ts` |
| Quem sou eu | `GET /users/me` | `ml-oauth-callback` |
| Listar pedidos do buyer | `GET /orders/search?buyer={id}` | `ml-sync-resource` (carga inicial) |
| Detalhe pedido | `GET /orders/{order_id}` | sync (ordens + invoices) |
| Envio | `GET /shipments/{id}` (header `x-format-new: true`) | sync de envio |
| Histórico envio | `GET /shipments/{id}/history` | sync de envio |
| Lista NFs do pack | `GET /packs/{pack_id}/fiscal_documents` | sync de NF (não disponível no **MLB**) |
| Baixar NF do pack | `GET /packs/{pack_id}/fiscal_documents/{doc_id}` | sync de NF |
| NF stream por pedido | `GET /invoices/io/documents/stream/order/{order_id}/pdf\|xml` | sync de NF (MLB / faturador ML) |
| NF faturador vendedor | `GET /users/{seller_id}/invoices/orders/{order_id}` + stream | sync de NF |

---

## Tópicos de webhook configurados

- `orders_v2` — qualquer mudança em pedido confirmado
- `shipments` — mudanças de envio (status logístico)
- `invoices` — emissão/atualização de NF
- `messages` (opcional)

---

## Rate limits e idempotência

- ~100 requests/min por usuário (varia por endpoint).
- O `mlFetch` faz 1 retry com backoff de 2s em caso de 429.
- O webhook usa chave `(topic, resource, sent_at)` como única — replays do ML
  retornam 23505 (silenciosamente ignorados).

---

## Como testar fim-a-fim

1. Conectar conta (passo 6 acima).
2. Em **Compras → Mercado Livre**, clicar em **"Resincronizar 50 últimos"**.
3. Conferir lista de pedidos importados.
4. Abrir um pedido com NF disponível: o XML/PDF deve aparecer com botão de download.
5. Vincular esse pedido ML a um `cmp_pedido_compra` existente — depois entrar
   em **Compras → Pedidos → (esse pedido)** e ver o bloco **"Mercado Livre"**
   com status do envio e link para a NF.
