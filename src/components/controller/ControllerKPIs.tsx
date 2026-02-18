import { Card, CardContent } from '../ui/card';
import { Armchair, Calendar, AlertTriangle } from 'lucide-react';

interface ControllerKPIsProps {
  totalFurniture: number;
  activeLoans: number;
  overdueLoans: number;
}

export function ControllerKPIs({ totalFurniture, activeLoans, overdueLoans }: ControllerKPIsProps) {
  return (
    <div className="grid grid-cols-3 gap-3 md:gap-4">
      <Card>
        <CardContent className="pt-4 md:pt-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-muted-foreground">Móveis</p>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                <Armchair className="w-4 h-4 md:w-5 md:h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl text-foreground">{totalFurniture}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 md:pt-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-muted-foreground">Empréstimos</p>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl text-foreground">{activeLoans}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 md:pt-6 pb-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs md:text-sm text-muted-foreground">Atrasados</p>
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <p className="text-2xl md:text-3xl text-red-600 dark:text-red-400">{overdueLoans}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
