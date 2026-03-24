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

  if (isLoadingPurchases) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">Carregando compras…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Compras: confira NF emitida ou mercadoria em trânsito e registre o recebimento quando chegar.
      </p>
      <Tabs defaultValue="recebimentos-pendentes" className="space-y-4">
        <TabsList className="grid h-auto w-full max-w-md grid-cols-2 p-1">
          <TabsTrigger value="recebimentos-pendentes" className="text-xs sm:text-sm">
            A receber ({pendingOrders.length})
          </TabsTrigger>
          <TabsTrigger value="historico-recebimentos" className="text-xs sm:text-sm">
            Já recebidos ({receivedOrders.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="recebimentos-pendentes">
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Aguardando recebimento</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                NF emitida ou pedido em trânsito — dê baixa quando o material entrar no almox.
              </CardDescription>
            </CardHeader>
            <CardContent>
            {pendingOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
                Nada pendente de recebimento.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((o) => (
                  <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Pedido #{o.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">
                        {o.numeroOmie ? `Omie: ${o.numeroOmie}` : 'Sem nº Omie'} •{' '}
                        {format(new Date(o.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className={o.status === 'nf_issued' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-700' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border-purple-300 dark:border-purple-700'}>
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
          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Histórico de recebimentos</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Recebidos total ou parcialmente.</CardDescription>
            </CardHeader>
            <CardContent>
            {receivedOrders.length === 0 ? (
              <div className="rounded-lg border border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
                Nenhum recebimento registrado ainda.
              </div>
            ) : (
              <div className="space-y-3">
                {receivedOrders.map((o) => (
                  <div key={o.id} className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
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
    </div>
  );
}
