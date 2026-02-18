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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{pendingCount}</div>
            <p className="text-xs text-gray-600">Aprovação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Para Separar</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{approvedCount}</div>
            <p className="text-xs text-gray-600">Aprovados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Aguardando</CardTitle>
            <PackageCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{awaitingPickupCount}</div>
            <p className="text-xs text-gray-600">Retirada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Em Rota</CardTitle>
            <Truck className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{outForDeliveryCount}</div>
            <p className="text-xs text-gray-600">Entrega</p>
          </CardContent>
        </Card>

        <Card className="col-span-2 sm:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm">Estoque Baixo</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl">{lowStockItems.length}</div>
            <p className="text-xs text-gray-600">Materiais</p>
          </CardContent>
        </Card>
      </div>

      {lowStockItems.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900 flex items-center gap-2 text-base sm:text-lg">
              <AlertCircle className="h-5 w-5" />
              Alertas de Estoque Baixo - Materiais
            </CardTitle>
            <CardDescription>Materiais que precisam de reposição urgente (móveis em painel separado)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockItems.map(stock => {
                const item = getItemById(stock.itemId);
                return (
                  <div key={stock.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-red-200">
                    <div>
                      <div className="font-medium text-sm sm:text-base">{item?.name}</div>
                      <div className="text-xs sm:text-sm text-gray-600">{stock.location}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-red-700 font-semibold text-sm sm:text-base">
                        {stock.quantity} / {stock.minimumQuantity}
                      </div>
                      <div className="text-xs text-gray-600">atual / mínimo</div>
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
