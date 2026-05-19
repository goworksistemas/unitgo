import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Truck, Send,
  CheckCircle2, Receipt, XCircle, RefreshCw,
  ArrowRightLeft, MoreHorizontal,
  History, Network, Info,
} from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpCotacao, CmpCotacaoFornecedor, CmpCotacaoItem, CmpCotacaoRespostaItem,
  CmpFornecedor, CmpPedidoStatus, CmpPedidoItemStatus,
  PrdProduto, PrdUnidadeMedida,
} from '@/types/database'
import { formatMoney, formatQty } from './_shared'
import { ETAPAS_PEDIDO_FLUXO, metaPedido } from './_fluxoEtapas'
import { FaixaEtapasToolbar } from './_FaixaEtapasToolbar'
import { PropLinha } from './_LayoutDetalhe'
import {
  LayoutDetalheFocado, AlertaLinha, type PainelSecao,
} from './_LayoutDetalheFocado'
import { HistoricoTimeline, type EventoHistorico } from './_HistoricoTimeline'
import { rpcCompras } from './_rpc'
import { PainelMercadoLivre } from './_PainelMercadoLivre'
import {
  VinculosFocado, VinculosLista, gruposVinculosPedido, itensResumoFromPedidoItens,
  type CotTooltipInput, type ScTooltipInput,
} from './_VinculosProcesso'
import { InfoChip } from '@/components/ui/InfoChip'
import { StatRow } from '@/components/ui/StatRow'
import { MorePopover } from '@/components/ui/MorePopover'
import { StatusDot } from '@/components/ui/StatusDot'
import type { StatusTone } from '@/components/ui/StatusDot'

// ── Tipos do payload da RPC cmp_detalhe_pedido ──
type ProfileMini = { id: string; nome: string | null; email: string }

type PedidoFull = {
  id: string; numero: string; status: CmpPedidoStatus
  empresa_id: string; fornecedor_id: string | null
  cotacao_id: string | null
  comprador_id: string | null; aprovador_id: string | null
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  observacoes: string | null
  aprovado_em: string | null; enviado_em: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
  created_at: string; updated_at: string
  ml_pedido_id: string | null
  empresa?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null } | null
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj_cpf: string | null } | null
  cotacao?: CotTooltipInput | null
  comprador?: ProfileMini | null
  aprovador?: ProfileMini | null
}

type ItemFull = {
  id: string; pedido_id: string; linha: number
  solicitacao_item_id: string | null; cotacao_item_id: string | null
  produto_id: string | null; unidade_medida_id: string | null
  quantidade: number; preco_unitario: number; quantidade_recebida: number
  observacao: string | null; status_item: CmpPedidoItemStatus
  produto?: { id: string; codigo: string; nome: string; tipo: string; imagem_url: string | null } | null
  unidade_medida?: { id: string; nome: string; sigla: string } | null
}

type RecebimentoMin = {
  id: string; numero: string; data_recebimento: string
  observacoes: string | null
  recebedor?: ProfileMini | null
}

type PedidoVincRpc = {
  id: string; numero: string; status: CmpPedidoStatus
  cotacao_id?: string | null
  fornecedor?: { razao_social: string; nome_fantasia: string | null } | null
  created_at?: string; enviado_em?: string | null
  total?: number; qtd_total?: number; qtd_recebida?: number
  itens_resumo?: Array<{
    linha?: number; nome: string; codigo?: string | null
    quantidade?: number; unidade?: string | null
    preco_unitario?: number; total?: number; quantidade_recebida?: number
  }>
}

interface RpcDetalhePed {
  pedido: PedidoFull
  itens: ItemFull[]
  recebimentos: RecebimentoMin[]
  scs_origem: ScTooltipInput[]
  pedidos_vinc?: PedidoVincRpc[]
  historico: EventoHistorico[]
}

export function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [ped, setPed] = useState<PedidoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [recebimentos, setRecebimentos] = useState<RecebimentoMin[]>([])
  const [historico, setHistorico] = useState<EventoHistorico[]>([])
  const [scsOrigem, setScsOrigem] = useState<ScTooltipInput[]>([])
  const [pedidosIrmaos, setPedidosIrmaos] = useState<PedidoVincRpc[]>([])
  const [recebimentosVinc, setRecebimentosVinc] = useState<Array<{
    id: string; numero: string; pedido_id: string; pedido_numero?: string
    data_recebimento: string; observacoes?: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const podeEditar = profile?.role === 'admin' || profile?.role === 'comprador' || profile?.role === 'diretor'
  // Aprovação: precisa ser a pessoa designada pela alçada OU admin
  const podeAprovar = profile?.role === 'admin' || ped?.aprovador_id === profile?.id

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    // RPC consolidada + busca complementar do vínculo Mercado Livre (campo
    // ainda não incluído no payload da RPC para não acoplar módulos).
    const [detalheResp, mlResp] = await Promise.all([
      rpcCompras<RpcDetalhePed>('cmp_detalhe_pedido', { p_id: id }),
      supabase.from('cmp_pedidos_compra').select('ml_pedido_id').eq('id', id).maybeSingle(),
    ])
    if (detalheResp.error) {
      console.error('[PedidoDetalhePage] cmp_detalhe_pedido:', detalheResp.error)
      toast.error('Erro ao carregar pedido.')
      setLoading(false)
      return
    }
    if (!detalheResp.data) {
      setPed(null)
      setLoading(false)
      return
    }
    const pedido = detalheResp.data.pedido ?? null
    if (pedido) pedido.ml_pedido_id = (mlResp.data as { ml_pedido_id: string | null } | null)?.ml_pedido_id ?? null
    setPed(pedido)
    setItens(detalheResp.data.itens ?? [])
    setRecebimentos(detalheResp.data.recebimentos ?? [])
    setScsOrigem(detalheResp.data.scs_origem ?? [])
    setHistorico(detalheResp.data.historico ?? [])

    let vincPedidos = detalheResp.data.pedidos_vinc ?? []
    if (vincPedidos.length === 0 && pedido?.cotacao_id) {
      const { data: todos } = await supabase
        .from('cmp_pedidos_compra')
        .select('id, numero, status, created_at, enviado_em, cotacao_id, fornecedor:cmp_fornecedores(razao_social,nome_fantasia), itens:cmp_pedidos_compra_itens(linha, quantidade, preco_unitario, quantidade_recebida, produto:prd_produtos(codigo,nome), unidade_medida:prd_unidades_medida(sigla))')
        .eq('cotacao_id', pedido.cotacao_id)
      type Row = {
        id: string; numero: string; status: CmpPedidoStatus
        created_at?: string; enviado_em?: string | null; cotacao_id?: string | null
        fornecedor?: { razao_social: string; nome_fantasia: string | null } | null
        itens?: Array<{
          linha: number; quantidade: number; preco_unitario: number; quantidade_recebida: number
          produto?: { codigo: string; nome: string } | null
          unidade_medida?: { sigla: string } | null
        }>
      }
      vincPedidos = ((todos ?? []) as unknown as Row[]).map(p => ({
        id: p.id,
        numero: p.numero,
        status: p.status,
        cotacao_id: p.cotacao_id,
        fornecedor: p.fornecedor ?? null,
        created_at: p.created_at,
        enviado_em: p.enviado_em ?? null,
        total: (p.itens ?? []).reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_unitario), 0),
        qtd_total: (p.itens ?? []).reduce((s, it) => s + Number(it.quantidade), 0),
        qtd_recebida: (p.itens ?? []).reduce((s, it) => s + Number(it.quantidade_recebida), 0),
        itens_resumo: itensResumoFromPedidoItens(p.itens ?? []),
      }))
    }
    setPedidosIrmaos(vincPedidos.filter(p => p.id !== pedido?.id))
    await carregarRecebimentosVinc(
      vincPedidos.length > 0 ? vincPedidos.map(p => p.id) : [pedido.id],
    )

    setLoading(false)
  }, [id])

  const carregarRecebimentosVinc = useCallback(async (idsPedidos: string[]) => {
    if (idsPedidos.length === 0) {
      setRecebimentosVinc([])
      return
    }
    const { data: recs } = await supabase
      .from('cmp_recebimentos')
      .select('id, numero, pedido_id, data_recebimento, observacoes, pedido:cmp_pedidos_compra(numero)')
      .in('pedido_id', idsPedidos)
      .order('data_recebimento', { ascending: false })

    setRecebimentosVinc(((recs ?? []) as unknown as Array<{
      id: string; numero: string; pedido_id: string
      data_recebimento: string; observacoes: string | null
      pedido?: { numero: string } | null
    }>).map(r => ({
      id: r.id,
      numero: r.numero,
      pedido_id: r.pedido_id,
      pedido_numero: r.pedido?.numero,
      data_recebimento: r.data_recebimento,
      observacoes: r.observacoes,
    })))
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const gruposVinc = useMemo(
    () => ped
      ? gruposVinculosPedido({
          pedido: {
            id: ped.id,
            numero: ped.numero,
            status: ped.status,
            fornecedor: ped.fornecedor ?? undefined,
            cotacao_id: ped.cotacao_id,
            created_at: ped.created_at,
            enviado_em: ped.enviado_em,
            total: itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_unitario), 0),
            qtd_total: itens.reduce((s, it) => s + Number(it.quantidade), 0),
            qtd_recebida: itens.reduce((s, it) => s + Number(it.quantidade_recebida), 0),
            itens_resumo: itensResumoFromPedidoItens(itens),
          },
          pedidosIrmaos: pedidosIrmaos.map(p => ({
            ...p,
            cotacao_id: ped.cotacao_id,
          })),
          cotacao: ped.cotacao ?? undefined,
          scs: scsOrigem,
          recebimentos: recebimentosVinc.length > 0
            ? recebimentosVinc
            : recebimentos.map(r => ({
                ...r,
                pedido_id: ped.id,
                pedido_numero: ped.numero,
              })),
          mlPedidoId: ped.ml_pedido_id,
        })
      : [],
    [ped, itens, scsOrigem, recebimentos, recebimentosVinc, pedidosIrmaos],
  )

  async function marcarEnviado() {
    if (!ped) return
    setActionLoading('enviar')
    await supabase.from('cmp_pedidos_compra').update({
      status: 'enviado', enviado_em: new Date().toISOString(),
    }).eq('id', ped.id)
    toast.success('Compra confirmada com o fornecedor — aguardando recebimento')
    await fetchData()
    setActionLoading(null)
  }

  async function aprovarPedido() {
    if (!ped) return
    setActionLoading('aprovar')
    await supabase.from('cmp_pedidos_compra').update({
      status: 'aprovado',
      aprovador_id: profile!.id,
      aprovado_em: new Date().toISOString(),
    }).eq('id', ped.id)
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'pedido', documento_id: ped.id,
      aprovador_id: profile!.id, acao: 'aprovou',
    })
    toast.success('Pedido aprovado')
    await fetchData()
    setActionLoading(null)
  }

  async function reprovarPedido() {
    if (!ped) return
    const motivo = window.prompt('Motivo da reprovação:')
    if (!motivo?.trim()) return
    setActionLoading('reprovar')
    await supabase.from('cmp_pedidos_compra').update({
      status: 'cancelado',
      cancelada_em: new Date().toISOString(),
      motivo_cancelamento: motivo.trim(),
    }).eq('id', ped.id)
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'pedido', documento_id: ped.id,
      aprovador_id: profile!.id, acao: 'reprovou', comentario: motivo.trim(),
    })
    toast.success('Pedido reprovado')
    await fetchData()
    setActionLoading(null)
  }

  async function cancelar() {
    if (!ped) return
    const motivo = window.prompt('Motivo do cancelamento:')
    if (motivo === null) return
    setActionLoading('cancelar')
    await supabase.from('cmp_pedidos_compra').update({
      status: 'cancelado', cancelada_em: new Date().toISOString(),
      motivo_cancelamento: motivo.trim() || null,
    }).eq('id', ped.id)
    toast.success('Pedido cancelado')
    await fetchData()
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }
  if (!ped) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Pedido não encontrado.</p>
        <Link to="/compras/pedidos" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">Voltar</Link>
      </div>
    )
  }

  const statusMeta = metaPedido(ped.status)
  const total = itens.reduce((sum, it) => sum + Number(it.quantidade) * Number(it.preco_unitario), 0)
  const totalRecebido = itens.reduce((sum, it) => sum + Number(it.quantidade_recebida) * Number(it.preco_unitario), 0)
  const progresso = total > 0 ? (totalRecebido / total) * 100 : 0

  // ── Header full-width ──
  const badges = (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${statusMeta.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
      {statusMeta.label}
    </span>
  )

  // Ações: até 2 primárias + menu kebab para secundárias
  const acoesPrimarias: React.ReactNode[] = []
  const acoesSecundarias: Array<{ label: string; onClick: () => void; tom?: 'red' }> = []

  if (podeAprovar && ped.status === 'aguardando_aprovacao') {
    acoesPrimarias.push(
      <Button key="aprovar" isDisabled={actionLoading === 'aprovar'} onPress={aprovarPedido}
        className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
        <CheckCircle2 size={13} /> Aprovar pedido
      </Button>,
    )
    acoesPrimarias.push(
      <Button key="reprovar" isDisabled={actionLoading === 'reprovar'} onPress={reprovarPedido}
        className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
        <XCircle size={13} /> Reprovar
      </Button>,
    )
  }
  if (podeEditar && ped.status === 'aprovado') {
    acoesPrimarias.push(
      <Button key="enviar" isDisabled={actionLoading === 'enviar'} onPress={marcarEnviado}
        className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
        <Send size={13} /> Confirmar compra
      </Button>,
    )
  }
  if (podeEditar && ['aprovado', 'enviado', 'parcialmente_recebido'].includes(ped.status)) {
    acoesPrimarias.push(
      <Button key="receb" onPress={() => navigate(`/compras/recebimentos/novo?pedido=${ped.id}`)}
        className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
        <Receipt size={13} /> Registrar recebimento
      </Button>,
    )
  }
  if (podeEditar && !['cancelado', 'recebido'].includes(ped.status)) {
    acoesSecundarias.push({ label: 'Cancelar pedido', onClick: cancelar, tom: 'red' })
  }

  const acoes = (
    <>
      {acoesPrimarias.slice(0, 2)}
      {(acoesPrimarias.length > 2 || acoesSecundarias.length > 0) && (
        <MorePopover
          align="end"
          label={<MoreHorizontal size={14} />}
          title="Mais ações"
          className="!px-1.5 !py-1"
        >
          <div className="space-y-0.5">
            {acoesPrimarias.slice(2).map((_, idx) => (
              <button key={`extra-${idx}`} type="button" className="hidden">{/* placeholder */}</button>
            ))}
            {acoesSecundarias.map(a => (
              <button
                key={a.label}
                type="button"
                onClick={a.onClick}
                className={`w-full text-left px-2 py-1.5 text-[11px] rounded ${
                  a.tom === 'red'
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40'
                    : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </MorePopover>
      )}
    </>
  )

  const alerta = ped.status === 'cancelado' && ped.motivo_cancelamento ? (
    <AlertaLinha tom="red">Cancelado: {ped.motivo_cancelamento}</AlertaLinha>
  ) : null

  const fornecedorNome = ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social ?? '—'

  const faixaMeta = (
    <StatRow max={3}>
      <InfoChip label="Fornecedor" destaque>{fornecedorNome}</InfoChip>
      <InfoChip label="Total" destaque>{formatMoney(total)}</InfoChip>
      {progresso > 0
        ? <InfoChip label="Recebido">{progresso.toFixed(0)}%</InfoChip>
        : <InfoChip label="Empresa">{ped.empresa?.nome_fantasia ?? ped.empresa?.razao_social ?? '—'}</InfoChip>}
      {progresso > 0 && <InfoChip label="Empresa">{ped.empresa?.nome_fantasia ?? ped.empresa?.razao_social ?? '—'}</InfoChip>}
      <InfoChip label="Comprador">{ped.comprador?.nome ?? ped.comprador?.email ?? '—'}</InfoChip>
      <InfoChip label="Aprovador">{ped.aprovador?.nome ?? ped.aprovador?.email ?? '—'}</InfoChip>
      {ped.prazo_entrega_dias && <InfoChip label="Prazo">{ped.prazo_entrega_dias}d</InfoChip>}
      {ped.condicao_pagamento && <InfoChip label="Pag.">{ped.condicao_pagamento}</InfoChip>}
    </StatRow>
  )

  const totalVinculos = gruposVinc.reduce((n, g) => n + g.itens.filter(i => !i.atual).length, 0)
  const vinculosSecao = <VinculosFocado grupos={gruposVinc} />

  const fluxoSlim = (
    <FaixaEtapasToolbar
      etapas={ETAPAS_PEDIDO_FLUXO}
      contagens={{}}
      meta={metaPedido}
      apenasVisualizacao
      etapaAtual={ped.status}
      variant="slim"
    />
  )


  const detalhes = (
    <dl className="space-y-2 text-sm">
      <PropLinha label="Comprador">
        {ped.comprador?.nome ?? ped.comprador?.email ?? '—'}
      </PropLinha>
      <PropLinha label="Aprovador">
        {ped.aprovador?.nome ?? ped.aprovador?.email ?? '—'}
      </PropLinha>
      <PropLinha label="Prazo entrega">
        {ped.prazo_entrega_dias ? `${ped.prazo_entrega_dias} dias` : '—'}
      </PropLinha>
      <PropLinha label="Condição pagto">{ped.condicao_pagamento ?? '—'}</PropLinha>
      {ped.observacoes && (
        <PropLinha label="Observações">
          <p className="whitespace-pre-wrap text-xs">{ped.observacoes}</p>
        </PropLinha>
      )}
    </dl>
  )

  const painelVinculos = (
    <section className="space-y-4 text-sm">
      <VinculosLista grupos={gruposVinc} />
      {ped.ml_pedido_id && <PainelMercadoLivre mlPedidoId={ped.ml_pedido_id} />}
    </section>
  )

  const tabelaItens = (
        <div>
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-gray-100">{itens.length}</strong> {itens.length === 1 ? 'item' : 'itens'}
            </p>
            <p className="text-xs text-gray-500">
              Total: <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatMoney(total)}</span>
            </p>
          </div>
          {itens.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-gray-400">Sem itens.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                  <tr>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 w-10">#</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Produto</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Qtd.</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">UoM</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Preço unit.</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total</th>
                    <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Recebido</th>
                    <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {itens.map(it => {
                    const totalLinha = Number(it.quantidade) * Number(it.preco_unitario)
                    return (
                      <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                        <td className="px-3 py-2.5 text-gray-400 font-mono align-top text-[11px]">{it.linha}</td>
                        <td className="px-3 py-2.5 align-top">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-tight">{it.produto?.nome ?? '—'}</p>
                          <p className="text-[11px] font-mono text-gray-500 mt-0.5">{it.produto?.codigo}</p>
                          {it.observacao && <p className="text-[11px] text-gray-500 mt-0.5">{it.observacao}</p>}
                        </td>
                        <td className="px-3 py-2.5 text-right tabular-nums align-top">{formatQty(it.quantidade)}</td>
                        <td className="px-3 py-2.5 text-gray-500 align-top">{it.unidade_medida?.sigla}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums align-top">{formatMoney(it.preco_unitario)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums font-semibold align-top">{formatMoney(totalLinha)}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums align-top">
                          <span className={Number(it.quantidade_recebida) >= Number(it.quantidade) ? 'text-emerald-600 font-semibold' : ''}>
                            {formatQty(it.quantidade_recebida)} / {formatQty(it.quantidade)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 align-top">
                          <StatusDot
                            tone={tonePedidoItem(it.status_item)}
                            label={rotuloItemPedido(it.status_item)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
  )

  const principal = (
    <>
      {ped.status === 'aguardando_aprovacao' && (
        <div className="border-b border-gray-200 dark:border-gray-800">
          <ComparativoCotacoesDoPedido pedido={ped} itens={itens} onRefresh={fetchData} />
        </div>
      )}
      {tabelaItens}
    </>
  )

  const painelSecoes: PainelSecao[] = [
    { id: 'historico', label: 'Histórico', icone: <History size={13} />, badge: historico.length, conteudo: <HistoricoTimeline eventos={historico} /> },
    { id: 'vinculos', label: 'Vínculos', icone: <Network size={13} />, badge: totalVinculos || undefined, conteudo: painelVinculos },
    { id: 'detalhes', label: 'Detalhes', icone: <Info size={13} />, conteudo: detalhes },
  ]

  return (
    <>
      <LayoutDetalheFocado
        voltar={<BotaoVoltar fallback="/compras/pedidos" label="Voltar" />}
        titulo={ped.numero}
        subtitulo={ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social}
        badges={badges}
        acoes={acoes}
        meta={faixaMeta}
        alerta={alerta}
        fluxo={fluxoSlim}
        vinculosRodape={vinculosSecao}
        principal={principal}
        painelSecoes={painelSecoes}
      />
    </>
  )
}

// ── Helpers para StatusDot da tabela de itens do pedido ───────────────
function tonePedidoItem(status: CmpPedidoItemStatus): StatusTone {
  switch (status) {
    case 'pendente':              return 'amber'
    case 'parcialmente_recebido': return 'violet'
    case 'recebido':              return 'emerald'
    default:                      return 'gray'
  }
}

function rotuloItemPedido(status: CmpPedidoItemStatus): string {
  switch (status) {
    case 'pendente':              return 'Pendente'
    case 'parcialmente_recebido': return 'Parcial'
    case 'recebido':              return 'Recebido'
    default:                      return String(status)
  }
}

// ────────────────────────────────────────────────────────────────
// PropLinha: linha de propriedade (label + valor) no estilo HubSpot
// ────────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────────
// Painel comparativo: outras cotações disponíveis pra mesma SC
// ────────────────────────────────────────────────────────────────

type CotacaoAlternativa = {
  cotacao: Pick<CmpCotacao, 'id' | 'numero' | 'titulo' | 'status'>
  fornecedor: { id: string; nome: string }
  cotacaoFornecedorId: string
  itens: (CmpCotacaoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida; resposta_preco?: number | null })[]
  total: number
  cobreTodosItens: boolean
}

function ComparativoCotacoesDoPedido({ pedido, itens, onRefresh }: {
  pedido: PedidoFull
  itens: ItemFull[]
  onRefresh: () => void
}) {
  const [alternativas, setAlternativas] = useState<CotacaoAlternativa[]>([])
  const [loading, setLoading] = useState(true)
  const [trocando, setTrocando] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)

      // 1. Descobre a SC origem (via itens do pedido ou via cotacao_id)
      let scIds: string[] = []
      const scItemIds = itens.map(i => i.solicitacao_item_id).filter(Boolean) as string[]
      if (scItemIds.length > 0) {
        const { data: scItems } = await supabase.from('cmp_solicitacoes_compra_itens')
          .select('solicitacao_id').in('id', scItemIds)
        scIds = Array.from(new Set((scItems ?? []).map(i => i.solicitacao_id)))
      }
      if (scIds.length === 0 && pedido.cotacao_id) {
        const { data: vincs } = await supabase.from('cmp_cotacoes_solicitacoes')
          .select('solicitacao_id').eq('cotacao_id', pedido.cotacao_id)
        scIds = Array.from(new Set((vincs ?? []).map(v => v.solicitacao_id)))
      }

      if (scIds.length === 0) {
        setAlternativas([])
        setLoading(false)
        return
      }

      // 2. Busca todas as cotações vinculadas a essas SCs
      const { data: vincCots } = await supabase.from('cmp_cotacoes_solicitacoes')
        .select('cotacao_id').in('solicitacao_id', scIds)
      const cotIds = Array.from(new Set((vincCots ?? []).map(v => v.cotacao_id)))

      if (cotIds.length === 0) {
        setAlternativas([])
        setLoading(false)
        return
      }

      // 3. Carrega cotações, itens, fornecedores e respostas
      const [cotsR, itensR, fornsR, respsR] = await Promise.all([
        supabase.from('cmp_cotacoes').select('id,numero,titulo,status').in('id', cotIds),
        supabase.from('cmp_cotacoes_itens').select(`
          *,
          produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
          unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
        `).in('cotacao_id', cotIds),
        supabase.from('cmp_cotacoes_fornecedores').select('*,fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)').in('cotacao_id', cotIds),
        supabase.from('cmp_cotacoes_respostas_itens').select('*'),
      ])

      const cots = cotsR.data ?? []
      const cotItens = (itensR.data ?? []) as unknown as (CmpCotacaoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida })[]
      const cotForns = (fornsR.data ?? []) as unknown as (CmpCotacaoFornecedor & { fornecedor?: CmpFornecedor })[]
      const respostas = (respsR.data ?? []) as CmpCotacaoRespostaItem[]

      // 4. Pra cada combinação (cotacao, fornecedor), monta uma alternativa
      // que cobre os itens DO PEDIDO ATUAL (matching por produto_id + solicitacao_item_id)
      const alts: CotacaoAlternativa[] = []

      for (const cot of cots) {
        const fornsDessaCot = cotForns.filter(f => f.cotacao_id === cot.id)
        const itensDessaCot = cotItens.filter(i => i.cotacao_id === cot.id)

        for (const cf of fornsDessaCot) {
          if (!cf.fornecedor) continue
          // Pra cada item do PEDIDO, vê se essa cotação tem item equivalente E se o fornecedor respondeu
          const linhas: CotacaoAlternativa['itens'] = []
          let totalAlt = 0
          let cobreTudo = true
          for (const pedItem of itens) {
            // Match pelo solicitacao_item_id (mais preciso) ou produto_id
            const match = itensDessaCot.find(ci =>
              (pedItem.solicitacao_item_id && ci.solicitacao_item_id === pedItem.solicitacao_item_id) ||
              ci.produto_id === pedItem.produto_id
            )
            if (!match) { cobreTudo = false; continue }
            const resp = respostas.find(r => r.cotacao_fornecedor_id === cf.id && r.cotacao_item_id === match.id)
            if (!resp) { cobreTudo = false; continue }
            linhas.push({ ...match, resposta_preco: resp.preco_unitario })
            totalAlt += Number(pedItem.quantidade) * Number(resp.preco_unitario)
          }
          if (linhas.length > 0) {
            alts.push({
              cotacao: cot,
              fornecedor: { id: cf.fornecedor.id, nome: cf.fornecedor.nome_fantasia ?? cf.fornecedor.razao_social },
              cotacaoFornecedorId: cf.id,
              itens: linhas,
              total: totalAlt,
              cobreTodosItens: cobreTudo,
            })
          }
        }
      }

      // Ordena: cobre tudo primeiro, menor preço primeiro
      alts.sort((a, b) => {
        if (a.cobreTodosItens !== b.cobreTodosItens) return a.cobreTodosItens ? -1 : 1
        return a.total - b.total
      })

      if (!cancel) {
        setAlternativas(alts)
        setLoading(false)
      }
    }
    carregar()
    return () => { cancel = true }
  }, [pedido.id, pedido.cotacao_id, itens])

  async function trocarPara(alt: CotacaoAlternativa) {
    if (!alt.cobreTodosItens) {
      toast.error('Esta cotação não cobre todos os itens deste pedido.')
      return
    }
    if (!window.confirm(
      `Trocar fornecedor deste pedido para ${alt.fornecedor.nome}?\n\nNovo total: ${formatMoney(alt.total)}`
    )) return

    setTrocando(alt.cotacaoFornecedorId)
    try {
      // Atualiza cabeçalho do pedido
      const { data: cf } = await supabase.from('cmp_cotacoes_fornecedores')
        .select('prazo_entrega_dias,condicao_pagamento').eq('id', alt.cotacaoFornecedorId).maybeSingle()

      await supabase.from('cmp_pedidos_compra').update({
        fornecedor_id: alt.fornecedor.id,
        cotacao_id: alt.cotacao.id,
        prazo_entrega_dias: cf?.prazo_entrega_dias ?? null,
        condicao_pagamento: cf?.condicao_pagamento ?? null,
      }).eq('id', pedido.id)

      // Atualiza preços e cotacao_item_id de cada linha
      for (const pedItem of itens) {
        const altItem = alt.itens.find(ai =>
          (pedItem.solicitacao_item_id && ai.solicitacao_item_id === pedItem.solicitacao_item_id) ||
          ai.produto_id === pedItem.produto_id
        )
        if (!altItem || altItem.resposta_preco == null) continue
        await supabase.from('cmp_pedidos_compra_itens').update({
          cotacao_item_id: altItem.id,
          preco_unitario: altItem.resposta_preco,
        }).eq('id', pedItem.id)
      }

      // Recalcula alçada com base no novo valor total
      const { data: aprovadorAlcadaId } = await supabase.rpc('get_aprovador_alcada', {
        p_empresa_id: pedido.empresa_id,
        p_valor: alt.total,
      })
      let alcadaId: string | null = null
      if (aprovadorAlcadaId) {
        const { data: alcada } = await supabase.from('cmp_alcadas_aprovacao')
          .select('id').eq('empresa_id', pedido.empresa_id)
          .eq('aprovador_id', aprovadorAlcadaId)
          .lte('valor_min', alt.total).or(`valor_max.is.null,valor_max.gte.${alt.total}`)
          .eq('ativo', true).order('ordem').order('valor_min', { ascending: false })
          .limit(1).maybeSingle()
        alcadaId = alcada?.id ?? null
      }
      await supabase.from('cmp_pedidos_compra').update({
        aprovador_id: aprovadorAlcadaId,
        alcada_id: alcadaId,
      }).eq('id', pedido.id)

      toast.success(`Fornecedor trocado para ${alt.fornecedor.nome}`)
      onRefresh()
    } catch (err) {
      console.error(err); toast.error('Erro ao trocar fornecedor')
    } finally {
      setTrocando(null)
    }
  }

  return (
    <div>
      <div className="px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-violet-50/40 dark:bg-violet-950/20">
        <p className="text-xs text-violet-800 dark:text-violet-300">
          O aprovador pode rever todas as cotações desta SC e, se quiser, trocar o fornecedor antes de aprovar.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
        </div>
      ) : alternativas.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-400">
          Sem outras cotações disponíveis para esta SC.
        </p>
      ) : (
        <div className="p-4 space-y-2">
          {alternativas.map(alt => {
            const ehAtual = alt.fornecedor.id === pedido.fornecedor_id && alt.cotacao.id === pedido.cotacao_id
            return (
              <div key={alt.cotacaoFornecedorId}
                className={`rounded-xl border px-4 py-3 ${
                  ehAtual
                    ? 'border-emerald-300 dark:border-emerald-700 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900'
                }`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Truck size={14} className="text-gray-400" />
                      <span className="font-semibold text-sm">{alt.fornecedor.nome}</span>
                      {ehAtual && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-semibold">
                          <CheckCircle2 size={10} /> ATUAL
                        </span>
                      )}
                      {!alt.cobreTodosItens && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 px-2 py-0.5 text-[10px] font-semibold">
                          parcial
                        </span>
                      )}
                    </div>
                    <Link to={`/compras/cotacoes/${alt.cotacao.id}`} className="text-[11px] font-mono text-violet-600 hover:underline">
                      {alt.cotacao.numero} · {alt.cotacao.titulo}
                    </Link>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold tabular-nums">{formatMoney(alt.total)}</p>
                    <p className="text-[10px] text-gray-500">{alt.itens.length} item(ns)</p>
                  </div>
                  {!ehAtual && alt.cobreTodosItens && (
                    <Button isDisabled={trocando === alt.cotacaoFornecedorId} onPress={() => trocarPara(alt)}
                      className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
                      {trocando === alt.cotacaoFornecedorId
                        ? <><RefreshCw size={11} className="animate-spin" /> Trocando…</>
                        : <><ArrowRightLeft size={11} /> Trocar para este</>}
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
