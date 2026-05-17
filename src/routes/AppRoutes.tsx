import { type ReactElement } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/layouts/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsuariosPage } from '@/pages/admin/UsuariosPage'

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/auth/login" replace />
  return children
}

function PublicRoute({ children }: { children: ReactElement }) {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) return <Navigate to="/" replace />
  return children
}

// Placeholder para módulos em construção
function EmConstrucao({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="rounded-2xl bg-blue-50 p-6 mb-4">
        <span className="text-4xl">🚧</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
      <p className="mt-1 text-sm text-gray-500">Este módulo está em construção.</p>
    </div>
  )
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/auth/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/auth/criar-conta"     element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/auth/esqueci-senha"   element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/auth/redefinir-senha" element={<ResetPasswordPage />} />

      {/* Privadas com AppLayout */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />

        {/* Compras */}
        <Route path="/compras/solicitacoes" element={<EmConstrucao titulo="Solicitações de Compra" />} />
        <Route path="/compras/cotacoes"     element={<EmConstrucao titulo="Cotações" />} />
        <Route path="/compras/pedidos"      element={<EmConstrucao titulo="Pedidos de Compra" />} />
        <Route path="/compras/aprovacoes"   element={<EmConstrucao titulo="Aprovações" />} />
        <Route path="/compras/notas-fiscais" element={<EmConstrucao titulo="Notas Fiscais" />} />
        <Route path="/compras/recebimentos" element={<EmConstrucao titulo="Recebimentos" />} />

        {/* Estoque */}
        <Route path="/estoque/saldos"        element={<EmConstrucao titulo="Saldos em Estoque" />} />
        <Route path="/estoque/movimentacoes" element={<EmConstrucao titulo="Movimentações" />} />

        {/* Cadastros */}
        <Route path="/cadastros/fornecedores"       element={<EmConstrucao titulo="Fornecedores" />} />
        <Route path="/cadastros/itens"              element={<EmConstrucao titulo="Itens" />} />
        <Route path="/cadastros/unidades-medida"    element={<EmConstrucao titulo="Unidades de Medida" />} />
        <Route path="/cadastros/formas-pagamento"   element={<EmConstrucao titulo="Formas de Pagamento" />} />
        <Route path="/cadastros/condicoes-pagamento" element={<EmConstrucao titulo="Condições de Pagamento" />} />

        {/* Admin */}
        <Route path="/admin/usuarios" element={<UsuariosPage />} />
        <Route path="/admin/unidades" element={<EmConstrucao titulo="Unidades de Negócio" />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
