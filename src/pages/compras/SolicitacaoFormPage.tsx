import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  ChevronLeft, Send, Plus, Trash2, Search, Package, X, AlertCircle, Network,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { ChoiceField } from '@/components/ui/ChoiceField'
import type {
  CmpPrioridade,
  CoreDepartamento, CoreEmpresa,
  PrdProduto, PrdUnidadeMedida,
} from '@/types/database'

interface ItemForm {
  linha: number
  produto_id: string
  produto?: PrdProduto
  variante_id: string | null
  unidade_medida_id: string
  quantidade: number
  preco_estimado: number | null
  observacao: string
}

export function SolicitacaoFormPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [empresas, setEmpresas] = useState<CoreEmpresa[]>([])
  const [departamento, setDepartamento] = useState<CoreDepartamento | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cabeçalho
  const [empresaId, setEmpresaId] = useState('')
  const [prioridade, setPrioridade] = useState<CmpPrioridade>('normal')
  const [dataNecessaria, setDataNecessaria] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [observacoes, setObservacoes] = useState('')

  const [itens, setItens] = useState<ItemForm[]>([])
  const [produtoLookup, setProdutoLookup] = useState<{ linha: number } | null>(null)

  const empresasAtivas = useMemo(() => empresas.filter(e => e.ativo), [empresas])

  // Carrega master data
  useEffect(() => {
    let cancelled = false
    async function carregar() {
      setLoading(true)
      const empResp = await supabase.from('core_empresas').select('*').eq('ativo', true).order('razao_social')

      let depto: CoreDepartamento | null = null
      if (profile?.departamento_id) {
        const { data } = await supabase
          .from('core_departamentos')
          .select('*, gestor:profiles!core_departamentos_gestor_id_fkey(id,nome,email)')
          .eq('id', profile.departamento_id)
          .maybeSingle()
        depto = data as CoreDepartamento | null
      }

      if (cancelled) return
      setEmpresas(empResp.data ?? [])
      setDepartamento(depto)

      const emp = (empResp.data ?? []).find(e => e.ativo)
      if (emp) setEmpresaId(emp.id)
      setLoading(false)
    }
    carregar()
    return () => { cancelled = true }
  }, [profile?.departamento_id])

  function adicionarItemVazio() {
    setItens(prev => [
      ...prev,
      {
        linha: prev.length + 1,
        produto_id: '',
        variante_id: null,
        unidade_medida_id: '',
        quantidade: 1,
        preco_estimado: null,
        observacao: '',
      },
    ])
    setProdutoLookup({ linha: itens.length + 1 })
  }

  function removerItem(linha: number) {
    setItens(prev => prev.filter(it => it.linha !== linha).map((it, idx) => ({ ...it, linha: idx + 1 })))
  }

  function selecionarProduto(linha: number, produto: PrdProduto) {
    setItens(prev => prev.map(it => it.linha === linha
      ? { ...it, produto_id: produto.id, produto, unidade_medida_id: produto.unidade_medida_id }
      : it
    ))
    setProdutoLookup(null)
  }

  function atualizarItem(linha: number, patch: Partial<ItemForm>) {
    setItens(prev => prev.map(it => it.linha === linha ? { ...it, ...patch } : it))
  }

  function validar(): string | null {
    if (!profile?.id) return 'Você precisa estar autenticado.'
    if (!profile.departamento_id) return 'Você não está vinculado a nenhum departamento. Peça ao administrador para te atribuir um.'
    if (!empresaId) return 'Selecione uma empresa.'
    if (!justificativa.trim()) return 'Informe uma justificativa.'
    if (itens.length === 0) return 'Adicione ao menos um item.'
    for (const it of itens) {
      if (!it.produto_id)         return `Linha ${it.linha}: selecione o produto.`
      if (!it.unidade_medida_id)  return `Linha ${it.linha}: unidade de medida obrigatória.`
      if (!(it.quantidade > 0))   return `Linha ${it.linha}: quantidade deve ser maior que zero.`
    }
    return null
  }

  async function criarEEnviar() {
    const erro = validar()
    if (erro) { setError(erro); toast.error(erro); return }
    setError(null); setSending(true)
    try {
      const agora = new Date().toISOString()

      const { data: sc, error: scErr } = await supabase.from('cmp_solicitacoes_compra').insert({
        empresa_id: empresaId,
        departamento_id: profile!.departamento_id!,
        solicitante_id: profile!.id,
        prioridade,
        data_necessaria: dataNecessaria || null,
        justificativa: justificativa.trim() || null,
        observacoes: observacoes.trim() || null,
        status: 'aguardando_aprovacao',
        enviada_em: agora,
      }).select('id').single()
      if (scErr || !sc) throw scErr ?? new Error('Falha ao criar')

      const payloadItens = itens.map(it => ({
        solicitacao_id: sc.id,
        linha: it.linha,
        produto_id: it.produto_id,
        variante_id: it.variante_id,
        unidade_medida_id: it.unidade_medida_id,
        quantidade: it.quantidade,
        preco_estimado: it.preco_estimado,
        observacao: it.observacao.trim() || null,
      }))
      const { error: itensError } = await supabase.from('cmp_solicitacoes_compra_itens').insert(payloadItens)
      if (itensError) throw itensError

      await supabase.from('cmp_aprovacoes').insert({
        documento_tipo: 'solicitacao',
        documento_id: sc.id,
        aprovador_id: profile!.id,
        acao: 'enviou',
        comentario: null,
      })

      toast.success('Solicitação enviada para aprovação')
      navigate(`/compras/solicitacoes/${sc.id}`)
    } catch (err) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Erro ao criar.'
      setError(msg)
      toast.error('Erro ao enviar solicitação.')
    } finally {
      setSending(false)
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
        <Link
          to="/compras/solicitacoes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors mb-2"
        >
          <ChevronLeft size={14} /> Solicitações
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
              Nova solicitação de compra
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Preencha os dados, adicione itens e envie para aprovação do gestor do seu departamento.
            </p>
          </div>
          <Button
            isDisabled={sending}
            onPress={criarEEnviar}
            className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Send size={14} /> {sending ? 'Enviando…' : 'Enviar para aprovação'}
          </Button>
        </div>
      </div>

      {/* Aviso: sem departamento */}
      {!profile?.departamento_id && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Você não está vinculado a um departamento</p>
            <p className="mt-0.5">Para criar solicitações, peça ao administrador que atribua um departamento ao seu usuário em <strong>Admin → Usuários</strong>.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* ── CABEÇALHO ───────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dados gerais</h2>
        </div>
        <div className="px-5 py-4 space-y-4">
          {/* Linha 1: Empresa + Prioridade */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-5">
              <ChoiceField
                label="Empresa"
                required
                accent="emerald"
                fullWidth={false}
                value={empresaId}
                onChange={setEmpresaId}
                options={empresasAtivas.map(e => ({
                  value: e.id,
                  label: e.nome_fantasia ?? e.razao_social,
                }))}
              />
            </div>
            <div className="md:col-span-7">
              <ChoiceField
                label="Prioridade"
                fullWidth={false}
                value={prioridade}
                onChange={v => setPrioridade(v as CmpPrioridade)}
                options={[
                  { value: 'baixa',   label: 'Baixa',   tone: 'gray'  },
                  { value: 'normal',  label: 'Normal',  tone: 'blue'  },
                  { value: 'alta',    label: 'Alta',    tone: 'amber' },
                  { value: 'urgente', label: 'Urgente', tone: 'red'   },
                ]}
              />
            </div>
          </div>

          {/* Linha 2: Departamento + Solicitante + Data necessária */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Departamento (do solicitante)">
              <div className="flex items-center gap-2 h-9 px-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm">
                <Network size={14} className="text-gray-400 shrink-0" />
                <span className="truncate text-gray-700 dark:text-gray-200">
                  {departamento
                    ? (departamento.codigo ? `${departamento.codigo} · ${departamento.nome}` : departamento.nome)
                    : <span className="text-amber-600 dark:text-amber-400">— sem departamento —</span>
                  }
                </span>
              </div>
              {departamento?.gestor && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                  Aprovador: <strong>{departamento.gestor.nome ?? departamento.gestor.email}</strong>
                </p>
              )}
            </Field>

            <Field label="Solicitante">
              <input
                type="text"
                value={profile?.nome ?? profile?.email ?? ''}
                disabled
                className={inputCls() + ' bg-gray-50 dark:bg-gray-800/50 cursor-not-allowed text-gray-500 dark:text-gray-400'}
              />
            </Field>

            <Field label="Data necessária">
              <input
                type="date"
                value={dataNecessaria}
                onChange={e => setDataNecessaria(e.target.value)}
                className={inputCls()}
              />
            </Field>
          </div>

          {/* Linha 3: Justificativa + Observações lado a lado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Justificativa" required>
              <textarea
                value={justificativa}
                onChange={e => setJustificativa(e.target.value)}
                placeholder="Por que esta compra é necessária? (lido pelo aprovador)"
                rows={3}
                className={inputCls() + ' resize-y min-h-[80px]'}
              />
            </Field>

            <Field label="Observações">
              <textarea
                value={observacoes}
                onChange={e => setObservacoes(e.target.value)}
                placeholder="Informações para o comprador / fornecedor (opcional)"
                rows={3}
                className={inputCls() + ' resize-y min-h-[80px]'}
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ── ITENS ──────────────────────────────────────────────── */}
      <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            Itens <span className="text-gray-400 dark:text-gray-500 font-normal">({itens.length})</span>
          </h2>
          <Button
            onPress={adicionarItemVazio}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1.5 text-xs font-medium flex items-center gap-1.5"
          >
            <Plus size={12} /> Adicionar item
          </Button>
        </div>

        {itens.length === 0 ? (
          <div className="py-12 text-center">
            <Package size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum item ainda.</p>
            <button
              onClick={adicionarItemVazio}
              className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Adicionar primeiro item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">#</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 min-w-[260px]">Produto / Serviço</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-32">Quantidade</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-32">Preço estim.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 min-w-[220px]">Observação</th>
                  <th className="px-3 py-2 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {itens.map(item => (
                  <tr key={item.linha} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-3 py-2 text-gray-400 dark:text-gray-500 font-mono">{item.linha}</td>
                    <td className="px-3 py-2">
                      {item.produto ? (
                        <button
                          onClick={() => setProdutoLookup({ linha: item.linha })}
                          className="w-full text-left rounded-lg border border-transparent hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 px-2 py-1 transition-colors"
                        >
                          <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{item.produto.nome}</span>
                          <span className="block text-[11px] text-gray-500 dark:text-gray-400">
                            <span className="font-mono">{item.produto.codigo}</span>
                            {item.produto.tipo === 'servico' && <span className="ml-2 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-semibold">SERVIÇO</span>}
                          </span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setProdutoLookup({ linha: item.linha })}
                          className="flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-2.5 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:border-emerald-400 hover:text-emerald-600 transition-colors w-full"
                        >
                          <Search size={13} /> Selecionar produto…
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0" step="0.001"
                        value={item.quantidade}
                        onChange={e => atualizarItem(item.linha, { quantidade: parseFloat(e.target.value) || 0 })}
                        className={cellInputCls()}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number" min="0" step="0.01"
                        value={item.preco_estimado ?? ''}
                        onChange={e => atualizarItem(item.linha, { preco_estimado: e.target.value ? parseFloat(e.target.value) : null })}
                        placeholder="—"
                        className={cellInputCls()}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={item.observacao}
                        onChange={e => atualizarItem(item.linha, { observacao: e.target.value })}
                        placeholder="Opcional"
                        className={cellInputCls()}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        onClick={() => removerItem(item.linha)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 transition-colors mx-auto"
                        title="Remover linha"
                      >
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

      {/* Lookup de produtos */}
      {produtoLookup && (
        <LookupProdutos
          onSelecionar={(p) => selecionarProduto(produtoLookup.linha, p)}
          onFechar={() => setProdutoLookup(null)}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Lookup modal: busca produto no catálogo
// ────────────────────────────────────────────────────────────────

function LookupProdutos({ onSelecionar, onFechar }: {
  onSelecionar: (p: PrdProduto) => void
  onFechar: () => void
}) {
  const [busca, setBusca] = useState('')
  const [debounced, setDebounced] = useState('')
  const [resultados, setResultados] = useState<(PrdProduto & { unidade_medida?: PrdUnidadeMedida })[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => { const t = setTimeout(() => setDebounced(busca.trim()), 250); return () => clearTimeout(t) }, [busca])

  const buscar = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('prd_produtos')
      .select('*, unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)')
      .eq('ativo', true)
      .order('nome')
      .limit(30)
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
        <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center gap-2 flex-1">
            <Search size={15} className="text-gray-400 shrink-0" />
            <input
              autoFocus
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome ou código…"
              className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400 text-gray-900 dark:text-gray-100"
            />
          </div>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : resultados.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum produto encontrado.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {resultados.map(p => (
                <li key={p.id}>
                  <button
                    onClick={() => onSelecionar(p)}
                    className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
                      <Package size={14} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{p.nome}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {p.codigo}
                        {p.unidade_medida?.sigla && <span className="ml-2">· {p.unidade_medida.sigla}</span>}
                        {p.tipo === 'servico' && <span className="ml-2 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-semibold">SERVIÇO</span>}
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
// Pequenos helpers visuais locais
// ────────────────────────────────────────────────────────────────

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
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}

function cellInputCls() {
  return 'w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-2 py-1 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
