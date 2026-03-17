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

export function useAllowedTabsProvider() {
  const { currentUser } = useApp();
  const [allowedTabs, setAllowedTabs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = !!currentUser && ADMIN_ROLES.includes(currentUser.role);

  const loadTabs = useCallback(async () => {
    if (!currentUser?.id || isAdmin) {
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
  }, [currentUser?.id, isAdmin]);

  useEffect(() => { loadTabs(); }, [loadTabs]);

  const canAccessTab = useCallback(
    (tabId: string) => isAdmin || allowedTabs.includes(tabId),
    [allowedTabs, isAdmin]
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
