import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, FileSearch, ShoppingCart, Receipt, ExternalLink, Truck, Crown,
  Calendar, AlertCircle,
} from 'lucide-react'
import {
  COTACAO_STATUS_META, PEDIDO_STATUS_META,
  formatDateTime, formatMoney, formatQty,
} from './_shared'
import { toneCotacao, tonePedido } from './_fluxoEtapas'
import { rpcCompras } from './_rpc'
import { Section } from '@/components/ui/Section'
import { StatusDot } from '@/components/ui/StatusDot'
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Coluna 1: Itens */}
      <Section
        title={
          <span className="inline-flex items-center gap-1.5">
            <Package size={11} /> Itens · {itens.length}
            {totalEstimado > 0 && <span className="text-gray-400 normal-case font-normal">· {formatMoney(totalEstimado)}</span>}
          </span>
        }
      >
        {itens.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Sem itens.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {itens.map(it => {
              const total = Number(it.quantidade) * Number(it.preco_estimado ?? 0)
              return (
                <li key={it.id} className="py-1.5">
                  <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-mono text-gray-400 shrink-0">#{it.linha}</span>
                        <p className="text-[12px] font-medium text-gray-800 dark:text-gray-200 truncate">{it.produto?.nome ?? '—'}</p>
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-gray-500">
                        <span className="font-mono">{it.produto?.codigo}</span>
                        <span className="tabular-nums">{formatQty(it.quantidade)} {it.unidade_medida?.sigla ?? ''}</span>
                        {it.preco_estimado != null && (
                          <span className="tabular-nums">· {formatMoney(total)}</span>
                        )}
                      </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* Coluna 2: Cotações */}
      <Section
        title={
          <span className="inline-flex items-center gap-1.5">
            <FileSearch size={11} /> Cotações · {cotacoes.length}
          </span>
        }
      >
        {cotacoes.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Sem cotações.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {cotacoes.map(c => {
              const meta = COTACAO_STATUS_META[c.status]
              return (
                <li key={c.id} className="py-1.5">
                  <Link to={`/compras/cotacoes/${c.id}`} onClick={e => e.stopPropagation()}
                    className="group flex items-center gap-2 hover:opacity-80">
                    <FileSearch size={11} className="text-violet-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-semibold text-violet-700 dark:text-violet-300 truncate">{c.numero}</span>
                        <StatusDot tone={toneCotacao(c.status)} label={meta.label} />
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        {c.titulo}
                        {(c.total_escolhido ?? 0) > 0 && (
                          <span className="ml-1 inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-400">
                            · <Crown size={8} /> {formatMoney(c.total_escolhido)}
                          </span>
                        )}
                      </p>
                    </div>
                    <ExternalLink size={10} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* Coluna 3: Pedidos */}
      <Section
        title={
          <span className="inline-flex items-center gap-1.5">
            <ShoppingCart size={11} /> Pedidos · {pedidos.length}
          </span>
        }
      >
        {pedidos.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Sem pedidos.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {pedidos.map(p => {
              const meta = PEDIDO_STATUS_META[p.status]
              const progresso = p.qtd_total > 0 ? (p.qtd_recebida / p.qtd_total) * 100 : 0
              return (
                <li key={p.id} className="py-1.5">
                  <Link to={`/compras/pedidos/${p.id}`} onClick={e => e.stopPropagation()}
                    className="group flex items-center gap-2 hover:opacity-80">
                    <ShoppingCart size={11} className="text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] font-mono font-semibold text-indigo-700 dark:text-indigo-300 truncate">{p.numero}</span>
                        <StatusDot tone={tonePedido(p.status)} label={meta.label} />
                        {!p.cotacao_id && <span className="text-[9px] text-gray-400 italic">direto</span>}
                      </div>
                      <p className="text-[10px] text-gray-500 truncate inline-flex items-center gap-1">
                        <Truck size={9} /> {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? '—'}
                        <span className="text-gray-400">·</span>
                        <span className="tabular-nums font-semibold">{formatMoney(p.total)}</span>
                        {progresso > 0 && <span className="text-emerald-700 dark:text-emerald-400">· {progresso.toFixed(0)}%</span>}
                      </p>
                    </div>
                    <ExternalLink size={10} className="text-gray-300 group-hover:text-gray-500 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </Section>

      {/* Coluna 4: Recebimentos */}
      <Section
        title={
          <span className="inline-flex items-center gap-1.5">
            <Receipt size={11} /> Recebimentos · {recebimentos.length}
          </span>
        }
      >
        {recebimentos.length === 0 ? (
          <p className="text-xs text-gray-400 py-2">Sem recebimentos.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800/60">
            {recebimentos.map(r => (
              <li key={r.id} className="py-1.5 flex items-center gap-2">
                <Receipt size={11} className="text-emerald-500 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-mono font-semibold">{r.numero}</span>
                    <span className="text-[10px] text-gray-400">{r.pedido_numero}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 inline-flex items-center gap-1">
                    <Calendar size={9} /> {formatDateTime(r.data_recebimento)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {itens.length === 0 && cotacoes.length === 0 && pedidos.length === 0 && recebimentos.length === 0 && (
        <div className="col-span-full flex items-center gap-2 px-4 py-6 text-xs text-gray-400">
          <AlertCircle size={13} /> Sem dados vinculados ainda.
        </div>
      )}
    </div>
  )
}
