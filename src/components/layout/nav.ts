import { LayoutDashboard, Users, type LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  group: string
  accent: AccentKey
  items: NavItem[]
}

export type AccentKey = 'blue' | 'slate'

export const ACCENTS: Record<AccentKey, {
  chip: string
  icon: string
  activeBg: string
  activeText: string
  activeBar: string
  hover: string
}> = {
  blue: {
    chip: 'bg-blue-100',
    icon: 'text-blue-600',
    activeBg: 'bg-blue-50',
    activeText: 'text-blue-700 font-semibold',
    activeBar: 'bg-blue-600',
    hover: 'hover:bg-blue-50/60',
  },
  slate: {
    chip: 'bg-slate-100',
    icon: 'text-slate-600',
    activeBg: 'bg-slate-100',
    activeText: 'text-slate-800 font-semibold',
    activeBar: 'bg-slate-600',
    hover: 'hover:bg-slate-50',
  },
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'PRINCIPAL',
    accent: 'blue',
    items: [
      { name: 'Início', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    group: 'ADMIN',
    accent: 'slate',
    items: [
      { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    ],
  },
]

export const MOBILE_TABS: NavItem[] = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Usuários', href: '/admin/usuarios', icon: Users },
]
