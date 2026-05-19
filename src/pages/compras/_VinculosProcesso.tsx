import {
  createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo,
  useRef, useState, type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  FileText, FileSearch, ShoppingCart, Receipt, Network, Store,
} from 'lucide-react'
import type {
  CmpCotacaoStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  COTACAO_STATUS_META, PEDIDO_STATUS_META, STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty,
  type StatusMeta,
} from './_shared'

export type TipoVinculo = 'sc' | 'cotacao' | 'pedido' | 'recebimento' | 'ml'

export type VinculoItemResumo = {
  linha?: number
  nome: string
  codigo?: string | null
  quantidade?: number
  unidade?: string | null
  preco_unitario?: number
  total?: number
  quantidade_recebida?: number
}

export type VinculoTooltipData = {
  titulo: string
  linhas: Array<{ label: string; value: string }>
  itens?: VinculoItemResumo[]
}

export type VinculoRef = {
  id: string
  tipo: TipoVinculo
  numero: string
  status?: string
  subtitulo?: string
  tooltip: VinculoTooltipData
  href?: string
  /** Item atualmente aberto na tela — recebe destaque e não é clicável */
  atual?: boolean
  /** IDs do(s) vínculo(s) no tipo anterior — usados para desenhar as conexões */
  relIds?: string[]
}

export type VinculoGrupo = {
  label: string
  itens: VinculoRef[]
}

const TIPO_META: Record<TipoVinculo, { rotulo: string; icone: typeof FileText; cor: string }> = {
  sc: { rotulo: 'SC', icone: FileText, cor: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40' },
  cotacao: { rotulo: 'Cotação', icone: FileSearch, cor: 'text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/40' },
  pedido: { rotulo: 'Pedido', icone: ShoppingCart, cor: 'text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40' },
  recebimento: { rotulo: 'Receb.', icone: Receipt, cor: 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40' },
  ml: { rotulo: 'ML', icone: Store, cor: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40' },
}

const MAX_ITENS_TOOLTIP = 8

export function vinculoHref(tipo: TipoVinculo, id: string): string {
  switch (tipo) {
    case 'sc': return `/compras/solicitacoes/${id}`
    case 'cotacao': return `/compras/cotacoes/${id}`
    case 'pedido': return `/compras/pedidos/${id}`
    case 'recebimento': return `/compras/recebimentos`
    case 'ml': return `/compras/mercado-livre/${id}`
    default: return '#'
  }
}

function statusMeta(tipo: TipoVinculo, status: string | undefined): StatusMeta | null {
  if (!status) return null
  if (tipo === 'sc') return STATUS_META[status as CmpSolicitacaoStatus] ?? null
  if (tipo === 'cotacao') return COTACAO_STATUS_META[status as CmpCotacaoStatus] ?? null
  if (tipo === 'pedido') return PEDIDO_STATUS_META[status as CmpPedidoStatus] ?? null
  return null
}

function nomeFornecedor(f?: { razao_social?: string; nome_fantasia?: string | null } | null): string {
  if (!f) return ''
  return f.nome_fantasia ?? f.razao_social ?? ''
}

function linhaKV(label: string, value: string | null | undefined) {
  if (!value) return null
  return { label, value }
}

export type ScTooltipInput = {
  id: string; numero: string; status: CmpSolicitacaoStatus
  departamento?: { codigo?: string | null; nome?: string | null } | null
  empresa?: { nome_fantasia?: string | null; razao_social?: string | null } | null
  created_at?: string
}

function tooltipSC(sc: ScTooltipInput): VinculoTooltipData {
  const empresa = sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social
  const depto = sc.departamento?.codigo
    ? `${sc.departamento.codigo} · ${sc.departamento.nome ?? ''}`
    : sc.departamento?.nome
  return {
    titulo: `Solicitação ${sc.numero}`,
    linhas: [
      linhaKV('Status', STATUS_META[sc.status].label),
      linhaKV('Empresa', empresa ?? undefined),
      linhaKV('Departamento', depto ?? undefined),
      linhaKV('Criada', sc.created_at ? formatDateTime(sc.created_at) : undefined),
    ].filter((x): x is { label: string; value: string } => x != null),
  }
}

export type CotTooltipInput = {
  id: string; numero: string; titulo?: string
  status: CmpCotacaoStatus
  comprador?: { nome?: string | null; email?: string | null } | null
  prazo_resposta?: string | null
  created_at?: string
  itens_count?: number
  fornecedores_count?: number
  total_escolhido?: number
}

function tooltipCotacao(c: CotTooltipInput): VinculoTooltipData {
  return {
    titulo: `Cotação ${c.numero}`,
    linhas: [
      linhaKV('Título', c.titulo),
      linhaKV('Status', COTACAO_STATUS_META[c.status].label),
      linhaKV('Itens', c.itens_count != null ? `${c.itens_count}` : undefined),
      linhaKV('Fornecedores', c.fornecedores_count != null ? `${c.fornecedores_count}` : undefined),
      linhaKV('Total escolhido', (c.total_escolhido ?? 0) > 0 ? formatMoney(c.total_escolhido) : undefined),
      linhaKV('Comprador', c.comprador?.nome ?? c.comprador?.email ?? undefined),
      linhaKV('Prazo resposta', c.prazo_resposta ? formatDate(c.prazo_resposta) : undefined),
      linhaKV('Criada', c.created_at ? formatDateTime(c.created_at) : undefined),
    ].filter((x): x is { label: string; value: string } => x != null),
  }
}

/** Status no card: só o documento atual usa cor forte; vínculos ficam neutros. */
function statusNoCard(item: VinculoRef): { label: string; dot: string } | null {
  const st = statusMeta(item.tipo, item.status)
  if (!st) return null
  if (item.atual) return { label: st.label, dot: st.dot }
  return { label: st.label, dot: 'bg-gray-400 dark:bg-gray-500' }
}

function formatItensResumo(itens: VinculoItemResumo[] | undefined): VinculoItemResumo[] {
  return (itens ?? []).map(i => ({
    linha: i.linha,
    nome: i.nome || '—',
    codigo: i.codigo,
    quantidade: i.quantidade,
    unidade: i.unidade,
    preco_unitario: i.preco_unitario,
    total: i.total,
    quantidade_recebida: i.quantidade_recebida,
  }))
}

type PedidoVincBase = {
  id: string
  numero: string
  status: CmpPedidoStatus
  fornecedor?: { razao_social: string; nome_fantasia: string | null } | null
  cotacao_id?: string | null
  scs_origem_ids?: string[]
  created_at?: string
  enviado_em?: string | null
  total?: number
  qtd_total?: number
  qtd_recebida?: number
  itens_resumo?: VinculoItemResumo[]
}

function tooltipPedido(pd: PedidoVincBase): VinculoTooltipData {
  const forn = nomeFornecedor(pd.fornecedor)
  const qtdT = pd.qtd_total ?? 0
  const qtdR = pd.qtd_recebida ?? 0
  const pct = qtdT > 0 ? Math.min(100, (qtdR / qtdT) * 100) : 0
  const itens = formatItensResumo(pd.itens_resumo)

  const linhas = [
    linhaKV('Status', PEDIDO_STATUS_META[pd.status].label),
    linhaKV('Fornecedor', forn),
    linhaKV('Total', pd.total != null ? formatMoney(pd.total) : undefined),
    linhaKV('Recebimento', qtdT > 0
      ? `${formatQty(qtdR)} / ${formatQty(qtdT)} (${pct.toFixed(0)}%)`
      : undefined),
    linhaKV('Criado', pd.created_at ? formatDateTime(pd.created_at) : undefined),
    linhaKV('Enviado', pd.enviado_em ? formatDateTime(pd.enviado_em) : undefined),
    linhaKV('Itens', itens.length > 0 ? `${itens.length} linha(s)` : 'Sem itens'),
  ].filter((x): x is { label: string; value: string } => x != null)

  return {
    titulo: `Pedido ${pd.numero}`,
    linhas,
    itens,
  }
}

function refPedido(pd: PedidoVincBase): VinculoRef {
  const forn = nomeFornecedor(pd.fornecedor)
  // Conexão: PC ← COT (preferencial) ou PC ← SCs (pedido direto)
  const relIds = pd.cotacao_id
    ? [pd.cotacao_id]
    : (pd.scs_origem_ids ?? [])
  return {
    id: pd.id,
    tipo: 'pedido',
    numero: pd.numero,
    status: pd.status,
    subtitulo: forn || undefined,
    tooltip: tooltipPedido(pd),
    relIds,
  }
}

// ── Ordem canônica do fluxo de compras ──
// Esta ordem é fixa em TODAS as telas (SC, COT, PC, etc.) para preservar
// o modelo mental do processo: Solicitação → Cotação → Pedido → Recebimento → ML.
const ORDEM_FLUXO: TipoVinculo[] = ['sc', 'cotacao', 'pedido', 'recebimento', 'ml']

/** Rótulos canônicos (sempre no plural) — idênticos em todas as telas. */
const LABEL_GRUPO: Record<TipoVinculo, string> = {
  sc: 'Solicitações',
  cotacao: 'Cotações',
  pedido: 'Pedidos',
  recebimento: 'Recebimentos',
  ml: 'Mercado Livre',
}

/** Ordena os grupos seguindo `ORDEM_FLUXO`, baseado no tipo do primeiro item. */
function ordenarGruposFluxo(grupos: VinculoGrupo[]): VinculoGrupo[] {
  const ordenados = [...grupos].sort((a, b) => {
    const ta = a.itens[0]?.tipo ?? 'sc'
    const tb = b.itens[0]?.tipo ?? 'sc'
    return ORDEM_FLUXO.indexOf(ta) - ORDEM_FLUXO.indexOf(tb)
  })

  // Reordena recebimentos para acompanhar a ordem dos pedidos:
  // cada PC fica logo seguido pelo(s) seu(s) REC, criando uma "trilha" visual
  // alinhada entre as colunas Pedidos e Recebimentos.
  const pcGrupo = ordenados.find(g => g.itens[0]?.tipo === 'pedido')
  const recGrupo = ordenados.find(g => g.itens[0]?.tipo === 'recebimento')
  if (pcGrupo && recGrupo) {
    const restantes = [...recGrupo.itens]
    const novosRecs: VinculoRef[] = []
    for (const pc of pcGrupo.itens) {
      const pertencentes = restantes.filter(r => r.href?.endsWith(`/${pc.id}`))
      novosRecs.push(...pertencentes)
      for (const p of pertencentes) {
        const idx = restantes.indexOf(p)
        if (idx >= 0) restantes.splice(idx, 1)
      }
    }
    novosRecs.push(...restantes)
    recGrupo.itens = novosRecs
  }

  return ordenados
}

// ── Builders ──

export function gruposVinculosSC(p: {
  /** SC atual (opcional) — quando passada, aparece destacada no grupo "Solicitação" */
  sc?: {
    id: string; numero: string; status: CmpSolicitacaoStatus
    departamento?: { codigo?: string | null; nome?: string | null } | null
    empresa?: { nome_fantasia?: string | null; razao_social?: string | null } | null
    created_at?: string
  } | null
  cotacoes: Array<{
    id: string; numero: string; titulo: string
    status: CmpCotacaoStatus
    comprador?: { nome?: string | null; email?: string | null } | null
    prazo_resposta?: string | null
    created_at?: string
    itens_count?: number
    fornecedores_count?: number
    total_escolhido?: number
  }>
  pedidos: PedidoVincBase[]
  recebimentos: Array<{
    id: string; numero: string; pedido_id: string
    data_recebimento: string; observacoes?: string | null
    pedido_numero?: string
  }>
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  if (p.sc) {
    const empresa = p.sc.empresa?.nome_fantasia ?? p.sc.empresa?.razao_social
    const depto = p.sc.departamento?.codigo
      ? `${p.sc.departamento.codigo} · ${p.sc.departamento.nome ?? ''}`
      : p.sc.departamento?.nome
    grupos.push({
      label: LABEL_GRUPO.sc,
      itens: [{
        id: p.sc.id,
        tipo: 'sc',
        numero: p.sc.numero,
        status: p.sc.status,
        subtitulo: depto ?? empresa ?? undefined,
        atual: true,
        tooltip: tooltipSC(p.sc),
      }],
    })
  }

  if (p.cotacoes.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.cotacao,
      itens: p.cotacoes.map(c => ({
        id: c.id,
        tipo: 'cotacao',
        numero: c.numero,
        status: c.status,
        subtitulo: c.titulo,
        relIds: p.sc?.id ? [p.sc.id] : undefined,
        tooltip: tooltipCotacao(c),
      })),
    })
  }

  if (p.pedidos.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.pedido,
      itens: p.pedidos.map(pd => {
        const ref = refPedido(pd)
        // Se o pedido não veio com cotacao_id e a SC é conhecida, conecta direto à SC
        if ((ref.relIds?.length ?? 0) === 0 && p.sc?.id) {
          ref.relIds = [p.sc.id]
        }
        return ref
      }),
    })
  }

  if (p.recebimentos.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.recebimento,
      itens: p.recebimentos.map(r => ({
        id: r.id,
        tipo: 'recebimento',
        numero: r.numero,
        subtitulo: r.pedido_numero ? `Ped. ${r.pedido_numero}` : undefined,
        href: `/compras/pedidos/${r.pedido_id}`,
        relIds: [r.pedido_id],
        tooltip: {
          titulo: `Recebimento ${r.numero}`,
          linhas: [
            linhaKV('Pedido', r.pedido_numero),
            linhaKV('Data', formatDateTime(r.data_recebimento)),
            linhaKV('Observações', r.observacoes ?? undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  return ordenarGruposFluxo(grupos)
}

export function gruposVinculosCotacao(p: {
  /** Cotação atual (opcional) — quando passada, aparece destacada no grupo "Cotação" */
  cotacao?: CotTooltipInput | null
  scs: ScTooltipInput[]
  pedidos: PedidoVincBase[]
  /** Recebimentos vinculados aos pedidos desta cotação */
  recebimentos?: Array<{
    id: string; numero: string; pedido_id: string
    data_recebimento: string; observacoes?: string | null
    pedido_numero?: string
  }>
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  if (p.cotacao) {
    const c = p.cotacao
    grupos.push({
      label: LABEL_GRUPO.cotacao,
      itens: [{
        id: c.id,
        tipo: 'cotacao',
        numero: c.numero,
        status: c.status,
        subtitulo: c.titulo,
        atual: true,
        relIds: p.scs.map(s => s.id),
        tooltip: tooltipCotacao(c),
      }],
    })
  }

  if (p.scs.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.sc,
      itens: p.scs.map(s => {
        const empresa = s.empresa?.nome_fantasia ?? s.empresa?.razao_social
        const depto = s.departamento?.codigo
          ? `${s.departamento.codigo} · ${s.departamento.nome ?? ''}`
          : s.departamento?.nome
        return {
          id: s.id,
          tipo: 'sc' as const,
          numero: s.numero,
          status: s.status,
          subtitulo: depto ?? empresa ?? undefined,
          tooltip: tooltipSC(s),
        }
      }),
    })
  }

  if (p.pedidos.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.pedido,
      itens: p.pedidos.map(pd => {
        const ref = refPedido(pd)
        if ((ref.relIds?.length ?? 0) === 0 && p.cotacao?.id) {
          ref.relIds = [p.cotacao.id]
        }
        return ref
      }),
    })
  }

  if ((p.recebimentos ?? []).length > 0) {
    grupos.push({
      label: LABEL_GRUPO.recebimento,
      itens: (p.recebimentos ?? []).map(r => ({
        id: r.id,
        tipo: 'recebimento',
        numero: r.numero,
        subtitulo: r.pedido_numero ? `Ped. ${r.pedido_numero}` : undefined,
        href: `/compras/pedidos/${r.pedido_id}`,
        relIds: [r.pedido_id],
        tooltip: {
          titulo: `Recebimento ${r.numero}`,
          linhas: [
            linhaKV('Pedido', r.pedido_numero),
            linhaKV('Data', formatDateTime(r.data_recebimento)),
            linhaKV('Observações', r.observacoes ?? undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  return ordenarGruposFluxo(grupos)
}

export function gruposVinculosPedido(p: {
  /** Pedido atual (opcional) — quando passado, aparece destacado no grupo "Pedido" */
  pedido?: PedidoVincBase | null
  /** Pedidos irmãos (mesma cotação ou mesma SC) — entram junto com o pedido atual */
  pedidosIrmaos?: PedidoVincBase[]
  cotacao?: CotTooltipInput | null
  scs: ScTooltipInput[]
  recebimentos: Array<{
    id: string; numero: string; pedido_id?: string; pedido_numero?: string
    data_recebimento: string
    observacoes?: string | null
    recebedor?: { nome?: string | null; email?: string | null } | null
  }>
  mlPedidoId?: string | null
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  const refsPedidos: VinculoRef[] = []
  const aplicarRelPedido = (ref: VinculoRef) => {
    if ((ref.relIds?.length ?? 0) > 0) return
    if (p.cotacao?.id) {
      ref.relIds = [p.cotacao.id]
    } else if (p.scs.length > 0) {
      ref.relIds = p.scs.map(s => s.id)
    }
  }
  if (p.pedido) {
    const ref = refPedido(p.pedido)
    ref.atual = true
    aplicarRelPedido(ref)
    refsPedidos.push(ref)
  }
  for (const irmao of p.pedidosIrmaos ?? []) {
    if (p.pedido && irmao.id === p.pedido.id) continue
    const ref = refPedido(irmao)
    aplicarRelPedido(ref)
    refsPedidos.push(ref)
  }
  if (refsPedidos.length > 0) {
    grupos.push({ label: LABEL_GRUPO.pedido, itens: refsPedidos })
  }

  if (p.cotacao) {
    grupos.push({
      label: LABEL_GRUPO.cotacao,
      itens: [{
        id: p.cotacao.id,
        tipo: 'cotacao',
        numero: p.cotacao.numero,
        status: p.cotacao.status,
        subtitulo: p.cotacao.titulo,
        relIds: p.scs.map(s => s.id),
        tooltip: tooltipCotacao(p.cotacao),
      }],
    })
  }

  if (p.scs.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.sc,
      itens: p.scs.map(s => {
        const empresa = s.empresa?.nome_fantasia ?? s.empresa?.razao_social
        const depto = s.departamento?.codigo
          ? `${s.departamento.codigo} · ${s.departamento.nome ?? ''}`
          : s.departamento?.nome
        return {
          id: s.id,
          tipo: 'sc' as const,
          numero: s.numero,
          status: s.status,
          subtitulo: depto ?? empresa ?? undefined,
          tooltip: tooltipSC(s),
        }
      }),
    })
  }

  if (p.recebimentos.length > 0) {
    grupos.push({
      label: LABEL_GRUPO.recebimento,
      itens: p.recebimentos.map(r => ({
        id: r.id,
        tipo: 'recebimento',
        numero: r.numero,
        subtitulo: r.pedido_numero ? `Ped. ${r.pedido_numero}` : undefined,
        href: r.pedido_id ? `/compras/pedidos/${r.pedido_id}` : undefined,
        relIds: r.pedido_id ? [r.pedido_id] : undefined,
        tooltip: {
          titulo: `Recebimento ${r.numero}`,
          linhas: [
            linhaKV('Pedido', r.pedido_numero),
            linhaKV('Data', formatDateTime(r.data_recebimento)),
            linhaKV('Recebedor', r.recebedor?.nome ?? r.recebedor?.email ?? undefined),
            linhaKV('Observações', r.observacoes ?? undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  if (p.mlPedidoId) {
    grupos.push({
      label: LABEL_GRUPO.ml,
      itens: [{
        id: p.mlPedidoId,
        tipo: 'ml',
        numero: 'Pedido ML',
        tooltip: {
          titulo: 'Mercado Livre',
          linhas: [
            { label: 'Vínculo', value: 'Pedido integrado ao ML' },
            { label: 'Ação', value: 'Abrir detalhe ML' },
          ],
        },
      }],
    })
  }

  return ordenarGruposFluxo(grupos)
}

/** Converte itens da RPC cmp_detalhe_pedido para resumo de tooltip */
export function itensResumoFromPedidoItens(
  itens: Array<{
    linha: number
    quantidade: number
    preco_unitario: number
    quantidade_recebida: number
    produto?: { codigo: string; nome: string } | null
    unidade_medida?: { sigla: string } | null
  }>,
): VinculoItemResumo[] {
  return itens.map(it => ({
    linha: it.linha,
    nome: it.produto?.nome ?? '—',
    codigo: it.produto?.codigo,
    quantidade: it.quantidade,
    unidade: it.unidade_medida?.sigla,
    preco_unitario: it.preco_unitario,
    total: Number(it.quantidade) * Number(it.preco_unitario),
    quantidade_recebida: it.quantidade_recebida,
  }))
}

// ── UI ──

const TOOLTIP_GAP = 8
const TOOLTIP_MIN_W = 220
const TOOLTIP_MAX_W = 360
const TOOLTIP_MARGIN = 8

/**
 * Tooltip rico via portal — renderiza no `document.body` para nunca ser
 * cortado por containers com `overflow: hidden`/`overflow-x-auto`.
 *
 * Posicionamento:
 *  - preferência: acima do alvo
 *  - se não couber acima → tenta abaixo
 *  - alinhamento horizontal: clamp aos limites do viewport com margem
 */
function useVinculoTooltip(data: VinculoTooltipData) {
  const triggerRef = useRef<HTMLElement | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null)

  const calcular = useCallback(() => {
    const trig = triggerRef.current
    const tip = tipRef.current
    if (!trig) return
    const tr = trig.getBoundingClientRect()
    // largura/altura aproximadas (caso ainda não renderizado, usa estimativa)
    const tw = tip?.offsetWidth ?? TOOLTIP_MIN_W
    const th = tip?.offsetHeight ?? 80
    const vw = window.innerWidth
    const vh = window.innerHeight

    const espacoAcima = tr.top
    const espacoAbaixo = vh - tr.bottom
    const placement: 'top' | 'bottom' = espacoAcima >= th + TOOLTIP_GAP || espacoAcima > espacoAbaixo
      ? 'top'
      : 'bottom'

    let top: number
    if (placement === 'top') top = Math.max(TOOLTIP_MARGIN, tr.top - th - TOOLTIP_GAP)
    else top = Math.min(vh - th - TOOLTIP_MARGIN, tr.bottom + TOOLTIP_GAP)

    // alinha à esquerda do trigger, mas clamp ao viewport
    let left = tr.left
    if (left + tw > vw - TOOLTIP_MARGIN) left = vw - tw - TOOLTIP_MARGIN
    if (left < TOOLTIP_MARGIN) left = TOOLTIP_MARGIN

    setPos({ top, left, placement })
  }, [])

  // Recalcula imediatamente quando abrir (depois que o nó tooltip está montado, mede de novo)
  useLayoutEffect(() => {
    if (!open) return
    calcular()
    // segunda passada após paint para dimensões reais
    const id = requestAnimationFrame(calcular)
    const onScroll = () => calcular()
    const onResize = () => calcular()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
    }
  }, [open, calcular, data])

  const triggerRefCb = useCallback((el: HTMLElement | null) => {
    triggerRef.current = el
  }, [])

  const triggerProps = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
  }

  const itens = data.itens ?? []
  const itensVisiveis = itens.slice(0, MAX_ITENS_TOOLTIP)
  const itensRestantes = itens.length - itensVisiveis.length

  const tooltip = open
    ? createPortal(
        <div
          ref={tipRef}
          role="tooltip"
          style={{
            position: 'fixed',
            top: pos?.top ?? 0,
            left: pos?.left ?? 0,
            zIndex: 9999,
            minWidth: TOOLTIP_MIN_W,
            maxWidth: `min(${TOOLTIP_MAX_W}px, calc(100vw - ${TOOLTIP_MARGIN * 2}px))`,
            pointerEvents: 'none',
            opacity: pos ? 1 : 0,
          }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl px-3 py-2.5 text-[11px] leading-snug"
        >
          <p className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-1.5 mb-2">
            {data.titulo}
          </p>

          {data.linhas.length > 0 && (
            <dl className="space-y-1 mb-2">
              {data.linhas.map(row => (
                <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(72px,auto)_1fr] gap-x-2 gap-y-0">
                  <dt className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{row.label}</dt>
                  <dd className="text-[10px] text-gray-800 dark:text-gray-200 text-right tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {itens.length > 0 ? (
            <section>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Itens ({itens.length})
              </p>
              <ul className="space-y-2 pl-0.5 border-l-2 border-indigo-200 dark:border-indigo-800 ml-0.5">
                {itensVisiveis.map((it, idx) => (
                  <li key={it.linha ?? idx} className="pl-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                      {it.linha != null && (
                        <span className="text-gray-400 font-mono mr-1">#{it.linha}</span>
                      )}
                      {it.nome}
                    </p>
                    {it.codigo && (
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{it.codigo}</p>
                    )}
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 tabular-nums">
                      {formatQty(it.quantidade)} {it.unidade ?? ''}
                      {it.preco_unitario != null && (
                        <> × {formatMoney(it.preco_unitario)}</>
                      )}
                      {it.total != null && (
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {' '}= {formatMoney(it.total)}
                        </span>
                      )}
                    </p>
                    {(it.quantidade_recebida != null && it.quantidade != null) && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Recebido: {formatQty(it.quantidade_recebida)} / {formatQty(it.quantidade)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {itensRestantes > 0 && (
                <p className="text-[10px] text-gray-400 mt-1.5 italic pl-2">
                  + {itensRestantes} item(ns) — abra o pedido para ver todos
                </p>
              )}
            </section>
          ) : data.titulo.toLowerCase().includes('pedido') ? (
            <p className="text-[10px] text-gray-400 italic">Nenhum item neste pedido.</p>
          ) : null}
        </div>,
        document.body,
      )
    : null

  return { tooltip, triggerProps, triggerRefCb }
}

function VinculoTooltip({ children, data }: { children: ReactNode; data: VinculoTooltipData }) {
  const { tooltip, triggerProps, triggerRefCb } = useVinculoTooltip(data)
  return (
    <>
      <span ref={triggerRefCb} className="inline-flex max-w-full" {...triggerProps}>
        {children}
      </span>
      {tooltip}
    </>
  )
}

export function VinculoChip({ item, className = '' }: { item: VinculoRef; className?: string }) {
  const meta = TIPO_META[item.tipo]
  const Icon = meta.icone
  const st = statusMeta(item.tipo, item.status)
  const to = item.href ?? vinculoHref(item.tipo, item.id)
  const baseCls = `inline-flex items-center gap-1 max-w-full rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors`
  const cls = item.atual
    ? `${baseCls} ring-1 ring-emerald-400/70 cursor-default ${meta.cor} ${className}`
    : `${baseCls} hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${meta.cor} ${className}`

  const conteudo = (
    <>
      <Icon size={11} className="shrink-0 opacity-80" aria-hidden />
      <span className="font-mono truncate">{item.numero}</span>
      {item.subtitulo && (
        <span className="truncate text-[10px] opacity-75 max-w-[100px] hidden sm:inline">
          {item.subtitulo}
        </span>
      )}
      {st && (
        <span className={`shrink-0 rounded-full px-1 py-px text-[9px] font-semibold leading-none ${st.badge}`}>
          {st.label}
        </span>
      )}
      {item.atual && (
        <span className="shrink-0 rounded-full bg-emerald-600 text-white px-1 py-px text-[8px] font-bold leading-none uppercase tracking-wider">
          Aqui
        </span>
      )}
    </>
  )

  if (item.atual) {
    return (
      <VinculoTooltip data={item.tooltip}>
        <span className={cls} aria-current="page">{conteudo}</span>
      </VinculoTooltip>
    )
  }
  return (
    <VinculoTooltip data={item.tooltip}>
      <Link to={to} className={cls}>{conteudo}</Link>
    </VinculoTooltip>
  )
}

export function VinculosBar({ grupos, className = '' }: { grupos: VinculoGrupo[]; className?: string }) {
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  if (total === 0) return null

  return (
    <section
      className={`flex items-start gap-2 flex-wrap rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/60 px-2 py-1.5 ${className}`}
      aria-label="Vínculos do processo"
    >
      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pt-0.5">
        <Network size={12} aria-hidden />
        Vínculos
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 flex-1">
        {grupos.map(g => (
          <div key={g.label} className="inline-flex flex-wrap items-center gap-1 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase shrink-0">
              {g.label}
            </span>
            {g.itens.map(it => (
              <VinculoChip key={`${it.tipo}-${it.id}`} item={it} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function VinculosLista({ grupos }: { grupos: VinculoGrupo[] }) {
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  if (total === 0) {
    return <p className="text-xs text-gray-400 px-1">Nenhum vínculo registrado.</p>
  }

  return (
    <div className="space-y-3">
      {grupos.map(g => (
        <div key={g.label}>
          <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1.5">{g.label}</p>
          <ul className="flex flex-wrap gap-1.5">
            {g.itens.map(it => (
              <li key={`${it.tipo}-${it.id}`}>
                <VinculoChip item={it} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// VinculosFocado — faixa horizontal dedicada para telas de detalhe.
// Layout: colunas paralelas, uma por tipo, cada uma com cards ricos.
// ─────────────────────────────────────────────────────────────────────

const TIPO_ACCENT: Record<TipoVinculo, { dot: string; icone: string; titulo: string }> = {
  sc:          { dot: 'bg-emerald-500',  icone: 'text-emerald-600 dark:text-emerald-400',  titulo: 'text-emerald-700 dark:text-emerald-300' },
  cotacao:     { dot: 'bg-violet-500',   icone: 'text-violet-600 dark:text-violet-400',    titulo: 'text-violet-700 dark:text-violet-300' },
  pedido:      { dot: 'bg-indigo-500',   icone: 'text-indigo-600 dark:text-indigo-400',    titulo: 'text-indigo-700 dark:text-indigo-300' },
  recebimento: { dot: 'bg-sky-500',      icone: 'text-sky-600 dark:text-sky-400',          titulo: 'text-sky-700 dark:text-sky-300' },
  ml:          { dot: 'bg-amber-500',    icone: 'text-amber-600 dark:text-amber-400',      titulo: 'text-amber-700 dark:text-amber-300' },
}

function CardVinculo({ item }: { item: VinculoRef }) {
  const meta = TIPO_META[item.tipo]
  const Icon = meta.icone
  const accent = TIPO_ACCENT[item.tipo]
  const st = statusNoCard(item)
  const to = item.href ?? vinculoHref(item.tipo, item.id)
  const { tooltip, triggerProps, triggerRefCb } = useVinculoTooltip(item.tooltip)

  // Registra a ref do DOM no container para que ele desenhe as conexões
  const ctx = useContext(VinculosCardsCtx)
  const cardKey = `${item.tipo}-${item.id}`
  const cardRef = useCallback(
    (el: HTMLElement | null) => {
      triggerRefCb(el)
      ctx?.registrar(cardKey, el)
    },
    [ctx, cardKey, triggerRefCb],
  )
  useEffect(() => () => ctx?.registrar(cardKey, null), [ctx, cardKey])

  // Extrai 1-2 stats relevantes da tooltip pra mostrar inline
  const stats = item.tooltip.linhas
    .filter(l => ['Total', 'Total escolhido', 'Recebimento', 'Itens', 'Fornecedor'].includes(l.label))
    .slice(0, 2)

  const baseCls = 'group flex items-start gap-2 rounded-md transition-all px-2.5 py-1.5 min-w-0 w-full relative z-10'
  const clsAtual = `${baseCls} border-2 border-emerald-400/70 dark:border-emerald-500/60 bg-emerald-50/70 dark:bg-emerald-950/30 ring-1 ring-emerald-200/50 dark:ring-emerald-800/40 cursor-default`
  const clsLink = `${baseCls} border border-gray-200/70 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 hover:shadow-sm`

  const conteudo = (
    <>
      <Icon size={12} className={`shrink-0 mt-0.5 ${accent.icone}`} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-[12px] font-mono font-semibold truncate ${accent.titulo} ${item.atual ? '' : 'group-hover:underline'}`}>
            {item.numero}
          </span>
          {st && item.atual && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400">
              <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} aria-hidden />
              <span className="truncate">{st.label}</span>
            </span>
          )}
          {item.atual && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider leading-none shrink-0">
              <span className="h-1 w-1 rounded-full bg-white animate-pulse" aria-hidden />
              Aqui
            </span>
          )}
        </div>
        {item.subtitulo && (
          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
            {item.subtitulo}
          </p>
        )}
        {stats.length > 0 && (
          <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            {stats.map(s => (
              <span key={s.label} className="inline-flex items-baseline gap-0.5 min-w-0">
                <span className="text-gray-400 dark:text-gray-500">{s.label}:</span>
                <span className="tabular-nums truncate">{s.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </>
  )

  if (item.atual) {
    return (
      <>
        <div
          ref={cardRef}
          className={clsAtual}
          aria-current="page"
          {...triggerProps}
        >
          {conteudo}
        </div>
        {tooltip}
      </>
    )
  }

  return (
    <>
      <Link ref={cardRef} to={to} className={clsLink} {...triggerProps}>
        {conteudo}
      </Link>
      {tooltip}
    </>
  )
}

/**
 * Faixa dedicada de vínculos do processo — desenhada para o header das
 * telas de detalhe. Mostra colunas paralelas (uma por tipo) com cards
 * ricos clicáveis e tooltips de hover.
 *
 * - Se houver 1-2 itens em um tipo: vão visíveis como cards
 * - Se houver +3 itens: mostra 2 cards + botão "+N" que expande inline
 */
// Context que cada card usa para registrar/desregistrar seu DOM no container.
// Isso permite ao container desenhar conexões SVG entre cards usando coordenadas reais.
const VinculosCardsCtx = createContext<{
  registrar: (key: string, el: HTMLElement | null) => void
} | null>(null)

type Conexao = {
  id: string
  x1: number; y1: number
  x2: number; y2: number
  destacada: boolean
}

/**
 * Layout fixo do componente "Vínculos do processo":
 * - SEMPRE exibe 4 colunas: Solicitações | Cotações | Pedidos | Recebimentos
 * - 5ª coluna "Mercado Livre" só aparece se existir item
 * - Colunas vazias mostram placeholder discreto (não somem)
 * - SVG sobreposto desenha curvas bezier ligando cada card ao(s) seu(s) antecessor(es)
 * - Cards empilham em vertical sem aglomerar
 * - Item atual recebe destaque emerald + badge "AQUI" e as conexões dele ficam realçadas
 */
export function VinculosFocado({
  grupos,
  className = '',
}: {
  grupos: VinculoGrupo[]
  className?: string
}) {
  const porTipo: Partial<Record<TipoVinculo, VinculoGrupo>> = {}
  for (const g of grupos) {
    const t = g.itens[0]?.tipo
    if (t) porTipo[t] = g
  }
  const colunasFixas: TipoVinculo[] = ['sc', 'cotacao', 'pedido', 'recebimento']
  const temML = (porTipo.ml?.itens.length ?? 0) > 0
  const colunas: TipoVinculo[] = temML ? [...colunasFixas, 'ml'] : colunasFixas

  const total = colunas.reduce((n, t) => n + (porTipo[t]?.itens.length ?? 0), 0)
  const totalOutros = colunas.reduce(
    (n, t) => n + (porTipo[t]?.itens.filter(i => !i.atual).length ?? 0),
    0,
  )

  const containerRef = useRef<HTMLDivElement>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const cardsRef = useRef<Map<string, HTMLElement>>(new Map())
  const [conexoes, setConexoes] = useState<Conexao[]>([])
  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 })

  const recalcularRef = useRef<() => void>(() => {})
  const rafConexoesRef = useRef<number | null>(null)

  const registrar = useCallback((key: string, el: HTMLElement | null) => {
    if (el) {
      if (cardsRef.current.get(key) === el) return
      cardsRef.current.set(key, el)
    } else {
      if (!cardsRef.current.has(key)) return
      cardsRef.current.delete(key)
    }
    // Recalcula conexões no próximo frame — sem setState no callback de ref
    if (rafConexoesRef.current != null) cancelAnimationFrame(rafConexoesRef.current)
    rafConexoesRef.current = requestAnimationFrame(() => {
      rafConexoesRef.current = null
      recalcularRef.current()
    })
  }, [])

  const ctx = useMemo(() => ({ registrar }), [registrar])

  const recalcular = useCallback(() => {
    const grid = gridRef.current
    if (!grid) return
    const gb = grid.getBoundingClientRect()
    setBox(prev => (
      prev.w === gb.width && prev.h === gb.height ? prev : { w: gb.width, h: gb.height }
    ))

    const novas: Conexao[] = []
    for (const g of grupos) {
      for (const item of g.itens) {
        if (!item.relIds || item.relIds.length === 0) continue
        const destEl = cardsRef.current.get(`${item.tipo}-${item.id}`)
        if (!destEl) continue
        const db = destEl.getBoundingClientRect()
        const x2 = db.left - gb.left
        const y2 = db.top - gb.top + db.height / 2

        for (const relId of item.relIds) {
          // Procura o card de origem testando todos os tipos anteriores possíveis
          let origEl: HTMLElement | undefined
          for (const tAnt of ORDEM_FLUXO) {
            if (ORDEM_FLUXO.indexOf(tAnt) >= ORDEM_FLUXO.indexOf(item.tipo)) break
            const candidato = cardsRef.current.get(`${tAnt}-${relId}`)
            if (candidato) { origEl = candidato; break }
          }
          if (!origEl) continue
          const ob = origEl.getBoundingClientRect()
          const x1 = ob.right - gb.left
          const y1 = ob.top - gb.top + ob.height / 2

          novas.push({
            id: `${item.tipo}-${item.id}<-${relId}`,
            x1, y1, x2, y2,
            destacada: !!item.atual,
          })
        }
      }
    }
    setConexoes(prev => {
      if (
        prev.length === novas.length
        && prev.every((c, i) => {
          const n = novas[i]
          return n && c.id === n.id && c.x1 === n.x1 && c.y1 === n.y1 && c.x2 === n.x2 && c.y2 === n.y2
        })
      ) {
        return prev
      }
      return novas
    })
  }, [grupos])

  recalcularRef.current = recalcular

  // Recalcula no mount e quando os grupos mudam
  useLayoutEffect(() => { recalcular() }, [recalcular])

  // Recalcula em resize da janela e do grid
  useEffect(() => {
    const onResize = () => recalcular()
    window.addEventListener('resize', onResize)
    const ro = new ResizeObserver(() => recalcular())
    if (gridRef.current) ro.observe(gridRef.current)
    return () => {
      window.removeEventListener('resize', onResize)
      ro.disconnect()
      if (rafConexoesRef.current != null) cancelAnimationFrame(rafConexoesRef.current)
    }
  }, [recalcular])

  if (total === 0) return null

  return (
    <section
      ref={containerRef}
      className={`rounded-lg border border-gray-200/70 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 px-3 py-2.5 ${className}`}
      aria-label="Vínculos do processo"
    >
      <header className="flex items-center justify-between gap-2 mb-3 px-0.5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Network size={12} aria-hidden />
          Vínculos do processo
        </span>
        <span className="text-[10px] text-gray-400 tabular-nums">
          {totalOutros > 0
            ? `${totalOutros} ${totalOutros === 1 ? 'vínculo' : 'vínculos'}`
            : 'sem outros vínculos'}
        </span>
      </header>

      <VinculosCardsCtx.Provider value={ctx}>
        <div
          ref={gridRef}
          className="relative grid gap-x-8 gap-y-3 items-start"
          style={{ gridTemplateColumns: `repeat(${colunas.length}, minmax(0, 1fr))` }}
        >
          {/* Cabeçalhos das colunas */}
          {colunas.map(t => (
            <CabecalhoColuna
              key={`h-${t}`}
              tipo={t}
              quantidade={porTipo[t]?.itens.length ?? 0}
            />
          ))}

          {/* Cards de cada coluna */}
          {colunas.map(t => (
            <ColunaVinculos key={`c-${t}`} tipo={t} grupo={porTipo[t]} />
          ))}

          {/* SVG sobreposto desenhando conexões reais entre cards */}
          {box.w > 0 && conexoes.length > 0 && (
            <svg
              className="absolute inset-0 pointer-events-none z-0"
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
              aria-hidden
            >
              {conexoes.map(c => {
                const cx = (c.x1 + c.x2) / 2
                const d = `M ${c.x1} ${c.y1} C ${cx} ${c.y1}, ${cx} ${c.y2}, ${c.x2} ${c.y2}`
                return (
                  <path
                    key={c.id}
                    d={d}
                    fill="none"
                    stroke={c.destacada ? 'rgb(16 185 129 / 0.7)' : 'rgb(156 163 175 / 0.55)'}
                    strokeWidth={c.destacada ? 2 : 1.5}
                    strokeDasharray={c.destacada ? '0' : '4 3'}
                    strokeLinecap="round"
                  />
                )
              })}
            </svg>
          )}
        </div>
      </VinculosCardsCtx.Provider>
    </section>
  )
}

function CabecalhoColuna({
  tipo,
  quantidade,
}: {
  tipo: TipoVinculo
  quantidade: number
}) {
  const accent = TIPO_ACCENT[tipo]
  const label = LABEL_GRUPO[tipo]
  const ativo = quantidade > 0
  return (
    <div className="flex items-center gap-1.5 px-0.5 pb-1 border-b border-gray-200/60 dark:border-gray-800/60">
      <span
        className={`h-2 w-2 rounded-full shrink-0 ${ativo ? accent.dot : 'bg-gray-300 dark:bg-gray-600'}`}
        aria-hidden
      />
      <span
        className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider truncate ${ativo ? 'text-gray-600 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}`}
      >
        {label}
        {quantidade > 0 && (
          <span className="text-[10px] text-gray-400 tabular-nums">{quantidade}</span>
        )}
      </span>
    </div>
  )
}

function ColunaVinculos({ tipo, grupo }: { tipo: TipoVinculo; grupo?: VinculoGrupo }) {
  const itens = grupo?.itens ?? []
  if (itens.length === 0) {
    return (
      <div className="min-w-0 rounded-md border border-dashed border-gray-200 dark:border-gray-800 px-2 py-3 text-center">
        <p className="text-[10px] text-gray-400 dark:text-gray-600">
          Nenhum{tipo === 'cotacao' || tipo === 'recebimento' ? 'a' : ''}
        </p>
      </div>
    )
  }
  return (
    <div className="min-w-0 flex flex-col gap-2">
      {itens.map(it => (
        <CardVinculo key={`${it.tipo}-${it.id}`} item={it} />
      ))}
    </div>
  )
}

