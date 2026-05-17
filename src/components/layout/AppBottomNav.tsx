import { Link, useLocation } from 'react-router-dom'
import { MOBILE_TABS } from './nav'

export function AppBottomNav() {
  const location = useLocation()

  function isActive(href: string) {
    if (href === '/') return location.pathname === '/'
    return location.pathname.startsWith(href)
  }

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white/95 backdrop-blur-md">
      <div className="grid h-16 grid-cols-4">
        {MOBILE_TABS.map(tab => {
          const active = isActive(tab.href)
          const Icon = tab.icon
          return (
            <Link
              key={tab.href}
              to={tab.href}
              className={`flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-all active:scale-95 ${
                active ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
              <span>{tab.name}</span>
            </Link>
          )
        })}
      </div>
      {/* Safe area para notch */}
      <div className="h-safe-area-inset-bottom bg-white/95" />
    </nav>
  )
}
