import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, CheckCircle2, FileSearch, ShoppingCart, Receipt,
  User as UserIcon, Clock,
} from 'lucide-react'
import { rpcCompras } from './_rpc'
import type { CmpCotacaoStatus, CmpSolicitacaoStatus } from '@/types/database'
import { COTACAO_STATUS_META, PEDIDO_STATUS_META, STATUS_META } from './_shared'

/**
 * Stepper compacto que mostra o fluxo COMPLETO de uma compra
 * (Solicitação → Aprovação → Cotação → Pedido → Recebimento)
 * em qualquer tela de detalhe — basta passar o ID de qualquer "objeto" do processo.
 *
 * Dados vêm de uma única chamada à RPC `cmp_linha_tempo`, que já resolve
 * o `scId` a partir de uma cotação ou pedido e devolve sc/cotacoes/pedidos
 * e a contagem de recebimentos em UM round-trip.
 */
export function LinhaTempoProcesso({
  scId,
  cotacaoId,
  pedidoId,
  currentStep,
  compacto = false,
}: {
  scId?: string | null
  cotacaoId?: string | null
  pedidoId?: string | null
  currentStep: 'sc' | 'aprovacao' | 'cotacao' | 'pedido' | 'recebimento'
  compacto?: boolean
}) {
  const [data, setData] = useState<ProcessoData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      const { data: payload, error } = await rpcCompras<RpcLinhaTempo>('cmp_linha_tempo', {
        p_sc_id: scId ?? null,
        p_cot_id: cotacaoId ?? null,
        p_pedido_id: pedidoId ?? null,
      })
      if (cancel) return
      if (error) {
        console.error('[LinhaTempoProcesso] cmp_linha_tempo:', error)
        setData({ sc: null, cotacoes: [], pedidos: [], recebimentosQtd: 0, scId: null })
        setLoading(false)
        return
      }
      const p = payload ?? ({} as RpcLinhaTempo)
      setData({
        sc: p.sc ?? null,
        cotacoes: p.cotacoes ?? [],
        pedidos: p.pedidos ?? [],
        recebimentosQtd: p.recebimentos_qtd ?? 0,
        scId: p.sc?.id ?? null,
      })
      setLoading(false)
    }
    carregar()
    return () => { cancel = true }
  }, [scId, cotacaoId, pedidoId])

  const steps = useMemo(() => buildSteps(data), [data])

  if (loading) {
    return (
      <div className={compacto ? 'py-0.5' : 'rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4'}>
        <div className={`${compacto ? 'h-7' : 'h-12'} flex items-center justify-center`}>
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!data || (!data.sc && data.cotacoes.length === 0)) return null

  // ── Modo compacto: altura reduzida, apenas círculos + label, sem caixa externa ──
  if (compacto) {
    return (
      <div>
        <div className="flex items-center justify-between gap-1 overflow-x-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon
            const isAtual = s.key === currentStep
            const isConcluido = s.status === 'concluido'
            const isSkip = s.status === 'skip'

            const cor =
              isAtual      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/40' :
              isConcluido  ? 'bg-emerald-500 text-white border-emerald-500' :
              isSkip       ? 'bg-gray-200 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-700' :
                             'bg-white dark:bg-gray-900 text-gray-400 border-gray-300 dark:border-gray-700'

            const conector =
              isConcluido || (steps[idx + 1] && (steps[idx + 1].status === 'concluido' || steps[idx + 1].status === 'atual'))
                ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'

            const conteudo = (
              <>
                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${cor}`}>
                  {isConcluido ? <CheckCircle2 size={11} /> : <Icon size={10} />}
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap ${
                  isAtual     ? 'text-amber-700 dark:text-amber-300' :
                  isConcluido ? 'text-emerald-700 dark:text-emerald-300' :
                  isSkip      ? 'text-gray-400 line-through' :
                                'text-gray-500'
                }`}>{idx + 1}. {s.label}</span>
              </>
            )

            return (
              <div key={s.key} className="flex items-center flex-1 min-w-fit">
                {s.link ? (
                  <Link to={s.link} className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex-1">
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex items-center gap-1.5 px-1.5 py-0.5 flex-1">
                    {conteudo}
                  </div>
                )}
                {idx < steps.length - 1 && (
                  <div className={`mx-1 h-0.5 w-4 shrink-0 ${conector}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-2.5">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          Linha do tempo do processo
        </span>
      </div>
      <div className="px-5 py-4">
        <div className="flex items-stretch justify-between gap-1 overflow-x-auto">
          {steps.map((s, idx) => {
            const Icon = s.icon
            const isAtual = s.key === currentStep
            const isConcluido = s.status === 'concluido'
            const isSkip = s.status === 'skip'

            const cor =
              isAtual      ? 'bg-amber-500 text-white border-amber-500 ring-2 ring-amber-200 dark:ring-amber-900/40' :
              isConcluido  ? 'bg-emerald-500 text-white border-emerald-500' :
              isSkip       ? 'bg-gray-200 text-gray-400 border-gray-200 dark:bg-gray-800 dark:border-gray-700' :
                             'bg-white dark:bg-gray-900 text-gray-400 border-gray-300 dark:border-gray-700'

            const conector =
              isConcluido || (steps[idx + 1] && (steps[idx + 1].status === 'concluido' || steps[idx + 1].status === 'atual'))
                ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'

            const conteudo = (
              <>
                <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all shrink-0 ${cor}`}>
                  {isConcluido ? <CheckCircle2 size={14} /> : <Icon size={13} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold ${
                    isAtual     ? 'text-amber-700 dark:text-amber-300' :
                    isConcluido ? 'text-emerald-700 dark:text-emerald-300' :
                    isSkip      ? 'text-gray-400 line-through' :
                                  'text-gray-500'
                  }`}>{idx + 1}. {s.label}</p>
                  {s.detalhe && (
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{s.detalhe}</p>
                  )}
                  {s.subdetalhe && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate flex items-center gap-1">
                      {s.subdetalheIcon === 'user' ? <UserIcon size={9} /> : s.subdetalheIcon === 'clock' ? <Clock size={9} /> : null}
                      {s.subdetalhe}
                    </p>
                  )}
                </div>
              </>
            )

            return (
              <div key={s.key} className="flex items-stretch flex-1 min-w-[150px]">
                {s.link ? (
                  <Link to={s.link} className="flex items-start gap-2 px-2 py-1 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors flex-1">
                    {conteudo}
                  </Link>
                ) : (
                  <div className="flex items-start gap-2 px-2 py-1 flex-1">
                    {conteudo}
                  </div>
                )}
                {idx < steps.length - 1 && (
                  <div className="flex items-center px-1">
                    <div className={`w-6 h-0.5 ${conector}`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Tipos internos (espelham o retorno da RPC cmp_linha_tempo)
// ────────────────────────────────────────────────────────────────

interface RpcLinhaTempo {
  sc: SCMin | null
  cotacoes: CotMin[]
  pedidos: PedMin[]
  recebimentos_qtd: number
}

interface ProcessoData {
  sc: SCMin | null
  cotacoes: CotMin[]
  pedidos: PedMin[]
  recebimentosQtd: number
  scId: string | null
}

interface SCMin {
  id: string; numero: string; status: string
  created_at: string | null
  aprovado_em: string | null
}
interface CotMin {
  id: string; numero: string; status: string
  created_at: string | null
  aprovado_em: string | null
}
interface PedMin {
  id: string; numero: string; status: string
  created_at: string | null
  enviado_em: string | null
  aprovado_em: string | null
}

interface Step {
  key: 'sc' | 'aprovacao' | 'cotacao' | 'pedido' | 'recebimento'
  label: string
  icon: typeof FileText
  status: 'concluido' | 'atual' | 'pendente' | 'skip'
  detalhe?: string
  subdetalhe?: string
  subdetalheIcon?: 'user' | 'clock'
  link?: string
}

function buildSteps(d: ProcessoData | null): Step[] {
  if (!d) return []
  const sc = d.sc
  const cots = d.cotacoes
  const peds = d.pedidos
  const recsQtd = d.recebimentosQtd

  const cotPrincipal = cots.find(c => c.status !== 'cancelada') ?? cots[0]
  // Sem cotacao_id no payload da RPC: heurística — se há pedidos mas não há cotações vinculadas,
  // o processo seguiu por "pedido direto".
  const temPedDireto = peds.length > 0 && cots.length === 0
  const numerosPedidos = peds.map(p => p.numero).filter(Boolean)
  const previewPedidos = (limite = 2) => {
    if (numerosPedidos.length === 0) return ''
    if (numerosPedidos.length <= limite) return numerosPedidos.join(', ')
    return `${numerosPedidos.slice(0, limite).join(', ')} +${numerosPedidos.length - limite}`
  }

  // Quando há SC, todos os caminhos do passo "Pedido" levam para a visão consolidada
  // do processo (lista de pedidos vinculados). Sem SC, cai pro detalhe do primeiro pedido.
  const linkPedidos = d.scId
    ? `/compras/solicitacoes/${d.scId}/pedidos`
    : (peds[0] ? `/compras/pedidos/${peds[0].id}` : undefined)

  // ── SC
  const stepSC: Step = sc
    ? {
        key: 'sc', label: 'Solicitação', icon: FileText,
        status: 'concluido',
        detalhe: `${sc.numero} · ${STATUS_META[sc.status as CmpSolicitacaoStatus]?.label ?? sc.status}`,
        link: `/compras/solicitacoes/${sc.id}`,
      }
    : { key: 'sc', label: 'Solicitação', icon: FileText, status: 'skip', detalhe: 'sem SC' }

  // ── Aprovação SC
  const stepAprov: Step = sc
    ? sc.status === 'aprovada' || sc.status === 'atendida'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'concluido', detalhe: STATUS_META.aprovada.label }
      : sc.status === 'aguardando_aprovacao'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'atual', detalhe: STATUS_META.aguardando_aprovacao.label }
      : sc.status === 'reprovada'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'concluido', detalhe: STATUS_META.reprovada.label }
      : sc.status === 'cancelada'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'skip', detalhe: STATUS_META.cancelada.label }
      : { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'pendente' }
    : { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'skip' }

  // ── Cotação
  const stepCot: Step = (() => {
    if (cots.length === 0 && temPedDireto) {
      return { key: 'cotacao', label: 'Cotação', icon: FileSearch, status: 'skip', detalhe: 'pulada (pedido direto)' }
    }
    if (cots.length === 0) {
      const status = sc && (sc.status === 'aprovada' || sc.status === 'atendida') ? 'atual' : 'pendente'
      return { key: 'cotacao', label: 'Cotação', icon: FileSearch, status, detalhe: status === 'atual' ? 'aguardando comprador' : '' }
    }

    const encerradas = cots.filter(c => c.status === 'encerrada')
    if (encerradas.length > 0 && cots.every(c => c.status === 'encerrada' || c.status === 'cancelada')) {
      const ref = encerradas[0]
      return {
        key: 'cotacao', label: 'Cotação', icon: FileSearch, status: 'concluido',
        detalhe: cots.length > 1 ? `${cots.length} cotações` : `${ref.numero}: ${COTACAO_STATUS_META.encerrada.label}`,
        link: `/compras/cotacoes/${ref.id}`,
      }
    }

    const cotSt = cotPrincipal.status as CmpCotacaoStatus
    const subStatus = COTACAO_STATUS_META[cotSt]?.label ?? cotPrincipal.status
    return {
      key: 'cotacao', label: 'Cotação', icon: FileSearch, status: 'atual',
      detalhe: `${cotPrincipal.numero}: ${subStatus}`,
      link: `/compras/cotacoes/${cotPrincipal.id}`,
    }
  })()

  // ── Pedido
  const stepPed: Step = (() => {
    if (peds.length === 0) {
      if (cots.some(c => c.status === 'vencedor_escolhido')) {
        return { key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'atual', detalhe: 'aguardando geração' }
      }
      return { key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'pendente' }
    }
    const aguardando = peds.filter(p => p.status === 'aguardando_aprovacao')
    const aprovados = peds.filter(p => p.status === 'aprovado')
    const recebidos = peds.filter(p => p.status === 'recebido')
    const ativos = peds.filter(p => !['cancelado','recebido'].includes(p.status))

    if (recebidos.length === peds.length) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'concluido',
        detalhe: peds.length > 1 ? `${peds.length} pedidos` : peds[0].numero,
        subdetalhe: peds.length > 1 ? previewPedidos() : undefined,
        link: linkPedidos,
      }
    }
    if (aguardando.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'atual',
        detalhe: aguardando.length === 1
          ? `${aguardando[0].numero}: ${PEDIDO_STATUS_META.aguardando_aprovacao.label}`
          : `${aguardando.length} · ${PEDIDO_STATUS_META.aguardando_aprovacao.label}`,
        subdetalhe: aguardando.length > 1 ? previewPedidos() : undefined,
        link: linkPedidos,
      }
    }
    if (aprovados.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'atual',
        detalhe: aprovados.length === 1
          ? `${aprovados[0].numero}: ${PEDIDO_STATUS_META.aprovado.label}`
          : `${aprovados.length} · ${PEDIDO_STATUS_META.aprovado.label}`,
        subdetalhe: aprovados.length > 1 ? previewPedidos() : undefined,
        link: linkPedidos,
      }
    }
    if (ativos.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'concluido',
        detalhe: peds.length > 1 ? `${peds.length} pedidos` : peds[0].numero,
        subdetalhe: peds.length > 1 ? previewPedidos() : undefined,
        link: linkPedidos,
      }
    }
    return { key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'concluido', detalhe: `${peds.length} cancelado(s)` }
  })()

  // ── Recebimento
  const stepRec: Step = (() => {
    if (peds.length === 0) {
      return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'pendente' }
    }
    const enviados = peds.filter(p => p.status === 'enviado' || p.status === 'parcialmente_recebido')
    const recebidos = peds.filter(p => p.status === 'recebido')
    if (recebidos.length === peds.length) {
      return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'concluido',
        detalhe: `${recsQtd} recebimento(s)` }
    }
    if (enviados.length > 0) {
      return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'atual',
        detalhe: `${enviados.length} esperando entrega` }
    }
    return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'pendente' }
  })()

  return [stepSC, stepAprov, stepCot, stepPed, stepRec]
}
