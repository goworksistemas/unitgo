import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  CheckCircle2, XCircle, Ban,
  Building2, Calendar, User as UserIcon, Network,
  FileSearch, ShoppingCart,
} from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpItemStatus, CmpPrioridade, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  PRIORIDADE_META, STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty,
} from './_shared'
import {
  ETAPAS_PROCESSO_SC, metaEtapaProcessoSC, metaItem, metaSolicitacao, resumoEtapaItem,
} from './_fluxoEtapas'
import { contagensDetalheProcessoSC, etapaAtualProcessoSC } from './_processoSC'
import { FaixaEtapasToolbar } from './_FaixaEtapasToolbar'
import { PropLinha } from './_LayoutDetalhe'
import {
  LayoutDetalheFocado, MetaChip, MetaSep, AlertaLinha, type PainelSecao,
} from './_LayoutDetalheFocado'
import { HistoricoTimeline, type EventoHistorico } from './_HistoricoTimeline'
import { rpcCompras } from './_rpc'
import { VinculosBar, VinculosLista, gruposVinculosSC } from './_VinculosProcesso'
import { MotivoModal } from './_MotivoModal'

// ── Tipos do payload da RPC cmp_detalhe_solicitacao ──
type ProfileMini = { id: string; nome: string | null; email: string }

type SolicitacaoFull = {
  id: string; numero: string; status: CmpSolicitacaoStatus; prioridade: CmpPrioridade
  empresa_id: string; departamento_id: string | null
  solicitante_id: string; aprovador_id: string | null
  data_necessaria: string | null
  justificativa: string | null; observacoes: string | null
  aprovado_em: string | null; cancelada_em: string | null
  motivo_reprovacao: string | null; enviada_em: string | null
  created_at: string; updated_at: string
  empresa?: { id: string; razao_social: string; nome_fantasia: string | null; cnpj: string | null } | null
  departamento?: { id: string; codigo: string; nome: string; gestor_id: string | null; gestor: ProfileMini | null } | null
  solicitante?: ProfileMini | null
  aprovador?: ProfileMini | null
}

type ItemFull = {
  id: string; solicitacao_id: string; linha: number
  produto_id: string | null; variante_id: string | null; unidade_medida_id: string | null
  quantidade: number; preco_estimado: number | null
  observacao: string | null; status_item: CmpItemStatus
  created_at: string; updated_at: string
  produto?: { id: string; codigo: string; nome: string; tipo: string; imagem_url: string | null } | null
  unidade_medida?: { id: string; nome: string; sigla: string } | null
}

type CotacaoVinculada = {
  id: string; numero: string; titulo: string
  status: 'aberta' | 'respondida' | 'vencedor_escolhido' | 'encerrada' | 'cancelada'
  comprador?: ProfileMini | null
  prazo_resposta: string | null
  created_at: string
  itens_count: number
  fornecedores_count: number
  total_escolhido: number
}

type PedidoVinculado = {
  id: string; numero: string
  status: 'aguardando_aprovacao' | 'aprovado' | 'enviado' | 'parcialmente_recebido' | 'recebido' | 'cancelado'
  cotacao_id: string | null
  fornecedor_id: string | null
  fornecedor?: { id: string; razao_social: string; nome_fantasia: string | null } | null
  created_at: string; enviado_em: string | null
  total: number; qtd_total: number; qtd_recebida: number
  itens_resumo?: Array<{
    linha?: number; nome: string; codigo?: string | null
    quantidade?: number; unidade?: string | null
    preco_unitario?: number; total?: number; quantidade_recebida?: number
  }>
}

type RecebimentoVinculado = {
  id: string; numero: string; pedido_id: string
  data_recebimento: string; observacoes: string | null
  pedido_numero?: string
}

interface RpcDetalheSC {
  sc: SolicitacaoFull
  itens: ItemFull[]
  cotacoes: CotacaoVinculada[]
  pedidos: PedidoVinculado[]
  recebimentos: RecebimentoVinculado[]
  historico: EventoHistorico[]
}

export function SolicitacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [sc, setSc] = useState<SolicitacaoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [historico, setHistorico] = useState<EventoHistorico[]>([])
  const [cotacoes, setCotacoes] = useState<CotacaoVinculada[]>([])
  const [pedidos, setPedidos] = useState<PedidoVinculado[]>([])
  const [recebimentos, setRecebimentos] = useState<RecebimentoVinculado[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<null | 'reprovar' | 'cancelar'>(null)
  const [motivo, setMotivo] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data, error } = await rpcCompras<RpcDetalheSC>('cmp_detalhe_solicitacao', { p_id: id })
    if (error) {
      console.error('[SolicitacaoDetalhePage] cmp_detalhe_solicitacao:', error)
      toast.error('Erro ao carregar solicitação.')
      setLoading(false)
      return
    }
    if (!data) {
      setSc(null)
      setLoading(false)
      return
    }
    setSc(data.sc ?? null)
    setItens(data.itens ?? [])
    setCotacoes(data.cotacoes ?? [])
    setPedidos(data.pedidos ?? [])
    setRecebimentos(data.recebimentos ?? [])
    setHistorico(data.historico ?? [])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const gruposVinc = useMemo(
    () => gruposVinculosSC({ cotacoes, pedidos, recebimentos }),
    [cotacoes, pedidos, recebimentos],
  )

  const contagensEtapas = useMemo(
    () => (sc ? contagensDetalheProcessoSC(sc, itens, pedidos) : {}),
    [sc, itens, pedidos],
  )
  const etapaAtual = useMemo(
    () => (sc ? etapaAtualProcessoSC(sc, itens, pedidos) : null),
    [sc, itens, pedidos],
  )

  // ── Permissões ──
  const eu = profile?.id
  const ehAdmin     = profile?.role === 'admin'
  const ehGestor    = !!sc?.departamento?.gestor_id && sc.departamento.gestor_id === eu
  const ehDono      = sc?.solicitante_id === eu
  const podeAprovar = (ehAdmin || ehGestor) && sc?.status === 'aguardando_aprovacao'
  const podeCancelar = (ehDono || ehAdmin) && sc?.status && !['atendida', 'cancelada', 'reprovada'].includes(sc.status)
  const ehComprador = profile?.role === 'admin' || profile?.role === 'comprador'
  const temItensPendentes = itens.some(it => it.status_item === 'pendente')
  const podeIniciarCotacao = ehComprador && sc?.status === 'aprovada' && temItensPendentes
  const podePedidoDireto = ehComprador && sc?.status === 'aprovada' && temItensPendentes

  const totalEstimado = itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_estimado ?? 0), 0)

  // ── Ações ──
  async function logAcao(acao: 'enviou' | 'aprovou' | 'reprovou' | 'cancelou', comentario?: string) {
    if (!sc || !eu) return
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'solicitacao',
      documento_id: sc.id,
      aprovador_id: eu,
      acao,
      comentario: comentario ?? null,
    })
  }

  async function aprovar() {
    if (!sc) return
    setActionLoading('aprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'aprovada',
        aprovador_id: eu!,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: null,
      })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao aprovar.'); setActionLoading(null); return }
    await logAcao('aprovou')
    toast.success('Solicitação aprovada')
    await fetchData()
    setActionLoading(null)
  }

  async function reprovar() {
    if (!sc) return
    if (!motivo.trim()) { toast.error('Informe o motivo da reprovação.'); return }
    setActionLoading('reprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'reprovada',
        aprovador_id: eu!,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: motivo.trim(),
      })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao reprovar.'); setActionLoading(null); return }
    await logAcao('reprovou', motivo.trim())
    toast.success('Solicitação reprovada')
    setModal(null); setMotivo('')
    await fetchData()
    setActionLoading(null)
  }

  async function cancelar() {
    if (!sc) return
    setActionLoading('cancelar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({ status: 'cancelada', cancelada_em: new Date().toISOString() })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao cancelar.'); setActionLoading(null); return }
    await logAcao('cancelou', motivo.trim() || undefined)
    toast.success('Solicitação cancelada')
    setModal(null); setMotivo('')
    await fetchData()
    setActionLoading(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
      </div>
    )
  }
  if (!sc) {
    return (
      <div className="text-center py-32">
        <p className="text-gray-500 dark:text-gray-400">Solicitação não encontrada.</p>
        <Link to="/compras/solicitacoes" className="mt-4 inline-block text-sm text-emerald-600 hover:underline">
          Voltar para listagem
        </Link>
      </div>
    )
  }

  const metaSc = etapaAtual ? metaEtapaProcessoSC(etapaAtual) : metaSolicitacao(sc.status)
  const prio = PRIORIDADE_META[sc.prioridade]

  // ── Header full-width ──
  const badges = (
    <>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${metaSc.badge}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${metaSc.dot}`} />
        {metaSc.label}
      </span>
      {sc.status !== 'aguardando_aprovacao' && sc.status !== 'atendida' && (
        <span className="text-[10px] text-gray-500 dark:text-gray-400" title="Status administrativo da SC">
          SC: {STATUS_META[sc.status].label}
        </span>
      )}
      {sc.prioridade !== 'normal' && (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${prio.badge}`}>
          {prio.label}
        </span>
      )}
    </>
  )

  const acoes = (
    <>
      {podeAprovar && (
        <>
          <Button
            isDisabled={actionLoading === 'aprovar'}
            onPress={aprovar}
            className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg"
          >
            <CheckCircle2 size={13} /> {actionLoading === 'aprovar' ? 'Aprovando…' : 'Aprovar'}
          </Button>
          <Button
            isDisabled={actionLoading === 'reprovar'}
            onPress={() => { setModal('reprovar'); setMotivo('') }}
            className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg"
          >
            <XCircle size={13} /> Reprovar
          </Button>
        </>
      )}
      {podeIniciarCotacao && (
        <Button
          onPress={() => navigate(`/compras/cotacoes/nova?sc=${sc.id}`)}
          className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg"
        >
          <FileSearch size={13} /> Iniciar cotação
        </Button>
      )}
      {podePedidoDireto && (
        <Button
          onPress={() => navigate(`/compras/pedidos/novo?sc=${sc.id}`)}
          className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg"
        >
          <ShoppingCart size={13} /> Pedido direto
        </Button>
      )}
      {podeCancelar && (
        <Button
          onPress={() => { setModal('cancelar'); setMotivo('') }}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5 rounded-lg"
        >
          <Ban size={13} /> Cancelar
        </Button>
      )}
    </>
  )

  const alerta = sc.status === 'reprovada' && sc.motivo_reprovacao ? (
    <AlertaLinha tom="red">
      Reprovada por {sc.aprovador?.nome ?? sc.aprovador?.email ?? '—'}: {sc.motivo_reprovacao}
    </AlertaLinha>
  ) : sc.status === 'cancelada' ? (
    <AlertaLinha tom="gray">Solicitação cancelada.</AlertaLinha>
  ) : null

  const faixaMeta = (
    <>
      <MetaChip label="Empresa">
        {sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social ?? '—'}
      </MetaChip>
      <MetaSep />
      <MetaChip label="Depto.">
        {sc.departamento
          ? (sc.departamento.codigo ? `${sc.departamento.codigo} · ${sc.departamento.nome}` : sc.departamento.nome)
          : '—'}
      </MetaChip>
      <MetaSep />
      <MetaChip label="Solicitante">
        {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
      </MetaChip>
      <MetaSep />
      <MetaChip label="Gestor">
        {sc.departamento?.gestor?.nome ?? sc.departamento?.gestor?.email ?? (
          <span className="text-amber-600 dark:text-amber-400">sem gestor</span>
        )}
      </MetaChip>
      {sc.data_necessaria && (
        <>
          <MetaSep />
          <MetaChip label="Necessária">{formatDate(sc.data_necessaria)}</MetaChip>
        </>
      )}
      <MetaSep />
      <MetaChip label="Itens">{itens.length}</MetaChip>
      {totalEstimado > 0 && (
        <>
          <MetaSep />
          <MetaChip label="Estimado" destaque>{formatMoney(totalEstimado)}</MetaChip>
        </>
      )}
    </>
  )

  const detalhes = (
    <dl className="space-y-2 text-sm">
      <PropLinha label="Empresa" icone={<Building2 size={11} />}>
        {sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social ?? '—'}
      </PropLinha>
      <PropLinha label="Departamento" icone={<Network size={11} />}>
        {sc.departamento
          ? (sc.departamento.codigo ? `${sc.departamento.codigo} · ${sc.departamento.nome}` : sc.departamento.nome)
          : '—'}
      </PropLinha>
      <PropLinha label="Solicitante" icone={<UserIcon size={11} />}>
        {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
      </PropLinha>
      <PropLinha label="Gestor (aprovador)" icone={<UserIcon size={11} />}>
        {sc.departamento?.gestor?.nome ?? sc.departamento?.gestor?.email ?? (
          <span className="text-amber-600 dark:text-amber-400">sem gestor definido</span>
        )}
      </PropLinha>
      <PropLinha label="Data necessária" icone={<Calendar size={11} />}>
        {formatDate(sc.data_necessaria)}
      </PropLinha>
      <PropLinha label="Total estimado">
        <span className="font-semibold tabular-nums text-gray-900 dark:text-gray-100">
          {formatMoney(totalEstimado)}
        </span>
      </PropLinha>
      <PropLinha label="Criada" icone={<Calendar size={11} />}>
        <span title={formatDateTime(sc.created_at)}>{formatDateTime(sc.created_at)}</span>
      </PropLinha>
      {sc.aprovado_em && (
        <PropLinha label="Aprovada em">{formatDateTime(sc.aprovado_em)}</PropLinha>
      )}
      {sc.justificativa && (
        <PropLinha label="Justificativa">
          <p className="whitespace-pre-wrap text-xs">{sc.justificativa}</p>
        </PropLinha>
      )}
      {sc.observacoes && (
        <PropLinha label="Observações">
          <p className="whitespace-pre-wrap text-xs">{sc.observacoes}</p>
        </PropLinha>
      )}
    </dl>
  )

  const painelVinculos = (
    <section className="space-y-4 text-sm">
      <VinculosLista grupos={gruposVinc} />
    </section>
  )

  const tabelaItens = (
    <div>
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/20">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          <strong className="text-gray-900 dark:text-gray-100">{itens.length}</strong> {itens.length === 1 ? 'item' : 'itens'}
        </p>
        {totalEstimado > 0 && (
          <p className="text-xs text-gray-500">
            Total estimado: <span className="font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{formatMoney(totalEstimado)}</span>
          </p>
        )}
      </div>
      {itens.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-gray-400">Sem itens.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500 w-10">#</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Produto</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Qtd.</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">UoM</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Preço estim.</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-gray-500">Total</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {itens.map(it => {
                const stMeta = metaItem(it.status_item)
                const totalLinha = Number(it.quantidade) * Number(it.preco_estimado ?? 0)
                return (
                  <tr key={it.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-3 py-2.5 align-top text-[11px] font-mono text-gray-400">{it.linha}</td>
                    <td className="px-3 py-2.5 align-top">
                      <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">{it.produto?.nome ?? '—'}</p>
                      <p className="text-[11px] text-gray-500 font-mono mt-0.5">{it.produto?.codigo}</p>
                      {it.observacao && <p className="text-[11px] text-gray-500 mt-0.5">{it.observacao}</p>}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums">{formatQty(it.quantidade)}</td>
                    <td className="px-3 py-2.5 align-top text-gray-500">{it.unidade_medida?.sigla ?? ''}</td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums text-gray-600 dark:text-gray-300">
                      {it.preco_estimado != null ? formatMoney(it.preco_estimado) : '—'}
                    </td>
                    <td className="px-3 py-2.5 align-top text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100">
                      {it.preco_estimado != null ? formatMoney(totalLinha) : '—'}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        title={resumoEtapaItem(it.status_item) ?? undefined}
                        className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${stMeta.badge}`}
                      >
                        <span className={`h-1 w-1 rounded-full ${stMeta.dot}`} />
                        {stMeta.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  const painelSecoes: PainelSecao[] = [
    { id: 'historico', label: 'Histórico', badge: historico.length, conteudo: <HistoricoTimeline eventos={historico} /> },
    { id: 'vinculos', label: 'Vínculos', badge: (cotacoes.length + pedidos.length + recebimentos.length) || undefined, conteudo: painelVinculos },
    { id: 'detalhes', label: 'Detalhes', conteudo: detalhes },
  ]

  return (
    <>
      <LayoutDetalheFocado
        voltar={<BotaoVoltar fallback="/compras/solicitacoes" label="Voltar" />}
        titulo={sc.numero}
        subtitulo={
          sc.departamento
            ? (sc.departamento.codigo ? `${sc.departamento.codigo} · ${sc.departamento.nome}` : sc.departamento.nome)
            : (sc.solicitante?.nome ?? sc.solicitante?.email ?? undefined)
        }
        badges={badges}
        acoes={acoes}
        meta={faixaMeta}
        vinculos={<VinculosBar grupos={gruposVinc} />}
        alerta={alerta}
        fluxo={
          <FaixaEtapasToolbar
            etapas={ETAPAS_PROCESSO_SC}
            contagens={contagensEtapas}
            meta={metaEtapaProcessoSC}
            apenasVisualizacao
            etapaAtual={etapaAtual}
          />
        }
        principal={tabelaItens}
        painelSecoes={painelSecoes}
      />

      {modal && (
        <MotivoModal
          titulo={modal === 'reprovar' ? 'Reprovar solicitação' : 'Cancelar solicitação'}
          descricao={modal === 'reprovar'
            ? 'Informe o motivo da reprovação. Ele ficará visível ao solicitante.'
            : 'Você pode informar um motivo (opcional).'}
          obrigatorio={modal === 'reprovar'}
          confirmLabel={modal === 'reprovar' ? 'Reprovar' : 'Cancelar SC'}
          confirmTone={modal === 'reprovar' ? 'red' : 'gray'}
          loading={actionLoading === modal}
          motivo={motivo}
          onMotivoChange={setMotivo}
          onCancelar={() => { setModal(null); setMotivo('') }}
          onConfirmar={() => { if (modal === 'reprovar') reprovar(); else cancelar() }}
        />
      )}
    </>
  )
}
