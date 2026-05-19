import { useMemo, useState, type ComponentType } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, FileSearch, ShoppingCart, Receipt, Send, CheckCircle2,
  XCircle, Ban, Crown, Truck, MessageSquare, Filter as FilterIcon,
  History, ChevronRight, Plus,
} from 'lucide-react'
import { formatDateTime, formatRelativeTime, getIniciais } from './_shared'

export type FonteEvento = 'solicitacao' | 'cotacao' | 'pedido' | 'recebimento' | 'fornecedor'

export type TomEvento =
  | 'blue' | 'amber' | 'emerald' | 'red' | 'gray' | 'violet' | 'indigo' | 'sky' | 'pink'

/**
 * Evento de histórico exatamente como a RPC `cmp_historico` retorna (snake_case).
 *
 * Os campos visuais (tom + ícone + link) NÃO vêm da RPC — são derivados
 * no frontend a partir de `(fonte, acao)` e `(link_tipo, link_id)`.
 */
export type EventoHistorico = {
  id: string
  quando: string
  fonte: FonteEvento
  /** Verbo na BD, ex.: 'criou', 'aprovou', 'reprovou', 'marcou_enviado'. */
  acao: string
  /** Frase humana já montada na RPC, ex.: "aprovou a solicitação". */
  titulo: string
  /** Nome do ator (pessoa/sistema/fornecedor). Quando ausente, usa só o ícone. */
  quem?: string | null
  /** Comentário ou motivo opcional. */
  comentario?: string | null
  /** Tipo do objeto vinculado para montar o link. */
  link_tipo?: 'solicitacao' | 'cotacao' | 'pedido' | null
  link_id?: string | null
  /** Número humano do objeto vinculado, ex.: "SC-00001". */
  contexto_numero?: string | null
}

const TOM_CLS: Record<TomEvento, { avatar: string; dot: string; texto: string; border: string; badge: string }> = {
  blue:    { avatar: 'bg-blue-100 dark:bg-blue-950/60',       dot: 'bg-blue-500',    texto: 'text-blue-700 dark:text-blue-300',       border: 'border-blue-200 dark:border-blue-800',       badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300' },
  amber:   { avatar: 'bg-amber-100 dark:bg-amber-950/60',     dot: 'bg-amber-500',   texto: 'text-amber-700 dark:text-amber-300',     border: 'border-amber-200 dark:border-amber-800',     badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300' },
  emerald: { avatar: 'bg-emerald-100 dark:bg-emerald-950/60', dot: 'bg-emerald-500', texto: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' },
  red:     { avatar: 'bg-red-100 dark:bg-red-950/60',         dot: 'bg-red-500',     texto: 'text-red-700 dark:text-red-300',         border: 'border-red-200 dark:border-red-800',         badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300' },
  gray:    { avatar: 'bg-gray-100 dark:bg-gray-800',          dot: 'bg-gray-400',    texto: 'text-gray-700 dark:text-gray-300',       border: 'border-gray-200 dark:border-gray-700',       badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300' },
  violet:  { avatar: 'bg-violet-100 dark:bg-violet-950/60',   dot: 'bg-violet-500',  texto: 'text-violet-700 dark:text-violet-300',   border: 'border-violet-200 dark:border-violet-800',   badge: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300' },
  indigo:  { avatar: 'bg-indigo-100 dark:bg-indigo-950/60',   dot: 'bg-indigo-500',  texto: 'text-indigo-700 dark:text-indigo-300',   border: 'border-indigo-200 dark:border-indigo-800',   badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300' },
  sky:     { avatar: 'bg-sky-100 dark:bg-sky-950/60',         dot: 'bg-sky-500',     texto: 'text-sky-700 dark:text-sky-300',         border: 'border-sky-200 dark:border-sky-800',         badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300' },
  pink:    { avatar: 'bg-pink-100 dark:bg-pink-950/60',       dot: 'bg-pink-500',    texto: 'text-pink-700 dark:text-pink-300',       border: 'border-pink-200 dark:border-pink-800',       badge: 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300' },
}

const FONTE_META: Record<FonteEvento, { label: string; icone: ComponentType<{ size?: number; className?: string }>; tom: TomEvento }> = {
  solicitacao: { label: 'Solicitação', icone: FileText,     tom: 'emerald' },
  cotacao:     { label: 'Cotação',     icone: FileSearch,   tom: 'violet'  },
  pedido:      { label: 'Pedido',      icone: ShoppingCart, tom: 'indigo'  },
  recebimento: { label: 'Recebimento', icone: Receipt,      tom: 'sky'     },
  fornecedor:  { label: 'Fornecedor',  icone: Truck,        tom: 'pink'    },
}

type IconeEvento = ComponentType<{ size?: number; className?: string; strokeWidth?: number }>

/**
 * Deriva (tom, ícone) a partir de (fonte, acao). Cada combinação tem uma
 * representação visual estável; quando não há mapeamento específico, cai
 * no tom/ícone padrão da fonte do evento.
 */
function visualEvento(fonte: FonteEvento, acao: string): { tom: TomEvento; icone: IconeEvento } {
  // Ações comuns a qualquer fonte
  switch (acao) {
    case 'aprovou':                return { tom: 'emerald', icone: CheckCircle2 }
    case 'reprovou':               return { tom: 'red',     icone: XCircle }
    case 'cancelou':               return { tom: 'red',     icone: Ban }
    case 'recusou':                return { tom: 'red',     icone: XCircle }
    case 'enviou':                 return { tom: 'blue',    icone: Send }
    case 'encaminhou':             return { tom: 'blue',    icone: Send }
    case 'marcou_enviado':         return { tom: 'indigo',  icone: Send }
    case 'registrou_recebimento':  return { tom: 'sky',     icone: Receipt }
    case 'respondeu':              return { tom: 'emerald', icone: MessageSquare }
    case 'convidou':               return { tom: 'pink',    icone: Plus }
    case 'escolheu':               return { tom: 'emerald', icone: Crown }
  }
  // 'criou' (e fallback): usa o visual da fonte
  if (acao === 'criou' || acao === '') {
    const fm = FONTE_META[fonte]
    return { tom: fm.tom, icone: fm.icone as IconeEvento }
  }
  const fm = FONTE_META[fonte]
  return { tom: fm.tom, icone: fm.icone as IconeEvento }
}

function linkDoEvento(ev: EventoHistorico): string | undefined {
  if (!ev.link_tipo || !ev.link_id) return undefined
  switch (ev.link_tipo) {
    case 'solicitacao': return `/compras/solicitacoes/${ev.link_id}`
    case 'cotacao':     return `/compras/cotacoes/${ev.link_id}`
    case 'pedido':      return `/compras/pedidos/${ev.link_id}`
  }
}

/**
 * Timeline visual de eventos consolidados. Recebe eventos já compostos pela
 * RPC `cmp_historico` (ordenação interna: mais recente primeiro), retornada
 * embutida no payload das RPCs `cmp_detalhe_*`.
 *
 * Permite filtrar por fonte (Solicitação, Cotação, Pedido, Recebimento, Fornecedor)
 * usando chips clicáveis. Renderiza vazio com mensagem quando filtro não retorna nada.
 */
export function HistoricoTimeline({
  eventos,
  vazioMsg = 'Nenhum evento registrado ainda.',
}: {
  eventos: EventoHistorico[]
  vazioMsg?: string
}) {
  const fontesPresentes = useMemo(() => {
    const s = new Set<FonteEvento>()
    eventos.forEach(e => s.add(e.fonte))
    return Array.from(s)
  }, [eventos])

  const [filtros, setFiltros] = useState<Set<FonteEvento>>(new Set())

  const ordenados = useMemo(
    () => [...eventos].sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime()),
    [eventos],
  )

  const filtrados = filtros.size === 0 ? ordenados : ordenados.filter(e => filtros.has(e.fonte))

  const toggleFiltro = (f: FonteEvento) => setFiltros(prev => {
    const n = new Set(prev)
    if (n.has(f)) n.delete(f); else n.add(f)
    return n
  })

  return (
    <div>
      {/* Barra de filtros (sem card; apenas chips alinhados à direita) */}
      {fontesPresentes.length > 1 && (
        <div className="flex items-center gap-1 flex-wrap mb-4">
          <FilterIcon size={11} className="text-gray-400 mr-0.5" />
          {fontesPresentes.map(f => {
            const fm = FONTE_META[f]
            const Icon = fm.icone
            const ativo = filtros.has(f)
            const cls = TOM_CLS[fm.tom]
            return (
              <button
                key={f}
                type="button"
                onClick={() => toggleFiltro(f)}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-colors ${
                  ativo
                    ? cls.badge + ' ring-1 ring-current/30'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={10} /> {fm.label}
              </button>
            )
          })}
          {filtros.size > 0 && (
            <button
              type="button"
              onClick={() => setFiltros(new Set())}
              className="text-[10px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-1"
              title="Limpar filtros"
            >
              limpar
            </button>
          )}
          <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
            {filtrados.length}{filtros.size > 0 ? ` de ${eventos.length}` : ''} eventos
          </span>
        </div>
      )}

      {/* Lista de eventos */}
      {filtrados.length === 0 ? (
        <div className="py-12 text-center">
          <History size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-400 dark:text-gray-500">{vazioMsg}</p>
        </div>
      ) : (
        <ol className="relative">
          {/* Linha vertical guia, alinhada ao centro do avatar (left 16px = 32/2) */}
          <div className="absolute left-4 top-4 bottom-4 w-px bg-gray-200 dark:bg-gray-700" aria-hidden />
          {filtrados.map((ev, idx) => {
            const vis = visualEvento(ev.fonte, ev.acao)
            const tom = TOM_CLS[vis.tom]
            const fm = FONTE_META[ev.fonte]
            const Icon = vis.icone
            const link = linkDoEvento(ev)
            const isUltimo = idx === filtrados.length - 1

            const corpo = (
              <>
                {/* Marcador (avatar 32×32 centrado em x=16) */}
                {ev.quem ? (
                  <span
                    className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold ${tom.avatar} ${tom.texto} ring-4 ring-white dark:ring-gray-900`}
                    title={ev.quem}
                  >
                    {getIniciais(ev.quem)}
                    <span className={`absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full ${tom.dot} ring-2 ring-white dark:ring-gray-900`}>
                      <Icon size={8} className="text-white" strokeWidth={3} />
                    </span>
                  </span>
                ) : (
                  <span className={`absolute left-0 top-1 flex h-8 w-8 items-center justify-center rounded-full ${tom.dot} ring-4 ring-white dark:ring-gray-900`}>
                    <Icon size={14} className="text-white" />
                  </span>
                )}

                {/* Conteúdo textual */}
                <div className="min-w-0">
                  {ev.contexto_numero && (
                    <div className="mb-1">
                      <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0 text-[10px] font-medium ${TOM_CLS[fm.tom].badge}`}>
                        <fm.icone size={9} /> {ev.contexto_numero}
                      </span>
                    </div>
                  )}

                  <p className="text-sm leading-snug text-gray-700 dark:text-gray-300 break-words">
                    {ev.quem && (
                      <span className="font-semibold text-gray-900 dark:text-gray-100">{ev.quem}</span>
                    )}
                    {ev.quem && ' '}
                    {ev.titulo}
                  </p>

                  {ev.quando && (
                    <p
                      className="mt-0.5 text-[11px] text-gray-400 dark:text-gray-500"
                      title={formatDateTime(ev.quando)}
                    >
                      <span className={isUltimo ? `font-medium ${tom.texto}` : ''}>{formatRelativeTime(ev.quando)}</span>
                      <span className="mx-1 text-gray-300 dark:text-gray-600">·</span>
                      <span>{formatDateTime(ev.quando)}</span>
                    </p>
                  )}

                  {ev.comentario && (
                    <div className={`mt-2 flex items-start gap-1.5 rounded-md border ${tom.border} bg-gray-50/60 dark:bg-gray-800/60 px-2.5 py-2 text-xs text-gray-600 dark:text-gray-300`}>
                      <MessageSquare size={12} className="mt-0.5 shrink-0 text-gray-400" />
                      <span className="whitespace-pre-wrap leading-relaxed">{ev.comentario}</span>
                    </div>
                  )}
                </div>
              </>
            )

            const liBase = 'relative pl-12 py-2'
            const liInteractive = link
              ? 'group cursor-pointer rounded-md hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors'
              : ''

            return link ? (
              <li key={ev.id} className="contents">
                <Link to={link} className={`${liBase} ${liInteractive} block`}>
                  {corpo}
                  <span className="absolute right-1 top-2.5 text-gray-300 dark:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={14} />
                  </span>
                </Link>
              </li>
            ) : (
              <li key={ev.id} className={liBase}>{corpo}</li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
