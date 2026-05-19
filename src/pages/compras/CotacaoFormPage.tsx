import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import {
  Save, Plus, Trash2, Search, Package, X, AlertCircle, FileText, Check,
} from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ChoiceField } from '@/components/ui/ChoiceField'
import { MultiSelectField } from '@/components/ui/MultiSelectField'
import type {
  CmpFornecedor, CmpSolicitacao, CmpSolicitacaoItem, CoreEmpresa,
  PrdProduto, PrdUnidadeMedida,
} from '@/types/database'

interface ItemForm {
  linha: number
  produto_id: string
  produto?: PrdProduto
  variante_id: string | null
  unidade_medida_id: string
  unidade_medida_sigla?: string
  quantidade: number
  observacao: string
  // rastreabilidade
  solicitacao_item_id: string | null
  solicitacao_numero?: string
}

export function CotacaoFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const scId = searchParams.get('sc') // origem opcional: ?sc=<uuid>
  const { profile } = useAuth()

  const [empresas, setEmpresas] = useState<CoreEmpresa[]>([])
  const [fornecedores, setFornecedores] = useState<CmpFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cabeçalho
  const [empresaId, setEmpresaId] = useState('')
  const [titulo, setTitulo] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [prazoResposta, setPrazoResposta] = useState('')

  // Itens e fornecedores convidados
  const [itens, setItens] = useState<ItemForm[]>([])
  const [fornecedoresSel, setFornecedoresSel] = useState<Set<string>>(new Set())
  const [scsVinculadas, setScsVinculadas] = useState<{ id: string; numero: string }[]>([])

  // Modais
  const [produtoLookup, setProdutoLookup] = useState<{ linha: number } | null>(null)
  const [scLookup, setScLookup] = useState(false)

  const empresasAtivas = useMemo(() => empresas.filter(e => e.ativo), [empresas])
  const fornecedoresAtivos = useMemo(() => fornecedores.filter(f => f.ativo), [fornecedores])

  // Carrega master data
  useEffect(() => {
    let cancelled = false
    async function carregar() {
      setLoading(true)
      const [empResp, fornResp] = await Promise.all([
        supabase.from('core_empresas').select('*').eq('ativo', true).order('razao_social'),
        supabase.from('cmp_fornecedores').select('*').eq('ativo', true).order('razao_social'),
      ])
      if (cancelled) return
      setEmpresas(empResp.data ?? [])
      setFornecedores(fornResp.data ?? [])
      const emp = (empResp.data ?? []).find(e => e.ativo)
      if (emp && !empresaId) setEmpresaId(emp.id)

      // Se veio ?sc=, carrega a SC e seus itens
      if (scId) {
        await carregarDaSC(scId)
      }
      setLoading(false)
    }
    carregar()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scId])

  async function carregarDaSC(scIdParam: string) {
    const { data: sc } = await supabase
      .from('cmp_solicitacoes_compra')
      .select('*')
      .eq('id', scIdParam)
      .single()
    if (!sc) { toast.error('SC não encontrada'); return }
    if (sc.status !== 'aprovada' && sc.status !== 'atendida') {
      toast.error('SC precisa estar aprovada para gerar cotação')
      return
    }

    const { data: itensSC } = await supabase
      .from('cmp_solicitacoes_compra_itens')
      .select('*, produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo), unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)')
      .eq('solicitacao_id', scIdParam)
      .eq('status_item', 'pendente')
      .order('linha')

    setEmpresaId(sc.empresa_id)
    setTitulo(`Cotação para ${sc.numero}`)
    setScsVinculadas(prev => [...prev, { id: sc.id, numero: sc.numero }])
    setItens((itensSC ?? []).map((it, idx) => ({
      linha: idx + 1,
      produto_id: it.produto_id,
      produto: it.produto as PrdProduto | undefined,
      variante_id: it.variante_id,
      unidade_medida_id: it.unidade_medida_id,
      unidade_medida_sigla: (it.unidade_medida as PrdUnidadeMedida | undefined)?.sigla,
      quantidade: Number(it.quantidade),
      observacao: it.observacao ?? '',
      solicitacao_item_id: it.id,
      solicitacao_numero: sc.numero,
    })))
  }

  function adicionarItemVazio() {
    setItens(prev => [...prev, {
      linha: prev.length + 1,
      produto_id: '',
      variante_id: null,
      unidade_medida_id: '',
      quantidade: 1,
      observacao: '',
      solicitacao_item_id: null,
    }])
    setProdutoLookup({ linha: itens.length + 1 })
  }

  function removerItem(linha: number) {
    setItens(prev => prev.filter(it => it.linha !== linha).map((it, idx) => ({ ...it, linha: idx + 1 })))
  }

  function selecionarProduto(linha: number, produto: PrdProduto & { unidade_medida?: PrdUnidadeMedida }) {
    setItens(prev => prev.map(it => it.linha === linha
      ? {
          ...it,
          produto_id: produto.id, produto,
          unidade_medida_id: produto.unidade_medida_id,
          unidade_medida_sigla: produto.unidade_medida?.sigla,
        }
      : it
    ))
    setProdutoLookup(null)
  }

  function atualizarItem(linha: number, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(it => it.linha === linha ? { ...it, ...patch } : it))
  }

  async function vincularSCs(scs: { id: string; numero: string; itens: ItemForm[] }[]) {
    setScsVinculadas(prev => {
      const ids = new Set(prev.map(s => s.id))
      return [...prev, ...scs.filter(s => !ids.has(s.id)).map(s => ({ id: s.id, numero: s.numero }))]
    })
    setItens(prev => {
      let nextLinha = prev.length
      const novos = scs.flatMap(s => s.itens.map(it => ({ ...it, linha: ++nextLinha })))
      return [...prev, ...novos]
    })
    setScLookup(false)
  }

  function desvincularSC(id: string) {
    setScsVinculadas(prev => prev.filter(s => s.id !== id))
    setItens(prev => prev
      .filter(it => {
        if (!it.solicitacao_item_id) return true
        return scsVinculadas.find(s => s.id !== id && s.numero === it.solicitacao_numero) !== undefined ||
               !scsVinculadas.find(s => s.id === id && s.numero === it.solicitacao_numero)
      })
      .map((it, idx) => ({ ...it, linha: idx + 1 }))
    )
  }

  function validar(): string | null {
    if (!empresaId) return 'Selecione uma empresa.'
    if (!titulo.trim()) return 'Informe um título.'
    if (itens.length === 0) return 'Adicione ao menos um item.'
    if (fornecedoresSel.size === 0) return 'Convide ao menos um fornecedor.'
    for (const it of itens) {
      if (!it.produto_id)        return `Linha ${it.linha}: selecione o produto.`
      if (!it.unidade_medida_id) return `Linha ${it.linha}: unidade de medida obrigatória.`
      if (!(it.quantidade > 0))  return `Linha ${it.linha}: quantidade deve ser maior que zero.`
    }
    return null
  }

  async function criar() {
    const erro = validar()
    if (erro) { setError(erro); toast.error(erro); return }
    setError(null); setSaving(true)
    try {
      // 1. Cria o cabeçalho
      const { data: cot, error: cotErr } = await supabase.from('cmp_cotacoes').insert({
        empresa_id: empresaId,
        comprador_id: profile!.id,
        titulo: titulo.trim(),
        observacoes: observacoes.trim() || null,
        prazo_resposta: prazoResposta || null,
      }).select('id').single()
      if (cotErr || !cot) throw cotErr ?? new Error('Falha ao criar cotação')

      // 2. Vincula SCs
      if (scsVinculadas.length > 0) {
        const { error } = await supabase.from('cmp_cotacoes_solicitacoes').insert(
          scsVinculadas.map(s => ({ cotacao_id: cot.id, solicitacao_id: s.id }))
        )
        if (error) throw error
      }

      // 3. Insere itens
      const { data: itensCriados, error: itensErr } = await supabase
        .from('cmp_cotacoes_itens')
        .insert(itens.map(it => ({
          cotacao_id: cot.id,
          linha: it.linha,
          solicitacao_item_id: it.solicitacao_item_id,
          produto_id: it.produto_id,
          variante_id: it.variante_id,
          unidade_medida_id: it.unidade_medida_id,
          quantidade: it.quantidade,
          observacao: it.observacao.trim() || null,
        })))
        .select('id, solicitacao_item_id')
      if (itensErr || !itensCriados) throw itensErr ?? new Error('Falha ao criar itens')

      // 4. Marca os itens da SC como 'em_cotacao'
      const scItemIds = itens.map(it => it.solicitacao_item_id).filter(Boolean) as string[]
      if (scItemIds.length > 0) {
        await supabase.from('cmp_solicitacoes_compra_itens')
          .update({ status_item: 'em_cotacao' })
          .in('id', scItemIds)
      }

      // 5. Convida fornecedores
      const { error: fornErr } = await supabase.from('cmp_cotacoes_fornecedores').insert(
        Array.from(fornecedoresSel).map(fid => ({
          cotacao_id: cot.id,
          fornecedor_id: fid,
        }))
      )
      if (fornErr) throw fornErr

      toast.success('Cotação criada')
      navigate(`/compras/cotacoes/${cot.id}`)
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Erro ao criar cotação.'
      setError(msg)
      toast.error('Erro ao criar cotação.')
    } finally {
      setSaving(false)
    }
  }

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
        <BotaoVoltar fallback="/compras/cotacoes" label="Voltar" />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Nova cotação</h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Defina o que precisa cotar, escolha os fornecedores e envie.
            </p>
          </div>
          <Button
            isDisabled={saving}
            onPress={criar}
            className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Save size={14} /> {saving ? 'Criando…' : 'Criar e abrir'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Cabeçalho */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dados gerais</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-6">
              <ChoiceField
                label="Empresa" required accent="emerald" fullWidth={false}
                value={empresaId} onChange={setEmpresaId}
                options={empresasAtivas.map(e => ({ value: e.id, label: e.nome_fantasia ?? e.razao_social }))}
              />
            </div>
            <div className="md:col-span-6">
              <Field label="Prazo de resposta">
                <input type="date" value={prazoResposta} onChange={e => setPrazoResposta(e.target.value)} className={inputCls()} />
              </Field>
            </div>
          </div>

          <Field label="Título" required>
            <input value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Material de escritório — Q1/2026" className={inputCls()} />
          </Field>

          <Field label="Observações">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} placeholder="Opcional — instruções para os fornecedores" className={inputCls()} />
          </Field>

          {/* SCs vinculadas */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                SCs vinculadas <span className="text-gray-400">({scsVinculadas.length})</span>
              </span>
              <button onClick={() => setScLookup(true)} className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1">
                <Plus size={11} /> Vincular SC aprovada
              </button>
            </div>
            {scsVinculadas.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Cotação avulsa (sem SC vinculada). Você pode vincular uma SC aprovada para rastrear a origem.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {scsVinculadas.map(s => (
                  <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-0.5 text-xs font-mono text-emerald-700 dark:text-emerald-300">
                    {s.numero}
                    <button onClick={() => desvincularSC(s.id)} className="hover:text-emerald-900 dark:hover:text-emerald-100">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Fornecedores */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Fornecedores convidados <span className="text-gray-400 dark:text-gray-500 font-normal">({fornecedoresSel.size})</span>
          </h2>
        </div>
        <div className="px-5 py-4">
          {fornecedoresAtivos.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              Nenhum fornecedor ativo. Cadastre antes em <Link to="/compras/fornecedores" className="text-emerald-600 hover:underline">Fornecedores</Link>.
            </p>
          ) : (
            <MultiSelectField
              accent="emerald"
              required
              values={Array.from(fornecedoresSel)}
              onChange={vs => setFornecedoresSel(new Set(vs))}
              emptyLabel="Selecione os fornecedores que receberão esta cotação…"
              searchPlaceholder="Buscar fornecedor por nome ou CNPJ…"
              options={fornecedoresAtivos.map(f => ({
                value: f.id,
                label: f.nome_fantasia ?? f.razao_social,
                hint: f.cnpj_cpf ?? undefined,
              }))}
              helper="Você pode buscar por nome ou CNPJ e selecionar quantos quiser."
            />
          )}
        </div>
      </section>

      {/* Itens */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Itens <span className="text-gray-400 dark:text-gray-500 font-normal">({itens.length})</span>
          </h2>
          <Button onPress={adicionarItemVazio} className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5">
            <Plus size={12} /> Adicionar item
          </Button>
        </div>

        {itens.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum item.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">#</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Produto</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-32">Quantidade</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-16">UoM</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 min-w-[180px]">Observação</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-24">Origem</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {itens.map(item => (
                  <tr key={item.linha} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/40">
                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500 font-mono">{item.linha}</td>
                    <td className="px-3 py-2">
                      {item.produto ? (
                        <button onClick={() => setProdutoLookup({ linha: item.linha })} className="w-full text-left rounded-lg hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 px-2 py-1">
                          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{item.produto.nome}</span>
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400 font-mono">{item.produto.codigo}</span>
                        </button>
                      ) : (
                        <button onClick={() => setProdutoLookup({ linha: item.linha })} className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-2.5 py-1.5 text-sm text-gray-500 hover:border-emerald-400 hover:text-emerald-600 w-full">
                          <Search size={13} /> Selecionar produto…
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" step="0.001" value={item.quantidade}
                        onChange={e => atualizarItem(item.linha, { quantidade: parseFloat(e.target.value) || 0 })}
                        className={cellInputCls()} />
                    </td>
                    <td className="px-3 py-2 text-gray-500 text-xs">{item.unidade_medida_sigla ?? '—'}</td>
                    <td className="px-3 py-2">
                      <input value={item.observacao} onChange={e => atualizarItem(item.linha, { observacao: e.target.value })}
                        placeholder="Opcional" className={cellInputCls()} />
                    </td>
                    <td className="px-3 py-2 text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                      {item.solicitacao_numero ?? '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => removerItem(item.linha)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 mx-auto">
                        <Trash2 size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {produtoLookup && (
        <LookupProdutos
          onSelecionar={p => selecionarProduto(produtoLookup.linha, p)}
          onFechar={() => setProdutoLookup(null)}
        />
      )}

      {scLookup && (
        <LookupSCs
          jaVinculadas={scsVinculadas.map(s => s.id)}
          onAdd={(scs) => vincularSCs(scs)}
          onFechar={() => setScLookup(false)}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Lookup de produtos
// ────────────────────────────────────────────────────────────────

function LookupProdutos({ onSelecionar, onFechar }: {
  onSelecionar: (p: PrdProduto & { unidade_medida?: PrdUnidadeMedida }) => void
  onFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [resultados, setResultados] = useState<(PrdProduto & { unidade_medida?: PrdUnidadeMedida })[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { const t = setTimeout(() => setDebounced(busca.trim()), 250); return () => clearTimeout(t) }, [busca])

  const buscar = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('prd_produtos').select('*, unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)').eq('ativo', true).order('nome').limit(30)
    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) q = q.or(`nome.ilike.%${term}%,codigo.ilike.%${term}%`)
    const { data } = await q
    setResultados((data ?? []) as unknown as (PrdProduto & { unidade_medida?: PrdUnidadeMedida })[])
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
            placeholder="Buscar por nome ou código…"
            className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-900 dark:text-gray-100" />
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : resultados.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhum produto encontrado.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {resultados.map(p => (
                <li key={p.id}>
                  <button onClick={() => onSelecionar(p)} className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20">
                    <Package size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                      <p className="text-xs text-gray-500 font-mono">
                        {p.codigo}{p.unidade_medida?.sigla && ` · ${p.unidade_medida.sigla}`}
                      </p>
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

// ────────────────────────────────────────────────────────────────
// Lookup de SCs aprovadas
// ────────────────────────────────────────────────────────────────

function LookupSCs({ jaVinculadas, onAdd, onFechar }: {
  jaVinculadas: string[]
  onAdd: (scs: { id: string; numero: string; itens: ItemForm[] }[]) => void
  onFechar: () => void
}) {
  const [scs, setScs] = useState<(CmpSolicitacao & { itens?: (CmpSolicitacaoItem & { produto?: PrdProduto, unidade_medida?: PrdUnidadeMedida })[] })[]>([])
  const [sel, setSel] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const { data } = await supabase
        .from('cmp_solicitacoes_compra')
        .select(`
          *,
          itens:cmp_solicitacoes_compra_itens(*,
            produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo),
            unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
          )
        `)
        .eq('status', 'aprovada')
        .order('created_at', { ascending: false })
        .limit(50)
      setScs(((data ?? []) as unknown as (CmpSolicitacao & { itens?: (CmpSolicitacaoItem & { produto?: PrdProduto; unidade_medida?: PrdUnidadeMedida })[] })[])
        .filter(sc => !jaVinculadas.includes(sc.id)))
      setLoading(false)
    }
    carregar()
  }, [jaVinculadas])

  function confirmar() {
    const escolhidas = scs.filter(s => sel.has(s.id)).map(s => ({
      id: s.id,
      numero: s.numero,
      itens: (s.itens ?? [])
        .filter(it => it.status_item === 'pendente')
        .map((it, idx) => ({
          linha: idx + 1,
          produto_id: it.produto_id,
          produto: it.produto as PrdProduto | undefined,
          variante_id: it.variante_id,
          unidade_medida_id: it.unidade_medida_id,
          unidade_medida_sigla: it.unidade_medida?.sigla,
          quantidade: Number(it.quantidade),
          observacao: it.observacao ?? '',
          solicitacao_item_id: it.id,
          solicitacao_numero: s.numero,
        })),
    }))
    onAdd(escolhidas)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Vincular SCs aprovadas</h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10"><div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" /></div>
          ) : scs.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">Nenhuma SC aprovada disponível.</p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {scs.map(s => {
                const selected = sel.has(s.id)
                const itensPendentes = (s.itens ?? []).filter(it => it.status_item === 'pendente').length
                return (
                  <li key={s.id}>
                    <button onClick={() => setSel(prev => { const n = new Set(prev); if (n.has(s.id)) n.delete(s.id); else n.add(s.id); return n })}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-left ${selected ? 'bg-emerald-50/60 dark:bg-emerald-950/30' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/60'}`}>
                      <div className={`flex h-5 w-5 items-center justify-center rounded border ${selected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300 dark:border-gray-600'}`}>
                        {selected && <Check size={12} className="text-white" />}
                      </div>
                      <FileText size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{s.numero}</p>
                        <p className="text-xs text-gray-500 truncate">{s.justificativa ?? 'Sem justificativa'}</p>
                      </div>
                      <span className="text-xs text-gray-400">{itensPendentes} {itensPendentes === 1 ? 'item' : 'itens'}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancelar</button>
          <Button isDisabled={sel.size === 0} onPress={confirmar} className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium">
            Vincular {sel.size > 0 && `(${sel.size})`}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}

function cellInputCls() {
  return 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-2 py-1 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
