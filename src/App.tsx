/**
 * App raiz — providers + roteamento.
 *
 * Estrutura:
 *  ThemeProvider
 *    BrowserRouter
 *      AuthProvider
 *        PerfilProvider
 *          Routes:
 *            /login, /signup, /reset-password (publicas)
 *            /* protegidas com AppLayout:
 *               /            -> redireciona para /dashboards
 *               /dashboards  -> Visao Geral (KPIs + atalhos por modulo)
 *               <demais>     -> telas reais por modulo
 */
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { PerfilProvider } from '@/contexts/PerfilContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { LoginPage } from '@/components/auth/LoginPage';
import { SignupPage } from '@/components/auth/SignupPage';
import { ResetPasswordPage } from '@/components/auth/ResetPasswordPage';
import { AppLayout } from '@/components/layout/AppLayout';

// Dashboards
import { VisaoGeralPage } from '@/pages/dashboards/VisaoGeralPage';
import { EstoquesAbaixoMinimoPage } from '@/pages/dashboards/EstoquesAbaixoMinimoPage';
import { EmprestimosAtrasadosPage } from '@/pages/dashboards/EmprestimosAtrasadosPage';
import { ContratosVencendoPage } from '@/pages/dashboards/ContratosVencendoPage';
import { PedidosAguardandoPage } from '@/pages/dashboards/PedidosAguardandoPage';
import { TempoEtapasPage } from '@/pages/dashboards/TempoEtapasPage';

// Admin
import { UsuariosPage } from '@/pages/admin/UsuariosPage';
import { UnidadesPage } from '@/pages/admin/UnidadesPage';
import { DepartamentosPage } from '@/pages/admin/DepartamentosPage';
import { EmpresasEmitentesPage } from '@/pages/admin/EmpresasEmitentesPage';
import { PerfisAcessoPage } from '@/pages/admin/PerfisAcessoPage';
import { RotasSistemaPage } from '@/pages/admin/RotasSistemaPage';
import { AlcadasAprovacaoPage } from '@/pages/admin/AlcadasAprovacaoPage';

// Cadastros
import { MoedasPage } from '@/pages/cadastros/MoedasPage';
import { CategoriasPage } from '@/pages/cadastros/CategoriasPage';
import { ItensPage } from '@/pages/cadastros/ItensPage';
import { FornecedoresPage } from '@/pages/cadastros/FornecedoresPage';
import { CategoriasFornecedorPage } from '@/pages/cadastros/CategoriasFornecedorPage';
import { UnidadesMedidaPage } from '@/pages/cadastros/UnidadesMedidaPage';
import { FormasPagamentoPage } from '@/pages/cadastros/FormasPagamentoPage';
import { CondicoesPagamentoPage } from '@/pages/cadastros/CondicoesPagamentoPage';

// Estoque
import { SaldosPage } from '@/pages/estoque/SaldosPage';
import { MovimentacoesPage } from '@/pages/estoque/MovimentacoesPage';

// Solicitacoes operacionais
import { MaterialPage } from '@/pages/solicitacoes/MaterialPage';
import { MovelPage } from '@/pages/solicitacoes/MovelPage';
import { RetiradaMovelPage } from '@/pages/solicitacoes/RetiradaMovelPage';
import { EmprestimoPage } from '@/pages/solicitacoes/EmprestimoPage';
import { AprovacaoGestorPage } from '@/pages/solicitacoes/AprovacaoGestorPage';

// Entregas
import { LotesPage } from '@/pages/entregas/LotesPage';
import { RecepcaoPage } from '@/pages/entregas/RecepcaoPage';
import { ConferenciaPage } from '@/pages/entregas/ConferenciaPage';

// Compras
import { SolicitacoesCompraPage } from '@/pages/compras/SolicitacoesCompraPage';
import { CotacoesPage } from '@/pages/compras/CotacoesPage';
import { PedidosCompraPage } from '@/pages/compras/PedidosCompraPage';
import { AprovacaoDiretoriaPage } from '@/pages/compras/AprovacaoDiretoriaPage';
import { NotasFiscaisPage } from '@/pages/compras/NotasFiscaisPage';
import { ContratosPage } from '@/pages/compras/ContratosPage';
import { RecebimentosPage } from '@/pages/compras/RecebimentosPage';

// Auditoria
import { TimelinePage } from '@/pages/auditoria/TimelinePage';
import { NotificacoesPage } from '@/pages/auditoria/NotificacoesPage';

function ProtectedRoute() {
  const { sessao, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="border-primary/30 border-t-primary mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!sessao) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

function PublicOnlyRoute() {
  const { sessao, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary/30 border-t-primary h-12 w-12 animate-spin rounded-full border-4" />
      </div>
    );
  }

  if (sessao) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <PerfilProvider>
            <Routes>
              {/* Rotas publicas (somente para nao logados) */}
              <Route element={<PublicOnlyRoute />}>
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
              </Route>

              {/* Reset de senha — publica mas pode acontecer logado tambem */}
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              {/* Rotas protegidas */}
              <Route element={<ProtectedRoute />}>
                <Route element={<AppLayout />}>
                  {/* Raiz vai para a Visao Geral */}
                  <Route path="/" element={<Navigate to="/dashboards" replace />} />

                  {/* Dashboards */}
                  <Route path="/dashboards" element={<VisaoGeralPage />} />
                  <Route
                    path="/dashboards/estoques-abaixo-minimo"
                    element={<EstoquesAbaixoMinimoPage />}
                  />
                  <Route
                    path="/dashboards/emprestimos-atrasados"
                    element={<EmprestimosAtrasadosPage />}
                  />
                  <Route
                    path="/dashboards/contratos-vencendo"
                    element={<ContratosVencendoPage />}
                  />
                  <Route
                    path="/dashboards/pedidos-aguardando"
                    element={<PedidosAguardandoPage />}
                  />
                  <Route path="/dashboards/tempo-etapas" element={<TempoEtapasPage />} />

                  {/* Admin */}
                  <Route path="/admin/usuarios" element={<UsuariosPage />} />
                  <Route path="/admin/unidades" element={<UnidadesPage />} />
                  <Route path="/admin/departamentos" element={<DepartamentosPage />} />
                  <Route path="/admin/empresas-emitentes" element={<EmpresasEmitentesPage />} />
                  <Route path="/admin/perfis-acesso" element={<PerfisAcessoPage />} />
                  <Route path="/admin/rotas-sistema" element={<RotasSistemaPage />} />
                  <Route path="/admin/alcadas-aprovacao" element={<AlcadasAprovacaoPage />} />

                  {/* Cadastros */}
                  <Route path="/cadastros/moedas" element={<MoedasPage />} />
                  <Route path="/cadastros/categorias" element={<CategoriasPage />} />
                  <Route path="/cadastros/itens" element={<ItensPage />} />
                  <Route path="/cadastros/fornecedores" element={<FornecedoresPage />} />
                  <Route
                    path="/cadastros/categorias-fornecedor"
                    element={<CategoriasFornecedorPage />}
                  />
                  <Route path="/cadastros/unidades-medida" element={<UnidadesMedidaPage />} />
                  <Route path="/cadastros/formas-pagamento" element={<FormasPagamentoPage />} />
                  <Route
                    path="/cadastros/condicoes-pagamento"
                    element={<CondicoesPagamentoPage />}
                  />

                  {/* Estoque */}
                  <Route path="/estoque/saldos" element={<SaldosPage />} />
                  <Route path="/estoque/movimentacoes" element={<MovimentacoesPage />} />

                  {/* Solicitacoes */}
                  <Route path="/solicitacoes/material" element={<MaterialPage />} />
                  <Route path="/solicitacoes/movel" element={<MovelPage />} />
                  <Route path="/solicitacoes/retirada-movel" element={<RetiradaMovelPage />} />
                  <Route path="/solicitacoes/emprestimo" element={<EmprestimoPage />} />
                  <Route path="/solicitacoes/aprovacao-gestor" element={<AprovacaoGestorPage />} />

                  {/* Entregas */}
                  <Route path="/entregas/lotes" element={<LotesPage />} />
                  <Route path="/entregas/recepcao" element={<RecepcaoPage />} />
                  <Route path="/entregas/conferencia" element={<ConferenciaPage />} />

                  {/* Compras */}
                  <Route path="/compras/solicitacoes" element={<SolicitacoesCompraPage />} />
                  <Route path="/compras/cotacoes" element={<CotacoesPage />} />
                  <Route path="/compras/pedidos" element={<PedidosCompraPage />} />
                  <Route path="/compras/aprovacao-diretoria" element={<AprovacaoDiretoriaPage />} />
                  <Route path="/compras/notas-fiscais" element={<NotasFiscaisPage />} />
                  <Route path="/compras/contratos" element={<ContratosPage />} />
                  <Route path="/compras/recebimentos" element={<RecebimentosPage />} />

                  {/* Auditoria */}
                  <Route path="/auditoria/timeline" element={<TimelinePage />} />
                  <Route path="/auditoria/notificacoes" element={<NotificacoesPage />} />

                  {/* Catch-all */}
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
              </Route>
            </Routes>
          </PerfilProvider>
        </AuthProvider>
        <Toaster />
      </BrowserRouter>
    </ThemeProvider>
  );
}
