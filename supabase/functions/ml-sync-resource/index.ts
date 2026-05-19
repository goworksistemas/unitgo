// Edge Function: ml-sync-resource
//
// Consumidora de eventos. Pode ser invocada de 3 formas:
//
// 1. POST { evento_id: uuid }
//    Processa um evento da fila ml_webhook_eventos.
//
// 2. POST { acao: 'import_orders', credencial_id: uuid, max?: number }
//    Importa últimos N pedidos do buyer (carga inicial).
//
// 3. POST { acao: 'sync_order', credencial_id: uuid, ml_order_id: number }
//    Resync manual de um único pedido (botão na UI).
//
// Todas as chamadas exigem Authorization: Bearer <service_role_key>.

import { handlePreflight, jsonResponse } from '../_shared/cors.ts'
import { getServiceClient } from '../_shared/supabase.ts'
import { validaAuth } from '../_shared/auth.ts'
import {
  getCredencialPorMlUserId,
  getCredencialValida,
  ml,
  type MlCredencialRow,
} from '../_shared/ml.ts'
import { resolverPackId, sincronizarNotasFiscaisPedido, type SyncNfResult } from './nf-sync.ts'

type MlOrder = {
  id: number
  status?: string
  status_detail?: string | null
  date_created?: string
  date_closed?: string | null
  total_amount?: number
  currency_id?: string
  pack_id?: number | null
  shipping?: { id?: number | null } | null
  seller?: { id?: number; nickname?: string }
  order_items?: Array<{
    item: { id: string; title?: string; variation_id?: number | null; thumbnail?: string | null }
    quantity?: number
    unit_price?: number
  }>
}

type MlShipment = {
  id: number
  status?: string
  substatus?: string | null
  tracking_number?: string | null
  tracking_method?: string | null
  logistic_type?: string | null
  service_id?: number | null
  estimated_delivery_extended?: { date?: string }
  status_history?: Record<string, unknown>
}

// ────────────────────────────────────────────────────────────
// Persistência: pedido / itens / envio / NF
// ────────────────────────────────────────────────────────────

async function upsertPedido(cred: MlCredencialRow, order: MlOrder) {
  const supa = getServiceClient()

  const { data: pedidoRow, error } = await supa
    .from('ml_pedidos')
    .upsert({
      credencial_id: cred.id,
      ml_order_id: order.id,
      ml_pack_id: resolverPackId(order),
      ml_shipment_id: order.shipping?.id ?? null,
      status: order.status ?? null,
      status_detail: order.status_detail ?? null,
      data_criacao: order.date_created ?? null,
      data_fechamento: order.date_closed ?? null,
      total: order.total_amount ?? null,
      moeda: order.currency_id ?? null,
      vendedor_id: order.seller?.id ?? null,
      vendedor_nickname: order.seller?.nickname ?? null,
      raw_json: order as unknown as Record<string, unknown>,
    }, { onConflict: 'credencial_id,ml_order_id' })
    .select('id')
    .single()

  if (error) throw new Error(`upsert ml_pedidos: ${error.message}`)

  const pedidoId = pedidoRow.id as string

  // Substitui itens (apaga + insere). Como pedido é imutável depois de pago,
  // delete-then-insert é seguro e evita complexidade de diff.
  await supa.from('ml_pedidos_itens').delete().eq('ml_pedido_id', pedidoId)
  if (order.order_items && order.order_items.length > 0) {
    await supa.from('ml_pedidos_itens').insert(order.order_items.map(oi => ({
      ml_pedido_id: pedidoId,
      ml_item_id: oi.item.id,
      variation_id: oi.item.variation_id ?? null,
      titulo: oi.item.title ?? null,
      quantidade: oi.quantity ?? null,
      preco_unitario: oi.unit_price ?? null,
      thumbnail: oi.item.thumbnail ?? null,
      raw_json: oi as unknown as Record<string, unknown>,
    })))
  }

  return pedidoId
}

async function upsertEnvio(cred: MlCredencialRow, ship: MlShipment) {
  const supa = getServiceClient()

  // Tenta buscar histórico em endpoint separado (pode falhar com 404, ignora)
  let history: Record<string, unknown> | null = null
  try {
    history = await ml.getShipmentHistory(cred, ship.id) as Record<string, unknown>
  } catch (e) {
    console.warn(`[sync] sem history p/ shipment ${ship.id}:`, e)
  }

  await supa.from('ml_envios').upsert({
    credencial_id: cred.id,
    ml_shipment_id: ship.id,
    status: ship.status ?? null,
    substatus: ship.substatus ?? null,
    tracking_number: ship.tracking_number ?? null,
    tracking_method: ship.tracking_method ?? null,
    logistic_type: ship.logistic_type ?? null,
    service_id: ship.service_id ?? null,
    data_estimada: ship.estimated_delivery_extended?.date ?? null,
    status_history: history ?? ship.status_history ?? null,
    raw_json: ship as unknown as Record<string, unknown>,
  }, { onConflict: 'credencial_id,ml_shipment_id' })
}

async function syncOrderCompleto(cred: MlCredencialRow, mlOrderId: number): Promise<SyncNfResult> {
  const order = await ml.getOrder(cred, mlOrderId) as unknown as MlOrder
  await upsertPedido(cred, order)

  if (order.shipping?.id) {
    try {
      const ship = await ml.getShipment(cred, order.shipping.id) as unknown as MlShipment
      await upsertEnvio(cred, ship)
    } catch (e) {
      console.warn(`[sync] shipment ${order.shipping.id} falhou:`, e)
    }
  }

  return await sincronizarNotasFiscaisPedido(cred, order)
}

// ────────────────────────────────────────────────────────────
// Processamento de evento de webhook
// ────────────────────────────────────────────────────────────

async function processarEvento(eventoId: string) {
  const supa = getServiceClient()

  const { data: ev, error } = await supa
    .from('ml_webhook_eventos')
    .select('*')
    .eq('id', eventoId)
    .single()

  if (error || !ev) throw new Error(`Evento ${eventoId} não encontrado`)

  await supa.from('ml_webhook_eventos').update({ status: 'processing' }).eq('id', ev.id)

  try {
    if (!ev.ml_user_id) throw new Error('evento sem ml_user_id')
    const cred = await getCredencialPorMlUserId(ev.ml_user_id)

    const resource = String(ev.resource)
    const topic = String(ev.topic)

    if (topic === 'orders' || topic === 'orders_v2' || topic === 'created_orders') {
      const orderId = Number(resource.split('/').pop())
      await syncOrderCompleto(cred, orderId)
    } else if (topic === 'shipments') {
      const shipId = Number(resource.split('/').pop())
      const ship = await ml.getShipment(cred, shipId) as unknown as MlShipment
      await upsertEnvio(cred, ship)
    } else if (topic === 'invoices') {
      // resource costuma ser /orders/{id} ou /packs/{id}/fiscal_documents
      const parts = resource.split('/').filter(Boolean)
      if (parts[0] === 'orders') {
        const orderId = Number(parts[1])
        const order = await ml.getOrder(cred, orderId) as unknown as MlOrder
        await sincronizarNotasFiscaisPedido(cred, order)
      } else if (parts[0] === 'packs') {
        const packId = Number(parts[1])
        await sincronizarNotasFiscaisPedido(cred, { id: packId, pack_id: packId })
      }
    } else {
      // Tópico não tratado — marca como ignorado
      await supa.from('ml_webhook_eventos').update({
        status: 'ignored',
        processed_at: new Date().toISOString(),
      }).eq('id', ev.id)
      return
    }

    await supa.from('ml_webhook_eventos').update({
      status: 'done',
      processed_at: new Date().toISOString(),
    }).eq('id', ev.id)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await supa.from('ml_webhook_eventos').update({
      status: 'error',
      error_message: msg,
      processed_at: new Date().toISOString(),
    }).eq('id', ev.id)
    throw e
  }
}

// ────────────────────────────────────────────────────────────
// Carga inicial: importar últimos pedidos do buyer
// ────────────────────────────────────────────────────────────

async function importarPedidos(credencialId: string, max = 50) {
  const cred = await getCredencialValida(credencialId)
  let offset = 0
  const limit = 50
  let trazidos = 0

  while (trazidos < max) {
    const pageSize = Math.min(limit, max - trazidos)
    const page = await ml.searchOrdersByBuyer(cred, cred.ml_user_id, offset, pageSize)
    if (!page.results || page.results.length === 0) break

    for (const order of page.results as unknown as MlOrder[]) {
      await syncOrderCompleto(cred, order.id)
      trazidos++
      if (trazidos >= max) break
    }

    if (page.results.length < pageSize) break
    offset += pageSize
  }

  await getServiceClient()
    .from('ml_credenciais')
    .update({ ultima_sync: new Date().toISOString() })
    .eq('id', credencialId)

  return trazidos
}

// ────────────────────────────────────────────────────────────
// HTTP entry-point
// ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  const pre = handlePreflight(req)
  if (pre) return pre
  if (req.method !== 'POST') return jsonResponse({ error: 'method_not_allowed' }, 405)

  const _authResult = await validaAuth(req)
  if (_authResult instanceof Response) return _authResult

  let body: { evento_id?: string; acao?: string; credencial_id?: string; ml_order_id?: number; max?: number }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'invalid_json' }, 400)
  }

  try {
    if (body.evento_id) {
      await processarEvento(body.evento_id)
      return jsonResponse({ ok: true, modo: 'evento' })
    }

    if (body.acao === 'import_orders' && body.credencial_id) {
      const n = await importarPedidos(body.credencial_id, body.max ?? 50)
      return jsonResponse({ ok: true, modo: 'import_orders', importados: n })
    }

    if (body.acao === 'sync_order' && body.credencial_id && body.ml_order_id) {
      const cred = await getCredencialValida(body.credencial_id)
      const nfs = await syncOrderCompleto(cred, body.ml_order_id)
      return jsonResponse({ ok: true, modo: 'sync_order', nfs })
    }

    return jsonResponse({ error: 'parametros_invalidos' }, 400)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return jsonResponse({ error: msg }, 500)
  }
})
