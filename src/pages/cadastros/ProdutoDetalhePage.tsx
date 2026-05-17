import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ChevronLeft, Plus, Power, Edit2, Lock, Package, Tag } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  PrdProduto,
  PrdVariante,
  PrdAtributo,
  PrdAtributoValor,
  PrdUnidadeMedida,
} from '@/types/database'

// ── Tipos locais ─────────────────────────────────────────────

interface VarianteComAtributos extends PrdVariante {
  atributosMap: Record<string, string> // atributo.nome → valor
}

interface AtributoComValores extends PrdAtributo {
  valores: PrdAtributoValor[]
}

// ── Dialog: Nova / Editar Variante ───────────────────────────

interface DialogVarianteProps {
  produtoId: string
  atributos: AtributoComValores[]
  unidades: PrdUnidadeMedida[]
  unidadeBaseSigla: string
  variante?: PrdVariante
  onSalvar: () => void
  onFechar: () => void
}

function DialogVariante({
  produtoId,
  atributos,
  unidades,
  unidadeBaseSigla,
  variante,
  onSalvar,
  onFechar,
}: DialogVarianteProps) {
  const isEditing = !!variante

  const [sku, setSku] = useState(variante?.sku ?? '')
  const [preco, setPreco] = useState(variante?.preco_referencia?.toString() ?? '')
  const [unidadeId, setUnidadeId] = useState(variante?.unidade_medida_id ?? '')
  const [atributoSelecionado, setAtributoSelecionado] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!variante) return
    async function carregarAtributosVariante() {
      const { data } = await supabase
        .from('prd_variante_atributos')
        .select('atributo_id, atributo_valor_id')
        .eq('variante_id', variante!.id)
      if (!data) return
      const map: Record<string, string> = {}
      data.forEach(va => { map[va.atributo_id] = va.atributo_valor_id })
      setAtributoSelecionado(map)
    }
    carregarAtributosVariante()
  }, [variante])

  async function handleSalvar() {
    setSaving(true)
    setError(null)

    const payload = {
      produto_id: produtoId,
      sku: sku.trim() || null,
      preco_referencia: preco ? parseFloat(preco) : null,
      unidade_medida_id: unidadeId || null,
    }

    let varianteId = variante?.id

    if (isEditing) {
      const { error } = await supabase.from('prd_variantes').update(payload).eq('id', varianteId!)
      if (error) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('prd_variantes').insert(payload).select('id').single()
      if (error || !data) { setError('Erro ao criar variante.'); setSaving(false); return }
      varianteId = data.id
    }

    // Sincronizar atributos: apaga e reinseride (simples e correto)
    await supabase.from('prd_variante_atributos').delete().eq('variante_id', varianteId!)

    const vinculos = Object.entries(atributoSelecionado)
      .filter(([, valorId]) => !!valorId)
      .map(([atributoId, valorId]) => ({
        variante_id: varianteId!,
        atributo_id: atributoId,
        atributo_valor_id: valorId,
      }))

    if (vinculos.length > 0) {
      const { error } = await supabase.from('prd_variante_atributos').insert(vinculos)
      if (error) { setError('Erro ao salvar atributos.'); setSaving(false); return }
    }

    setSaving(false)
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Editar variante' : 'Nova variante'}
          </h2>
        </div>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Atributos */}
          {atributos.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Especificações</p>
              {atributos.map(attr => (
                <div key={attr.id} className="space-y-1.5">
                  <label className="block text-sm text-gray-600 dark:text-gray-400">{attr.nome}</label>
                  <select
                    value={atributoSelecionado[attr.id] ?? ''}
                    onChange={e => setAtributoSelecionado(prev => ({ ...prev, [attr.id]: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">— Não especificado —</option>
                    {attr.valores.map(v => (
                      <option key={v.id} value={v.id}>{v.valor}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}

          {atributos.length === 0 && !isEditing && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-3 py-2.5 text-sm text-blue-700 dark:text-blue-400">
              Nenhum atributo cadastrado. A variante será criada como "padrão" (sem especificações).
            </div>
          )}

          {/* SKU e Preço */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">SKU / Cód. de barras</label>
              <input
                type="text"
                value={sku}
                onChange={e => setSku(e.target.value)}
                placeholder="Opcional"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço de referência</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={preco}
                onChange={e => setPreco(e.target.value)}
                placeholder="0,00"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Unidade sobrescrita */}
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Unidade de medida
              <span className="ml-1.5 text-xs font-normal text-gray-400 dark:text-gray-500">
                (padrão: {unidadeBaseSigla})
              </span>
            </label>
            <select
              value={unidadeId}
              onChange={e => setUnidadeId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Herdar do produto ({unidadeBaseSigla})</option>
              {unidades.map(u => (
                <option key={u.id} value={u.id}>{u.nome} ({u.sigla})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <button
            onClick={onFechar}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Cancelar
          </button>
          <Button
            isDisabled={saving}
            onClick={handleSalvar}
            className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar variante'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Dialog: Gerenciar Atributos do Produto ───────────────────

interface DialogAtributosProps {
  produtoId: string
  atributosGlobais: AtributoComValores[]
  atributosVinculados: string[]
  onSalvar: () => void
  onFechar: () => void
}

function DialogAtributos({ atributosGlobais, atributosVinculados, onSalvar, onFechar }: DialogAtributosProps) {
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set(atributosVinculados))
  const [novoAtributo, setNovoAtributo] = useState('')
  const [novoValor, setNovoValor] = useState('')
  const [atributoParaValor, setAtributoParaValor] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggle(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function criarAtributo() {
    if (!novoAtributo.trim()) return
    const { error } = await supabase
      .from('prd_atributos')
      .insert({ nome: novoAtributo.trim(), tipo_dado: 'lista' })
    if (error) { setError('Erro ao criar atributo.'); return }
    setNovoAtributo('')
    onSalvar()
  }

  async function criarValor() {
    if (!atributoParaValor || !novoValor.trim()) return
    const { error } = await supabase
      .from('prd_atributo_valores')
      .insert({ atributo_id: atributoParaValor, valor: novoValor.trim() })
    if (error) { setError('Esse valor já existe ou houve um erro.'); return }
    setNovoValor('')
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Gerenciar atributos</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Atributos marcados estarão disponíveis ao criar variantes deste produto.
          </p>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-5">
          {error && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Lista de atributos globais */}
          <div className="space-y-2">
            {atributosGlobais.map(attr => (
              <div key={attr.id} className="rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`attr-${attr.id}`}
                      checked={selecionados.has(attr.id)}
                      onChange={() => toggle(attr.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                    <label htmlFor={`attr-${attr.id}`} className="text-sm font-medium text-gray-800 dark:text-gray-200 cursor-pointer">
                      {attr.nome}
                    </label>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {attr.valores.length} valor{attr.valores.length !== 1 ? 'es' : ''}
                    </span>
                  </div>
                  <button
                    onClick={() => setAtributoParaValor(atributoParaValor === attr.id ? null : attr.id)}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    + valor
                  </button>
                </div>
                {/* Valores */}
                {attr.valores.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-4 pb-3">
                    {attr.valores.map(v => (
                      <span key={v.id} className="rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs text-gray-600 dark:text-gray-300">
                        {v.valor}
                      </span>
                    ))}
                  </div>
                )}
                {/* Form novo valor */}
                {atributoParaValor === attr.id && (
                  <div className="flex items-center gap-2 px-4 pb-3">
                    <input
                      type="text"
                      value={novoValor}
                      onChange={e => setNovoValor(e.target.value)}
                      placeholder={`Novo valor para ${attr.nome}…`}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                      onKeyDown={e => e.key === 'Enter' && criarValor()}
                    />
                    <button
                      onClick={criarValor}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors"
                    >
                      Adicionar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Criar novo atributo */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Novo atributo</p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={novoAtributo}
                onChange={e => setNovoAtributo(e.target.value)}
                placeholder="Ex: Tamanho, Material, Cor…"
                className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                onKeyDown={e => e.key === 'Enter' && criarAtributo()}
              />
              <button
                onClick={criarAtributo}
                className="rounded-lg bg-gray-100 dark:bg-gray-800 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <button
            onClick={onFechar}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Fechar
          </button>
          <Button
            isDisabled={saving}
            onClick={async () => {
              setSaving(true)
              setSaving(false)
              onFechar()
            }}
            className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium"
          >
            {saving ? 'Salvando…' : 'Concluir'}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ─────────────────────────────────────────

export function ProdutoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [produto, setProduto] = useState<PrdProduto | null>(null)
  const [variantes, setVariantes] = useState<VarianteComAtributos[]>([])
  const [atributos, setAtributos] = useState<AtributoComValores[]>([])
  const [unidades, setUnidades] = useState<PrdUnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogVariante, setDialogVariante] = useState(false)
  const [editandoVariante, setEditandoVariante] = useState<PrdVariante | null>(null)
  const [dialogAtributos, setDialogAtributos] = useState(false)

  async function fetchData() {
    if (!id) return
    setLoading(true)

    const [
      { data: prod },
      { data: vars },
      { data: attrs },
      { data: unids },
    ] = await Promise.all([
      supabase
        .from('prd_produtos')
        .select('*, unidade_medida:prd_unidades_medida(id, nome, sigla, ativo)')
        .eq('id', id)
        .single(),
      supabase
        .from('prd_variantes')
        .select(`
          *,
          prd_variante_atributos(
            atributo_id,
            atributo_valor_id,
            atributo:prd_atributos(id, nome, ordem),
            atributo_valor:prd_atributo_valores(id, valor)
          )
        `)
        .eq('produto_id', id)
        .order('created_at'),
      supabase
        .from('prd_atributos')
        .select('*, valores:prd_atributo_valores(id, atributo_id, valor, ordem)')
        .eq('ativo', true)
        .order('ordem'),
      supabase
        .from('prd_unidades_medida')
        .select('*')
        .eq('ativo', true)
        .order('nome'),
    ])

    setProduto(prod ?? null)
    setAtributos((attrs ?? []) as AtributoComValores[])
    setUnidades(unids ?? [])

    // Montar map de atributos por variante
    const varsComAtributos: VarianteComAtributos[] = (vars ?? []).map(v => {
      const map: Record<string, string> = {}
      const links = (v as { prd_variante_atributos: Array<{ atributo: { nome: string }, atributo_valor: { valor: string } }> }).prd_variante_atributos ?? []
      links.forEach((va) => {
        if (va.atributo && va.atributo_valor) {
          map[va.atributo.nome] = va.atributo_valor.valor
        }
      })
      return { ...v, atributosMap: map }
    })
    setVariantes(varsComAtributos)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [id])

  async function toggleVariante(v: PrdVariante) {
    if (!isAdmin) return
    await supabase.from('prd_variantes').update({ ativo: !v.ativo }).eq('id', v.id)
    fetchData()
  }

  const unidadeBase = produto?.unidade_medida as PrdUnidadeMedida | undefined
  const atributosUsados = atributos.filter(a =>
    variantes.some(v => Object.keys(v.atributosMap).includes(a.nome))
  )
  const colunaAtributos = atributosUsados.length > 0
    ? atributosUsados
    : atributos.slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!produto) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Produto não encontrado.</p>
        <Link to="/cadastros/produtos" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          Voltar para listagem
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb + header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            to="/cadastros/produtos"
            className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors mb-2"
          >
            <ChevronLeft size={14} />
            Produtos
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-900/30">
              <Package size={18} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{produto.nome}</h1>
                {!produto.ativo && (
                  <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-xs font-semibold text-red-600 dark:text-red-400">
                    Inativo
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{produto.codigo}</p>
            </div>
          </div>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDialogAtributos(true)}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <Tag size={14} />
              Atributos
            </button>
            <Button
              onClick={() => setDialogVariante(true)}
              className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={15} />
              Nova variante
            </Button>
          </div>
        )}
      </div>

      {/* Info do produto */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Código</p>
              <p className="text-sm font-mono text-gray-800 dark:text-gray-200">{produto.codigo}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Unidade base</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {unidadeBase ? `${unidadeBase.nome} (${unidadeBase.sigla})` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Variantes</p>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {variantes.filter(v => v.ativo).length} ativa{variantes.filter(v => v.ativo).length !== 1 ? 's' : ''}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">Status</p>
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                produto.ativo
                  ? 'bg-green-100 dark:bg-green-950/40 text-green-700 dark:text-green-400'
                  : 'bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400'
              }`}>
                {produto.ativo ? 'Ativo' : 'Inativo'}
              </span>
            </div>
          </div>
          {produto.descricao && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">Descrição</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{produto.descricao}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Matriz de variantes */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-3">Variantes</h2>
        {!isAdmin && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400 mb-3 w-fit">
            <Lock size={12} />
            Somente leitura
          </div>
        )}
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="p-0">
            {variantes.length === 0 ? (
              <div className="py-12 text-center">
                <Package size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma variante cadastrada.</p>
                {isAdmin && (
                  <button
                    onClick={() => setDialogVariante(true)}
                    className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Criar primeira variante
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        SKU
                      </th>
                      {colunaAtributos.map(a => (
                        <th key={a.id} className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                          {a.nome}
                        </th>
                      ))}
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Preço ref.
                      </th>
                      <th className="px-5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                        Unidade
                      </th>
                      <th className="px-5 py-2.5 w-20" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {variantes.map(v => {
                      const uSigla = v.unidade_medida_id
                        ? (unidades.find(u => u.id === v.unidade_medida_id)?.sigla ?? '—')
                        : unidadeBase?.sigla ?? '—'
                      return (
                        <tr key={v.id} className={`hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${!v.ativo ? 'opacity-50' : ''}`}>
                          <td className="px-5 py-3 font-mono text-gray-500 dark:text-gray-400">
                            {v.sku ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                          </td>
                          {colunaAtributos.map(a => (
                            <td key={a.id} className="px-5 py-3 text-gray-700 dark:text-gray-300">
                              {v.atributosMap[a.nome] ?? <span className="text-gray-300 dark:text-gray-600">—</span>}
                            </td>
                          ))}
                          <td className="px-5 py-3 text-gray-700 dark:text-gray-300">
                            {v.preco_referencia != null
                              ? v.preco_referencia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : <span className="text-gray-300 dark:text-gray-600">—</span>
                            }
                          </td>
                          <td className="px-5 py-3 text-gray-500 dark:text-gray-400">{uSigla}</td>
                          <td className="px-5 py-3">
                            {isAdmin && (
                              <div className="flex items-center gap-1 justify-end">
                                <button
                                  onClick={() => setEditandoVariante(v)}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                                  title="Editar variante"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => toggleVariante(v)}
                                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                                    v.ativo
                                      ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500'
                                      : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600'
                                  }`}
                                  title={v.ativo ? 'Inativar' : 'Reativar'}
                                >
                                  <Power size={13} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      {(dialogVariante || editandoVariante) && (
        <DialogVariante
          produtoId={produto.id}
          atributos={atributos}
          unidades={unidades}
          unidadeBaseSigla={unidadeBase?.sigla ?? 'un'}
          variante={editandoVariante ?? undefined}
          onSalvar={() => { setDialogVariante(false); setEditandoVariante(null); fetchData() }}
          onFechar={() => { setDialogVariante(false); setEditandoVariante(null) }}
        />
      )}

      {dialogAtributos && (
        <DialogAtributos
          produtoId={produto.id}
          atributosGlobais={atributos}
          atributosVinculados={atributosUsados.map(a => a.id)}
          onSalvar={() => fetchData()}
          onFechar={() => setDialogAtributos(false)}
        />
      )}
    </div>
  )
}
