import { useEffect, useRef } from 'react';
import { useNavigation, type NavigationSection } from './useNavigation';

/**
 * Hook for dashboards to register their navigation sections with the AppLayout sidebar.
 * Returns the current active section/item and a setter.
 *
 * @param registerNavigation - Se false, não altera o menu global (ex.: dev em “visualizar como” com filho que já registra as abas).
 */
export function useDashboardNav(
  sections: NavigationSection[],
  title: string | undefined,
  subtitle?: string,
  defaultSection?: string,
  registerNavigation = true
) {
  const { state, setSections, setActiveSection, setTitle } = useNavigation();
  const activeSectionRef = useRef(state.activeSection);
  activeSectionRef.current = state.activeSection;

  useEffect(() => {
    if (!registerNavigation) return;
    setSections(sections);
  }, [sections, setSections, registerNavigation]);

  useEffect(() => {
    if (!registerNavigation || title === undefined) return;
    setTitle(title, subtitle);
  }, [title, subtitle, setTitle, registerNavigation]);

  // Só reage a mudança da lista de seções ou do default — não a cada clique (evita briga com outros efeitos e loop com sections=[]).
  // Com sections vazias não chama setActiveSection: evita limpar activeItem e loop infinito (ex.: controlador sem unidade).
  useEffect(() => {
    if (!registerNavigation) return;
    if (sections.length === 0) return;
    const sectionToUse = defaultSection || sections[0]?.id;
    if (!sectionToUse) return;
    const current = activeSectionRef.current;
    const currentExists = sections.some((s) => s.id === current);
    if (!current || !currentExists) {
      setActiveSection(sectionToUse);
    }
  }, [sections, defaultSection, setActiveSection, registerNavigation]);

  return {
    activeSection: state.activeSection,
    activeItem: state.activeItem,
    setActiveSection,
  };
}
