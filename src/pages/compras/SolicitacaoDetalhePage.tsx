import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ChevronLeft, Edit3, Send, CheckCircle2, XCircle, Ban, FileText, Package,
  Building2, Calendar, User as UserIcon, MessageSquare, History, AlertCircle, Network,
} from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type {
  CmpAprovacao, CmpSolicitacao, CmpSolicitacaoItem,
  CoreDepartamento, CoreEmpresa,
  PrdProduto, PrdUnidadeMedida, Profile,
} from '@/types/database'
import { ITEM_STATUS_META, PRIORIDADE_META, STATUS_META, formatDate, formatDateTime, formatMoney, formatQty } from './_shared'

type SolicitacaoFull = CmpSolicitacao & {
  empresa?: CoreEmpresa
  departamento?: CoreDepartamento & { gestor?: Profile }
  solicitante?: Profile
  aprovador?: Profile
}

type ItemFull = CmpSolicitacaoItem & {
  produto?: PrdProduto
  unidade_medida?: PrdUnidadeMedida
}

type EventoTimeline = CmpAprovacao & { aprovador?: Profile }

export function SolicitacaoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()

  const [sc, setSc] = useState<SolicitacaoFull | null>(null)
  const [itens, setItens] = useState<ItemFull[]>([])
  const [timeline, setTimeline] = useState<EventoTimeline[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const [modal, setModal] = useState<null | 'reprovar' | 'cancelar'>(null)
  const [motivo, setMotivo] = useState('')

  const fetchData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const [scResp, itensResp, timelineResp] = await Promise.all([
      supabase.from('cmp_solicitacoes_compra').select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia,cnpj,ativo,created_at,updated_at),
        departamento:core_departamentos(id,codigo,nome,descricao,gestor_id,ativo,created_at,updated_at,
          gestor:profiles!core_departamentos_gestor_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
        ),
        solicitante:profiles!cmp_solicitacoes_compra_solicitante_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at),
        aprovador:profiles!cmp_solicitacoes_compra_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('id', id).maybeSingle(),
      supabase.from('cmp_solicitacoes_compra_itens').select(`
        *,
        produto:prd_produtos(id,codigo,nome,unidade_medida_id,tipo,descricao,imagem_url,ativo,created_at,updated_at,empresa_id,codigo_origem),
        unidade_medida:prd_unidades_medida(id,nome,sigla,ativo)
      `).eq('solicitacao_id', id).order('linha'),
      supabase.from('cmp_aprovacoes').select(`
        *,
        aprovador:profiles!cmp_aprovacoes_aprovador_id_fkey(id,nome,email,role,ativo,avatar_url,departamento_id,created_at,updated_at)
      `).eq('documento_tipo', 'solicitacao').eq('documento_id', id).order('created_at'),
    ])
    setSc((scResp.data as SolicitacaoFull) ?? null)
    setItens((itensResp.data ?? []) as ItemFull[])
    setTimeline((timelineResp.data ?? []) as EventoTimeline[])
    setLoading(false)
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Permissões derivadas ──────────────────────────────────
  const eu = profile?.id
  const ehAdmin     = profile?.role === 'admin'
  const ehGestor    = !!sc?.departamento?.gestor_id && sc.departamento.gestor_id === eu
  const ehDono      = sc?.solicitante_id === eu
  const podeAprovar = (ehAdmin || ehGestor) && sc?.status === 'aguardando_aprovacao'
  const podeEditar  = ehDono && sc?.status === 'rascunho'
  const podeEnviar  = ehDono && sc?.status === 'rascunho' && itens.length > 0
  const podeCancelar = (ehDono || ehAdmin) && sc?.status && !['atendida', 'cancelada', 'reprovada'].includes(sc.status)

  const totalEstimado = itens.reduce((s, it) => s + Number(it.quantidade) * Number(it.preco_estimado ?? 0), 0)

  // ── Ações ─────────────────────────────────────────────────
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

  async function enviarParaAprovacao() {
    if (!sc) return
    setActionLoading('enviar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({ status: 'aguardando_aprovacao', enviada_em: new Date().toISOString() })
      .eq('id', sc.id)
    if (error) { toast.error('Erro ao enviar.'); setActionLoading(null); return }
    await logAcao('enviou')
    toast.success('Enviada para aprovação')
    await fetchData()
    setActionLoading(null)
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

  // ── Render ────────────────────────────────────────────────
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

  const meta = STATUS_META[sc.status]
  const prio = PRIORIDADE_META[sc.prioridade]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/compras/solicitacoes"
          className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors mb-2"
        >
          <ChevronLeft size={14} /> Solicitações
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <FileText size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-mono font-semibold text-gray-900 dark:text-gray-100">{sc.numero}</h1>
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${meta.badge}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                  {meta.label}
                </span>
                {sc.prioridade !== 'normal' && (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${prio.badge}`}>
                    {prio.label}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                Criada {formatDateTime(sc.created_at)}
              </p>
            </div>
          </div>

          {/* Ações contextuais */}
          <div className="flex items-center gap-2 flex-wrap">
            {podeEditar && (
              <Button
                onPress={() => navigate(`/compras/solicitacoes/${sc.id}/editar`)}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <Edit3 size={14} /> Editar
              </Button>
            )}
            {podeEnviar && (
              <Button
                isDisabled={actionLoading === 'enviar'}
                onPress={enviarParaAprovacao}
                className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <Send size={14} /> {actionLoading === 'enviar' ? 'Enviando…' : 'Enviar para aprovação'}
              </Button>
            )}
            {podeAprovar && (
              <>
                <Button
                  isDisabled={actionLoading === 'reprovar'}
                  onPress={() => { setModal('reprovar'); setMotivo('') }}
                  className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <XCircle size={14} /> Reprovar
                </Button>
                <Button
                  isDisabled={actionLoading === 'aprovar'}
                  onPress={aprovar}
                  className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
                >
                  <CheckCircle2 size={14} /> {actionLoading === 'aprovar' ? 'Aprovando…' : 'Aprovar'}
                </Button>
              </>
            )}
            {podeCancelar && (
              <Button
                onPress={() => { setModal('cancelar'); setMotivo('') }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
              >
                <Ban size={14} /> Cancelar
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Aviso de reprovação */}
      {sc.status === 'reprovada' && sc.motivo_reprovacao && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Reprovada por {sc.aprovador?.nome ?? sc.aprovador?.email ?? '—'}</p>
            <p className="mt-0.5 text-red-700/80 dark:text-red-300/80">{sc.motivo_reprovacao}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Resumo */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Resumo</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 px-5 py-4 text-sm">
              <InfoBlock label="Empresa" icon={Building2}>
                {sc.empresa?.nome_fantasia ?? sc.empresa?.razao_social ?? '—'}
              </InfoBlock>
              <InfoBlock label="Departamento" icon={Network}>
                {sc.departamento
                  ? (sc.departamento.codigo ? `${sc.departamento.codigo} · ${sc.departamento.nome}` : sc.departamento.nome)
                  : '—'}
              </InfoBlock>
              <InfoBlock label="Solicitante" icon={UserIcon}>
                {sc.solicitante?.nome ?? sc.solicitante?.email ?? '—'}
              </InfoBlock>
              <InfoBlock label="Gestor (aprovador)" icon={UserIcon}>
                {sc.departamento?.gestor?.nome ?? sc.departamento?.gestor?.email ?? (
                  <span className="text-amber-600 dark:text-amber-400">sem gestor definido</span>
                )}
              </InfoBlock>
              <InfoBlock label="Data necessária" icon={Calendar}>
                {formatDate(sc.data_necessaria)}
              </InfoBlock>
              <InfoBlock label="Prioridade">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${prio.badge}`}>
                  {prio.label}
                </span>
              </InfoBlock>
              <div className="col-span-2 md:col-span-3">
                <InfoBlock label="Justificativa">
                  <span className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{sc.justificativa ?? '—'}</span>
                </InfoBlock>
              </div>
              {sc.observacoes && (
                <div className="col-span-2 md:col-span-3">
                  <InfoBlock label="Observações">
                    <span className="whitespace-pre-wrap text-gray-700 dark:text-gray-200">{sc.observacoes}</span>
                  </InfoBlock>
                </div>
              )}
            </div>
          </section>

          {/* Itens */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Itens <span className="text-gray-400 dark:text-gray-500 font-normal">({itens.length})</span>
              </h2>
              {totalEstimado > 0 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Total estimado: <span className="font-semibold text-gray-800 dark:text-gray-200">{formatMoney(totalEstimado)}</span>
                </span>
              )}
            </div>
            {itens.length === 0 ? (
              <div className="py-12 text-center">
                <Package size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">Sem itens.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50/60 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 w-10">#</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Produto</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Qtd.</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">UoM</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Preço estim.</th>
                      <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Total estim.</th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {itens.map(it => {
                      const totalLinha = Number(it.quantidade) * Number(it.preco_estimado ?? 0)
                      const stMeta = ITEM_STATUS_META[it.status_item]
                      return (
                        <tr key={it.id} className="hover:bg-gray-50/40 dark:hover:bg-gray-800/40 transition-colors">
                          <td className="px-3 py-3 text-gray-400 dark:text-gray-500 font-mono align-top">{it.linha}</td>
                          <td className="px-3 py-3 align-top">
                            <div className="flex items-start gap-2">
                              <Package size={14} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{it.produto?.nome ?? '—'}</p>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 font-mono">
                                  {it.produto?.codigo}
                                  {it.produto?.tipo === 'servico' && <span className="ml-2 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 px-1.5 py-0.5 text-[10px] font-semibold">SERVIÇO</span>}
                                </p>
                                {it.observacao && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{it.observacao}</p>}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-200 align-top">{formatQty(it.quantidade)}</td>
                          <td className="px-3 py-3 text-gray-500 dark:text-gray-400 align-top">{it.unidade_medida?.sigla ?? '—'}</td>
                          <td className="px-3 py-3 text-right tabular-nums text-gray-700 dark:text-gray-300 align-top">{formatMoney(it.preco_estimado)}</td>
                          <td className="px-3 py-3 text-right tabular-nums font-semibold text-gray-800 dark:text-gray-100 align-top">
                            {it.preco_estimado != null ? formatMoney(totalLinha) : '—'}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${stMeta.badge}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${stMeta.dot}`} />
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
          </section>
        </div>

        {/* Coluna lateral: Timeline */}
        <aside>
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3 flex items-center gap-2">
              <History size={14} className="text-gray-400" />
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Linha do tempo</h2>
            </div>
            <Timeline sc={sc} eventos={timeline} />
          </section>
        </aside>
      </div>

      {/* Modal motivo */}
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
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Timeline
// ────────────────────────────────────────────────────────────────

const ACAO_META: Record<string, { label: string; cor: string; icone: typeof Send }> = {
  enviou:    { label: 'Enviou para aprovação', cor: 'bg-amber-500',   icone: Send },
  aprovou:   { label: 'Aprovou',               cor: 'bg-emerald-500', icone: CheckCircle2 },
  reprovou:  { label: 'Reprovou',              cor: 'bg-red-500',     icone: XCircle },
  cancelou:  { label: 'Cancelou',              cor: 'bg-gray-400',    icone: Ban },
  encaminhou:{ label: 'Encaminhou',            cor: 'bg-blue-500',    icone: Send },
}

function Timeline({ sc, eventos }: { sc: SolicitacaoFull; eventos: EventoTimeline[] }) {
  const itensTl: Array<{
    icone: typeof Send | typeof FileText
    cor: string
    titulo: string
    quem?: string
    quando: string
    comentario?: string | null
  }> = []

  itensTl.push({
    icone: FileText,
    cor: 'bg-blue-500',
    titulo: 'Solicitação criada',
    quem: sc.solicitante?.nome ?? sc.solicitante?.email,
    quando: sc.created_at,
  })

  eventos.forEach(ev => {
    const meta = ACAO_META[ev.acao] ?? { label: ev.acao, cor: 'bg-gray-400', icone: Send }
    itensTl.push({
      icone: meta.icone,
      cor: meta.cor,
      titulo: meta.label,
      quem: ev.aprovador?.nome ?? ev.aprovador?.email,
      quando: ev.created_at,
      comentario: ev.comentario,
    })
  })

  if (itensTl.length === 1 && sc.status === 'rascunho') {
    itensTl.push({
      icone: Send,
      cor: 'bg-gray-300 dark:bg-gray-700',
      titulo: 'Aguardando envio',
      quando: '',
    })
  }

  return (
    <ol className="relative px-5 py-4 space-y-4">
      <div className="absolute left-[34px] top-6 bottom-6 w-px bg-gray-200 dark:bg-gray-700" />
      {itensTl.map((ev, idx) => {
        const Icon = ev.icone
        return (
          <li key={idx} className="relative pl-10">
            <span className={`absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full ${ev.cor} ring-4 ring-white dark:ring-gray-900`}>
              <Icon size={12} className="text-white" />
            </span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{ev.titulo}</p>
            {ev.quem && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">por {ev.quem}</p>
            )}
            {ev.quando && (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{formatDateTime(ev.quando)}</p>
            )}
            {ev.comentario && (
              <div className="mt-1.5 flex items-start gap-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/60 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-300">
                <MessageSquare size={11} className="mt-0.5 shrink-0 text-gray-400" />
                <span className="whitespace-pre-wrap">{ev.comentario}</span>
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// ────────────────────────────────────────────────────────────────
// Modal de motivo
// ────────────────────────────────────────────────────────────────

function MotivoModal({
  titulo, descricao, obrigatorio, confirmLabel, confirmTone, loading,
  motivo, onMotivoChange, onCancelar, onConfirmar,
}: {
  titulo: string
  descricao: string
  obrigatorio: boolean
  confirmLabel: string
  confirmTone: 'red' | 'gray'
  loading: boolean
  motivo: string
  onMotivoChange: (v: string) => void
  onCancelar: () => void
  onConfirmar: () => void
}) {
  const toneCls = confirmTone === 'red'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-gray-700 hover:bg-gray-800 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
        </div>
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Motivo {obrigatorio && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={motivo}
            onChange={e => onMotivoChange(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            placeholder={obrigatorio ? 'Obrigatório' : 'Opcional'}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button
            onClick={onCancelar}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <Button
            isDisabled={loading || (obrigatorio && !motivo.trim())}
            onPress={onConfirmar}
            className={`${toneCls} aria-disabled:opacity-60 px-4 py-2 text-sm font-medium`}
          >
            {loading ? 'Processando…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// InfoBlock
// ────────────────────────────────────────────────────────────────

function InfoBlock({ label, icon: Icon, children }: { label: string; icon?: typeof Building2; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-0.5">
        {Icon && <Icon size={11} />} {label}
      </p>
      <div className="text-sm text-gray-800 dark:text-gray-200">{children}</div>
    </div>
  )
}
