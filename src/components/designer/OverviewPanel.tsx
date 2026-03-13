import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, Armchair } from 'lucide-react';

export interface OverviewPanelProps {
  pendingCount: number;
  approvedCount: number;
  completedCount: number;
}

export function OverviewPanel({
  pendingCount,
  approvedCount,
  completedCount,
}: OverviewPanelProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Transferências Pendentes</CardTitle>
          <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{pendingCount}</div>
          <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Aprovadas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{approvedCount}</div>
          <p className="text-xs text-muted-foreground">Em andamento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm">Concluídas</CardTitle>
          <Armchair className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl">{completedCount}</div>
          <p className="text-xs text-muted-foreground">Total de transferências</p>
        </CardContent>
      </Card>
    </div>
  );
}
