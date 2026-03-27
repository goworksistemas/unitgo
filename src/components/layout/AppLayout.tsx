import React, { useState, useCallback, useMemo, useContext, useRef, useEffect } from 'react';
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  SIDEBAR_DESKTOP_TRANSITION_MS,
} from '@/components/ui/sidebar';
import { DialogContainerProvider } from '@/contexts/DialogContainerContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ChevronRight, Home, Moon, Sun } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { ThemeContext } from '@/App';
import { NavigationContext, type NavigationSection, type NavigationState } from '@/hooks/useNavigation';

/** Tempo antes de recolher após o ponteiro sair (após a animação de largura + layout interno). */
const SIDEBAR_HOVER_CLOSE_MS = SIDEBAR_DESKTOP_TRANSITION_MS + 100;

interface AppLayoutProps {
  children: React.ReactNode;
}

/**
 * Menu lateral: expande ao passar o mouse na faixa da sidebar; Ctrl+B / botão fixam aberto ou fecham.
 */
export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const sidebarOpen = sidebarPinned || sidebarHovered;
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHoverCloseTimer = useCallback(() => {
    if (hoverCloseTimerRef.current) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearHoverCloseTimer(), [clearHoverCloseTimer]);

  const handleSidebarPointerEnter = useCallback(() => {
    clearHoverCloseTimer();
    setSidebarHovered(true);
  }, [clearHoverCloseTimer]);

  const handleSidebarPointerLeave = useCallback(() => {
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = window.setTimeout(() => {
      setSidebarHovered(false);
      hoverCloseTimerRef.current = null;
    }, SIDEBAR_HOVER_CLOSE_MS);
  }, [clearHoverCloseTimer]);

  const handleSidebarOpenChange = useCallback(
    (next: boolean) => {
      if (next) {
        setSidebarPinned(true);
      } else {
        setSidebarPinned(false);
        setSidebarHovered(false);
        clearHoverCloseTimer();
      }
    },
    [clearHoverCloseTimer],
  );

  const [navState, setNavState] = useState<NavigationState>({
    sections: [],
    activeSection: '',
    title: '',
    subtitle: undefined,
  });

  const setSections = useCallback((sections: NavigationSection[]) => {
    setNavState(prev => {
      if (prev.sections === sections) return prev;
      return { ...prev, sections };
    });
  }, []);

  const setActiveSection = useCallback((sectionId: string, itemId?: string) => {
    setNavState(prev => ({
      ...prev,
      activeSection: sectionId,
      activeItem: itemId,
    }));
  }, []);

  const setTitle = useCallback((title: string, subtitle?: string) => {
    setNavState(prev => {
      if (prev.title === title && prev.subtitle === subtitle) return prev;
      return { ...prev, title, subtitle };
    });
  }, []);

  const contextValue = useMemo(() => ({
    state: navState,
    setSections,
    setActiveSection,
    setTitle,
  }), [navState, setSections, setActiveSection, setTitle]);

  return (
    <NavigationContext.Provider value={contextValue}>
      <SidebarProvider open={sidebarOpen} onOpenChange={handleSidebarOpenChange} defaultOpen={false}>
        <AppSidebar
          onSidebarPointerEnter={handleSidebarPointerEnter}
          onSidebarPointerLeave={handleSidebarPointerLeave}
        />
        <DialogContainerProvider>
          <SidebarInset className="bg-transparent">
            <header className="flex h-[52px] shrink-0 items-center gap-3 border-b border-border/80 bg-card px-4 shadow-sm">
              <SidebarTrigger
                className="-ml-0.5 shrink-0"
                title="Fixar menu aberto ou fechar (Ctrl+B). Passe o mouse na barra esquerda para expandir."
              />
              <Separator orientation="vertical" className="h-5" />
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
            <main className="flex-1 overflow-auto bg-[#f8f9fa] p-4 md:p-6 dark:bg-background">
              {children}
            </main>
          </SidebarInset>
        </DialogContainerProvider>
      </SidebarProvider>
    </NavigationContext.Provider>
  );
}
