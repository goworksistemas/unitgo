import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronLeft, ChevronRight, LogOut, User } from 'lucide-react'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { useAuth } from '@/contexts/AuthContext'
import { NAV_GROUPS, ACCENTS, type NavGroup } from './nav'

const STORAGE_KEY = 'supplygo-sidebar-expanded'

interface AppSidebarProps {
  onExpandedChange?: (expanded: boolean) => void
}

export function AppSidebar({ onExpandedChange }: AppSidebarProps) {
  const location = useLocation()
  const { profile, signOut } = useAuth()
  const isAdmin = profile?.role === 'admin'

  const [expanded, setExpanded] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false' } catch { return true }
  })
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, String(expanded)) } catch { /* noop */ }
    onExpandedChange?.(expanded)
  }, [expanded, onExpandedChange])

  const visibleGroups = NAV_GROUPS.filter(g => !g.adminOnly || isAdmin)

  function isActive(href: string) {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  function handleMouseEnterGroup(groupName: string) {
    if (expanded) return
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredGroup(groupName)
  }

  function handleMouseLeaveGroup() {
    if (expanded) return
    hoverTimerRef.current = setTimeout(() => setHoveredGroup(null), 150)
  }

  return (
    <aside
      className={`hidden lg:flex flex-col fixed inset-y-0 left-0 z-50 border-r border-gray-200 bg-white transition-[width] duration-200 ease-out ${
        expanded ? 'w-64' : 'w-[68px]'
      }`}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-gray-100 bg-gradient-to-r from-blue-50 to-teal-50 px-3">
        {expanded ? (
          <SupplyGoLogo variant="colored" size={34} showText />
        ) : (
          <SupplyGoLogo variant="colored" size={34} />
        )}
        <button
          onClick={() => setExpanded(v => !v)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:bg-white/70 hover:text-gray-700 transition-colors"
          aria-label={expanded ? 'Recolher menu' : 'Expandir menu'}
        >
          {expanded ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-4">
        {visibleGroups.map(group => (
          <NavGroupSection
            key={group.group}
            group={group}
            expanded={expanded}
            isActive={isActive}
            isHovered={hoveredGroup === group.group}
            onMouseEnter={() => handleMouseEnterGroup(group.group)}
            onMouseLeave={handleMouseLeaveGroup}
            onFlyoutEnter={() => {
              if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
            }}
            onFlyoutLeave={handleMouseLeaveGroup}
          />
        ))}
      </nav>

      {/* Footer — perfil */}
      <div className="shrink-0 border-t border-gray-100 p-2 space-y-1">
        <div className={`flex items-center gap-2 rounded-lg px-2 py-2 ${expanded ? '' : 'justify-center'}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-700">
            <User size={15} />
          </div>
          {expanded && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-800">{profile?.nome ?? '—'}</p>
              <p className="truncate text-[10px] text-gray-400">{profile?.role}</p>
            </div>
          )}
        </div>
        <button
          onClick={signOut}
          className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors ${
            expanded ? '' : 'justify-center'
          }`}
        >
          <LogOut size={15} />
          {expanded && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

function NavGroupSection({
  group, expanded, isActive, isHovered,
  onMouseEnter, onMouseLeave, onFlyoutEnter, onFlyoutLeave,
}: {
  group: NavGroup
  expanded: boolean
  isActive: (href: string) => boolean
  isHovered: boolean
  onMouseEnter: () => void
  onMouseLeave: () => void
  onFlyoutEnter: () => void
  onFlyoutLeave: () => void
}) {
  const accent = ACCENTS[group.accent]

  return (
    <div>
      {expanded && (
        <p className="mb-1 px-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          {group.group}
        </p>
      )}
      <div className="space-y-0.5">
        {group.items.map(item => {
          const active = isActive(item.href)
          const Icon = item.icon

          if (!expanded) {
            return (
              <div
                key={item.href}
                className="relative"
                onMouseEnter={onMouseEnter}
                onMouseLeave={onMouseLeave}
              >
                <Link
                  to={item.soon ? '#' : item.href}
                  aria-disabled={item.soon}
                  className={`flex h-10 w-full items-center justify-center rounded-lg transition-colors ${
                    active ? `${accent.activeBg} ${accent.icon}` : `text-gray-500 ${accent.hover}`
                  } ${item.soon ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Icon size={18} />
                </Link>

                {/* Flyout tooltip para sidebar colapsada */}
                {isHovered && (
                  <div
                    className="absolute left-[56px] top-0 z-[60] animate-in fade-in slide-in-from-left-2 duration-150"
                    onMouseEnter={onFlyoutEnter}
                    onMouseLeave={onFlyoutLeave}
                  >
                    <div className="rounded-xl border border-gray-100 bg-white shadow-xl shadow-black/10 py-1 min-w-[180px]">
                      <p className="px-3 pt-1 pb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        {group.group}
                      </p>
                      {group.items.map(fi => {
                        const FIcon = fi.icon
                        const fActive = isActive(fi.href)
                        const fAccent = ACCENTS[group.accent]
                        return (
                          <Link
                            key={fi.href}
                            to={fi.soon ? '#' : fi.href}
                            className={`flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                              fActive ? `${fAccent.activeBg} ${fAccent.activeText}` : `text-gray-700 ${fAccent.hover}`
                            } ${fi.soon ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                          >
                            <FIcon size={14} />
                            {fi.name}
                            {fi.soon && (
                              <span className="ml-auto text-[9px] font-semibold text-blue-500 bg-blue-50 rounded px-1">
                                SOON
                              </span>
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          }

          return (
            <Link
              key={item.href}
              to={item.soon ? '#' : item.href}
              aria-disabled={item.soon}
              className={`relative flex items-center gap-2.5 rounded-lg py-2 pl-3 pr-2 text-sm transition-all hover:translate-x-0.5 ${
                active ? `${accent.activeBg} ${accent.activeText}` : `text-gray-600 hover:text-gray-900 ${accent.hover}`
              } ${item.soon ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
            >
              {active && (
                <span className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${accent.activeBar}`} />
              )}
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accent.chip}`}>
                <Icon size={15} className={accent.icon} />
              </span>
              <span className="truncate">{item.name}</span>
              {item.soon && (
                <span className="ml-auto text-[9px] font-semibold text-blue-500 bg-blue-50 rounded px-1 py-0.5">
                  SOON
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
