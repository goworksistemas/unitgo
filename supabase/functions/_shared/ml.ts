// Cliente HTTP do Mercado Livre + helpers de OAuth e renovação de token.

import { getServiceClient } from './supabase.ts'

const ML_BASE = 'https://api.mercadolibre.com'

// Margem de segurança para renovar token antes da expiração de fato.
const REFRESH_MARGIN_MS = 5 * 60_000 // 5 minutos

// ────────────────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────────────────

export interface MlTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  user_id: number
  scope?: string
  token_type?: string
}

export interface MlCredencialRow {
  id: string
  empresa_id: string
  ml_user_id: number
  nickname: string | null
  email: string | null
  site_id: string | null
  access_token: string
  refresh_token: string
  token_obtido_em: string
  token_expira_em: string
  scopes: string[] | null
  ativo: boolean
}

// ────────────────────────────────────────────────────────────
// OAuth — Authorization Code & Refresh Token
// ────────────────────────────────────────────────────────────

export async function trocaCodePorToken(
  code: string,
  redirectUri: string,
): Promise<MlTokenResponse> {
  const clientId = Deno.env.get('ML_CLIENT_ID')!
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')!

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })

  const resp = await fetch(`${ML_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json',
    },
    body,
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`OAuth code exchange falhou (${resp.status}): ${txt}`)
  }

  return await resp.json() as MlTokenResponse
}

export async function renovaToken(refreshToken: string): Promise<MlTokenResponse> {
  const clientId = Deno.env.get('ML_CLIENT_ID')!
  const clientSecret = Deno.env.get('ML_CLIENT_SECRET')!

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })

  const resp = await fetch(`${ML_BASE}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      'accept': 'application/json',
    },
    body,
  })

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`Refresh token falhou (${resp.status}): ${txt}`)
  }

  return await resp.json() as MlTokenResponse
}

/**
 * Pega a credencial e renova automaticamente se faltar < 5min para expirar.
 * Persiste o novo refresh_token (rotativo).
 */
export async function getCredencialValida(credencialId: string): Promise<MlCredencialRow> {
  const supa = getServiceClient()
  const { data, error } = await supa
    .from('ml_credenciais')
    .select('*')
    .eq('id', credencialId)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`Credencial ML ${credencialId} não encontrada: ${error?.message}`)
  }

  const cred = data as MlCredencialRow
  const expiraEm = new Date(cred.token_expira_em).getTime()
  if (expiraEm - Date.now() > REFRESH_MARGIN_MS) {
    return cred
  }

  // Renova
  const novo = await renovaToken(cred.refresh_token)
  const obtidoEm = new Date()
  const expiraEmNovo = new Date(obtidoEm.getTime() + novo.expires_in * 1000)

  const { data: atualizada, error: updErr } = await supa
    .from('ml_credenciais')
    .update({
      access_token: novo.access_token,
      refresh_token: novo.refresh_token,
      token_obtido_em: obtidoEm.toISOString(),
      token_expira_em: expiraEmNovo.toISOString(),
    })
    .eq('id', credencialId)
    .select('*')
    .single()

  if (updErr) {
    throw new Error(`Falha ao salvar token renovado: ${updErr.message}`)
  }
  return atualizada as MlCredencialRow
}

/**
 * Localiza a credencial (única por ml_user_id) e renova se preciso.
 */
export async function getCredencialPorMlUserId(mlUserId: number): Promise<MlCredencialRow> {
  const supa = getServiceClient()
  const { data, error } = await supa
    .from('ml_credenciais')
    .select('id')
    .eq('ml_user_id', mlUserId)
    .eq('ativo', true)
    .maybeSingle()

  if (error || !data) {
    throw new Error(`Credencial para ml_user_id=${mlUserId} não encontrada`)
  }
  return await getCredencialValida(data.id as string)
}

// ────────────────────────────────────────────────────────────
// Cliente HTTP autenticado
// ────────────────────────────────────────────────────────────

export interface MlFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: BodyInit | null
  /** Retornar arrayBuffer em vez de JSON (download de arquivos). */
  binary?: boolean
}

export async function mlFetch<T = unknown>(
  cred: MlCredencialRow,
  path: string,
  options: MlFetchOptions = {},
): Promise<T> {
  const url = path.startsWith('http') ? path : `${ML_BASE}${path}`
  const resp = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      'Authorization': `Bearer ${cred.access_token}`,
      'accept': 'application/json',
      ...(options.headers ?? {}),
    },
    body: options.body ?? undefined,
  })

  if (resp.status === 429) {
    // Rate limit: estratégia mínima — aguarda 2s e tenta de novo (1 vez)
    await new Promise(r => setTimeout(r, 2000))
    const retry = await fetch(url, {
      method: options.method ?? 'GET',
      headers: {
        'Authorization': `Bearer ${cred.access_token}`,
        'accept': 'application/json',
        ...(options.headers ?? {}),
      },
      body: options.body ?? undefined,
    })
    if (!retry.ok) {
      const txt = await retry.text()
      throw new Error(`ML ${url} → ${retry.status}: ${txt}`)
    }
    return options.binary
      ? (await retry.arrayBuffer()) as unknown as T
      : (await retry.json()) as T
  }

  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`ML ${url} → ${resp.status}: ${txt}`)
  }

  return options.binary
    ? (await resp.arrayBuffer()) as unknown as T
    : (await resp.json()) as T
}

// ────────────────────────────────────────────────────────────
// Wrappers de endpoints relevantes
// ────────────────────────────────────────────────────────────

export const ml = {
  getMe(cred: MlCredencialRow) {
    return mlFetch<{
      id: number
      nickname: string
      email: string
      site_id: string
    }>(cred, '/users/me')
  },

  getOrder(cred: MlCredencialRow, orderId: number) {
    return mlFetch<Record<string, unknown>>(cred, `/orders/${orderId}`)
  },

  searchOrdersByBuyer(cred: MlCredencialRow, buyerId: number, offset = 0, limit = 50) {
    const qs = new URLSearchParams({
      buyer: String(buyerId),
      offset: String(offset),
      limit: String(limit),
      sort: 'date_desc',
    })
    return mlFetch<{ results: Record<string, unknown>[]; paging: { total: number; offset: number; limit: number } }>(
      cred,
      `/orders/search?${qs}`,
    )
  },

  getShipment(cred: MlCredencialRow, shipmentId: number) {
    return mlFetch<Record<string, unknown>>(cred, `/shipments/${shipmentId}`, {
      headers: { 'x-format-new': 'true' },
    })
  },

  getShipmentHistory(cred: MlCredencialRow, shipmentId: number) {
    return mlFetch<Record<string, unknown>>(cred, `/shipments/${shipmentId}/history`)
  },

  listPackInvoices(cred: MlCredencialRow, packId: number) {
    return mlFetch<{ pack_id: number; fiscal_documents: Array<{ id: string; date: string; file_type: string; filename: string }> }>(
      cred,
      `/packs/${packId}/fiscal_documents`,
    )
  },

  downloadInvoice(cred: MlCredencialRow, packId: number, docId: string) {
    return mlFetch<ArrayBuffer>(cred, `/packs/${packId}/fiscal_documents/${docId}`, { binary: true })
  },

  /** NF emitida pelo faturador ML (funciona no MLB; diferente do upload do vendedor no pack). */
  downloadInvoiceStreamByOrder(cred: MlCredencialRow, orderId: number, formato: 'pdf' | 'xml') {
    return mlFetch<ArrayBuffer>(
      cred,
      `/invoices/io/documents/stream/order/${orderId}/${formato}`,
      { binary: true },
    )
  },

  downloadInvoiceStreamByInvoiceId(cred: MlCredencialRow, invoiceId: number | string, formato: 'pdf' | 'xml') {
    return mlFetch<ArrayBuffer>(
      cred,
      `/invoices/io/documents/stream/invoice/${invoiceId}/${formato}`,
      { binary: true },
    )
  },

  getSellerOrderInvoice(cred: MlCredencialRow, sellerId: number, orderId: number) {
    return mlFetch<Record<string, unknown>>(cred, `/users/${sellerId}/invoices/orders/${orderId}`)
  },

  getItem(cred: MlCredencialRow, itemId: string) {
    return mlFetch<Record<string, unknown>>(cred, `/items/${itemId}`)
  },

  getUser(cred: MlCredencialRow, userId: number) {
    return mlFetch<Record<string, unknown>>(cred, `/users/${userId}`)
  },
}
