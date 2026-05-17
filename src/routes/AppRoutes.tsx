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

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/auth/login"           element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/auth/criar-conta"     element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/auth/esqueci-senha"   element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />
      <Route path="/auth/redefinir-senha" element={<ResetPasswordPage />} />

      {/* Privadas */}
      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route path="/"               element={<DashboardPage />} />
        <Route path="/admin/usuarios" element={<UsuariosPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
