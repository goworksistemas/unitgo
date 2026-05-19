import { useState, type ReactNode } from 'react'

/**
 * Layout padrão das telas de detalhe (Solicitação, Cotação, Pedido).
 *
 * Princípios:
 * - Tela INTEGRADA, sem "caixa dentro de caixa". O AppLayout já dá padding
 *   global; aqui usamos apenas separadores horizontais/verticais discretos.
 * - Header full-width como linha única, com separador inferior.
 * - Fluxo (linha do tempo do processo) abaixo do header, também full-width.
 * - Corpo em 2 colunas (desktop): propriedades à esquerda + tabs à direita,
 *   separadas por um divisor vertical sutil. Cada coluna tem scroll próprio.
 * - Mobile/tablet: tudo empilhado.
 */

export type AbaDetalhe = {
  id: string
  label: string
  icone?: ReactNode
  badge?: ReactNode
  /** Conteúdo da aba — renderizado quando ativa */
  content: ReactNode
  /**
   * Quando true, a aba ocupa toda a largura disponível (esconde a sidebar
   * de Propriedades em desktop). Útil para tabelas largas / dashboards
   * visuais como o Comparativo de cotações.
   */
  fullWidth?: boolean
}

export function LayoutDetalhe({
  cabecalho,
  fluxo,
  vinculos,
  propriedades,
  tabs,
  abaInicial,
  larguraEsquerda = 'lg:w-[280px]',
  sidebarOculta = false,
}: {
  cabecalho: ReactNode
  fluxo?: ReactNode
  vinculos?: ReactNode
  /** Propriedades exibidas na sidebar esquerda. Ignorado quando `sidebarOculta=true`. */
  propriedades?: ReactNode
  tabs: AbaDetalhe[]
  abaInicial?: string
  larguraEsquerda?: string
  /**
   * Quando true, NÃO renderiza a sidebar de propriedades — a tela vira
   * single-column com tabs ocupando toda a largura. Útil para Cotação e
   * Pedido, cujo foco é a tabela comparativa/itens (que não cabe ao lado
   * de uma sidebar). Use uma tab dedicada para mostrar propriedades.
   */
  sidebarOculta?: boolean
}) {
  const [abaId, setAbaId] = useState<string>(abaInicial ?? tabs[0]?.id ?? '')
  const abaAtiva = tabs.find(t => t.id === abaId) ?? tabs[0]
  const semSidebar = sidebarOculta || abaAtiva?.fullWidth

  return (
    // Container ocupa exatamente a altura útil (viewport - app header [48px] - bottom nav mobile [64px]).
    // Usamos flex-col com flex-1 nas seções para preencher SEM padding fantasma.
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-3rem)]">
      {/* Header full-width — separador inferior em vez de card */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 pb-3 pt-3">
        {cabecalho}
      </div>

      {/* Fluxo opcional — separador inferior também */}
      {fluxo && (
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 py-3">
          {fluxo}
        </div>
      )}

      {vinculos && (
        <section className="shrink-0 border-b border-gray-200 dark:border-gray-800 px-1 py-2">
          {vinculos}
        </section>
      )}

      {/* Corpo: 2 colunas em desktop separadas por divisor vertical; ocupa o restante.
          Quando a sidebar é oculta (telas single-column) ou a aba ativa é fullWidth,
          a sidebar de Propriedades é escondida em desktop. */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row lg:items-stretch lg:divide-x lg:divide-gray-200 lg:dark:divide-gray-800">
        {/* Sidebar Propriedades */}
        {!sidebarOculta && (
          <aside
            className={`${larguraEsquerda} shrink-0 lg:overflow-y-auto lg:h-full lg:pr-4 pt-3 lg:pt-3 ${
              semSidebar ? 'lg:hidden' : ''
            }`}
          >
            {propriedades}
          </aside>
        )}

        {/* Coluna principal com tabs */}
        <main className={`flex-1 min-w-0 flex flex-col lg:h-full pt-3 lg:pt-0 ${
          semSidebar ? '' : 'lg:pl-4'
        }`}>
          {/* Barra de tabs */}
          <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
            <div className="flex items-center gap-0 min-w-max">
              {tabs.map(t => {
                const ativo = t.id === abaAtiva?.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAbaId(t.id)}
                    className={`relative inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      ativo
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {t.icone}
                    <span>{t.label}</span>
                    {t.badge != null && (
                      <span className={`ml-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold px-1 ${
                        ativo
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}>
                        {t.badge}
                      </span>
                    )}
                    {ativo && (
                      <span className="absolute left-2 right-2 -bottom-px h-0.5 bg-emerald-500 rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Conteúdo da aba (scroll individual) */}
          <div className="flex-1 min-h-0 lg:overflow-y-auto py-3">
            {abaAtiva?.content}
          </div>
        </main>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Helpers reutilizáveis pelas telas de detalhe
// ─────────────────────────────────────────────────────────────────

/**
 * Seção achatada (sem card): título com separador inferior e conteúdo abaixo.
 * Usar dentro do conteúdo de uma aba para agrupar blocos sem virar "caixa".
 */
export function CardSecao({
  titulo, icone, acoes, children, denso = false,
}: {
  titulo?: string
  icone?: ReactNode
  acoes?: ReactNode
  children: ReactNode
  denso?: boolean
}) {
  return (
    <section className="mb-6 last:mb-0">
      {titulo && (
        <div className="flex items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-800 pb-1.5 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {icone}
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 truncate">
              {titulo}
            </h2>
          </div>
          {acoes && <div className="shrink-0">{acoes}</div>}
        </div>
      )}
      <div className={denso ? '' : ''}>{children}</div>
    </section>
  )
}

/**
 * Layout linear das telas de detalhe (sem tabs).
 *
 * Usado pelas telas de Cotação e Pedido — tudo visível em scroll vertical único,
 * com a seção principal (ex.: Comparativo, Itens) em destaque no topo.
 *
 * - Header full-width como linha única, com separador inferior.
 * - Fluxo do processo abaixo, também full-width.
 * - Conteúdo: array de seções renderizadas uma abaixo da outra. Sem caixa
 *   externa — só um separador suave entre seções. A seção principal pode ser
 *   marcada com `destaque` para receber um filete vertical à esquerda.
 */
export type SecaoDetalhe = {
  id: string
  titulo?: string
  icone?: ReactNode
  badge?: ReactNode
  acoes?: ReactNode
  /** Conteúdo da seção (renderizado abaixo do título). */
  conteudo: ReactNode
  /** Quando true, oculta o título/header da seção (útil pra seção sem título). */
  semHeader?: boolean
}

/** @deprecated use LayoutDetalheFocado */
export function LayoutDetalheLinear_REMOVED({
  cabecalho,
  fluxo,
  secoes,
}: {
  cabecalho: ReactNode
  fluxo?: ReactNode
  secoes: SecaoDetalhe[]
}) {
  return (
    <div className="flex flex-col h-[calc(100dvh-7rem)] lg:h-[calc(100dvh-3rem)]">
      {/* Header full-width */}
      <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 pb-3 pt-3">
        {cabecalho}
      </div>

      {/* Fluxo opcional */}
      {fluxo && (
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 py-3">
          {fluxo}
        </div>
      )}

      {/* Conteúdo linear — scroll único */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="divide-y divide-gray-200 dark:divide-gray-800">
          {secoes.map(s => (
            <section key={s.id} className="py-4">
              {!s.semHeader && (s.titulo || s.acoes) && (
                <div className="flex items-center justify-between gap-2 mb-3 px-1">
                  <div className="flex items-center gap-2 min-w-0">
                    {s.icone && <span className="text-gray-400 dark:text-gray-500 shrink-0">{s.icone}</span>}
                    {s.titulo && (
                      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 dark:text-gray-300 truncate">
                        {s.titulo}
                      </h2>
                    )}
                    {s.badge != null && (
                      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] rounded-full text-[10px] font-semibold px-1 bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                        {s.badge}
                      </span>
                    )}
                  </div>
                  {s.acoes && <div className="shrink-0">{s.acoes}</div>}
                </div>
              )}
              <div>{s.conteudo}</div>
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Linha de propriedade no estilo HubSpot — label discreta em cima, valor embaixo.
 * Vertical sempre: legível mesmo em coluna estreita.
 */
export function PropLinha({
  label, icone, children,
}: {
  label: string
  icone?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="py-2">
      <dt className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-1">
        {icone} <span className="truncate">{label}</span>
      </dt>
      <dd className="text-[13px] text-gray-800 dark:text-gray-100 leading-snug break-words">
        {children}
      </dd>
    </div>
  )
}

/**
 * Header padrão das telas de detalhe — uma linha integrada (sem card):
 * Voltar · ícone · número · subtítulo · status · etapa · ações
 */
export function HeaderDetalhe({
  voltar,
  icone,
  iconeBg,
  numero,
  subtitulo,
  badges,
  acoes,
  alertas,
}: {
  voltar: ReactNode
  icone: ReactNode
  iconeBg: string
  numero: string
  subtitulo?: ReactNode
  badges?: ReactNode
  acoes?: ReactNode
  alertas?: ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-3 flex-wrap">
        <div className="shrink-0">{voltar}</div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconeBg}`}>
          {icone}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-mono font-semibold text-gray-900 dark:text-gray-100 leading-tight">
              {numero}
            </h1>
            {badges}
          </div>
          {subtitulo && (
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 truncate">
              {subtitulo}
            </p>
          )}
        </div>
        {acoes && (
          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            {acoes}
          </div>
        )}
      </div>
      {alertas && (
        <div className="mt-3 space-y-2">
          {alertas}
        </div>
      )}
    </div>
  )
}
