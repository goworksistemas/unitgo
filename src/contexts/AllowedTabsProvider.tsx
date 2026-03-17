import { ReactNode } from 'react';
import { AllowedTabsContext, useAllowedTabsProvider } from '@/hooks/useAllowedTabs';

export function AllowedTabsProvider({ children }: { children: ReactNode }) {
  const value = useAllowedTabsProvider();
  return (
    <AllowedTabsContext.Provider value={value}>
      {children}
    </AllowedTabsContext.Provider>
  );
}
