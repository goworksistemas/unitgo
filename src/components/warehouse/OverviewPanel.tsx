import type { UnitStock, Item } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Package, PackageCheck, Truck, AlertCircle } from 'lucide-react';

interface OverviewPanelProps {
  pendingCount: number;
  approvedCount: number;
  awaitingPickupCount: number;
  outForDeliveryCount: number;
  lowStockItems: UnitStock[];
  getItemById: (id: string) => Item | undefined;
}

export function OverviewPanel({
  pendingCount, approvedCount, awaitingPickupCount,
  outForDeliveryCount, lowStockItems, getItemById,
}: OverviewPanelProps) {
  const kpi = (
    <>
      <Card className="min-w-[132px] shrink-0 snap-start border-border shadow-sm md:min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Aprovar</CardTitle>
          <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="text-2xl font-semibold tabular-nums">{pendingCount}</div>
          <p className="text-[11px] text-muted-foreground">aguardando você</p>
        </CardContent>
      </Card>

      <Card className="min-w-[132px] shrink-0 snap-start border-border shadow-sm md:min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Separar</CardTitle>
          <Package className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="text-2xl font-semibold tabular-nums">{approvedCount}</div>
          <p className="text-[11px] text-muted-foreground">aprovados / processo</p>
        </CardContent>
      </Card>

      <Card className="min-w-[132px] shrink-0 snap-start border-border shadow-sm md:min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Retirada</CardTitle>
          <PackageCheck className="h-4 w-4 text-violet-600 dark:text-violet-400" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="text-2xl font-semibold tabular-nums">{awaitingPickupCount}</div>
          <p className="text-[11px] text-muted-foreground">prontos p/ motorista</p>
        </CardContent>
      </Card>

      <Card className="min-w-[132px] shrink-0 snap-start border-border shadow-sm md:min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Em rota</CardTitle>
          <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="text-2xl font-semibold tabular-nums">{outForDeliveryCount}</div>
          <p className="text-[11px] text-muted-foreground">entrega em andamento</p>
        </CardContent>
      </Card>

      <Card className="min-w-[132px] shrink-0 snap-start border-border shadow-sm md:min-w-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Estoque baixo</CardTitle>
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
        </CardHeader>
        <CardContent className="pb-3 pt-0">
          <div className="text-2xl font-semibold tabular-nums">{lowStockItems.length}</div>
          <p className="text-[11px] text-muted-foreground">materiais</p>
        </CardContent>
      </Card>
    </>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-medium text-foreground">Resumo rápido</h2>
        <p className="text-xs text-muted-foreground">Números do fluxo de materiais (não inclui móveis)</p>
      </div>

      <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 md:mx-0 md:grid md:grid-cols-5 md:gap-3 md:overflow-visible md:snap-none">
        {kpi}
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-red-200/80 bg-red-50/80 dark:border-red-900 dark:bg-red-950/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-red-900 dark:text-red-300">
              <AlertCircle className="h-5 w-5 shrink-0" />
              Materiais abaixo do mínimo
            </CardTitle>
            <CardDescription className="text-xs">
              Priorize reposição. Móveis têm painel próprio em Pedidos.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(stock => {
                const item = getItemById(stock.itemId);
                return (
                  <div key={stock.id} className="flex items-center justify-between p-3 bg-card rounded-lg border border-red-200 dark:border-red-800">
                    <div>
                      <div className="font-medium text-sm sm:text-base">{item?.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground">{stock.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-700 dark:text-red-400 font-semibold text-sm sm:text-base">
                        {stock.quantity} / {stock.minimumQuantity}
                      </div>
                      <div className="text-xs text-muted-foreground">atual / mínimo</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
