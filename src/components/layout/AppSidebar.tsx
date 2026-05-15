/**
 * AppSidebar — replica a estetica/estrutura do sidebar do NetworkGo.
 *
 * Recursos:
 *  - Modos expandido (w-64) e colapsado (w-[72px]); estado persistido em localStorage
 *  - Grupos por modulo com tokens de cor (accent) por secao
 *  - Modo expandido: secoes clicaveis (chevron rotativo) com itens em lista
 *  - Modo colapsado: somente icones; hover dispara flyout flutuante a direita
 *  - Item ativo com barra lateral colorida, fundo e texto da cor do accent
 *  - Drawer mobile com backdrop
 *  - Botao toggle flutuante na borda direita do sidebar (desktop)
 *
 * NAO traz dados do NetworkGo: estrutura de modulos vem do PerfilContext do
 * SupplyGo (rotasPermitidas + flag `modulo`).
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { flushSync } from 'react-dom';
import * as Icons from 'lucide-react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePerfil } from '@/contexts/PerfilContext';
import type { RotaPermitida } from '@/types';
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo';

/* ───────────────────────────────────────────────────────────────────────────
   Tokens de cor por modulo (mesma logica visual do NetworkGo).
   Strings completas para que o Tailwind detecte e gere as classes.
   ─────────────────────────────────────────────────────────────────────────── */
type FlyoutAccent = {
  /** Fundo do chip do icone do grupo (header). */
  chip: string;
  /** Cor do icone dentro do chip. */
  icon: string;
  /** Ring sutil colorido ao redor do painel flyout. */
  ring: string;
  /** Fundo do item ativo. */
  activeBg: string;
  /** Texto do item ativo. */
  activeText: string;
  /** Barra vertical lateral do item ativo. */
  activeBar: string;
  /** Destaque do icone hovered na propria sidebar (modo colapsado). */
  sidebarHover: string;
};

const ACCENT_TOKENS: Record<string, FlyoutAccent> = {
  blue: {
    chip: 'bg-blue-100/80 dark:bg-blue-900/35',
    icon: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-500/15 dark:ring-blue-400/15',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30',
    activeText: 'text-blue-700 dark:text-blue-200',
    activeBar: 'bg-blue-500 dark:bg-blue-400',
    sidebarHover: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
  },
  indigo: {
    chip: 'bg-indigo-100/80 dark:bg-indigo-900/35',
    icon: 'text-indigo-600 dark:text-indigo-300',
    ring: 'ring-indigo-500/15 dark:ring-indigo-400/15',
    activeBg: 'bg-indigo-50 dark:bg-indigo-900/30',
    activeText: 'text-indigo-700 dark:text-indigo-200',
    activeBar: 'bg-indigo-500 dark:bg-indigo-400',
    sidebarHover: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300',
  },
  sky: {
    chip: 'bg-sky-100/80 dark:bg-sky-900/35',
    icon: 'text-sky-600 dark:text-sky-300',
    ring: 'ring-sky-500/15 dark:ring-sky-400/15',
    activeBg: 'bg-sky-50 dark:bg-sky-900/30',
    activeText: 'text-sky-700 dark:text-sky-200',
    activeBar: 'bg-sky-500 dark:bg-sky-400',
    sidebarHover: 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-300',
  },
  amber: {
    chip: 'bg-amber-100/80 dark:bg-amber-900/35',
    icon: 'text-amber-600 dark:text-amber-300',
    ring: 'ring-amber-500/15 dark:ring-amber-400/15',
    activeBg: 'bg-amber-50 dark:bg-amber-900/30',
    activeText: 'text-amber-700 dark:text-amber-200',
    activeBar: 'bg-amber-500 dark:bg-amber-400',
    sidebarHover: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300',
  },
  emerald: {
    chip: 'bg-emerald-100/80 dark:bg-emerald-900/35',
    icon: 'text-emerald-600 dark:text-emerald-300',
    ring: 'ring-emerald-500/15 dark:ring-emerald-400/15',
    activeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    activeText: 'text-emerald-700 dark:text-emerald-200',
    activeBar: 'bg-emerald-500 dark:bg-emerald-400',
    sidebarHover: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300',
  },
  teal: {
    chip: 'bg-teal-100/80 dark:bg-teal-900/35',
    icon: 'text-teal-600 dark:text-teal-300',
    ring: 'ring-teal-500/15 dark:ring-teal-400/15',
    activeBg: 'bg-teal-50 dark:bg-teal-900/30',
    activeText: 'text-teal-700 dark:text-teal-200',
    activeBar: 'bg-teal-500 dark:bg-teal-400',
    sidebarHover: 'bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300',
  },
  violet: {
    chip: 'bg-violet-100/80 dark:bg-violet-900/35',
    icon: 'text-violet-600 dark:text-violet-300',
    ring: 'ring-violet-500/15 dark:ring-violet-400/15',
    activeBg: 'bg-violet-50 dark:bg-violet-900/30',
    activeText: 'text-violet-700 dark:text-violet-200',
    activeBar: 'bg-violet-500 dark:bg-violet-400',
    sidebarHover: 'bg-violet-50 dark:bg-violet-900/30 text-violet-600 dark:text-violet-300',
  },
  slate: {
    chip: 'bg-slate-200/70 dark:bg-slate-700/50',
    icon: 'text-slate-600 dark:text-slate-300',
    ring: 'ring-slate-400/20 dark:ring-slate-400/15',
    activeBg: 'bg-slate-100 dark:bg-slate-800/60',
    activeText: 'text-slate-800 dark:text-slate-100',
    activeBar: 'bg-slate-500 dark:bg-slate-400',
    sidebarHover: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200',
  },
};

interface ModuloConfig {
  codigo: string;
  nome: string;
  icone: string;
  /** Chave de ACCENT_TOKENS. */
  accent: keyof typeof ACCENT_TOKENS;
}

const ORDEM_MODULOS: ModuloConfig[] = [
  { codigo: 'dashboards', nome: 'Dashboards', icone: 'LayoutDashboard', accent: 'blue' },
  { codigo: 'admin', nome: 'Administracao', icone: 'Settings2', accent: 'slate' },
  { codigo: 'cadastros', nome: 'Cadastros', icone: 'List', accent: 'indigo' },
  { codigo: 'estoque', nome: 'Estoque', icone: 'Warehouse', accent: 'teal' },
  { codigo: 'solicitacoes', nome: 'Solicitacoes', icone: 'ClipboardList', accent: 'amber' },
  { codigo: 'entregas', nome: 'Entregas', icone: 'Truck', accent: 'sky' },
  { codigo: 'compras', nome: 'Compras', icone: 'ShoppingCart', accent: 'emerald' },
  { codigo: 'auditoria', nome: 'Auditoria', icone: 'History', accent: 'violet' },
];

const SIDEBAR_EXPANDED_KEY = 'supplygo-sidebar-expanded';
const HEADER_HEIGHT_DESKTOP = 64;

function getIcone(nome: string | null): React.ComponentType<{ className?: string }> {
  if (!nome) return Icons.Circle;
  const pascal = nome
    .split(/[-_]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
  const Comp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[
    pascal
  ];
  return Comp ?? Icons.Circle;
}

/** Ancora o painel flyout ao centro vertical do icone, sem ultrapassar header/borda. */
function clampFlyoutTop(iconCenterY: number, panelHeight: number): number {
  const margin = 8;
  const minTop = HEADER_HEIGHT_DESKTOP + margin;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const top = iconCenterY - panelHeight / 2;
  const maxTop = vh - margin - panelHeight;
  if (maxTop < minTop) return minTop;
  return Math.min(Math.max(top, minTop), maxTop);
}

interface AppSidebarProps {
  abertaMobile: boolean;
  onFecharMobile: () => void;
}

interface ModuloVisivel extends ModuloConfig {
  itens: RotaPermitida[];
  ativo: boolean;
}

export function AppSidebar({ abertaMobile, onFecharMobile }: AppSidebarProps) {
  const { rotasPermitidas, isLoading } = usePerfil();

  /* ── estado ─────────────────────────────────────────────────────────── */

  const [expandido, setExpandido] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = window.localStorage.getItem(SIDEBAR_EXPANDED_KEY);
      // default = true (expandido) na primeira visita
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>({});

  const [hoveredGroup, setHoveredGroup] = useState<{
    codigo: string;
    iconCenterY: number;
  } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyoutRef = useRef<HTMLDivElement>(null);
  const flyoutPointerRef = useRef<HTMLDivElement>(null);

  /* ── persistencia ───────────────────────────────────────────────────── */

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(expandido));
    } catch {
      /* ignore */
    }
  }, [expandido]);

  useEffect(() => {
    if (expandido) setHoveredGroup(null);
  }, [expandido]);

  /* ── agrupamento de rotas por modulo ────────────────────────────────── */

  const modulosVisiveis = useMemo<ModuloVisivel[]>(() => {
    const porModulo = new Map<string, RotaPermitida[]>();
    for (const r of rotasPermitidas) {
      if (!r.podeLer || !r.modulo) continue;
      const lista = porModulo.get(r.modulo) ?? [];
      lista.push(r);
      porModulo.set(r.modulo, lista);
    }

    const caminhoAtual = typeof window !== 'undefined' ? window.location.pathname : '';

    return ORDEM_MODULOS.flatMap((m) => {
      const itens = porModulo.get(m.codigo);
      if (!itens || itens.length === 0) return [];
      const ordenados = [...itens].sort((a, b) => a.ordem - b.ordem);
      const ativo = ordenados.some((r) => caminhoAtual.startsWith(r.caminho));
      return [{ ...m, itens: ordenados, ativo }];
    });
  }, [rotasPermitidas]);

  /* ── abrir automaticamente o grupo do item ativo (modo expandido) ───── */

  useEffect(() => {
    if (!expandido) return;
    const ativo = modulosVisiveis.find((m) => m.ativo);
    if (!ativo) return;
    setGruposAbertos((prev) => (prev[ativo.codigo] ? prev : { ...prev, [ativo.codigo]: true }));
  }, [expandido, modulosVisiveis]);

  /* ── handlers ───────────────────────────────────────────────────────── */

  const toggleGrupo = useCallback((codigo: string) => {
    setGruposAbertos((prev) => ({ ...prev, [codigo]: !prev[codigo] }));
  }, []);

  const limparHoverTimeout = useCallback(() => {
    if (!hoverTimeoutRef.current) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }, []);

  const agendarFecharHover = useCallback(
    (delay = 140) => {
      limparHoverTimeout();
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredGroup(null);
        hoverTimeoutRef.current = null;
      }, delay);
    },
    [limparHoverTimeout],
  );

  const onMouseEnterGrupo = useCallback(
    (codigo: string, e: React.MouseEvent<HTMLDivElement>) => {
      limparHoverTimeout();
      const rect = e.currentTarget.getBoundingClientRect();
      const iconCenterY = rect.top + rect.height / 2;
      flushSync(() => setHoveredGroup({ codigo, iconCenterY }));
    },
    [limparHoverTimeout],
  );

  const onMouseLeaveGrupo = useCallback(() => agendarFecharHover(140), [agendarFecharHover]);
  const onMouseEnterFlyout = useCallback(() => limparHoverTimeout(), [limparHoverTimeout]);

  useLayoutEffect(() => {
    if (!hoveredGroup) return;
    const el = flyoutRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    const top = clampFlyoutTop(hoveredGroup.iconCenterY, h);
    el.style.top = `${top}px`;
    const pointer = flyoutPointerRef.current;
    if (pointer) {
      const offset = Math.min(Math.max(hoveredGroup.iconCenterY - top, 14), h - 14);
      pointer.style.top = `${offset}px`;
    }
  }, [hoveredGroup]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  /* ── render ─────────────────────────────────────────────────────────── */

  const grupoHovered = hoveredGroup
    ? (modulosVisiveis.find((m) => m.codigo === hoveredGroup.codigo) ?? null)
    : null;

  return (
    <>
      {/* Backdrop mobile */}
      {abertaMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onFecharMobile}
          aria-hidden
        />
      )}

      {/* Aside */}
      <aside
        className={cn(
          'border-border bg-card fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-x-hidden border-r shadow-lg transition-[width,transform] duration-200 ease-out',
          'dark:bg-gradient-to-b dark:from-[#0f1214] dark:to-[#151819]',
          'lg:static lg:z-auto lg:translate-x-0 lg:shadow-none',
          abertaMobile ? 'translate-x-0' : '-translate-x-full',
          expandido ? 'lg:w-64' : 'lg:w-[72px]',
        )}
        aria-label="Menu principal"
      >
        <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden">
          {/* ─── Cabecalho com logo ─────────────────────────────────── */}
          <div className="border-border flex h-16 shrink-0 items-center justify-center border-b bg-gradient-to-r from-blue-50 to-indigo-50 px-2 dark:from-blue-900/30 dark:to-indigo-900/30">
            <Link
              to="/dashboards"
              onClick={onFecharMobile}
              className="focus-visible:ring-primary flex min-w-0 items-center justify-center rounded-lg ring-offset-2 ring-offset-blue-50 outline-none focus-visible:ring-2 dark:ring-offset-[#0f1214]"
              title="Ir para a Visao Geral"
            >
              {expandido ? (
                <SupplyGoLogo size="medium" />
              ) : (
                <SupplyGoLogo variant="compact" size="medium" />
              )}
            </Link>
          </div>

          {/* ─── Navegacao ──────────────────────────────────────────── */}
          {expandido ? (
            /* ───── Modo expandido ───── */
            <nav
              id="sidebar-main-nav"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden overflow-y-auto px-2 py-3"
              style={{ scrollBehavior: 'smooth' }}
            >
              {isLoading && (
                <div className="text-muted-foreground px-3 text-xs">Carregando menu...</div>
              )}

              {!isLoading &&
                modulosVisiveis.map((m) => {
                  const accent = ACCENT_TOKENS[m.accent];
                  const aberto = !!gruposAbertos[m.codigo];
                  const ModuloIcon = getIcone(m.icone);

                  return (
                    <div key={m.codigo}>
                      {/* Cabecalho da secao */}
                      <button
                        type="button"
                        onClick={() => toggleGrupo(m.codigo)}
                        className={cn(
                          'group/section flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition-all',
                          m.ativo ? 'bg-muted/60' : 'hover:bg-muted/60',
                        )}
                        aria-expanded={aberto}
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span
                            className={cn(
                              'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-transform group-hover/section:scale-105',
                              accent.chip,
                            )}
                          >
                            <ModuloIcon className={cn('h-3.5 w-3.5', accent.icon)} />
                          </span>
                          <span
                            className={cn(
                              'truncate text-[12px] font-semibold tracking-wide',
                              m.ativo ? 'text-foreground' : 'text-muted-foreground',
                            )}
                          >
                            {m.nome}
                          </span>
                        </div>
                        <ChevronDown
                          className={cn(
                            'text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform duration-200',
                            aberto && 'rotate-180',
                          )}
                          aria-hidden
                        />
                      </button>

                      {/* Itens */}
                      {aberto && (
                        <div className="mt-1 space-y-0.5 pl-3">
                          {m.itens.map((rota, idx) => {
                            const Icon = getIcone(rota.icone);
                            const enterDelay = `${Math.min(idx, 12) * 22}ms`;
                            return (
                              <NavLink
                                key={rota.id}
                                to={rota.caminho}
                                onClick={onFecharMobile}
                                style={{ animationDelay: enterDelay }}
                                className={({ isActive }) =>
                                  cn(
                                    'group/item animate-flyout-item-enter relative flex min-h-10 items-center rounded-lg py-2 pr-2 pl-3 text-sm font-medium transition-all hover:translate-x-0.5',
                                    isActive
                                      ? `${accent.activeBg} ${accent.activeText}`
                                      : 'text-foreground/85 hover:bg-muted',
                                  )
                                }
                              >
                                {({ isActive }) => (
                                  <>
                                    {isActive && (
                                      <span
                                        className={cn(
                                          'pointer-events-none absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full',
                                          accent.activeBar,
                                        )}
                                        aria-hidden
                                      />
                                    )}
                                    <Icon className="mr-2 h-4 w-4 shrink-0" />
                                    <span className="flex-1 truncate text-sm">{rota.nome}</span>
                                  </>
                                )}
                              </NavLink>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

              {!isLoading && modulosVisiveis.length === 0 && (
                <div className="border-border text-muted-foreground mx-1 rounded-md border border-dashed px-3 py-4 text-xs">
                  Voce ainda nao tem permissoes atribuidas. Aguarde um administrador.
                </div>
              )}
            </nav>
          ) : (
            /* ───── Modo colapsado (somente icones) ───── */
            <nav
              id="sidebar-main-nav"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-x-hidden overflow-y-auto px-2 py-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {!isLoading &&
                modulosVisiveis.map((m) => {
                  const accent = ACCENT_TOKENS[m.accent];
                  const ModuloIcon = getIcone(m.icone);
                  const isHovered = hoveredGroup?.codigo === m.codigo;
                  const primeira = m.itens[0];

                  return (
                    <div
                      key={m.codigo}
                      className="relative w-full min-w-0"
                      onMouseEnter={(e) => onMouseEnterGrupo(m.codigo, e)}
                      onMouseLeave={onMouseLeaveGrupo}
                    >
                      {(m.ativo || isHovered) && (
                        <span
                          className={cn(
                            'pointer-events-none absolute top-1/2 left-0 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity',
                            accent.activeBar,
                            isHovered ? 'opacity-100' : 'opacity-80',
                          )}
                          aria-hidden
                        />
                      )}
                      <Link
                        to={primeira?.caminho ?? '#'}
                        onClick={(e) => {
                          if (!primeira) {
                            e.preventDefault();
                            return;
                          }
                          onFecharMobile();
                        }}
                        title={m.nome}
                        className={cn(
                          'flex h-12 w-full min-w-0 items-center justify-center overflow-hidden rounded-lg transition-colors duration-150',
                          isHovered
                            ? accent.sidebarHover
                            : m.ativo
                              ? `${accent.activeBg} ${accent.activeText}`
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                      >
                        <ModuloIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  );
                })}
            </nav>
          )}
        </div>
      </aside>

      {/* Botao toggle (apenas desktop) — fica na borda do sidebar, ancorado a posicao fixa */}
      <button
        type="button"
        onClick={() => {
          setHoveredGroup(null);
          setExpandido((v) => !v);
        }}
        className={cn(
          'border-border bg-card text-foreground hover:bg-muted hover:text-primary focus-visible:ring-primary fixed top-16 z-[60] hidden h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-[left,colors,opacity] duration-200 focus-visible:ring-2 focus-visible:outline-none lg:flex',
          expandido ? 'left-64' : 'left-[72px]',
          hoveredGroup ? 'pointer-events-none opacity-0' : 'opacity-100',
        )}
        aria-expanded={expandido}
        aria-controls="sidebar-main-nav"
        aria-label={expandido ? 'Recolher menu lateral' : 'Expandir menu lateral'}
        title={expandido ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      >
        {expandido ? (
          <ChevronLeft className="h-4 w-4" aria-hidden />
        ) : (
          <ChevronRight className="h-4 w-4" aria-hidden />
        )}
      </button>

      {/* Flyout flutuante (modo colapsado) */}
      {grupoHovered && !expandido && hoveredGroup && (
        <div
          ref={flyoutRef}
          className={cn(
            'animate-slide-in-from-left bg-card/95 pointer-events-auto fixed left-[78px] z-[55] hidden w-64 rounded-2xl shadow-2xl ring-1 shadow-black/10 backdrop-blur-xl lg:block dark:shadow-black/40',
            ACCENT_TOKENS[grupoHovered.accent].ring,
          )}
          onMouseEnter={onMouseEnterFlyout}
          onMouseLeave={onMouseLeaveGrupo}
        >
          <div className="flex max-h-[calc(100vh-4.5rem)] flex-col overflow-hidden rounded-2xl">
            {/* Cabecalho do flyout */}
            <div className="border-border/70 flex items-center gap-2.5 border-b px-3 py-2.5">
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                  ACCENT_TOKENS[grupoHovered.accent].chip,
                )}
              >
                {(() => {
                  const ModuloIcon = getIcone(grupoHovered.icone);
                  return (
                    <ModuloIcon
                      className={cn('h-4 w-4', ACCENT_TOKENS[grupoHovered.accent].icon)}
                    />
                  );
                })()}
              </span>
              <span className="text-foreground min-w-0 flex-1 truncate text-sm font-semibold">
                {grupoHovered.nome}
              </span>
            </div>

            {/* Itens do flyout */}
            <div
              className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-1.5 py-1.5"
              style={{ scrollBehavior: 'smooth' }}
            >
              {grupoHovered.itens.map((rota, idx) => {
                const Icon = getIcone(rota.icone);
                const enterDelay = `${Math.min(idx, 12) * 22}ms`;
                const accent = ACCENT_TOKENS[grupoHovered.accent];
                return (
                  <NavLink
                    key={rota.id}
                    to={rota.caminho}
                    onClick={() => setHoveredGroup(null)}
                    style={{ animationDelay: enterDelay }}
                    className={({ isActive }) =>
                      cn(
                        'group/item animate-flyout-item-enter relative flex min-h-10 items-center rounded-lg py-2 pr-2 pl-3 text-sm font-medium transition-all hover:translate-x-0.5',
                        isActive
                          ? `${accent.activeBg} ${accent.activeText}`
                          : 'text-foreground/85 hover:bg-muted',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            className={cn(
                              'pointer-events-none absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-r-full',
                              accent.activeBar,
                            )}
                            aria-hidden
                          />
                        )}
                        <Icon className="mr-2 h-4 w-4 shrink-0" />
                        <span className="flex-1 truncate text-sm">{rota.nome}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* Ponteiro lateral */}
          <div
            ref={flyoutPointerRef}
            className="bg-card/95 pointer-events-none absolute -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[3px] border-t border-l border-black/5 backdrop-blur-xl dark:border-white/10"
            aria-hidden
          />
        </div>
      )}
    </>
  );
}
