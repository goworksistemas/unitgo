import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus, Search, FileText, Calendar, Building2, User as UserIcon, Hash, Network,
} from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpCotacaoStatus, CmpItemStatus, CmpPedidoStatus, CmpSolicitacao,
  CoreDepartamento, CoreEmpresa, Profile,
} from '@/types/database'
import { PRIORIDADE_META, formatDate } from './_shared'
import {
  ETAPAS_PROCESSO_SC, metaEtapaProcessoSC, metaSolicitacao, type EtapaProcessoSC,
} from './_fluxoEtapas'
import { StatusBadge } from './_StatusBadge'
import { LinhaExpansivel } from './_LinhaExpansivel'
import { PainelSolicitacao } from './_PainelSolicitacao'
import { AcoesAprovacaoSC } from './_AcoesAprovacaoLista'
import { FaixaEtapasToolbar } from './_FaixaEtapasToolbar'
import { useContagensProcessoSC } from './_useContagensProcessoSC'
import {
  etapaAtualProcessoSC, itensResumoPorScIds, pedidosResumoPorScIds,
  resumoProcessoSC, scIdsParaEtapa,
} from './_processoSC'

const PAGE_SIZE = 25

type CotacaoVinculadaMin = { id: string; numero: string; status: CmpCotacaoStatus }

type SolicitacaoEnriquecida = CmpSolicitacao & {
  solicitante?: Profile
  departamento?: CoreDepartamento
  empresa?: CoreEmpresa
  total_itens?: number
  cotacoes_vinculadas?: CotacaoVinculadaMin[]
  itens_resumo?: { status_item: CmpItemStatus }[]
  pedidos_resumo?: { status: CmpPedidoStatus }[]
}

export function SolicitacoesPage() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const podeCriar = !!profile

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoEnriquecida[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtro, setFiltro] = useState<EtapaProcessoSC | 'todas'>('todas')
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const toggleAberto = (id: string) => setAbertos(prev => {
    const n = new Set(prev)
    if (n.has(id)) n.delete(id); else n.add(id)
    return n
  })

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const { contagens, recarregarContagens } = useContagensProcessoSC()

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
        departamento:core_departamentos(id,codigo,nome,gestor_id),
        empresa:core_empresas(id,razao_social,nome_fantasia),
        itens:cmp_solicitacoes_compra_itens(status_item)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (filtro !== 'todas') {
      const ids = await scIdsParaEtapa(filtro)
      if (ids.length === 0) {
        setSolicitacoes([])
        setTotal(0)
        setLoading(false)
        recarregarContagens()
        return
      }
      query = query.in('id', ids)
    }

    const q = debouncedSearch.replace(/[,()%]/g, ' ').trim()
    if (q) query = query.or(`numero.ilike.%${q}%,justificativa.ilike.%${q}%`)

    const { data, count } = await query
    const base = (data ?? []) as SolicitacaoEnriquecida[]

    const cotacoesPorSc: Record<string, CotacaoVinculadaMin[]> = {}
    if (base.length > 0) {
      const scIds = base.map(s => s.id)
      const { data: vincs } = await supabase
        .from('cmp_cotacoes_solicitacoes')
        .select('solicitacao_id, cotacao:cmp_cotacoes(id, numero, status)')
        .in('solicitacao_id', scIds)

      for (const row of vincs ?? []) {
        const cot = row.cotacao as CotacaoVinculadaMin | null
        if (!cot?.id) continue
        const sid = row.solicitacao_id as string
        if (!cotacoesPorSc[sid]) cotacoesPorSc[sid] = []
        cotacoesPorSc[sid].push(cot)
      }
      for (const sid of Object.keys(cotacoesPorSc)) {
        cotacoesPorSc[sid].sort((a, b) => a.numero.localeCompare(b.numero))
      }
    }

    const scIds = base.map(s => s.id)
    const [pedidosPorSc, itensPorSc] = base.length > 0
      ? await Promise.all([
          pedidosResumoPorScIds(scIds),
          itensResumoPorScIds(scIds),
        ])
      : [{}, {}]

    setSolicitacoes(base.map(s => {
      const embedItens = (s as { itens?: { status_item: CmpItemStatus }[] }).itens ?? []
      const itens_resumo = embedItens.length > 0 ? embedItens : (itensPorSc[s.id] ?? [])
      return {
        ...s,
        cotacoes_vinculadas: cotacoesPorSc[s.id] ?? [],
        itens_resumo,
        pedidos_resumo: pedidosPorSc[s.id] ?? [],
      }
    }))
    setTotal(count ?? 0)
    setLoading(false)
    recarregarContagens()
  }, [page, filtro, debouncedSearch, recarregarContagens])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Solicitações de Compra</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Visão completa do processo: aprovação, itens, cotação, pedido e recebimento.
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

      <FaixaEtapasToolbar
        etapas={ETAPAS_PROCESSO_SC}
        filtroAtivo={filtro}
        onFiltro={k => setFiltro(k as EtapaProcessoSC | 'todas')}
        contagens={contagens}
        meta={metaEtapaProcessoSC}
        chaveTodas="todas"
      />

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por número ou justificativa…"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
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
                const etapaAtual = etapaAtualProcessoSC(
                  sc,
                  sc.itens_resumo ?? [],
                  sc.pedidos_resumo ?? [],
                )
                const prio = PRIORIDADE_META[sc.prioridade]
                const resumo = resumoProcessoSC(
                  sc,
                  sc.itens_resumo ?? [],
                  sc.pedidos_resumo ?? [],
                )
                const meta = etapaAtual
                  ? metaEtapaProcessoSC(etapaAtual)
                  : metaSolicitacao(sc.status)
                const resumoFallback = !resumo && sc.status === 'aprovada' && (sc.pedidos_resumo?.length ?? 0) > 0
                  ? 'Processo em andamento — ver pedidos e itens vinculados'
                  : null
                const aberto = abertos.has(sc.id)
                const cotPrincipal = sc.cotacoes_vinculadas?.[0]
                return (
                  <LinhaExpansivel
                    key={sc.id}
                    aberto={aberto}
                    onToggle={() => toggleAberto(sc.id)}
                    cabecalho={
                      <>
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                          <FileText size={16} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              to={`/compras/solicitacoes/${sc.id}`}
                              onClick={e => e.stopPropagation()}
                              className="text-sm font-mono font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                              title="Abrir solicitação"
                            >
                              {sc.numero}
                            </Link>
                            <StatusBadge meta={meta} size="md" />
                            {cotPrincipal && (
                              <Link
                                to={`/compras/cotacoes/${cotPrincipal.id}`}
                                onClick={e => e.stopPropagation()}
                                className="text-[11px] font-mono text-violet-700 dark:text-violet-300 hover:underline"
                                title="Cotação vinculada"
                              >
                                {cotPrincipal.numero}
                              </Link>
                            )}
                            {sc.prioridade !== 'normal' && (
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${prio.badge}`}>
                                {prio.label}
                              </span>
                            )}
                          </div>
                          {(resumo ?? resumoFallback) && (
                            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-400">
                              {resumo ?? resumoFallback}
                            </p>
                          )}
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
                      </>
                    }
                    painel={aberto ? <PainelSolicitacao scId={sc.id} /> : null}
                    acoes={<AcoesAprovacaoSC sc={sc} onAtualizado={fetchData} />}
                  />
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
