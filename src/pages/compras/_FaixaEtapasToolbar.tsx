import type { EtapaFluxo } from './_fluxoEtapas'
import type { StatusMeta } from './_shared'

type Props<T extends string> = {
  etapas: EtapaFluxo<T>[]
  contagens: Partial<Record<T, number>>
  meta: (status: T) => StatusMeta
  filtroAtivo?: T | 'todos' | 'todas'
  onFiltro?: (key: T | 'todos' | 'todas') => void
  chaveTodas?: 'todos' | 'todas'
  apenasVisualizacao?: boolean
  etapaAtual?: T | null
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

function cores(ativo: boolean, atual: boolean) {
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

/**
 * Faixa horizontal de etapas em formato chevron (>) — encaixa uma na outra.
 * Compacta, sempre acima do search.
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
}: Props<T>) {
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
        const isFirst = idx === 0
        const isLast = idx === etapas.length - 1
        const c = cores(ativo, atual)

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

        const baseCls = `relative flex-1 min-w-[180px] flex flex-col justify-start text-left transition-colors py-2 ${c.bg} ${c.hover}`

        const style: React.CSSProperties = {
          clipPath: clipFor(isFirst, isLast),
          marginLeft: isFirst ? 0 : -(TIP - 2),
          paddingLeft: isFirst ? 10 : 10 + TIP,
          paddingRight: isLast ? 10 : 10 + TIP,
          zIndex: ativo || atual ? 2 : 1,
        }

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
