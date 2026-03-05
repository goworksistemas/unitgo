import { useMemo } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function WarehousePurchasesDashboard() {
  const { purchaseOrders, isLoadingPurchases } = usePurchases();

  const pendingOrders = useMemo(
    () => purchaseOrders.filter((o) => o.status === 'nf_issued' || o.status === 'in_transit'),
    [purchaseOrders]
  );

  const receivedOrders = useMemo(
    () => purchaseOrders.filter((o) => o.status === 'partially_received' || o.status === 'fully_received'),
    [purchaseOrders]
  );

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Tabs defaultValue="recebimentos-pendentes" className="space-y-4">
      <TabsList>
        <TabsTrigger value="recebimentos-pendentes">Recebimentos Pendentes</TabsTrigger>
        <TabsTrigger value="historico-recebimentos">Histórico</TabsTrigger>
      </TabsList>
      <TabsContent value="recebimentos-pendentes">
        <Card>
          <CardHeader>
            <CardTitle>Recebimentos Pendentes</CardTitle>
            <CardDescription>Pedidos com NF emitida ou em trânsito aguardando recebimento</CardDescription>
          </CardHeader>
          <CardContent>
            {pendingOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum recebimento pendente</p>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((o) => (
                  <div key={o.id} className="p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pedido #{o.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {o.numeroOmie ? `Omie: ${o.numeroOmie}` : 'Sem nº Omie'} •{' '}
                        {format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className={o.status === 'nf_issued' ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-purple-50 text-purple-700 border-purple-300'}>
                      {o.status === 'nf_issued' ? 'NF Emitida' : 'Em Trânsito'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="historico-recebimentos">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Recebimentos</CardTitle>
            <CardDescription>Pedidos já recebidos total ou parcialmente</CardDescription>
          </CardHeader>
          <CardContent>
            {receivedOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Nenhum recebimento registrado</p>
            ) : (
              <div className="space-y-3">
                {receivedOrders.map((o) => (
                  <div key={o.id} className="p-4 rounded-lg border flex items-center justify-between">
                    <div>
                      <p className="font-medium">Pedido #{o.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
                    </div>
                    <Badge variant={o.status === 'fully_received' ? 'default' : 'secondary'}>
                      {o.status === 'fully_received' ? 'Recebido' : 'Parcial'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
