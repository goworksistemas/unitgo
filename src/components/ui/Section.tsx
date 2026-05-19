import type { ReactNode } from 'react'

/**
 * Section: wrapper de seção minimalista usado no redesign.
 *
 * - Sem borda pesada ao redor (apenas divisores entre filhos via `divide-y`)
 * - Título cinza-400 uppercase tracking-wider (text-[10px])
 * - Slot opcional de ações à direita
 */
export function Section({
  title,
  action,
  children,
  className = '',
  contentClassName = '',
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <section className={`space-y-1.5 ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-2 min-h-[18px]">
          {title && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
              {title}
            </span>
          )}
          {action && <div className="flex items-center gap-1">{action}</div>}
        </header>
      )}
      <div className={contentClassName}>{children}</div>
    </section>
  )
}
