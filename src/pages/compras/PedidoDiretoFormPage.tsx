import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Save, Search, X, AlertCircle, ShoppingCart, Package, Truck,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SelectField } from '@/components/ui/SelectField'
import type {
  CmpFornecedor, CmpSolicitacao,
  PrdProduto, PrdUnidadeMedida,
} from '@/types/database'
import { formatMoney } from './_shared'

interface ItemForm {
  solicitacao_item_id: string | null
  produto_id: string
  produto_nome: string
  produto_codigo: string
  variante_id: string | null
  unidade_medida_id: string
  unidade_sigla: string
  quantidade: number
  preco_unitario: number
  observacao: string
}

export function PedidoDiretoFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const scId = params.get('sc')
  const { profile } = useAuth()

  const [sc, setSc] = useState<CmpSolicitacao | null>(null)
  const [fornecedores, setFornecedores] = useState<CmpFornecedor[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [prazoDias, setPrazoDias] = useState('')
  const [condPagamento, setCondPagamento] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [itens, setItens] = useState<ItemForm[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lookupSc, setLookupSc] = useState(false)

  useEffect(() => {
    let cancel = false
    async function carregar() {
      setLoading(true)
      const fornResp = await supabase.from('cmp_fornecedores').select('*').eq('ativo', true).order('razao_social')
      if (cancel) return
      setFornecedores(fornResp.data ?? [])

      if (scId) {
        await carregarSC(scId)
      }
      setLoading(false)
    }
    carregar()
    return () => { cancel = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scId])

  async function carregarSC(id: string) {
    const { data } = await supabase.from('cmp_solicitacoes_compra')
      .select('*').eq('id', id).single()
    if (!data) { toast.error('SC não encontrada'); return }
    if (data.status !== 'aprovada') { toast.error('SC precisa estar aprovada'); return }
    setSc(data as CmpSolicitacao)

    const { data: itensSC } = await supabase
      .from('cmp_solicitacoes_compra_itens')
      .select('*, produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo), unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)')
      .eq('solicitacao_id', id)
      .eq('status_item', 'pendente')
      .order('linha')

    setItens((itensSC ?? []).map(it => ({
      solicitacao_item_id: it.id,
      produto_id: it.produto_id,
      produto_nome: (it.produto as PrdProduto | null)?.nome ?? '—',
      produto_codigo: (it.produto as PrdProduto | null)?.codigo ?? '',
      variante_id: it.variante_id,
      unidade_medida_id: it.unidade_medida_id,
      unidade_sigla: (it.unidade_medida as PrdUnidadeMedida | null)?.sigla ?? '',
      quantidade: Number(it.quantidade),
      preco_unitario: Number(it.preco_estimado ?? 0),
      observacao: it.observacao ?? '',
    })))
  }

  function atualizarItem(idx: number, patch: Partial<ItemForm>) {
    setItens(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
  }

  function removerItem(idx: number) {
    setItens(prev => prev.filter((_, i) => i !== idx))
  }

  function validar(): string | null {
    if (!sc) return 'Selecione uma SC aprovada.'
    if (!fornecedorId) return 'Selecione um fornecedor.'
    if (itens.length === 0) return 'Sem itens.'
    for (const it of itens) {
      if (!(it.quantidade > 0)) return 'Quantidade inválida.'
      if (!(it.preco_unitario >= 0)) return 'Preço inválido.'
    }
    return null
  }

  async function salvar() {
    const erro = validar()
    if (erro) { setError(erro); toast.error(erro); return }
    setError(null); setSaving(true)
    try {
      // Resolve a alçada de aprovação pelo valor total
      const valorTotal = itens.reduce((s, it) => s + it.quantidade * it.preco_unitario, 0)
      const { data: aprovadorAlcadaId } = await supabase.rpc('get_aprovador_alcada', {
        p_empresa_id: sc!.empresa_id,
        p_valor: valorTotal,
      })
      // Busca a alçada inteira pra registrar alcada_id (auditoria)
      let alcadaId: string | null = null
      if (aprovadorAlcadaId) {
        const { data: alcada } = await supabase.from('cmp_alcadas_aprovacao')
          .select('id')
          .eq('empresa_id', sc!.empresa_id)
          .eq('aprovador_id', aprovadorAlcadaId)
          .lte('valor_min', valorTotal)
          .or(`valor_max.is.null,valor_max.gte.${valorTotal}`)
          .eq('ativo', true)
          .order('ordem').order('valor_min', { ascending: false })
          .limit(1).maybeSingle()
        alcadaId = alcada?.id ?? null
      }

      const { data: ped, error: pedErr } = await supabase.from('cmp_pedidos_compra').insert({
        empresa_id: sc!.empresa_id,
        fornecedor_id: fornecedorId,
        cotacao_id: null,
        comprador_id: profile!.id,
        prazo_entrega_dias: prazoDias ? parseInt(prazoDias) : null,
        condicao_pagamento: condPagamento.trim() || null,
        observacoes: observacoes.trim() || null,
        status: 'aguardando_aprovacao',
        alcada_id: alcadaId,
      }).select('id').single()
      if (pedErr || !ped) throw pedErr ?? new Error('Falha ao criar pedido')

      await supabase.from('cmp_pedidos_compra_itens').insert(
        itens.map((it, idx) => ({
          pedido_id: ped.id, linha: idx + 1,
          cotacao_item_id: null,
          solicitacao_item_id: it.solicitacao_item_id,
          produto_id: it.produto_id, variante_id: it.variante_id,
          unidade_medida_id: it.unidade_medida_id,
          quantidade: it.quantidade,
          preco_unitario: it.preco_unitario,
          observacao: it.observacao.trim() || null,
        }))
      )

      const scItemIds = itens.map(it => it.solicitacao_item_id).filter(Boolean) as string[]
      if (scItemIds.length > 0) {
        await supabase.from('cmp_solicitacoes_compra_itens')
          .update({ status_item: 'em_pedido' }).in('id', scItemIds)
      }

      await supabase.from('cmp_aprovacoes').insert({
        documento_tipo: 'pedido', documento_id: ped.id,
        aprovador_id: profile!.id, acao: 'enviou',
      })

      const msg = aprovadorAlcadaId
        ? 'Pedido direto criado — aguardando aprovação do responsável pela alçada'
        : 'Pedido direto criado — aguardando aprovação (sem alçada cadastrada, apenas admin pode aprovar)'
      toast.success(msg)
      navigate(`/compras/processo/${sc!.id}`)
    } catch (err) {
      console.error(err); toast.error('Erro ao salvar.')
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const totalGeral = itens.reduce((s, it) => s + it.quantidade * it.preco_unitario, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/compras/pedidos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 mb-2">
          <ChevronLeft size={14} /> Pedidos
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold flex items-center gap-2">
              <ShoppingCart size={22} className="text-indigo-600" />
              Pedido direto (sem cotação)
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Use quando você já tem o fornecedor escolhido e quer pular a etapa de cotação.
            </p>
          </div>
          {sc && (
            <Button isDisabled={saving} onPress={salvar}
              className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
              <Save size={14} /> {saving ? 'Salvando…' : 'Criar e enviar para diretoria'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {!sc ? (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-8 text-center">
          <p className="text-sm text-gray-500 mb-4">Selecione a SC aprovada que será atendida.</p>
          <Button onPress={() => setLookupSc(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Search size={14} /> Buscar SC aprovada
          </Button>
        </section>
      ) : (
        <>
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500">SC origem</p>
                <p className="font-mono font-semibold">{sc.numero}</p>
              </div>
              <button onClick={() => { setSc(null); setItens([]) }} className="text-xs text-gray-500 hover:text-red-600">Trocar</button>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold flex items-center gap-2"><Truck size={14} /> Fornecedor e condições</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 px-5 py-4">
              <div className="md:col-span-6">
                <SelectField
                  label="Fornecedor"
                  required accent="emerald"
                  value={fornecedorId}
                  onChange={setFornecedorId}
                  placeholder="— selecione —"
                  options={fornecedores.map(f => ({
                    value: f.id,
                    label: f.nome_fantasia ?? f.razao_social,
                    hint: f.cnpj_cpf ?? undefined,
                  }))}
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Prazo (dias)</label>
                <input type="number" min="0" value={prazoDias} onChange={e => setPrazoDias(e.target.value)} className={inputCls()} />
              </div>
              <div className="md:col-span-4">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Condição de pagamento</label>
                <input value={condPagamento} onChange={e => setCondPagamento(e.target.value)} placeholder="Ex: 30/60/90 dias" className={inputCls()} />
              </div>
              <div className="md:col-span-12">
                <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Observações</label>
                <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className={inputCls()} placeholder="Opcional" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold">Itens do pedido</h2>
              <span className="text-xs text-gray-500">
                Total: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatMoney(totalGeral)}</span>
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Produto</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-32">Qtd.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-16">UoM</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-32">Preço unit.</th>
                    <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-32">Total</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Observação</th>
                    <th className="px-3 py-2 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {itens.map((it, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-2">
                          <Package size={13} className="text-blue-600 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium">{it.produto_nome}</p>
                            <p className="text-[11px] font-mono text-gray-500">{it.produto_codigo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.001" value={it.quantidade}
                          onChange={e => atualizarItem(idx, { quantidade: parseFloat(e.target.value) || 0 })}
                          className={cellInputCls()} />
                      </td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{it.unidade_sigla}</td>
                      <td className="px-3 py-2">
                        <input type="number" min="0" step="0.01" value={it.preco_unitario}
                          onChange={e => atualizarItem(idx, { preco_unitario: parseFloat(e.target.value) || 0 })}
                          className={cellInputCls() + ' text-right tabular-nums'} />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-semibold">{formatMoney(it.quantidade * it.preco_unitario)}</td>
                      <td className="px-3 py-2">
                        <input value={it.observacao} onChange={e => atualizarItem(idx, { observacao: e.target.value })} className={cellInputCls()} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => removerItem(idx)} className="text-gray-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {lookupSc && (
        <LookupSCAprovadas
          onSelecionar={s => { setLookupSc(false); navigate(`/compras/pedidos/novo?sc=${s.id}`); carregarSC(s.id) }}
          onFechar={() => setLookupSc(false)}
        />
      )}
    </div>
  )
}

function LookupSCAprovadas({ onSelecionar, onFechar }: {
  onSelecionar: (sc: CmpSolicitacao) => void
  onFechar: () => void
}) {
  const [scs, setScs] = useState<CmpSolicitacao[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('cmp_solicitacoes_compra')
        .select('*')
        .eq('status', 'aprovada')
        .order('created_at', { ascending: false }).limit(50)
      setScs((data ?? []) as CmpSolicitacao[])
      setLoading(false)
    })()
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-base font-semibold">SCs aprovadas</h2>
          <button onClick={onFechar}><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : scs.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhuma SC aprovada disponível.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {scs.map(s => (
                <li key={s.id}>
                  <button onClick={() => onSelecionar(s)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono font-semibold">{s.numero}</p>
                      <p className="text-xs text-gray-500 truncate">{s.justificativa}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
function cellInputCls() {
  return 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-2 py-1 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
