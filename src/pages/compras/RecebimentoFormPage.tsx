import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  ChevronLeft, Save, Search, X, AlertCircle, Receipt, ShoppingCart, Package, FileBadge,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpFornecedor, CmpPedido, CmpPedidoItem, PrdProduto, PrdUnidadeMedida,
} from '@/types/database'
import { formatMoney, formatQty } from './_shared'

type PedidoFull = CmpPedido & { fornecedor?: CmpFornecedor }
type ItemFull = CmpPedidoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida }

interface LinhaRecebimento {
  pedido_item_id: string
  produto_nome: string
  produto_codigo: string
  unidade_sigla: string
  qty_pedida: number
  qty_ja_recebida: number
  qty_recebendo: number
  observacao: string
  divergencia: string
}

export function RecebimentoFormPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const pedidoIdInicial = params.get('pedido')
  const { profile } = useAuth()

  const [pedido, setPedido] = useState<PedidoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [linhas, setLinhas] = useState<LinhaRecebimento[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cabeçalho
  const [observacoes, setObservacoes] = useState('')
  const [lookupPedido, setLookupPedido] = useState(false)

  // NF (opcional)
  const [vincularNf, setVincularNf] = useState(false)
  const [nfNumero, setNfNumero] = useState('')
  const [nfSerie, setNfSerie] = useState('')
  const [nfCnpj, setNfCnpj] = useState('')
  const [nfDataEmissao, setNfDataEmissao] = useState('')
  const [nfValor, setNfValor] = useState('')
  const [nfChave, setNfChave] = useState('')

  // Carrega pedido (se passou ?pedido=)
  useEffect(() => {
    if (!pedidoIdInicial) {
      setLoading(false)
      return
    }
    carregarPedido(pedidoIdInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoIdInicial])

  async function carregarPedido(pid: string) {
    setLoading(true)
    const [pedResp, itensResp] = await Promise.all([
      supabase.from('cmp_pedidos_compra').select('*, fornecedor:cmp_fornecedores(*)').eq('id', pid).single(),
      supabase.from('cmp_pedidos_compra_itens').select(`
        *,
        produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
        unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
      `).eq('pedido_id', pid).order('linha'),
    ])
    const pedData = pedResp.data as unknown as PedidoFull | null
    if (!pedData) {
      toast.error('Pedido não encontrado')
      setLoading(false)
      return
    }
    setPedido(pedData)
    const its = (itensResp.data ?? []) as unknown as ItemFull[]
    setItens(its)

    // Pré-preenche linhas com qty pendente sugerida
    setLinhas(its
      .filter(it => it.status_item !== 'cancelado' && Number(it.quantidade_recebida) < Number(it.quantidade))
      .map(it => ({
        pedido_item_id: it.id,
        produto_nome: it.produto?.nome ?? '—',
        produto_codigo: it.produto?.codigo ?? '',
        unidade_sigla: it.unidade_medida?.sigla ?? '',
        qty_pedida: Number(it.quantidade),
        qty_ja_recebida: Number(it.quantidade_recebida),
        qty_recebendo: Number(it.quantidade) - Number(it.quantidade_recebida),
        observacao: '',
        divergencia: '',
      })))

    // Pré-preenche o CNPJ da NF com o do fornecedor
    if (pedData.fornecedor?.cnpj_cpf) {
      setNfCnpj(pedData.fornecedor.cnpj_cpf)
    }
    setLoading(false)
  }

  function atualizarLinha(idx: number, patch: Partial<LinhaRecebimento>) {
    setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function validar(): string | null {
    if (!pedido) return 'Selecione um pedido.'
    const algumRecebimento = linhas.some(l => l.qty_recebendo > 0)
    if (!algumRecebimento) return 'Informe a quantidade recebida em ao menos um item.'
    for (const l of linhas) {
      const restante = l.qty_pedida - l.qty_ja_recebida
      if (l.qty_recebendo < 0) return `${l.produto_nome}: quantidade não pode ser negativa.`
      if (l.qty_recebendo > restante) {
        return `${l.produto_nome}: recebimento (${l.qty_recebendo}) maior que restante (${restante}).`
      }
    }
    if (vincularNf) {
      if (!nfNumero.trim()) return 'Número da NF é obrigatório.'
      if (!nfCnpj.trim())   return 'CNPJ emitente da NF é obrigatório.'
      if (!nfDataEmissao)   return 'Data de emissão da NF é obrigatória.'
      if (!nfValor)         return 'Valor total da NF é obrigatório.'
    }
    return null
  }

  async function salvar() {
    const erro = validar()
    if (erro) { setError(erro); toast.error(erro); return }
    setError(null); setSaving(true)
    try {
      let nfId: string | null = null

      // 1. Cria/reaproveita NF se vinculou
      if (vincularNf) {
        const cnpjLimpo = nfCnpj.replace(/\D/g, '')
        // Procura NF existente
        const { data: nfExistente } = await supabase.from('cmp_notas_fiscais')
          .select('id')
          .eq('cnpj_emitente', cnpjLimpo)
          .eq('numero', nfNumero.trim())
          .eq('serie', nfSerie.trim() || '')
          .maybeSingle()

        if (nfExistente) {
          nfId = nfExistente.id
        } else {
          const { data: nfNova, error: nfErr } = await supabase.from('cmp_notas_fiscais').insert({
            cnpj_emitente: cnpjLimpo,
            fornecedor_id: pedido!.fornecedor_id,
            numero: nfNumero.trim(),
            serie: nfSerie.trim() || null,
            data_emissao: nfDataEmissao,
            valor_total: parseFloat(nfValor),
            chave_acesso: nfChave.trim() || null,
          }).select('id').single()
          if (nfErr || !nfNova) throw nfErr ?? new Error('Falha ao criar NF')
          nfId = nfNova.id
        }

        // Vincula NF ao pedido (idempotente — se já existe, ignora)
        await supabase.from('cmp_notas_fiscais_pedidos').upsert({
          nf_id: nfId, pedido_id: pedido!.id,
        }, { onConflict: 'nf_id,pedido_id' })
      }

      // 2. Cria recebimento
      const { data: rec, error: recErr } = await supabase.from('cmp_recebimentos').insert({
        pedido_id: pedido!.id,
        recebedor_id: profile!.id,
        observacoes: observacoes.trim() || null,
        nf_id: nfId,
      }).select('id').single()
      if (recErr || !rec) throw recErr ?? new Error('Falha ao criar recebimento')

      // 3. Insere itens (somente os com qty > 0)
      const itensInsert = linhas
        .filter(l => l.qty_recebendo > 0)
        .map(l => ({
          recebimento_id: rec.id,
          pedido_item_id: l.pedido_item_id,
          quantidade_recebida: l.qty_recebendo,
          divergencia: l.divergencia.trim() || null,
          observacao: l.observacao.trim() || null,
        }))
      const { error: itensErr } = await supabase.from('cmp_recebimentos_itens').insert(itensInsert)
      if (itensErr) throw itensErr

      toast.success('Recebimento registrado')
      navigate(`/compras/pedidos/${pedido!.id}`)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao salvar recebimento.')
      setError(err instanceof Error ? err.message : 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const totalRecebendo = useMemo(() => {
    return linhas.reduce((sum, l) => {
      const it = itens.find(i => i.id === l.pedido_item_id)
      return sum + (it ? l.qty_recebendo * Number(it.preco_unitario) : 0)
    }, 0)
  }, [linhas, itens])

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
        <Link to="/compras/recebimentos" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-emerald-600 mb-2">
          <ChevronLeft size={14} /> Recebimentos
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">Novo recebimento</h1>
            <p className="mt-1 text-sm text-gray-500">
              Registre a entrega física e, se já tiver a NF, vincule aqui.
            </p>
          </div>
          {pedido && (
            <Button isDisabled={saving} onPress={salvar}
              className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
              <Save size={14} /> {saving ? 'Salvando…' : 'Registrar recebimento'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Seleção de pedido */}
      {!pedido ? (
        <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-8 text-center">
          <Receipt size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-sm text-gray-500 mb-4">Selecione o pedido que será recebido.</p>
          <Button onPress={() => setLookupPedido(true)}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 text-sm font-medium inline-flex items-center gap-1.5">
            <Search size={14} /> Buscar pedido
          </Button>
        </section>
      ) : (
        <>
          {/* Pedido */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-4">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/30">
                  <ShoppingCart size={16} className="text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <p className="text-sm font-mono font-semibold">{pedido.numero}</p>
                  <p className="text-xs text-gray-500">
                    {pedido.fornecedor?.nome_fantasia ?? pedido.fornecedor?.razao_social}
                  </p>
                </div>
              </div>
              <button onClick={() => { setPedido(null); setItens([]); setLinhas([]) }}
                className="text-xs text-gray-500 hover:text-red-600">Trocar</button>
            </div>
          </section>

          {/* Itens recebidos */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold">Quantidades recebidas</h2>
              <span className="text-xs text-gray-500">
                Total: <span className="font-semibold text-gray-800 dark:text-gray-100">{formatMoney(totalRecebendo)}</span>
              </span>
            </div>
            {linhas.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-400">
                Não há itens pendentes neste pedido.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Produto</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pedido</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Já recebido</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-32">Recebendo agora</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Divergência</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Observação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {linhas.map((l, idx) => {
                      const restante = l.qty_pedida - l.qty_ja_recebida
                      const excedeu = l.qty_recebendo > restante
                      return (
                        <tr key={l.pedido_item_id}>
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <Package size={13} className="text-blue-600 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium">{l.produto_nome}</p>
                                <p className="text-[11px] font-mono text-gray-500">{l.produto_codigo}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300 align-top">
                            {formatQty(l.qty_pedida)} {l.unidade_sigla}
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-500 align-top">{formatQty(l.qty_ja_recebida)}</td>
                          <td className="px-3 py-3 align-top">
                            <input type="number" min="0" step="0.001" value={l.qty_recebendo}
                              onChange={e => atualizarLinha(idx, { qty_recebendo: parseFloat(e.target.value) || 0 })}
                              className={`w-24 rounded-lg border bg-white dark:bg-gray-800 text-sm tabular-nums px-2 py-1 outline-none text-right ${
                                excedeu ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-emerald-500'
                              }`}
                            />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input value={l.divergencia} onChange={e => atualizarLinha(idx, { divergencia: e.target.value })}
                              placeholder="Ex: avariado, fora do prazo" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 outline-none focus:border-emerald-500" />
                          </td>
                          <td className="px-3 py-3 align-top">
                            <input value={l.observacao} onChange={e => atualizarLinha(idx, { observacao: e.target.value })}
                              placeholder="Opcional" className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm px-2 py-1 outline-none focus:border-emerald-500" />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Cabeçalho do recebimento */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-5 py-4">
            <Field label="Observações do recebimento">
              <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2}
                placeholder="Opcional — anote o que achar relevante" className={inputCls()} />
            </Field>
          </section>

          {/* NF */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold inline-flex items-center gap-2">
                <FileBadge size={14} className="text-blue-600" /> Nota Fiscal
              </h2>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={vincularNf} onChange={e => setVincularNf(e.target.checked)} className="rounded text-emerald-600" />
                Vincular NF agora
              </label>
            </div>
            {vincularNf && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-5 py-4">
                <div className="md:col-span-3">
                  <Field label="Número" required>
                    <input value={nfNumero} onChange={e => setNfNumero(e.target.value)} className={inputCls() + ' font-mono'} placeholder="000000001" />
                  </Field>
                </div>
                <div className="md:col-span-2">
                  <Field label="Série">
                    <input value={nfSerie} onChange={e => setNfSerie(e.target.value)} className={inputCls() + ' font-mono'} placeholder="1" />
                  </Field>
                </div>
                <div className="md:col-span-4">
                  <Field label="CNPJ emitente" required>
                    <input value={nfCnpj} onChange={e => setNfCnpj(e.target.value)} className={inputCls() + ' font-mono'} placeholder="00.000.000/0001-00" />
                  </Field>
                </div>
                <div className="md:col-span-3">
                  <Field label="Data emissão" required>
                    <input type="date" value={nfDataEmissao} onChange={e => setNfDataEmissao(e.target.value)} className={inputCls()} />
                  </Field>
                </div>
                <div className="md:col-span-4">
                  <Field label="Valor total" required>
                    <input type="number" min="0" step="0.01" value={nfValor} onChange={e => setNfValor(e.target.value)} className={inputCls() + ' tabular-nums'} />
                  </Field>
                </div>
                <div className="md:col-span-8">
                  <Field label="Chave de acesso (44 dígitos, opcional)">
                    <input value={nfChave} onChange={e => setNfChave(e.target.value)} className={inputCls() + ' font-mono text-xs'} placeholder="00000000000000000000000000000000000000000000" />
                  </Field>
                </div>
              </div>
            )}
          </section>
        </>
      )}

      {lookupPedido && (
        <LookupPedidos onSelecionar={p => { setLookupPedido(false); carregarPedido(p.id) }} onFechar={() => setLookupPedido(false)} />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Lookup de pedidos
// ────────────────────────────────────────────────────────────────

function LookupPedidos({ onSelecionar, onFechar }: {
  onSelecionar: (p: PedidoFull) => void
  onFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [resultados, setResultados] = useState<PedidoFull[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { const t = setTimeout(() => setDebounced(busca.trim()), 250); return () => clearTimeout(t) }, [busca])

  const buscar = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('cmp_pedidos_compra').select(`
      *, fornecedor:cmp_fornecedores(*)
    `).in('status', ['aprovado','enviado','parcialmente_recebido']).order('created_at', { ascending: false }).limit(30)
    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) q = q.or(`numero.ilike.%${term}%`)
    const { data } = await q
    setResultados((data ?? []) as unknown as PedidoFull[])
    setLoading(false)
  }, [debounced])

  useEffect(() => { buscar() }, [buscar])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <Search size={15} className="text-gray-400" />
          <input autoFocus type="search" value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por número do pedido…"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400" />
          <button onClick={onFechar}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : resultados.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhum pedido disponível para recebimento.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {resultados.map(p => (
                <li key={p.id}>
                  <button onClick={() => onSelecionar(p)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                    <ShoppingCart size={14} className="text-indigo-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-mono font-semibold">{p.numero}</p>
                      <p className="text-xs text-gray-500 truncate">{p.fornecedor?.nome_fantasia ?? p.fornecedor?.razao_social}</p>
                    </div>
                    <span className="text-[10px] font-semibold uppercase text-gray-400">{p.status}</span>
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

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
