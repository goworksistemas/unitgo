// Edge Function: ml-refresh-tokens
//
// Roda em cron (recomendado: a cada 1h via pg_cron ou cron.org).
// Renova preventivamente todas as credenciais cujo token expira nos próximos 60min.
//
// Autenticação: Bearer <service_role_key>.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { renovaToken } from '../_shared/ml.ts'

Deno.serve(async (req) => {
  const pre = handlePreflight(req)
  if (pre) return pre

  const auth = req.headers.get('Authorization') ?? ''
  const expected = `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
  if (auth !== expected) return jsonResponse({ error: 'unauthorized' }, 401)

  const supa = getServiceClient()

  // Pega tudo que vence nos próximos 60min
  const horizonte = new Date(Date.now() + 60 * 60_000).toISOString()
  const { data: candidatas, error } = await supa
    .from('ml_credenciais')
    .select('id, refresh_token')
    .eq('ativo', true)
    .lte('token_expira_em', horizonte)

  if (error) return jsonResponse({ error: error.message }, 500)
  if (!candidatas || candidatas.length === 0) {
    return jsonResponse({ ok: true, renovadas: 0 })
  }

  let okCount = 0
  const erros: { id: string; erro: string }[] = []

  for (const cred of candidatas) {
    try {
      const novo = await renovaToken(cred.refresh_token)
      const obtidoEm = new Date()
      const expira = new Date(obtidoEm.getTime() + novo.expires_in * 1000)
      const { error: updErr } = await supa
        .from('ml_credenciais')
        .update({
          access_token: novo.access_token,
          refresh_token: novo.refresh_token,
          token_obtido_em: obtidoEm.toISOString(),
          token_expira_em: expira.toISOString(),
        })
        .eq('id', cred.id)
      if (updErr) throw new Error(updErr.message)
      okCount++
    } catch (e) {
      erros.push({ id: cred.id, erro: e instanceof Error ? e.message : String(e) })
    }
  }

  return jsonResponse({ ok: true, renovadas: okCount, erros })
})
