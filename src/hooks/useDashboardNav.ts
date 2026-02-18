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

  useEffect(() => {
    if (defaultSection && !state.activeSection) {
      setActiveSection(defaultSection);
    }
  }, [defaultSection, state.activeSection, setActiveSection]);

  return {
    activeSection: state.activeSection,
    activeItem: state.activeItem,
    setActiveSection,
  };
}
