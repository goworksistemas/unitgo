import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ShoppingCart, Truck, Building2,
  Calendar, Package, AlertCircle,
} from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { supabase } from '@/lib/supabase'
import type {
  CmpFornecedor, CmpPedido, CmpSolicitacao, CoreEmpresa, Profile,
} from '@/types/database'
import { formatDate, formatMoney } from './_shared'
import { metaPedido, resumoEtapaPedido } from './_fluxoEtapas'
import { StatusBadge } from './_StatusBadge'
import { LinhaTempoProcesso } from './_LinhaTempoProcesso'
import { LinhaExpansivel } from './_LinhaExpansivel'
import { PainelPedido } from './_PainelPedido'

type SCResumo = Pick<CmpSolicitacao, 'id' | 'numero' | 'status' | 'created_at'> & {
  empresa?: Pick<CoreEmpresa, 'id' | 'razao_social' | 'nome_fantasia'>
  solicitante?: Pick<Profile, 'id' | 'nome' | 'email'>
}

type ProfileMini = { id: string; nome: string | null; email: string }

type PedidoCard = CmpPedido & {
  fornecedor?: Pick<CmpFornecedor, 'id' | 'razao_social' | 'nome_fantasia' | 'cnpj_cpf'>
  comprador?: ProfileMini
  aprovador?: ProfileMini
  total: number
  qtd_total: number
  qtd_recebida: number
  itens_count: number
}

export function ProcessoPedidosPage() {
  const { id } = useParams<{ id: string }>()

  const [sc, setSc] = useState<SCResumo | null>(null)
  const [pedidos, setPedidos] = useState<PedidoCard[]>([])
  const [loading, setLoading] = useState(true)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const toggleAberto = (idPedido: string) => setAbertos(prev => {
    const n = new Set(prev)
    if (n.has(idPedido)) n.delete(idPedido); else n.add(idPedido)
    return n
  })

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)

    const [scResp, vincsResp, scItensResp] = await Promise.all([
      supabase.from('cmp_solicitacoes_compra')
        .select('id,numero,status,created_at,empresa:core_empresas(id,razao_social,nome_fantasia),solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email)')
        .eq('id', id).maybeSingle(),
      supabase.from('cmp_cotacoes_solicitacoes').select('cotacao_id').eq('solicitacao_id', id),
      supabase.from('cmp_solicitacoes_compra_itens').select('id').eq('solicitacao_id', id),
    ])

    setSc((scResp.data as unknown as SCResumo) ?? null)

    const cotIds = Array.from(new Set((vincsResp.data ?? []).map(v => v.cotacao_id)))
    const scItemIds = (scItensResp.data ?? []).map(i => i.id)

    const [pedsViaCotResp, pedItensDiretosResp] = await Promise.all([
      cotIds.length > 0
        ? supabase.from('cmp_pedidos_compra')
            .select('*,fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia,cnpj_cpf),comprador:profiles!cmp_pedidos_compra_comprador_id_fkey(id,nome,email),aprovador:profiles!cmp_pedidos_compra_aprovador_id_fkey(id,nome,email),itens:cmp_pedidos_compra_itens(quantidade,preco_unitario,quantidade_recebida)')
            .in('cotacao_id', cotIds)
            .order('created_at', { ascending: false })
        : Promise.resolve({ data: [] as unknown[] }),
      scItemIds.length > 0
        ? supabase.from('cmp_pedidos_compra_itens')
            .select('pedido_id').in('solicitacao_item_id', scItemIds)
        : Promise.resolve({ data: [] as { pedido_id: string }[] }),
    ])

    const pedidosTodos: PedidoCard[] = []
    const pushPedidos = (rows: unknown[]) => {
      for (const row of rows) {
        const p = row as CmpPedido & {
          fornecedor?: PedidoCard['fornecedor']
          itens?: { quantidade: number; preco_unitario: number; quantidade_recebida: number }[]
        }
        const linhas = p.itens ?? []
        pedidosTodos.push({
          ...p,
          total: linhas.reduce((s, l) => s + Number(l.quantidade) * Number(l.preco_unitario), 0),
          qtd_total: linhas.reduce((s, l) => s + Number(l.quantidade), 0),
          qtd_recebida: linhas.reduce((s, l) => s + Number(l.quantidade_recebida), 0),
          itens_count: linhas.length,
        })
      }
    }

    pushPedidos(pedsViaCotResp.data ?? [])

    const pedIdsDiretos = Array.from(new Set(((pedItensDiretosResp.data ?? []) as { pedido_id: string }[]).map(i => i.pedido_id)))
      .filter(pid => !pedidosTodos.some(p => p.id === pid))

    if (pedIdsDiretos.length > 0) {
      const { data: pedsDiretos } = await supabase.from('cmp_pedidos_compra')
        .select('*,fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia,cnpj_cpf),comprador:profiles!cmp_pedidos_compra_comprador_id_fkey(id,nome,email),aprovador:profiles!cmp_pedidos_compra_aprovador_id_fkey(id,nome,email),itens:cmp_pedidos_compra_itens(quantidade,preco_unitario,quantidade_recebida)')
        .in('id', pedIdsDiretos)
        .order('created_at', { ascending: false })
      pushPedidos(pedsDiretos ?? [])
    }

    pedidosTodos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    setPedidos(pedidosTodos)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const totalGeral = pedidos.reduce((s, p) => s + p.total, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  if (!sc) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Solicitação não encontrada.</p>
        <Link to="/compras/solicitacoes" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          Voltar para listagem
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <BotaoVoltar fallback={`/compras/solicitacoes/${sc.id}`} label={`Voltar para ${sc.numero}`} />
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
            <ShoppingCart size={18} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Pedidos do processo
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              <span className="font-mono">{sc.numero}</span> · {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
            </p>
          </div>
        </div>
      </div>

      <LinhaTempoProcesso scId={sc.id} currentStep="pedido" />

      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Pedidos vinculados
            <span className="ml-1 text-gray-400 dark:text-gray-500 font-normal">({pedidos.length})</span>
          </h2>
          {pedidos.length > 0 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Total geral: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatMoney(totalGeral)}</span>
            </span>
          )}
        </div>

        {pedidos.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 px-5 text-center">
            <Package size={28} className="text-gray-300 dark:text-gray-600" />
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Ainda não há pedidos gerados para esta solicitação.
            </p>
            <Link
              to={`/compras/solicitacoes/${sc.id}`}
              className="mt-2 text-xs text-emerald-600 hover:underline"
            >
              Voltar para o processo
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-800">
            {pedidos.map(p => {
              const meta = metaPedido(p.status)
              const resumo = resumoEtapaPedido(p.status)
              const progresso = p.qtd_total > 0 ? (p.qtd_recebida / p.qtd_total) * 100 : 0
              const aberto = abertos.has(p.id)
              return (
                <LinhaExpansivel
                  key={p.id}
                  aberto={aberto}
                  onToggle={() => toggleAberto(p.id)}
                  cabecalho={
                    <>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/40">
                        <ShoppingCart size={15} className="text-indigo-600 dark:text-indigo-400" />
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
                          <StatusBadge meta={meta} size="sm" />
                          {!p.cotacao_id && (
                            <span className="text-[10px] text-gray-400 italic">(pedido direto)</span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><Truck size={11} />{p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social ?? '—'}</span>
                          <span className="inline-flex items-center gap-1"><Building2 size={11} />{p.itens_count} {p.itens_count === 1 ? 'item' : 'itens'}</span>
                          <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDate(p.created_at)}</span>
                          <span className="font-semibold tabular-nums text-gray-800 dark:text-gray-100">{formatMoney(p.total)}</span>
                        </div>
                        {progresso > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 max-w-[160px] h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500" style={{ width: `${progresso}%` }} />
                            </div>
                            <span className="text-[10px] text-gray-500">{progresso.toFixed(0)}% recebido</span>
                          </div>
                        )}
                        {resumo && (
                          <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">{resumo}</p>
                        )}
                      </div>
                    </>
                  }
                  painel={aberto ? <PainelPedido pedidoId={p.id} /> : null}
                />
              )
            })}
          </ul>
        )}
      </section>

      {sc.status === 'cancelada' && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <p>Esta solicitação está cancelada. Os pedidos acima são histórico do processo.</p>
        </div>
      )}
    </div>
  )
}
