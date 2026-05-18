import {
  LayoutDashboard, Users, ShieldCheck, Package, Scale,
  ShoppingCart, FileText, Building2, Network, FileSearch, Truck, Receipt, Gavel,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface NavGroup {
  group: string
  accent: AccentKey
  icon?: LucideIcon
  items: NavItem[]
}

export type AccentKey = 'blue' | 'slate' | 'emerald'

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
  emerald: {
    chip: 'bg-emerald-100 dark:bg-emerald-900/40',
    icon: 'text-emerald-600 dark:text-emerald-400',
    activeBg: 'bg-emerald-50 dark:bg-emerald-900/30',
    activeText: 'text-emerald-700 dark:text-emerald-300 font-semibold',
    activeBar: 'bg-emerald-600 dark:bg-emerald-400',
    hover: 'hover:bg-emerald-50/60 dark:hover:bg-emerald-900/20',
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
    group: 'Compras',
    accent: 'emerald',
    icon: ShoppingCart,
    items: [
      { name: 'Solicitações', href: '/compras/solicitacoes', icon: FileText },
      { name: 'Cotações',     href: '/compras/cotacoes',     icon: FileSearch },
      { name: 'Pedidos',      href: '/compras/pedidos',      icon: ShoppingCart },
      { name: 'Recebimentos', href: '/compras/recebimentos', icon: Receipt },
      { name: 'Fornecedores', href: '/compras/fornecedores', icon: Truck },
    ],
  },
  {
    group: 'Admin',
    accent: 'slate',
    icon: ShieldCheck,
    items: [
      { name: 'Usuários',            href: '/admin/usuarios',                icon: Users     },
      { name: 'Empresas',            href: '/cadastros/empresas',            icon: Building2 },
      { name: 'Departamentos',       href: '/cadastros/departamentos',       icon: Network   },
      { name: 'Alçadas de aprovação',href: '/cadastros/alcadas-aprovacao',   icon: Gavel     },
      { name: 'Produtos',            href: '/cadastros/produtos',            icon: Package   },
      { name: 'Unidades de medida',  href: '/cadastros/unidades-medida',     icon: Scale     },
    ],
  },
]

export const MOBILE_TABS: NavItem[] = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Usuários', href: '/admin/usuarios', icon: Users },
]
