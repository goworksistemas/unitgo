import React from 'react';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { KeyRound } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { formatDailyCode } from '../../utils/dailyCode';

export function DailyCodeDisplay() {
  const { currentUser, getUserDailyCode } = useApp();
  const [currentDate, setCurrentDate] = React.useState(new Date().toDateString());

  // Força re-render quando a data muda (após meia-noite)
  React.useEffect(() => {
    const interval = setInterval(() => {
      const newDate = new Date().toDateString();
      if (newDate !== currentDate) {
        setCurrentDate(newDate);
      }
    }, 180 * 60 * 1000); // Verifica a cada 3 horas

    return () => clearInterval(interval);
  }, [currentDate]);

  if (!currentUser) return null;
  if (['admin', 'driver'].includes(currentUser.role)) return null;

  const dailyCode = getUserDailyCode(currentUser.id);
  if (!dailyCode) return null;

  const formattedCode = formatDailyCode(dailyCode);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/30 rounded-lg cursor-help">
            <KeyRound className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono tracking-wider text-primary">{formattedCode}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">Seu código diário de confirmação</p>
          <p className="text-xs text-gray-500">Válido por 24h • Renova a cada novo dia</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}