import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!user) return <Navigate to="/auth/login" replace />

  return children
}

function PublicRoute({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user) return <Navigate to="/" replace />

  return children
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/auth/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/auth/criar-conta"     element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/auth/esqueci-senha"   element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/auth/redefinir-senha" element={<ResetPasswordPage />} />

      {/* Privadas — dashboard e módulos virão aqui */}
      <Route path="/" element={<ProtectedRoute><PlaceholderDashboard /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function PlaceholderDashboard() {
  const { profile, signOut } = useAuth()
  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-gray-700">
      <p className="text-lg font-medium">Olá, {profile?.nome ?? 'usuário'} 👋</p>
      <p className="text-sm text-gray-500">Dashboard em construção.</p>
      <button onClick={signOut} className="text-sm text-red-500 hover:underline">Sair</button>
    </div>
  )
}
