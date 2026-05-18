import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Menu, Moon, Sun } from 'lucide-react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppMobileDrawer } from '@/components/layout/AppMobileDrawer'
import { AppBottomNav } from '@/components/layout/AppBottomNav'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { useTheme } from '@/contexts/ThemeContext'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(() => {
    try { return localStorage.getItem('supplygo-sidebar-expanded') !== 'false' } catch { return true }
  })
  const location = useLocation()
  const { theme, toggleTheme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <AppSidebar onExpandedChange={setSidebarExpanded} />
      <AppMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Header mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-20 flex h-12 items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={18} />
        </button>
        <SupplyGoLogo variant={theme === 'dark' ? 'light' : 'colored'} size={24} showText />
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Header desktop */}
      <header
        className={`hidden lg:flex fixed top-0 right-0 z-40 h-12 items-center gap-3 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md px-6 transition-[left] duration-200 ease-out ${
          sidebarExpanded ? 'left-56' : 'left-14'
        }`}
      >
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{getPageTitle(location.pathname)}</span>
        <div className="flex-1" />
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>

      {/* Conteúdo */}
      <main
        className={`transition-[margin] duration-200 ease-out ${
          sidebarExpanded ? 'lg:ml-56' : 'lg:ml-14'
        } pt-12 pb-20 lg:pb-6`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>

      <AppBottomNav />
    </div>
  )
}

function getPageTitle(pathname: string): string {
  if (pathname === '/') return 'Início'
  if (pathname.startsWith('/admin/usuarios')) return 'Usuários'
  if (pathname.startsWith('/admin')) return 'Admin'
  if (pathname.startsWith('/perfil')) return 'Meu Perfil'
  if (pathname.startsWith('/cadastros/produtos')) return 'Produtos'
  if (pathname.startsWith('/cadastros/unidades-medida')) return 'Unidades de medida'
  if (pathname.startsWith('/cadastros/empresas')) return 'Empresas'
  if (pathname.startsWith('/cadastros/departamentos')) return 'Departamentos'
  if (pathname.startsWith('/cadastros/alcadas-aprovacao')) return 'Alçadas de aprovação'
  if (pathname.startsWith('/cadastros')) return 'Cadastros'
  if (pathname === '/compras/solicitacoes/nova') return 'Nova solicitação'
  if (pathname.match(/^\/compras\/solicitacoes\/[^/]+$/)) return 'Solicitação de compra'
  if (pathname.startsWith('/compras/solicitacoes')) return 'Solicitações de compra'
  if (pathname.startsWith('/compras/fornecedores')) return 'Fornecedores'
  if (pathname === '/compras/cotacoes/nova') return 'Nova cotação'
  if (pathname.match(/^\/compras\/cotacoes\/[^/]+$/)) return 'Cotação'
  if (pathname.startsWith('/compras/cotacoes')) return 'Cotações'
  if (pathname === '/compras/pedidos/novo') return 'Pedido direto'
  if (pathname.match(/^\/compras\/pedidos\/[^/]+$/)) return 'Pedido de compra'
  if (pathname.startsWith('/compras/pedidos')) return 'Pedidos de compra'
  if (pathname.match(/^\/compras\/processo\/[^/]+$/)) return 'Fluxo de compra'
  if (pathname === '/compras/recebimentos/novo') return 'Novo recebimento'
  if (pathname.startsWith('/compras/recebimentos')) return 'Recebimentos'
  if (pathname.match(/^\/compras\/processo\//)) return 'Solicitação de compra'
  if (pathname.startsWith('/compras')) return 'Compras'
  return ''
}
