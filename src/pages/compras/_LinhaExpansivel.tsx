import type { ReactNode } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

/**
 * Linha de listagem clicável que expande para um painel rico inline.
 * O conteúdo do painel é renderizado pelo `painel` (lazy — só monta quando aberto).
 * `acoes` é um slot opcional à direita (ex.: aprovar/reprovar na listagem).
 *
 * O botão de toggle envolve apenas a área do cabeçalho (chevron + conteúdo),
 * permitindo que `acoes` contenha <a>/<button> sem aninhamento inválido.
 */
export function LinhaExpansivel({
  aberto, onToggle, cabecalho, painel, acoes,
}: {
  aberto: boolean
  onToggle: () => void
  cabecalho: ReactNode
  painel: ReactNode
  acoes?: ReactNode
}) {
  return (
    <li>
      <div
        className={`w-full flex items-center gap-2 px-4 py-3 transition-colors ${
          aberto
            ? 'bg-gray-50 dark:bg-gray-800/60'
            : 'hover:bg-gray-50/60 dark:hover:bg-gray-800/60'
        }`}
      >
        <button
          type="button"
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
          aria-expanded={aberto}
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center text-gray-400 dark:text-gray-500">
            {aberto ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
          {cabecalho}
        </button>
        {acoes && (
          <div className="shrink-0 flex items-center gap-1 flex-wrap justify-end max-w-[min(100%,280px)]" onClick={e => e.stopPropagation()}>
            {acoes}
          </div>
        )}
      </div>
      {aberto && (
        <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-900/60 px-4 py-4">
          {painel}
        </div>
      )}
    </li>
  )
}
