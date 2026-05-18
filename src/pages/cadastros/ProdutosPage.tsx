import { useCallback, useEffect, useState } from 'react'
import {
  Search, Plus, Power, Edit2, Lock, ChevronRight,
  Package, Tag, X, Check, ChevronDown
} from 'lucide-react'
import {
  Button, Card, CardContent,
  TextField, Label, Input,
  Select, SelectTrigger, SelectValue, SelectIndicator, SelectPopover,
  ListBox, ListBoxItem,
} from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  PrdProduto, PrdVariante, PrdUnidadeMedida,
  PrdAtributo, PrdAtributoValor,
} from '@/types/database'

// ─────────────────────────────────────────────────────────────
// Tipos locais
// ─────────────────────────────────────────────────────────────

interface VarianteRica extends PrdVariante {
  atributosMap: Record<string, string>
}

interface AtributoRico extends PrdAtributo {
  valores: PrdAtributoValor[]
}

// ─────────────────────────────────────────────────────────────
// Helpers de UI — wrappers sobre HeroUI v3
// ─────────────────────────────────────────────────────────────

function FInput({ label, value, onChange, placeholder, type = 'text', isRequired = false }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; isRequired?: boolean
}) {
  return (
    <TextField
      value={value}
      onChange={onChange}
      type={type}
      isRequired={isRequired}
      className="flex flex-col gap-1 w-full"
    >
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
        {label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Input
        placeholder={placeholder}
        className="w-full h-9 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </TextField>
  )
}

function FSelect({ label, value, onChange, items, emptyLabel, isRequired = false }: {
  label: string; value: string; onChange: (v: string) => void
  items: { key: string; label: string }[]; emptyLabel?: string; isRequired?: boolean
}) {
  const allItems = emptyLabel
    ? [{ key: '', label: emptyLabel }, ...items]
    : items

  return (
    <Select
      selectedKey={value}
      onSelectionChange={k => onChange(k as string)}
      isRequired={isRequired}
      className="flex flex-col gap-1 w-full"
    >
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
        {label}{isRequired && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <SelectTrigger className="flex w-full h-9 items-center justify-between rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 text-sm text-gray-900 dark:text-gray-100 outline-none transition-colors hover:border-gray-400 dark:hover:border-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 cursor-pointer">
        <SelectValue className="flex-1 text-left truncate data-[placeholder]:text-gray-400" />
        <SelectIndicator>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </SelectIndicator>
      </SelectTrigger>
      <SelectPopover className="w-[--trigger-width] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50">
        <ListBox className="max-h-60 overflow-y-auto py-1 outline-none">
          {allItems.map(i => (
            <ListBoxItem
              key={i.key}
              id={i.key}
              className="px-3 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer outline-none transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 selected:bg-blue-50 dark:selected:bg-blue-900/30 selected:text-blue-700 dark:selected:text-blue-300 selected:font-medium"
            >
              {i.label}
            </ListBoxItem>
          ))}
        </ListBox>
      </SelectPopover>
    </Select>
  )
}

function Modal({ title, subtitle, onClose, children, footer }: {
  title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
            {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 mt-0.5"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5 space-y-4 flex-1">{children}</div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4 shrink-0">{footer}</div>
      </div>
    </div>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">{msg}</div>
  )
}

// ─────────────────────────────────────────────────────────────
// Painel de Atributos — por produto, na mini-aba "Atributos"
// ─────────────────────────────────────────────────────────────

function PainelAtributosProduto({ isAdmin, onAtributoChange }: {
  isAdmin: boolean
  onAtributoChange: () => void
}) {
  const [atributos, setAtributos] = useState<AtributoRico[]>([])
  const [loading, setLoading] = useState(true)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [novoNome, setNovoNome] = useState('')
  const [salvandoAttr, setSalvandoAttr] = useState(false)
  const [novoValor, setNovoValor] = useState<Record<string, string>>({})
  const [salvandoValor, setSalvandoValor] = useState<string | null>(null)
  const [editandoAttr, setEditandoAttr] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')

  async function fetchAtributos() {
    setLoading(true)
    const { data } = await supabase
      .from('prd_atributos')
      .select('*, valores:prd_atributo_valores(id,atributo_id,valor,ordem)')
      .order('ordem')
    setAtributos((data ?? []) as AtributoRico[])
    setLoading(false)
  }
  useEffect(() => { fetchAtributos() }, [])

  async function criarAtributo() {
    if (!novoNome.trim()) return
    setSalvandoAttr(true)
    await supabase.from('prd_atributos').insert({ nome: novoNome.trim(), tipo_dado: 'lista' })
    setNovoNome('')
    setSalvandoAttr(false)
    fetchAtributos()
    onAtributoChange()
  }

  async function salvarEditAtributo(id: string) {
    if (!editNome.trim()) return
    await supabase.from('prd_atributos').update({ nome: editNome.trim() }).eq('id', id)
    setEditandoAttr(null)
    fetchAtributos()
    onAtributoChange()
  }

  async function toggleAtributo(a: AtributoRico) {
    await supabase.from('prd_atributos').update({ ativo: !a.ativo }).eq('id', a.id)
    fetchAtributos()
    onAtributoChange()
  }

  async function criarValor(atributoId: string) {
    const v = novoValor[atributoId]?.trim()
    if (!v) return
    setSalvandoValor(atributoId)
    await supabase.from('prd_atributo_valores').insert({ atributo_id: atributoId, valor: v })
    setNovoValor(prev => ({ ...prev, [atributoId]: '' }))
    setSalvandoValor(null)
    fetchAtributos()
    onAtributoChange()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {isAdmin && (
        <div className="flex items-center gap-2">
          <input
            type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
            placeholder="Novo atributo (ex: Tamanho, Cor, Material)…"
            className="flex-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
            onKeyDown={e => e.key === 'Enter' && criarAtributo()}
          />
          <Button isDisabled={salvandoAttr || !novoNome.trim()} onPress={criarAtributo}
            className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
            <Plus size={14} /> Criar
          </Button>
        </div>
      )}

      {atributos.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          Nenhum atributo.{isAdmin && ' Crie acima para definir variações deste produto.'}
        </p>
      ) : (
        <div className="space-y-2">
          {atributos.map(a => {
            const open = expandidos.has(a.id)
            return (
              <Card key={a.id} className={`border border-gray-200 dark:border-gray-700 dark:bg-gray-900 shadow-none ${!a.ativo ? 'opacity-60' : ''}`}>
                <CardContent className="p-0">
                  <div className="flex items-center gap-3 px-4 py-2.5">
                    <button
                      onClick={() => setExpandidos(prev => { const s = new Set(prev); s.has(a.id) ? s.delete(a.id) : s.add(a.id); return s })}
                      className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                    >
                      <ChevronRight size={14} className={`transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                    </button>

                    {editandoAttr === a.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input value={editNome} onChange={e => setEditNome(e.target.value)} autoFocus
                          className="flex-1 rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1 text-sm outline-none"
                          onKeyDown={e => { if (e.key === 'Enter') salvarEditAtributo(a.id); if (e.key === 'Escape') setEditandoAttr(null) }}
                        />
                        <button onClick={() => salvarEditAtributo(a.id)} className="text-green-600 hover:text-green-700"><Check size={15} /></button>
                        <button onClick={() => setEditandoAttr(null)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Tag size={13} className="text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{a.nome}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500">{a.valores.length} valor{a.valores.length !== 1 ? 'es' : ''}</span>
                        {!a.ativo && <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Inativo</span>}
                      </div>
                    )}

                    {isAdmin && editandoAttr !== a.id && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button onClick={() => { setEditandoAttr(a.id); setEditNome(a.nome) }}
                          className="flex h-7 w-7 items-center justify-center rounded text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => toggleAtributo(a)}
                          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${a.ativo ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                          title={a.ativo ? 'Inativar' : 'Reativar'}>
                          <Power size={13} />
                        </button>
                      </div>
                    )}
                  </div>

                  {open && (
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2.5 bg-gray-50/50 dark:bg-gray-800/30">
                      <div className="flex flex-wrap gap-1.5">
                        {a.valores.length === 0
                          ? <span className="text-xs text-gray-400 dark:text-gray-500">Nenhum valor. Adicione abaixo.</span>
                          : a.valores.map(v => (
                            <span key={v.id} className="rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-2.5 py-0.5 text-xs text-gray-700 dark:text-gray-300">
                              {v.valor}
                            </span>
                          ))
                        }
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={novoValor[a.id] ?? ''}
                            onChange={e => setNovoValor(prev => ({ ...prev, [a.id]: e.target.value }))}
                            placeholder={`Novo valor para ${a.nome}…`}
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            onKeyDown={e => e.key === 'Enter' && criarValor(a.id)}
                          />
                          <button onClick={() => criarValor(a.id)} disabled={salvandoValor === a.id || !novoValor[a.id]?.trim()}
                            className="rounded-lg bg-blue-600 disabled:opacity-50 px-3 py-1.5 text-sm text-white hover:bg-blue-700 transition-colors">
                            Adicionar
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Aba: Produtos (com variantes expandíveis e atributos inline)
// ─────────────────────────────────────────────────────────────

const PAGE_SIZE = 25

function AbaProdutos({ isAdmin, unidades }: {
  isAdmin: boolean
  unidades: PrdUnidadeMedida[]
}) {
  const [produtos, setProdutos] = useState<PrdProduto[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtro, setFiltro] = useState<'ativos' | 'inativos' | 'todos'>('ativos')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set())
  const [abasProduto, setAbasProduto] = useState<Record<string, 'variantes' | 'atributos'>>({})
  const [variantesCache, setVariantesCache] = useState<Record<string, VarianteRica[]>>({})
  const [loadingVar, setLoadingVar] = useState<Set<string>>(new Set())

  const [modalProduto, setModalProduto] = useState<PrdProduto | 'novo' | null>(null)
  const [modalVariante, setModalVariante] = useState<{ produtoId: string; variante?: PrdVariante } | null>(null)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Debounce da busca — evita uma query por tecla
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  // Volta para a primeira página quando o filtro ou a busca mudam
  useEffect(() => { setPage(0) }, [debouncedSearch, filtro])

  const fetchProdutos = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    let query = supabase
      .from('prd_produtos')
      .select('*, unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)', { count: 'exact' })
      .order('nome')
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todos') query = query.eq('ativo', filtro === 'ativos')

    // Remove caracteres que quebrariam a sintaxe do .or() do PostgREST
    const q = debouncedSearch.replace(/[,()%]/g, ' ').trim()
    if (q) query = query.or(`nome.ilike.%${q}%,codigo.ilike.%${q}%`)

    const { data, count } = await query
    setProdutos(data ?? [])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filtro, debouncedSearch])

  useEffect(() => { fetchProdutos() }, [fetchProdutos])

  async function carregarVariantes(id: string) {
    setLoadingVar(prev => new Set(prev).add(id))
    const { data } = await supabase
      .from('prd_variantes')
      .select(`*, prd_variante_atributos(atributo_id, atributo_valor_id, atributo:prd_atributos(id,nome,ordem), atributo_valor:prd_atributo_valores(id,valor))`)
      .eq('produto_id', id)
      .order('created_at')
    const ricas: VarianteRica[] = (data ?? []).map(v => {
      const map: Record<string, string> = {}
      const links = (v as never as { prd_variante_atributos: Array<{ atributo: { nome: string }, atributo_valor: { valor: string } }> }).prd_variante_atributos ?? []
      links.forEach(va => { if (va.atributo && va.atributo_valor) map[va.atributo.nome] = va.atributo_valor.valor })
      return { ...v, atributosMap: map }
    })
    setVariantesCache(prev => ({ ...prev, [id]: ricas }))
    setLoadingVar(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  async function toggleExpand(id: string) {
    const next = new Set(expandidos)
    if (next.has(id)) { next.delete(id); setExpandidos(next); return }
    next.add(id)
    setExpandidos(next)
    if (!variantesCache[id]) {
      await carregarVariantes(id)
    }
  }

  async function toggleProduto(p: PrdProduto) {
    await supabase.from('prd_produtos').update({ ativo: !p.ativo }).eq('id', p.id)
    fetchProdutos()
  }

  async function toggleVariante(v: PrdVariante, produtoId: string) {
    await supabase.from('prd_variantes').update({ ativo: !v.ativo }).eq('id', v.id)
    await carregarVariantes(produtoId)
  }

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap mb-4">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search" placeholder="Buscar…" value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden text-sm">
          {(['ativos', 'inativos', 'todos'] as const).map(op => (
            <button key={op} onClick={() => setFiltro(op)}
              className={`px-3 py-1.5 transition-colors ${filtro === op ? 'bg-blue-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              {op.charAt(0).toUpperCase() + op.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {!isAdmin && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Lock size={11} /> Somente leitura
          </div>
        )}
        {isAdmin && (
          <Button onPress={() => setModalProduto('novo')}
            className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-1.5 text-sm font-medium flex items-center gap-1.5">
            <Plus size={14} /> Novo produto
          </Button>
        )}
      </div>

      {/* Tabela */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : produtos.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">
              {debouncedSearch ? 'Nenhum produto encontrado.' : 'Nenhum produto cadastrado.'}
            </p>
          ) : (
            <div>
              {/* Header */}
              <div className="grid grid-cols-[32px_1fr_100px_80px_80px] gap-2 px-4 py-2 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <span />
                <span>Produto</span>
                <span>Código</span>
                <span>Unidade</span>
                <span className="text-right">Ações</span>
              </div>

              {produtos.map(produto => {
                const isOpen = expandidos.has(produto.id)
                const vars = variantesCache[produto.id] ?? []
                const carregando = loadingVar.has(produto.id)
                const uBase = produto.unidade_medida as PrdUnidadeMedida | undefined
                const colsAttr: { id: string; nome: string }[] = Object.keys(
                  vars.reduce((acc, v) => { Object.keys(v.atributosMap).forEach(k => { acc[k] = true }); return acc }, {} as Record<string, boolean>)
                ).map(nome => ({ id: nome, nome }))
                const abaAtiva = abasProduto[produto.id] ?? 'variantes'

                return (
                  <div key={produto.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                    {/* Linha do produto */}
                    <div className={`grid grid-cols-[32px_1fr_100px_80px_80px] gap-2 items-center px-4 py-3 transition-colors ${!produto.ativo ? 'opacity-60' : ''} ${isOpen ? 'bg-blue-50/40 dark:bg-blue-950/20' : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/60'}`}>
                      <button
                        onClick={() => toggleExpand(produto.id)}
                        className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all"
                      >
                        <ChevronRight size={14} className={`transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                      </button>

                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                          <Package size={13} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{produto.nome}</p>
                          {produto.descricao && <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{produto.descricao}</p>}
                        </div>
                        {!produto.ativo && (
                          <span className="shrink-0 rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Inativo</span>
                        )}
                      </div>

                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{produto.codigo}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">{uBase?.sigla ?? '—'}</span>

                      <div className="flex items-center justify-end gap-0.5">
                        {isAdmin && (
                          <>
                            <button onClick={() => setModalProduto(produto)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" title="Editar">
                              <Edit2 size={13} />
                            </button>
                            <button onClick={() => toggleProduto(produto)}
                              className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${produto.ativo ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600'}`}
                              title={produto.ativo ? 'Inativar' : 'Reativar'}>
                              <Power size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Painel expandido */}
                    {isOpen && (
                      <div className="bg-gray-50/60 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800">
                        {/* Mini tab bar */}
                        <div className="flex items-center justify-between px-4 pt-2 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex gap-0">
                            {(['variantes', 'atributos'] as const).map(tab => (
                              <button
                                key={tab}
                                onClick={() => setAbasProduto(prev => ({ ...prev, [produto.id]: tab }))}
                                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 transition-colors -mb-px ${
                                  abaAtiva === tab
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                              >
                                {tab === 'variantes' ? <Package size={12} /> : <Tag size={12} />}
                                {tab === 'variantes' ? 'Variantes' : 'Atributos'}
                              </button>
                            ))}
                          </div>
                          {isAdmin && abaAtiva === 'variantes' && (
                            <button
                              onClick={() => setModalVariante({ produtoId: produto.id })}
                              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline pb-1.5"
                            >
                              <Plus size={12} /> Nova variante
                            </button>
                          )}
                        </div>

                        {/* Conteúdo */}
                        <div className="px-4 py-3">
                          {carregando ? (
                            <div className="flex items-center justify-center py-6">
                              <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                            </div>
                          ) : abaAtiva === 'variantes' ? (
                            /* ── Aba Variantes ── */
                            vars.length === 0 ? (
                              <p className="text-sm text-gray-400 dark:text-gray-500 py-2">
                                Nenhuma variante.{isAdmin && <> <button onClick={() => setModalVariante({ produtoId: produto.id })} className="text-blue-600 dark:text-blue-400 hover:underline">Criar agora</button></>}
                              </p>
                            ) : (
                              <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Variante</th>
                                      {colsAttr.map(a => (
                                        <th key={a.id} className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{a.nome}</th>
                                      ))}
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Preço ref.</th>
                                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Unid.</th>
                                      {isAdmin && <th className="px-3 py-2 w-16" />}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {vars.map(v => {
                                      const uSigla = v.unidade_medida_id
                                        ? (unidades.find(u => u.id === v.unidade_medida_id)?.sigla ?? '—')
                                        : uBase?.sigla ?? '—'
                                      const nomeVariante = v.nome
                                        || colsAttr.map(a => v.atributosMap[a.nome]).filter(Boolean).join(' / ')
                                        || 'Padrão'
                                      return (
                                        <tr key={v.id} className={`bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-colors ${!v.ativo ? 'opacity-50' : ''}`}>
                                          <td className="px-3 py-2 text-gray-800 dark:text-gray-200 font-medium text-sm">{nomeVariante}</td>
                                          {colsAttr.map(a => (
                                            <td key={a.id} className="px-3 py-2 text-gray-600 dark:text-gray-400 text-sm">{v.atributosMap[a.nome] ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</td>
                                          ))}
                                          <td className="px-3 py-2 text-gray-700 dark:text-gray-300">
                                            {v.preco_referencia != null ? v.preco_referencia.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                          </td>
                                          <td className="px-3 py-2 text-gray-500 dark:text-gray-400 text-xs">{uSigla}</td>
                                          {isAdmin && (
                                            <td className="px-3 py-2">
                                              <div className="flex items-center gap-0.5 justify-end">
                                                <button onClick={() => setModalVariante({ produtoId: produto.id, variante: v })}
                                                  className="flex h-6 w-6 items-center justify-center rounded text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-colors" title="Editar">
                                                  <Edit2 size={12} />
                                                </button>
                                                <button onClick={() => toggleVariante(v, produto.id)}
                                                  className={`flex h-6 w-6 items-center justify-center rounded transition-colors ${v.ativo ? 'text-gray-400 hover:bg-red-50 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 hover:text-green-600'}`}
                                                  title={v.ativo ? 'Inativar' : 'Reativar'}>
                                                  <Power size={12} />
                                                </button>
                                              </div>
                                            </td>
                                          )}
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )
                          ) : (
                            /* ── Aba Atributos (contexto do produto) ── */
                            <PainelAtributosProduto
                              isAdmin={isAdmin}
                              onAtributoChange={() => {
                                setVariantesCache(prev => { const n = { ...prev }; delete n[produto.id]; return n })
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 mt-3 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {total} produto{total !== 1 ? 's' : ''} · página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Próxima
            </button>
          </div>
        </div>
      )}

      {/* Modal produto */}
      {modalProduto !== null && (
        <ModalProduto
          produto={modalProduto === 'novo' ? null : modalProduto}
          unidades={unidades}
          onSalvar={() => { setModalProduto(null); fetchProdutos() }}
          onFechar={() => setModalProduto(null)}
        />
      )}

      {/* Modal variante */}
      {modalVariante !== null && (
        <ModalVariante
          produtoId={modalVariante.produtoId}
          variante={modalVariante.variante}
          unidades={unidades}
          unidadeBaseSigla={
            (produtos.find(p => p.id === modalVariante.produtoId)?.unidade_medida as PrdUnidadeMedida | undefined)?.sigla ?? 'un'
          }
          onSalvar={async () => {
            const pid = modalVariante.produtoId
            setModalVariante(null)
            await carregarVariantes(pid)
            fetchProdutos()
          }}
          onFechar={() => setModalVariante(null)}
        />
      )}
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal: Produto (novo / editar)
// ─────────────────────────────────────────────────────────────

function ModalProduto({ produto, unidades, onSalvar, onFechar }: {
  produto: PrdProduto | null; unidades: PrdUnidadeMedida[]; onSalvar: () => void; onFechar: () => void
}) {
  const isEditing = !!produto
  const unidadePadrao = unidades.find(u => u.nome === 'Unidade')?.id ?? unidades[0]?.id ?? ''
  const [nome, setNome] = useState(produto?.nome ?? '')
  const [descricao, setDescricao] = useState(produto?.descricao ?? '')
  const [unidadeId, setUnidadeId] = useState(produto?.unidade_medida_id ?? unidadePadrao)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function salvar() {
    if (!nome.trim()) { setError('Nome é obrigatório.'); return }
    if (!unidadeId) { setError('Selecione uma unidade.'); return }
    setSaving(true); setError(null)
    const payload = { nome: nome.trim(), descricao: descricao.trim() || null, unidade_medida_id: unidadeId }
    const { error } = isEditing
      ? await supabase.from('prd_produtos').update(payload).eq('id', produto!.id)
      : await supabase.from('prd_produtos').insert(payload)
    setSaving(false)
    if (error) { setError('Erro ao salvar. Tente novamente.'); return }
    onSalvar()
  }

  return (
    <Modal
      title={isEditing ? 'Editar produto' : 'Novo produto'}
      subtitle={isEditing ? produto!.codigo : 'O código será gerado automaticamente.'}
      onClose={onFechar}
      footer={
        <>
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
          <Button isDisabled={saving} onPress={salvar} className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium">
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar produto'}
          </Button>
        </>
      }
    >
      {error && <ErrorBox msg={error} />}
      <FInput label="Nome" value={nome} onChange={setNome} placeholder="Ex: Parafuso, Papel Sulfite A4…" isRequired />
      <FSelect
        label="Unidade de medida"
        value={unidadeId}
        onChange={setUnidadeId}
        isRequired
        items={unidades.map(u => ({ key: u.id, label: `${u.nome} (${u.sigla})` }))}
      />
      <FInput label="Descrição" value={descricao} onChange={setDescricao} placeholder="Descrição técnica (opcional)…" />
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Modal: Variante (nova / editar)
// ─────────────────────────────────────────────────────────────

function ModalVariante({ produtoId, variante, unidades, unidadeBaseSigla, onSalvar, onFechar }: {
  produtoId: string; variante?: PrdVariante; unidades: PrdUnidadeMedida[];
  unidadeBaseSigla: string; onSalvar: () => void; onFechar: () => void
}) {
  const isEditing = !!variante
  const [nome, setNome] = useState(variante?.nome ?? '')
  const [preco, setPreco] = useState(variante?.preco_referencia?.toString() ?? '')
  const [unidadeId, setUnidadeId] = useState(variante?.unidade_medida_id ?? '')
  const [attrSel, setAttrSel] = useState<Record<string, string>>({})
  const [atributos, setAtributos] = useState<AtributoRico[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('prd_atributos')
      .select('*, valores:prd_atributo_valores(id,atributo_id,valor,ordem)')
      .eq('ativo', true).order('ordem')
      .then(({ data }) => setAtributos((data ?? []) as AtributoRico[]))
  }, [])

  useEffect(() => {
    if (!variante) return
    supabase.from('prd_variante_atributos').select('atributo_id, atributo_valor_id').eq('variante_id', variante.id)
      .then(({ data }) => {
        const m: Record<string, string> = {}
        data?.forEach(va => { m[va.atributo_id] = va.atributo_valor_id })
        setAttrSel(m)
      })
  }, [variante])

  async function salvar() {
    setSaving(true); setError(null)
    const payload = {
      produto_id: produtoId,
      nome: nome.trim() || null,
      preco_referencia: preco ? parseFloat(preco) : null,
      unidade_medida_id: unidadeId || null,
    }
    let varId = variante?.id
    if (isEditing) {
      const { error } = await supabase.from('prd_variantes').update(payload).eq('id', varId!)
      if (error) { setError('Erro ao salvar.'); setSaving(false); return }
    } else {
      const { data, error } = await supabase.from('prd_variantes').insert(payload).select('id').single()
      if (error || !data) { setError('Erro ao criar variante.'); setSaving(false); return }
      varId = data.id
    }
    await supabase.from('prd_variante_atributos').delete().eq('variante_id', varId!)
    const vinculos = Object.entries(attrSel).filter(([, vId]) => !!vId).map(([aId, vId]) => ({ variante_id: varId!, atributo_id: aId, atributo_valor_id: vId }))
    if (vinculos.length) {
      const { error } = await supabase.from('prd_variante_atributos').insert(vinculos)
      if (error) { setError('Erro ao salvar atributos.'); setSaving(false); return }
    }
    setSaving(false); onSalvar()
  }

  return (
    <Modal
      title={isEditing ? 'Editar variante' : 'Nova variante'}
      onClose={onFechar}
      footer={
        <>
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">Cancelar</button>
          <Button isDisabled={saving} onPress={salvar} className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium">
            {saving ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar variante'}
          </Button>
        </>
      }
    >
      {error && <ErrorBox msg={error} />}

      <FInput
        label="Nome da variante"
        value={nome}
        onChange={setNome}
        placeholder={atributos.length > 0 ? 'Opcional — ex: Edição especial' : 'Ex: Padrão, Vermelho G, 500ml…'}
      />

      {atributos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Especificações</p>
          {atributos.map(a => (
            <FSelect
              key={a.id}
              label={a.nome}
              value={attrSel[a.id] ?? ''}
              onChange={v => setAttrSel(prev => ({ ...prev, [a.id]: v }))}
              emptyLabel="— não especificado —"
              items={a.valores.map(v => ({ key: v.id, label: v.valor }))}
            />
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <FInput label="Preço de referência" type="number" value={preco} onChange={setPreco} placeholder="0,00" />
        <FSelect
          label={`Unidade (padrão: ${unidadeBaseSigla})`}
          value={unidadeId}
          onChange={setUnidadeId}
          emptyLabel={`Herdar (${unidadeBaseSigla})`}
          items={unidades.map(u => ({ key: u.id, label: `${u.nome} (${u.sigla})` }))}
        />
      </div>
    </Modal>
  )
}

// ─────────────────────────────────────────────────────────────
// Página raiz
// ─────────────────────────────────────────────────────────────

export function ProdutosPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [unidades, setUnidades] = useState<PrdUnidadeMedida[]>([])

  useEffect(() => {
    supabase.from('prd_unidades_medida').select('*').eq('ativo', true).order('nome')
      .then(({ data }) => setUnidades(data ?? []))
  }, [])

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Produtos</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Cadastro de produtos e variantes.</p>
      </div>

      <AbaProdutos isAdmin={isAdmin} unidades={unidades} />
    </div>
  )
}
