import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, Truck, ShoppingCart, ExternalLink, Crown, AlertCircle, Package,
} from 'lucide-react'
import type {
  CmpCotacaoEscolha, CmpCotacaoFornecedorStatus,
} from '@/types/database'
import {
  PEDIDO_STATUS_META, STATUS_META,
  formatMoney, formatQty,
} from './_shared'
import { rpcCompras } from './_rpc'
import { VinculosBar, gruposVinculosCotacao } from './_VinculosProcesso'

// ── Tipos do payload da RPC `cmp_painel_cotacao` ──
type ItemCot = {
  id: string; linha: number; quantidade: number; observacao: string | null
  produto?: { id: string; codigo: string; nome: string } | null
  unidade_medida?: { id: string; sigla: string } | null
}
type FornCot = {
  id: string; status_convite: CmpCotacaoFornecedorStatus
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null
}
type SCMin = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'cancelada' | 'atendida'
}
type PedMin = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovado' | 'enviado' | 'parcialmente_recebido' | 'recebido' | 'cancelado'
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  total?: number
  qtd_total?: number
  qtd_recebida?: number
  itens_resumo?: Array<{
    linha?: number; nome: string; codigo?: string | null
    quantidade?: number; unidade?: string | null
    preco_unitario?: number; total?: number; quantidade_recebida?: number
  }>
}

interface RpcPainelCot {
  cotacao: unknown
  itens: ItemCot[]
  fornecedores: FornCot[]
  escolhas: CmpCotacaoEscolha[]
  scs_vinculadas: SCMin[]
  pedidos: PedMin[]
}

export function PainelCotacao({ cotId }: { cotId: string }) {
  const [scs, setScs] = useState<SCMin[]>([])
  const [itens, setItens] = useState<ItemCot[]>([])
  const [fornecedores, setFornecedores] = useState<FornCot[]>([])
  const [escolhas, setEscolhas] = useState<CmpCotacaoEscolha[]>([])
  const [pedidos, setPedidos] = useState<PedMin[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      setErro(null)
      try {
        const { data, error } = await rpcCompras<RpcPainelCot>('cmp_painel_cotacao', { p_id: cotId })
        if (error) throw new Error(error.message)
        if (cancel) return
        const p = data ?? ({} as RpcPainelCot)
        setScs(p.scs_vinculadas ?? [])
        setItens(p.itens ?? [])
        setFornecedores(p.fornecedores ?? [])
        setEscolhas(p.escolhas ?? [])
        setPedidos(p.pedidos ?? [])
      } catch (e) {
        console.error('[PainelCotacao] cmp_painel_cotacao:', e)
        if (!cancel) setErro(e instanceof Error ? e.message : 'Erro inesperado')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    carregar()
    return () => { cancel = true }
  }, [cotId])

  const gruposVinc = useMemo(
    () => gruposVinculosCotacao({ scs, pedidos }),
    [scs, pedidos],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-start gap-2 px-4 py-4 text-xs text-red-700 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Erro ao carregar painel da cotação</p>
          <p className="mt-0.5 font-mono">{erro}</p>
        </div>
      </div>
    )
  }

  const totalEscolhido = escolhas.reduce((s, e) => {
    const it = itens.find(i => i.id === e.cotacao_item_id)
    return s + (it ? Number(it.quantidade) * Number(e.preco_final_unitario) : 0)
  }, 0)

  const fornStatusCls: Record<CmpCotacaoFornecedorStatus, string> = {
    convidado:  'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    respondido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    recusado:   'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  }

  return (
    <div className="space-y-3">
      <VinculosBar grupos={gruposVinc} />
      {/* SCs vinculadas */}
      {scs.length > 0 && (
        <Bloco titulo={`SCs vinculadas (${scs.length})`} icone={<FileText size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {scs.map(sc => {
              const meta = STATUS_META[sc.status]
              return (
                <li key={sc.id}>
                  <Link
                    to={`/compras/solicitacoes/${sc.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20"
                  >
                    <FileText size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{sc.numero}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                    </div>
                    <ExternalLink size={11} className="text-gray-400 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Bloco>
      )}

      {/* Fornecedores */}
      {fornecedores.length > 0 && (
        <Bloco titulo={`Fornecedores convidados (${fornecedores.length})`} icone={<Truck size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {fornecedores.map(f => {
              const venceu = escolhas.filter(e => e.cotacao_fornecedor_id === f.id).length
              return (
                <li key={f.id} className="flex items-center gap-3 px-4 py-2.5">
                  <Truck size={13} className="text-gray-400 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-medium">{f.fornecedor?.nome_fantasia ?? f.fornecedor?.razao_social ?? '—'}</span>
                      <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${fornStatusCls[f.status_convite]}`}>
                        {f.status_convite}
                      </span>
                      {venceu > 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 text-[10px] font-semibold">
                          <Crown size={9} /> Vence {venceu}/{itens.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Prazo: {f.prazo_entrega_dias ? `${f.prazo_entrega_dias}d` : '—'}
                      <span className="mx-1.5 text-gray-300">·</span>
                      Pag.: {f.condicao_pagamento ?? '—'}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
        </Bloco>
      )}

      {/* Itens com escolha */}
      {itens.length > 0 && (
        <Bloco titulo={`Itens (${itens.length})`} icone={<Package size={13} />}
          meta={totalEscolhido > 0 ? `Total escolhido: ${formatMoney(totalEscolhido)}` : undefined}>
          <table className="w-full text-xs">
            <thead className="bg-gray-50/60 dark:bg-gray-800/40 text-[10px] uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-3 py-2 text-left w-8">#</th>
                <th className="px-3 py-2 text-left">Produto</th>
                <th className="px-3 py-2 text-right">Qtd.</th>
                <th className="px-3 py-2 text-left">Vencedor</th>
                <th className="px-3 py-2 text-right">Preço final</th>
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(it => {
                const esc = escolhas.find(e => e.cotacao_item_id === it.id)
                const venc = esc ? fornecedores.find(f => f.id === esc.cotacao_fornecedor_id) : null
                const total = esc ? Number(it.quantidade) * Number(esc.preco_final_unitario) : 0
                return (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-mono text-gray-400">{it.linha}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{it.produto?.nome}</p>
                      <p className="text-[10px] font-mono text-gray-500">{it.produto?.codigo}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQty(it.quantidade)} {it.unidade_medida?.sigla ?? ''}</td>
                    <td className="px-3 py-2">
                      {venc ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs">
                          <Crown size={10} /> {venc.fornecedor?.nome_fantasia ?? venc.fornecedor?.razao_social}
                        </span>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{esc ? formatMoney(esc.preco_final_unitario) : '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{esc ? formatMoney(total) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Bloco>
      )}

      {/* Pedidos gerados */}
      {pedidos.length > 0 && (
        <Bloco titulo={`Pedidos gerados (${pedidos.length})`} icone={<ShoppingCart size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pedidos.map(p => {
              const meta = PEDIDO_STATUS_META[p.status]
              return (
                <li key={p.id}>
                  <Link
                    to={`/compras/pedidos/${p.id}`}
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20"
                  >
                    <ShoppingCart size={13} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold text-gray-800 dark:text-gray-200">{p.numero}</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                        {meta.label}
                      </span>
                      <span className="text-[10px] text-gray-500">
                        · {p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social}
                      </span>
                    </div>
                    <ExternalLink size={11} className="text-gray-400 shrink-0" />
                  </Link>
                </li>
              )
            })}
          </ul>
        </Bloco>
      )}

      {scs.length === 0 && fornecedores.length === 0 && itens.length === 0 && pedidos.length === 0 && (
        <div className="flex items-center gap-2 px-4 py-6 text-xs text-gray-400">
          <AlertCircle size={13} /> Sem dados vinculados.
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
