import { useState, type ReactNode } from 'react'

export type PainelSecao = {
  id: string
  label: string
  badge?: ReactNode
  conteudo: ReactNode
}

/**
 * Layout para Cotação e Pedido: header compacto, sem tabs, sem scroll da página.
 * A área principal (comparativo / itens) ocupa o restante; histórico e vínculos
 * ficam em painel lateral acionado por botões na toolbar.
 */
export function LayoutDetalheFocado({
  voltar,
  titulo,
  subtitulo,
  badges,
  acoes,
  meta,
  vinculos,
  alerta,
  fluxo,
  principal,
  painelSecoes,
}: {
  voltar: ReactNode
  titulo: string
  subtitulo?: ReactNode
  badges?: ReactNode
  acoes?: ReactNode
  meta?: ReactNode
  /** Barra de vínculos sempre visível (links + tooltip) */
  vinculos?: ReactNode
  alerta?: ReactNode
  fluxo?: ReactNode
  principal: ReactNode
  painelSecoes?: PainelSecao[]
}) {
  const [painelAberto, setPainelAberto] = useState(false)
  const [secaoPainel, setSecaoPainel] = useState<string | null>(painelSecoes?.[0]?.id ?? null)

  function abrirPainel(id: string) {
    setSecaoPainel(id)
    setPainelAberto(true)
  }

  const secaoAtiva = painelSecoes?.find(s => s.id === secaoPainel) ?? painelSecoes?.[0]

  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-3rem)]">
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-1 py-1.5 space-y-1">
        <div className="flex items-center gap-2 min-h-[36px]">
          <div className="shrink-0">{voltar}</div>
          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
            <h1 className="text-sm font-mono font-semibold text-gray-900 dark:text-gray-100 leading-none">
              {titulo}
            </h1>
            {subtitulo && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[min(280px,40vw)]">
                {subtitulo}
              </span>
            )}
            {badges}
          </div>
          {painelSecoes && painelSecoes.length > 0 && (
            <div className="hidden sm:flex items-center gap-0.5 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2">
              {painelSecoes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    if (painelAberto && secaoPainel === s.id) setPainelAberto(false)
                    else abrirPainel(s.id)
                  }}
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                    painelAberto && secaoPainel === s.id
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  {s.label}
                  {s.badge != null && <span className="tabular-nums opacity-80">{s.badge}</span>}
                </button>
              ))}
            </div>
          )}
          {acoes && (
            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">{acoes}</div>
          )}
        </div>
        {meta && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-gray-600 dark:text-gray-400 px-0.5 pb-0.5">
            {meta}
          </div>
        )}
        {vinculos && <section className="px-0.5">{vinculos}</section>}
        {alerta && <div className="px-0.5">{alerta}</div>}
        {fluxo && <div className="pt-0 pb-0.5">{fluxo}</div>}
      </div>

      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">{principal}</main>
        {painelAberto && painelSecoes && painelSecoes.length > 0 && (
          <aside className="w-full sm:w-[min(340px,38vw)] shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="shrink-0 flex items-center justify-between gap-2 px-2 py-1.5 border-b border-gray-200 dark:border-gray-800 sm:hidden">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{secaoAtiva?.label}</span>
              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className="text-[11px] text-gray-500 px-2 py-1"
              >
                Fechar
              </button>
            </div>
            <div className="shrink-0 flex sm:hidden overflow-x-auto border-b border-gray-200 dark:border-gray-800">
              {painelSecoes.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSecaoPainel(s.id)}
                  className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap ${
                    secaoPainel === s.id
                      ? 'text-emerald-700 border-b-2 border-emerald-500'
                      : 'text-gray-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">{secaoAtiva?.conteudo}</div>
          </aside>
        )}
      </div>
    </div>
  )
}

export function MetaChip({
  label,
  children,
  destaque,
}: {
  label?: string
  children: ReactNode
  destaque?: boolean
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 ${
        destaque ? 'font-semibold text-gray-900 dark:text-gray-100' : ''
      }`}
    >
      {label && <span className="text-gray-400 dark:text-gray-500">{label}:</span>}
      {children}
    </span>
  )
}

export function MetaSep() {
  return <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>·</span>
}

export function AlertaLinha({
  tom = 'amber',
  children,
}: {
  tom?: 'amber' | 'red' | 'emerald' | 'gray'
  children: ReactNode
}) {
  const cls = {
    amber:
      'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    red: 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    emerald:
      'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
    gray: 'bg-gray-50 text-gray-800 border-gray-200 dark:bg-gray-900 dark:text-gray-300 dark:border-gray-700',
  }[tom]
  return <p className={`rounded-md border px-2 py-1 text-[11px] leading-snug ${cls}`}>{children}</p>
}
