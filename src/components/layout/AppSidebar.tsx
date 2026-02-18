import React, { useContext, useState } from 'react';
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
import { Building2, ChevronDown, ChevronRight, LogOut, Moon, Sun, KeyRound, ChevronsUpDown } from 'lucide-react';
import { GoworkLogo } from '@/components/shared/GoworkLogo';
import { DailyCodeDisplay } from '@/components/shared/DailyCodeDisplay';
import { useNavigation } from '@/hooks/useNavigation';
import { useApp } from '@/contexts/AppContext';
import { ThemeContext } from '@/App';
import type { Unit, User } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  controller: 'Controlador',
  admin: 'Administrador',
  warehouse: 'Almoxarifado',
  designer: 'Designer',
  developer: 'Desenvolvedor',
  requester: 'Solicitante',
};

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function AppSidebar() {
  const { state, setActiveSection } = useNavigation();
  const { sections, activeSection, activeItem } = state;
  const { currentUser, currentUnit, getAvailableUnits, setCurrentUnit, logout } = useApp();
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set([activeSection]));
  const [showChangePassword, setShowChangePassword] = useState(false);

  const availableUnits = getAvailableUnits();

  const shouldShowUnitSelector =
    availableUnits.length > 1 ||
    currentUser?.role === 'designer' ||
    currentUser?.role === 'developer';

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="p-4">
        <GoworkLogo variant="full" size="medium" />
      </SidebarHeader>

      <SidebarSeparator />

      {/* Unit selector */}
      {shouldShowUnitSelector && (
        <>
          <div className="px-4 py-3">
            <label className="text-xs font-medium text-sidebar-foreground/70 flex items-center gap-2 mb-2">
              <Building2 className="h-3 w-3" />
              Unidade
            </label>
            <Select value={currentUnit?.id || ''} onValueChange={setCurrentUnit}>
              <SelectTrigger className="w-full h-9 text-sm">
                <SelectValue placeholder={
                  currentUser?.role === 'designer' || currentUser?.role === 'developer'
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
          <SidebarSeparator />
        </>
      )}

      {!shouldShowUnitSelector && availableUnits.length === 1 && currentUnit && (
        <>
          <div className="px-4 py-3 flex items-center gap-2 text-sidebar-foreground/70">
            <Building2 className="h-3 w-3" />
            <span className="text-xs font-medium">{currentUnit.name}</span>
          </div>
          <SidebarSeparator />
        </>
      )}

      {/* Navigation */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegação</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
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
                          className="w-full"
                        >
                          <section.icon className="h-4 w-4" />
                          <span>{section.label}</span>
                          {section.badge != null && (
                            <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                              {section.badge}
                            </span>
                          )}
                          {isExpanded ? (
                            <ChevronDown className="ml-auto h-4 w-4" />
                          ) : (
                            <ChevronRight className="ml-auto h-4 w-4" />
                          )}
                        </SidebarMenuButton>
                        {isExpanded && (
                          <SidebarMenuSub>
                            {section.items!.map((item) => {
                              const isItemActive = activeSection === section.id && activeItem === item.id;
                              return (
                                <SidebarMenuSubItem key={item.id}>
                                  <SidebarMenuSubButton
                                    isActive={isItemActive}
                                    onClick={() => setActiveSection(section.id, item.id)}
                                  >
                                    {item.icon && <item.icon className="h-4 w-4" />}
                                    <span>{item.label}</span>
                                    {item.badge != null && (
                                      <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                                        {item.badge}
                                      </span>
                                    )}
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              );
                            })}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton
                        onClick={() => setActiveSection(section.id)}
                        isActive={isActive}
                      >
                        <section.icon className="h-4 w-4" />
                        <span>{section.label}</span>
                        {section.badge != null && (
                          <span className="ml-auto bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
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

        {/* Daily code for warehouse/controller roles */}
        {currentUser && ['controller', 'warehouse'].includes(currentUser.role) && (
          <>
            <SidebarSeparator />
            <SidebarGroup>
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
      <SidebarFooter>
        <SidebarSeparator />
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full rounded-lg p-2 hover:bg-sidebar-accent transition-colors text-left">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {currentUser ? getInitials(currentUser.name) : '??'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-sidebar-foreground truncate">
                    {currentUser?.name}
                  </p>
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {currentUser ? ROLE_LABELS[currentUser.role] || currentUser.role : ''}
                  </p>
                </div>
                <ChevronsUpDown className="h-4 w-4 text-sidebar-foreground/40 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="top" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm">{currentUser?.name}</p>
                <p className="text-xs text-muted-foreground">{currentUser?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
                {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
              </DropdownMenuItem>
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
