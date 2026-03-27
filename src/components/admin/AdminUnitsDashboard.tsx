import { useMemo, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { Clock, Package, ArrowRightLeft, BarChart3, Eye, LayoutDashboard, ShoppingCart, Search } from 'lucide-react';
import { AdminAnalytics } from './AdminAnalytics';
import { OverviewPanel } from '../admin-units/OverviewPanel';
import { RequestsTable, StockTable, TransfersTable } from '../admin-units/DataTablePanel';
import { AdminRequestTrackingPanel } from './AdminRequestTrackingPanel';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useNavigation } from '@/hooks/useNavigation';
import type { NavigationSection } from '@/hooks/useNavigation';

interface AdminUnitsDashboardProps {
  onSwitchToController: () => void;
}

export function AdminUnitsDashboard({ onSwitchToController }: AdminUnitsDashboardProps) {
  const { units, items, users, unitStocks, requests, furnitureTransfers, getItemById, getUnitById, getUserById } = useApp();

  const navigationSections: NavigationSection[] = useMemo(() => {
    const purchaseItems: NonNullable<NavigationSection['items']> = [
      { id: 'tracking', label: 'Acompanhamento', icon: Search },
    ];
    return [
      { id: 'overview', label: 'Painel', icon: LayoutDashboard, sidebarGroup: 'inicio' },
      { id: 'requests', label: 'Pedidos', icon: Clock, sidebarGroup: 'modulos' },
      { id: 'stock', label: 'Estoque', icon: Package, sidebarGroup: 'modulos' },
      { id: 'transfers', label: 'Transferências', icon: ArrowRightLeft, sidebarGroup: 'modulos' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, sidebarGroup: 'modulos' },
      { id: 'purchases', label: 'Compras', icon: ShoppingCart, sidebarGroup: 'modulos', items: purchaseItems },
    ];
  }, []);

  const PURCHASE_NAV_ITEM_IDS = useMemo(() => ['tracking'] as const, []);

  const { activeSection, activeItem } = useDashboardNav(navigationSections, 'Dashboard Administrativo', 'Visão geral do sistema', 'overview');
  const { state: navState, setActiveSection: setNavActiveSection } = useNavigation();

  useEffect(() => {
    if (navState.activeSection !== 'purchases' || !navState.activeItem) return;
    if (!PURCHASE_NAV_ITEM_IDS.includes(navState.activeItem as (typeof PURCHASE_NAV_ITEM_IDS)[number])) {
      setNavActiveSection('purchases', 'tracking');
    }
  }, [navState.activeSection, navState.activeItem, setNavActiveSection, PURCHASE_NAV_ITEM_IDS]);

  const warehouseUnit = units.find(u => u.name === 'Almoxarifado Central');
  const operationalUnits = units.filter(u => u.id !== warehouseUnit?.id);

  const stats = useMemo(() => ({
    activeUnits: operationalUnits.filter(u => u.status === 'active').length,
    totalUsers: users.length,
    totalItems: items.filter(i => i.active).length,
    pendingRequests: requests.filter(r => r.status === 'pending').length,
    approvedRequests: requests.filter(r => ['approved', 'processing', 'awaiting_pickup'].includes(r.status)).length,
    lowStockItems: unitStocks.filter(s => s.quantity <= s.minimumQuantity).length,
    pendingTransfers: furnitureTransfers.filter(t => ['pending', 'approved'].includes(t.status)).length,
  }), [operationalUnits, users, items, requests, unitStocks, furnitureTransfers]);

  const recentRequests = useMemo(() =>
    requests.filter(r => r.status !== 'completed' && r.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
  [requests]);

  const lowStockItemsData = useMemo(() =>
    unitStocks.filter(s => s.quantity <= s.minimumQuantity)
      .map(s => ({ ...s, item: getItemById(s.itemId), unit: getUnitById(s.unitId) }))
      .filter(s => s.item && s.unit).slice(0, 10),
  [unitStocks, getItemById, getUnitById]);

  const recentTransfers = useMemo(() =>
    furnitureTransfers.filter(t => t.status !== 'completed' && t.status !== 'rejected')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10),
  [furnitureTransfers]);

  const requestsByItem = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    requests.forEach(r => {
      const item = getItemById(r.itemId);
      if (item) {
        const cur = counts.get(item.id) || { name: item.name, count: 0 };
        counts.set(item.id, { name: item.name, count: cur.count + r.quantity });
      }
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [requests, getItemById]);

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button onClick={onSwitchToController} className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
          <Eye className="h-4 w-4" />Ver como Controlador
        </Button>
      </div>

      {activeSection === 'overview' && (
        <OverviewPanel stats={stats} operationalUnitsCount={operationalUnits.length} requestsCount={requests.length} requestsByItem={requestsByItem} />
      )}
      {activeSection === 'requests' && (
        <RequestsTable requests={recentRequests} getItemById={getItemById} getUnitById={getUnitById} getUserById={getUserById} />
      )}
      {activeSection === 'stock' && <StockTable lowStockItems={lowStockItemsData} />}
      {activeSection === 'transfers' && <TransfersTable transfers={recentTransfers} getItemById={getItemById} getUnitById={getUnitById} />}
      {activeSection === 'analytics' && <AdminAnalytics />}
      {activeSection === 'purchases' && activeItem === 'tracking' && <AdminRequestTrackingPanel />}
      {activeSection === 'purchases' && !activeItem && <AdminRequestTrackingPanel />}
    </>
  );
}
