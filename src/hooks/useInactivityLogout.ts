import { useEffect, useRef } from 'react';

const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 1 hora em milissegundos
const WARNING_TIMEOUT = 55 * 60 * 1000; // 55 minutos (5 minutos antes do logout)

export function useInactivityLogout(
  onLogout: () => void, 
  isLoggedIn: boolean,
  onWarning?: () => void
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    // Limpar timeouts existentes
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
    }

    // Se usuário está logado, criar novos timeouts
    if (isLoggedIn) {
      // Aviso 5 minutos antes do logout
      if (onWarning) {
        warningTimeoutRef.current = setTimeout(() => {
          console.log('⚠️ Aviso: 5 minutos restantes antes do logout automático');
          onWarning();
        }, WARNING_TIMEOUT);
      }
      
      // Logout após 1 hora
      timeoutRef.current = setTimeout(() => {
        console.log('⏱️ 1 hora de inatividade detectada - fazendo logout automático');
        onLogout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  useEffect(() => {
    if (!isLoggedIn) {
      // Se usuário não está logado, limpar timers
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
        warningTimeoutRef.current = null;
      }
      return;
    }

    // Atividade: sem mousemove (disparava a cada pixel e poluía o console / CPU).
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];

    // Resetar timer em qualquer atividade
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Iniciar timer pela primeira vez
    resetTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [isLoggedIn]);

  return { resetTimer };
}