import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, FileSearch, ShoppingCart, Receipt, ExternalLink, Truck, Crown,
  Calendar, AlertCircle,
} from 'lucide-react'
import {
  COTACAO_STATUS_META, PEDIDO_STATUS_META,
  formatDateTime, formatMoney, formatQty,
} from './_shared'
import { metaItem, resumoEtapaItem } from './_fluxoEtapas'
import { rpcCompras } from './_rpc'
import { VinculosBar, gruposVinculosSC } from './_VinculosProcesso'
import type { CmpItemStatus } from '@/types/database'

// ── Tipos do payload da RPC `cmp_painel_solicitacao` ──
type ItemSC = {
  id: string; linha: number; quantidade: number; preco_estimado: number | null
  status_item: CmpItemStatus
  produto?: { id: string; codigo: string; nome: string } | null
  unidade_medida?: { id: string; sigla: string } | null
}
type CotacaoMin = {
  id: string; numero: string; titulo: string
  status: 'aberta' | 'respondida' | 'vencedor_escolhido' | 'encerrada' | 'cancelada'
  itens_count?: number
  fornecedores_count?: number
  total_escolhido?: number
}
type PedidoMin = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovado' | 'enviado' | 'parcialmente_recebido' | 'recebido' | 'cancelado'
  cotacao_id: string | null
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  total: number
  qtd_total: number
  qtd_recebida: number
  itens_resumo?: Array<{
    linha?: number; nome: string; codigo?: string | null
    quantidade?: number; unidade?: string | null
    preco_unitario?: number; total?: number; quantidade_recebida?: number
  }>
}
type RecebimentoMin = {
  id: string; numero: string; pedido_id: string
  data_recebimento: string; observacoes: string | null
  pedido_numero?: string
}

interface RpcPainelSC {
  sc: unknown
  itens: ItemSC[]
  cotacoes: CotacaoMin[]
  pedidos: PedidoMin[]
  recebimentos: RecebimentoMin[]
}

export function PainelSolicitacao({ scId }: { scId: string }) {
  const [itens, setItens] = useState<ItemSC[]>([])
  const [cotacoes, setCotacoes] = useState<CotacaoMin[]>([])
  const [pedidos, setPedidos] = useState<PedidoMin[]>([])
  const [recebimentos, setRecebimentos] = useState<RecebimentoMin[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      setErro(null)
      try {
        const { data, error } = await rpcCompras<RpcPainelSC>('cmp_painel_solicitacao', { p_id: scId })
        if (error) throw new Error(error.message)
        if (cancel) return
        const p = data ?? ({} as RpcPainelSC)
        setItens(p.itens ?? [])
        setCotacoes(p.cotacoes ?? [])
        setPedidos(p.pedidos ?? [])
        setRecebimentos(p.recebimentos ?? [])
      } catch (e) {
        console.error('[PainelSolicitacao] cmp_painel_solicitacao:', e)
        if (!cancel) setErro(e instanceof Error ? e.message : 'Erro inesperado')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    carregar()
    return () => { cancel = true }
  }, [scId])

  const gruposVinc = useMemo(
    () => gruposVinculosSC({ cotacoes, pedidos, recebimentos }),
    [cotacoes, pedidos, recebimentos],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-start gap-2 px-4 py-4 text-xs text-red-700 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Erro ao carregar painel da solicitação</p>
          <p className="mt-0.5 font-mono">{erro}</p>
        </div>
      </div>
    )
  }

  const totalEstimado = itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_estimado ?? 0), 0)

  return (
    <div className="space-y-3">
      <VinculosBar grupos={gruposVinc} />
      {/* Itens */}
      <Bloco titulo={`Itens (${itens.length})`} icone={<Package size={13} />}
        meta={totalEstimado > 0 ? `Total estimado: ${formatMoney(totalEstimado)}` : undefined}>
        {itens.length === 0 ? (
          <p className="px-4 py-4 text-xs text-gray-400">Sem itens.</p>
        ) : (
          <table className="w-full text-xs">
            <thead className="bg-gray-50/60 dark:bg-gray-800/40 text-[10px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-right">Qtd.</th>
                <th className="px-3 py-2 text-left">UoM</th>
                <th className="px-3 py-2 text-right">Preço estim.</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(it => {
                const stMeta = metaItem(it.status_item)
                const total = Number(it.quantidade) * Number(it.preco_estimado ?? 0)
                return (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-mono text-gray-400">{it.linha}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{it.produto?.nome ?? '—'}</p>
                      <p className="text-[10px] font-mono text-gray-500">{it.produto?.codigo ?? ''}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQty(it.quantidade)}</td>
                    <td className="px-3 py-2 text-gray-500">{it.unidade_medida?.sigla ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-gray-600">{formatMoney(it.preco_estimado)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{it.preco_estimado != null ? formatMoney(total) : '—'}</td>
                    <td className="px-3 py-2">
                      <span
                        title={resumoEtapaItem(it.status_item) ?? undefined}
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${stMeta.badge}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${stMeta.dot}`} />
                        {stMeta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Bloco>

      {/* Cotações */}
      {cotacoes.length > 0 && (
        <Bloco titulo={`Cotações vinculadas (${cotacoes.length})`} icone={<FileSearch size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {cotacoes.map(c => {
              const meta = COTACAO_STATUS_META[c.status]
              return (
                <li key={c.id}>
                  <Link
                    to={`/compras/cotacoes/${c.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50/40 dark:hover:bg-violet-950/20"
                  >
                    <FileSearch size={13} className="text-violet-600 dark:text-violet-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{c.numero}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate mt-0.5">
                        {c.titulo} · {c.itens_count} item(s)
                        {(c.total_escolhido ?? 0) > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                            <Crown size={9} /> {formatMoney(c.total_escolhido)}
                          </span>
                        )}
                      </p>
                    </div>
                    <ExternalLink size={11} className="text-gray-400 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Bloco>
      )}

      {/* Pedidos */}
      {pedidos.length > 0 && (
        <Bloco titulo={`Pedidos (${pedidos.length})`} icone={<ShoppingCart size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pedidos.map(p => {
              const meta = PEDIDO_STATUS_META[p.status]
              const progresso = p.qtd_total > 0 ? (p.qtd_recebida / p.qtd_total) * 100 : 0
              return (
                <li key={p.id}>
                  <Link
                    to={`/compras/pedidos/${p.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
                  >
                    <ShoppingCart size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{p.numero}</span>
                        <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                          {meta.label}
                        </span>
                        {!p.cotacao_id && <span className="text-[10px] text-gray-400 italic">(direto)</span>}
                      </div>
                      <p className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-1">
                        <Truck size={10} /> {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? '—'}
                        {progresso > 0 && <span className="ml-2 text-emerald-700 dark:text-emerald-400">· {progresso.toFixed(0)}% recebido</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatMoney(p.total)}</p>
                    </div>
                    <ExternalLink size={11} className="text-gray-400 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Bloco>
      )}

      {/* Recebimentos */}
      {recebimentos.length > 0 && (
        <Bloco titulo={`Recebimentos (${recebimentos.length})`} icone={<Receipt size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recebimentos.map(r => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Receipt size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono font-semibold">{r.numero}</span>
                    <span className="text-[10px] text-gray-500">do {r.pedido_numero}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">
                    <Calendar size={9} className="inline mr-1" />
                    {formatDateTime(r.data_recebimento)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {/* Vazio */}
      {itens.length === 0 && cotacoes.length === 0 && pedidos.length === 0 && recebimentos.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-6 text-xs text-gray-400">
          <AlertCircle size={13} /> Sem dados vinculados ainda.
        </div>
      )}
    </div>
  )
}

function Bloco({ titulo, icone, meta, children }: {
  titulo: string
  icone: React.ReactNode
  meta?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-4 py-2 bg-gray-50/40 dark:bg-gray-800/40">
        <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-400">
          {icone} {titulo}
        </h3>
        {meta && <span className="text-[11px] text-gray-500">{meta}</span>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </section>
  )
}
