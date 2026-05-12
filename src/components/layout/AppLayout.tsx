import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ChevronRight, Home, Menu, Moon, Sun } from 'lucide-react';
import { DialogContainerProvider } from '@/contexts/DialogContainerContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './AppSidebar';
import { ThemeContext } from '@/App';
import { NavigationContext, type NavigationSection, type NavigationState } from '@/hooks/useNavigation';
import { cn } from '@/lib/utils';

const DESKTOP_SIDEBAR_EXPANDED_KEY = 'supplygo-desktop-sidebar-expanded';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useContext(ThemeContext);

  const [desktopSidebarExpanded, setDesktopSidebarExpanded] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const stored = window.localStorage.getItem(DESKTOP_SIDEBAR_EXPANDED_KEY);
      return stored === null ? true : stored === 'true';
    } catch {
      return true;
    }
  });

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    try {
      window.localStorage.setItem(DESKTOP_SIDEBAR_EXPANDED_KEY, desktopSidebarExpanded ? 'true' : 'false');
    } catch {
      /* ignore */
    }
  }, [desktopSidebarExpanded]);

  const handleToggleSidebar = useCallback(() => {
    setDesktopSidebarExpanded((v) => !v);
  }, []);

  const handleCloseMobile = useCallback(() => setIsMobileMenuOpen(false), []);

  /* ───────────────────────────── Navigation Context ───────────────────────────── */
  const [navState, setNavState] = useState<NavigationState>({
    sections: [],
    activeSection: '',
    title: '',
    subtitle: undefined,
  });

  const setSections = useCallback((sections: NavigationSection[]) => {
    setNavState((prev) => (prev.sections === sections ? prev : { ...prev, sections }));
  }, []);

  const setActiveSection = useCallback((sectionId: string, itemId?: string) => {
    setNavState((prev) => ({ ...prev, activeSection: sectionId, activeItem: itemId }));
  }, []);

  const setTitle = useCallback((title: string, subtitle?: string) => {
    setNavState((prev) => {
      if (prev.title === title && prev.subtitle === subtitle) return prev;
      return { ...prev, title, subtitle };
    });
  }, []);

  const navContextValue = useMemo(
    () => ({ state: navState, setSections, setActiveSection, setTitle }),
    [navState, setSections, setActiveSection, setTitle],
  );

  return (
    <NavigationContext.Provider value={navContextValue}>
      <DialogContainerProvider>
        <div className="relative flex min-h-screen bg-[#f8f9fa] dark:bg-background">
          <AppSidebar
            expanded={desktopSidebarExpanded}
            onToggleExpanded={handleToggleSidebar}
            isMobileOpen={isMobileMenuOpen}
            onCloseMobile={handleCloseMobile}
          />

          {/* Conteúdo principal — margem se ajusta ao estado do sidebar (desktop) */}
          <div
            className={cn(
              'relative z-20 flex min-h-screen w-full flex-1 flex-col overflow-hidden transition-[margin-left] duration-200 ease-out',
              desktopSidebarExpanded ? 'lg:ml-56' : 'lg:ml-[64px]',
            )}
          >
            {/* Header fixo — h-16 (64px) alinha com o header do sidebar */}
            <header
              className={cn(
                'fixed top-0 right-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border/80 bg-card px-4 shadow-sm transition-[left] duration-200 ease-out',
                'left-0',
                desktopSidebarExpanded ? 'lg:left-56' : 'lg:left-[64px]',
              )}
            >
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Separator orientation="vertical" className="h-5 lg:hidden" />

              <nav
                className="flex min-w-0 flex-1 items-center gap-1.5 text-sm text-muted-foreground"
                aria-label="Migalhas"
              >
                <Home className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />
                <div className="min-w-0">
                  <h1 className="truncate font-semibold text-foreground">{navState.title || 'Painel'}</h1>
                  {navState.subtitle ? (
                    <p className="truncate text-xs text-muted-foreground">{navState.subtitle}</p>
                  ) : null}
                </div>
              </nav>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={toggleTheme} className="shrink-0">
                    {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span className="sr-only">{theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {theme === 'dark' ? 'Alternar para modo claro' : 'Alternar para modo escuro'}
                </TooltipContent>
              </Tooltip>
            </header>

            {/* Espaçador para o header fixo (64px) + conteúdo */}
            <main className="flex-1 overflow-auto bg-[#f8f9fa] p-4 pt-20 md:p-6 md:pt-[84px] dark:bg-background">
              {children}
            </main>
          </div>
        </div>
      </DialogContainerProvider>
    </NavigationContext.Provider>
  );
}
