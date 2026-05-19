import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package, FileText, FileSearch, Receipt, ExternalLink, Truck, AlertCircle,
  Calendar, Building2, User as UserIcon,
} from 'lucide-react'
import {
  COTACAO_STATUS_META, PEDIDO_ITEM_STATUS_META, STATUS_META,
  formatDateTime, formatMoney, formatQty,
} from './_shared'
import { rpcCompras } from './_rpc'
import { VinculosBar, gruposVinculosPedido } from './_VinculosProcesso'
import { resumoEtapaPedido } from './_fluxoEtapas'
import { useAuth } from '@/contexts/AuthContext'

// ── Tipos do payload da RPC `cmp_painel_pedido` ──
type PedidoFull = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovado' | 'enviado' | 'parcialmente_recebido' | 'recebido' | 'cancelado'
  cotacao_id: string | null
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  observacoes: string | null
  motivo_cancelamento: string | null
  aprovado_em: string | null
  enviado_em: string | null
  empresa?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj_cpf: string | null } | null
  cotacao?: { id: string; numero: string; status: 'aberta' | 'respondida' | 'vencedor_escolhido' | 'encerrada' | 'cancelada' } | null
  comprador?: { id: string; nome: string | null; email: string } | null
  aprovador?: { id: string; nome: string | null; email: string } | null
}
type ItemPed = {
  id: string; linha: number
  quantidade: number; preco_unitario: number; quantidade_recebida: number
  status_item: 'pendente' | 'parcialmente_recebido' | 'recebido' | 'cancelado'
  produto?: { id: string; codigo: string; nome: string } | null
  unidade_medida?: { id: string; sigla: string } | null
}
type RecebimentoMin = {
  id: string; numero: string; data_recebimento: string
  observacoes: string | null
  recebedor?: { id: string; nome: string | null; email: string } | null
}
type SCMin = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovada' | 'reprovada' | 'cancelada' | 'atendida'
}

interface RpcPainelPed {
  pedido: PedidoFull | null
  itens: ItemPed[]
  recebimentos: RecebimentoMin[]
  scs_origem: SCMin[]
}

export function PainelPedido({ pedidoId }: { pedidoId: string }) {
  const { profile } = useAuth()
  const [ped, setPed] = useState<PedidoFull | null>(null)
  const [itens, setItens] = useState<ItemPed[]>([])
  const [recebimentos, setRecebimentos] = useState<RecebimentoMin[]>([])
  const [scs, setScs] = useState<SCMin[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      setErro(null)
      try {
        const { data, error } = await rpcCompras<RpcPainelPed>('cmp_painel_pedido', { p_id: pedidoId })
        if (error) throw new Error(error.message)
        if (cancel) return
        const p = data ?? ({} as RpcPainelPed)
        setPed(p.pedido ?? null)
        setItens(p.itens ?? [])
        setRecebimentos(p.recebimentos ?? [])
        setScs(p.scs_origem ?? [])
      } catch (e) {
        console.error('[PainelPedido] cmp_painel_pedido:', e)
        if (!cancel) setErro(e instanceof Error ? e.message : 'Erro inesperado')
      } finally {
        if (!cancel) setLoading(false)
      }
    }
    carregar()
    return () => { cancel = true }
  }, [pedidoId])

  const gruposVinc = useMemo(
    () => ped
      ? gruposVinculosPedido({ cotacao: ped.cotacao, scs, recebimentos })
      : [],
    [ped, scs, recebimentos],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-start gap-2 px-4 py-4 text-xs text-red-700 dark:text-red-400 bg-red-50/60 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800">
        <AlertCircle size={13} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">Erro ao carregar painel do pedido</p>
          <p className="mt-0.5 font-mono">{erro}</p>
        </div>
      </div>
    )
  }

  if (!ped) {
    return (
      <div className="flex items-center gap-2 px-4 py-6 text-xs text-gray-400">
        <AlertCircle size={13} /> Pedido não encontrado.
      </div>
    )
  }

  const total = itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_unitario), 0)
  const totalRec = itens.reduce((s, it) => s + Number(it.quantidade_recebida) * Number(it.preco_unitario), 0)
  const progresso = total > 0 ? (totalRec / total) * 100 : 0
  const resumoEtapa = resumoEtapaPedido(ped.status)

  return (
    <div className="space-y-3">
      {resumoEtapa && (
        <p className="text-[11px] text-gray-600 dark:text-gray-400 px-1">{resumoEtapa}</p>
      )}
      <VinculosBar grupos={gruposVinc} />
      {/* Resumo */}
      <section className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2.5 px-4 py-3 text-xs">
          <InfoBlock label="Fornecedor" icone={Truck}>
            {ped.fornecedor?.nome_fantasia ?? ped.fornecedor?.razao_social ?? '—'}
            {ped.fornecedor?.cnpj_cpf && <p className="text-[10px] font-mono text-gray-500 mt-0.5">{ped.fornecedor.cnpj_cpf}</p>}
          </InfoBlock>
          <InfoBlock label="Empresa" icone={Building2}>
            {ped.empresa?.nome_fantasia ?? ped.empresa?.razao_social ?? '—'}
          </InfoBlock>
          <InfoBlock label="Comprador" icone={UserIcon}>
            {ped.comprador?.nome ?? ped.comprador?.email ?? '—'}
          </InfoBlock>
          <InfoBlock label="Aprovador" icone={UserIcon}>
            {ped.aprovador?.nome ?? ped.aprovador?.email ?? '—'}
          </InfoBlock>
          <InfoBlock label="Prazo de entrega" icone={Calendar}>
            {ped.prazo_entrega_dias ? `${ped.prazo_entrega_dias} dias` : '—'}
          </InfoBlock>
          <InfoBlock label="Condição de pagamento">
            {ped.condicao_pagamento ?? '—'}
          </InfoBlock>
          <InfoBlock label="Enviado em" icone={Calendar}>
            {formatDateTime(ped.enviado_em)}
          </InfoBlock>
          <InfoBlock label="Recebimento">
            {progresso > 0 ? `${progresso.toFixed(0)}% (${formatMoney(totalRec)} de ${formatMoney(total)})` : '—'}
          </InfoBlock>
        </div>
      </section>

      {/* SCs origem */}
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
                      <span className="text-xs font-mono font-semibold">{sc.numero}</span>
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

      {/* Cotação origem */}
      {ped.cotacao && (
        <Bloco titulo="Cotação origem" icone={<FileSearch size={13} />}>
          <Link
            to={`/compras/cotacoes/${ped.cotacao.id}`}
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-violet-50/40 dark:hover:bg-violet-950/20"
          >
            <FileSearch size={13} className="text-violet-600 dark:text-violet-400 shrink-0" />
            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-semibold">{ped.cotacao.numero}</span>
              {(() => {
                const meta = COTACAO_STATUS_META[ped.cotacao.status]
                return (
                  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${meta.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                )
              })()}
            </div>
            <ExternalLink size={11} className="text-gray-400 shrink-0" />
          </Link>
        </Bloco>
      )}

      {/* Itens */}
      <Bloco titulo={`Itens (${itens.length})`} icone={<Package size={13} />}
        meta={`Total: ${formatMoney(total)}`}>
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
                <th className="px-3 py-2 text-right">Preço unit.</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Recebido</th>
                <th className="px-3 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(it => {
                const stMeta = PEDIDO_ITEM_STATUS_META[it.status_item]
                const totalLinha = Number(it.quantidade) * Number(it.preco_unitario)
                const recebeu = Number(it.quantidade_recebida) >= Number(it.quantidade)
                return (
                  <tr key={it.id}>
                    <td className="px-3 py-2 font-mono text-gray-400">{it.linha}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-gray-800 dark:text-gray-200">{it.produto?.nome}</p>
                      <p className="text-[10px] font-mono text-gray-500">{it.produto?.codigo}</p>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatQty(it.quantidade)}</td>
                    <td className="px-3 py-2 text-gray-500">{it.unidade_medida?.sigla ?? '—'}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{formatMoney(it.preco_unitario)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMoney(totalLinha)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      <span className={recebeu ? 'text-emerald-600 font-semibold' : 'text-gray-600'}>
                        {formatQty(it.quantidade_recebida)} / {formatQty(it.quantidade)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${stMeta.badge}`}>
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

      {/* Recebimentos */}
      {recebimentos.length > 0 && (
        <Bloco titulo={`Recebimentos (${recebimentos.length})`} icone={<Receipt size={13} />}>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {recebimentos.map(r => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2.5">
                <Receipt size={13} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-semibold">{r.numero}</p>
                  <p className="text-[10px] text-gray-500">{formatDateTime(r.data_recebimento)}</p>
                  {r.observacoes && <p className="text-[10px] text-gray-500 mt-0.5">{r.observacoes}</p>}
                </div>
              </li>
            ))}
          </ul>
        </Bloco>
      )}

      {ped.observacoes && (
        <section className="rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Observações</p>
          <p className="text-xs text-gray-700 dark:text-gray-200 whitespace-pre-wrap">{ped.observacoes}</p>
        </section>
      )}

      {ped.motivo_cancelamento && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-xs text-red-700 dark:text-red-400">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Cancelado</p>
            <p className="mt-0.5">{ped.motivo_cancelamento}</p>
          </div>
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

function InfoBlock({ label, icone: Icon, children }: {
  label: string
  icone?: typeof Building2
  children: React.ReactNode
}) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-0.5">
        {Icon && <Icon size={10} />} {label}
      </p>
      <div className="text-xs text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}
