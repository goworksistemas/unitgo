import { useState, type ReactNode } from 'react'

export type PainelSecao = {
  id: string
  label: string
  icone?: ReactNode
  badge?: ReactNode
  conteudo: ReactNode
}

/**
 * Layout v2 para SC / Cotação / Pedido — header arejado em 2 linhas,
 * faixa de etapas slim opcional, painel lateral com tabs minimalistas.
 *
 * Estrutura:
 *  - Linha 1: voltar + número/título + status + (ações primárias)
 *  - Linha 2: subtítulo + meta inline (StatRow) + vínculos
 *  - Alerta sutil (opcional)
 *  - Faixa de etapas slim (opcional)
 *  - Main + painel lateral
 */
export function LayoutDetalheFocado({
  voltar,
  titulo,
  subtitulo,
  badges,
  acoes,
  meta,
  vinculos,
  vinculosFaixa,
  vinculosRodape,
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
  /** Chip discreto com popover na linha 2 do header (legado) */
  vinculos?: ReactNode
  /** Faixa dedicada de vínculos — no header, abaixo do fluxo (legado) */
  vinculosFaixa?: ReactNode
  /** Faixa de vínculos no **rodapé** do conteúdo principal — usada como mapa do processo */
  vinculosRodape?: ReactNode
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
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-1.5 py-1.5 space-y-1.5">
        {/* ── Linha 1: voltar · número · status · ações ── */}
        <div className="flex items-center gap-2 min-h-[34px]">
          <div className="shrink-0">{voltar}</div>
          <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
            <h1 className="text-base font-mono font-semibold text-gray-900 dark:text-gray-100 leading-none tracking-tight">
              {titulo}
            </h1>
            {badges && <div className="flex items-center gap-1.5 flex-wrap">{badges}</div>}
          </div>
          {painelSecoes && painelSecoes.length > 0 && (
            <div className="hidden sm:flex items-center gap-0.5 shrink-0 border-l border-gray-200 dark:border-gray-700 pl-2">
              {painelSecoes.map(s => {
                const ativa = painelAberto && secaoPainel === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      if (ativa) setPainelAberto(false)
                      else abrirPainel(s.id)
                    }}
                    title={s.label}
                    className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      ativa
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                    aria-label={s.label}
                  >
                    {s.icone ?? <span className="text-[11px]">{s.label}</span>}
                    {s.badge != null && (
                      <span className="tabular-nums opacity-80 text-[10px]">{s.badge}</span>
                    )}
                  </button>
                )
              })}
            </div>
          )}
          {acoes && (
            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">{acoes}</div>
          )}
        </div>

        {/* ── Linha 2: subtítulo · meta · vínculos ── */}
        {(subtitulo || meta || vinculos) && (
          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap text-[11px] text-gray-500 dark:text-gray-400 min-h-[18px] pl-0.5">
            {subtitulo && (
              <span className="truncate max-w-[min(320px,45vw)] text-gray-600 dark:text-gray-300">
                {subtitulo}
              </span>
            )}
            {subtitulo && (meta || vinculos) && (
              <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>·</span>
            )}
            {meta}
            {meta && vinculos && (
              <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>·</span>
            )}
            {vinculos}
          </div>
        )}

        {/* ── Alerta sutil ── */}
        {alerta && <div className="pl-0.5">{alerta}</div>}

        {/* ── Faixa de etapas (slim) ── */}
        {fluxo && <div className="pt-0.5">{fluxo}</div>}

        {/* ── Faixa dedicada de vínculos ── */}
        {vinculosFaixa && <div className="pt-1">{vinculosFaixa}</div>}
      </div>

      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 min-h-0 overflow-auto">
          {principal}
          {vinculosRodape && (
            <div className="border-t border-gray-200 dark:border-gray-800 mt-4 pt-4 pb-6 px-4">
              {vinculosRodape}
            </div>
          )}
        </main>
        {painelAberto && painelSecoes && painelSecoes.length > 0 && (
          <aside className="w-full sm:w-[min(360px,40vw)] shrink-0 border-l border-gray-200 dark:border-gray-800 flex flex-col min-h-0 bg-gray-50/50 dark:bg-gray-900/50">
            <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-800">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {secaoAtiva?.label}
              </span>
              <button
                type="button"
                onClick={() => setPainelAberto(false)}
                className="text-[11px] text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-1.5 py-0.5"
                aria-label="Fechar painel"
              >
                ×
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
            <div className="flex-1 min-h-0 overflow-y-auto p-3">{secaoAtiva?.conteudo}</div>
          </aside>
        )}
      </div>
    </div>
  )
}

// ───────────────────────────────────────────────────────────────
// Primitivos retro-compatíveis usados por telas existentes
// (MetaChip e MetaSep continuam exportados, agora mais discretos)
// ───────────────────────────────────────────────────────────────

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
    <span className="inline-flex items-baseline gap-1 min-w-0">
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

export function MetaSep() {
  return (
    <span className="text-gray-300 dark:text-gray-600 select-none" aria-hidden>·</span>
  )
}

/**
 * Alerta sutil — substitui o antigo "AlertaLinha" com tom mais suave:
 * fundo gray-50, borda esquerda colorida 2px, texto gray-700.
 */
export function AlertaLinha({
  tom = 'amber',
  children,
}: {
  tom?: 'amber' | 'red' | 'emerald' | 'gray'
  children: ReactNode
}) {
  const borda = {
    amber:   'border-l-amber-400 dark:border-l-amber-500',
    red:     'border-l-red-400 dark:border-l-red-500',
    emerald: 'border-l-emerald-400 dark:border-l-emerald-500',
    gray:    'border-l-gray-400 dark:border-l-gray-500',
  }[tom]
  return (
    <p
      className={`text-[11px] leading-snug text-gray-700 dark:text-gray-300 bg-gray-50/80 dark:bg-gray-800/40 border-l-2 ${borda} pl-2 py-1 pr-2 rounded-sm`}
    >
      {children}
    </p>
  )
}
