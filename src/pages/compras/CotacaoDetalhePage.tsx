import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  CheckCircle2, Building2, Calendar, FileText, Package,
  User as UserIcon, AlertCircle, Trophy, Crown, ShoppingCart, Plus, X, Truck, Edit3,
} from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpCotacaoEscolha, CmpCotacaoFornecedorStatus, CmpCotacaoRespostaItem, CmpFornecedor,
  CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  COTACAO_STATUS_META, PEDIDO_STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty,
} from './_shared'
import { LinhaTempoProcesso } from './_LinhaTempoProcesso'
import { gerarPedidosDaCotacao } from './_gerarPedidos'
import { PropLinha } from './_LayoutDetalhe'
import {
  LayoutDetalheFocado, MetaChip, MetaSep, AlertaLinha, type PainelSecao,
} from './_LayoutDetalheFocado'
import { HistoricoTimeline, type EventoHistorico } from './_HistoricoTimeline'
import { rpcCompras } from './_rpc'
import { VinculosBar, VinculosLista, gruposVinculosCotacao } from './_VinculosProcesso'

// ── Tipos do payload da RPC cmp_detalhe_cotacao ──
type ProfileMini = { id: string; nome: string | null; email: string }

type CotacaoFull = {
  id: string; numero: string; titulo: string
  status: 'aberta' | 'respondida' | 'vencedor_escolhido' | 'encerrada' | 'cancelada'
  empresa_id: string
  comprador_id: string | null
  aprovador_id: string | null
  aprovado_em: string | null
  prazo_resposta: string | null
  observacoes: string | null
  motivo_reprovacao: string | null
  cancelada_em: string | null
  created_at: string; updated_at: string
  empresa?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null } | null
  comprador?: ProfileMini | null
  aprovador?: ProfileMini | null
}

type ItemFull = {
  id: string; cotacao_id: string; linha: number
  solicitacao_item_id: string | null
  produto_id: string | null; variante_id: string | null; unidade_medida_id: string | null
  quantidade: number; observacao: string | null
  created_at: string
  produto?: { id: string; codigo: string; nome: string; tipo: string; imagem_url: string | null } | null
  unidade_medida?: { id: string; nome: string; sigla: string } | null
}

type FornecedorFull = {
  id: string; cotacao_id: string; fornecedor_id: string
  status_convite: CmpCotacaoFornecedorStatus
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  observacao: string | null
  respondido_em: string | null
  created_at: string
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj_cpf: string | null } | null
}

type PedidoVinc = {
  id: string; numero: string; status: CmpPedidoStatus
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  created_at?: string
  total?: number
  qtd_total?: number
  qtd_recebida?: number
  itens_resumo?: Array<{
    linha?: number; nome: string; codigo?: string | null
    quantidade?: number; unidade?: string | null
    preco_unitario?: number; total?: number; quantidade_recebida?: number
  }>
}

interface RpcDetalheCot {
  cotacao: CotacaoFull
  itens: ItemFull[]
  fornecedores: FornecedorFull[]
  respostas: CmpCotacaoRespostaItem[]
  escolhas: CmpCotacaoEscolha[]
  scs_vinculadas: { id: string; numero: string; status: CmpSolicitacaoStatus }[]
  pedidos: PedidoVinc[]
  historico: EventoHistorico[]
}

export function CotacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [cot, setCot] = useState<CotacaoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorFull[]>([])
  const [respostas, setRespostas] = useState<CmpCotacaoRespostaItem[]>([])
  const [escolhas, setEscolhas] = useState<CmpCotacaoEscolha[]>([])
  const [scsVinc, setScsVinc] = useState<{ id: string; numero: string; status: CmpSolicitacaoStatus }[]>([])
  const [pedidosVinc, setPedidosVinc] = useState<PedidoVinc[]>([])
  const [historico, setHistorico] = useState<EventoHistorico[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modalAdicionarForn, setModalAdicionarForn] = useState(false)

  // Cotação pode ser editada enquanto NENHUM pedido foi aprovado/enviado/recebido.
  // Quando isso acontecer, ela fica travada (não é mais possível alterar).
  const temPedidoAprovado = pedidosVinc.some(p =>
    !['aguardando_aprovacao', 'cancelado'].includes(p.status)
  )
  const pedidosPendentes = pedidosVinc.filter(p => p.status === 'aguardando_aprovacao')

  const podeEditarRespostas =
    (profile?.role === 'admin' || profile?.role === 'comprador') && !temPedidoAprovado

  const fetchData = useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) setLoading(true)
    const { data, error } = await rpcCompras<RpcDetalheCot>('cmp_detalhe_cotacao', { p_id: id })
    if (error) {
      console.error('[CotacaoDetalhePage] cmp_detalhe_cotacao:', error)
      toast.error('Erro ao carregar cotação.')
      if (!silent) setLoading(false)
      return
    }
    if (!data) {
      setCot(null)
      if (!silent) setLoading(false)
      return
    }
    setCot(data.cotacao ?? null)
    setItens(data.itens ?? [])
    setFornecedores(data.fornecedores ?? [])
    setRespostas(data.respostas ?? [])
    setEscolhas(data.escolhas ?? [])
    setScsVinc(data.scs_vinculadas ?? [])
    setPedidosVinc(data.pedidos ?? [])
    setHistorico(data.historico ?? [])
    if (!silent) setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const gruposVinc = useMemo(
    () => gruposVinculosCotacao({ scs: scsVinc, pedidos: pedidosVinc }),
    [scsVinc, pedidosVinc],
  )

  // ── Mapas de leitura rápida ──
  const respPorFornItem = useMemo(() => {
    const m: Record<string, CmpCotacaoRespostaItem> = {}
    respostas.forEach(r => { m[`${r.cotacao_fornecedor_id}__${r.cotacao_item_id}`] = r })
    return m
  }, [respostas])

  const escolhaPorItem = useMemo(() => {
    const m: Record<string, CmpCotacaoEscolha> = {}
    escolhas.forEach(e => { m[e.cotacao_item_id] = e })
    return m
  }, [escolhas])

  // Menor preço por item (destaque)
  const menorPorItem = useMemo(() => {
    const m: Record<string, { cotacao_fornecedor_id: string; preco: number }> = {}
    itens.forEach(it => {
      let melhor: { cotacao_fornecedor_id: string; preco: number } | null = null
      fornecedores.forEach(f => {
        const r = respPorFornItem[`${f.id}__${it.id}`]
        if (r && (!melhor || r.preco_unitario < melhor.preco)) {
          melhor = { cotacao_fornecedor_id: f.id, preco: r.preco_unitario }
        }
      })
      if (melhor) m[it.id] = melhor
    })
    return m
  }, [itens, fornecedores, respPorFornItem])

  // ── Inputs editáveis das respostas (controlados) ──
  const [precoEdits, setPrecoEdits] = useState<Record<string, string>>({})

  function chave(fornId: string, itemId: string) { return `${fornId}__${itemId}` }
  function valorPreco(fornId: string, itemId: string): string {
    const k = chave(fornId, itemId)
    if (precoEdits[k] !== undefined) return precoEdits[k]
    const r = respPorFornItem[k]
    return r ? String(r.preco_unitario) : ''
  }

  async function salvarPreco(fornId: string, itemId: string) {
    const k = chave(fornId, itemId)
    const raw = precoEdits[k]
    if (raw === undefined) return
    const parsed = parseFloat(raw)
    if (isNaN(parsed) || parsed < 0) { toast.error('Preço inválido'); return }
    const existente = respPorFornItem[k]
    if (existente) {
      const { error } = await supabase.from('cmp_cotacoes_respostas_itens')
        .update({ preco_unitario: parsed }).eq('id', existente.id)
      if (error) { toast.error('Erro ao salvar'); return }
    } else {
      const { error } = await supabase.from('cmp_cotacoes_respostas_itens')
        .insert({ cotacao_fornecedor_id: fornId, cotacao_item_id: itemId, preco_unitario: parsed })
      if (error) { toast.error('Erro ao salvar'); return }
    }
    // Marca o fornecedor como "respondido" se tiver pelo menos 1 preço
    await supabase.from('cmp_cotacoes_fornecedores')
      .update({ status_convite: 'respondido', respondido_em: new Date().toISOString() })
      .eq('id', fornId)
    setPrecoEdits(prev => { const n = { ...prev }; delete n[k]; return n })
    // Se algum fornecedor tem respostas, marca cotação como "respondida"
    if (cot?.status === 'aberta') {
      await supabase.from('cmp_cotacoes').update({ status: 'respondida' }).eq('id', cot.id)
    }
    await fetchData(true)
  }

  async function escolherVencedor(itemId: string, fornId: string) {
    if (!cot) return
    const r = respPorFornItem[`${fornId}__${itemId}`]
    if (!r) { toast.error('Fornecedor não respondeu este item'); return }
    const existente = escolhaPorItem[itemId]
    if (existente) {
      await supabase.from('cmp_cotacoes_escolhas')
        .update({ cotacao_fornecedor_id: fornId, preco_final_unitario: r.preco_unitario })
        .eq('id', existente.id)
    } else {
      await supabase.from('cmp_cotacoes_escolhas')
        .insert({
          cotacao_id: cot.id, cotacao_item_id: itemId,
          cotacao_fornecedor_id: fornId, preco_final_unitario: r.preco_unitario,
        })
    }
    await fetchData(true)
  }

  async function limparEscolha(itemId: string) {
    const e = escolhaPorItem[itemId]
    if (!e) return
    await supabase.from('cmp_cotacoes_escolhas').delete().eq('id', e.id)
    await fetchData(true)
  }

  async function aplicarTodosDoFornecedor(fornId: string) {
    if (!cot) return
    for (const it of itens) {
      const r = respPorFornItem[chave(fornId, it.id)]
      if (!r) continue
      const e = escolhaPorItem[it.id]
      if (e) {
        await supabase.from('cmp_cotacoes_escolhas')
          .update({ cotacao_fornecedor_id: fornId, preco_final_unitario: r.preco_unitario })
          .eq('id', e.id)
      } else {
        await supabase.from('cmp_cotacoes_escolhas')
          .insert({ cotacao_id: cot.id, cotacao_item_id: it.id, cotacao_fornecedor_id: fornId, preco_final_unitario: r.preco_unitario })
      }
    }
    toast.success('Vencedor por fornecedor aplicado')
    await fetchData(true)
  }

  async function gerarPedidos() {
    if (!cot) return
    if (escolhas.length === 0) { toast.error('Escolha o vencedor de ao menos um item.'); return }
    if (escolhas.length < itens.length) {
      toast.error(`Faltam vencedores: ${itens.length - escolhas.length} item(ns) sem escolha.`)
      return
    }

    // Se já tem pedidos pendentes desta cotação, confirma antes de regerar
    if (pedidosPendentes.length > 0) {
      if (!window.confirm(
        `Esta cotação já tem ${pedidosPendentes.length} pedido(s) aguardando aprovação. ` +
        `Eles serão APAGADOS e novos pedidos serão criados com as escolhas atuais.\n\nContinuar?`
      )) return
    }

    setActionLoading('gerar')
    try {
      // 1. APAGA pedidos pendentes antigos da cotação (não cancela — evita lixo)
      //    Itens do pedido caem por cascade. Como esses pedidos ainda não foram
      //    aprovados/enviados/recebidos, é seguro apagar.
      if (pedidosPendentes.length > 0) {
        const ids = pedidosPendentes.map(p => p.id)
        await supabase.from('cmp_pedidos_compra').delete().in('id', ids)
      }

      // 2. Marca cotação como vencedor_escolhido (a função gerarPedidos vai depois marcar como 'encerrada')
      if (cot.status !== 'vencedor_escolhido' && cot.status !== 'encerrada') {
        await supabase.from('cmp_cotacoes')
          .update({ status: 'vencedor_escolhido' })
          .eq('id', cot.id)
      }

      const { pedidos_gerados } = await gerarPedidosDaCotacao({
        cotacao: { id: cot.id, empresa_id: cot.empresa_id, comprador_id: cot.comprador_id ?? '' },
        itens: itens as unknown as Parameters<typeof gerarPedidosDaCotacao>[0]['itens'],
        fornecedores: fornecedores.map(f => ({ ...f, fornecedor_id: f.fornecedor_id })) as unknown as Parameters<typeof gerarPedidosDaCotacao>[0]['fornecedores'],
        escolhas,
      })

      await supabase.from('cmp_aprovacoes').insert({
        documento_tipo: 'cotacao', documento_id: cot.id,
        aprovador_id: profile!.id, acao: 'encaminhou',
        comentario: pedidosPendentes.length > 0
          ? `Pedidos regerados: ${pedidos_gerados.length} novo(s) (apagou ${pedidosPendentes.length} pendente(s))`
          : `${pedidos_gerados.length} pedido(s) gerado(s) para aprovação`,
      })

      const semAlcada = pedidos_gerados.filter(p => !p.aprovador_id).length
      const msg = semAlcada > 0
        ? `${pedidos_gerados.length} pedido(s) gerado(s). ${semAlcada} sem alçada (só admin pode aprovar).`
        : `${pedidos_gerados.length} pedido(s) gerado(s) — aguardando aprovação pela alçada.`
      toast.success(msg)
      await fetchData()
    } catch (err) {
      console.error(err)
      toast.error('Erro ao gerar pedidos.')
    } finally {
      setActionLoading(null)
    }
  }

  async function consolidarVencedores() {
    if (!cot) return
    if (escolhas.length === 0) { toast.error('Escolha pelo menos 1 vencedor.'); return }
    setActionLoading('consolidar')
    await supabase.from('cmp_cotacoes').update({ status: 'vencedor_escolhido' }).eq('id', cot.id)
    toast.success('Vencedores consolidados')
    await fetchData(true)
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }
  if (!cot) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Cotação não encontrada.</p>
        <Link to="/compras/cotacoes" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">Voltar</Link>
      </div>
    )
  }

  const statusMeta = COTACAO_STATUS_META[cot.status]
  const todosEscolhidos = itens.length > 0 && escolhas.length === itens.length
  const totalGeral = escolhas.reduce((sum, esc) => {
    const it = itens.find(i => i.id === esc.cotacao_item_id)
    return sum + (it ? it.quantidade * esc.preco_final_unitario : 0)
  }, 0)

  // Pode escolher vencedor enquanto a cotação não estiver cancelada
  // E enquanto nenhum pedido dela tiver sido aprovado (já tratado em podeEditarRespostas)
  const podeEscolher = podeEditarRespostas && cot.status !== 'cancelada'

  // ── Header full-width ──
  const badges = (
    <>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusMeta.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
        {statusMeta.label}
      </span>
    </>
  )

  const acoes = (
    <>
      {podeEscolher && escolhas.length > 0 && cot.status !== 'vencedor_escolhido' && cot.status !== 'encerrada' && (
        <Button isDisabled={actionLoading === 'consolidar'} onPress={consolidarVencedores}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
          <CheckCircle2 size={13} /> Consolidar vencedores
        </Button>
      )}
      {podeEditarRespostas && todosEscolhidos && cot.status !== 'cancelada' && (
        <Button isDisabled={actionLoading === 'gerar'} onPress={gerarPedidos}
          className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
          <ShoppingCart size={13} />
          {pedidosPendentes.length > 0
            ? `Regerar ${pedidosPendentes.length} pedido${pedidosPendentes.length > 1 ? 's' : ''}`
            : 'Gerar pedido'}
        </Button>
      )}
    </>
  )

  const alerta = temPedidoAprovado ? (
    <AlertaLinha tom="gray">Cotação travada — pedido aprovado. Não é possível alterar preços ou vencedores.</AlertaLinha>
  ) : pedidosPendentes.length > 0 && !temPedidoAprovado ? (
    <AlertaLinha tom="amber">
      {pedidosPendentes.length} pedido(s) aguardando aprovação. Ao regerar, pendentes serão apagados.
    </AlertaLinha>
  ) : cot.motivo_reprovacao ? (
    <AlertaLinha tom="red">Orçamento reprovado: {cot.motivo_reprovacao}</AlertaLinha>
  ) : null

  const faixaMeta = (
    <>
      <MetaChip label="Empresa">{cot.empresa?.nome_fantasia ?? cot.empresa?.razao_social ?? '—'}</MetaChip>
      <MetaSep />
      <MetaChip label="Comprador">{cot.comprador?.nome ?? cot.comprador?.email ?? '—'}</MetaChip>
      <MetaSep />
      <MetaChip label="Prazo">{formatDate(cot.prazo_resposta)}</MetaChip>
      <MetaSep />
      <MetaChip label="Itens">{itens.length}</MetaChip>
      <MetaSep />
      <MetaChip label="Fornec.">{fornecedores.length}</MetaChip>
      <MetaSep />
      <MetaChip label="Vencedores">{escolhas.length}/{itens.length}</MetaChip>
      {totalGeral > 0 && (
        <>
          <MetaSep />
          <MetaChip label="Total" destaque>{formatMoney(totalGeral)}</MetaChip>
        </>
      )}
    </>
  )

  const detalhes = (
    <dl className="space-y-2 text-sm">
      <PropLinha label="Título">{cot.titulo}</PropLinha>
      <PropLinha label="Criada" icone={<Calendar size={11} />}>
        <span title={formatDateTime(cot.created_at)}>{formatDateTime(cot.created_at)}</span>
      </PropLinha>
      {cot.observacoes && (
        <PropLinha label="Observações">
          <p className="whitespace-pre-wrap text-xs">{cot.observacoes}</p>
        </PropLinha>
      )}
    </dl>
  )

  const painelVinculos = (
    <section className="space-y-4 text-sm">
      <VinculosLista grupos={gruposVinc} />
      {fornecedores.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Fornecedores</p>
            {podeEditarRespostas && (
              <button type="button" onClick={() => setModalAdicionarForn(true)} className="text-[10px] text-emerald-600 hover:underline">
                + Adicionar
              </button>
            )}
          </div>
          <ul className="space-y-1">
            {fornecedores.map(f => (
              <li key={f.id} className="text-xs truncate">
                {f.fornecedor?.nome_fantasia ?? f.fornecedor?.razao_social} · {f.status_convite}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )

  const principal = itens.length === 0 || fornecedores.length === 0 ? (
        <div className="p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
            <p className="text-xs text-gray-500">
              {itens.length === 0
                ? 'Sem itens nesta cotação.'
                : 'Nenhum fornecedor convidado. Adicione fornecedores para começar.'}
            </p>
            {podeEditarRespostas && fornecedores.length === 0 && (
              <Button onPress={() => setModalAdicionarForn(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
                <Plus size={12} /> Adicionar fornecedor
              </Button>
            )}
          </div>
        </div>
      ) : (() => {
        const totaisPorForn = fornecedores.map(f => {
          const respondeu = itens.filter(it => respPorFornItem[chave(f.id, it.id)]).length
          const total = itens.reduce((sum, it) => {
            const r = respPorFornItem[chave(f.id, it.id)]
            return sum + (r ? Number(it.quantidade) * r.preco_unitario : 0)
          }, 0)
          const vencidos = itens.filter(it => escolhaPorItem[it.id]?.cotacao_fornecedor_id === f.id).length
          return { f, total, respondeu, vencidos, completo: respondeu === itens.length && itens.length > 0 }
        })
        const melhorPrecoFornId = totaisPorForn
          .filter(x => x.completo && x.total > 0)
          .sort((a, b) => a.total - b.total)[0]?.f.id

        return (
          <div>
            <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20">
              <div className="flex items-center gap-3 flex-wrap text-xs text-gray-600 dark:text-gray-400">
                <span><strong className="text-gray-900 dark:text-gray-100">{itens.length}</strong> itens</span>
                <span><strong className="text-gray-900 dark:text-gray-100">{fornecedores.length}</strong> fornecedores</span>
                {totalGeral > 0 && (
                  <span>Total escolhido: <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">{formatMoney(totalGeral)}</span></span>
                )}
              </div>
              {podeEditarRespostas && (
                <Button onPress={() => setModalAdicionarForn(true)}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg">
                  <Plus size={12} /> Adicionar fornecedor
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-separate border-spacing-0 table-fixed">
                <colgroup>
                  <col style={{ width: 240 }} />
                  {fornecedores.map(f => <col key={f.id} style={{ width: 200 }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 align-top">
                      Item
                    </th>
                    {totaisPorForn.map(({ f, total, vencidos }) => {
                      const ehMelhorPreco = f.id === melhorPrecoFornId
                      const venceuAlgum = vencidos > 0
                      const headerCls = ehMelhorPreco
                        ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700'
                        : venceuAlgum
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                          : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      return (
                        <th key={f.id} className={`border-b border-r ${headerCls} px-0 py-0 text-left align-top`}>
                          <FornecedorHeaderCol
                            forn={f}
                            total={total}
                            vencidos={vencidos}
                            totalItens={itens.length}
                            ehMelhorPreco={ehMelhorPreco}
                            podeEscolher={podeEscolher}
                            podeEditarRespostas={podeEditarRespostas}
                            onVenceTudo={() => aplicarTodosDoFornecedor(f.id)}
                            onSaved={() => fetchData(true)}
                          />
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {itens.map(it => {
                    const escolha = escolhaPorItem[it.id]
                    const menor = menorPorItem[it.id]
                    return (
                      <tr key={it.id}>
                        <td className="sticky left-0 bg-white dark:bg-gray-900 border-b border-r border-gray-100 dark:border-gray-800 px-2 py-1.5 align-middle">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-gray-400 shrink-0">#{it.linha}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">{it.produto?.nome}</p>
                              <p className="text-[10px] font-mono text-gray-500 truncate">{it.produto?.codigo}</p>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums shrink-0">
                              {formatQty(it.quantidade)} {it.unidade_medida?.sigla ?? 'un'}
                            </span>
                          </div>
                          {escolha && (
                            <div className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 font-semibold">
                              <Crown size={9} /> {formatMoney(escolha.preco_final_unitario * Number(it.quantidade))}
                            </div>
                          )}
                        </td>

                        {fornecedores.map(f => {
                          const r = respPorFornItem[chave(f.id, it.id)]
                          const isVencedor = escolha?.cotacao_fornecedor_id === f.id
                          const isMenor = menor?.cotacao_fornecedor_id === f.id && fornecedores.length > 1
                          const ehColMelhorPreco = f.id === melhorPrecoFornId
                          const valor = valorPreco(f.id, it.id)
                          const cellCls = isVencedor
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-inset ring-emerald-400 dark:ring-emerald-700'
                            : ehColMelhorPreco
                              ? 'bg-amber-50/60 dark:bg-amber-950/20'
                              : isMenor
                                ? 'bg-violet-50/40 dark:bg-violet-950/20'
                                : ''
                          return (
                            <td key={f.id} className={`border-b border-r border-gray-100 dark:border-gray-800 px-2 py-1.5 align-middle ${cellCls}`}>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-gray-400 shrink-0">R$</span>
                                {podeEditarRespostas ? (
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={valor}
                                    onChange={e => setPrecoEdits(prev => ({ ...prev, [chave(f.id, it.id)]: e.target.value }))}
                                    onBlur={() => salvarPreco(f.id, it.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                    placeholder="—"
                                    className="flex-1 min-w-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs text-right tabular-nums px-1 h-6 outline-none focus:border-emerald-500"
                                  />
                                ) : (
                                  <span className="flex-1 text-xs tabular-nums text-right">{r ? formatMoney(r.preco_unitario) : '—'}</span>
                                )}
                                {podeEscolher && r && (
                                  isVencedor ? (
                                    <button
                                      type="button"
                                      onClick={() => limparEscolha(it.id)}
                                      className="inline-flex items-center justify-center gap-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white px-1.5 h-6 text-[10px] font-semibold transition-colors shrink-0"
                                      title="Remover vencedor"
                                    >
                                      <Crown size={10} /> VENCEU
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => escolherVencedor(it.id, f.id)}
                                      className="inline-flex items-center justify-center rounded border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 px-1.5 h-6 text-[10px] font-medium transition-colors shrink-0"
                                      title="Escolher como vencedor"
                                    >
                                      <Crown size={10} />
                                    </button>
                                  )
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center justify-between gap-1 min-h-[14px]">
                                {isMenor && !isVencedor ? (
                                  <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300">+BARATO</span>
                                ) : <span />}
                                {r ? (
                                  <span className="text-[10px] tabular-nums text-right text-gray-700 dark:text-gray-300 truncate">
                                    = <span className="font-semibold text-gray-900 dark:text-gray-100">{formatMoney(Number(it.quantidade) * r.preco_unitario)}</span>
                                  </span>
                                ) : podeEscolher ? (
                                  <span className="text-[10px] italic text-gray-400">sem resposta</span>
                                ) : <span />}
                              </div>
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()

  const painelSecoes: PainelSecao[] = [
    { id: 'historico', label: 'Histórico', badge: historico.length, conteudo: <HistoricoTimeline eventos={historico} /> },
    { id: 'vinculos', label: 'Vínculos', badge: (scsVinc.length + pedidosVinc.length) || undefined, conteudo: painelVinculos },
    { id: 'detalhes', label: 'Detalhes', conteudo: detalhes },
  ]

  return (
    <>
      <LayoutDetalheFocado
        voltar={<BotaoVoltar fallback="/compras/cotacoes" label="Voltar" />}
        titulo={cot.numero}
        subtitulo={cot.titulo}
        badges={badges}
        acoes={acoes}
        meta={faixaMeta}
        vinculos={<VinculosBar grupos={gruposVinc} />}
        alerta={alerta}
        fluxo={<LinhaTempoProcesso cotacaoId={cot.id} currentStep="cotacao" compacto />}
        principal={principal}
        painelSecoes={painelSecoes}
      />

      {/* Modal: adicionar fornecedor à cotação */}
      {modalAdicionarForn && cot && (
        <ModalAdicionarFornecedor
          cotacaoId={cot.id}
          fornecedoresJaConvidados={fornecedores.map(f => f.fornecedor_id)}
          onFechar={() => setModalAdicionarForn(false)}
          onAdicionado={() => { setModalAdicionarForn(false); fetchData() }}
        />
      )}
    </>
  )
}

// ────────────────────────────────────────────────────────────────
// PropLinha: linha de propriedade (label + valor) no estilo HubSpot
// ────────────────────────────────────────────────────────────────


// ────────────────────────────────────────────────────────────────
// Modal: Adicionar fornecedor à cotação
// ────────────────────────────────────────────────────────────────

function ModalAdicionarFornecedor({
  cotacaoId, fornecedoresJaConvidados, onFechar, onAdicionado,
}: {
  cotacaoId: string
  fornecedoresJaConvidados: string[]
  onFechar: () => void
  onAdicionado: () => void
}) {
  const [disponiveis, setDisponiveis] = useState<CmpFornecedor[]>([])
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [busca, setBusca] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('cmp_fornecedores')
        .select('*').eq('ativo', true).order('razao_social')
      const lista = (data ?? []).filter(f => !fornecedoresJaConvidados.includes(f.id))
      setDisponiveis(lista as CmpFornecedor[])
      setLoading(false)
    })()
  }, [fornecedoresJaConvidados])

  const filtrados = disponiveis.filter(f => {
    const q = busca.trim().toLowerCase()
    if (!q) return true
    return (
      f.razao_social.toLowerCase().includes(q) ||
      f.nome_fantasia?.toLowerCase().includes(q) ||
      f.cnpj_cpf?.includes(q.replace(/\D/g, ''))
    )
  })

  async function confirmar() {
    if (selecionados.size === 0) return
    setSaving(true)
    const { error } = await supabase.from('cmp_cotacoes_fornecedores').insert(
      Array.from(selecionados).map(fid => ({
        cotacao_id: cotacaoId,
        fornecedor_id: fid,
      }))
    )
    setSaving(false)
    if (error) { toast.error('Erro ao adicionar fornecedores'); return }
    toast.success(`${selecionados.size} fornecedor(es) adicionado(s) à cotação`)
    onAdicionado()
  }

  function toggle(id: string) {
    setSelecionados(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold">Adicionar fornecedor à cotação</h2>
            <p className="text-xs text-gray-500 mt-0.5">Selecione um ou mais fornecedores para convidar.</p>
          </div>
          <button onClick={onFechar}><X size={16} className="text-gray-400" /></button>
        </div>

        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <input
            autoFocus type="search" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou CNPJ…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm px-3 py-2 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : disponiveis.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400 px-5">
              Todos os fornecedores ativos já foram convidados para esta cotação.
            </p>
          ) : filtrados.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nada encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtrados.map(f => {
                const sel = selecionados.has(f.id)
                return (
                  <li key={f.id}>
                    <button onClick={() => toggle(f.id)}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${
                        sel ? 'bg-emerald-50 dark:bg-emerald-950/40' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}>
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                        sel ? 'border-emerald-600 bg-emerald-600' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {sel && <CheckCircle2 size={11} className="text-white" />}
                      </span>
                      <Truck size={14} className="text-gray-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{f.nome_fantasia ?? f.razao_social}</p>
                        {f.cnpj_cpf && <p className="text-xs font-mono text-gray-500">{f.cnpj_cpf}</p>}
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <span className="text-xs text-gray-500">{selecionados.size} selecionado(s)</span>
          <div className="flex items-center gap-2">
            <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">
              Cancelar
            </button>
            <Button isDisabled={selecionados.size === 0 || saving} onPress={confirmar}
              className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
              <Plus size={13} /> {saving ? 'Adicionando…' : `Adicionar ${selecionados.size > 0 ? `(${selecionados.size})` : ''}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Cabeçalho da coluna do fornecedor (rico, editável inline)
// ────────────────────────────────────────────────────────────────

function FornecedorHeaderCol({
  forn, total, vencidos, totalItens, ehMelhorPreco,
  podeEscolher, podeEditarRespostas, onVenceTudo, onSaved,
}: {
  forn: FornecedorFull
  total: number
  vencidos: number
  totalItens: number
  ehMelhorPreco: boolean
  podeEscolher: boolean
  podeEditarRespostas: boolean
  onVenceTudo: () => void
  onSaved: () => void
}) {
  const [prazo, setPrazo] = useState<string>(forn.prazo_entrega_dias?.toString() ?? '')
  const [condicao, setCondicao] = useState<string>(forn.condicao_pagamento ?? '')
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    setPrazo(forn.prazo_entrega_dias?.toString() ?? '')
    setCondicao(forn.condicao_pagamento ?? '')
  }, [forn.id, forn.prazo_entrega_dias, forn.condicao_pagamento])

  async function salvar() {
    await supabase.from('cmp_cotacoes_fornecedores').update({
      prazo_entrega_dias: prazo ? parseInt(prazo) : null,
      condicao_pagamento: condicao.trim() || null,
    }).eq('id', forn.id)
    setEditando(false)
    onSaved()
  }

  const statusCls =
    forn.status_convite === 'respondido' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
    forn.status_convite === 'recusado'   ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' :
                                           'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'

  return (
    <div className="px-3 py-2.5 normal-case tracking-normal space-y-1.5">
      {/* Nome + selo de destaque */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate" title={forn.fornecedor?.razao_social}>
          {forn.fornecedor?.nome_fantasia ?? forn.fornecedor?.razao_social}
        </p>
        {ehMelhorPreco && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500 text-white px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0">
            <Trophy size={9} /> Melhor
          </span>
        )}
      </div>

      {/* Total */}
      <p className={`text-base font-bold tabular-nums leading-tight ${
        ehMelhorPreco ? 'text-amber-700 dark:text-amber-400' : 'text-gray-800 dark:text-gray-100'
      }`}>
        {formatMoney(total)}
        {total === 0 && <span className="text-[10px] text-gray-400 font-normal ml-1">— sem respostas</span>}
      </p>

      {/* Status + contagem de vencedor */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${statusCls}`}>
          {forn.status_convite}
        </span>
        {vencidos > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold">
            <Crown size={9} /> Vence {vencidos}/{totalItens}
          </span>
        )}
      </div>

      {/* Prazo + Condição (editável) */}
      {editando && podeEditarRespostas ? (
        <div className="space-y-1">
          <div className="grid grid-cols-2 gap-1">
            <label className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 shrink-0 w-9">Prazo</span>
              <input type="number" min="0" value={prazo} onChange={e => setPrazo(e.target.value)}
                placeholder="dias" className="flex-1 min-w-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs tabular-nums px-1 py-0.5 outline-none focus:border-emerald-500" />
            </label>
            <label className="flex items-center gap-1">
              <span className="text-[10px] text-gray-500 shrink-0 w-9">Pag.</span>
              <input value={condicao} onChange={e => setCondicao(e.target.value)}
                placeholder="30/60" className="flex-1 min-w-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs px-1 py-0.5 outline-none focus:border-emerald-500" />
            </label>
          </div>
          <div className="flex gap-1 justify-end">
            <button onClick={() => setEditando(false)} className="text-[10px] text-gray-500 hover:text-gray-700 px-1 py-0.5">Cancelar</button>
            <button onClick={salvar} className="text-[10px] text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-1 py-0.5 rounded font-medium">Salvar</button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => podeEditarRespostas && setEditando(true)}
          className={`flex items-center justify-between gap-1 text-[10px] text-gray-600 dark:text-gray-400 ${
            podeEditarRespostas ? 'cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400' : ''
          }`}
          title={podeEditarRespostas ? 'Clique para editar' : ''}
        >
          <span className="truncate">
            <span className="font-medium">Prazo:</span> {forn.prazo_entrega_dias ? `${forn.prazo_entrega_dias}d` : '—'}
            <span className="mx-1 text-gray-300">·</span>
            <span className="font-medium">Pag.:</span> {forn.condicao_pagamento ?? '—'}
          </span>
          {podeEditarRespostas && <Edit3 size={10} className="text-gray-300 dark:text-gray-600 shrink-0" />}
        </div>
      )}

      {/* Escolher tudo deste fornecedor */}
      {podeEscolher && total > 0 && (
        <button onClick={onVenceTudo}
          className="w-full text-[10px] text-violet-600 dark:text-violet-400 hover:underline font-medium text-left"
          title="Marca este fornecedor como vencedor de todos os itens que ele respondeu">
          Escolher tudo →
        </button>
      )}
    </div>
  )
}

