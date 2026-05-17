import {
  LayoutDashboard,
  FileText,
  SearchCheck,
  ShoppingCart,
  CheckCircle2,
  Receipt,
  PackageCheck,
  Boxes,
  ArrowLeftRight,
  Building2,
  Package,
  Ruler,
  CreditCard,
  Handshake,
  Users,
  Building,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  name: string
  href: string
  icon: LucideIcon
  soon?: boolean
  adminOnly?: boolean
}

export interface NavGroup {
  group: string
  accent: AccentKey
  adminOnly?: boolean
  items: NavItem[]
}

export type AccentKey = 'blue' | 'teal' | 'emerald' | 'indigo' | 'violet' | 'slate'

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
  teal: {
    chip: 'bg-teal-100',
    icon: 'text-teal-600',
    activeBg: 'bg-teal-50',
    activeText: 'text-teal-700 font-semibold',
    activeBar: 'bg-teal-600',
    hover: 'hover:bg-teal-50/60',
  },
  emerald: {
    chip: 'bg-emerald-100',
    icon: 'text-emerald-600',
    activeBg: 'bg-emerald-50',
    activeText: 'text-emerald-700 font-semibold',
    activeBar: 'bg-emerald-600',
    hover: 'hover:bg-emerald-50/60',
  },
  indigo: {
    chip: 'bg-indigo-100',
    icon: 'text-indigo-600',
    activeBg: 'bg-indigo-50',
    activeText: 'text-indigo-700 font-semibold',
    activeBar: 'bg-indigo-600',
    hover: 'hover:bg-indigo-50/60',
  },
  violet: {
    chip: 'bg-violet-100',
    icon: 'text-violet-600',
    activeBg: 'bg-violet-50',
    activeText: 'text-violet-700 font-semibold',
    activeBar: 'bg-violet-600',
    hover: 'hover:bg-violet-50/60',
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
      { name: 'Visão Geral', href: '/', icon: LayoutDashboard },
    ],
  },
  {
    group: 'COMPRAS',
    accent: 'teal',
    items: [
      { name: 'Solicitações', href: '/compras/solicitacoes', icon: FileText },
      { name: 'Cotações', href: '/compras/cotacoes', icon: SearchCheck },
      { name: 'Pedidos', href: '/compras/pedidos', icon: ShoppingCart },
      { name: 'Aprovações', href: '/compras/aprovacoes', icon: CheckCircle2 },
      { name: 'Notas Fiscais', href: '/compras/notas-fiscais', icon: Receipt },
      { name: 'Recebimentos', href: '/compras/recebimentos', icon: PackageCheck },
    ],
  },
  {
    group: 'ESTOQUE',
    accent: 'emerald',
    items: [
      { name: 'Saldos', href: '/estoque/saldos', icon: Boxes, soon: true },
      { name: 'Movimentações', href: '/estoque/movimentacoes', icon: ArrowLeftRight, soon: true },
    ],
  },
  {
    group: 'CADASTROS',
    accent: 'indigo',
    items: [
      { name: 'Fornecedores', href: '/cadastros/fornecedores', icon: Building2 },
      { name: 'Itens', href: '/cadastros/itens', icon: Package },
      { name: 'Unid. de Medida', href: '/cadastros/unidades-medida', icon: Ruler },
      { name: 'Formas de Pgto', href: '/cadastros/formas-pagamento', icon: CreditCard },
      { name: 'Condições de Pgto', href: '/cadastros/condicoes-pagamento', icon: Handshake },
    ],
  },
  {
    group: 'ADMIN',
    accent: 'slate',
    adminOnly: true,
    items: [
      { name: 'Usuários', href: '/admin/usuarios', icon: Users },
      { name: 'Unidades de Negócio', href: '/admin/unidades', icon: Building },
    ],
  },
]

export const MOBILE_TABS: NavItem[] = [
  { name: 'Início', href: '/', icon: LayoutDashboard },
  { name: 'Compras', href: '/compras/solicitacoes', icon: ShoppingCart },
  { name: 'Estoque', href: '/estoque/saldos', icon: Boxes },
  { name: 'Usuários', href: '/admin/usuarios', icon: Users },
]
