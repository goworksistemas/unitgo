import React, { useEffect, useMemo, useState } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Building2, ChevronDown, ChevronRight, LogOut, KeyRound, ChevronsUpDown } from 'lucide-react';
import { GoworkLogo } from '@/components/shared/GoworkLogo';
import { DailyCodeDisplay } from '@/components/shared/DailyCodeDisplay';
import { useNavigation, type NavigationSection, type NavigationSidebarGroup } from '@/hooks/useNavigation';
import { useApp } from '@/contexts/AppContext';
import { cn } from '@/lib/utils';
import type { Unit, User } from '@/types';

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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface AppSidebarProps {
  onSidebarPointerEnter?: React.PointerEventHandler<HTMLDivElement>;
  onSidebarPointerLeave?: React.PointerEventHandler<HTMLDivElement>;
}

const navActiveClass =
  'rounded-lg bg-gradient-to-r from-blue-50 to-violet-50 text-blue-800 shadow-sm dark:from-blue-950/50 dark:to-violet-950/40 dark:text-blue-50 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-300';

const SIDEBAR_GROUP_ORDER: NavigationSidebarGroup[] = ['inicio', 'modulos', 'utilitarios'];

const SIDEBAR_GROUP_LABEL: Record<NavigationSidebarGroup, string> = {
  inicio: 'Início',
  modulos: 'Módulos',
  utilitarios: 'Utilitários',
};

export function AppSidebar({
  onSidebarPointerEnter,
  onSidebarPointerLeave,
}: AppSidebarProps = {}) {
  const { state, setActiveSection } = useNavigation();
  const { sections, activeSection, activeItem } = state;
  const { currentUser, currentUnit, getAvailableUnits, setCurrentUnit, logout } = useApp();
  const {
    state: sidebarState,
    isMobile,
    layoutExpanded,
    open: sidebarOpen,
    openMobile,
  } = useSidebar();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([activeSection]));
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unitMenuOpen, setUnitMenuOpen] = useState(false);

  useEffect(() => {
    if (!sidebarOpen) {
      setUserMenuOpen(false);
      setUnitMenuOpen(false);
    }
  }, [sidebarOpen]);

  useEffect(() => {
    if (isMobile && !openMobile) {
      setUserMenuOpen(false);
      setUnitMenuOpen(false);
    }
  }, [isMobile, openMobile]);

  useEffect(() => {
    fetch('/version.json')
      .then(res => res.ok ? res.json() : null)
      .then((data: { version?: string } | null) => data?.version && setAppVersion(data.version))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeSection) return;
    setExpandedSections((prev) => new Set(prev).add(activeSection));
  }, [activeSection]);

  /** Comprador: manter “Compras” expandido para ver todo o fluxo sem clique extra. */
  useEffect(() => {
    if (currentUser?.role !== 'buyer') return;
    if (sections.some((s) => s.id === 'buyer-work')) {
      setExpandedSections((prev) => new Set(prev).add('buyer-work'));
    }
  }, [currentUser?.role, sections]);

  /** Controlador / executor: manter “Estoque unidade” expandido (inclui pedidos ao almox.). */
  useEffect(() => {
    if (currentUser?.role === 'controller' || currentUser?.role === 'executor') {
      if (sections.some((s) => s.id === 'estoque')) {
        setExpandedSections((prev) => new Set(prev).add('estoque'));
      }
    }
    /** Almoxarifado: manter “Almoxarifado” expandido (visão geral, pedidos, lotes, compras). */
    if (currentUser?.role === 'warehouse') {
      if (sections.some((s) => s.id === 'almox')) {
        setExpandedSections((prev) => new Set(prev).add('almox'));
      }
    }
  }, [currentUser?.role, sections]);

  const availableUnits = getAvailableUnits();

  const shouldShowUnitSelector =
    availableUnits.length > 1 ||
    currentUser?.role === 'designer' ||
    currentUser?.role === 'developer' ||
    currentUser?.role === 'purchases_admin';

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const unitPlaceholder =
    currentUser?.role === 'designer' ||
    currentUser?.role === 'developer' ||
    currentUser?.role === 'purchases_admin'
      ? 'Selecione uma unidade'
      : 'Selecione';

  const groupedSections = useMemo(() => {
    const buckets: Record<NavigationSidebarGroup, NavigationSection[]> = {
      inicio: [],
      modulos: [],
      utilitarios: [],
    };
    for (const s of sections) {
      const g = s.sidebarGroup ?? 'modulos';
      buckets[g].push(s);
    }
    return SIDEBAR_GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
      key: k,
      label: SIDEBAR_GROUP_LABEL[k],
      sections: buckets[k],
    }));
  }, [sections]);

  const footerCollapsedHint =
    sidebarState === 'collapsed' && !isMobile && currentUser
      ? `${currentUser.name} — ${ROLE_LABELS[currentUser.role] || currentUser.role}${appVersion ? ` · v${appVersion}` : ''}`
      : undefined;

  const userFooterTrigger = (
    <button
      type="button"
      title={footerCollapsedHint}
      className={cn(
        'flex min-w-0 items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-sidebar-accent',
        'w-full overflow-hidden',
        'group-data-[layout-expanded=false]:mx-auto group-data-[layout-expanded=false]:size-9 group-data-[layout-expanded=false]:justify-center group-data-[layout-expanded=false]:gap-0 group-data-[layout-expanded=false]:p-0 group-data-[layout-expanded=false]:shrink-0',
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {currentUser ? getInitials(currentUser.name) : '??'}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 overflow-hidden group-data-[layout-expanded=false]:hidden">
        <p className="truncate text-sm font-medium text-sidebar-foreground">{currentUser?.name}</p>
        <p className="truncate text-xs text-sidebar-foreground/60">
          {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
        </p>
      </div>
      <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-foreground/40 group-data-[layout-expanded=false]:hidden" />
    </button>
  );

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar shadow-sm"
      onPointerEnter={onSidebarPointerEnter}
      onPointerLeave={onSidebarPointerLeave}
    >
      <SidebarHeader className="flex min-w-0 items-center justify-center gap-2 overflow-hidden px-4 py-4 group-data-[layout-expanded=false]:justify-center group-data-[layout-expanded=false]:px-2 group-data-[layout-expanded=false]:py-3">
        <GoworkLogo variant="full" size="medium" className="shrink-0 group-data-[layout-expanded=false]:hidden" />
        <div className="hidden w-full justify-center group-data-[layout-expanded=false]:flex">
          <GoworkLogo variant="compact" size="small" className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Unit selector */}
      {shouldShowUnitSelector && (
        <>
          <div className="px-4 py-4 group-data-[layout-expanded=false]:hidden">
            <label className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-2 mb-2">
              <Building2 className="h-3 w-3 shrink-0" />
              Unidade
            </label>
            <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
              <SelectTrigger className="w-full h-9 text-sm min-w-0">
                <SelectValue placeholder={unitPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden group-data-[layout-expanded=false]:flex flex-col items-center justify-center px-2 py-2">
            <DropdownMenu open={unitMenuOpen} onOpenChange={setUnitMenuOpen}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-sidebar-border bg-sidebar text-sidebar-foreground hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
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
          </div>
          <SidebarSeparator />
        </>
      )}

      {!shouldShowUnitSelector && availableUnits.length === 1 && currentUnit && (
        <>
          <div className="px-4 py-4 flex items-center gap-2 text-sidebar-foreground/70 min-w-0 overflow-hidden group-data-[layout-expanded=false]:hidden">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="text-xs font-medium truncate">{currentUnit.name}</span>
          </div>
          <div className="hidden group-data-[layout-expanded=false]:flex flex-col items-center justify-center px-2 py-2">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/80"
              tabIndex={0}
              aria-label={`Unidade: ${currentUnit.name}`}
              title={currentUnit.name}
            >
              <Building2 className="h-4 w-4 shrink-0" />
            </span>
          </div>
          <SidebarSeparator />
        </>
      )}

      {/* Navigation: blocos Início / Módulos / Utilitários */}
      <SidebarContent className="gap-0">
        {groupedSections.map((group) => (
          <SidebarGroup key={group.key} className="p-3 pt-2">
            <SidebarGroupLabel className="mb-1 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.sections.map((section) => {
                  const isExpanded = expandedSections.has(section.id);
                  const isActive = activeSection === section.id && !activeItem;
                  const hasItems = section.items && section.items.length > 0;

                  return (
                    <SidebarMenuItem key={section.id}>
                      {hasItems ? (
                        <>
                          <SidebarMenuButton
                            onClick={() => toggleSection(section.id)}
                            isActive={isActive}
                            className={cn(
                              'w-full rounded-lg text-foreground hover:bg-sidebar-accent',
                              isActive && navActiveClass
                            )}
                          >
                            <section.icon className="h-4 w-4 shrink-0" />
                            <span className="group-data-[layout-expanded=false]:hidden">{section.label}</span>
                            {section.badge != null && (
                              <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-xs px-2 py-0.5 rounded-full group-data-[layout-expanded=false]:hidden">
                                {section.badge}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="ml-auto h-4 w-4 shrink-0 group-data-[layout-expanded=false]:hidden" />
                            ) : (
                              <ChevronRight className="ml-auto h-4 w-4 shrink-0 group-data-[layout-expanded=false]:hidden" />
                            )}
                          </SidebarMenuButton>
                          {isExpanded && (
                            <SidebarMenuSub>
                              {section.items!.map((item, itemIdx) => {
                                const prev = section.items![itemIdx - 1];
                                const showSubgroup = item.group && item.group !== prev?.group;
                                const isItemActive = activeSection === section.id && activeItem === item.id;
                                return (
                                  <React.Fragment key={item.id}>
                                    {showSubgroup ? (
                                      <li className="list-none">
                                        <div className="mt-1 px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-sidebar-foreground/50">
                                          {item.group}
                                        </div>
                                      </li>
                                    ) : null}
                                    <SidebarMenuSubItem>
                                      <SidebarMenuSubButton
                                        isActive={isItemActive}
                                        onClick={() => setActiveSection(section.id, item.id)}
                                        className={cn(
                                          'rounded-md text-foreground hover:bg-sidebar-accent',
                                          isItemActive && navActiveClass
                                        )}
                                      >
                                        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
                                        <span className="whitespace-normal text-left leading-snug">{item.label}</span>
                                        {item.badge != null && (
                                          <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-xs px-2 py-0.5 rounded-full">
                                            {item.badge}
                                          </span>
                                        )}
                                      </SidebarMenuSubButton>
                                    </SidebarMenuSubItem>
                                  </React.Fragment>
                                );
                              })}
                            </SidebarMenuSub>
                          )}
                        </>
                      ) : (
                        <SidebarMenuButton
                          onClick={() => setActiveSection(section.id)}
                          isActive={isActive}
                          className={cn(
                            'rounded-lg text-foreground hover:bg-sidebar-accent',
                            isActive && navActiveClass
                          )}
                        >
                          <section.icon className="h-4 w-4 shrink-0" />
                          <span className="group-data-[layout-expanded=false]:hidden">{section.label}</span>
                          {section.badge != null && (
                            <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-xs px-2 py-0.5 rounded-full group-data-[layout-expanded=false]:hidden">
                              {section.badge}
                            </span>
                          )}
                        </SidebarMenuButton>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Daily code for warehouse/controller roles */}
        {currentUser && ['controller', 'warehouse'].includes(currentUser.role) && (
          <>
            <SidebarSeparator className="group-data-[layout-expanded=false]:hidden" />
            <SidebarGroup className="group-data-[layout-expanded=false]:hidden">
              <SidebarGroupLabel>Código Diário</SidebarGroupLabel>
              <SidebarGroupContent>
                <div className="px-2">
                  <DailyCodeDisplay />
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>

      {/* Footer: user info + actions */}
      <SidebarFooter className="min-w-0 shrink-0 overflow-x-hidden overflow-y-hidden">
        <SidebarSeparator />
        {appVersion ? (
          <div
            className={cn(
              'overflow-x-hidden px-4 transition-[opacity,max-height,padding-top] duration-200 ease-[cubic-bezier(0.33,1,0.68,1)]',
              layoutExpanded
                ? 'max-h-10 pt-3 opacity-100'
                : 'pointer-events-none max-h-0 pt-0 opacity-0',
            )}
            aria-hidden={!layoutExpanded}
          >
            <p className="truncate text-xs text-sidebar-foreground/50">v{appVersion}</p>
          </div>
        ) : null}
        <div className="p-3 min-w-0 group-data-[layout-expanded=false]:flex group-data-[layout-expanded=false]:justify-center group-data-[layout-expanded=false]:p-2">
          <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
            <DropdownMenuTrigger asChild>{userFooterTrigger}</DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel className="grid gap-0.5 font-normal">
                <span className="text-sm font-medium leading-tight">{currentUser?.name}</span>
                <span className="text-xs font-normal leading-tight text-muted-foreground">
                  {currentUser?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowChangePassword(true)}>
                <KeyRound className="h-4 w-4 mr-2" />
                Alterar Senha
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </SidebarFooter>

      {/* Change password dialog rendered at sidebar level */}
      {showChangePassword && (
        <ChangePasswordLazy open={showChangePassword} onOpenChange={setShowChangePassword} />
      )}
    </Sidebar>
  );
}

function ChangePasswordLazy({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [ChangePasswordDialog, setDialog] = useState<React.ComponentType<any> | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>();

  React.useEffect(() => {
    const token = localStorage.getItem('gowork_auth_token');
    if (token) setAccessToken(token);
  }, [open]);

  React.useEffect(() => {
    import('@/components/auth/ChangePasswordDialog').then(mod => {
      setDialog(() => mod.ChangePasswordDialog);
    });
  }, []);

  if (!ChangePasswordDialog) return null;
  return <ChangePasswordDialog open={open} onOpenChange={onOpenChange} accessToken={accessToken} />;
}
