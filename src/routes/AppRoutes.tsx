import { type ReactElement } from 'react'
import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { AppLayout } from '@/layouts/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '@/pages/auth/ResetPasswordPage'
import { DashboardPage } from '@/pages/dashboard/DashboardPage'
import { UsuariosPage } from '@/pages/admin/UsuariosPage'
import { PerfilPage } from '@/pages/perfil/PerfilPage'
import { ProdutosPage } from '@/pages/cadastros/ProdutosPage'
import { UnidadesMedidaPage } from '@/pages/cadastros/UnidadesMedidaPage'
import { EmpresasPage } from '@/pages/cadastros/EmpresasPage'
import { DepartamentosPage } from '@/pages/cadastros/DepartamentosPage'
import { AlcadasAprovacaoPage } from '@/pages/cadastros/AlcadasAprovacaoPage'
import { SolicitacoesPage } from '@/pages/compras/SolicitacoesPage'
import { SolicitacaoFormPage } from '@/pages/compras/SolicitacaoFormPage'
import { SolicitacaoDetalhePage } from '@/pages/compras/SolicitacaoDetalhePage'
import { FornecedoresPage } from '@/pages/compras/FornecedoresPage'
import { CotacoesPage } from '@/pages/compras/CotacoesPage'
import { CotacaoFormPage } from '@/pages/compras/CotacaoFormPage'
import { CotacaoDetalhePage } from '@/pages/compras/CotacaoDetalhePage'
import { PedidosPage } from '@/pages/compras/PedidosPage'
import { PedidoDetalhePage } from '@/pages/compras/PedidoDetalhePage'
import { RecebimentosPage } from '@/pages/compras/RecebimentosPage'
import { RecebimentoFormPage } from '@/pages/compras/RecebimentoFormPage'
import { PedidoDiretoFormPage } from '@/pages/compras/PedidoDiretoFormPage'

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

function RedirectProcessoParaSC() {
  const { id } = useParams<{ id: string }>()
  return <Navigate to={`/compras/solicitacoes/${id}`} replace />
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
        <Route path="/perfil"         element={<PerfilPage />} />
        <Route path="/cadastros/produtos"            element={<ProdutosPage />} />
        <Route path="/cadastros/unidades-medida"     element={<UnidadesMedidaPage />} />
        <Route path="/cadastros/empresas"            element={<EmpresasPage />} />
        <Route path="/cadastros/departamentos"       element={<DepartamentosPage />} />
        <Route path="/cadastros/alcadas-aprovacao"   element={<AlcadasAprovacaoPage />} />

        <Route path="/compras/solicitacoes"             element={<SolicitacoesPage />} />
        <Route path="/compras/solicitacoes/nova"        element={<SolicitacaoFormPage />} />
        <Route path="/compras/solicitacoes/:id"         element={<SolicitacaoDetalhePage />} />

        <Route path="/compras/fornecedores"             element={<FornecedoresPage />} />

        <Route path="/compras/cotacoes"                 element={<CotacoesPage />} />
        <Route path="/compras/cotacoes/nova"            element={<CotacaoFormPage />} />
        <Route path="/compras/cotacoes/:id"             element={<CotacaoDetalhePage />} />

        <Route path="/compras/pedidos"                  element={<PedidosPage />} />
        <Route path="/compras/pedidos/novo"             element={<PedidoDiretoFormPage />} />
        <Route path="/compras/pedidos/:id"              element={<PedidoDetalhePage />} />

        {/* Compatibilidade: redireciona /compras/processo/:id -> /compras/solicitacoes/:id */}
        <Route path="/compras/processo/:id"             element={<RedirectProcessoParaSC />} />

        <Route path="/compras/recebimentos"             element={<RecebimentosPage />} />
        <Route path="/compras/recebimentos/novo"        element={<RecebimentoFormPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
