import type { ReactNode } from 'react'

/**
 * InfoChip: meta inline `label: valor` discreto.
 *
 * - Label em cinza-400 (10px)
 * - Valor neutro (11px) ou bold quando `destaque`
 * - Sem fundo/borda — pra usar dentro de StatRow / cabeçalhos
 */
export function InfoChip({
  label,
  children,
  destaque,
  className = '',
  title,
}: {
  label?: ReactNode
  children: ReactNode
  destaque?: boolean
  className?: string
  title?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-baseline gap-1 min-w-0 ${className}`}
    >
      {label && (
        <span className="text-[10px] font-medium text-gray-400 dark:text-gray-500 shrink-0">
          {label}:
        </span>
      )}
      <span
        className={`text-[11px] truncate ${
          destaque
            ? 'font-semibold text-gray-900 dark:text-gray-100'
            : 'text-gray-700 dark:text-gray-300'
        }`}
      >
        {children}
      </span>
    </span>
  )
}
