import { useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { NAV_GROUPS, ACCENTS } from './nav'

const STORAGE_KEY = 'supplygo-sidebar-expanded'
const GROUPS_KEY  = 'supplygo-sidebar-groups'

interface AppSidebarProps {
  onExpandedChange?: (expanded: boolean) => void
}

interface FlyoutState {
  group: string
  top: number
}

export function AppSidebar({ onExpandedChange }: AppSidebarProps) {
  const location  = useLocation()
  const navigate  = useNavigate()
  const { profile, signOut } = useAuth()
  const { theme } = useTheme()

  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false' } catch { return true }
  })

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(GROUPS_KEY)
      if (saved) return JSON.parse(saved)
    } catch { /* noop */ }
    return Object.fromEntries(NAV_GROUPS.map(g => [g.group, true]))
  })

  const [flyout, setFlyout] = useState<FlyoutState | null>(null)
  const flyoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function toggleSidebar() {
    setFlyout(null)
    setExpanded(v => {
      const next = !v
      try { localStorage.setItem(STORAGE_KEY, String(next)) } catch { /* noop */ }
      onExpandedChange?.(next)
      return next
    })
  }

  function toggleGroup(name: string) {
    setExpandedGroups(prev => {
      const next = { ...prev, [name]: !prev[name] }
      try { localStorage.setItem(GROUPS_KEY, JSON.stringify(next)) } catch { /* noop */ }
      return next
    })
  }

  function isActive(href: string) {
    return href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)
  }

  const showFlyout = useCallback((name: string, el: HTMLElement) => {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current)
    const rect = el.getBoundingClientRect()
    setFlyout({ group: name, top: rect.top })
  }, [])

  const hideFlyout = useCallback(() => {
    flyoutTimer.current = setTimeout(() => setFlyout(null), 120)
  }, [])

  const keepFlyout = useCallback(() => {
    if (flyoutTimer.current) clearTimeout(flyoutTimer.current)
  }, [])

  const flyoutGroup = flyout ? NAV_GROUPS.find(g => g.group === flyout.group) : null
  const logoVariant = theme === 'dark' ? 'light' : 'colored'

  return (
    <>
      <aside
        className={`hidden lg:fixed lg:flex top-0 left-0 h-screen flex-col shadow-lg z-50 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-[width] duration-200 ease-out ${
          expanded ? 'w-56' : 'w-14'
        }`}
        aria-label="Menu principal"
      >
        {/* Header logo */}
        <div className="relative flex h-12 shrink-0 items-center border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 px-3">
          <Link to="/" className={`flex min-w-0 items-center overflow-hidden ${expanded ? 'flex-1 justify-start' : 'w-full justify-center'}`} title="Início">
            {expanded ? (
              <SupplyGoLogo variant={logoVariant} size={26} showText />
            ) : (
              <SupplyGoLogo variant="colored" size={26} />
            )}
          </Link>
          <button
            onClick={toggleSidebar}
            className="absolute -bottom-3 -right-3 hidden lg:flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-800 dark:hover:text-gray-200 transition-all z-[51]"
            aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
          >
            {expanded ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          </button>
        </div>

        {expanded ? (
          /* ── EXPANDED ── */
          <nav className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden px-2 py-3">
            {NAV_GROUPS.map(group => {
              const accent         = ACCENTS[group.accent]
              const isOpen         = !!expandedGroups[group.group]
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
                            className={`group/item relative flex min-h-9 animate-flyout-item-enter items-center rounded-lg pl-3 pr-2 py-1.5 text-sm font-medium transition-all hover:translate-x-0.5 ${
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
        ) : (
          /* ── COLLAPSED ── icon-only, flyout via portal */
          <nav className="flex min-h-0 flex-1 flex-col gap-1 py-2 px-1">
            {NAV_GROUPS.map(group => {
              const accent    = ACCENTS[group.accent]
              const firstItem = group.items[0]
              const hasActive = group.items.some(i => isActive(i.href))
              const IconToUse = group.icon ?? firstItem?.icon

              return (
                <div
                  key={group.group}
                  className="relative"
                  onMouseEnter={e => showFlyout(group.group, e.currentTarget)}
                  onMouseLeave={hideFlyout}
                >
                  {hasActive && (
                    <span
                      className={`pointer-events-none absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full ${accent.activeBar}`}
                      aria-hidden
                    />
                  )}
                  <div
                    onClick={() => firstItem && navigate(firstItem.href)}
                    className={`flex h-10 w-full items-center justify-center rounded-lg transition-colors cursor-pointer ${
                      hasActive
                        ? `${accent.activeBg} ${accent.icon} `
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {IconToUse && <IconToUse className="w-4 h-4" />}
                  </div>
                </div>
              )
            })}
          </nav>
        )}

        {/* Bottom */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-800 bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900 py-1.5 px-1">
          <div className="flex w-full flex-col gap-0.5">
            <Link
              to="/perfil"
              className={`flex w-full h-10 rounded-lg items-center transition-colors hover:bg-white/60 dark:hover:bg-white/5 ${expanded ? 'justify-start gap-2 px-2' : 'justify-center'}`}
            >
              <div className="w-7 h-7 shrink-0 rounded-full overflow-hidden shadow-sm">
                <div className="w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              </div>
              {expanded && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">{profile?.nome ?? '—'}</p>
                  <p className="truncate text-[10px] text-gray-400 dark:text-gray-500 capitalize">{profile?.role}</p>
                </div>
              )}
            </Link>

            <button
              onClick={signOut}
              className={`flex w-full h-10 rounded-lg items-center transition-colors text-gray-500 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 ${
                expanded ? 'justify-start gap-2 px-2' : 'justify-center'
              }`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {expanded && <span className="text-sm font-medium">Sair</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Flyout portal */}
      {!expanded && flyoutGroup && flyout && createPortal(
        <div
          className="fixed z-[200]"
          style={{ left: 56, top: flyout.top }}
          onMouseEnter={keepFlyout}
          onMouseLeave={hideFlyout}
        >
          <div
            className="ml-1 rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl py-1 min-w-[180px]"
            style={{ animation: 'flyout-item-enter 0.15s ease both' }}
          >
            <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {flyoutGroup.group}
            </p>
            {flyoutGroup.items.map(fi => {
              const FIcon   = fi.icon
              const fActive = isActive(fi.href)
              const fa      = ACCENTS[flyoutGroup.accent]
              return (
                <Link
                  key={fi.href}
                  to={fi.href}
                  className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    fActive
                      ? `${fa.activeBg} ${fa.activeText}`
                      : `text-gray-700 dark:text-gray-300 ${fa.hover} dark:hover:bg-gray-800`
                  }`}
                  onClick={() => setFlyout(null)}
                >
                  <FIcon className="w-4 h-4 shrink-0" />
                  {fi.name}
                </Link>
              )
            })}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
