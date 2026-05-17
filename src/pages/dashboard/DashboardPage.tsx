import { ShoppingCart, FileText, CheckCircle2, PackageCheck, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

const CARDS = [
  {
    label: 'Solicitações abertas',
    value: '—',
    icon: FileText,
    color: 'teal',
    href: '/compras/solicitacoes',
  },
  {
    label: 'Pedidos em andamento',
    value: '—',
    icon: ShoppingCart,
    color: 'blue',
    href: '/compras/pedidos',
  },
  {
    label: 'Aguardando aprovação',
    value: '—',
    icon: CheckCircle2,
    color: 'amber',
    href: '/compras/aprovacoes',
  },
  {
    label: 'Recebimentos pendentes',
    value: '—',
    icon: PackageCheck,
    color: 'indigo',
    href: '/compras/recebimentos',
  },
]

const COLOR_MAP: Record<string, { bg: string; icon: string; text: string }> = {
  teal:   { bg: 'bg-teal-50',   icon: 'text-teal-600',   text: 'text-teal-700' },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   text: 'text-blue-700' },
  amber:  { bg: 'bg-amber-50',  icon: 'text-amber-600',  text: 'text-amber-700' },
  indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', text: 'text-indigo-700' },
}

export function DashboardPage() {
  const { profile } = useAuth()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="space-y-8">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          {saudacao}, {profile?.nome?.split(' ')[0] ?? 'usuário'} 👋
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Aqui está um resumo do que está acontecendo em compras hoje.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map(card => {
          const colors = COLOR_MAP[card.color]
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              to={card.href}
              className="group flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg}`}>
                  <Icon size={20} className={colors.icon} />
                </div>
                <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                <p className="mt-0.5 text-xs text-gray-500">{card.label}</p>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Pipeline de compras */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Pipeline de Compras</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {['Solicitação', 'Cotação', 'Pedido', 'Aprovação', 'NF', 'Recebimento', 'Estoque'].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex h-8 items-center rounded-full bg-blue-50 px-3 text-xs font-medium text-blue-700">
                {i + 1}. {step}
              </div>
              {i < arr.length - 1 && (
                <ArrowRight size={14} className="text-gray-300 shrink-0" />
              )}
            </div>
          ))}
        </div>
        <p className="mt-4 text-xs text-gray-400">
          Os módulos serão habilitados conforme o sistema for construído.
        </p>
      </div>
    </div>
  )
}
