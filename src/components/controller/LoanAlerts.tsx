import type { Loan, Item } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock } from 'lucide-react';

interface LoanAlertsProps {
  overdueLoans: number;
  soonLoans: number;
  overdueLoansData: Loan[];
  getItemById: (id: string) => Item | undefined;
}

export function LoanAlerts({ overdueLoans, soonLoans, overdueLoansData, getItemById }: LoanAlertsProps) {
  if (overdueLoans === 0 && soonLoans === 0) return null;

  return (
    <div className="space-y-3">
      {overdueLoans > 0 && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
              <CardTitle className="text-red-900 dark:text-red-100 text-base md:text-lg">Empréstimos Atrasados</CardTitle>
            </div>
            <CardDescription className="text-red-700 dark:text-red-300 text-xs md:text-sm">
              {overdueLoans} empréstimo(s) atrasados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {overdueLoansData.slice(0, 3).map(loan => {
                const item = getItemById(loan.itemId);
                if (!item) return null;
                const daysDiff = Math.ceil(
                  (new Date().getTime() - new Date(loan.expectedReturnDate).getTime()) / (1000 * 60 * 60 * 24)
                );
                return (
                  <div key={loan.id} className="flex items-center justify-between p-2 bg-card rounded text-xs md:text-sm">
                    <span className="text-foreground truncate flex-1 pr-2">{item.name}</span>
                    <Badge variant="destructive" className="text-xs flex-shrink-0">
                      {daysDiff}d atraso
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {soonLoans > 0 && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-yellow-600 dark:text-yellow-400" />
              <CardTitle className="text-yellow-900 dark:text-yellow-100 text-base md:text-lg">Devoluções Próximas</CardTitle>
            </div>
            <CardDescription className="text-yellow-700 dark:text-yellow-300 text-xs md:text-sm">
              {soonLoans} empréstimo(s) vencendo hoje/amanhã
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
