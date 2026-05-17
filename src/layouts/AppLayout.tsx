import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppMobileDrawer } from '@/components/layout/AppMobileDrawer'
import { AppBottomNav } from '@/components/layout/AppBottomNav'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'

export function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [sidebarExpanded, setSidebarExpanded] = useState(true)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar desktop */}
      <AppSidebar onExpandedChange={setSidebarExpanded} />

      {/* Drawer mobile */}
      <AppMobileDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

      {/* Header mobile */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-20 flex h-14 items-center gap-3 border-b border-gray-200 bg-white/95 backdrop-blur-md px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Abrir menu"
        >
          <Menu size={20} />
        </button>
        <SupplyGoLogo variant="colored" size={28} showText />
      </header>

      {/* Conteúdo principal */}
      <main
        className={`transition-[margin] duration-200 ease-out ${
          sidebarExpanded ? 'lg:ml-64' : 'lg:ml-[68px]'
        } pt-14 pb-20 lg:pt-0 lg:pb-6`}
      >
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Outlet />
        </div>
      </main>

      {/* Bottom nav mobile */}
      <AppBottomNav />
    </div>
  )
}
