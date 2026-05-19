import { supabase } from '@/lib/supabase'
import type {
  CmpItemStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  ETAPAS_PROCESSO_SC, type EtapaProcessoSC,
} from './_fluxoEtapas'

export type { EtapaProcessoSC }

export type ItemMin = { status_item: CmpItemStatus }
export type PedidoMin = { id: string; status: CmpPedidoStatus }

export type ScMin = { id: string; status: CmpSolicitacaoStatus }

type ScComItens = ScMin & { itens?: ItemMin[] }

const PEDIDO_ETAPA: Partial<Record<CmpPedidoStatus, EtapaProcessoSC>> = {
  aguardando_aprovacao: 'pedido_aprovacao',
  aprovado: 'pedido_compra',
  enviado: 'aguardando_recebimento',
  parcialmente_recebido: 'aguardando_recebimento',
}

const PEDIDO_PRIORIDADE: CmpPedidoStatus[] = [
  'aguardando_aprovacao',
  'aprovado',
  'enviado',
  'parcialmente_recebido',
]

function itensAtivos(itens: ItemMin[]) {
  return itens.filter(i => i.status_item !== 'cancelado')
}

function pedidosVivos(pedidos: PedidoMin[]) {
  return pedidos.filter(p => !['cancelado', 'recebido'].includes(p.status))
}

/** Pior gargalo entre pedidos vivos da SC */
function etapaPelosPedidos(pedidos: PedidoMin[]): EtapaProcessoSC | null {
  const vivos = pedidosVivos(pedidos)
  for (const st of PEDIDO_PRIORIDADE) {
    if (vivos.some(p => p.status === st)) return PEDIDO_ETAPA[st] ?? null
  }
  return null
}

/** Contagens no detalhe (itens/pedidos em cada etapa — pode haver mais de um bucket > 0) */
export function contagensDetalheProcessoSC(
  sc: ScMin,
  itens: ItemMin[],
  pedidos: PedidoMin[],
): Partial<Record<EtapaProcessoSC, number>> {
  if (['reprovada', 'cancelada'].includes(sc.status)) return {}

  const ativos = itensAtivos(itens)
  return {
    aguardando_aprovacao: sc.status === 'aguardando_aprovacao' ? 1 : 0,
    compra_itens: ativos.filter(
      i => i.status_item === 'pendente' || i.status_item === 'em_cotacao',
    ).length,
    pedido_aprovacao: pedidos.filter(p => p.status === 'aguardando_aprovacao').length,
    pedido_compra: pedidos.filter(p => p.status === 'aprovado').length,
    aguardando_recebimento: pedidos.filter(
      p => p.status === 'enviado' || p.status === 'parcialmente_recebido',
    ).length,
    concluida: ativos.filter(i => i.status_item === 'atendido').length,
  }
}

/**
 * Etapa atual da SC = um único gargalo (badge da linha).
 * Prioridade: aprovação SC → pedidos (pior status) → itens pendentes/cotação → concluída.
 */
export function etapaAtualProcessoSC(
  sc: ScMin,
  itens: ItemMin[],
  pedidos: PedidoMin[],
): EtapaProcessoSC | null {
  if (sc.status === 'reprovada' || sc.status === 'cancelada') return null
  if (sc.status === 'atendida') return 'concluida'
  if (sc.status === 'aguardando_aprovacao') return 'aguardando_aprovacao'

  const ativos = itensAtivos(itens)
  const etapaPed = etapaPelosPedidos(pedidos)
  if (etapaPed) return etapaPed

  if (ativos.some(i => i.status_item === 'pendente' || i.status_item === 'em_cotacao')) {
    return 'compra_itens'
  }

  if (ativos.some(i => i.status_item === 'em_pedido')) {
    return 'pedido_compra'
  }

  if (ativos.length > 0 && ativos.every(i => i.status_item === 'atendido')) return 'concluida'

  return null
}

export function resumoProcessoSC(
  sc: ScMin,
  itens: ItemMin[],
  pedidos: PedidoMin[],
): string | null {
  const key = etapaAtualProcessoSC(sc, itens, pedidos)
  if (!key) return null
  const e = ETAPAS_PROCESSO_SC.find(x => x.key === key)
  if (!e) return null
  return `Etapa ${e.ordem} · ${e.etapa} — ${e.acao}`
}

function scTemEtapa(
  sc: ScComItens,
  pedidos: PedidoMin[],
  etapa: EtapaProcessoSC,
): boolean {
  const itens = sc.itens ?? []
  const ativos = itensAtivos(itens)

  switch (etapa) {
    case 'aguardando_aprovacao':
      return sc.status === 'aguardando_aprovacao'
    case 'compra_itens':
      return sc.status === 'aprovada' && ativos.some(
        i => i.status_item === 'pendente' || i.status_item === 'em_cotacao',
      )
    case 'pedido_aprovacao':
      return pedidos.some(p => p.status === 'aguardando_aprovacao')
    case 'pedido_compra':
      return pedidos.some(p => p.status === 'aprovado')
    case 'aguardando_recebimento':
      return pedidos.some(
        p => p.status === 'enviado' || p.status === 'parcialmente_recebido',
      )
    case 'concluida':
      return sc.status === 'atendida' || (
        ativos.length > 0 && ativos.every(i => i.status_item === 'atendido')
      )
    default:
      return false
  }
}

async function listarScsAtivasComItens(): Promise<ScComItens[]> {
  const { data } = await supabase
    .from('cmp_solicitacoes_compra')
    .select('id, status, itens:cmp_solicitacoes_compra_itens(status_item)')

  return ((data ?? []) as ScComItens[]).filter(
    s => s.status !== 'reprovada' && s.status !== 'cancelada',
  )
}

async function mapaScsComPedidos(): Promise<{ sc: ScComItens; pedidos: PedidoMin[] }[]> {
  const scs = await listarScsAtivasComItens()
  const pedidosPorSc = await pedidosResumoPorScIds(scs.map(s => s.id))
  return scs.map(sc => ({
    sc,
    pedidos: pedidosPorSc[sc.id] ?? [],
  }))
}

export async function scIdsParaEtapa(etapa: EtapaProcessoSC): Promise<string[]> {
  const linhas = await mapaScsComPedidos()
  return linhas
    .filter(({ sc, pedidos }) => scTemEtapa(sc, pedidos, etapa))
    .map(({ sc }) => sc.id)
}

export async function scIdsConcluidas(): Promise<string[]> {
  return scIdsParaEtapa('concluida')
}

/** Contagens globais: itens/pedidos na etapa (não só quantidade de SCs) */
export async function carregarContagensProcessoSC(): Promise<Partial<Record<EtapaProcessoSC, number>>> {
  const linhas = await mapaScsComPedidos()
  const contagem: Partial<Record<EtapaProcessoSC, number>> = {}
  for (const e of ETAPAS_PROCESSO_SC) contagem[e.key] = 0

  for (const { sc, pedidos } of linhas) {
    const det = contagensDetalheProcessoSC(sc, sc.itens ?? [], pedidos)
    for (const e of ETAPAS_PROCESSO_SC) {
      contagem[e.key] = (contagem[e.key] ?? 0) + (det[e.key] ?? 0)
    }
  }
  return contagem
}

export async function pedidosResumoPorScIds(
  scIds: string[],
): Promise<Record<string, PedidoMin[]>> {
  if (scIds.length === 0) return {}

  const { data: vincs } = await supabase
    .from('cmp_cotacoes_solicitacoes')
    .select('solicitacao_id, cotacao_id')
    .in('solicitacao_id', scIds)

  const cotPorSc: Record<string, string[]> = {}
  for (const v of vincs ?? []) {
    const sid = v.solicitacao_id as string
    const cid = v.cotacao_id as string
    if (!cotPorSc[sid]) cotPorSc[sid] = []
    cotPorSc[sid].push(cid)
  }

  const cotIds = [...new Set((vincs ?? []).map(v => v.cotacao_id as string))]
  const porSc: Record<string, Map<string, PedidoMin>> = {}
  scIds.forEach(id => { porSc[id] = new Map() })

  const addPedido = (sid: string, ped: PedidoMin) => {
    if (!porSc[sid]) porSc[sid] = new Map()
    porSc[sid].set(ped.id, ped)
  }

  if (cotIds.length > 0) {
    const { data: pedsCot } = await supabase
      .from('cmp_pedidos_compra')
      .select('id, status, cotacao_id')
      .in('cotacao_id', cotIds)

    for (const p of pedsCot ?? []) {
      const cid = p.cotacao_id as string
      const ped: PedidoMin = { id: p.id as string, status: p.status as CmpPedidoStatus }
      for (const sid of scIds) {
        if (cotPorSc[sid]?.includes(cid)) addPedido(sid, ped)
      }
    }
  }

  const { data: itensSc } = await supabase
    .from('cmp_solicitacoes_compra_itens')
    .select('id, solicitacao_id')
    .in('solicitacao_id', scIds)

  const itemIds = (itensSc ?? []).map(i => i.id)
  if (itemIds.length > 0) {
    const { data: pedItens } = await supabase
      .from('cmp_pedidos_compra_itens')
      .select('solicitacao_item_id, pedido:cmp_pedidos_compra(id, status)')
      .in('solicitacao_item_id', itemIds)

    const itemParaSc: Record<string, string> = {}
    itensSc?.forEach(i => { itemParaSc[i.id] = i.solicitacao_id as string })

    for (const row of pedItens ?? []) {
      const ped = row.pedido as { id: string; status: CmpPedidoStatus } | null
      if (!ped?.id) continue
      const sid = itemParaSc[row.solicitacao_item_id as string]
      if (sid) addPedido(sid, { id: ped.id, status: ped.status })
    }
  }

  const result: Record<string, PedidoMin[]> = {}
  for (const sid of scIds) {
    result[sid] = [...(porSc[sid]?.values() ?? [])]
  }
  return result
}

export async function itensResumoPorScIds(
  scIds: string[],
): Promise<Record<string, ItemMin[]>> {
  if (scIds.length === 0) return {}
  const { data } = await supabase
    .from('cmp_solicitacoes_compra_itens')
    .select('solicitacao_id, status_item')
    .in('solicitacao_id', scIds)

  const map: Record<string, ItemMin[]> = {}
  scIds.forEach(id => { map[id] = [] })
  for (const row of data ?? []) {
    const sid = row.solicitacao_id as string
    map[sid]?.push({ status_item: row.status_item as CmpItemStatus })
  }
  return map
}
