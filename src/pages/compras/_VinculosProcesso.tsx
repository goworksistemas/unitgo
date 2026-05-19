import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, FileSearch, ShoppingCart, Receipt, Network, Store,
} from 'lucide-react'
import type {
  CmpCotacaoStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  COTACAO_STATUS_META, PEDIDO_STATUS_META, STATUS_META,
  formatDate, formatDateTime, formatMoney, formatQty,
  type StatusMeta,
} from './_shared'

export type TipoVinculo = 'sc' | 'cotacao' | 'pedido' | 'recebimento' | 'ml'

export type VinculoItemResumo = {
  linha?: number
  nome: string
  codigo?: string | null
  quantidade?: number
  unidade?: string | null
  preco_unitario?: number
  total?: number
  quantidade_recebida?: number
}

export type VinculoTooltipData = {
  titulo: string
  linhas: Array<{ label: string; value: string }>
  itens?: VinculoItemResumo[]
}

export type VinculoRef = {
  id: string
  tipo: TipoVinculo
  numero: string
  status?: string
  subtitulo?: string
  tooltip: VinculoTooltipData
  href?: string
}

export type VinculoGrupo = {
  label: string
  itens: VinculoRef[]
}

const TIPO_META: Record<TipoVinculo, { rotulo: string; icone: typeof FileText; cor: string }> = {
  sc: { rotulo: 'SC', icone: FileText, cor: 'text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/40' },
  cotacao: { rotulo: 'Cotação', icone: FileSearch, cor: 'text-violet-700 dark:text-violet-300 border-violet-200 dark:border-violet-800 bg-violet-50/80 dark:bg-violet-950/40' },
  pedido: { rotulo: 'Pedido', icone: ShoppingCart, cor: 'text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 bg-indigo-50/80 dark:bg-indigo-950/40' },
  recebimento: { rotulo: 'Receb.', icone: Receipt, cor: 'text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 bg-sky-50/80 dark:bg-sky-950/40' },
  ml: { rotulo: 'ML', icone: Store, cor: 'text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 bg-amber-50/80 dark:bg-amber-950/40' },
}

const MAX_ITENS_TOOLTIP = 8

export function vinculoHref(tipo: TipoVinculo, id: string): string {
  switch (tipo) {
    case 'sc': return `/compras/solicitacoes/${id}`
    case 'cotacao': return `/compras/cotacoes/${id}`
    case 'pedido': return `/compras/pedidos/${id}`
    case 'recebimento': return `/compras/recebimentos`
    case 'ml': return `/compras/mercado-livre/${id}`
    default: return '#'
  }
}

function statusMeta(tipo: TipoVinculo, status: string | undefined): StatusMeta | null {
  if (!status) return null
  if (tipo === 'sc') return STATUS_META[status as CmpSolicitacaoStatus] ?? null
  if (tipo === 'cotacao') return COTACAO_STATUS_META[status as CmpCotacaoStatus] ?? null
  if (tipo === 'pedido') return PEDIDO_STATUS_META[status as CmpPedidoStatus] ?? null
  return null
}

function nomeFornecedor(f?: { razao_social?: string; nome_fantasia?: string | null } | null): string {
  if (!f) return ''
  return f.nome_fantasia ?? f.razao_social ?? ''
}

function linhaKV(label: string, value: string | null | undefined) {
  if (!value) return null
  return { label, value }
}

function formatItensResumo(itens: VinculoItemResumo[] | undefined): VinculoItemResumo[] {
  return (itens ?? []).map(i => ({
    linha: i.linha,
    nome: i.nome || '—',
    codigo: i.codigo,
    quantidade: i.quantidade,
    unidade: i.unidade,
    preco_unitario: i.preco_unitario,
    total: i.total,
    quantidade_recebida: i.quantidade_recebida,
  }))
}

type PedidoVincBase = {
  id: string
  numero: string
  status: CmpPedidoStatus
  fornecedor?: { razao_social: string; nome_fantasia: string | null } | null
  created_at?: string
  enviado_em?: string | null
  total?: number
  qtd_total?: number
  qtd_recebida?: number
  itens_resumo?: VinculoItemResumo[]
}

function tooltipPedido(pd: PedidoVincBase): VinculoTooltipData {
  const forn = nomeFornecedor(pd.fornecedor)
  const qtdT = pd.qtd_total ?? 0
  const qtdR = pd.qtd_recebida ?? 0
  const pct = qtdT > 0 ? Math.min(100, (qtdR / qtdT) * 100) : 0
  const itens = formatItensResumo(pd.itens_resumo)

  const linhas = [
    linhaKV('Status', PEDIDO_STATUS_META[pd.status].label),
    linhaKV('Fornecedor', forn),
    linhaKV('Total', pd.total != null ? formatMoney(pd.total) : undefined),
    linhaKV('Recebimento', qtdT > 0
      ? `${formatQty(qtdR)} / ${formatQty(qtdT)} (${pct.toFixed(0)}%)`
      : undefined),
    linhaKV('Criado', pd.created_at ? formatDateTime(pd.created_at) : undefined),
    linhaKV('Enviado', pd.enviado_em ? formatDateTime(pd.enviado_em) : undefined),
    linhaKV('Itens', itens.length > 0 ? `${itens.length} linha(s)` : 'Sem itens'),
  ].filter((x): x is { label: string; value: string } => x != null)

  return {
    titulo: `Pedido ${pd.numero}`,
    linhas,
    itens,
  }
}

function refPedido(pd: PedidoVincBase): VinculoRef {
  const forn = nomeFornecedor(pd.fornecedor)
  return {
    id: pd.id,
    tipo: 'pedido',
    numero: pd.numero,
    status: pd.status,
    subtitulo: forn || undefined,
    tooltip: tooltipPedido(pd),
  }
}

// ── Builders ──

export function gruposVinculosSC(p: {
  cotacoes: Array<{
    id: string; numero: string; titulo: string
    status: CmpCotacaoStatus
    comprador?: { nome?: string | null; email?: string | null } | null
    prazo_resposta?: string | null
    created_at?: string
    itens_count?: number
    fornecedores_count?: number
    total_escolhido?: number
  }>
  pedidos: PedidoVincBase[]
  recebimentos: Array<{
    id: string; numero: string; pedido_id: string
    data_recebimento: string; observacoes?: string | null
    pedido_numero?: string
  }>
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  if (p.cotacoes.length > 0) {
    grupos.push({
      label: 'Cotações',
      itens: p.cotacoes.map(c => ({
        id: c.id,
        tipo: 'cotacao',
        numero: c.numero,
        status: c.status,
        subtitulo: c.titulo,
        tooltip: {
          titulo: `Cotação ${c.numero}`,
          linhas: [
            linhaKV('Título', c.titulo),
            linhaKV('Status', COTACAO_STATUS_META[c.status].label),
            linhaKV('Itens', `${c.itens_count ?? 0}`),
            linhaKV('Fornecedores', `${c.fornecedores_count ?? 0}`),
            linhaKV('Total escolhido', (c.total_escolhido ?? 0) > 0 ? formatMoney(c.total_escolhido) : undefined),
            linhaKV('Comprador', c.comprador?.nome ?? c.comprador?.email ?? undefined),
            linhaKV('Prazo resposta', c.prazo_resposta ? formatDate(c.prazo_resposta) : undefined),
            linhaKV('Criada', c.created_at ? formatDateTime(c.created_at) : undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  if (p.pedidos.length > 0) {
    grupos.push({
      label: 'Pedidos',
      itens: p.pedidos.map(refPedido),
    })
  }

  if (p.recebimentos.length > 0) {
    grupos.push({
      label: 'Recebimentos',
      itens: p.recebimentos.map(r => ({
        id: r.id,
        tipo: 'recebimento',
        numero: r.numero,
        subtitulo: r.pedido_numero ? `Ped. ${r.pedido_numero}` : undefined,
        href: `/compras/pedidos/${r.pedido_id}`,
        tooltip: {
          titulo: `Recebimento ${r.numero}`,
          linhas: [
            linhaKV('Pedido', r.pedido_numero),
            linhaKV('Data', formatDateTime(r.data_recebimento)),
            linhaKV('Observações', r.observacoes ?? undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  return grupos
}

export function gruposVinculosCotacao(p: {
  scs: Array<{ id: string; numero: string; status: CmpSolicitacaoStatus }>
  pedidos: PedidoVincBase[]
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  if (p.scs.length > 0) {
    grupos.push({
      label: 'SCs',
      itens: p.scs.map(s => ({
        id: s.id,
        tipo: 'sc',
        numero: s.numero,
        status: s.status,
        tooltip: {
          titulo: `Solicitação ${s.numero}`,
          linhas: [
            linhaKV('Status', STATUS_META[s.status].label),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  if (p.pedidos.length > 0) {
    grupos.push({
      label: 'Pedidos',
      itens: p.pedidos.map(refPedido),
    })
  }

  return grupos
}

export function gruposVinculosPedido(p: {
  cotacao?: { id: string; numero: string; status?: string; titulo?: string } | null
  scs: Array<{ id: string; numero: string; status: CmpSolicitacaoStatus }>
  recebimentos: Array<{
    id: string; numero: string; data_recebimento: string
    observacoes?: string | null
    recebedor?: { nome?: string | null; email?: string | null } | null
  }>
  mlPedidoId?: string | null
}): VinculoGrupo[] {
  const grupos: VinculoGrupo[] = []

  if (p.cotacao) {
    const st = p.cotacao.status as CmpCotacaoStatus | undefined
    grupos.push({
      label: 'Cotação',
      itens: [{
        id: p.cotacao.id,
        tipo: 'cotacao',
        numero: p.cotacao.numero,
        status: p.cotacao.status,
        subtitulo: p.cotacao.titulo,
        tooltip: {
          titulo: `Cotação ${p.cotacao.numero}`,
          linhas: [
            linhaKV('Título', p.cotacao.titulo),
            st ? linhaKV('Status', COTACAO_STATUS_META[st].label) : null,
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      }],
    })
  }

  if (p.scs.length > 0) {
    grupos.push({
      label: 'SCs',
      itens: p.scs.map(s => ({
        id: s.id,
        tipo: 'sc',
        numero: s.numero,
        status: s.status,
        tooltip: {
          titulo: `SC ${s.numero}`,
          linhas: [linhaKV('Status', STATUS_META[s.status].label)!],
        },
      })),
    })
  }

  if (p.recebimentos.length > 0) {
    grupos.push({
      label: 'Recebimentos',
      itens: p.recebimentos.map(r => ({
        id: r.id,
        tipo: 'recebimento',
        numero: r.numero,
        tooltip: {
          titulo: `Recebimento ${r.numero}`,
          linhas: [
            linhaKV('Data', formatDateTime(r.data_recebimento)),
            linhaKV('Recebedor', r.recebedor?.nome ?? r.recebedor?.email ?? undefined),
            linhaKV('Observações', r.observacoes ?? undefined),
          ].filter((x): x is { label: string; value: string } => x != null),
        },
      })),
    })
  }

  if (p.mlPedidoId) {
    grupos.push({
      label: 'Mercado Livre',
      itens: [{
        id: p.mlPedidoId,
        tipo: 'ml',
        numero: 'Pedido ML',
        tooltip: {
          titulo: 'Mercado Livre',
          linhas: [
            { label: 'Vínculo', value: 'Pedido integrado ao ML' },
            { label: 'Ação', value: 'Abrir detalhe ML' },
          ],
        },
      }],
    })
  }

  return grupos
}

/** Converte itens da RPC cmp_detalhe_pedido para resumo de tooltip */
export function itensResumoFromPedidoItens(
  itens: Array<{
    linha: number
    quantidade: number
    preco_unitario: number
    quantidade_recebida: number
    produto?: { codigo: string; nome: string } | null
    unidade_medida?: { sigla: string } | null
  }>,
): VinculoItemResumo[] {
  return itens.map(it => ({
    linha: it.linha,
    nome: it.produto?.nome ?? '—',
    codigo: it.produto?.codigo,
    quantidade: it.quantidade,
    unidade: it.unidade_medida?.sigla,
    preco_unitario: it.preco_unitario,
    total: Number(it.quantidade) * Number(it.preco_unitario),
    quantidade_recebida: it.quantidade_recebida,
  }))
}

// ── UI ──

function VinculoTooltip({ children, data }: { children: ReactNode; data: VinculoTooltipData }) {
  const itens = data.itens ?? []
  const itensVisiveis = itens.slice(0, MAX_ITENS_TOOLTIP)
  const itensRestantes = itens.length - itensVisiveis.length

  return (
    <span className="group/tip relative inline-flex max-w-full">
      {children}
      <span
        role="tooltip"
        className="absolute left-0 bottom-[calc(100%+8px)] z-[80] hidden group-hover/tip:block group-focus-within/tip:block pointer-events-none"
      >
        <span className="block rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl px-3 py-2.5 text-[11px] leading-snug min-w-[220px] max-w-[min(360px,92vw)]">
          <p className="font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-gray-800 pb-1.5 mb-2">
            {data.titulo}
          </p>

          {data.linhas.length > 0 && (
            <dl className="space-y-1 mb-2">
              {data.linhas.map(row => (
                <div key={`${row.label}-${row.value}`} className="grid grid-cols-[minmax(72px,auto)_1fr] gap-x-2 gap-y-0">
                  <dt className="text-[10px] font-medium text-gray-400 dark:text-gray-500">{row.label}</dt>
                  <dd className="text-[10px] text-gray-800 dark:text-gray-200 text-right tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {itens.length > 0 ? (
            <section>
              <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1.5">
                Itens ({itens.length})
              </p>
              <ul className="space-y-2 pl-0.5 border-l-2 border-indigo-200 dark:border-indigo-800 ml-0.5">
                {itensVisiveis.map((it, idx) => (
                  <li key={it.linha ?? idx} className="pl-2">
                    <p className="font-medium text-gray-900 dark:text-gray-100 leading-tight">
                      {it.linha != null && (
                        <span className="text-gray-400 font-mono mr-1">#{it.linha}</span>
                      )}
                      {it.nome}
                    </p>
                    {it.codigo && (
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{it.codigo}</p>
                    )}
                    <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 tabular-nums">
                      {formatQty(it.quantidade)} {it.unidade ?? ''}
                      {it.preco_unitario != null && (
                        <> × {formatMoney(it.preco_unitario)}</>
                      )}
                      {it.total != null && (
                        <span className="font-semibold text-gray-800 dark:text-gray-200">
                          {' '}= {formatMoney(it.total)}
                        </span>
                      )}
                    </p>
                    {(it.quantidade_recebida != null && it.quantidade != null) && (
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Recebido: {formatQty(it.quantidade_recebida)} / {formatQty(it.quantidade)}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
              {itensRestantes > 0 && (
                <p className="text-[10px] text-gray-400 mt-1.5 italic pl-2">
                  + {itensRestantes} item(ns) — abra o pedido para ver todos
                </p>
              )}
            </section>
          ) : data.titulo.toLowerCase().includes('pedido') ? (
            <p className="text-[10px] text-gray-400 italic">Nenhum item neste pedido.</p>
          ) : null}
        </span>
      </span>
    </span>
  )
}

export function VinculoChip({ item, className = '' }: { item: VinculoRef; className?: string }) {
  const meta = TIPO_META[item.tipo]
  const Icon = meta.icone
  const st = statusMeta(item.tipo, item.status)
  const to = item.href ?? vinculoHref(item.tipo, item.id)

  return (
    <VinculoTooltip data={item.tooltip}>
      <Link
        to={to}
        className={`inline-flex items-center gap-1 max-w-full rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors hover:brightness-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 ${meta.cor} ${className}`}
      >
        <Icon size={11} className="shrink-0 opacity-80" aria-hidden />
        <span className="font-mono truncate">{item.numero}</span>
        {item.subtitulo && (
          <span className="truncate text-[10px] opacity-75 max-w-[100px] hidden sm:inline">
            {item.subtitulo}
          </span>
        )}
        {st && (
          <span className={`shrink-0 rounded-full px-1 py-px text-[9px] font-semibold leading-none ${st.badge}`}>
            {st.label}
          </span>
        )}
      </Link>
    </VinculoTooltip>
  )
}

export function VinculosBar({ grupos, className = '' }: { grupos: VinculoGrupo[]; className?: string }) {
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  if (total === 0) return null

  return (
    <section
      className={`flex items-start gap-2 flex-wrap rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50/90 dark:bg-gray-900/60 px-2 py-1.5 ${className}`}
      aria-label="Vínculos do processo"
    >
      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 pt-0.5">
        <Network size={12} aria-hidden />
        Vínculos
      </span>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 min-w-0 flex-1">
        {grupos.map(g => (
          <div key={g.label} className="inline-flex flex-wrap items-center gap-1 min-w-0">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase shrink-0">
              {g.label}
            </span>
            {g.itens.map(it => (
              <VinculoChip key={`${it.tipo}-${it.id}`} item={it} />
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}

export function VinculosLista({ grupos }: { grupos: VinculoGrupo[] }) {
  const total = grupos.reduce((n, g) => n + g.itens.length, 0)
  if (total === 0) {
    return <p className="text-xs text-gray-400 px-1">Nenhum vínculo registrado.</p>
  }

  return (
    <div className="space-y-3">
      {grupos.map(g => (
        <div key={g.label}>
          <p className="text-[10px] font-semibold uppercase text-gray-500 mb-1.5">{g.label}</p>
          <ul className="flex flex-wrap gap-1.5">
            {g.itens.map(it => (
              <li key={`${it.tipo}-${it.id}`}>
                <VinculoChip item={it} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
