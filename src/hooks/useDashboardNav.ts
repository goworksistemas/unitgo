import { useEffect, useCallback } from 'react';
import { useNavigation, type NavigationSection } from './useNavigation';

/**
 * Hook for dashboards to register their navigation sections with the AppLayout sidebar.
 * Returns the current active section/item and a setter.
 */
export function useDashboardNav(
  sections: NavigationSection[],
  title: string | undefined,
  subtitle?: string,
  defaultSection?: string
) {
  const { state, setSections, setActiveSection, setTitle } = useNavigation();

  useEffect(() => {
    setSections(sections);
  }, [sections, setSections]);

  useEffect(() => {
    if (title === undefined) return;
    setTitle(title, subtitle);
  }, [title, subtitle, setTitle]);

  // Selecionar primeira seção quando: não há seção ativa, ou a atual não existe nas novas seções
  // Não incluir state.activeSection nas deps - senão ao clicar em outra aba o effect re-roda e pode resetar
  useEffect(() => {
    const sectionToUse = defaultSection || sections[0]?.id;
    if (!sectionToUse) return;
    const currentExists = sections.some(s => s.id === state.activeSection);
    if (!state.activeSection || !currentExists) {
      setActiveSection(sectionToUse);
    }
  }, [sections, defaultSection, setActiveSection]);

  return {
    activeSection: state.activeSection,
    activeItem: state.activeItem,
    setActiveSection,
  };
}
