import { ChevronLeft } from 'lucide-react'
import { useNavigate, useLocation, Link } from 'react-router-dom'

/**
 * Botão "voltar" que:
 *  - Quando há histórico interno do app (usuário navegou até aqui), volta uma página.
 *  - Quando o usuário abriu direto pela URL (sem histórico), cai no `fallback`.
 *
 * Detecção de histórico interno: react-router incrementa `window.history.state.idx`
 * a cada navegação interna. Se for > 0, há histórico ao qual voltar dentro do app.
 */
export function BotaoVoltar({
  fallback,
  label,
  className,
}: {
  fallback: string
  label: string
  className?: string
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const cls =
    className ??
    'inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-emerald-600 transition-colors mb-2'

  const temHistoricoInterno = (() => {
    try {
      const state = window.history.state as { idx?: number } | null
      return typeof state?.idx === 'number' && state.idx > 0
    } catch {
      return false
    }
  })()

  if (!temHistoricoInterno) {
    return (
      <Link to={fallback} className={cls}>
        <ChevronLeft size={14} /> {label}
      </Link>
    )
  }

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={cls}
      title={`Voltar (fallback: ${label})`}
      // referência usada para evitar warning de lint sobre `location` não-usado em alguns ambientes
      data-key={location.key}
    >
      <ChevronLeft size={14} /> {label}
    </button>
  )
}
