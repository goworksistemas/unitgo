import { useEffect, useCallback } from 'react';
import { useNavigation, type NavigationSection } from './useNavigation';

/**
 * Hook for dashboards to register their navigation sections with the AppLayout sidebar.
 * Returns the current active section/item and a setter.
 */
export function useDashboardNav(
  sections: NavigationSection[],
  title: string,
  subtitle?: string,
  defaultSection?: string
) {
  const { state, setSections, setActiveSection, setTitle } = useNavigation();

  useEffect(() => {
    setSections(sections);
  }, [sections, setSections]);

  useEffect(() => {
    setTitle(title, subtitle);
  }, [title, subtitle, setTitle]);

  // Selecionar primeira seção quando: não há seção ativa, ou a atual não existe nas novas seções
  useEffect(() => {
    const sectionToUse = defaultSection || sections[0]?.id;
    if (!sectionToUse) return;
    const currentExists = sections.some(s => s.id === state.activeSection);
    if (!state.activeSection || !currentExists) {
      setActiveSection(sectionToUse);
    }
  }, [sections, defaultSection, state.activeSection, setActiveSection]);

  return {
    activeSection: state.activeSection,
    activeItem: state.activeItem,
    setActiveSection,
  };
}
