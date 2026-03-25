import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '@/utils/api';
import { useApp } from '@/contexts/AppContext';

interface AllowedTabsContextType {
  allowedTabs: string[];
  isLoading: boolean;
  canAccessTab: (tabId: string) => boolean;
  refreshTabs: () => void;
}

const ADMIN_ROLES = ['admin', 'developer', 'controller'];

export const AllowedTabsContext = createContext<AllowedTabsContextType>({
  allowedTabs: [],
  isLoading: true,
  canAccessTab: () => false,
  refreshTabs: () => {},
});

const COMPRAS_ADMIN_TAB_PREFIX = 'compras_admin.';

export function useAllowedTabsProvider() {
  const { currentUser } = useApp();
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = !!currentUser && ADMIN_ROLES.includes(currentUser.role);
  const isPurchasesAdmin = currentUser?.role === 'purchases_admin';

  const loadTabs = useCallback(async () => {
    if (!currentUser?.id || isAdmin || isPurchasesAdmin) {
      setAllowedTabs([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await api.accessGroups.getUserTabs(currentUser.id);
      setAllowedTabs((res as { allowedTabs?: string[] })?.allowedTabs ?? []);
    } catch {
      setAllowedTabs([]);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser?.id, isAdmin, isPurchasesAdmin]);

  useEffect(() => { loadTabs(); }, [loadTabs]);

  const canAccessTab = useCallback(
    (tabId: string) => {
      if (isAdmin) return true;
      if (currentUser?.role === 'purchases_admin') {
        return tabId.startsWith(COMPRAS_ADMIN_TAB_PREFIX);
      }
      return allowedTabs.includes(tabId);
    },
    [allowedTabs, isAdmin, currentUser?.role]
  );

  return useMemo(() => ({
    allowedTabs,
    isLoading,
    canAccessTab,
    refreshTabs: loadTabs,
  }), [allowedTabs, isLoading, canAccessTab, loadTabs]);
}

export function useAllowedTabs() {
  return useContext(AllowedTabsContext);
}
