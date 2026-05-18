import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ChevronLeft, CheckCircle2, Building2, Calendar,
  User as UserIcon, AlertCircle, Trophy, Crown, ShoppingCart, Plus, X, Truck, Edit3,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpCotacao, CmpCotacaoEscolha, CmpCotacaoFornecedor, CmpCotacaoItem,
  CmpCotacaoRespostaItem, CmpFornecedor, CoreEmpresa, PrdProduto,
  PrdUnidadeMedida, Profile,
} from '@/types/database'
import { COTACAO_STATUS_META, formatDate, formatDateTime, formatMoney, formatQty } from './_shared'
import { LinhaTempoProcesso } from './_LinhaTempoProcesso'
import { gerarPedidosDaCotacao } from './_gerarPedidos'

type CotacaoFull = CmpCotacao & {
  empresa?: CoreEmpresa
  comprador?: Profile
  aprovador?: Profile
}
type ItemFull = CmpCotacaoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida }
type FornecedorFull = CmpCotacaoFornecedor & { fornecedor?: CmpFornecedor }

export function CotacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { profile } = useAuth()

  const [cot, setCot] = useState<CotacaoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [fornecedores, setFornecedores] = useState<FornecedorFull[]>([])
  const [respostas, setRespostas] = useState<CmpCotacaoRespostaItem[]>([])
  const [escolhas, setEscolhas] = useState<CmpCotacaoEscolha[]>([])
  const [scsVinc, setScsVinc] = useState<{ id: string; numero: string }[]>([])
  const [pedidosVinc, setPedidosVinc] = useState<{ id: string; numero: string; status: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [modalAdicionarForn, setModalAdicionarForn] = useState(false)

  // Cotação pode ser editada enquanto NENHUM pedido foi aprovado/enviado/recebido.
  // Quando isso acontecer, ela fica travada (não é mais possível alterar).
  const temPedidoAprovado = pedidosVinc.some(p =>
    !['aguardando_aprovacao', 'cancelado', 'rascunho'].includes(p.status)
  )
  const pedidosPendentes = pedidosVinc.filter(p => p.status === 'aguardando_aprovacao')

  const podeEditarRespostas =
    (profile?.role === 'admin' || profile?.role === 'comprador') && !temPedidoAprovado

  const fetchData = useCallback(async (silent = false) => {
    if (!id) return
    if (!silent) setLoading(true)
    const [cotResp, itensResp, fornResp, respResp, escResp, scResp] = await Promise.all([
      supabase.from('cmp_cotacoes').select(`
        *,
        empresa:core_empresas(*),
        comprador:profiles!cmp_cotacoes_comprador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at),
        aprovador:profiles!cmp_cotacoes_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('id', id).maybeSingle(),
      supabase.from('cmp_cotacoes_itens').select(`
        *,
        produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
        unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
      `).eq('cotacao_id', id).order('linha'),
      supabase.from('cmp_cotacoes_fornecedores').select(`
        *, fornecedor:cmp_fornecedores(*)
      `).eq('cotacao_id', id).order('created_at'),
      supabase.from('cmp_cotacoes_respostas_itens').select('*'),
      supabase.from('cmp_cotacoes_escolhas').select('*').eq('cotacao_id', id),
      supabase.from('cmp_cotacoes_solicitacoes').select('solicitacao_id, sc:cmp_solicitacoes_compra(id,numero)').eq('cotacao_id', id),
    ])
    setCot(cotResp.data as CotacaoFull)
    setItens((itensResp.data ?? []) as ItemFull[])

    const fornsData = (fornResp.data ?? []) as FornecedorFull[]
    setFornecedores(fornsData)

    // Filtra respostas dos fornecedores desta cotação
    const fornIds = new Set(fornsData.map(f => f.id))
    setRespostas((respResp.data ?? []).filter(r => fornIds.has(r.cotacao_fornecedor_id)))

    setEscolhas((escResp.data ?? []) as CmpCotacaoEscolha[])
    const scsRaw = (scResp.data ?? []) as Array<{ solicitacao_id: string; sc?: { numero?: string } | null }>
    setScsVinc(scsRaw.map(r => ({
      id: r.solicitacao_id,
      numero: r.sc?.numero ?? '—',
    })))

    // Pedidos vinculados (pra saber se pode editar)
    const { data: pedsData } = await supabase
      .from('cmp_pedidos_compra').select('id,numero,status').eq('cotacao_id', id)
    setPedidosVinc(pedsData ?? [])

    if (!silent) setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

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
        cotacao: { id: cot.id, empresa_id: cot.empresa_id, comprador_id: cot.comprador_id },
        itens,
        fornecedores: fornecedores.map(f => ({ ...f, fornecedor_id: f.fornecedor_id })),
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

  const meta = COTACAO_STATUS_META[cot.status]
  const todosEscolhidos = itens.length > 0 && escolhas.length === itens.length
  const totalGeral = escolhas.reduce((sum, esc) => {
    const it = itens.find(i => i.id === esc.cotacao_item_id)
    return sum + (it ? it.quantidade * esc.preco_final_unitario : 0)
  }, 0)

  // Pode escolher vencedor enquanto a cotação não estiver cancelada
  // E enquanto nenhum pedido dela tiver sido aprovado (já tratado em podeEditarRespostas)
  const podeEscolher = podeEditarRespostas && cot.status !== 'cancelada'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link to="/compras/cotacoes" className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 mb-2">
          <ChevronLeft size={14} /> Cotações
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/30">
              <Trophy size={18} className="text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">{cot.numero}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-200 mt-0.5">{cot.titulo}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {podeEscolher && escolhas.length > 0 && cot.status !== 'vencedor_escolhido' && cot.status !== 'encerrada' && (
              <Button isDisabled={actionLoading === 'consolidar'} onPress={consolidarVencedores}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-sm font-medium">
                Consolidar vencedores
              </Button>
            )}
            {podeEditarRespostas && todosEscolhidos && cot.status !== 'cancelada' && (
              <Button isDisabled={actionLoading === 'gerar'} onPress={gerarPedidos}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
                <ShoppingCart size={14} />
                {pedidosPendentes.length > 0
                  ? `Regerar ${pedidosPendentes.length} pedido${pedidosPendentes.length > 1 ? 's' : ''}`
                  : 'Gerar pedido para aprovação'}
              </Button>
            )}
            {pedidosVinc.length > 0 && (
              <Link to="/compras/pedidos" className="inline-flex items-center gap-1.5 bg-white dark:bg-gray-800 border border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 px-3 py-2 text-sm font-medium rounded-lg">
                <ShoppingCart size={14} /> Ver pedidos ({pedidosVinc.length})
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Linha do tempo do processo */}
      <LinhaTempoProcesso cotacaoId={cot.id} currentStep="cotacao" />

      {/* Cabeçalho info */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 px-5 py-4 text-sm">
          <InfoBlock label="Empresa" icon={Building2}>
            {cot.empresa?.nome_fantasia ?? cot.empresa?.razao_social ?? '—'}
          </InfoBlock>
          <InfoBlock label="Comprador" icon={UserIcon}>
            {cot.comprador?.nome ?? cot.comprador?.email ?? '—'}
          </InfoBlock>
          <InfoBlock label="Criada em" icon={Calendar}>
            {formatDateTime(cot.created_at)}
          </InfoBlock>
          <InfoBlock label="Prazo de resposta" icon={Calendar}>
            {formatDate(cot.prazo_resposta)}
          </InfoBlock>
          {scsVinc.length > 0 && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">SCs vinculadas</p>
              <div className="flex flex-wrap gap-1.5">
                {scsVinc.map(s => (
                  <Link key={s.id} to={`/compras/solicitacoes/${s.id}`}
                    className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs font-mono text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100">
                    {s.numero}
                  </Link>
                ))}
              </div>
            </div>
          )}
          {cot.observacoes && (
            <div className="col-span-2 md:col-span-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Observações</p>
              <p className="text-sm whitespace-pre-wrap">{cot.observacoes}</p>
            </div>
          )}
        </div>
      </section>

      {/* Banner: cotação travada (já tem pedido aprovado/enviado/recebido) */}
      {temPedidoAprovado && (
        <div className="flex items-start gap-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Cotação travada</p>
            <p className="mt-0.5">Já existe pedido aprovado ou em andamento gerado por esta cotação. Não é mais possível alterar preços, vencedores ou fornecedores.</p>
          </div>
        </div>
      )}

      {/* Banner: tem pedidos pendentes — alterações vão regerar */}
      {pedidosPendentes.length > 0 && !temPedidoAprovado && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">{pedidosPendentes.length} pedido(s) aguardando aprovação</p>
            <p className="mt-0.5">
              Você pode adicionar fornecedores, ajustar preços e mudar vencedores. Ao clicar em
              <strong> "Regerar pedidos"</strong>, os pedidos pendentes serão cancelados e novos serão criados com as escolhas atuais.
            </p>
          </div>
        </div>
      )}

      {/* Banner: vencedores escolhidos mas ainda sem pedido gerado */}
      {cot.status === 'vencedor_escolhido' && totalGeral > 0 && pedidosVinc.length === 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Vencedores escolhidos — pronto para gerar pedidos</p>
            <p className="mt-0.5">Total estimado: <strong>{formatMoney(totalGeral)}</strong>. Clique em "Gerar pedido para aprovação" no topo.</p>
          </div>
        </div>
      )}

      {cot.motivo_reprovacao && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Orçamento reprovado anteriormente</p>
            <p className="mt-0.5">{cot.motivo_reprovacao}</p>
          </div>
        </div>
      )}

      {/* Comparativo */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3 gap-3 flex-wrap">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Comparativo de cotações
          </h2>
          <div className="flex items-center gap-3 flex-wrap">
            {totalGeral > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Total escolhido: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatMoney(totalGeral)}</span>
              </span>
            )}
            {podeEditarRespostas && (
              <Button onPress={() => setModalAdicionarForn(true)}
                className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-medium inline-flex items-center gap-1.5">
                <Plus size={12} /> Adicionar fornecedor
              </Button>
            )}
          </div>
        </div>

        {itens.length === 0 || fornecedores.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-400">
            {itens.length === 0 ? 'Sem itens.' : 'Sem fornecedores convidados.'}
          </p>
        ) : (() => {
          // Pré-calcula para destaques de coluna:
          //   - Quem tem menor total (entre os que cobriram todos os itens) → DOURADO
          //   - Quantos itens cada fornecedor venceu                        → VERDE (se for o vencedor majoritário)
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
          <div className="px-5 py-4 space-y-4">
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm border-separate border-spacing-0 table-fixed">
                <colgroup>
                  <col style={{ width: 280 }} />
                  {fornecedores.map(f => <col key={f.id} style={{ width: 240 }} />)}
                </colgroup>
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-gray-100 dark:bg-gray-800 border-b border-r border-gray-200 dark:border-gray-700 px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 align-top">
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
                        {/* Coluna: Item (sticky) */}
                        <td className="sticky left-0 bg-white dark:bg-gray-900 border-b border-r border-gray-100 dark:border-gray-800 px-3 py-3 align-top">
                          <div className="flex items-start gap-2">
                            <span className="text-[11px] font-mono text-gray-400 shrink-0 pt-0.5">#{it.linha}</span>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{it.produto?.nome}</p>
                              <p className="text-[11px] font-mono text-gray-500 mt-0.5">{it.produto?.codigo}</p>
                              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-1.5 py-0.5 text-[11px] font-semibold">
                                  {formatQty(it.quantidade)} {it.unidade_medida?.sigla ?? 'un'}
                                </span>
                                {escolha && (
                                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 font-semibold">
                                    <Crown size={10} /> {formatMoney(escolha.preco_final_unitario * Number(it.quantidade))}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Colunas: 1 por fornecedor */}
                        {fornecedores.map(f => {
                          const r = respPorFornItem[chave(f.id, it.id)]
                          const isVencedor = escolha?.cotacao_fornecedor_id === f.id
                          const isMenor = menor?.cotacao_fornecedor_id === f.id && fornecedores.length > 1
                          const ehColMelhorPreco = f.id === melhorPrecoFornId
                          const valor = valorPreco(f.id, it.id)

                          // Fundo da célula:
                          //   - Verde forte → este fornecedor é vencedor deste item
                          //   - Verde claro → não é vencedor deste, mas é vencedor de outros (col verde)
                          //   - Dourado claro → coluna do melhor preço total (e não é vencedor)
                          //   - Violeta claro → tem o menor preço unitário deste item
                          const cellCls = isVencedor
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-inset ring-emerald-400 dark:ring-emerald-700'
                            : ehColMelhorPreco
                              ? 'bg-amber-50/60 dark:bg-amber-950/20'
                              : isMenor
                                ? 'bg-violet-50/40 dark:bg-violet-950/20'
                                : ''

                          return (
                            <td key={f.id} className={`border-b border-r border-gray-100 dark:border-gray-800 px-3 py-3 align-top ${cellCls}`}>
                              {/* Linha 1: Preço unitário */}
                              <div className="h-8 flex items-center gap-1.5">
                                <span className="text-[10px] text-gray-400 shrink-0 w-3">R$</span>
                                {podeEditarRespostas ? (
                                  <input
                                    type="number" min="0" step="0.01"
                                    value={valor}
                                    onChange={e => setPrecoEdits(prev => ({ ...prev, [chave(f.id, it.id)]: e.target.value }))}
                                    onBlur={() => salvarPreco(f.id, it.id)}
                                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                                    placeholder="—"
                                    className="flex-1 min-w-0 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-right tabular-nums px-1.5 h-7 outline-none focus:border-emerald-500"
                                  />
                                ) : (
                                  <span className="flex-1 text-sm tabular-nums text-right">{r ? formatMoney(r.preco_unitario) : '—'}</span>
                                )}
                                <span className="text-[10px] text-gray-400 shrink-0 min-w-[24px] text-left">/{it.unidade_medida?.sigla ?? 'un'}</span>
                              </div>

                              {/* Linha 2: Cálculo "qty × preço = total" */}
                              <div className="h-6 flex items-center justify-between gap-2 mt-1">
                                {isMenor && !isVencedor ? (
                                  <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/40 px-1.5 py-0.5 rounded">
                                    + BARATO
                                  </span>
                                ) : <span />}
                                {r ? (
                                  <span className="text-[11px] tabular-nums text-right text-gray-600 dark:text-gray-300 truncate">
                                    {formatQty(it.quantidade)} × {formatMoney(r.preco_unitario)}{' '}
                                    <span className="font-semibold text-gray-800 dark:text-gray-100">= {formatMoney(Number(it.quantidade) * r.preco_unitario)}</span>
                                  </span>
                                ) : <span />}
                              </div>

                              {/* Linha 3: Botão escolher / vencedor */}
                              <div className="h-8 mt-1.5">
                                {podeEscolher && r ? (
                                  isVencedor ? (
                                    <button
                                      type="button"
                                      onClick={() => limparEscolha(it.id)}
                                      className="w-full h-full inline-flex items-center justify-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2 text-[11px] font-semibold transition-colors group"
                                      title="Clique para remover este vencedor"
                                    >
                                      <Crown size={12} />
                                      <span>VENCEDOR</span>
                                      <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px]">×</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => escolherVencedor(it.id, f.id)}
                                      className="w-full h-full inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:border-emerald-500 px-2 text-[11px] font-medium transition-colors"
                                    >
                                      <Crown size={12} />
                                      Escolher
                                    </button>
                                  )
                                ) : podeEscolher && !r ? (
                                  <p className="text-center text-[10px] italic text-gray-400 leading-8">sem resposta</p>
                                ) : null}
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
        })()}
      </section>

      {/* Modal: adicionar fornecedor à cotação */}
      {modalAdicionarForn && cot && (
        <ModalAdicionarFornecedor
          cotacaoId={cot.id}
          fornecedoresJaConvidados={fornecedores.map(f => f.fornecedor_id)}
          onFechar={() => setModalAdicionarForn(false)}
          onAdicionado={() => { setModalAdicionarForn(false); fetchData() }}
        />
      )}
    </div>
  )
}

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
