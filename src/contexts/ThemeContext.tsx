/**
 * ThemeContext — gerencia tema light/dark.
 *
 * - Persiste em localStorage e aplica classe `dark` no <html>.
 * - Quando o navegador suporta View Transitions API e o evento de clique
 *   for fornecido, anima a troca como uma onda circular expandindo a partir
 *   do ponto de clique (mesmo efeito do NetworkGo).
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { flushSync } from 'react-dom';

type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  /** Alterna o tema. Se receber o evento de clique, anima como onda circular. */
  alternar: (e?: React.MouseEvent) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'supplygo_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored === 'light' || stored === 'dark' ? stored : 'dark';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const alternar = useCallback((e?: React.MouseEvent) => {
    const aplicar = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));

    // Sem evento (ex: atalho de teclado) ou navegador sem suporte: troca simples
    if (typeof document === 'undefined' || !('startViewTransition' in document) || !e) {
      aplicar();
      return;
    }

    const root = document.documentElement;
    root.style.setProperty('--theme-x', `${e.clientX}px`);
    root.style.setProperty('--theme-y', `${e.clientY}px`);

    const transition = (
      document as Document & {
        startViewTransition: (cb: () => void) => { finished: Promise<void> };
      }
    ).startViewTransition(() => {
      flushSync(aplicar);
    });

    transition.finished
      .catch(() => {
        /* ignore */
      })
      .finally(() => {
        root.style.removeProperty('--theme-x');
        root.style.removeProperty('--theme-y');
      });
  }, []);

  return <ThemeContext.Provider value={{ theme, alternar }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme() precisa estar dentro de <ThemeProvider>');
  }
  return ctx;
}
