import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Search, ShoppingCart, Calendar, Building2, Truck,
} from 'lucide-react'
import { Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import type {
  CmpCotacaoStatus, CmpFornecedor, CmpPedido, CmpPedidoStatus, CoreEmpresa,
} from '@/types/database'
import { formatDate, formatMoney } from './_shared'
import { ETAPAS_PEDIDO_FLUXO, metaCotacao, metaPedido, resumoEtapaPedido } from './_fluxoEtapas'
import { StatusBadge } from './_StatusBadge'
import { LinhaExpansivel } from './_LinhaExpansivel'
import { PainelPedido } from './_PainelPedido'
import { AcoesAprovacaoPedido } from './_AcoesAprovacaoLista'
import { FaixaEtapasToolbar } from './_FaixaEtapasToolbar'
import { useContagensEtapas } from './_useContagensEtapas'

const PAGE_SIZE = 25
const STATUS_FLUXO = ETAPAS_PEDIDO_FLUXO.map(e => e.key)

type ProfileMini = { id: string; nome: string | null; email: string }

type PedidoEnriquecido = CmpPedido & {
  empresa?: CoreEmpresa
  fornecedor?: CmpFornecedor
  cotacao?: { id: string; numero: string; status: CmpCotacaoStatus } | null
  comprador?: ProfileMini
  aprovador?: ProfileMini
  total_estimado?: number
}

export function PedidosPage() {
  const [pedidos, setPedidos] = useState<PedidoEnriquecido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filtro, setFiltro] = useState<CmpPedidoStatus | 'todos'>('todos')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const { contagens, recarregarContagens } = useContagensEtapas(
    'cmp_pedidos_compra',
    STATUS_FLUXO,
  )

  const toggleAberto = (id: string) => setAbertos(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(0) }, [debounced, filtro])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    let q = supabase.from('cmp_pedidos_compra').select(`
      *,
      empresa:core_empresas(id,razao_social,nome_fantasia),
      fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia),
      cotacao:cmp_cotacoes(id,numero,status),
      comprador:profiles!cmp_pedidos_compra_comprador_id_fkey(id,nome,email),
      aprovador:profiles!cmp_pedidos_compra_aprovador_id_fkey(id,nome,email)
    `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todos') q = q.eq('status', filtro)
    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) q = q.or(`numero.ilike.%${term}%`)

    const { data, count } = await q
    const pedidosBase = (data ?? []) as unknown as PedidoEnriquecido[]

    if (pedidosBase.length > 0) {
      const ids = pedidosBase.map(p => p.id)
      const { data: itensTotais } = await supabase
        .from('cmp_pedidos_compra_itens')
        .select('pedido_id, quantidade, preco_unitario')
        .in('pedido_id', ids)
      const totais: Record<string, number> = {}
      itensTotais?.forEach(it => {
        totais[it.pedido_id] = (totais[it.pedido_id] ?? 0) + Number(it.quantidade) * Number(it.preco_unitario)
      })
      pedidosBase.forEach(p => { p.total_estimado = totais[p.id] ?? 0 })
    }

    setPedidos(pedidosBase)
    setTotal(count ?? 0)
    setLoading(false)
    recarregarContagens()
  }, [page, filtro, debounced, recarregarContagens])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pedidos de Compra</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Fluxo: aprovar → comprar com fornecedor → receber mercadoria.
        </p>
      </div>

      <FaixaEtapasToolbar
        etapas={ETAPAS_PEDIDO_FLUXO}
        filtroAtivo={filtro}
        onFiltro={k => setFiltro(k as typeof filtro)}
        contagens={contagens}
        meta={metaPedido}
        chaveTodas="todos"
      />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número…"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingCart size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {debounced ? 'Nenhum pedido encontrado.' : 'Nenhum pedido ainda. Aprove uma cotação para gerar.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {pedidos.map(p => {
                const meta = metaPedido(p.status)
                const cotMeta = p.cotacao ? metaCotacao(p.cotacao.status) : null
                const resumo = resumoEtapaPedido(p.status)
                const aberto = abertos.has(p.id)
                return (
                  <LinhaExpansivel
                    key={p.id}
                    aberto={aberto}
                    onToggle={() => toggleAberto(p.id)}
                    cabecalho={
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                          <ShoppingCart size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/compras/pedidos/${p.id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-sm font-mono font-semibold text-indigo-700 dark:text-indigo-300 hover:underline"
                              title="Abrir pedido"
                            >
                              {p.numero}
                            </Link>
                            <StatusBadge meta={meta} size="md" />
                            {cotMeta && p.cotacao && (
                              <Link
                                to={`/compras/cotacoes/${p.cotacao.id}`}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 rounded-full border border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/40 px-2 py-0.5 text-[10px] font-medium text-violet-800 dark:text-violet-200 hover:bg-violet-100"
                                title={`Cotação: ${p.cotacao.numero}`}
                              >
                                {p.cotacao.numero}
                              </Link>
                            )}
                          </div>
                          {resumo && (
                            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">{resumo}</p>
                          )}
                          <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1"><Truck size={11} />
                              {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? '—'}
                            </span>
                            <span className="inline-flex items-center gap-1"><Building2 size={11} />
                              {p.empresa?.nome_fantasia ?? p.empresa?.razao_social ?? '—'}
                            </span>
                            <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDate(p.created_at)}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                            {formatMoney(p.total_estimado)}
                          </p>
                        </div>
                      </>
                    }
                    painel={aberto ? <PainelPedido pedidoId={p.id} /> : null}
                    acoes={
                      <AcoesAprovacaoPedido
                        pedido={{ id: p.id, numero: p.numero, status: p.status, aprovador_id: p.aprovador_id }}
                        onAtualizado={fetchData}
                      />
                    }
                  />
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {total} pedido{total !== 1 ? 's' : ''} · página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Anterior
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
