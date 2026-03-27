import type { DeliveryBatch, Item, Loan, Unit } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ControllerKPIs } from './ControllerKPIs';
import { PendingDeliveriesAlert } from './PendingDeliveriesAlert';
import { LoanAlerts } from './LoanAlerts';

export interface ControllerUnitKpis {
  totalItems: number;
  totalFurniture: number;
  belowMinimum: number;
  activeLoans: number;
  overdueLoans: number;
  soonLoans: number;
  overdueLoansData: Loan[];
}

interface ControllerOverviewPanelProps {
  currentUnit: Unit;
  unitKPIs: ControllerUnitKpis;
  deliveryBatches: DeliveryBatch[];
  onConfirmReceipt: (batchId: string) => void;
  onViewDeliveryDetails: (batchId: string) => void;
  getItemById: (id: string) => Item | undefined;
}

/**
 * Dashboard da unidade: indicadores consolidados em layout dedicado.
 */
export function ControllerOverviewPanel({
  currentUnit,
  unitKPIs,
  deliveryBatches,
  onConfirmReceipt,
  onViewDeliveryDetails,
  getItemById,
}: ControllerOverviewPanelProps) {
  const pendingDeliveryRows = deliveryBatches.filter(
    (b) => b.targetUnitId === currentUnit.id && b.status === 'delivery_confirmed',
  );
  const hasLoanAlerts = unitKPIs.overdueLoans > 0 || unitKPIs.soonLoans > 0;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard da unidade</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Indicadores consolidados de <span className="font-medium text-foreground">{currentUnit.name}</span> —
          estoque, entregas e empréstimos.
        </p>
      </header>

      <Card className="border-border/80 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
          <CardTitle className="text-base">Visão geral</CardTitle>
          <CardDescription>Materiais, móveis e empréstimos ativos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ControllerKPIs
            totalMaterials={unitKPIs.totalItems}
            totalFurniture={unitKPIs.totalFurniture}
            activeLoans={unitKPIs.activeLoans}
            overdueLoans={unitKPIs.overdueLoans}
            belowMinimum={unitKPIs.belowMinimum}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
            <CardTitle className="text-base">Entregas e recebimentos</CardTitle>
            <CardDescription>Lotes aguardando confirmação na unidade</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {pendingDeliveryRows.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhum lote aguardando confirmação de recebimento.
              </p>
            ) : (
              <PendingDeliveriesAlert
                currentUnit={currentUnit}
                deliveryBatches={deliveryBatches}
                onConfirmReceipt={onConfirmReceipt}
                onViewDetails={onViewDeliveryDetails}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-border/60 bg-muted/20 py-3">
            <CardTitle className="text-base">Empréstimos</CardTitle>
            <CardDescription>Vencidos e vencendo em breve</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {!hasLoanAlerts ? (
              <p className="px-5 py-8 text-center text-sm text-muted-foreground">
                Nenhum alerta de empréstimo no momento.
              </p>
            ) : (
              <LoanAlerts
                overdueLoans={unitKPIs.overdueLoans}
                soonLoans={unitKPIs.soonLoans}
                overdueLoansData={unitKPIs.overdueLoansData}
                getItemById={getItemById}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
