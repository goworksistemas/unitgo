import { createContext, useContext, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  items?: NavigationItem[];
}

export interface NavigationState {
  sections: NavigationSection[];
  activeSection: string;
  activeItem?: string;
  title: string;
  subtitle?: string;
}

export interface NavigationContextType {
  state: NavigationState;
  setSections: (sections: NavigationSection[]) => void;
  setActiveSection: (sectionId: string, itemId?: string) => void;
  setTitle: (title: string, subtitle?: string) => void;
}

export const NavigationContext = createContext<NavigationContextType>({
  state: { sections: [], activeSection: '', title: '' },
  setSections: () => {},
  setActiveSection: () => {},
  setTitle: () => {},
});

export function useNavigation() {
  return useContext(NavigationContext);
}
