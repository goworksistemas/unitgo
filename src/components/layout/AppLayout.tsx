import React, { useState, useCallback, useMemo, useContext } from 'react';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Moon, Sun } from 'lucide-react';
import { AppSidebar } from './AppSidebar';
import { ThemeContext } from '@/App';
import { NavigationContext, type NavigationSection, type NavigationState } from '@/hooks/useNavigation';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const { theme, toggleTheme } = useContext(ThemeContext);
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
      {/* Background Animation (estilo pipego) */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 opacity-20 bg-rotate-gradient" aria-hidden />
      </div>
      <SidebarProvider defaultOpen>
        <AppSidebar />
        <SidebarInset className="bg-background/80">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-semibold truncate">{navState.title}</h1>
              {navState.subtitle && (
                <p className="text-xs text-muted-foreground truncate">{navState.subtitle}</p>
              )}
            </div>
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
          <main className="flex-1 overflow-auto p-4 md:p-6">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </NavigationContext.Provider>
  );
}
