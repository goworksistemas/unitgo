import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, ExternalLink, Eye, Link as LinkIcon,
  Search, ShoppingBag, Truck, FileText,
} from 'lucide-react'
import { MlPedidoCompraAcoes } from '@/components/compras/MlPedidoCompraAcoes'
import { Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type {
  CmpPedido,
  MlEnvio, MlNotaFiscal, MlPedido, MlPedidoItem,
} from '@/types/database'
import { MlNfAcoes } from '@/components/compras/MlNfAcoes'
import { formatDate, formatMoney } from './_shared'

const PAGE_SIZE = 25

type MlPedidoEnriquecido = MlPedido & {
  itens?: MlPedidoItem[]
  envio?: MlEnvio | null
  notas_fiscais?: MlNotaFiscal[]
  pedido_compra?: CmpPedido | null
  credencial?: { empresa_id: string } | null
}

const STATUS_LABEL: Record<string, { label: string; badge: string; dot: string }> = {
  confirmed:           { label: 'Confirmado',          badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',         dot: 'bg-blue-500' },
  payment_required:    { label: 'Aguardando pgto',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     dot: 'bg-amber-500' },
  payment_in_process:  { label: 'Pagamento em proc.',  badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     dot: 'bg-amber-500' },
  partially_paid:      { label: 'Parc. pago',          badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',     dot: 'bg-amber-500' },
  paid:                { label: 'Pago',                badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  cancelled:           { label: 'Cancelado',           badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             dot: 'bg-red-500' },
  invalid:             { label: 'InvÃ¡lido',            badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',             dot: 'bg-red-500' },
  partially_refunded:  { label: 'Parc. reembolsado',   badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300', dot: 'bg-orange-500' },
}

const SHIP_STATUS_LABEL: Record<string, string> = {
  pending:        'Pendente',
  handling:       'Em separaÃ§Ã£o',
  ready_to_ship:  'Pronto p/ envio',
  shipped:        'Em trÃ¢nsito',
  delivered:      'Entregue',
  not_delivered:  'NÃ£o entregue',
  cancelled:      'Cancelado',
}

export function MlPedidosPage() {
  const [pedidos, setPedidos] = useState<MlPedidoEnriquecido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroVinculo, setFiltroVinculo] = useState<'todos' | 'vinculado' | 'sem_vinculo'>('todos')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(0) }, [debounced, filtroStatus, filtroVinculo])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE

    let q = supabase
      .from('ml_pedidos')
      .select(`
        *,
        itens:ml_pedidos_itens(*),
        credencial:ml_credenciais(empresa_id),
        pedido_compra:cmp_pedidos_compra!pedido_compra_id(id,numero,status)
      `, { count: 'exact' })
      .order('data_criacao', { ascending: false, nullsFirst: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtroStatus !== 'todos') q = q.eq('status', filtroStatus)
    if (filtroVinculo === 'vinculado')   q = q.not('pedido_compra_id', 'is', null)
    if (filtroVinculo === 'sem_vinculo') q = q.is('pedido_compra_id', null)

    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) {
      if (/^\d+$/.test(term)) {
        q = q.eq('ml_order_id', Number(term))
      } else {
        q = q.ilike('vendedor_nickname', `%${term}%`)
      }
    }

    const { data, count, error } = await q
    if (error) {
      console.error('[MlPedidosPage]', error)
      toast.error(`Erro ao carregar pedidos ML: ${error.message}`)
      setPedidos([])
      setTotal(0)
      setLoading(false)
      return
    }

    const pedidosBase = (data ?? []) as unknown as MlPedidoEnriquecido[]

    const shipIds = [...new Set(pedidosBase.map(p => p.ml_shipment_id).filter(Boolean))] as number[]
    const packIds = [...new Set(
      pedidosBase.map(p => p.ml_pack_id ?? p.ml_order_id).filter(Boolean),
    )] as number[]

    const [enviosR, nfsR] = await Promise.all([
      shipIds.length > 0
        ? supabase.from('ml_envios').select('*').in('ml_shipment_id', shipIds)
        : Promise.resolve({ data: [] as MlEnvio[], error: null }),
      packIds.length > 0
        ? supabase.from('ml_notas_fiscais').select('*').in('ml_pack_id', packIds)
        : Promise.resolve({ data: [] as MlNotaFiscal[], error: null }),
    ])

    const envMap = new Map<number, MlEnvio>()
    ;(enviosR.data ?? []).forEach(e => envMap.set(e.ml_shipment_id, e as MlEnvio))

    const nfByPack = new Map<number, MlNotaFiscal[]>()
    ;(nfsR.data ?? []).forEach(nf => {
      const list = nfByPack.get(nf.ml_pack_id) ?? []
      list.push(nf as MlNotaFiscal)
      nfByPack.set(nf.ml_pack_id, list)
    })

    pedidosBase.forEach(p => {
      if (p.ml_shipment_id) p.envio = envMap.get(p.ml_shipment_id) ?? undefined
      const pk = p.ml_pack_id ?? p.ml_order_id
      p.notas_fiscais = pk ? (nfByPack.get(pk) ?? []) : []
      // TÃ­tulo do item: fallback no raw_json do pedido se sync nÃ£o preencheu
      if (p.itens?.length) {
        const raw = p.raw_json as { order_items?: Array<{ item?: { title?: string } }> }
        p.itens = p.itens.map((it, i) => {
          if (it.titulo) return it
          const titulo =
            raw?.order_items?.[i]?.item?.title ??
            (raw?.order_items?.find(oi => String(oi.item?.title) !== '')?.item?.title)
          return titulo ? { ...it, titulo } : it
        })
      }
    })

    setPedidos(pedidosBase)
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filtroStatus, filtroVinculo, debounced])

  useEffect(() => { fetchData() }, [fetchData])

  const statusOptions = useMemo(() => {
    const set = new Set<string>(['todos'])
    pedidos.forEach(p => p.status && set.add(p.status))
    return Array.from(set)
  }, [pedidos])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pedidos Mercado Livre</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Compras importadas das contas conectadas. Vincule manualmente a um pedido de compra para juntar os histÃ³ricos.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="px-5 py-3">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="search"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por ml_order_id ou vendedorâ€¦"
                className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
            <select
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos status</option>
              {statusOptions.filter(s => s !== 'todos').map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]?.label ?? s}</option>
              ))}
            </select>
            <select
              value={filtroVinculo}
              onChange={e => setFiltroVinculo(e.target.value as 'todos' | 'vinculado' | 'sem_vinculo')}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            >
              <option value="todos">Todos</option>
              <option value="vinculado">Vinculados</option>
              <option value="sem_vinculo">Sem vÃ­nculo</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : pedidos.length === 0 ? (
            <div className="py-16 text-center">
              <ShoppingBag size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Nenhum pedido encontrado.
              </p>
              <p className="mt-1 text-xs text-gray-400">
                Sincronize uma conta em <span className="font-mono">/cadastros/mercado-livre</span> primeiro.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {pedidos.map(p => {
                const meta = p.status ? STATUS_LABEL[p.status] : null
                const envMeta = p.envio?.status ? SHIP_STATUS_LABEL[p.envio.status] : null
                const item0 = p.itens?.[0]
                const itensCount = p.itens?.length ?? 0
                return (
                  <li key={p.id} className="px-5 py-4">
                    <div className="flex items-start gap-3 flex-wrap">
                      {item0?.thumbnail ? (
                        <img
                          src={item0.thumbnail}
                          alt=""
                          className="h-14 w-14 rounded-lg object-cover bg-gray-100 dark:bg-gray-800 shrink-0"
                        />
                      ) : (
                        <div className="h-14 w-14 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                          <ShoppingBag size={18} className="text-gray-400" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/compras/mercado-livre/${p.id}`}
                            className="font-mono text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:underline"
                          >
                            #{p.ml_order_id}
                          </Link>
                          {meta && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                              {meta.label}
                            </span>
                          )}
                          {envMeta && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[11px] font-semibold">
                              <Truck size={10} /> {envMeta}
                            </span>
                          )}
                          {p.pedido_compra && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-semibold">
                              <LinkIcon size={10} /> Vinculado a {p.pedido_compra.numero}
                            </span>
                          )}
                          {p.notas_fiscais && p.notas_fiscais.length > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 px-2 py-0.5 text-[11px] font-semibold">
                              <FileText size={10} /> {p.notas_fiscais.length} NF
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                          {item0?.titulo ?? '(sem tÃ­tulo)'}{itensCount > 1 ? ` + ${itensCount - 1} item(ns)` : ''}
                        </p>
                        <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                          {p.data_criacao && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar size={11} /> {formatDate(p.data_criacao)}
                            </span>
                          )}
                          {p.vendedor_nickname && (
                            <span className="inline-flex items-center gap-1">
                              <ShoppingBag size={11} /> {p.vendedor_nickname}
                            </span>
                          )}
                          {p.envio?.tracking_number && (
                            <span className="inline-flex items-center gap-1">
                              <Truck size={11} />
                              <span className="font-mono">{p.envio.tracking_number}</span>
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 min-w-[110px]">
                        <p className="text-sm font-semibold tabular-nums text-gray-800 dark:text-gray-100">
                          {p.moeda === 'BRL' ? formatMoney(p.total ?? 0) : `${p.total ?? 0} ${p.moeda ?? ''}`}
                        </p>
                        <a
                          href={`https://www.mercadolivre.com.br/gz/home#order/${p.ml_order_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline"
                        >
                          <ExternalLink size={11} /> Ver no ML
                        </a>
                      </div>
                    </div>

                    {/* Linha de aÃ§Ãµes + NFs */}
                    <span className="mt-3 flex items-center gap-2 flex-wrap">
                      <Link
                        to={`/compras/mercado-livre/${p.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2.5 py-1 text-xs font-medium"
                      >
                        <Eye size={11} /> Detalhes e NF
                      </Link>

                      {p.credencial?.empresa_id && (
                        <MlPedidoCompraAcoes
                          mlPedidoId={p.id}
                          mlOrderId={p.ml_order_id}
                          empresaId={p.credencial.empresa_id}
                          pedidoCompra={p.pedido_compra ? { id: p.pedido_compra.id, numero: p.pedido_compra.numero } : null}
                          vendedorNickname={p.vendedor_nickname}
                          itens={p.itens}
                          total={p.total}
                          onChanged={fetchData}
                          compact
                        />
                      )}

                      {p.notas_fiscais?.map(nf => (
                        <MlNfAcoes key={nf.id} nf={nf} compact />
                      ))}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {!loading && total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {total} pedido{total !== 1 ? 's' : ''} Â· pÃ¡gina {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              PrÃ³xima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
