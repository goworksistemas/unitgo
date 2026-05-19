import type { EtapaFluxo } from './_fluxoEtapas'
import type { StatusMeta } from './_shared'

type Variant = 'full' | 'slim'

type Props<T extends string> = {
  etapas: EtapaFluxo<T>[]
  contagens: Partial<Record<T, number>>
  meta: (status: T) => StatusMeta
  filtroAtivo?: T | 'todos' | 'todas'
  onFiltro?: (key: T | 'todos' | 'todas') => void
  chaveTodas?: 'todos' | 'todas'
  apenasVisualizacao?: boolean
  etapaAtual?: T | null
  /**
   * - `full`  (default): chevron grande, 2 linhas (título + ação), usado em listagens com filtro
   * - `slim`: chevron magro, 1 linha (`nº · ● Título  count`), ação só no tooltip
   */
  variant?: Variant
}

const TIP = 14 // px da "ponta" do chevron

function clipFor(isFirst: boolean, isLast: boolean) {
  if (isFirst && isLast) return undefined
  if (isFirst) {
    return `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%)`
  }
  if (isLast) {
    return `polygon(0 0, 100% 0, 100% 100%, 0 100%, ${TIP}px 50%)`
  }
  return `polygon(0 0, calc(100% - ${TIP}px) 0, 100% 50%, calc(100% - ${TIP}px) 100%, 0 100%, ${TIP}px 50%)`
}

// ─────────────────────────────────────────────
// FULL: visual original (mantido para listagens)
// ─────────────────────────────────────────────

function coresFull(ativo: boolean, atual: boolean) {
  if (atual) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      hover: '',
      numero: 'bg-amber-600 text-white',
      titulo: 'text-amber-800 dark:text-amber-200',
      count: 'text-amber-700 dark:text-amber-300',
      acao: 'text-amber-700/80 dark:text-amber-300/80',
    }
  }
  if (ativo) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      hover: '',
      numero: 'bg-emerald-600 text-white',
      titulo: 'text-emerald-800 dark:text-emerald-200',
      count: 'text-emerald-700 dark:text-emerald-300',
      acao: 'text-emerald-700/80 dark:text-emerald-300/80',
    }
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700',
    numero: 'bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700',
    titulo: 'text-gray-700 dark:text-gray-200',
    count: 'text-gray-900 dark:text-gray-100',
    acao: 'text-gray-500 dark:text-gray-400',
  }
}

// ─────────────────────────────────────────────
// SLIM: 1 linha, baixo destaque, cor só na atual
// ─────────────────────────────────────────────

function coresSlim(ativo: boolean, atual: boolean, concluida: boolean) {
  if (atual) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/40',
      hover: '',
      titulo: 'text-amber-800 dark:text-amber-200 font-semibold',
      count: 'text-amber-700 dark:text-amber-300',
      dot: 'bg-amber-500',
      numero: 'bg-amber-600 text-white',
    }
  }
  if (ativo) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/40',
      hover: '',
      titulo: 'text-emerald-800 dark:text-emerald-200 font-semibold',
      count: 'text-emerald-700 dark:text-emerald-300',
      dot: 'bg-emerald-500',
      numero: 'bg-emerald-600 text-white',
    }
  }
  if (concluida) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      hover: 'hover:bg-emerald-100/70 dark:hover:bg-emerald-900/30',
      titulo: 'text-emerald-700/80 dark:text-emerald-300/80',
      count: 'text-emerald-700/80 dark:text-emerald-300/80',
      dot: 'bg-emerald-500',
      numero: 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800',
    }
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-800/70',
    hover: 'hover:bg-gray-200 dark:hover:bg-gray-700/70',
    titulo: 'text-gray-600 dark:text-gray-400',
    count: 'text-gray-500 dark:text-gray-500',
    dot: 'bg-gray-300 dark:bg-gray-600',
    numero: 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700',
  }
}

/**
 * Faixa horizontal de etapas em formato chevron (>) — encaixa uma na outra.
 *
 * Usar `variant='slim'` em telas de **detalhe** (linha única, baixo destaque).
 * Usar `variant='full'` (default) em **listagens** com filtro por etapa.
 */
export function FaixaEtapasToolbar<T extends string>({
  etapas,
  filtroAtivo,
  onFiltro,
  contagens,
  meta,
  chaveTodas = 'todos',
  apenasVisualizacao = false,
  etapaAtual = null,
  variant = 'full',
}: Props<T>) {
  const ordemAtual = apenasVisualizacao && etapaAtual != null
    ? etapas.find(e => e.key === etapaAtual)?.ordem ?? null
    : null

  return (
    <div
      className="flex items-stretch w-full overflow-x-auto"
      role="group"
      aria-label="Etapas do fluxo"
    >
      {etapas.map((e, idx) => {
        const m = meta(e.key)
        const count = contagens[e.key] ?? 0
        const ativo = !apenasVisualizacao && filtroAtivo === e.key
        const atual = apenasVisualizacao && etapaAtual === e.key
        const concluida = ordemAtual != null && e.ordem > 0 && e.ordem < ordemAtual
        const isFirst = idx === 0
        const isLast = idx === etapas.length - 1

        const style: React.CSSProperties = {
          clipPath: clipFor(isFirst, isLast),
          marginLeft: isFirst ? 0 : -(TIP - 2),
          paddingLeft: isFirst ? 10 : 10 + TIP,
          paddingRight: isLast ? 10 : 10 + TIP,
          zIndex: ativo || atual ? 2 : 1,
        }

        if (variant === 'slim') {
          const c = coresSlim(ativo, atual, concluida)
          const baseCls = `relative flex-1 min-w-[140px] h-8 flex items-center text-left transition-colors ${c.bg} ${c.hover}`

          const conteudo = (
            <span className="flex items-center gap-1.5 min-w-0 w-full">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold ${c.numero}`}>
                {e.ordem}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${c.dot}`} aria-hidden />
              <span className={`flex-1 min-w-0 text-[11px] leading-tight truncate ${c.titulo}`}>
                {e.etapa}
              </span>
              {count > 0 && (
                <span className={`text-[11px] tabular-nums leading-none shrink-0 ${c.count}`}>
                  {count}
                </span>
              )}
            </span>
          )

          if (apenasVisualizacao) {
            return (
              <div
                key={e.key}
                title={`${e.etapa} — ${e.acao}`}
                className={baseCls}
                style={style}
                aria-current={atual ? 'step' : undefined}
              >
                {conteudo}
              </div>
            )
          }
          return (
            <button
              key={e.key}
              type="button"
              onClick={() => onFiltro?.(ativo ? chaveTodas : e.key)}
              title={`${e.etapa} — ${e.acao}`}
              className={baseCls}
              style={style}
            >
              {conteudo}
            </button>
          )
        }

        // variant === 'full'
        const c = coresFull(ativo, atual)
        const baseCls = `relative flex-1 min-w-[180px] flex flex-col justify-start text-left transition-colors py-2 ${c.bg} ${c.hover}`

        const conteudo = (
          <>
            <span className="flex items-start gap-1.5 min-w-0">
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-bold mt-px ${c.numero}`}>
                {e.ordem}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 mt-[5px] ${m.dot}`} aria-hidden />
              <span className={`flex-1 min-w-0 text-[11px] font-semibold leading-tight break-words ${c.titulo}`}>
                {e.etapa}
              </span>
              <span className={`text-[12px] font-bold tabular-nums leading-none shrink-0 ml-1 ${c.count}`}>
                {count}
              </span>
              {e.unidade && count > 0 && (
                <span className={`text-[9px] leading-none shrink-0 ${c.acao}`}>
                  {e.unidade}
                </span>
              )}
            </span>
            <span
              className={`mt-1 text-[9px] leading-snug ${c.acao}`}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {e.acao}
            </span>
          </>
        )

        if (apenasVisualizacao) {
          return (
            <div
              key={e.key}
              title={`${e.etapa} — ${e.acao}`}
              className={baseCls}
              style={style}
              aria-current={atual ? 'step' : undefined}
            >
              {conteudo}
            </div>
          )
        }
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => onFiltro?.(ativo ? chaveTodas : e.key)}
            title={`${e.etapa} — ${e.acao}`}
            className={baseCls}
            style={style}
          >
            {conteudo}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Próxima ação sugerida — texto curto baseado na etapa atual.
 * Use no header das telas de detalhe para mostrar "o que fazer agora".
 */
export function proximaAcao<T extends string>(
  etapas: EtapaFluxo<T>[],
  etapaAtual: T | null | undefined,
): { etapa: string; acao: string } | null {
  if (!etapaAtual) return null
  const e = etapas.find(x => x.key === etapaAtual)
  if (!e) return null
  return { etapa: e.etapa, acao: e.acao }
}
