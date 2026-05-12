import { createContext, useContext } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Cor accent aplicada ao grupo no sidebar (chip do ícone, flyout, barra ativa).
 * Cada token é resolvido para classes Tailwind no AppSidebar (ACCENT_TOKENS).
 */
export type NavigationAccent =
  | 'blue'
  | 'green'
  | 'indigo'
  | 'sky'
  | 'amber'
  | 'pink'
  | 'emerald'
  | 'teal'
  | 'violet'
  | 'slate';

/** @deprecated mantido por compatibilidade — o novo sidebar não usa esta divisão. */
export type NavigationSidebarGroup = 'inicio' | 'modulos' | 'utilitarios';

export interface NavigationItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  badge?: number | string;
  /** Subdivisão visual dentro de um item com sub-menu (ex.: Compras). */
  group?: string;
}

export interface NavigationSubgroup {
  /** Rótulo exibido em caixa alta dentro do grupo expandido. */
  label: string;
  items: NavigationItem[];
}

export interface NavigationSection {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  /** Cor de destaque do grupo no sidebar (chip, flyout, barra ativa). */
  accent?: NavigationAccent;
  /** Texto auxiliar exibido no botão "i" do cabeçalho do flyout. */
  info?: string;
  /** Itens diretos do grupo. Ignorado quando `subgroups` é fornecido. */
  items?: NavigationItem[];
  /** Quando definido, os itens são organizados em subgrupos com rótulo. */
  subgroups?: NavigationSubgroup[];
  /** @deprecated não utilizado pelo sidebar atual; mantido para compatibilidade. */
  sidebarGroup?: NavigationSidebarGroup;
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
