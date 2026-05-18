import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, CheckCircle2, FileSearch, ShoppingCart, Receipt,
  User as UserIcon, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/**
 * Stepper compacto que mostra o fluxo COMPLETO de uma compra
 * (Solicitação → Aprovação → Cotação → Pedido → Recebimento)
 * em qualquer tela de detalhe — basta passar o ID de qualquer "objeto" do processo.
 */
export function LinhaTempoProcesso({
  scId,
  cotacaoId,
  pedidoId,
  currentStep,
}: {
  scId?: string | null
  cotacaoId?: string | null
  pedidoId?: string | null
  currentStep: 'sc' | 'aprovacao' | 'cotacao' | 'pedido' | 'recebimento'
}) {
  const [resolvedScId, setResolvedScId] = useState<string | null>(scId ?? null)
  const [data, setData] = useState<ProcessoData | null>(null)
  const [loading, setLoading] = useState(true)

  // Resolve scId a partir de cotacaoId ou pedidoId, se necessário
  useEffect(() => {
    let cancel = false
    async function resolver() {
      if (scId) { setResolvedScId(scId); return }
      if (cotacaoId) {
        const { data } = await supabase.from('cmp_cotacoes_solicitacoes')
          .select('solicitacao_id').eq('cotacao_id', cotacaoId).limit(1).maybeSingle()
        if (!cancel) setResolvedScId(data?.solicitacao_id ?? null)
        return
      }
      if (pedidoId) {
        // Tenta via cotação
        const { data: ped } = await supabase.from('cmp_pedidos_compra')
          .select('cotacao_id').eq('id', pedidoId).maybeSingle()
        if (ped?.cotacao_id) {
          const { data: cotSc } = await supabase.from('cmp_cotacoes_solicitacoes')
            .select('solicitacao_id').eq('cotacao_id', ped.cotacao_id).limit(1).maybeSingle()
          if (!cancel) setResolvedScId(cotSc?.solicitacao_id ?? null)
          return
        }
        // Pedido direto: pega via item.solicitacao_item_id
        const { data: itens } = await supabase.from('cmp_pedidos_compra_itens')
          .select('solicitacao_item_id').eq('pedido_id', pedidoId).not('solicitacao_item_id', 'is', null).limit(1)
        if (itens && itens[0]?.solicitacao_item_id) {
          const { data: scItem } = await supabase.from('cmp_solicitacoes_compra_itens')
            .select('solicitacao_id').eq('id', itens[0].solicitacao_item_id).maybeSingle()
          if (!cancel) setResolvedScId(scItem?.solicitacao_id ?? null)
        } else {
          if (!cancel) setResolvedScId(null)
        }
      }
    }
    resolver()
    return () => { cancel = true }
  }, [scId, cotacaoId, pedidoId])

  // Carrega os dados do processo
  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      const d: ProcessoData = {
        sc: null, cotacoes: [], pedidos: [], recebimentos: [],
      }

      if (resolvedScId) {
        const { data: sc } = await supabase.from('cmp_solicitacoes_compra')
          .select(`*,
            solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email),
            aprovador:profiles!cmp_solicitacoes_compra_aprovador_id_fkey(id,nome,email),
            departamento:core_departamentos(id,nome,gestor_id,gestor:profiles!core_departamentos_gestor_id_fkey(id,nome,email))
          `).eq('id', resolvedScId).maybeSingle()
        d.sc = sc as SCMin | null

        const { data: vincs } = await supabase.from('cmp_cotacoes_solicitacoes')
          .select('cotacao_id').eq('solicitacao_id', resolvedScId)
        const cotIds = (vincs ?? []).map(v => v.cotacao_id)
        if (cotIds.length > 0) {
          const { data: cots } = await supabase.from('cmp_cotacoes')
            .select(`id,numero,status,aprovado_em,aprovador:profiles!cmp_cotacoes_aprovador_id_fkey(id,nome,email)`)
            .in('id', cotIds).order('created_at')
          d.cotacoes = (cots ?? []) as unknown as CotMin[]
        }
      } else if (cotacaoId) {
        // Cotação avulsa (sem SC)
        const { data: cot } = await supabase.from('cmp_cotacoes')
          .select(`id,numero,status,aprovado_em,aprovador:profiles!cmp_cotacoes_aprovador_id_fkey(id,nome,email)`)
          .eq('id', cotacaoId).maybeSingle()
        if (cot) d.cotacoes = [cot as unknown as CotMin]
      }

      // Pedidos: via cotações OU via solicitacao_item_id (pedido direto)
      const pedidosTodos: PedMin[] = []
      if (d.cotacoes.length > 0) {
        const { data: peds } = await supabase.from('cmp_pedidos_compra')
          .select(`id,numero,status,cotacao_id,aprovado_em,enviado_em,fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)`)
          .in('cotacao_id', d.cotacoes.map(c => c.id)).order('created_at')
        pedidosTodos.push(...((peds ?? []) as unknown as PedMin[]))
      }
      if (resolvedScId) {
        // Pedidos diretos
        const { data: scItens } = await supabase.from('cmp_solicitacoes_compra_itens')
          .select('id').eq('solicitacao_id', resolvedScId)
        const scItemIds = (scItens ?? []).map(i => i.id)
        if (scItemIds.length > 0) {
          const { data: pedItens } = await supabase.from('cmp_pedidos_compra_itens')
            .select('pedido_id').in('solicitacao_item_id', scItemIds)
          const pedIdsDiretos = Array.from(new Set((pedItens ?? []).map(i => i.pedido_id)))
            .filter(pid => !pedidosTodos.some(p => p.id === pid))
          if (pedIdsDiretos.length > 0) {
            const { data: peds } = await supabase.from('cmp_pedidos_compra')
              .select(`id,numero,status,cotacao_id,aprovado_em,enviado_em,fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)`)
              .in('id', pedIdsDiretos).order('created_at')
            pedidosTodos.push(...((peds ?? []) as unknown as PedMin[]))
          }
        }
      }
      d.pedidos = pedidosTodos

      if (pedidosTodos.length > 0) {
        const { data: recs } = await supabase.from('cmp_recebimentos')
          .select('id,numero,data_recebimento,pedido_id')
          .in('pedido_id', pedidosTodos.map(p => p.id))
          .order('data_recebimento')
        d.recebimentos = (recs ?? []) as RecMin[]
      }

      if (!cancel) {
        setData(d)
        setLoading(false)
      }
    }
    carregar()
    return () => { cancel = true }
  }, [resolvedScId, cotacaoId])

  const steps = useMemo(() => buildSteps(data), [data])

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-5 py-4">
        <div className="h-12 flex items-center justify-center">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!data || (!data.sc && data.cotacoes.length === 0)) return null

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
// Tipos internos
// ────────────────────────────────────────────────────────────────

interface ProcessoData {
  sc: SCMin | null
  cotacoes: CotMin[]
  pedidos: PedMin[]
  recebimentos: RecMin[]
}

interface SCMin {
  id: string; numero: string; status: string
  enviada_em: string | null; aprovado_em: string | null
  solicitante?: { nome?: string | null; email: string } | null
  aprovador?: { nome?: string | null; email: string } | null
  departamento?: { nome: string; gestor?: { nome?: string | null; email: string } | null } | null
}
interface CotMin {
  id: string; numero: string; status: string
  aprovado_em: string | null
  aprovador?: { nome?: string | null; email: string } | null
}
interface PedMin {
  id: string; numero: string; status: string
  cotacao_id: string | null
  aprovado_em: string | null; enviado_em: string | null
  fornecedor?: { razao_social: string; nome_fantasia: string | null } | null
}
interface RecMin {
  id: string; numero: string; data_recebimento: string; pedido_id: string
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
  const recs = d.recebimentos

  const cotPrincipal = cots.find(c => c.status !== 'cancelada') ?? cots[0]
  const temPedDireto = peds.some(p => !p.cotacao_id)

  // ── SC
  const stepSC: Step = sc
    ? {
        key: 'sc', label: 'Solicitação', icon: FileText,
        status: 'concluido',
        detalhe: sc.numero,
        subdetalhe: sc.solicitante?.nome ?? sc.solicitante?.email,
        subdetalheIcon: 'user',
        link: `/compras/solicitacoes/${sc.id}`,
      }
    : { key: 'sc', label: 'Solicitação', icon: FileText, status: 'skip', detalhe: 'sem SC' }

  // ── Aprovação SC
  const stepAprov: Step = sc
    ? sc.status === 'aprovada' || sc.status === 'atendida'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'concluido',
          detalhe: 'aprovada', subdetalhe: sc.aprovador?.nome ?? sc.aprovador?.email, subdetalheIcon: 'user' }
      : sc.status === 'aguardando_aprovacao'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'atual',
          detalhe: 'aguardando', subdetalhe: sc.departamento?.gestor?.nome ?? 'sem gestor', subdetalheIcon: 'user' }
      : sc.status === 'reprovada'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'concluido', detalhe: 'reprovada' }
      : sc.status === 'cancelada'
      ? { key: 'aprovacao', label: 'Aprovação SC', icon: CheckCircle2, status: 'skip', detalhe: 'cancelada' }
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
    const aprov = cots.find(c => c.status === 'orcamento_aprovado')
    if (aprov && cots.every(c => c.status === 'orcamento_aprovado' || c.status === 'cancelada')) {
      return {
        key: 'cotacao', label: 'Cotação', icon: FileSearch, status: 'concluido',
        detalhe: cots.length > 1 ? `${cots.length} cotações` : cotPrincipal.numero,
        subdetalhe: aprov.aprovador?.nome ?? aprov.aprovador?.email,
        subdetalheIcon: 'user',
        link: `/compras/cotacoes/${aprov.id}`,
      }
    }
    let subStatus = ''
    let resp = 'Comprador'
    switch (cotPrincipal.status) {
      case 'aberta':                          subStatus = 'lançar preços'; break
      case 'respondida':                      subStatus = 'escolher vencedor'; break
      case 'vencedor_escolhido':              subStatus = 'enviar p/ diretoria'; break
      case 'aguardando_aprovacao_orcamento':  subStatus = 'aguardando diretoria'; resp = 'Diretor'; break
      default:                                subStatus = cotPrincipal.status
    }
    return {
      key: 'cotacao', label: 'Cotação', icon: FileSearch, status: 'atual',
      detalhe: `${cotPrincipal.numero}: ${subStatus}`, subdetalhe: resp, subdetalheIcon: 'user',
      link: `/compras/cotacoes/${cotPrincipal.id}`,
    }
  })()

  // ── Pedido
  const stepPed: Step = (() => {
    if (peds.length === 0) {
      if (cots.some(c => c.status === 'orcamento_aprovado')) {
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
        link: peds.length === 1 ? `/compras/pedidos/${peds[0].id}` : undefined,
      }
    }
    if (aguardando.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'atual',
        detalhe: `${aguardando.length} aguardando aprovação`,
        subdetalhe: 'Diretor', subdetalheIcon: 'user',
        link: `/compras/pedidos/${aguardando[0].id}`,
      }
    }
    if (aprovados.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'atual',
        detalhe: `${aprovados.length} aguardando envio`,
        subdetalhe: 'Comprador', subdetalheIcon: 'user',
        link: `/compras/pedidos/${aprovados[0].id}`,
      }
    }
    if (ativos.length > 0) {
      return {
        key: 'pedido', label: 'Pedido', icon: ShoppingCart, status: 'concluido',
        detalhe: peds.length > 1 ? `${peds.length} pedidos` : peds[0].numero,
        link: peds.length === 1 ? `/compras/pedidos/${peds[0].id}` : undefined,
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
        detalhe: `${recs.length} recebimento(s)` }
    }
    if (enviados.length > 0) {
      return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'atual',
        detalhe: `${enviados.length} esperando entrega`,
        subdetalhe: 'Almoxarife', subdetalheIcon: 'user' }
    }
    return { key: 'recebimento', label: 'Recebimento', icon: Receipt, status: 'pendente' }
  })()

  return [stepSC, stepAprov, stepCot, stepPed, stepRec]
}
