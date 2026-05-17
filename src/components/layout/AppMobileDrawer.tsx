import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ChevronDown, ChevronUp, LogOut, User } from 'lucide-react'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_GROUPS, ACCENTS } from './nav'

interface AppMobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppMobileDrawer({ open, onClose }: AppMobileDrawerProps) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})

  // Fecha o drawer ao navegar
  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Bloqueia scroll do body quando aberto
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function toggleGroup(group: string) {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }))
  }

  function isActive(href: string) {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || isAdmin)

  return (
    <>
      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transition-transform duration-200 ease-out flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50 px-4">
          <SupplyGoLogo variant="colored" size={32} showText />
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-white/70 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
          {visibleGroups.map(group => {
            const accent = ACCENTS[group.accent]
            const isOpen = openGroups[group.group] ?? true

            return (
              <div key={group.group}>
                <button
                  onClick={() => toggleGroup(group.group)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {group.group}
                  {isOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>

                {isOpen && (
                  <div className="mt-0.5 space-y-0.5">
                    {group.items.map(item => {
                      const active = isActive(item.href)
                      const Icon = item.icon
                      return (
                        <Link
                          key={item.href}
                          to={item.soon ? '#' : item.href}
                          className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all active:scale-[0.98] ${
                            active ? `${accent.activeBg} ${accent.activeText}` : `text-gray-600 ${accent.hover}`
                          } ${item.soon ? 'opacity-50 pointer-events-none' : ''}`}
                        >
                          {active && (
                            <span className={`absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full ${accent.activeBar}`} />
                          )}
                          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent.chip}`}>
                            <Icon size={16} className={accent.icon} />
                          </span>
                          <span className="flex-1">{item.name}</span>
                          {item.soon && (
                            <span className="text-[9px] font-semibold text-blue-500 bg-blue-50 rounded px-1.5 py-0.5">
                              SOON
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-100 p-3 space-y-1">
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-3 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
              <User size={16} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-gray-800">{profile?.nome ?? '—'}</p>
              <p className="truncate text-xs text-gray-400">{profile?.role}</p>
            </div>
          </div>
          <button
            onClick={() => { signOut(); onClose() }}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors active:scale-[0.98]"
          >
            <LogOut size={16} />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
