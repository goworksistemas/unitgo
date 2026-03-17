import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext';
import { PurchaseProvider } from './contexts/PurchaseContext';
import { AllowedTabsProvider } from './contexts/AllowedTabsProvider';
import { LoginPage } from './components/auth/LoginPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AppLayout } from './components/layout/AppLayout';
import { ControllerDashboard } from './components/dashboards/ControllerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { WarehouseDashboard } from './components/dashboards/WarehouseDashboard';
import { DriverDashboard } from './components/dashboards/DriverDashboard';
import { DesignerDashboard } from './components/dashboards/DesignerDashboard';
import { DeveloperDashboard } from './components/dashboards/DeveloperDashboard';
import { RequesterDashboard } from './components/dashboards/RequesterDashboard';
import { BuyerDashboard } from './components/dashboards/BuyerDashboard';
import { FinancialDashboard } from './components/dashboards/FinancialDashboard';
import { Toaster } from './components/ui/sonner';
import { projectId, publicAnonKey, functionSlug } from './utils/supabase/info';
import { useInactivityLogout } from './hooks/useInactivityLogout';
import { toast } from 'sonner';
import type { UserRole } from './types';

const THEME_STORAGE_KEY = 'gowork_theme';

export const ThemeContext = React.createContext<{
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}>({
  theme: 'dark',
  toggleTheme: () => {},
});

// Context para o Developer alternar entre views
export const DeveloperViewContext = React.createContext<{
  viewAsRole: UserRole | null;
  setViewAsRole: (role: UserRole | null) => void;
}>({
  viewAsRole: null,
  setViewAsRole: () => {},
});

function AppContent() {
  const { currentUser, logout, isLoading } = useApp();
  const [isInitializing, setIsInitializing] = useState(true);

  // Auto-logout após 1 hora de inatividade
  useInactivityLogout(
    () => {
      toast.warning('Você foi desconectado por inatividade (1 hora sem uso)', {
        duration: 5000,
      });
      logout();
    }, 
    !!currentUser,
    () => {
      toast.info('⚠️ Você será desconectado em 5 minutos por inatividade. Interaja com o sistema para continuar logado.', {
        duration: 8000,
      });
    }
  );

  // Initialize database on first load - não bloqueia o app
  useEffect(() => {
    const hasInitialized = localStorage.getItem('gowork_db_initialized');
    if (hasInitialized) {
      setIsInitializing(false);
      return;
    }

    // Rodar seed em background com timeout - não travar a tela
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    fetch(
      `https://${projectId}.supabase.co/functions/v1/${functionSlug}/seed`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        signal: controller.signal,
      }
    )
      .then((response) => {
        if (response.ok) {
          localStorage.setItem('gowork_db_initialized', 'true');
        } else {
          // 404 ou outro erro - marcar como inicializado para não ficar tentando
          localStorage.setItem('gowork_db_initialized', 'true');
        }
      })
      .catch(() => {
        // Timeout ou rede - marcar para não bloquear em próximas cargas
        localStorage.setItem('gowork_db_initialized', 'true');
      })
      .finally(() => {
        clearTimeout(timeoutId);
      });

    setIsInitializing(false);
  }, []);

  // Mostrar loading durante inicialização ou carregamento de dados
  if (isInitializing || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#3F76FF]/5 via-[#00C5E9]/5 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#3F76FF]/30 border-t-[#3F76FF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400">
            {isInitializing ? 'Inicializando sistema...' : 'Carregando dados...'}
          </p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  const renderDashboard = () => {
    // Motoristas têm interface simplificada
    if (currentUser.role === 'warehouse' && currentUser.warehouseType === 'delivery') {
      return <DriverDashboard />;
    }

    switch (currentUser.role) {
      case 'controller':
        return <ControllerDashboard />;
      case 'admin':
        return <AdminDashboard />;
      case 'warehouse':
        return <WarehouseDashboard />;
      case 'designer':
        return <DesignerDashboard />;
      case 'developer':
        return <DeveloperDashboard />;
      case 'requester':
        return <RequesterDashboard />;
      case 'buyer':
        return <BuyerDashboard />;
      case 'financial':
        return <FinancialDashboard />;
      default:
        return <div>Perfil não reconhecido</div>;
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      <AllowedTabsProvider>
        <PurchaseProvider>
          <AppLayout>
            {renderDashboard()}
          </AppLayout>
        </PurchaseProvider>
      </AllowedTabsProvider>
      <Toaster />
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as 'light' | 'dark' | null;
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    // CRITICAL: Capture hash before React Router processes it
    // This preserves Supabase auth tokens that come in the URL hash
    if (window.location.hash && window.location.pathname.includes('reset-password')) {
      sessionStorage.setItem('supabase_auth_hash', window.location.hash);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppProvider>
          <Routes>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<AppContent />} />
          </Routes>
        </AppProvider>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}