// Edge Function: ml-webhook
//
// Recebe POST do Mercado Livre. Responde 200 IMEDIATAMENTE (req do ML
// expira em 22s) e dispara processamento assíncrono.
//
// Idempotência: chave (topic, resource, sent_at) é única em ml_webhook_eventos.
//
// Endpoint público (verify_jwt = false), pois o ML não envia credencial Supabase.

import { handlePreflight } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'

interface MlWebhookPayload {
  _id?: string
  resource: string
  user_id: number
  topic: string
  application_id?: number
  attempts?: number
  sent?: string
  received?: string
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req)
  if (pre) return pre

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let payload: MlWebhookPayload
  try {
    payload = await req.json() as MlWebhookPayload
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Resposta imediata. Processamento real é enfileirado abaixo (background task).
  const ack = new Response('ok', { status: 200 })

  // Persiste evento + agenda processamento. Usa EdgeRuntime.waitUntil para
  // não bloquear a resposta ao ML.
  const work = (async () => {
    const supa = getServiceClient()

    try {
      const { data: inserted, error } = await supa
        .from('ml_webhook_eventos')
        .insert({
          topic: payload.topic,
          resource: payload.resource,
          ml_user_id: payload.user_id,
          application_id: payload.application_id ?? null,
          attempts: payload.attempts ?? null,
          sent_at: payload.sent ?? null,
          raw_payload: payload as unknown as Record<string, unknown>,
        })
        .select('id')
        .single()

      // Se já existe (idempotência), simplesmente ignora
      if (error) {
        if (error.code === '23505') {
          return
        }
        console.error('[ml-webhook] erro inserindo evento:', error)
        return
      }

      // Dispara o sync via invoke (fire-and-forget)
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      await fetch(`${supabaseUrl}/functions/v1/ml-sync-resource`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ evento_id: inserted.id }),
      }).catch(err => console.error('[ml-webhook] erro disparando sync:', err))
    } catch (e) {
      console.error('[ml-webhook] exception:', e)
    }
  })()

  // @ts-ignore — EdgeRuntime.waitUntil existe em runtime, falta no tipo
  if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(work)
  } else {
    // fallback: aguarda mesmo (pior caso, ML aceita até 22s)
    await work
  }

  return ack
})
