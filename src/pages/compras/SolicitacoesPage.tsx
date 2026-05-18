import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, FileText, ChevronRight, Calendar, Building2, User as UserIcon, Hash, Network,
} from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpSolicitacao, CmpSolicitacaoStatus, CoreDepartamento, CoreEmpresa, Profile } from '@/types/database'
import { PRIORIDADE_META, STATUS_META, formatDate } from './_shared'

const PAGE_SIZE = 25

const FILTROS_STATUS: { key: CmpSolicitacaoStatus | 'todas'; label: string }[] = [
  { key: 'todas',                label: 'Todas'        },
  { key: 'rascunho',             label: 'Rascunho'     },
  { key: 'aguardando_aprovacao', label: 'Aguardando'   },
  { key: 'aprovada',             label: 'Aprovada'     },
  { key: 'reprovada',            label: 'Reprovada'    },
  { key: 'atendida',             label: 'Atendida'     },
  { key: 'cancelada',            label: 'Cancelada'    },
]

type SolicitacaoEnriquecida = CmpSolicitacao & {
  solicitante?: Profile
  departamento?: CoreDepartamento
  empresa?: CoreEmpresa
  total_itens?: number
}

export function SolicitacoesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const podeCriar = !!profile

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoEnriquecida[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtro, setFiltro] = useState<typeof FILTROS_STATUS[number]['key']>('todas')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(0) }, [debouncedSearch, filtro])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    let query = supabase
      .from('cmp_solicitacoes_compra')
      .select(`
        *,
        solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email),
        departamento:core_departamentos(id,codigo,nome),
        empresa:core_empresas(id,razao_social,nome_fantasia)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todas') query = query.eq('status', filtro)

    const q = debouncedSearch.replace(/[,()%]/g, ' ').trim()
    if (q) query = query.or(`numero.ilike.%${q}%,justificativa.ilike.%${q}%`)

    const { data, count } = await query
    setSolicitacoes((data ?? []) as SolicitacaoEnriquecida[])
    setTotal(count ?? 0)
    setLoading(false)
  }, [page, filtro, debouncedSearch])

  useEffect(() => { fetchData() }, [fetchData])

  // Contadores para o resumo do topo (com base no que veio na página atual)
  const resumo = useMemo(() => {
    const grupos: Record<string, number> = {}
    solicitacoes.forEach(s => { grupos[s.status] = (grupos[s.status] ?? 0) + 1 })
    return grupos
  }, [solicitacoes])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de Compra</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Inicie aqui o fluxo de compra. Cada SC passa por aprovação do gestor antes de virar cotação.
          </p>
        </div>
        {podeCriar && (
          <Button
            onPress={() => navigate('/compras/solicitacoes/nova')}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> Nova solicitação
          </Button>
        )}
      </div>

      {/* Resumo rápido (chevron) */}
      <div className="flex items-stretch overflow-x-auto py-1">
        {FILTROS_STATUS
          .filter(f => f.key !== 'todas' && f.key !== 'rascunho' && f.key !== 'cancelada')
          .map((f, idx, arr) => {
            const meta    = STATUS_META[f.key as CmpSolicitacaoStatus]
            const count   = resumo[f.key] ?? 0
            const isFirst = idx === 0
            const isLast  = idx === arr.length - 1
            const TIP     = 22 // px da "ponta" V
            const clipPath = isFirst
              ? `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%)`
              : isLast
                ? `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${TIP}px 50%)`
                : `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%, ${TIP}px 50%)`
            const isActive = filtro === f.key
            return (
              <button
                key={f.key}
                onClick={() => setFiltro(prev => (prev === f.key ? 'todas' : f.key))}
                style={{
                  clipPath,
                  marginLeft:   isFirst ? 0 : -(TIP - 3),
                  paddingLeft:  isFirst ? 18 : 18 + TIP,
                  paddingRight: isLast  ? 18 : 18 + TIP,
                }}
                className={`relative flex-1 min-w-[180px] py-5 text-left whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-emerald-100 dark:bg-emerald-900/40 z-10'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-gray-600 dark:text-gray-300">
                    {meta.label}
                  </span>
                </div>
                <p className={`mt-1 text-2xl font-semibold ${
                  isActive
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {count}
                </p>
              </button>
            )
          })}
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número ou justificativa…"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
      </div>

      {/* Lista */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : solicitacoes.length === 0 ? (
            <div className="py-16 text-center">
              <FileText size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {debouncedSearch ? 'Nenhuma solicitação encontrada.' : 'Nenhuma solicitação ainda.'}
              </p>
              {!debouncedSearch && podeCriar && (
                <Link
                  to="/compras/solicitacoes/nova"
                  className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  <Plus size={14} /> Criar a primeira
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {solicitacoes.map(sc => {
                const meta = STATUS_META[sc.status]
                const prio = PRIORIDADE_META[sc.prioridade]
                return (
                  <li key={sc.id}>
                    <Link
                      to={`/compras/solicitacoes/${sc.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                        <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">
                            {sc.numero}
                          </span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                          {sc.prioridade !== 'normal' && (
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${prio.badge}`}>
                              {prio.label}
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1">
                            <UserIcon size={11} />
                            {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Network size={11} />
                            {sc.departamento?.nome ?? '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Building2 size={11} />
                            {sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social ?? '—'}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Calendar size={11} />
                            {formatDate(sc.created_at)}
                          </span>
                          {sc.data_necessaria && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                              <Hash size={11} /> precisa em {formatDate(sc.data_necessaria)}
                            </span>
                          )}
                        </div>
                        {sc.justificativa && (
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate">
                            {sc.justificativa}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={16} className="text-gray-300 dark:text-gray-600 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Paginação */}
      {!loading && total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {total} solicitação{total !== 1 ? 'ões' : ''} · página {page + 1} de {totalPages}
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
    </div>
  )
}
