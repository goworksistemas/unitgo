import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, FileSearch, ChevronRight, Calendar, Building2, User as UserIcon, FileText,
} from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpCotacao, CmpCotacaoStatus, CmpSolicitacao, CoreEmpresa, Profile } from '@/types/database'
import { COTACAO_STATUS_META, PRIORIDADE_META, formatDate } from './_shared'
import { Bandeja, BandejaItem } from './_bandejas'

const PAGE_SIZE = 25

const FILTROS_STATUS: { key: CmpCotacaoStatus | 'todas'; label: string }[] = [
  { key: 'todas',              label: 'Todas' },
  { key: 'aberta',             label: 'Aberta' },
  { key: 'respondida',         label: 'Respondida' },
  { key: 'vencedor_escolhido', label: 'Vencedor escolhido' },
  { key: 'encerrada',          label: 'Encerrada' },
  { key: 'cancelada',          label: 'Cancelada' },
]

type CotacaoEnriquecida = CmpCotacao & {
  empresa?: CoreEmpresa
  comprador?: Profile
}

type SCPendente = CmpSolicitacao & {
  solicitante?: Profile
  itens_pendentes_count?: number
}

export function CotacoesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const podeCriar = profile?.role === 'admin' || profile?.role === 'comprador'

  const [cotacoes, setCotacoes] = useState<CotacaoEnriquecida[]>([])
  const [scsPendentes, setScsPendentes] = useState<SCPendente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [filtro, setFiltro] = useState<typeof FILTROS_STATUS[number]['key']>('todas')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 300); return () => clearTimeout(t) }, [search])
  useEffect(() => { setPage(0) }, [debounced, filtro])

  const fetchData = useCallback(async () => {
    setLoading(true)
    const from = page * PAGE_SIZE
    let q = supabase
      .from('cmp_cotacoes')
      .select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia),
        comprador:profiles!cmp_cotacoes_comprador_id_fkey(id,nome,email)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todas') q = q.eq('status', filtro)

    const term = debounced.replace(/[,()%]/g, ' ').trim()
    if (term) q = q.or(`numero.ilike.%${term}%,titulo.ilike.%${term}%`)

    const { data, count } = await q
    setCotacoes((data ?? []) as unknown as CotacaoEnriquecida[])
    setTotal(count ?? 0)

    // Bandeja: SCs aprovadas com itens ainda pendentes (não viraram cotação)
    const { data: scsData } = await supabase
      .from('cmp_solicitacoes_compra')
      .select(`
        *,
        solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email),
        itens:cmp_solicitacoes_compra_itens(status_item)
      `)
      .eq('status', 'aprovada')
      .order('created_at', { ascending: false })

    const pendentes = (scsData ?? [])
      .map(sc => {
        const itens = (sc as { itens?: { status_item: string }[] }).itens ?? []
        const pendCount = itens.filter(i => i.status_item === 'pendente').length
        return { ...sc, itens_pendentes_count: pendCount }
      })
      .filter(sc => (sc.itens_pendentes_count ?? 0) > 0) as SCPendente[]

    setScsPendentes(pendentes)
    setLoading(false)
  }, [page, filtro, debounced])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Cotações</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Pedido de cotação (RFQ) — comprador convida fornecedores e escolhe o vencedor.
          </p>
        </div>
        {podeCriar && (
          <Button
            onPress={() => navigate('/compras/cotacoes/nova')}
            className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> Nova cotação
          </Button>
        )}
      </div>

      {/* Bandeja: SCs aprovadas aguardando cotação */}
      <Bandeja
        icone={<FileText size={15} />}
        titulo="Solicitações aprovadas aguardando cotação"
        descricao="Estas SCs foram aprovadas pelo gestor e ainda não viraram cotação."
        total={scsPendentes.length}
        accent="amber"
      >
        {scsPendentes.slice(0, 5).map(sc => {
          const prio = PRIORIDADE_META[sc.prioridade]
          return (
            <BandejaItem
              key={sc.id}
              onClick={() => navigate(`/compras/cotacoes/nova?sc=${sc.id}`)}
              titulo={
                <>
                  <span className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100">{sc.numero}</span>
                  {sc.prioridade !== 'normal' && (
                    <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${prio.badge}`}>
                      {prio.label}
                    </span>
                  )}
                </>
              }
              subtitulo={
                <>
                  <span className="inline-flex items-center gap-1"><UserIcon size={11} />{sc.solicitante?.nome ?? sc.solicitante?.email}</span>
                  <span className="mx-2">·</span>
                  {sc.justificativa ?? 'Sem justificativa'}
                </>
              }
              meta={`${sc.itens_pendentes_count} item${(sc.itens_pendentes_count ?? 0) > 1 ? 's' : ''}`}
            />
          )
        })}
        {scsPendentes.length > 5 && (
          <li className="px-5 py-2 text-xs text-center text-gray-500 dark:text-gray-400">
            E mais {scsPendentes.length - 5} solicitação(ões)…
          </li>
        )}
      </Bandeja>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por número ou título…"
            className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-x-auto text-sm">
          {FILTROS_STATUS.map(f => (
            <button key={f.key} onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 transition-colors whitespace-nowrap ${
                filtro === f.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : cotacoes.length === 0 ? (
            <div className="py-16 text-center">
              <FileSearch size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {debounced ? 'Nenhuma cotação encontrada.' : 'Nenhuma cotação ainda.'}
              </p>
              {!debounced && podeCriar && (
                <Link to="/compras/cotacoes/nova" className="mt-3 inline-flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:underline">
                  <Plus size={14} /> Criar primeira
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {cotacoes.map(cot => {
                const meta = COTACAO_STATUS_META[cot.status]
                return (
                  <li key={cot.id}>
                    <Link to={`/compras/cotacoes/${cot.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 dark:bg-violet-950/30">
                        <FileSearch size={16} className="text-violet-600 dark:text-violet-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-mono font-semibold text-gray-800 dark:text-gray-200">{cot.numero}</span>
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ${meta.badge}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                            {meta.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-sm text-gray-700 dark:text-gray-200 truncate">{cot.titulo}</p>
                        <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                          <span className="inline-flex items-center gap-1"><UserIcon size={11} />{cot.comprador?.nome ?? cot.comprador?.email ?? '—'}</span>
                          <span className="inline-flex items-center gap-1"><Building2 size={11} />{cot.empresa?.nome_fantasia ?? cot.empresa?.razao_social ?? '—'}</span>
                          <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDate(cot.created_at)}</span>
                          {cot.prazo_resposta && (
                            <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">prazo {formatDate(cot.prazo_resposta)}</span>
                          )}
                        </div>
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

      {!loading && total > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2 text-sm">
          <span className="text-gray-500 dark:text-gray-400">
            {total} cotação{total !== 1 ? 'ões' : ''} · página {page + 1} de {totalPages}
          </span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Anterior
            </button>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
