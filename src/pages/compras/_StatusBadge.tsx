import type { StatusMeta } from './_shared'

/** Badge único de status — mesma aparência em listas, painéis, vínculos e detalhe */
export function StatusBadge({
  meta,
  size = 'sm',
  title,
}: {
  meta: StatusMeta
  size?: 'sm' | 'md'
  title?: string
}) {
  const isMd = size === 'md'
  return (
    <span
      title={title ?? meta.label}
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${meta.badge} ${
        isMd ? 'px-2 py-0.5 text-[11px]' : 'px-1.5 py-0.5 text-[10px]'
      }`}
    >
      <span className={`shrink-0 rounded-full ${meta.dot} ${isMd ? 'h-1.5 w-1.5' : 'h-1.5 w-1.5'}`} />
      {meta.label}
    </span>
  )
}
