import type { ReactNode } from 'react'

export type StatusTone =
  | 'gray' | 'emerald' | 'amber' | 'red' | 'blue' | 'violet' | 'indigo' | 'sky'

const DOT_CLS: Record<StatusTone, string> = {
  gray:    'bg-gray-400',
  emerald: 'bg-emerald-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
  blue:    'bg-blue-500',
  violet:  'bg-violet-500',
  indigo:  'bg-indigo-500',
  sky:     'bg-sky-500',
}

/**
 * StatusDot: substitui badge colorido em tabelas.
 *
 * Cor só no dot (ponto). Texto sempre cinza neutro pra não competir.
 * Use em colunas "Status" de tabelas — mais leve que pílulas.
 */
export function StatusDot({
  tone = 'gray',
  label,
  title,
  icon,
  className = '',
}: {
  tone?: StatusTone
  /** Texto opcional ao lado do ponto. Quando omitido, exibe só o ponto colorido. */
  label?: ReactNode
  title?: string
  icon?: ReactNode
  className?: string
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 min-w-0 text-[11px] text-gray-700 dark:text-gray-300 ${className}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shrink-0 ${DOT_CLS[tone]}`}
        aria-hidden
      />
      {icon && <span className="shrink-0 text-gray-400">{icon}</span>}
      {label != null && <span className="truncate">{label}</span>}
    </span>
  )
}
