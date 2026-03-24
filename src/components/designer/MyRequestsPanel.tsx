import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Trash2 } from 'lucide-react';
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="h-5 w-5 text-muted-foreground" aria-hidden />
                Retirada ou descarte
              </CardTitle>
              <CardDescription>
                Abre o formulário para pedir retirada de móvel da unidade. Você acompanha o status na tabela abaixo.
              </CardDescription>
            </div>
            <Button type="button" onClick={onRequestRemoval} className="shrink-0 w-full sm:w-auto">
              <Trash2 className="h-4 w-4 mr-2" />
              Nova solicitação de retirada
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {myRemovalRequests.length > 0 ? (
            <MyRemovalRequestsTable
              requests={myRemovalRequests}
              getItemById={getItemById}
              getUnitById={getUnitById}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-40" aria-hidden />
              Você ainda não tem solicitações de retirada. Use o botão acima quando precisar remover um móvel da unidade.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Transferências que você pediu</CardTitle>
          <CardDescription>
            Movimentação entre unidades — a administração precisa aprovar antes de executar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide">
              <TabsList className="inline-flex h-auto w-max min-w-full sm:w-full sm:grid sm:grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
                <TabsTrigger value="pending" className="rounded-md px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  Pendentes ({pendingTransfers.length})
                </TabsTrigger>
                <TabsTrigger value="approved" className="rounded-md px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  Aprovadas ({approvedTransfers.length})
                </TabsTrigger>
                <TabsTrigger value="completed" className="rounded-md px-3 py-2 text-xs sm:text-sm whitespace-nowrap">
                  Concluídas ({completedTransfers.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="mt-4 focus-visible:outline-none">
              <TransfersTable transfers={pendingTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>

            <TabsContent value="approved" className="mt-4 focus-visible:outline-none">
              <TransfersTable transfers={approvedTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>

            <TabsContent value="completed" className="mt-4 focus-visible:outline-none">
              <TransfersTable transfers={completedTransfers} getItemById={getItemById} getUnitById={getUnitById} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
