/**
 * Layout principal autenticado.
 *
 * - Sidebar fixa a esquerda (ou drawer no mobile)
 * - Header com nome do usuario, perfis e botao de logout
 * - <Outlet /> renderiza a rota atual
 */
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { LogOut, Menu, Moon, Sun, User as UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { AppSidebar } from './AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import { usePerfil } from '@/contexts/PerfilContext';
import { useInactivityLogout } from '@/hooks/useInactivityLogout';
import { useTheme } from '@/contexts/ThemeContext';

export function AppLayout() {
  const [sidebarMobileAberta, setSidebarMobileAberta] = useState(false);
  const { signOut, sessao } = useAuth();
  const { usuario, perfis } = usePerfil();
  const { theme, alternar } = useTheme();

  // Auto-logout por inatividade (1h)
  useInactivityLogout(
    () => {
      toast.warning('Voce foi desconectado por inatividade');
      void signOut();
    },
    !!sessao,
    () => {
      toast.info('Voce sera desconectado em 5 minutos por inatividade');
    },
  );

  const handleLogout = async () => {
    await signOut();
    toast.success('Sessao encerrada');
  };

  const nomeUsuario = usuario?.nome ?? sessao?.user.email ?? 'Usuario';
  const iniciais = nomeUsuario
    .split(' ')
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        abertaMobile={sidebarMobileAberta}
        onFecharMobile={() => setSidebarMobileAberta(false)}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarMobileAberta(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => alternar(e)}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <Separator orientation="vertical" className="h-6" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 h-9">
                <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                  {iniciais}
                </div>
                <span className="hidden sm:inline text-sm">{nomeUsuario}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>
                <div className="space-y-1">
                  <p className="text-sm font-semibold leading-none">{nomeUsuario}</p>
                  <p className="text-xs text-muted-foreground leading-none">
                    {sessao?.user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {perfis.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                    Perfis: {perfis.map((p) => p.codigo).join(', ')}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Conteudo */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
