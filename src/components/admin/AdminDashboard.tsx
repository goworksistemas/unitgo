import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { AdminUnitsDashboard } from './AdminUnitsDashboard';
import { AdminWarehouseDashboard } from './AdminWarehouseDashboard';
import { ControllerDashboard } from '../dashboards/ControllerDashboard';
import { DesignerDashboard } from '../dashboards/DesignerDashboard';
import { ViewModePopup } from '../shared/ViewModePopup';

type ViewMode = 'admin' | 'operational';

export function AdminDashboard() {
  const { currentUser } = useApp();
  const [viewMode, setViewMode] = useState<ViewMode>('admin');

  const adminType = currentUser?.adminType || 'units';
  const isUnitsAdmin = adminType === 'units';
  const isWarehouseAdmin = adminType === 'warehouse';

  if (viewMode === 'admin') {
    return isWarehouseAdmin ? (
      <AdminWarehouseDashboard onSwitchToDesigner={() => setViewMode('operational')} />
    ) : (
      <AdminUnitsDashboard onSwitchToController={() => setViewMode('operational')} />
    );
  }

  return (
    <div className="relative">
      <ViewModePopup
        label={`Visualizando como ${isUnitsAdmin ? 'Controlador' : 'Designer'}`}
        backLabel="Voltar ao Admin"
        onClose={() => setViewMode('admin')}
      />
      <div>
        {isUnitsAdmin && <ControllerDashboard />}
        {isWarehouseAdmin && <DesignerDashboard />}
      </div>
    </div>
  );
}