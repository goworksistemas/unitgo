// Edge Function: ml-oauth-callback
//
// Fluxo:
//   1. Frontend abre auth.mercadolivre.com.br/authorization?... com state=<empresa_id>
//   2. ML redireciona usuário para /ml/callback?code=...&state=<empresa_id>
//   3. Esta function:
//      - troca o code por tokens
//      - busca /users/me para descobrir ml_user_id, nickname, email
//      - upsert em ml_credenciais
//      - redireciona para o frontend com sucesso/erro
//
// Endpoint público (verify_jwt = false), pois o navegador é redirecionado pelo ML
// sem credencial Supabase.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { trocaCodePorToken, ml } from '../_shared/ml.ts'
import { getServiceClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const pre = handlePreflight(req)
  if (pre) return pre

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')   // empresa_id
  const errParam = url.searchParams.get('error')
  const errDesc = url.searchParams.get('error_description')

  const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'http://localhost:5173'
  const redirectUri = Deno.env.get('ML_REDIRECT_URI')!

  function redirectToFrontend(qs: Record<string, string>) {
    const dest = new URL('/cadastros/mercado-livre', frontendUrl)
    Object.entries(qs).forEach(([k, v]) => dest.searchParams.set(k, v))
    return Response.redirect(dest.toString(), 302)
  }

  if (errParam) {
    return redirectToFrontend({ ml_error: errParam, ml_error_description: errDesc ?? '' })
  }

  if (!code || !state) {
    return jsonResponse({ error: 'Faltam parâmetros obrigatórios (code, state).' }, 400)
  }

  try {
    // 1. Troca code por token
    const tokens = await trocaCodePorToken(code, redirectUri)

    // 2. Descobre dados do usuário do ML
    const obtidoEm = new Date()
    const expiraEm = new Date(obtidoEm.getTime() + tokens.expires_in * 1000)

    // Cria credencial temporária para chamar /users/me
    const tempCred = {
      id: 'temp',
      empresa_id: state,
      ml_user_id: tokens.user_id,
      nickname: null,
      email: null,
      site_id: null,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_obtido_em: obtidoEm.toISOString(),
      token_expira_em: expiraEm.toISOString(),
      scopes: tokens.scope?.split(' ') ?? null,
      ativo: true,
    }
    const me = await ml.getMe(tempCred)

    // 3. Upsert
    const supa = getServiceClient()
    const { error } = await supa.from('ml_credenciais').upsert({
      empresa_id: state,
      ml_user_id: tokens.user_id,
      nickname: me.nickname,
      email: me.email,
      site_id: me.site_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_obtido_em: obtidoEm.toISOString(),
      token_expira_em: expiraEm.toISOString(),
      scopes: tokens.scope?.split(' ') ?? null,
      ativo: true,
    }, { onConflict: 'empresa_id,ml_user_id' })

    if (error) {
      return redirectToFrontend({ ml_error: 'persist_failed', ml_error_description: error.message })
    }

    return redirectToFrontend({ ml_success: '1', ml_user_id: String(tokens.user_id), nickname: me.nickname })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return redirectToFrontend({ ml_error: 'callback_failed', ml_error_description: msg })
  }
})
