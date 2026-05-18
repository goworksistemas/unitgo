import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Search, ShoppingCart, ChevronRight, Calendar, Building2, Truck, Send,
} from 'lucide-react'
import { Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpFornecedor, CmpPedido, CmpPedidoStatus, CoreEmpresa } from '@/types/database'
import { PEDIDO_STATUS_META, formatDate, formatMoney } from './_shared'
import { Bandeja, BandejaItem } from './_bandejas'

const PAGE_SIZE = 25

const FILTROS: { key: CmpPedidoStatus | 'todos'; label: string }[] = [
  { key: 'todos',                 label: 'Todos' },
  { key: 'aguardando_aprovacao',  label: 'Aguardando' },
  { key: 'aprovado',              label: 'Aprovado' },
  { key: 'enviado',               label: 'Enviado' },
  { key: 'parcialmente_recebido', label: 'Parcial' },
  { key: 'recebido',              label: 'Recebido' },
  { key: 'cancelado',             label: 'Cancelado' },
]

type PedidoEnriquecido = CmpPedido & {
  empresa?: CoreEmpresa
  fornecedor?: CmpFornecedor
  total_estimado?: number
}

export function PedidosPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const podeMarcarEnviado = profile?.role === 'admin' || profile?.role === 'comprador'

  const [pedidos, setPedidos] = useState<PedidoEnriquecido[]>([])
  const [pendentesEnvio, setPendentesEnvio] = useState<PedidoEnriquecido[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filtro, setFiltro] = useState<typeof FILTROS[number]['key']>('todos')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(0) }, [debounced, filtro])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    let q = supabase.from('cmp_pedidos_compra').select(`
      *,
      empresa:core_empresas(id,razao_social,nome_fantasia),
      fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)
    `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todos') q = q.eq('status', filtro)
    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) q = q.or(`numero.ilike.%${term}%`)

    const { data, count } = await q
 l    const pedidosBase = (data ?? []) as unknown as PedidoEnriquecido[]

    // Pega totais via agregação simples (em memória — economiza viagens)
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

    // Bandeja: pedidos aprovados aguardando envio ao fornecedor
    const { data: pendData } = await supabase
      .from('cmp_pedidos_compra')
      .select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia),
        fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)
      `)
      .eq('status', 'aprovado')
      .is('enviado_em', null)
      .order('created_at', { ascending: false })

    setPendentesEnvio((pendData ?? []) as unknown as PedidoEnriquecido[])
    setLoading(false)
  }, [page, filtro, debounced])

  async function marcarEnviado(pedidoId: string) {
    await supabase.from('cmp_pedidos_compra').update({
      status: 'enviado',
      enviado_em: new Date().toISOString(),
    }).eq('id', pedidoId)
    toast.success('Pedido marcado como enviado')
    fetchData()
  }

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Pedidos de Compra</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Pedidos formais ao fornecedor — gerados a partir de cotações aprovadas.
        </p>
      </div>

      {/* Bandeja: pedidos aprovados aguardando envio */}
      <Bandeja
        icone={<Send size={15} />}
        titulo="Pedidos aprovados aguardando envio ao fornecedor"
        descricao="Marque como enviado quando confirmar o envio (e-mail, WhatsApp, etc)."
        total={pendentesEnvio.length}
        accent="amber"
      >
        {pendentesEnvio.slice(0, 5).map(p => (
          <BandejaItem
            key={p.id}
            onClick={() => navigate(`/compras/pedidos/${p.id}`)}
            titulo={
              <>
                <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{p.numero}</span>
                <span className="text-sm text-gray-700 dark:text-gray-200">
                  · {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social}
                </span>
              </>
            }
            subtitulo={p.empresa?.nome_fantasia ?? p.empresa?.razao_social ?? ''}
            meta={formatDate(p.created_at)}
            action={podeMarcarEnviado ? (
              <button
                onClick={e => { e.stopPropagation(); e.preventDefault(); marcarEnviado(p.id) }}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 text-xs font-medium"
              >
                <Send size={11} /> Enviar
              </button>
            ) : undefined}
          />
        ))}
        {pendentesEnvio.length > 5 && (
          <li className="px-5 py-2 text-xs text-center text-gray-500 dark:text-gray-400">
            E mais {pendentesEnvio.length - 5} pedido(s)…
          </li>
        )}
      </Bandeja>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número…"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" />
        </div>
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto text-sm">
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                filtro === f.key ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
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
                const meta = PEDIDO_STATUS_META[p.status]
                return (
                  <li key={p.id}>
                    <Link to={`/compras/pedidos/${p.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                        <ShoppingCart size={16} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{p.numero}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
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
                      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    </Link>
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
