import type { Loan, Item } from '@/types';
import { Badge } from '../ui/badge';

interface LoanAlertsProps {
  overdueLoans: number;
  soonLoans: number;
  overdueLoansData: Loan[];
  getItemById: (id: string) => Item | undefined;
}

export function LoanAlerts({ overdueLoans, soonLoans, overdueLoansData, getItemById }: LoanAlertsProps) {
  if (overdueLoans === 0 && soonLoans === 0) return null;

  return (
    <div className="divide-y divide-border border-b border-border">
      {overdueLoans > 0 && overdueLoansData.slice(0, 3).map(loan => {
        const item = getItemById(loan.itemId);
        if (!item) return null;
        const daysDiff = Math.ceil(
          (new Date().getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        return (
          <div
            key={loan.id}
            className="flex items-center gap-2.5 px-5 py-1.5 text-xs border-l-[3px] border-red-500 bg-red-50/10 dark:bg-red-950/10 border-b border-border last:border-b-0"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-foreground font-medium truncate">{item.name}</p>
              <p className="text-muted-foreground">{overdueLoans} empréstimo(s) atrasado(s)</p>
            </div>
            <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300 shrink-0">
              {daysDiff}d atraso
            </Badge>
          </div>
        );
      })}
      {soonLoans > 0 && overdueLoans === 0 && (
        <div className="flex items-center gap-2.5 px-5 py-1.5 text-xs border-l-[3px] border-yellow-400 bg-yellow-50/10 dark:bg-yellow-950/10 border-b border-border last:border-b-0">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-medium">Devoluções Próximas</p>
            <p className="text-muted-foreground">{soonLoans} empréstimo(s) vencendo hoje/amanhã</p>
          </div>
          <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 shrink-0">
            Pendente
          </Badge>
        </div>
      )}
    </div>
  );
}
