import { LayoutDashboard, Users, ShieldCheck, BookOpen, Package, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavSubgroup {
  subgroup: string
  icon?: LucideIcon
  items: NavItem[]
}

export interface NavGroup {
  group: string
  accent: AccentKey
  icon?: LucideIcon
  items: NavItem[]
  subgroups?: NavSubgroup[]
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
    chip: 'bg-blue-100 dark:bg-blue-900/40',
    icon: 'text-blue-600 dark:text-blue-400',
    activeBg: 'bg-blue-50 dark:bg-blue-900/30',
    activeText: 'text-blue-700 dark:text-blue-300 font-semibold',
    activeBar: 'bg-blue-600 dark:bg-blue-400',
    hover: 'hover:bg-blue-50/60 dark:hover:bg-blue-900/20',
  },
  slate: {
    chip: 'bg-slate-100 dark:bg-slate-700/50',
    icon: 'text-slate-600 dark:text-slate-400',
    activeBg: 'bg-slate-100 dark:bg-slate-700/50',
    activeText: 'text-slate-800 dark:text-slate-200 font-semibold',
    activeBar: 'bg-slate-600 dark:bg-slate-400',
    hover: 'hover:bg-slate-50 dark:hover:bg-slate-800/60',
  },
}

export const NAV_GROUPS: NavGroup[] = [
  {
    group: 'Principal',
    accent: 'blue',
    icon: LayoutDashboard,
    items: [
      { name: 'Início', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    group: 'Admin',
    accent: 'slate',
    icon: ShieldCheck,
    items: [
      { name: 'Usuários', href: '/admin/usuarios', icon: Users },
    ],
    subgroups: [
      {
        subgroup: 'Cadastros',
        icon: BookOpen,
        items: [
          { name: 'Produtos',           href: '/cadastros/produtos',         icon: Package },
          { name: 'Unidades de medida', href: '/cadastros/unidades-medida',  icon: Scale   },
        ],
      },
    ],
  },
]

export const MOBILE_TABS: NavItem[] = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Usuários', href: '/admin/usuarios', icon: Users },
]
