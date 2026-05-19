// Sincronização de notas fiscais do Mercado Livre (comprador / MLB).

import { getServiceClient } from '../_shared/supabase.ts'
import { ml, type MlCredencialRow } from '../_shared/ml.ts'
import { extrairNfeMetadados } from '../_shared/nfe.ts'

const STORAGE_BUCKET = 'mercadolivre-nf'

export type MlOrderNf = {
  id: number
  pack_id?: number | null
  seller?: { id?: number }
}

export type SyncNfResult = {
  encontradas: number
  salvas: number
  avisos: string[]
}

function normalizarFileType(raw: string | null | undefined): 'pdf' | 'xml' | null {
  const s = (raw ?? '').toLowerCase()
  if (s.includes('pdf')) return 'pdf'
  if (s.includes('xml')) return 'xml'
  return null
}

/** ML: se pack_id for null, usar order_id na URL /packs/{id}. */
export function resolverPackId(order: MlOrderNf): number {
  return order.pack_id ?? order.id
}

async function salvarNf(
  cred: MlCredencialRow,
  packKey: number,
  docId: string,
  bytes: ArrayBuffer,
  opts: {
    fileType: 'pdf' | 'xml'
    filename?: string | null
    dataEmissao?: string | null
    rawMetadata?: Record<string, unknown>
  },
): Promise<boolean> {
  const supa = getServiceClient()
  const { fileType, filename, dataEmissao, rawMetadata } = opts

  const { data: existente } = await supa
    .from('ml_notas_fiscais')
    .select('id, storage_path')
    .eq('ml_pack_id', packKey)
    .eq('ml_doc_id', docId)
    .maybeSingle()

  if (existente?.storage_path) return false

  const path = `${cred.empresa_id}/${packKey}/${docId}_${filename ?? `nf.${fileType}`}`
  const { error: upErr } = await supa.storage.from(STORAGE_BUCKET).upload(
    path,
    new Uint8Array(bytes),
    { contentType: fileType === 'xml' ? 'application/xml' : 'application/pdf', upsert: true },
  )
  if (upErr) {
    console.error(`[sync] upload storage falhou (${docId}):`, upErr)
    return false
  }

  let meta = {} as ReturnType<typeof extrairNfeMetadados>
  if (fileType === 'xml') {
    try {
      meta = extrairNfeMetadados(new TextDecoder('utf-8').decode(bytes))
    } catch (e) {
      console.warn(`[sync] parse XML ${docId}:`, e)
    }
  }

  const { error: dbErr } = await supa.from('ml_notas_fiscais').upsert({
    credencial_id: cred.id,
    ml_pack_id: packKey,
    ml_doc_id: docId,
    filename: filename ?? null,
    file_type: fileType,
    data_emissao: meta.data_emissao ?? dataEmissao ?? null,
    storage_path: path,
    numero_nf: meta.numero ?? null,
    serie: meta.serie ?? null,
    chave_acesso: meta.chave_acesso ?? null,
    cnpj_emitente: meta.cnpj_emitente ?? null,
    valor_total: meta.valor_total ?? null,
    raw_metadata: rawMetadata ?? null,
  }, { onConflict: 'ml_pack_id,ml_doc_id' })

  if (dbErr) {
    console.error(`[sync] upsert ml_notas_fiscais falhou (${docId}):`, dbErr)
    return false
  }
  return true
}

async function sincronizarPackFiscalDocuments(
  cred: MlCredencialRow,
  packKey: number,
  result: SyncNfResult,
) {
  const lista = await ml.listPackInvoices(cred, packKey).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('403') && !msg.includes('not available')) {
      result.avisos.push(`Pack fiscal_documents: ${msg}`)
    }
    return null
  })
  if (!lista?.fiscal_documents?.length) return

  for (const doc of lista.fiscal_documents) {
    result.encontradas++
    const fileType = normalizarFileType(doc.file_type)
    if (!fileType) {
      result.avisos.push(`Tipo de arquivo desconhecido: ${doc.file_type}`)
      continue
    }

    let bytes: ArrayBuffer
    try {
      bytes = await ml.downloadInvoice(cred, packKey, doc.id)
    } catch (e) {
      result.avisos.push(`Falha ao baixar NF ${doc.id}: ${e instanceof Error ? e.message : String(e)}`)
      continue
    }

    const ok = await salvarNf(cred, packKey, doc.id, bytes, {
      fileType,
      filename: doc.filename,
      dataEmissao: doc.date,
      rawMetadata: { source: 'pack_fiscal_documents', ...doc },
    })
    if (ok) result.salvas++
  }
}

async function sincronizarStreamPorPedido(
  cred: MlCredencialRow,
  orderId: number,
  packKey: number,
  result: SyncNfResult,
) {
  for (const formato of ['pdf', 'xml'] as const) {
    const docId = `io_order_${orderId}_${formato}`
    const { data: existente } = await getServiceClient()
      .from('ml_notas_fiscais')
      .select('id')
      .eq('ml_pack_id', packKey)
      .eq('ml_doc_id', docId)
      .maybeSingle()
    if (existente) continue

    let bytes: ArrayBuffer
    try {
      bytes = await ml.downloadInvoiceStreamByOrder(cred, orderId, formato)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (!msg.includes('404') && !msg.includes('not_found')) {
        result.avisos.push(`Stream ${formato} pedido ${orderId}: ${msg}`)
      }
      continue
    }

    if (!bytes || bytes.byteLength < 32) continue

    result.encontradas++
    const ok = await salvarNf(cred, packKey, docId, bytes, {
      fileType: formato,
      filename: `nf_pedido_${orderId}.${formato}`,
      rawMetadata: { source: 'invoices_io_stream_order', order_id: orderId, formato },
    })
    if (ok) result.salvas++
  }
}

async function sincronizarFaturadorVendedor(
  cred: MlCredencialRow,
  order: MlOrderNf,
  packKey: number,
  result: SyncNfResult,
) {
  const sellerId = order.seller?.id
  if (!sellerId) return

  const inv = await ml.getSellerOrderInvoice(cred, sellerId, order.id).catch((e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.includes('404') && !msg.includes('not_found')) {
      result.avisos.push(`Faturador vendedor: ${msg}`)
    }
    return null
  })
  if (!inv) return

  const invoiceId = inv.id as number | string | undefined
  if (!invoiceId) return

  for (const formato of ['pdf', 'xml'] as const) {
    const docId = `io_invoice_${invoiceId}_${formato}`
    const { data: existente } = await getServiceClient()
      .from('ml_notas_fiscais')
      .select('id')
      .eq('ml_pack_id', packKey)
      .eq('ml_doc_id', docId)
      .maybeSingle()
    if (existente) continue

    let bytes: ArrayBuffer
    try {
      bytes = await ml.downloadInvoiceStreamByInvoiceId(cred, invoiceId, formato)
    } catch {
      continue
    }
    if (!bytes || bytes.byteLength < 32) continue

    result.encontradas++
    const ok = await salvarNf(cred, packKey, docId, bytes, {
      fileType: formato,
      filename: `nf_${invoiceId}.${formato}`,
      dataEmissao: typeof inv.issued_date === 'string' ? inv.issued_date : null,
      rawMetadata: { source: 'invoices_io_stream_invoice', invoice_id: invoiceId, invoice: inv },
    })
    if (ok) result.salvas++
  }
}

/** Tenta todas as fontes de NF conhecidas para o pedido (MLB + outras regiões). */
export async function sincronizarNotasFiscaisPedido(
  cred: MlCredencialRow,
  order: MlOrderNf,
): Promise<SyncNfResult> {
  const result: SyncNfResult = { encontradas: 0, salvas: 0, avisos: [] }
  const packKey = resolverPackId(order)

  await sincronizarPackFiscalDocuments(cred, packKey, result)
  await sincronizarStreamPorPedido(cred, order.id, packKey, result)
  await sincronizarFaturadorVendedor(cred, order, packKey, result)

  if (result.salvas === 0 && result.encontradas === 0 && result.avisos.length === 0) {
    result.avisos.push(
      'Nenhuma NF encontrada no ML para este pedido. O vendedor pode não ter emitido/anexado ainda, ou a NF só aparece após a entrega.',
    )
  }

  return result
}
