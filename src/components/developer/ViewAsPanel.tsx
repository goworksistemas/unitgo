import type { UserRole } from '@/types';
import { DeveloperModeSelector } from '@/components/shared/DeveloperModeSelector';
import { ControllerDashboard } from '@/components/dashboards/ControllerDashboard';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { WarehouseDashboard } from '@/components/dashboards/WarehouseDashboard';
import { DriverDashboard } from '@/components/dashboards/DriverDashboard';
import { DesignerDashboard } from '@/components/dashboards/DesignerDashboard';
import { RequesterDashboard } from '@/components/dashboards/RequesterDashboard';

interface ViewAsPanelProps {
  viewAsRole: UserRole | null;
  setViewAsRole: (role: UserRole | null) => void;
}

export function ViewAsPanel({ viewAsRole, setViewAsRole }: ViewAsPanelProps) {
  if (!viewAsRole) {
    return <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />;
  }

  return (
    <div className="space-y-4">
      <DeveloperModeSelector currentViewRole={viewAsRole} onSelectRole={setViewAsRole} />
      <RoleDashboard role={viewAsRole} />
    </div>
  );
}

function RoleDashboard({ role }: { role: string }) {
  switch (role) {
    case 'controller':
      return <ControllerDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'warehouse':
      return <WarehouseDashboard />;
    case 'driver':
      return <DriverDashboard isDeveloperMode={true} />;
    case 'designer':
      return <DesignerDashboard />;
    case 'requester':
      return <RequesterDashboard />;
    default:
      return null;
  }
}
