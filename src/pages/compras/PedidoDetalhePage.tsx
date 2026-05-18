import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, ShoppingCart, Truck, Building2, Calendar, Package, Send,
  CheckCircle2, AlertCircle, Receipt, Ban, XCircle, RefreshCw, Scale,
  ChevronDown, ChevronUp, ArrowRightLeft,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpCotacao, CmpCotacaoFornecedor, CmpCotacaoItem, CmpCotacaoRespostaItem,
  CmpFornecedor, CmpPedido, CmpPedidoItem, CmpRecebimento,
  CoreEmpresa, PrdProduto, PrdUnidadeMedida, Profile,
} from '@/types/database'
import {
  PEDIDO_STATUS_META, PEDIDO_ITEM_STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty,
} from './_shared'
import { LinhaTempoProcesso } from './_LinhaTempoProcesso'

type PedidoFull = CmpPedido & {
  empresa?: CoreEmpresa
  fornecedor?: CmpFornecedor
  cotacao?: Pick<CmpCotacao, 'id' | 'numero'>
  comprador?: Profile
  aprovador?: Profile
}
type ItemFull = CmpPedidoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida }

export function PedidoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [ped, setPed] = useState<PedidoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [recebimentos, setRecebimentos] = useState<CmpRecebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const podeEditar = profile?.role === 'admin' || profile?.role === 'comprador' || profile?.role === 'diretor'
  // Aprovação: precisa ser a pessoa designada pela alçada OU admin
  const podeAprovar = profile?.role === 'admin' || ped?.aprovador_id === profile?.id

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [pedResp, itensResp, recResp] = await Promise.all([
      supabase.from('cmp_pedidos_compra').select(`
        *,
        empresa:core_empresas(*),
        fornecedor:cmp_fornecedores(*),
        cotacao:cmp_cotacoes(id,numero),
        comprador:profiles!cmp_pedidos_compra_comprador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at),
        aprovador:profiles!cmp_pedidos_compra_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('id', id).maybeSingle(),
      supabase.from('cmp_pedidos_compra_itens').select(`
        *,
        produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
        unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
      `).eq('pedido_id', id).order('linha'),
      supabase.from('cmp_recebimentos').select('*').eq('pedido_id', id).order('data_recebimento'),
    ])
    setPed(pedResp.data as PedidoFull)
    setItens((itensResp.data ?? []) as ItemFull[])
    setRecebimentos((recResp.data ?? []) as CmpRecebimento[])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  async function marcarEnviado() {
    if (!ped) return
    setActionLoading('enviar')
    await supabase.from('cmp_pedidos_compra').update({
      status: 'enviado', enviado_em: new Date().toISOString(),
    }).eq('id', ped.id)
    toast.success('Pedido marcado como enviado ao fornecedor')
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

  const meta = PEDIDO_STATUS_META[ped.status]
  const total = itens.reduce((sum, it) => sum + Number(it.quantidade) * Number(it.preco_unitario), 0)
  const totalRecebido = itens.reduce((sum, it) => sum + Number(it.quantidade_recebida) * Number(it.preco_unitario), 0)
  const progresso = total > 0 ? (totalRecebido / total) * 100 : 0

  return (
    <div className="space-y-6">
      <div>
        <Link to="/compras/pedidos" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 mb-2">
          <ChevronLeft size={14} /> Pedidos
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
              <ShoppingCart size={18} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-mono font-semibold">{ped.numero}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">Criado {formatDateTime(ped.created_at)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {podeAprovar && ped.status === 'aguardando_aprovacao' && (
              <>
                <Button isDisabled={actionLoading === 'reprovar'} onPress={reprovarPedido}
                  className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                  <XCircle size={14} /> Reprovar
                </Button>
                <Button isDisabled={actionLoading === 'aprovar'} onPress={aprovarPedido}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                  <CheckCircle2 size={14} /> Aprovar pedido
                </Button>
              </>
            )}
            {podeEditar && ped.status === 'aprovado' && (
              <Button isDisabled={actionLoading === 'enviar'} onPress={marcarEnviado}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                <Send size={14} /> Marcar como enviado
              </Button>
            )}
            {podeEditar && ['aprovado','enviado','parcialmente_recebido'].includes(ped.status) && (
              <Button onPress={() => navigate(`/compras/recebimentos/novo?pedido=${ped.id}`)}
                className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                <Receipt size={14} /> Registrar recebimento
              </Button>
            )}
            {podeEditar && !['cancelado','recebido'].includes(ped.status) && (
              <Button onPress={cancelar}
                className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                <Ban size={14} /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Linha do tempo do processo */}
      <LinhaTempoProcesso
        pedidoId={ped.id}
        currentStep={
          ['enviado','parcialmente_recebido','recebido'].includes(ped.status) ? 'recebimento' : 'pedido'
        }
      />

      {ped.status === 'cancelado' && ped.motivo_cancelamento && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Cancelado</p>
            <p className="mt-0.5">{ped.motivo_cancelamento}</p>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 px-5 py-4 text-sm">
          <InfoBlock label="Fornecedor" icon={Truck}>
            {ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social}
            {ped.fornecedor?.cnpj_cpf && <p className="text-[11px] font-mono text-gray-500 mt-0.5">{ped.fornecedor.cnpj_cpf}</p>}
          </InfoBlock>
          <InfoBlock label="Empresa" icon={Building2}>
            {ped.empresa?.nome_fantasia ?? ped.empresa?.razao_social}
          </InfoBlock>
          <InfoBlock label="Cotação origem">
            {ped.cotacao
              ? <Link to={`/compras/cotacoes/${ped.cotacao.id}`} className="font-mono text-emerald-600 dark:text-emerald-400 hover:underline">{ped.cotacao.numero}</Link>
              : '—'}
          </InfoBlock>
          <InfoBlock label="Comprador">
            {ped.comprador?.nome ?? ped.comprador?.email}
          </InfoBlock>
          <InfoBlock label="Prazo de entrega" icon={Calendar}>
            {ped.prazo_entrega_dias ? `${ped.prazo_entrega_dias} dias` : '—'}
          </InfoBlock>
          <InfoBlock label="Condição de pagamento">
            {ped.condicao_pagamento ?? '—'}
          </InfoBlock>
          <InfoBlock label="Aprovado por">
            {ped.aprovador?.nome ?? ped.aprovador?.email ?? '—'}
          </InfoBlock>
          <InfoBlock label="Enviado em">
            {formatDateTime(ped.enviado_em)}
          </InfoBlock>
          {ped.observacoes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{ped.observacoes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Progresso */}
      {progresso > 0 && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">Progresso do recebimento</span>
            <span className="text-sm font-semibold tabular-nums">{progresso.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progresso}%` }} />
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {formatMoney(totalRecebido)} de {formatMoney(total)}
          </p>
        </section>
      )}

      {/* Itens */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold">Itens <span className="text-gray-400 font-normal">({itens.length})</span></h2>
          <span className="text-xs text-gray-500">
            Total: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatMoney(total)}</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-10">#</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Produto</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Qtd.</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">UoM</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Preço unit.</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total</th>
                <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Recebido</th>
                <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(it => {
                const totalLinha = Number(it.quantidade) * Number(it.preco_unitario)
                const stMeta = PEDIDO_ITEM_STATUS_META[it.status_item]
                return (
                  <tr key={it.id}>
                    <td className="px-3 py-3 text-gray-400 font-mono align-top">{it.linha}</td>
                    <td className="px-3 py-3 align-top">
                      <div className="flex items-start gap-2">
                        <Package size={14} className="text-blue-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium">{it.produto?.nome}</p>
                          <p className="text-[11px] font-mono text-gray-500">{it.produto?.codigo}</p>
                          {it.observacao && <p className="text-xs text-gray-500 mt-0.5">{it.observacao}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums align-top">{formatQty(it.quantidade)}</td>
                    <td className="px-3 py-3 text-gray-500 align-top">{it.unidade_medida?.sigla}</td>
                    <td className="px-3 py-3 text-right tabular-nums align-top">{formatMoney(it.preco_unitario)}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-semibold align-top">{formatMoney(totalLinha)}</td>
                    <td className="px-3 py-3 text-right tabular-nums align-top">
                      <span className={Number(it.quantidade_recebida) >= Number(it.quantidade) ? 'text-emerald-600 font-semibold' : ''}>
                        {formatQty(it.quantidade_recebida)} / {formatQty(it.quantidade)}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${stMeta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${stMeta.dot}`} />
                        {stMeta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Painel comparativo de cotações (aparece se estiver aguardando aprovação) */}
      {ped.status === 'aguardando_aprovacao' && (
        <ComparativoCotacoesDoPedido pedido={ped} itens={itens} onRefresh={fetchData} />
      )}

      {/* Recebimentos */}
      {recebimentos.length > 0 && (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
          <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
            <h2 className="text-sm font-semibold">Recebimentos ({recebimentos.length})</h2>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recebimentos.map(r => (
              <li key={r.id} className="flex items-center gap-3 px-5 py-3">
                <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-mono font-semibold">{r.numero}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(r.data_recebimento)}</p>
                  {r.observacoes && <p className="text-xs text-gray-500 mt-0.5">{r.observacoes}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function InfoBlock({ label, icon: Icon, children }: { label: string; icon?: typeof Building2; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
        {Icon && <Icon size={11} />} {label}
      </p>
      <div className="text-sm text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}

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
  pedido: CmpPedido & { fornecedor?: CmpFornecedor }
  itens: ItemFull[]
  onRefresh: () => void
}) {
  const [alternativas, setAlternativas] = useState<CotacaoAlternativa[]>([])
  const [loading, setLoading] = useState(true)
  const [expandido, setExpandido] = useState(true)
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
      const cotItens = (itensR.data ?? []) as (CmpCotacaoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida })[]
      const cotForns = (fornsR.data ?? []) as (CmpCotacaoFornecedor & { fornecedor?: CmpFornecedor })[]
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
    <section className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-violet-50/40 dark:bg-violet-950/20 shadow-sm overflow-hidden">
      <button onClick={() => setExpandido(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-violet-100/40 dark:hover:bg-violet-950/40">
        <Scale size={16} className="text-violet-600 dark:text-violet-400 shrink-0" />
        <div className="flex-1">
          <h2 className="text-sm font-semibold text-violet-900 dark:text-violet-100">
            Comparar com outras cotações
            {!loading && alternativas.length > 0 && (
              <span className="ml-2 text-xs font-normal text-violet-700 dark:text-violet-300">
                ({alternativas.length} {alternativas.length === 1 ? 'opção disponível' : 'opções disponíveis'})
              </span>
            )}
          </h2>
          <p className="text-xs text-violet-700/80 dark:text-violet-300/80 mt-0.5">
            O aprovador pode rever todas as cotações desta SC e, se quiser, trocar o fornecedor antes de aprovar.
          </p>
        </div>
        {expandido ? <ChevronUp size={16} className="text-violet-600" /> : <ChevronDown size={16} className="text-violet-600" />}
      </button>

      {expandido && (
        <div className="px-5 py-4 border-t border-violet-200/60 dark:border-violet-800/40 bg-white/40 dark:bg-gray-900/20">
          {loading ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
            </div>
          ) : alternativas.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Sem outras cotações disponíveis para esta SC.
            </p>
          ) : (
            <div className="space-y-2">
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
                          className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5">
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
      )}
    </section>
  )
}
