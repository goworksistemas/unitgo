import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Search, Receipt, ChevronRight, Calendar, User as UserIcon, ShoppingCart, FileBadge, Truck } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpFornecedor, CmpNotaFiscal, CmpPedido, CmpRecebimento, Profile } from '@/types/database'
import { formatDateTime, PEDIDO_STATUS_META } from './_shared'
import { Bandeja, BandejaItem } from './_bandejas'

type RecebimentoFull = CmpRecebimento & {
  pedido?: Pick<CmpPedido, 'id' | 'numero'>
  recebedor?: Profile
  nf?: Pick<CmpNotaFiscal, 'id' | 'numero' | 'serie'>
}

type PedidoPendenteRec = CmpPedido & {
  fornecedor?: CmpFornecedor
  total_pendente?: number
}

export function RecebimentosPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const podeCriar = profile?.role === 'admin' || profile?.role === 'comprador'

  const [recebimentos, setRecebimentos] = useState<RecebimentoFull[]>([])
  const [pendentes, setPendentes] = useState<PedidoPendenteRec[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('cmp_recebimentos').select(`
      *,
      pedido:cmp_pedidos_compra(id,numero),
      recebedor:profiles!cmp_recebimentos_recebedor_id_fkey(id,nome,email),
      nf:cmp_notas_fiscais(id,numero,serie)
    `).order('data_recebimento', { ascending: false })

    const term = search.trim().replace(/[,()%]/g, ' ')
    if (term) q = q.or(`numero.ilike.%${term}%`)

    const { data } = await q
    setRecebimentos((data ?? []) as RecebimentoFull[])

    // Bandeja: pedidos enviados aguardando recebimento (ou parcialmente recebidos)
    const { data: pendData } = await supabase
      .from('cmp_pedidos_compra')
      .select('*, fornecedor:cmp_fornecedores(*)')
      .in('status', ['enviado', 'parcialmente_recebido'])
      .order('created_at', { ascending: false })

    setPendentes((pendData ?? []) as PedidoPendenteRec[])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Recebimentos</h1>
          <p className="mt-1 text-sm text-gray-500">Registro de entregas físicas e conferência com NF.</p>
        </div>
        {podeCriar && (
          <Button onPress={() => window.location.href = '/compras/recebimentos/novo'}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
            <Plus size={14} /> Novo recebimento
          </Button>
        )}
      </div>

      {/* Bandeja: pedidos enviados aguardando recebimento */}
      <Bandeja
        icone={<Truck size={15} />}
        titulo="Pedidos aguardando recebimento"
        descricao="Pedidos enviados ao fornecedor que ainda não foram recebidos (ou foram parcialmente)."
        total={pendentes.length}
        accent="violet"
      >
        {pendentes.slice(0, 5).map(p => {
          const meta = PEDIDO_STATUS_META[p.status]
          return (
            <BandejaItem
              key={p.id}
              onClick={() => navigate(`/compras/recebimentos/novo?pedido=${p.id}`)}
              titulo={
                <>
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{p.numero}</span>
                  <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                    {meta.label}
                  </span>
                </>
              }
              subtitulo={p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? ''}
              meta={p.enviado_em ? `enviado ${formatDateTime(p.enviado_em)}` : ''}
              action={
                <button
                  onClick={e => { e.stopPropagation(); e.preventDefault(); navigate(`/compras/recebimentos/novo?pedido=${p.id}`) }}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 text-xs font-medium"
                >
                  <Receipt size={11} /> Receber
                </button>
              }
            />
          )
        })}
        {pendentes.length > 5 && (
          <li className="px-5 py-2 text-xs text-center text-gray-500 dark:text-gray-400">
            E mais {pendentes.length - 5} pedido(s)…
          </li>
        )}
      </Bandeja>

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
          ) : recebimentos.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400">Nenhum recebimento ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {recebimentos.map(r => (
                <li key={r.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <Receipt size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-mono font-semibold">{r.numero}</span>
                      {r.nf && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-950/40 px-2 py-0.5 text-[10px] font-semibold text-blue-700 dark:text-blue-300">
                          <FileBadge size={10} /> NF {r.nf.numero}{r.nf.serie ? `/${r.nf.serie}` : ''}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-gray-500">
                      <Link to={`/compras/pedidos/${r.pedido?.id}`} className="inline-flex items-center gap-1 hover:text-emerald-600">
                        <ShoppingCart size={11} />{r.pedido?.numero ?? '—'}
                      </Link>
                      <span className="inline-flex items-center gap-1"><UserIcon size={11} />{r.recebedor?.nome ?? r.recebedor?.email}</span>
                      <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDateTime(r.data_recebimento)}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
