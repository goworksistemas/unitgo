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
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([activeSection]));
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [appVersion, setAppVersion] = useState<string | null>(null);

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

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-sidebar-border bg-sidebar shadow-sm transition-all duration-200 ease-out"
      onPointerEnter={onSidebarPointerEnter}
      onPointerLeave={onSidebarPointerLeave}
    >
      <SidebarHeader className="flex min-w-0 items-center justify-center gap-2 overflow-hidden px-4 py-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:py-3">
        <GoworkLogo variant="full" size="medium" className="shrink-0 group-data-[collapsible=icon]:hidden" />
        <div className="hidden w-full justify-center group-data-[collapsible=icon]:flex">
          <GoworkLogo variant="compact" size="small" className="shrink-0" />
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Unit selector */}
      {shouldShowUnitSelector && (
        <>
          <div className="px-4 py-4 group-data-[collapsible=icon]:hidden">
            <label className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-2 mb-2">
              <Building2 className="h-3 w-3 shrink-0" />
              Unidade
            </label>
            <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
              <SelectTrigger className="w-full h-9 text-sm min-w-0">
                <SelectValue placeholder={
                  currentUser?.role === 'designer' ||
                  currentUser?.role === 'developer' ||
                  currentUser?.role === 'purchases_admin'
                    ? 'Selecione uma unidade'
                    : 'Selecione'
                } />
              </SelectTrigger>
              <SelectContent>
                {availableUnits.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        </>
      )}

      {!shouldShowUnitSelector && availableUnits.length === 1 && currentUnit && (
        <>
          <div className="px-4 py-4 flex items-center gap-2 text-sidebar-foreground/70 min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="text-xs font-medium truncate">{currentUnit.name}</span>
          </div>
          <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
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
                            <span className="group-data-[collapsible=icon]:hidden">{section.label}</span>
                            {section.badge != null && (
                              <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-xs px-2 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
                                {section.badge}
                              </span>
                            )}
                            {isExpanded ? (
                              <ChevronDown className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
                            ) : (
                              <ChevronRight className="ml-auto h-4 w-4 shrink-0 group-data-[collapsible=icon]:hidden" />
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
                                        <span>{item.label}</span>
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
                          <span className="group-data-[collapsible=icon]:hidden">{section.label}</span>
                          {section.badge != null && (
                            <span className="ml-auto bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300 text-xs px-2 py-0.5 rounded-full group-data-[collapsible=icon]:hidden">
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
            <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
            <SidebarGroup className="group-data-[collapsible=icon]:hidden">
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
      <SidebarFooter className="min-w-0 overflow-hidden shrink-0">
        <SidebarSeparator />
        {appVersion && (
          <div className="px-4 pt-3 group-data-[collapsible=icon]:hidden">
            <p className="text-xs text-sidebar-foreground/50 truncate">v{appVersion}</p>
          </div>
        )}
        <div className="p-3 min-w-0">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left min-w-0 overflow-hidden">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {currentUser ? getInitials(currentUser.name) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 overflow-hidden group-data-[collapsible=icon]:hidden">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/40 shrink-0 group-data-[collapsible=icon]:hidden" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                {appVersion ? `v${appVersion}` : 'Usuário'}
              </TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
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
