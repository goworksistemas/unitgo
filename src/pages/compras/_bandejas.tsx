import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'

/**
 * Bandeja de pendências — bloco visual no topo de uma tela mostrando
 * o que veio da etapa anterior do pipeline e ainda não foi tratado aqui.
 *
 * Padroniza o visual entre Cotações / Pedidos / Recebimentos.
 */
export function Bandeja({
  icone, titulo, descricao, total, accent = 'amber', children,
}: {
  icone: ReactNode
  titulo: string
  descricao: string
  total: number
  accent?: 'amber' | 'blue' | 'violet'
  children: ReactNode
}) {
  const cls = {
    amber:  'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60',
    blue:   'bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/60',
    violet: 'bg-violet-50/60 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/60',
  }[accent]

  const iconCls = {
    amber:  'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/40',
    blue:   'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40',
    violet: 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/40',
  }[accent]

  if (total === 0) return null

  return (
    <section className={`rounded-2xl border ${cls} shadow-sm`}>
      <div className="flex items-center gap-3 px-5 py-3 border-b border-current/10">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${iconCls}`}>
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {titulo}
            <span className="ml-2 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-white dark:bg-gray-900 text-[11px] font-semibold text-gray-700 dark:text-gray-200 border border-current/20">
              {total}
            </span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
        </div>
      </div>
      <ul className="divide-y divide-current/10">{children}</ul>
    </section>
  )
}

export function BandejaItem({
  to, onClick, titulo, subtitulo, meta, action,
}: {
  to?: string
  onClick?: () => void
  titulo: ReactNode
  subtitulo?: ReactNode
  meta?: ReactNode
  action?: ReactNode
}) {
  const className =
    'w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-white/40 dark:hover:bg-white/5 transition-colors'

  const conteudo = (
    <>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">{titulo}</div>
        {subtitulo && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">{subtitulo}</p>}
      </div>
      {meta && <div className="text-right shrink-0 text-xs text-gray-500">{meta}</div>}
      {action ?? <ChevronRight size={16} className="text-gray-400 shrink-0" />}
    </>
  )

  return (
    <li>
      {to ? (
        <a href={to} className={className}>{conteudo}</a>
      ) : (
        <button onClick={onClick} className={className}>{conteudo}</button>
      )}
    </li>
  )
}
