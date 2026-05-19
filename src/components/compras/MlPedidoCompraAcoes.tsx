import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  AlertCircle, Check, Link as LinkIcon, Plus, Search, ShoppingCart, Unlink, X,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpFornecedor, CmpPedido, MlPedidoItem, PrdProduto } from '@/types/database'
import { formatMoney } from '@/pages/compras/_shared'

type PedidoCompraRef = { id: string; numero: string }

export type MlPedidoCompraAcoesProps = {
  mlPedidoId: string
  mlOrderId: number
  empresaId: string
  pedidoCompra?: PedidoCompraRef | null
  vendedorNickname?: string | null
  itens?: MlPedidoItem[]
  total?: number | null
  onChanged: () => void
  compact?: boolean
}

type PedidoBusca = CmpPedido & { empresa?: { id: string }; fornecedor?: CmpFornecedor }

type ProdutoOpt = Pick<PrdProduto, 'id' | 'codigo' | 'nome' | 'unidade_medida_id'>

type LinhaCriar = {
  mlItem: MlPedidoItem
  produtoId: string
  produtoLabel: string
  unidadeMedidaId: string
}

export function MlPedidoCompraAcoes({
  mlPedidoId,
  mlOrderId,
  empresaId,
  pedidoCompra,
  vendedorNickname,
  itens = [],
  total,
  onChanged,
  compact,
}: MlPedidoCompraAcoesProps) {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const podeGerir = profile?.role === 'admin' || profile?.role === 'comprador' || profile?.role === 'diretor'

  const [vinculando, setVinculando] = useState(false)

  async function desvincular() {
    if (!window.confirm('Desfazer o vínculo entre esta compra do ML e o pedido de compra?')) return
    setVinculando(true)
    const { error } = await supabase.rpc('ml_desvincular_pedido_compra', { p_ml_pedido_id: mlPedidoId })
    setVinculando(false)
    if (error) { toast.error(error.message); return }
    toast.success('Vínculo removido')
    onChanged()
  }

  if (pedidoCompra) {
    return (
      <span className="inline-flex items-center gap-2 flex-wrap">
        <Link
          to={`/compras/pedidos/${pedidoCompra.id}`}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 px-2.5 py-1 text-xs font-medium"
        >
          <ShoppingCart size={11} /> Pedido {pedidoCompra.numero}
        </Link>
        {podeGerir && (
          <Button
            isDisabled={vinculando}
            onPress={desvincular}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5"
          >
            <Unlink size={11} /> Desvincular
          </Button>
        )}
      </span>
    )
  }

  if (!podeGerir) return null

  return (
    <span className="inline-flex items-center gap-2 flex-wrap">
      <VincularModal
        mlPedidoId={mlPedidoId}
        onVinculado={onChanged}
        disabled={vinculando}
        compact={compact}
      />
      <CriarPedidoModal
        mlPedidoId={mlPedidoId}
        mlOrderId={mlOrderId}
        empresaId={empresaId}
        vendedorNickname={vendedorNickname}
        itens={itens}
        total={total}
        onCriado={id => {
          onChanged()
          navigate(`/compras/pedidos/${id}`)
        }}
        compact={compact}
      />
    </span>
  )
}

// ─── Vincular a pedido existente ─────────────────────────────

function VincularModal({
  mlPedidoId,
  onVinculado,
  disabled,
  compact,
}: {
  mlPedidoId: string
  onVinculado: () => void
  disabled?: boolean
  compact?: boolean
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [resultados, setResultados] = useState<PedidoBusca[]>([])
  const [carregando, setCarregando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    if (!aberto) return
    let cancel = false
    async function buscar() {
      setCarregando(true)
      let q = supabase
        .from('cmp_pedidos_compra')
        .select(`
          id, numero, status, fornecedor_id, empresa_id, ml_pedido_id, origem, created_at,
          fornecedor:cmp_fornecedores(id,razao_social,nome_fantasia)
        `)
        .is('ml_pedido_id', null)
        .order('created_at', { ascending: false })
        .limit(15)
      if (debounced) q = q.ilike('numero', `%${debounced}%`)
      const { data } = await q
      if (!cancel) {
        setResultados((data ?? []) as unknown as PedidoBusca[])
        setCarregando(false)
      }
    }
    buscar()
    return () => { cancel = true }
  }, [aberto, debounced])

  async function vincular(pedidoCompraId: string) {
    setEnviando(true)
    const { error } = await supabase.rpc('ml_vincular_pedido_compra', {
      p_ml_pedido_id: mlPedidoId,
      p_pedido_compra_id: pedidoCompraId,
    })
    setEnviando(false)
    if (error) { toast.error(error.message); return }
    toast.success('Vinculado!')
    setAberto(false)
    setBusca('')
    onVinculado()
  }

  return (
    <>
      <Button
        isDisabled={disabled}
        onPress={() => setAberto(true)}
        className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5"
      >
        <LinkIcon size={11} /> {compact ? 'Vincular' : 'Vincular a pedido'}
      </Button>

      {aberto && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-semibold">Vincular a um pedido de compra</h3>
              <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="search"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Buscar por número (ex: PC-00012)…"
                  className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500"
                  autoFocus
                />
              </div>
              <div className="rounded-xl border border-gray-100 dark:border-gray-800 max-h-[320px] overflow-y-auto">
                {carregando ? (
                  <div className="flex justify-center py-6">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
                  </div>
                ) : resultados.length === 0 ? (
                  <p className="px-4 py-6 text-center text-xs text-gray-400">
                    Nenhum pedido sem vínculo com ML encontrado.
                  </p>
                ) : (
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {resultados.map(pc => (
                      <li key={pc.id}>
                        <button
                          type="button"
                          disabled={enviando}
                          onClick={() => vincular(pc.id)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 disabled:opacity-50"
                        >
                          <span className="font-mono font-semibold flex-1 truncate">{pc.numero}</span>
                          <span className="text-xs text-gray-500 truncate">
                            {pc.fornecedor?.nome_fantasia ?? pc.fornecedor?.razao_social ?? '—'}
                          </span>
                          <Check size={12} className="text-emerald-500 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <p className="text-xs text-gray-500 flex items-start gap-1.5">
                <AlertCircle size={11} className="mt-0.5 shrink-0" />
                Só aparecem pedidos de compra ainda não vinculados ao Mercado Livre.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Criar pedido de compra a partir do ML ───────────────────

function CriarPedidoModal({
  mlPedidoId,
  mlOrderId,
  empresaId,
  vendedorNickname,
  itens,
  total,
  onCriado,
  compact,
}: {
  mlPedidoId: string
  mlOrderId: number
  empresaId: string
  vendedorNickname?: string | null
  itens: MlPedidoItem[]
  total?: number | null
  onCriado: (pedidoId: string) => void
  compact?: boolean
}) {
  const { profile } = useAuth()
  const [aberto, setAberto] = useState(false)
  const [fornecedores, setFornecedores] = useState<CmpFornecedor[]>([])
  const [fornecedorId, setFornecedorId] = useState('')
  const [linhas, setLinhas] = useState<LinhaCriar[]>([])
  const [observacoes, setObservacoes] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!aberto) return
    let cancel = false
    async function init() {
      setCarregando(true)
      const [fornR, ...matches] = await Promise.all([
        supabase.from('cmp_fornecedores').select('*').eq('ativo', true).order('razao_social'),
        ...itens.map(it =>
          supabase
            .from('prd_produtos')
            .select('id,codigo,nome,unidade_medida_id, unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)')
            .eq('codigo', it.ml_item_id)
            .eq('ativo', true)
            .maybeSingle(),
        ),
      ])
      if (cancel) return

      const listaForn = fornR.data ?? []
      setFornecedores(listaForn)

      if (vendedorNickname) {
        const nick = vendedorNickname.toLowerCase()
        const match = listaForn.find(f =>
          (f.nome_fantasia ?? '').toLowerCase().includes(nick)
          || (f.razao_social ?? '').toLowerCase().includes(nick),
        )
        if (match) setFornecedorId(match.id)
      }

      setLinhas(
        itens.map((it, i) => {
          const prod = matches[i]?.data as ProdutoOpt | null
          return {
            mlItem: it,
            produtoId: prod?.id ?? '',
            produtoLabel: prod ? `${prod.codigo} — ${prod.nome}` : '',
            unidadeMedidaId: prod?.unidade_medida_id ?? '',
          }
        }),
      )

      setObservacoes(
        `Origem: Mercado Livre · Pedido ML #${mlOrderId}${vendedorNickname ? ` · ${vendedorNickname}` : ''}`,
      )
      setCarregando(false)
    }
    void init()
    return () => { cancel = true }
  }, [aberto, itens, mlOrderId, vendedorNickname])

  async function salvar() {
    if (!fornecedorId) { toast.error('Selecione um fornecedor'); return }
    if (itens.length === 0) { toast.error('Pedido ML sem itens para importar'); return }
    if (linhas.some(l => !l.produtoId || !l.unidadeMedidaId)) {
      toast.error('Vincule um produto do cadastro a cada item do ML')
      return
    }

    setSalvando(true)
    try {
      const valorTotal = linhas.reduce(
        (s, l) => s + Number(l.mlItem.quantidade ?? 0) * Number(l.mlItem.preco_unitario ?? 0),
        0,
      )

      const { data: aprovadorAlcadaId } = await supabase.rpc('get_aprovador_alcada', {
        p_empresa_id: empresaId,
        p_valor: valorTotal,
      })

      let alcadaId: string | null = null
      if (aprovadorAlcadaId) {
        const { data: alcada } = await supabase
          .from('cmp_alcadas_aprovacao')
          .select('id')
          .eq('empresa_id', empresaId)
          .eq('aprovador_id', aprovadorAlcadaId)
          .lte('valor_min', valorTotal)
          .or(`valor_max.is.null,valor_max.gte.${valorTotal}`)
          .eq('ativo', true)
          .order('ordem')
          .order('valor_min', { ascending: false })
          .limit(1)
          .maybeSingle()
        alcadaId = alcada?.id ?? null
      }

      const { data: ped, error: pedErr } = await supabase
        .from('cmp_pedidos_compra')
        .insert({
          empresa_id: empresaId,
          fornecedor_id: fornecedorId,
          cotacao_id: null,
          origem: 'mercadolivre',
          comprador_id: profile!.id,
          observacoes: observacoes.trim() || null,
          status: 'aguardando_aprovacao',
          alcada_id: alcadaId,
        })
        .select('id')
        .single()

      if (pedErr || !ped) throw pedErr ?? new Error('Falha ao criar pedido')

      const { error: itensErr } = await supabase.from('cmp_pedidos_compra_itens').insert(
        linhas.map((l, idx) => ({
          pedido_id: ped.id,
          linha: idx + 1,
          cotacao_item_id: null,
          solicitacao_item_id: null,
          produto_id: l.produtoId,
          variante_id: null,
          unidade_medida_id: l.unidadeMedidaId,
          quantidade: Number(l.mlItem.quantidade ?? 1),
          preco_unitario: Number(l.mlItem.preco_unitario ?? 0),
          observacao: l.mlItem.titulo ?? null,
        })),
      )
      if (itensErr) throw itensErr

      await supabase.from('cmp_aprovacoes').insert({
        documento_tipo: 'pedido',
        documento_id: ped.id,
        aprovador_id: profile!.id,
        acao: 'enviou',
      })

      const { error: vincErr } = await supabase.rpc('ml_vincular_pedido_compra', {
        p_ml_pedido_id: mlPedidoId,
        p_pedido_compra_id: ped.id,
      })
      if (vincErr) throw vincErr

      toast.success('Pedido de compra criado e vinculado ao ML')
      setAberto(false)
      onCriado(ped.id)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao criar pedido')
    } finally {
      setSalvando(false)
    }
  }

  const semItens = itens.length === 0

  return (
    <>
      <span
        className="inline-flex"
        title={semItens ? 'Pedido ML sem itens' : undefined}
      >
        <Button
          isDisabled={semItens}
          onPress={() => setAberto(true)}
          className="bg-blue-600 text-white hover:bg-blue-700 px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <Plus size={11} /> {compact ? 'Criar PC' : 'Criar pedido de compra'}
        </Button>
      </span>

      {aberto && (
        <div
          className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={() => setAberto(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-xl border border-gray-100 dark:border-gray-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div>
                <h3 className="text-sm font-semibold">Criar pedido de compra</h3>
                <p className="text-xs text-gray-500">Pedido ML #{mlOrderId}{total != null ? ` · ${formatMoney(total)}` : ''}</p>
              </div>
              <button type="button" onClick={() => setAberto(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {carregando ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fornecedor *</label>
                    <select
                      value={fornecedorId}
                      onChange={e => setFornecedorId(e.target.value)}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                    >
                      <option value="">Selecione…</option>
                      {fornecedores.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.nome_fantasia ?? f.razao_social}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
                    <textarea
                      value={observacoes}
                      onChange={e => setObservacoes(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                      Itens — associe ao produto do cadastro
                    </p>
                    <ul className="space-y-3">
                      {linhas.map((linha, idx) => (
                        <LinhaProdutoPicker
                          key={linha.mlItem.id}
                          linha={linha}
                          onChange={patch => setLinhas(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))}
                        />
                      ))}
                    </ul>
                  </div>
                </>
              )}
            </div>

            <div className="shrink-0 flex justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800">
              <Button
                onPress={() => setAberto(false)}
                className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm"
              >
                Cancelar
              </Button>
              <Button
                isDisabled={carregando || salvando}
                onPress={salvar}
                className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium"
              >
                {salvando ? 'Criando…' : 'Criar e vincular'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function LinhaProdutoPicker({
  linha,
  onChange,
}: {
  linha: LinhaCriar
  onChange: (patch: Partial<LinhaCriar>) => void
}) {
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [opcoes, setOpcoes] = useState<ProdutoOpt[]>([])
  const [abrindo, setAbrindo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(busca.trim()), 300)
    return () => clearTimeout(t)
  }, [busca])

  useEffect(() => {
    if (!abrindo) return
    let cancel = false
    async function buscar() {
      let q = supabase
        .from('prd_produtos')
        .select('id, codigo, nome, unidade_medida_id')
        .eq('ativo', true)
        .order('nome')
        .limit(12)
      if (debounced) {
        q = q.or(`nome.ilike.%${debounced}%,codigo.ilike.%${debounced}%`)
      }
      const { data } = await q
      if (!cancel) setOpcoes((data ?? []) as ProdutoOpt[])
    }
    buscar()
    return () => { cancel = true }
  }, [abrindo, debounced])

  function escolher(p: ProdutoOpt) {
    onChange({
      produtoId: p.id,
      produtoLabel: `${p.codigo} — ${p.nome}`,
      unidadeMedidaId: p.unidade_medida_id,
    })
    setAbrindo(false)
    setBusca('')
  }

  return (
    <li className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 space-y-2">
      <div>
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">
          {linha.mlItem.titulo ?? linha.mlItem.ml_item_id}
        </p>
        <p className="text-xs text-gray-500 mt-0.5">
          {linha.mlItem.quantidade ?? 0} × {formatMoney(linha.mlItem.preco_unitario ?? 0)}
          <span className="font-mono ml-2">{linha.mlItem.ml_item_id}</span>
        </p>
      </div>
      {linha.produtoId ? (
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="text-emerald-700 dark:text-emerald-400 truncate">{linha.produtoLabel}</span>
          <button type="button" className="text-gray-400 hover:text-gray-600 shrink-0" onClick={() => onChange({ produtoId: '', produtoLabel: '', unidadeMedidaId: '' })}>
            Trocar
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={busca}
            onFocus={() => setAbrindo(true)}
            onChange={e => { setBusca(e.target.value); setAbrindo(true) }}
            placeholder="Buscar produto por código ou nome…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 pl-7 pr-2 py-1.5 text-xs"
          />
          {abrindo && opcoes.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg max-h-40 overflow-y-auto">
              {opcoes.map(p => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => escolher(p)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-blue-50 dark:hover:bg-blue-950/30"
                  >
                    <span className="font-mono text-gray-500">{p.codigo}</span> — {p.nome}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
