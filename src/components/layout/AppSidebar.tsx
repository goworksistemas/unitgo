import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  Building2,
  ChevronDown,
  Info,
  KeyRound,
  LogOut,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo';
import { DailyCodeDisplay } from '@/components/shared/DailyCodeDisplay';
import {
  useNavigation,
  type NavigationAccent,
  type NavigationItem,
  type NavigationSection,
} from '@/hooks/useNavigation';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';

/* ───────────────────────────────────────────────────────────────────────────
   Tokens de cor por seção do menu (flyout do sidebar minimizado).
   Strings completas para que o Tailwind detecte e gere as classes.
   ─────────────────────────────────────────────────────────────────────────── */
type AccentTokens = {
  chip: string;
  icon: string;
  ring: string;
  activeBg: string;
  activeText: string;
  activeBar: string;
  sidebarHover: string;
};

const ACCENT_TOKENS: Record<NavigationAccent, AccentTokens> = {
  blue: {
    chip: 'bg-blue-100/80 dark:bg-blue-900/35',
    icon: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-500/15 dark:ring-blue-400/15',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30',
    activeText: 'text-blue-700 dark:text-blue-200',
    activeBar: 'bg-blue-500 dark:bg-blue-400',
    sidebarHover: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
  },
  green: {
    chip: 'bg-green-100/80 dark:bg-green-900/35',
    icon: 'text-green-600 dark:text-green-300',
    ring: 'ring-green-500/15 dark:ring-green-400/15',
    activeBg: 'bg-green-50 dark:bg-green-900/30',
    activeText: 'text-green-700 dark:text-green-200',
    activeBar: 'bg-green-500 dark:bg-green-400',
    sidebarHover: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300',
  },
  /** indigo: redefinido como AZUL puro (branding SupplyGo) — sem roxo. */
  indigo: {
    chip: 'bg-blue-100/80 dark:bg-blue-900/35',
    icon: 'text-blue-600 dark:text-blue-300',
    ring: 'ring-blue-500/15 dark:ring-blue-400/15',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30',
    activeText: 'text-blue-700 dark:text-blue-200',
    activeBar: 'bg-blue-500 dark:bg-blue-400',
    sidebarHover: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300',
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
  pink: {
    chip: 'bg-pink-100/80 dark:bg-pink-900/35',
    icon: 'text-pink-600 dark:text-pink-300',
    ring: 'ring-pink-500/15 dark:ring-pink-400/15',
    activeBg: 'bg-pink-50 dark:bg-pink-900/30',
    activeText: 'text-pink-700 dark:text-pink-200',
    activeBar: 'bg-pink-500 dark:bg-pink-400',
    sidebarHover: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300',
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
  /** violet: redefinido como SLATE (cinza-grafite) — sem roxo. */
  violet: {
    chip: 'bg-slate-200/70 dark:bg-slate-700/50',
    icon: 'text-slate-700 dark:text-slate-200',
    ring: 'ring-slate-400/20 dark:ring-slate-400/15',
    activeBg: 'bg-slate-100 dark:bg-slate-800/60',
    activeText: 'text-slate-800 dark:text-slate-100',
    activeBar: 'bg-slate-600 dark:bg-slate-400',
    sidebarHover: 'bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-200',
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

const DEFAULT_ACCENT: NavigationAccent = 'indigo';

const ROLE_LABELS: Record<string, string> = {
  controller: 'Controlador',
  admin: 'Administrador',
  warehouse: 'Almoxarifado',
  designer: 'Designer',
  developer: 'Desenvolvedor',
  requester: 'Solicitante',
  buyer: 'Comprador',
  financial: 'Financeiro',
  purchases_admin: 'Admin Compras',
  driver: 'Motorista',
  executor: 'Executor',
};

const HEADER_HEIGHT = 64;

function clampFlyoutTop(iconCenterY: number, panelHeight: number): number {
  const margin = 8;
  const minTop = HEADER_HEIGHT + margin;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const maxTop = vh - margin - panelHeight;
  const top = iconCenterY - panelHeight / 2;
  if (maxTop < minTop) return minTop;
  return Math.min(Math.max(top, minTop), maxTop);
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Achata items/subgroups num único array para renderização. */
type FlatItem = (NavigationItem & { _subgroupLabel?: undefined }) | { _subgroupLabel: string };

function flattenSectionItems(section: NavigationSection): FlatItem[] {
  if (section.subgroups && section.subgroups.length > 0) {
    return section.subgroups.flatMap<FlatItem>((sg) => [
      { _subgroupLabel: sg.label },
      ...sg.items.map((it) => ({ ...it, _subgroupLabel: undefined as undefined })),
    ]);
  }
  return (section.items ?? []).map((it) => ({ ...it, _subgroupLabel: undefined as undefined }));
}

export interface AppSidebarProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({
  expanded,
  onToggleExpanded,
  isMobileOpen,
  onCloseMobile,
}: AppSidebarProps) {
  const { state, setActiveSection } = useNavigation();
  const { sections, activeSection, activeItem } = state;
  const { currentUser, currentUnit, getAvailableUnits, setCurrentUnit, logout } = useApp();

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [hoveredGroup, setHoveredGroup] = useState<{ sectionId: string; iconCenterY: number } | null>(null);
  const [openInfoPopup, setOpenInfoPopup] = useState<string | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);

  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flyoutPanelRef = useRef<HTMLDivElement>(null);
  const flyoutPointerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/version.json')
      .then(res => (res.ok ? res.json() : null))
      .then((data: { version?: string } | null) => data?.version && setAppVersion(data.version))
      .catch(() => {});
  }, []);

  /** Expande automaticamente o grupo ativo ao trocar de seção. */
  useEffect(() => {
    if (!activeSection) return;
    setExpandedGroups((prev) => (prev[activeSection] ? prev : { ...prev, [activeSection]: true }));
  }, [activeSection]);

  /** Fecha o flyout ao expandir o sidebar (modo desktop). */
  useEffect(() => {
    if (expanded) {
      setHoveredGroup(null);
    }
  }, [expanded]);

  /** Fecha popups quando o menu mobile fecha. */
  useEffect(() => {
    if (!isMobileOpen) {
      setUserMenuOpen(false);
      setUnitMenuOpen(false);
    }
  }, [isMobileOpen]);

  /** Posiciona o painel flutuante alinhado ao centro do ícone. */
  useLayoutEffect(() => {
    if (!hoveredGroup) return;
    const el = flyoutPanelRef.current;
    if (!el) return;
    const h = el.getBoundingClientRect().height;
    const panelTop = clampFlyoutTop(hoveredGroup.iconCenterY, h);
    el.style.top = `${panelTop}px`;
    const pointer = flyoutPointerRef.current;
    if (pointer) {
      const offset = Math.min(Math.max(hoveredGroup.iconCenterY - panelTop, 14), h - 14);
      pointer.style.top = `${offset}px`;
    }
  }, [hoveredGroup]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  const clearHoverTimeout = useCallback(() => {
    if (!hoverTimeoutRef.current) return;
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = null;
  }, []);

  const scheduleHoverClose = useCallback((delay = 140) => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredGroup(null);
      hoverTimeoutRef.current = null;
    }, delay);
  }, [clearHoverTimeout]);

  const handleMouseEnterGroup = useCallback(
    (sectionId: string, e: React.MouseEvent<HTMLDivElement>) => {
      clearHoverTimeout();
      const rect = e.currentTarget.getBoundingClientRect();
      const iconCenterY = rect.top + rect.height / 2;
      flushSync(() => {
        setHoveredGroup({ sectionId, iconCenterY });
      });
    },
    [clearHoverTimeout],
  );

  const handleMouseLeaveGroup = useCallback(() => {
    scheduleHoverClose(140);
  }, [scheduleHoverClose]);

  const handleMouseEnterFlyout = useCallback(() => {
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const toggleGroup = useCallback((sectionId: string) => {
    setExpandedGroups((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }, []);

  const handleActivate = useCallback(
    (sectionId: string, itemId?: string) => {
      setActiveSection(sectionId, itemId);
      setHoveredGroup(null);
      if (isMobileOpen) onCloseMobile();
    },
    [isMobileOpen, onCloseMobile, setActiveSection],
  );

  const sectionMap = useMemo(() => {
    const map: Record<string, NavigationSection> = {};
    for (const s of sections) map[s.id] = s;
    return map;
  }, [sections]);

  const availableUnits = getAvailableUnits();
  const shouldShowUnitSelector =
    availableUnits.length > 1 ||
    currentUser?.role === 'designer' ||
    currentUser?.role === 'developer' ||
    currentUser?.role === 'purchases_admin';
  const unitPlaceholder =
    currentUser?.role === 'designer' ||
    currentUser?.role === 'developer' ||
    currentUser?.role === 'purchases_admin'
      ? 'Selecione uma unidade'
      : 'Selecione';

  const showDailyCode = !!currentUser && ['controller', 'warehouse'].includes(currentUser.role);

  /* ───────────────────────────── Render: sidebar desktop ───────────────────────────── */
  const sidebarDesktop = (
    <aside
      className={cn(
        'hidden lg:flex fixed top-0 left-0 z-50 h-screen min-w-0 max-w-full overflow-x-hidden',
        'border-r border-gray-200 dark:border-gray-700 shadow-lg',
        'bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-800',
        'transition-[width] duration-200 ease-out',
        expanded ? 'w-56' : 'w-[64px]',
      )}
      aria-label="Menu principal"
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-x-hidden">
        {/* Header / Logo */}
        <div className="flex h-16 shrink-0 items-center justify-center border-b border-gray-200 bg-gradient-to-r from-slate-50 to-blue-50 px-2 transition-all duration-200 dark:border-gray-700 dark:from-slate-900 dark:to-slate-800">
          <div className="flex min-w-0 items-center justify-center">
            {expanded ? (
              <SupplyGoLogo variant="full" size="medium" className="shrink-0" hideTagline />
            ) : (
              <SupplyGoLogo variant="compact" size="medium" className="shrink-0" />
            )}
          </div>
        </div>

        {/* Seletor de unidade */}
        {(shouldShowUnitSelector || (availableUnits.length === 1 && currentUnit)) && (
          <div
            className={cn(
              'shrink-0 border-b border-gray-200 dark:border-gray-700',
              expanded ? 'px-3 py-3' : 'flex items-center justify-center px-2 py-2',
            )}
          >
            {expanded ? (
              shouldShowUnitSelector ? (
                <div className="min-w-0">
                  <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Building2 className="h-3 w-3 shrink-0" />
                    Unidade
                  </label>
                  <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
                    <SelectTrigger className="h-9 w-full min-w-0 text-sm">
                      <SelectValue placeholder={unitPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-xs font-medium">{currentUnit?.name}</span>
                </div>
              )
            ) : shouldShowUnitSelector ? (
              <DropdownMenu open={unitMenuOpen} onOpenChange={setUnitMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                    aria-label="Trocar unidade"
                    title={`Unidade: ${currentUnit?.name ?? unitPlaceholder}`}
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start" className="w-56">
                  <DropdownMenuLabel>Unidade</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {availableUnits.map((unit) => (
                    <DropdownMenuItem
                      key={unit.id}
                      onClick={() => setCurrentUnit(unit.id)}
                      className={cn(currentUnit?.id === unit.id && 'bg-accent')}
                    >
                      {unit.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <span
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-gray-500 dark:text-gray-400"
                tabIndex={0}
                aria-label={`Unidade: ${currentUnit?.name ?? ''}`}
                title={currentUnit?.name ?? ''}
              >
                <Building2 className="h-4 w-4 shrink-0" />
              </span>
            )}
          </div>
        )}

        {/* Navegação */}
        {expanded ? (
          <div
            id="sidebar-main-nav"
            className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden px-2 py-2"
            style={{ scrollBehavior: 'smooth' }}
          >
            {sections.map((section) => {
              const accent = ACCENT_TOKENS[section.accent ?? DEFAULT_ACCENT];
              const Icon = section.icon;
              const hasItems = (section.items && section.items.length > 0) || (section.subgroups && section.subgroups.length > 0);
              const isOpen = !!expandedGroups[section.id];
              const isSectionActive = activeSection === section.id && !activeItem;
              const groupHasActive = activeSection === section.id;

              /* Botão "raiz" (direto OU cabeçalho de grupo) — layout idêntico para alinhamento perfeito. */
              const rootButton = (
                <button
                  type="button"
                  onClick={() => (hasItems ? toggleGroup(section.id) : handleActivate(section.id))}
                  aria-expanded={hasItems ? isOpen : undefined}
                  className={cn(
                    'relative flex h-9 w-full items-center gap-2.5 rounded-md pl-2 pr-2 text-left transition-colors',
                    isSectionActive
                      ? `${accent.activeBg} ${accent.activeText}`
                      : groupHasActive
                        ? 'bg-gray-100/70 text-gray-800 dark:bg-gray-800/50 dark:text-gray-100'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60',
                  )}
                >
                  {isSectionActive && (
                    <span
                      className={cn('pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full', accent.activeBar)}
                      aria-hidden
                    />
                  )}
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                      accent.chip,
                    )}
                  >
                    <Icon className={cn('h-4 w-4', accent.icon)} aria-hidden />
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold leading-none">
                    {section.label}
                  </span>
                  {section.badge != null && (
                    <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {section.badge}
                    </span>
                  )}
                  {hasItems && (
                    <ChevronDown
                      className={cn(
                        'h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500',
                        isOpen && 'rotate-180',
                      )}
                      aria-hidden
                    />
                  )}
                </button>
              );

              if (!hasItems) {
                return (
                  <div key={section.id} className="py-0.5">
                    {rootButton}
                  </div>
                );
              }

              const flatItems = flattenSectionItems(section);
              return (
                <div key={section.id} className="py-0.5">
                  {rootButton}

                  {isOpen && (
                    <div
                      className={cn(
                        'mt-0.5 ml-[18px] border-l',
                        groupHasActive ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700',
                      )}
                    >
                      {flatItems.map((entry, idx) => {
                        if ('_subgroupLabel' in entry && entry._subgroupLabel) {
                          return (
                            <div
                              key={`sg-${entry._subgroupLabel}-${idx}`}
                              className="pl-3 pr-2 pt-2 pb-0.5 first:pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                            >
                              {entry._subgroupLabel}
                            </div>
                          );
                        }
                        const item = entry as NavigationItem;
                        const ItemIcon = item.icon;
                        const isItemActive = activeSection === section.id && activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleActivate(section.id, item.id)}
                            className={cn(
                              'relative flex h-8 w-full items-center gap-2 rounded-md pl-3 pr-2 text-left transition-colors',
                              isItemActive
                                ? `${accent.activeBg} ${accent.activeText}`
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60',
                            )}
                          >
                            {isItemActive && (
                              <span
                                className={cn('pointer-events-none absolute -left-px top-1 bottom-1 w-[2px] rounded-r-full', accent.activeBar)}
                                aria-hidden
                              />
                            )}
                            {ItemIcon ? (
                              <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                            ) : (
                              <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                            )}
                            <span className="flex-1 truncate text-[13px] font-medium leading-none">
                              {item.label}
                            </span>
                            {item.badge != null && (
                              <span className="shrink-0 rounded-full bg-red-500 px-1 py-0.5 text-center text-[9px] font-bold leading-none text-white min-w-[16px]">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Daily Code (warehouse / controller) */}
            {showDailyCode && (
              <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Código Diário
                </p>
                <div className="px-2">
                  <DailyCodeDisplay />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Minimizado: ícones em coluna com flyout no hover */
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
            <div
              id="sidebar-main-nav"
              className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto overflow-x-hidden px-2 py-2"
              style={{ scrollBehavior: 'smooth' }}
            >
              {sections.map((section) => {
                const Icon = section.icon;
                const accent = ACCENT_TOKENS[section.accent ?? DEFAULT_ACCENT];
                const isHovered = hoveredGroup?.sectionId === section.id;
                const hasActiveItem = activeSection === section.id;

                return (
                  <div
                    key={section.id}
                    className="relative w-full min-w-0"
                    onMouseEnter={(e) => handleMouseEnterGroup(section.id, e)}
                    onMouseLeave={handleMouseLeaveGroup}
                  >
                    {(hasActiveItem || isHovered) && (
                      <span
                        className={cn(
                          'pointer-events-none absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full transition-opacity',
                          accent.activeBar,
                          isHovered ? 'opacity-100' : 'opacity-80',
                        )}
                        aria-hidden
                      />
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const hasItems = (section.items && section.items.length > 0) || (section.subgroups && section.subgroups.length > 0);
                        if (!hasItems) {
                          handleActivate(section.id);
                        } else {
                          handleActivate(section.id);
                        }
                      }}
                      title={section.label}
                      aria-label={section.label}
                      className={cn(
                        'flex h-12 w-full min-w-0 max-w-full items-center justify-center overflow-hidden rounded-lg transition-colors duration-150',
                        isHovered
                          ? accent.sidebarHover
                          : hasActiveItem
                            ? `${accent.activeBg} ${accent.activeText}`
                            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700/60 dark:hover:text-gray-200',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      {section.badge != null && (
                        <span className="absolute right-2 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                          {section.badge}
                        </span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Daily Code (warehouse / controller) minimizado — apenas indicador */}
            {showDailyCode && (
              <div className="shrink-0 border-t border-gray-200 px-2 py-2 dark:border-gray-700">
                <div className="flex justify-center">
                  <DailyCodeDisplay />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rodapé: usuário + versão */}
        <div className="min-w-0 shrink-0 border-t border-gray-200 bg-gradient-to-r from-gray-100 to-gray-50 dark:border-gray-700 dark:from-gray-800 dark:to-gray-800/60">
          <div className={cn('flex w-full min-w-0 flex-col gap-1', expanded ? 'p-3' : 'px-2 py-2')}>
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'group/user flex w-full min-w-0 items-center rounded-lg transition-colors',
                    expanded ? 'gap-2 px-2 py-2 hover:bg-white/70 dark:hover:bg-gray-700/40' : 'justify-center p-1.5 hover:bg-white/70 dark:hover:bg-gray-700/40',
                  )}
                  title={
                    !expanded && currentUser
                      ? `${currentUser.name} — ${ROLE_LABELS[currentUser.role] || currentUser.role}${appVersion ? ` · v${appVersion}` : ''}`
                      : undefined
                  }
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-semibold text-white shadow-sm">
                    {currentUser ? getInitials(currentUser.name) : '??'}
                  </span>
                  {expanded && (
                    <div className="flex min-w-0 flex-1 flex-col overflow-hidden text-left">
                      <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                        {currentUser?.name}
                      </span>
                      <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                        {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
                      </span>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuLabel className="grid gap-0.5 font-normal">
                  <span className="text-sm font-medium leading-tight">{currentUser?.name}</span>
                  <span className="text-xs font-normal leading-tight text-muted-foreground">
                    {currentUser?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {appVersion && (
              <div
                className={cn(
                  'flex items-center text-[10px] font-mono text-gray-400 dark:text-gray-500',
                  expanded ? 'justify-start px-2' : 'justify-center',
                )}
              >
                {expanded ? <span className="truncate">v{appVersion}</span> : <span>v{appVersion.split('.').slice(0, 2).join('.')}</span>}
              </div>
            )}
          </div>
        </div>
      </div>
    </aside>
  );

  /* ───────────────────────────── Flyout (desktop minimizado) ───────────────────────────── */
  const flyoutSection = hoveredGroup && !expanded ? sectionMap[hoveredGroup.sectionId] : null;
  const flyoutAccent = flyoutSection ? ACCENT_TOKENS[flyoutSection.accent ?? DEFAULT_ACCENT] : null;
  const flyoutFlat = flyoutSection ? flattenSectionItems(flyoutSection) : [];
  const FlyoutIcon = flyoutSection?.icon;

  const flyout = flyoutSection && flyoutAccent && (
    <div
      ref={flyoutPanelRef}
      className={cn(
        'fixed left-[70px] z-[55] hidden w-60 animate-slide-in-from-left rounded-2xl bg-white/95 shadow-2xl shadow-black/10 ring-1 backdrop-blur-xl dark:bg-gray-900/90 dark:shadow-black/40 lg:block',
        flyoutAccent.ring,
      )}
      onMouseEnter={handleMouseEnterFlyout}
      onMouseLeave={handleMouseLeaveGroup}
    >
      <div className="flex max-h-[calc(100vh-4.5rem)] flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center gap-2.5 border-b border-gray-100/80 px-3 py-2.5 dark:border-gray-800/70">
          {FlyoutIcon && (
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', flyoutAccent.chip)}>
              <FlyoutIcon className={cn('h-4 w-4', flyoutAccent.icon)} aria-hidden />
            </span>
          )}
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
            {flyoutSection.label}
          </span>
          {flyoutSection.info && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpenInfoPopup(openInfoPopup === flyoutSection.id ? null : flyoutSection.id);
              }}
              className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:opacity-80', flyoutAccent.chip)}
              title="Saiba mais"
            >
              <Info className={cn('h-3 w-3', flyoutAccent.icon)} />
            </button>
          )}
        </div>

        {openInfoPopup === flyoutSection.id && flyoutSection.info && (
          <div className="border-b border-gray-100/80 px-3 py-2 text-[11px] leading-relaxed text-gray-600 dark:border-gray-800/70 dark:text-gray-300">
            {flyoutSection.info}
          </div>
        )}

        <div
          className="min-h-0 flex-1 overflow-y-auto px-1.5 py-1.5"
          style={{ scrollBehavior: 'smooth' }}
        >
          {flyoutFlat.length === 0 && (
            <button
              type="button"
              onClick={() => handleActivate(flyoutSection.id)}
              className={cn(
                'relative flex h-8 w-full animate-flyout-item-enter items-center gap-2 rounded-md pl-3 pr-2 text-left transition-colors',
                activeSection === flyoutSection.id
                  ? `${flyoutAccent.activeBg} ${flyoutAccent.activeText}`
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60',
              )}
              style={{ animationDelay: '0ms' }}
            >
              <span className="flex-1 truncate text-left text-[13px] font-medium leading-none">
                Abrir {flyoutSection.label}
              </span>
            </button>
          )}
          {flyoutFlat.map((entry, idx) => {
            const enterDelay = `${Math.min(idx, 12) * 22}ms`;
            if ('_subgroupLabel' in entry && entry._subgroupLabel) {
              return (
                <div
                  key={`sg-${entry._subgroupLabel}-${idx}`}
                  className="animate-flyout-item-enter px-2 pt-2 pb-0.5 first:pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                  style={{ animationDelay: enterDelay }}
                >
                  {entry._subgroupLabel}
                </div>
              );
            }
            const item = entry as NavigationItem;
            const ItemIcon = item.icon;
            const isItemActive = activeSection === flyoutSection.id && activeItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleActivate(flyoutSection.id, item.id)}
                className={cn(
                  'relative flex h-8 w-full animate-flyout-item-enter items-center gap-2 rounded-md pl-3 pr-2 text-left transition-colors',
                  isItemActive
                    ? `${flyoutAccent.activeBg} ${flyoutAccent.activeText}`
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/60',
                )}
                style={{ animationDelay: enterDelay }}
              >
                {isItemActive && (
                  <span
                    className={cn(
                      'pointer-events-none absolute left-0 top-1 bottom-1 w-[2px] rounded-r-full',
                      flyoutAccent.activeBar,
                    )}
                    aria-hidden
                  />
                )}
                {ItemIcon ? (
                  <ItemIcon className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                ) : (
                  <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                )}
                <span className="flex-1 truncate text-left text-[13px] font-medium leading-none">
                  {item.label}
                </span>
                {item.badge != null && (
                  <span className="shrink-0 rounded-full bg-red-500 px-1 py-0.5 text-center text-[9px] font-bold leading-none text-white min-w-[16px]">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <div
        ref={flyoutPointerRef}
        className="pointer-events-none absolute -left-[5px] h-2.5 w-2.5 -translate-y-1/2 rotate-45 rounded-[3px] border-l border-t border-black/5 bg-white/95 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/90"
        aria-hidden
      />
    </div>
  );

  /* ───────────────────────────── Botão flutuante toggle (entre sidebar e conteúdo) ───────────────────────────── */
  const toggleButton = (
    <button
      type="button"
      onClick={onToggleExpanded}
      className={cn(
        'hidden lg:flex fixed z-[60] h-8 w-8 shrink-0 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-md transition-[left,colors,opacity] duration-200',
        'hover:bg-gray-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        'dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-blue-300',
        expanded ? 'left-56' : 'left-[64px]',
        'top-16',
        hoveredGroup && !expanded ? 'pointer-events-none opacity-0' : 'opacity-100',
      )}
      title={expanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
      aria-expanded={expanded}
      aria-controls="sidebar-main-nav"
      aria-label={expanded ? 'Recolher menu lateral' : 'Expandir menu lateral'}
    >
      <ChevronDown className={cn('h-4 w-4 -rotate-90 transition-transform duration-200', expanded ? 'rotate-90' : '-rotate-90')} aria-hidden />
    </button>
  );

  /* ───────────────────────────── Drawer mobile ───────────────────────────── */
  const mobileDrawer = (
    <div
      className={cn(
        'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 dark:bg-gray-900/80 lg:hidden',
        isMobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      onClick={onCloseMobile}
    >
      <div
        className={cn(
          'fixed inset-y-0 left-0 w-full max-w-[280px] transform bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-gray-900 sm:max-w-xs',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex h-full min-h-0 flex-col">
          {/* Header mobile */}
          <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-3 py-3 dark:border-gray-700 sm:px-4 sm:py-4">
            <SupplyGoLogo variant="full" size="medium" />
            <button
              type="button"
              onClick={onCloseMobile}
              className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl p-2 text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-700 active:scale-95 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* Seletor de unidade mobile */}
          {(shouldShowUnitSelector || (availableUnits.length === 1 && currentUnit)) && (
            <div className="shrink-0 border-b border-gray-200 px-3 py-3 dark:border-gray-700 sm:px-4">
              {shouldShowUnitSelector ? (
                <div className="min-w-0">
                  <label className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                    <Building2 className="h-3 w-3 shrink-0" />
                    Unidade
                  </label>
                  <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
                    <SelectTrigger className="h-10 w-full text-sm">
                      <SelectValue placeholder={unitPlaceholder} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUnits.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="flex min-w-0 items-center gap-1.5 text-gray-600 dark:text-gray-300">
                  <Building2 className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate text-sm font-medium">{currentUnit?.name}</span>
                </div>
              )}
            </div>
          )}

          {/* Navegação mobile */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-2 py-2 sm:px-3">
            {sections.map((section) => {
              const accent = ACCENT_TOKENS[section.accent ?? DEFAULT_ACCENT];
              const Icon = section.icon;
              const hasItems = (section.items && section.items.length > 0) || (section.subgroups && section.subgroups.length > 0);
              const isOpen = !!expandedGroups[section.id];
              const isSectionActive = activeSection === section.id && !activeItem;
              const groupHasActive = activeSection === section.id;
              const flatItems = flattenSectionItems(section);

              /* Botão raiz idêntico para direto/grupo — touch target 44px. */
              const rootBtn = (
                <button
                  type="button"
                  onClick={() => (hasItems ? toggleGroup(section.id) : handleActivate(section.id))}
                  aria-expanded={hasItems ? isOpen : undefined}
                  className={cn(
                    'relative flex h-11 w-full items-center gap-2.5 rounded-lg pl-2 pr-2 text-left transition-colors active:scale-[0.98]',
                    isSectionActive
                      ? `${accent.activeBg} ${accent.activeText}`
                      : groupHasActive
                        ? 'bg-gray-100/70 text-gray-800 dark:bg-gray-800/50 dark:text-gray-100'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800',
                  )}
                >
                  {isSectionActive && (
                    <span className={cn('pointer-events-none absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full', accent.activeBar)} aria-hidden />
                  )}
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-md', accent.chip)}>
                    <Icon className={cn('h-4 w-4', accent.icon)} aria-hidden />
                  </span>
                  <span className="flex-1 truncate text-sm font-semibold leading-none">
                    {section.label}
                  </span>
                  {section.badge != null && (
                    <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {section.badge}
                    </span>
                  )}
                  {hasItems && (
                    <ChevronDown
                      className={cn('h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500', isOpen && 'rotate-180')}
                      aria-hidden
                    />
                  )}
                </button>
              );

              if (!hasItems) {
                return (
                  <div key={section.id} className="py-0.5">
                    {rootBtn}
                  </div>
                );
              }

              return (
                <div key={section.id} className="py-0.5">
                  {rootBtn}

                  {isOpen && (
                    <div
                      className={cn(
                        'mt-0.5 ml-[20px] border-l',
                        groupHasActive ? 'border-gray-300 dark:border-gray-600' : 'border-gray-200 dark:border-gray-700',
                      )}
                    >
                      {flatItems.map((entry, idx) => {
                        if ('_subgroupLabel' in entry && entry._subgroupLabel) {
                          return (
                            <div
                              key={`sg-${entry._subgroupLabel}-${idx}`}
                              className="pl-3 pr-2 pt-2 pb-0.5 first:pt-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500"
                            >
                              {entry._subgroupLabel}
                            </div>
                          );
                        }
                        const item = entry as NavigationItem;
                        const ItemIcon = item.icon;
                        const isItemActive = activeSection === section.id && activeItem === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleActivate(section.id, item.id)}
                            className={cn(
                              'relative flex h-10 w-full items-center gap-2 rounded-md pl-3 pr-2 text-left transition-colors active:scale-[0.98]',
                              isItemActive
                                ? `${accent.activeBg} ${accent.activeText}`
                                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/60',
                            )}
                          >
                            {isItemActive && (
                              <span className={cn('pointer-events-none absolute -left-px top-1.5 bottom-1.5 w-[2px] rounded-r-full', accent.activeBar)} aria-hidden />
                            )}
                            {ItemIcon ? (
                              <ItemIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                            ) : (
                              <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-50" aria-hidden />
                            )}
                            <span className="flex-1 truncate text-[13px] font-medium leading-none">
                              {item.label}
                            </span>
                            {item.badge != null && (
                              <span className="shrink-0 rounded-full bg-red-500 px-1.5 py-0.5 text-center text-[10px] font-bold leading-none text-white min-w-[18px]">
                                {item.badge}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {showDailyCode && (
              <div className="mt-3 border-t border-gray-200 pt-2 dark:border-gray-700">
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                  Código Diário
                </p>
                <div className="px-3">
                  <DailyCodeDisplay />
                </div>
              </div>
            )}
          </div>

          {/* Rodapé mobile */}
          <div className="shrink-0 border-t border-gray-200 bg-gray-50/80 px-3 py-2 dark:border-gray-700 dark:bg-gray-800/60">
            <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-white/70 dark:hover:bg-gray-700/40"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-blue-800 text-xs font-semibold text-white shadow-sm">
                    {currentUser ? getInitials(currentUser.name) : '??'}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                    <span className="truncate text-sm font-semibold text-gray-800 dark:text-gray-100">
                      {currentUser?.name}
                    </span>
                    <span className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                      {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" side="top" className="w-56">
                <DropdownMenuLabel className="grid gap-0.5 font-normal">
                  <span className="text-sm font-medium leading-tight">{currentUser?.name}</span>
                  <span className="text-xs font-normal leading-tight text-muted-foreground">
                    {currentUser?.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Alterar Senha
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {appVersion && (
              <p className="mt-1 text-center text-[10px] font-mono text-gray-400 dark:text-gray-500">
                v{appVersion}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {sidebarDesktop}
      {flyout}
      {toggleButton}
      {mobileDrawer}
      {showChangePassword && (
        <ChangePasswordLazy open={showChangePassword} onOpenChange={setShowChangePassword} />
      )}
    </>
  );
}

function ChangePasswordLazy({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [ChangePasswordDialog, setDialog] = useState<React.ComponentType<any> | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();

  useEffect(() => {
    const token = localStorage.getItem('gowork_auth_token');
    if (token) setAccessToken(token);
  }, [open]);

  useEffect(() => {
    import('@/components/auth/ChangePasswordDialog').then((mod) => {
      setDialog(() => mod.ChangePasswordDialog);
    });
  }, []);

  if (!ChangePasswordDialog) return null;
  return <ChangePasswordDialog open={open} onOpenChange={onOpenChange} accessToken={accessToken} />;
}
