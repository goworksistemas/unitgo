import { createContext, useContext, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Blocos do menu lateral (separação tipo Gestio: Início / Módulos / Utilitários). */
export type NavigationSidebarGroup = 'inicio' | 'modulos' | 'utilitarios';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  /** Subdivisão visual dentro de um item com sub-menu (ex.: Compras). */
  group?: string;
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** Agrupamento no menu; padrão `modulos`. */
  sidebarGroup?: NavigationSidebarGroup;
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
