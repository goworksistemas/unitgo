import { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Clock, ArrowRightLeft, AlertTriangle, BarChart3, Eye, LayoutDashboard } from 'lucide-react';
import { AdminAnalytics } from './AdminAnalytics';
import { OverviewPanel } from '../admin-warehouse/OverviewPanel';
import { RequestsTable, TransfersTable, RemovalsTable } from '../admin-warehouse/DataTablePanel';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import type { NavigationSection } from '@/hooks/useNavigation';

interface AdminWarehouseDashboardProps {
  onSwitchToDesigner: () => void;
}

export function AdminWarehouseDashboard({ onSwitchToDesigner }: AdminWarehouseDashboardProps) {
  const { units, items, users, unitStocks, furnitureRequestsToDesigner, furnitureTransfers, furnitureRemovalRequests, getItemById, getUnitById, getUserById } = useApp();

  const navigationSections: NavigationSection[] = [
    { id: 'overview', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'requests', label: 'Solicitações', icon: Clock },
    { id: 'transfers', label: 'Transferências', icon: ArrowRightLeft },
    { id: 'removals', label: 'Remoções', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const { activeSection } = useDashboardNav(navigationSections, 'Dashboard Administrativo - Design', 'Visão geral do sistema de gestão de móveis', 'overview');

  const furnitureItems = items.filter(i => i.isFurniture && i.active);

  const stats = useMemo(() => {
    const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
    return {
      totalFurniture: furnitureItems.length,
      pendingDesignerRequests: furnitureRequestsToDesigner.filter(r => r.status === 'pending_designer').length,
      approvedDesignerRequests: furnitureRequestsToDesigner.filter(r => ['approved_designer', 'approved_storage', 'awaiting_delivery', 'in_transit'].includes(r.status)).length,
      pendingTransfers: furnitureTransfers.filter(t => t.status === 'pending').length,
      approvedTransfers: furnitureTransfers.filter(t => ['approved', 'in_transit'].includes(t.status)).length,
      pendingRemovalRequests: furnitureRemovalRequests.filter(r => r.status === 'pending').length,
      approvedStorageRequests: furnitureRemovalRequests.filter(r => r.status === 'approved_storage').length,
      furnitureInWarehouse: warehouseUnit ? unitStocks.filter(s => { const item = items.find(i => i.id === s.itemId); return item?.isFurniture && s.unitId === warehouseUnit.id && s.quantity > 0; }).length : 0,
    };
  }, [furnitureItems, furnitureRequestsToDesigner, furnitureTransfers, furnitureRemovalRequests, unitStocks, items, units]);

  const designers = users.filter(u => u.role === 'designer');

  const pendingRequests = useMemo(() =>
    furnitureRequestsToDesigner.filter(r => r.status === 'pending_designer')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
  [furnitureRequestsToDesigner]);

  const recentTransfers = useMemo(() =>
    furnitureTransfers.filter(t => !['completed', 'rejected'].includes(t.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
  [furnitureTransfers]);

  const removalRequests = useMemo(() =>
    furnitureRemovalRequests.filter(r => ['pending', 'approved_storage'].includes(r.status))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
  [furnitureRemovalRequests]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={onSwitchToDesigner} className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
          <Eye className="h-4 w-4" />Ver como Designer
        </Button>
      </div>

      {activeSection === 'overview' && <OverviewPanel stats={stats} designers={designers} totalRequests={furnitureRequestsToDesigner.length} totalTransfers={furnitureTransfers.length} />}
      {activeSection === 'requests' && <RequestsTable requests={pendingRequests} getItemById={getItemById} getUnitById={getUnitById} getUserById={getUserById} />}
      {activeSection === 'transfers' && <TransfersTable transfers={recentTransfers} getItemById={getItemById} getUnitById={getUnitById} getUserById={getUserById} />}
      {activeSection === 'removals' && <RemovalsTable removals={removalRequests} getItemById={getItemById} getUnitById={getUnitById} getUserById={getUserById} />}
      {activeSection === 'analytics' && <AdminAnalytics />}
    </>
  );
}
