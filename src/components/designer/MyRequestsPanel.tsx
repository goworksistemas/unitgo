import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2 } from 'lucide-react';
import type { FurnitureTransfer, FurnitureRemovalRequest, Item, Unit } from '@/types';
import { TransfersTable } from './TransfersTable';
import { MyRemovalRequestsTable } from './MyRemovalRequestsTable';

export interface MyRequestsPanelProps {
  myRemovalRequests: FurnitureRemovalRequest[];
  pendingTransfers: FurnitureTransfer[];
  approvedTransfers: FurnitureTransfer[];
  completedTransfers: FurnitureTransfer[];
  onRequestRemoval: () => void;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function MyRequestsPanel({
  myRemovalRequests,
  pendingTransfers,
  approvedTransfers,
  completedTransfers,
  onRequestRemoval,
  getItemById,
  getUnitById,
}: MyRequestsPanelProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trash2 className="h-5 w-5" />
                Solicitar Retirada / Descarte
              </CardTitle>
              <CardDescription>Solicite a retirada de móveis das unidades</CardDescription>
            </div>
            <Button onClick={onRequestRemoval}>
              <Trash2 className="h-4 w-4 mr-2" />
              Solicitar Retirada
            </Button>
          </div>
        </CardHeader>
        {myRemovalRequests.length > 0 && (
          <CardContent>
            <MyRemovalRequestsTable
              requests={myRemovalRequests}
              getItemById={getItemById}
              getUnitById={getUnitById}
            />
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas Solicitações de Transferência</CardTitle>
          <CardDescription>Acompanhe suas solicitações de movimentação de móveis</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="grid w-full min-w-[400px] sm:min-w-0 grid-cols-3">
                <TabsTrigger value="pending" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Pendentes ({pendingTransfers.length})</span>
                  <span className="sm:hidden">Pend. ({pendingTransfers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="approved" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Aprovadas ({approvedTransfers.length})</span>
                  <span className="sm:hidden">Aprov. ({approvedTransfers.length})</span>
                </TabsTrigger>
                <TabsTrigger value="completed" className="text-xs sm:text-sm">
                  <span className="hidden sm:inline">Concluídas ({completedTransfers.length})</span>
                  <span className="sm:hidden">Concl. ({completedTransfers.length})</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="space-y-4">
              <TransfersTable transfers={pendingTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>

            <TabsContent value="approved" className="space-y-4">
              <TransfersTable transfers={approvedTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <TransfersTable transfers={completedTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
