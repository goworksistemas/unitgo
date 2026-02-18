import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { AdminUnitsDashboard } from './AdminUnitsDashboard';
import { AdminWarehouseDashboard } from './AdminWarehouseDashboard';
import { ControllerDashboard } from '../dashboards/ControllerDashboard';
import { DesignerDashboard } from '../dashboards/DesignerDashboard';
import { Button } from '../ui/button';
import { Eye, ArrowLeft } from 'lucide-react';

type ViewMode = 'admin' | 'operational';

export function AdminDashboard() {
  const { currentUser } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('admin');

  // Determinar qual dashboard de admin mostrar baseado no adminType
  const adminType = currentUser?.adminType || 'units';
  const isUnitsAdmin = adminType === 'units';
  const isWarehouseAdmin = adminType === 'warehouse';

  // Se estiver em modo Admin, mostrar o dashboard admin apropriado
  if (viewMode === 'admin') {
    return isWarehouseAdmin ? (
      <AdminWarehouseDashboard onSwitchToDesigner={() => setViewMode('operational')} />
    ) : (
      <AdminUnitsDashboard onSwitchToController={() => setViewMode('operational')} />
    );
  }

  // Se estiver em modo Operacional, mostrar o dashboard correspondente
  return (
    <div className="relative">
      {/* Banner de Modo de Visualização */}
      <div className="sticky top-0 z-40 bg-gradient-to-r from-primary to-secondary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Eye className="h-5 w-5" />
              <div>
                <p className="text-sm font-medium">Modo de Visualização Ativo</p>
                <p className="text-xs opacity-90">
                  Você está visualizando como:{' '}
                  <span className="font-bold">
                    {isUnitsAdmin ? 'Controlador' : 'Designer'}
                  </span>
                </p>
              </div>
            </div>
            
            <Button
              size="sm"
              variant="secondary"
              className="gap-2 bg-white text-primary hover:bg-white/90"
              onClick={() => setViewMode('admin')}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar ao Admin
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard do Modo Selecionado */}
      <div>
        {isUnitsAdmin && <ControllerDashboard />}
        {isWarehouseAdmin && <DesignerDashboard />}
      </div>
    </div>
  );
}