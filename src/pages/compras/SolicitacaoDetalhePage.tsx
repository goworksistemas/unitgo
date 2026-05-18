import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Send, CheckCircle2, XCircle, Ban, FileText, Package,
  Building2, Calendar, User as UserIcon, MessageSquare, History, AlertCircle, Network,
  FileSearch, ShoppingCart, Truck, Receipt, ChevronRight, Trophy, Crown,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpAprovacao, CmpCotacao, CmpCotacaoEscolha, CmpCotacaoFornecedor,
  CmpFornecedor, CmpPedido, CmpRecebimento, CmpSolicitacao, CmpSolicitacaoItem,
  CoreDepartamento, CoreEmpresa,
  PrdProduto, PrdUnidadeMedida, Profile,
} from '@/types/database'
import {
  ITEM_STATUS_META, PRIORIDADE_META, STATUS_META, COTACAO_STATUS_META, PEDIDO_STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty, formatRelativeTime, getIniciais,
} from './_shared'
import { LinhaTempoProcesso } from './_LinhaTempoProcesso'

type SolicitacaoFull = CmpSolicitacao & {
  empresa?: CoreEmpresa
  departamento?: CoreDepartamento & { gestor?: Profile }
  solicitante?: Profile
  aprovador?: Profile
}

type ItemFull = CmpSolicitacaoItem & {
  produto?: PrdProduto
  unidade_medida?: PrdUnidadeMedida
}

type EventoTimeline = CmpAprovacao & { aprovador?: Profile }

type CotacaoVinculada = CmpCotacao & {
  comprador?: Profile
  itens_count?: number
  fornecedores?: CmpCotacaoFornecedor[]
  escolhas?: CmpCotacaoEscolha[]
  total_escolhido?: number
}

type PedidoVinculado = CmpPedido & {
  fornecedor?: CmpFornecedor
  total?: number
  total_recebido?: number
  qtd_total?: number
  qtd_recebida?: number
}

type RecebimentoVinculado = CmpRecebimento & {
  pedido_numero?: string
}

export function SolicitacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [sc, setSc] = useState<SolicitacaoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [timeline, setTimeline] = useState<EventoTimeline[]>([])
  const [cotacoes, setCotacoes] = useState<CotacaoVinculada[]>([])
  const [pedidos, setPedidos] = useState<PedidoVinculado[]>([])
  const [recebimentos, setRecebimentos] = useState<RecebimentoVinculado[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<null | 'reprovar' | 'cancelar'>(null)
  const [motivo, setMotivo] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [scResp, itensResp, timelineResp] = await Promise.all([
      supabase.from('cmp_solicitacoes_compra').select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia,cnpj,ativo,created_at,updated_at),
        departamento:core_departamentos(id,codigo,nome,descricao,gestor_id,ativo,created_at,updated_at,
          gestor:profiles!core_departamentos_gestor_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
        ),
        solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at),
        aprovador:profiles!cmp_solicitacoes_compra_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('id', id).maybeSingle(),
      supabase.from('cmp_solicitacoes_compra_itens').select(`
        *,
        produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
        unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
      `).eq('solicitacao_id', id).order('linha'),
      supabase.from('cmp_aprovacoes').select(`
        *,
        aprovador:profiles!cmp_aprovacoes_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('documento_tipo', 'solicitacao').eq('documento_id', id).order('created_at'),
    ])
    setSc((scResp.data as SolicitacaoFull) ?? null)
    const itensCarregados = (itensResp.data ?? []) as ItemFull[]
    setItens(itensCarregados)
    setTimeline((timelineResp.data ?? []) as EventoTimeline[])

    // ── Carrega Cotações, Pedidos e Recebimentos vinculados à SC ──
    const { data: vincs } = await supabase
      .from('cmp_cotacoes_solicitacoes')
      .select('cotacao_id')
      .eq('solicitacao_id', id)
    const cotIds = Array.from(new Set((vincs ?? []).map(v => v.cotacao_id)))

    let cotacoesCarregadas: CotacaoVinculada[] = []
    if (cotIds.length > 0) {
      const cotsResp = await supabase.from('cmp_cotacoes').select(`
        *,
        comprador:profiles!cmp_cotacoes_comprador_id_fkey(id,nome,email),
        fornecedores:cmp_cotacoes_fornecedores(id,fornecedor_id,status_convite),
        escolhas:cmp_cotacoes_escolhas(*)
      `).in('id', cotIds).order('created_at', { ascending: false })
      const cots = (cotsResp.data ?? []) as unknown as (CotacaoVinculada & { escolhas?: CmpCotacaoEscolha[] })[]

      const { data: itensCot } = await supabase
        .from('cmp_cotacoes_itens').select('id, cotacao_id, quantidade')
        .in('cotacao_id', cotIds)
      const itensCotArr = (itensCot ?? []) as { id: string; cotacao_id: string; quantidade: number }[]

      cotacoesCarregadas = cots.map(c => {
        const itensCotEssa = itensCotArr.filter(i => i.cotacao_id === c.id)
        const escolhas = (c.escolhas ?? []) as CmpCotacaoEscolha[]
        const total = escolhas.reduce((s, e) => {
          const it = itensCotEssa.find(i => i.id === e.cotacao_item_id)
          return s + (it ? Number(it.quantidade) * Number(e.preco_final_unitario) : 0)
        }, 0)
        return {
          ...c,
          itens_count: itensCotEssa.length,
          total_escolhido: total,
        } as CotacaoVinculada
      })
    }
    setCotacoes(cotacoesCarregadas)

    // Pedidos: via cotacao_id OU via item.solicitacao_item_id (pedido direto)
    const scItemIds = itensCarregados.map(i => i.id)
    const pedidosTodos: PedidoVinculado[] = []

    if (cotIds.length > 0) {
      const { data: peds } = await supabase.from('cmp_pedidos_compra').select(`
        *,
        fornecedor:cmp_fornecedores(*),
        itens:cmp_pedidos_compra_itens(quantidade, preco_unitario, quantidade_recebida)
      `).in('cotacao_id', cotIds).order('created_at', { ascending: false })
      pedidosTodos.push(...((peds ?? []) as unknown as PedidoVinculado[]))
    }
    if (scItemIds.length > 0) {
      const { data: itensDeDireto } = await supabase
        .from('cmp_pedidos_compra_itens')
        .select('pedido_id').in('solicitacao_item_id', scItemIds)
      const pedDiretosIds = Array.from(new Set((itensDeDireto ?? []).map(i => i.pedido_id)))
        .filter(pid => !pedidosTodos.some(p => p.id === pid))
      if (pedDiretosIds.length > 0) {
        const { data: peds } = await supabase.from('cmp_pedidos_compra').select(`
          *,
          fornecedor:cmp_fornecedores(*),
          itens:cmp_pedidos_compra_itens(quantidade, preco_unitario, quantidade_recebida)
        `).in('id', pedDiretosIds).order('created_at', { ascending: false })
        pedidosTodos.push(...((peds ?? []) as unknown as PedidoVinculado[]))
      }
    }
    // Calcula totais por pedido
    pedidosTodos.forEach(p => {
      const linhas = (p as unknown as { itens?: { quantidade: number; preco_unitario: number; quantidade_recebida: number }[] }).itens ?? []
      p.total = linhas.reduce((s, l) => s + Number(l.quantidade) * Number(l.preco_unitario), 0)
      p.total_recebido = linhas.reduce((s, l) => s + Number(l.quantidade_recebida) * Number(l.preco_unitario), 0)
      p.qtd_total = linhas.reduce((s, l) => s + Number(l.quantidade), 0)
      p.qtd_recebida = linhas.reduce((s, l) => s + Number(l.quantidade_recebida), 0)
    })
    setPedidos(pedidosTodos)

    // Recebimentos vinculados aos pedidos da SC
    if (pedidosTodos.length > 0) {
      const { data: recs } = await supabase
        .from('cmp_recebimentos')
        .select('*')
        .in('pedido_id', pedidosTodos.map(p => p.id))
        .order('data_recebimento', { ascending: false })
      const enriched = (recs ?? []).map(r => ({
        ...r,
        pedido_numero: pedidosTodos.find(p => p.id === r.pedido_id)?.numero,
      })) as RecebimentoVinculado[]
      setRecebimentos(enriched)
    } else {
      setRecebimentos([])
    }

    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Permissões derivadas ──────────────────────────────────
  const eu = profile?.id
  const ehAdmin     = profile?.role === 'admin'
  const ehGestor    = !!sc?.departamento?.gestor_id && sc.departamento.gestor_id === eu
  const ehDono      = sc?.solicitante_id === eu
  const podeAprovar = (ehAdmin || ehGestor) && sc?.status === 'aguardando_aprovacao'
  const podeCancelar = (ehDono || ehAdmin) && sc?.status && !['atendida', 'cancelada', 'reprovada'].includes(sc.status)
  const ehComprador = profile?.role === 'admin' || profile?.role === 'comprador'
  // Só faz sentido iniciar cotação/pedido se ainda houver itens PENDENTES (não cotados/pedidos)
  const temItensPendentes = itens.some(it => it.status_item === 'pendente')
  const podeIniciarCotacao = ehComprador && sc?.status === 'aprovada' && temItensPendentes
  const podePedidoDireto = ehComprador && sc?.status === 'aprovada' && temItensPendentes

  const totalEstimado = itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_estimado ?? 0), 0)

  // ── Ações ─────────────────────────────────────────────────
  async function logAcao(acao: 'enviou' | 'aprovou' | 'reprovou' | 'cancelou', comentario?: string) {
    if (!sc || !eu) return
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'solicitacao',
      documento_id: sc.id,
      aprovador_id: eu,
      acao,
      comentario: comentario ?? null,
    })
  }

  async function aprovar() {
    if (!sc) return
    setActionLoading('aprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'aprovada',
        aprovador_id: eu!,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: null,
      })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao aprovar.'); setActionLoading(null); return }
    await logAcao('aprovou')
    toast.success('Solicitação aprovada')
    await fetchData()
    setActionLoading(null)
  }

  async function reprovar() {
    if (!sc) return
    if (!motivo.trim()) { toast.error('Informe o motivo da reprovação.'); return }
    setActionLoading('reprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'reprovada',
        aprovador_id: eu!,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: motivo.trim(),
      })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao reprovar.'); setActionLoading(null); return }
    await logAcao('reprovou', motivo.trim())
    toast.success('Solicitação reprovada')
    setModal(null); setMotivo('')
    await fetchData()
    setActionLoading(null)
  }

  async function cancelar() {
    if (!sc) return
    setActionLoading('cancelar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({ status: 'cancelada', cancelada_em: new Date().toISOString() })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao cancelar.'); setActionLoading(null); return }
    await logAcao('cancelou', motivo.trim() || undefined)
    toast.success('Solicitação cancelada')
    setModal(null); setMotivo('')
    await fetchData()
    setActionLoading(null)
  }

  // ── Render ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }
  if (!sc) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Solicitação não encontrada.</p>
        <Link to="/compras/solicitacoes" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          Voltar para listagem
        </Link>
      </div>
    )
  }

  const meta = STATUS_META[sc.status]
  const prio = PRIORIDADE_META[sc.prioridade]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/compras/solicitacoes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors mb-2"
        >
          <ChevronLeft size={14} /> Solicitações
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">{sc.numero}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                {sc.prioridade !== 'normal' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${prio.badge}`}>
                    {prio.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Criada {formatDateTime(sc.created_at)}
              </p>
            </div>
          </div>

          {/* Ações contextuais */}
          <div className="flex items-center gap-2 flex-wrap">
            {podeAprovar && (
              <>
                <Button
                  isDisabled={actionLoading === 'reprovar'}
                  onPress={() => { setModal('reprovar'); setMotivo('') }}
                  className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Reprovar
                </Button>
                <Button
                  isDisabled={actionLoading === 'aprovar'}
                  onPress={aprovar}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> {actionLoading === 'aprovar' ? 'Aprovando…' : 'Aprovar'}
                </Button>
              </>
            )}
            {podeIniciarCotacao && (
              <Button
                onPress={() => navigate(`/compras/cotacoes/nova?sc=${sc.id}`)}
                className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <FileSearch size={14} /> Iniciar cotação
              </Button>
            )}
            {podePedidoDireto && (
              <Button
                onPress={() => navigate(`/compras/pedidos/novo?sc=${sc.id}`)}
                className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <ShoppingCart size={14} /> Pedido direto
              </Button>
            )}
            {podeCancelar && (
              <Button
                onPress={() => { setModal('cancelar'); setMotivo('') }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <Ban size={14} /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Linha do tempo do processo */}
      <LinhaTempoProcesso scId={sc.id} currentStep={sc.status === 'aguardando_aprovacao' ? 'aprovacao' : 'sc'} />

      {/* Aviso de reprovação */}
      {sc.status === 'reprovada' && sc.motivo_reprovacao && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Reprovada por {sc.aprovador?.nome ?? sc.aprovador?.email ?? '—'}</p>
            <p className="mt-0.5 text-red-700/80 dark:text-red-300/80">{sc.motivo_reprovacao}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Resumo</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 px-5 py-4 text-sm">
              <InfoBlock label="Empresa" icon={Building2}>
                {sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social ?? '—'}
              </InfoBlock>
              <InfoBlock label="Departamento" icon={Network}>
                {sc.departamento
                  ? (sc.departamento.codigo ? `${sc.departamento.codigo} · ${sc.departamento.nome}` : sc.departamento.nome)
                  : '—'}
              </InfoBlock>
              <InfoBlock label="Solicitante" icon={UserIcon}>
                {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
              </InfoBlock>
              <InfoBlock label="Gestor (aprovador)" icon={UserIcon}>
                {sc.departamento?.gestor?.nome ?? sc.departamento?.gestor?.email ?? (
                  <span className="text-amber-600 dark:text-amber-400">sem gestor definido</span>
                )}
              </InfoBlock>
              <InfoBlock label="Data necessária" icon={Calendar}>
                {formatDate(sc.data_necessaria)}
              </InfoBlock>
              <InfoBlock label="Prioridade">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${prio.badge}`}>
                  {prio.label}
                </span>
              </InfoBlock>
              <div className="col-span-2 md:col-span-3">
                <InfoBlock label="Justificativa">
                  <span className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{sc.justificativa ?? '—'}</span>
                </InfoBlock>
              </div>
              {sc.observacoes && (
                <div className="col-span-2 md:col-span-3">
                  <InfoBlock label="Observações">
                    <span className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{sc.observacoes}</span>
                  </InfoBlock>
                </div>
              )}
            </div>
          </section>

          {/* Itens */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Itens <span className="text-gray-400 dark:text-gray-500 font-normal">({itens.length})</span>
              </h2>
              {totalEstimado > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total estimado: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatMoney(totalEstimado)}</span>
                </span>
              )}
            </div>
            {itens.length === 0 ? (
              <div className="py-12 text-center">
                <Package size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Sem itens.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">#</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Qtd.</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">UoM</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Preço estim.</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total estim.</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {itens.map(it => {
                      const totalLinha = Number(it.quantidade) * Number(it.preco_estimado ?? 0)
                      const stMeta = ITEM_STATUS_META[it.status_item]
                      return (
                        <tr key={it.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-3 py-3 text-gray-400 dark:text-gray-500 font-mono align-top">{it.linha}</td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <Package size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{it.produto?.nome ?? '—'}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                  {it.produto?.codigo}
                                  {it.produto?.tipo === 'servico' && <span className="ml-2 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-semibold">SERVIÇO</span>}
                                </p>
                                {it.observacao && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{it.observacao}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200 align-top">{formatQty(it.quantidade)}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400 align-top">{it.unidade_medida?.sigla ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300 align-top">{formatMoney(it.preco_estimado)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100 align-top">
                            {it.preco_estimado != null ? formatMoney(totalLinha) : '—'}
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
            )}
          </section>

          {/* Cotações vinculadas */}
          <SecaoCotacoes cotacoes={cotacoes} navigate={navigate} />

          {/* Pedidos vinculados */}
          <SecaoPedidos pedidos={pedidos} navigate={navigate} />

          {/* Recebimentos */}
          <SecaoRecebimentos recebimentos={recebimentos} pedidos={pedidos} navigate={navigate} />
        </div>

        {/* Coluna lateral: Timeline */}
        <aside>
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2">
              <History size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Linha do tempo</h2>
            </div>
            <Timeline sc={sc} eventos={timeline} />
          </section>
        </aside>
      </div>

      {/* Modal motivo */}
      {modal && (
        <MotivoModal
          titulo={modal === 'reprovar' ? 'Reprovar solicitação' : 'Cancelar solicitação'}
          descricao={modal === 'reprovar'
            ? 'Informe o motivo da reprovação. Ele ficará visível ao solicitante.'
            : 'Você pode informar um motivo (opcional).'}
          obrigatorio={modal === 'reprovar'}
          confirmLabel={modal === 'reprovar' ? 'Reprovar' : 'Cancelar SC'}
          confirmTone={modal === 'reprovar' ? 'red' : 'gray'}
          loading={actionLoading === modal}
          motivo={motivo}
          onMotivoChange={setMotivo}
          onCancelar={() => { setModal(null); setMotivo('') }}
          onConfirmar={() => { if (modal === 'reprovar') reprovar(); else cancelar() }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Timeline
// ────────────────────────────────────────────────────────────────

type Tom = 'blue' | 'amber' | 'emerald' | 'red' | 'gray' | 'violet'

const TOM_CLS: Record<Tom, { bgAvatar: string; bgIcone: string; texto: string; border: string }> = {
  blue:    { bgAvatar: 'bg-blue-100 dark:bg-blue-950/60',       bgIcone: 'bg-blue-500',    texto: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-200 dark:border-blue-800' },
  amber:   { bgAvatar: 'bg-amber-100 dark:bg-amber-950/60',     bgIcone: 'bg-amber-500',   texto: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-200 dark:border-amber-800' },
  emerald: { bgAvatar: 'bg-emerald-100 dark:bg-emerald-950/60', bgIcone: 'bg-emerald-500', texto: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  red:     { bgAvatar: 'bg-red-100 dark:bg-red-950/60',         bgIcone: 'bg-red-500',     texto: 'text-red-700 dark:text-red-300',         border: 'border-red-200 dark:border-red-800' },
  gray:    { bgAvatar: 'bg-gray-100 dark:bg-gray-800',          bgIcone: 'bg-gray-400',    texto: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-200 dark:border-gray-700' },
  violet:  { bgAvatar: 'bg-violet-100 dark:bg-violet-950/60',   bgIcone: 'bg-violet-500',  texto: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-200 dark:border-violet-800' },
}

const ACAO_META: Record<string, { verbo: string; tom: Tom; icone: typeof Send }> = {
  enviou:     { verbo: 'enviou para aprovação',   tom: 'amber',   icone: Send },
  aprovou:    { verbo: 'aprovou a solicitação',   tom: 'emerald', icone: CheckCircle2 },
  reprovou:   { verbo: 'reprovou a solicitação',  tom: 'red',     icone: XCircle },
  cancelou:   { verbo: 'cancelou a solicitação',  tom: 'gray',    icone: Ban },
  encaminhou: { verbo: 'encaminhou a solicitação',tom: 'violet',  icone: Send },
}

type EventoTl = {
  tom: Tom
  icone: typeof Send | typeof FileText
  verbo: string
  quem: string | null
  quando: string
  comentario?: string | null
  pendente?: boolean
}

function Timeline({ sc, eventos }: { sc: SolicitacaoFull; eventos: EventoTimeline[] }) {
  const itensTl: EventoTl[] = []

  itensTl.push({
    tom: 'blue',
    icone: FileText,
    verbo: 'criou a solicitação',
    quem: sc.solicitante?.nome ?? sc.solicitante?.email ?? null,
    quando: sc.created_at,
  })

  eventos.forEach(ev => {
    const meta = ACAO_META[ev.acao] ?? { verbo: ev.acao, tom: 'gray' as Tom, icone: Send }
    itensTl.push({
      tom: meta.tom,
      icone: meta.icone,
      verbo: meta.verbo,
      quem: ev.aprovador?.nome ?? ev.aprovador?.email ?? null,
      quando: ev.created_at,
      comentario: ev.comentario,
    })
  })


  return (
    <ol className="relative px-5 py-5 space-y-5">
      <div className="absolute left-[33px] top-8 bottom-8 w-px bg-gradient-to-b from-gray-200 via-gray-200 to-transparent dark:from-gray-700 dark:via-gray-700" />
      {itensTl.map((ev, idx) => {
        const Icon = ev.icone
        const tom = TOM_CLS[ev.tom]
        const isUltimo = idx === itensTl.length - 1
        return (
          <li key={idx} className="relative pl-12">
            {/* Marcador: avatar com iniciais OU ícone, dependendo se tem pessoa */}
            {ev.quem ? (
              <span
                className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${tom.bgAvatar} ${tom.texto} ring-4 ring-white dark:ring-gray-900 shadow-sm`}
                title={ev.quem}
              >
                {getIniciais(ev.quem)}
                <span className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${tom.bgIcone} ring-2 ring-white dark:ring-gray-900`}>
                  <Icon size={8} className="text-white" strokeWidth={3} />
                </span>
              </span>
            ) : (
              <span className={`absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full ${ev.pendente ? 'bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600' : tom.bgIcone} ring-4 ring-white dark:ring-gray-900 ${ev.pendente ? '' : 'shadow-sm'}`}>
                <Icon size={14} className={ev.pendente ? 'text-gray-400 dark:text-gray-500' : 'text-white'} />
              </span>
            )}

            {/* Frase narrativa */}
            <p className={`text-sm leading-snug ${ev.pendente ? 'text-gray-500 dark:text-gray-400 italic' : 'text-gray-700 dark:text-gray-300'}`}>
              {ev.quem && (
                <span className="font-semibold text-gray-900 dark:text-gray-100">{ev.quem}</span>
              )}
              {ev.quem && ' '}
              {ev.verbo}
            </p>

            {/* Tempo: relativo + completo */}
            {ev.quando && (
              <p
                className="mt-1 text-[11px] text-gray-400 dark:text-gray-500"
                title={formatDateTime(ev.quando)}
              >
                <span className={isUltimo ? `font-medium ${tom.texto}` : ''}>{formatRelativeTime(ev.quando)}</span>
                <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                <span>{formatDateTime(ev.quando)}</span>
              </p>
            )}

            {/* Comentário/motivo */}
            {ev.comentario && (
              <div className={`mt-2 flex items-start gap-1.5 rounded-lg border ${tom.border} bg-gray-50/60 dark:bg-gray-800/60 px-2.5 py-2 text-xs text-gray-600 dark:text-gray-300`}>
                <MessageSquare size={12} className="mt-0.5 shrink-0 text-gray-400" />
                <span className="whitespace-pre-wrap leading-relaxed">{ev.comentario}</span>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ────────────────────────────────────────────────────────────────
// Modal de motivo
// ────────────────────────────────────────────────────────────────

function MotivoModal({
  titulo, descricao, obrigatorio, confirmLabel, confirmTone, loading,
  motivo, onMotivoChange, onCancelar, onConfirmar,
}: {
  titulo: string
  descricao: string
  obrigatorio: boolean
  confirmLabel: string
  confirmTone: 'red' | 'gray'
  loading: boolean
  motivo: string
  onMotivoChange: (v: string) => void
  onCancelar: () => void
  onConfirmar: () => void
}) {
  const toneCls = confirmTone === 'red'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-gray-700 hover:bg-gray-800 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Motivo {obrigatorio && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={motivo}
            onChange={e => onMotivoChange(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            placeholder={obrigatorio ? 'Obrigatório' : 'Opcional'}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button
            onClick={onCancelar}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <Button
            isDisabled={loading || (obrigatorio && !motivo.trim())}
            onPress={onConfirmar}
            className={`${toneCls} aria-disabled:opacity-60 px-4 py-2 text-sm font-medium`}
          >
            {loading ? 'Processando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Seções: Cotações, Pedidos, Recebimentos vinculados
// ────────────────────────────────────────────────────────────────

function SecaoCotacoes({ cotacoes, navigate }: {
  cotacoes: CotacaoVinculada[]
  navigate: ReturnType<typeof useNavigate>
}) {
  if (cotacoes.length === 0) return null
  return (
    <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2">
        <Trophy size={14} className="text-violet-600 dark:text-violet-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Cotações <span className="text-gray-400 dark:text-gray-500 font-normal">({cotacoes.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {cotacoes.map(c => {
          const meta = COTACAO_STATUS_META[c.status]
          const forns = c.fornecedores ?? []
          const respondidos = forns.filter(f => f.status_convite === 'respondido').length
          return (
            <li key={c.id}>
              <button
                onClick={() => navigate(`/compras/cotacoes/${c.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-violet-50/40 dark:hover:bg-violet-950/20 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/40">
                  <FileSearch size={15} className="text-violet-600 dark:text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{c.numero}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5">{c.titulo}</p>
                  <div className="mt-1 flex items-center gap-3 flex-wrap text-[11px] text-gray-500 dark:text-gray-400">
                    <span>{c.itens_count ?? 0} {(c.itens_count ?? 0) === 1 ? 'item' : 'itens'}</span>
                    <span>·</span>
                    <span>{respondidos}/{forns.length} fornecedor{forns.length !== 1 ? 'es' : ''} respondeu</span>
                    {(c.total_escolhido ?? 0) > 0 && (
                      <>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                          <Crown size={10} /> {formatMoney(c.total_escolhido)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs text-violet-600 dark:text-violet-400 shrink-0">
                  Ver detalhes <ChevronRight size={12} />
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SecaoPedidos({ pedidos, navigate }: {
  pedidos: PedidoVinculado[]
  navigate: ReturnType<typeof useNavigate>
}) {
  if (pedidos.length === 0) return null
  return (
    <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2">
        <ShoppingCart size={14} className="text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Pedidos de Compra <span className="text-gray-400 dark:text-gray-500 font-normal">({pedidos.length})</span>
        </h2>
      </div>
      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {pedidos.map(p => {
          const meta = PEDIDO_STATUS_META[p.status]
          const progresso = (p.qtd_total ?? 0) > 0 ? ((p.qtd_recebida ?? 0) / (p.qtd_total ?? 1)) * 100 : 0
          return (
            <li key={p.id}>
              <button
                onClick={() => navigate(`/compras/pedidos/${p.id}`)}
                className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 transition-colors"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                  <ShoppingCart size={15} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{p.numero}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    {!p.cotacao_id && (
                      <span className="text-[10px] text-gray-400 italic">(pedido direto)</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 truncate mt-0.5 inline-flex items-center gap-1">
                    <Truck size={11} /> {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? '—'}
                  </p>
                  {progresso > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 max-w-[120px] h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${progresso}%` }} />
                      </div>
                      <span className="text-[10px] text-gray-500">{progresso.toFixed(0)}% recebido</span>
                    </div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatMoney(p.total)}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-0.5">
                    Ver detalhes <ChevronRight size={11} />
                  </p>
                </div>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function SecaoRecebimentos({ recebimentos, pedidos, navigate }: {
  recebimentos: RecebimentoVinculado[]
  pedidos: PedidoVinculado[]
  navigate: ReturnType<typeof useNavigate>
}) {
  // Pedidos esperando recebimento
  const pendentes = pedidos.filter(p => ['enviado','parcialmente_recebido'].includes(p.status))

  if (recebimentos.length === 0 && pendentes.length === 0) return null

  return (
    <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2">
        <Receipt size={14} className="text-emerald-600 dark:text-emerald-400" />
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Recebimentos <span className="text-gray-400 dark:text-gray-500 font-normal">({recebimentos.length})</span>
        </h2>
      </div>

      {pendentes.length > 0 && (
        <div className="px-5 py-3 bg-amber-50/40 dark:bg-amber-950/20 border-b border-amber-200/40 dark:border-amber-800/40">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-2">
            Pedidos aguardando recebimento
          </p>
          <div className="space-y-1.5">
            {pendentes.map(p => (
              <div key={p.id} className="flex items-center gap-2 rounded-lg bg-white dark:bg-gray-900 border border-amber-200 dark:border-amber-800/60 px-3 py-2">
                <Truck size={12} className="text-amber-600 shrink-0" />
                <span className="text-xs font-mono font-semibold flex-1 truncate">{p.numero}</span>
                <span className="text-[11px] text-gray-500 truncate">{p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social}</span>
                <Button
                  onPress={() => navigate(`/compras/recebimentos/novo?pedido=${p.id}`)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 text-[11px] font-medium inline-flex items-center gap-1"
                >
                  <Receipt size={10} /> Receber
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {recebimentos.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum recebimento registrado ainda.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-800">
          {recebimentos.map(r => (
            <li key={r.id} className="flex items-center gap-3 px-5 py-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono font-semibold">{r.numero}</span>
                  <span className="text-[11px] text-gray-500">do {r.pedido_numero}</span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{formatDateTime(r.data_recebimento)}</p>
                {r.observacoes && <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">{r.observacoes}</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ────────────────────────────────────────────────────────────────
// InfoBlock
// ────────────────────────────────────────────────────────────────

function InfoBlock({ label, icon: Icon, children }: { label: string; icon?: typeof Building2; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
        {Icon && <Icon size={11} />} {label}
      </p>
      <div className="text-sm text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}
