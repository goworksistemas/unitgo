import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ChevronDown, LogOut, User } from 'lucide-react'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { NAV_GROUPS, ACCENTS } from './nav'

interface AppMobileDrawerProps {
  open: boolean
  onClose: () => void
}

export function AppMobileDrawer({ open, onClose }: AppMobileDrawerProps) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const { theme } = useTheme()

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(
    () => Object.fromEntries(NAV_GROUPS.map(g => [g.group, true]))
  )

  useEffect(() => { onClose() }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function toggleGroup(name: string) {
    setOpenGroups(prev => ({ ...prev, [name]: !prev[name] }))
  }

  function isActive(href: string) {
    return href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)
  }

  return (
    <>
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <aside
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 shadow-2xl transition-transform duration-200 ease-out flex flex-col ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 px-3">
          <SupplyGoLogo variant={theme === 'dark' ? 'light' : 'colored'} size={24} showText />
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white/70 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 py-3">
          {NAV_GROUPS.map(group => {
            const accent         = ACCENTS[group.accent]
            const isOpen         = openGroups[group.group] ?? true
            const groupHasActive = group.items.some(i => isActive(i.href))
            const GroupIcon      = group.icon

            return (
              <div key={group.group}>
                <button
                  type="button"
                  onClick={() => toggleGroup(group.group)}
                  className={`group/section flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition-all ${
                    groupHasActive
                      ? 'bg-gray-50/80 dark:bg-gray-800/80'
                      : 'hover:bg-gray-50/90 dark:hover:bg-gray-800/60'
                  }`}
                  aria-expanded={isOpen}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {GroupIcon && (
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-transform group-hover/section:scale-105 ${accent.chip} `}>
                        <GroupIcon className={`h-3.5 w-3.5 ${accent.icon}`} aria-hidden />
                      </span>
                    )}
                    <span className={`truncate text-[11px] font-semibold uppercase tracking-wider ${
                      groupHasActive ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      {group.group}
                    </span>
                  </div>
                  <ChevronDown
                    className={`h-3 w-3 shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    aria-hidden
                  />
                </button>

                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-2">
                    {group.items.map((item, idx) => {
                      const active = isActive(item.href)
                      const Icon   = item.icon
                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          className={`group/item relative flex min-h-9 animate-flyout-item-enter items-center rounded-lg pl-3 pr-2 py-1.5 text-sm font-medium transition-all active:scale-[0.98] ${
                            active
                              ? `${accent.activeBg} ${accent.activeText}`
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                          }`}
                          style={{ animationDelay: `${Math.min(idx, 12) * 22}ms` }}
                        >
                          {active && (
                            <span
                              className={`pointer-events-none absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${accent.activeBar}`}
                              aria-hidden
                            />
                          )}
                          <Icon className="w-4 h-4 mr-2 shrink-0" />
                          <span className="flex-1 truncate">{item.name}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Bottom */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 py-1.5 px-2">
          <Link to="/perfil" className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-white/60 dark:hover:bg-white/5 transition-colors">
            <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden shadow-sm">
              <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{profile?.nome ?? '—'}</p>
              <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </Link>
          <button
            onClick={() => { signOut(); onClose() }}
            className="flex w-full h-9 items-center gap-2 rounded-lg px-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors active:scale-[0.98]"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sair
          </button>
        </div>
      </aside>
    </>
  )
}
