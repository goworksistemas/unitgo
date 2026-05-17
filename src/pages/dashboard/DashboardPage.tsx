import { useAuth } from '@/contexts/AuthContext'

export function DashboardPage() {
  const { profile } = useAuth()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-3xl font-semibold text-gray-900">
        {saudacao}, {profile?.nome?.split(' ')[0] ?? 'usuário'} 👋
      </h1>
      <p className="mt-2 text-gray-500">
        Bem-vindo ao SupplyGo.
      </p>
    </div>
  )
}
