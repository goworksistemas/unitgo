import { Children, type ReactNode } from 'react'
import { MorePopover } from './MorePopover'

/**
 * StatRow: faixa horizontal de stats/chips com separador `·` e
 * progressive disclosure dos itens excedentes via MorePopover.
 *
 * - `max`: quantos itens ficam visíveis em linha (default 3)
 * - `extra`: conteúdo opcional adicional renderizado depois do popover
 */
export function StatRow({
  children,
  max = 3,
  extra,
  className = '',
}: {
  children: ReactNode
  max?: number
  extra?: ReactNode
  className?: string
}) {
  const arr = Children.toArray(children).filter(Boolean)
  const visiveis = arr.slice(0, max)
  const escondidos = arr.slice(max)

  return (
    <div className={`flex items-center gap-x-2 gap-y-1 flex-wrap min-w-0 ${className}`}>
      {visiveis.map((child, idx) => (
        <span key={idx} className="inline-flex items-center gap-2 min-w-0">
          {child}
          {idx < visiveis.length - 1 && <StatSep />}
        </span>
      ))}
      {escondidos.length > 0 && (
        <>
          <StatSep />
          <MorePopover label={`+${escondidos.length} mais`} align="start">
            <div className="space-y-2">
              {escondidos.map((child, idx) => (
                <div key={idx}>{child}</div>
              ))}
            </div>
          </MorePopover>
        </>
      )}
      {extra}
    </div>
  )
}

function StatSep() {
  return (
    <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>
      ·
    </span>
  )
}
