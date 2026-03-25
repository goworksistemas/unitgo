import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { PurchaseRequestStatusBadge } from '@/components/purchases/shared/PurchaseRequestStatusBadge';
import type { PurchaseRequestStatus } from '@/types/purchases';

interface BuyerApprovalsHubPanelProps {
  relaxedBuyerScope?: boolean;
  onOpenOrder?: (orderId: string) => void;
}

export default function BuyerApprovalsHubPanel({
  relaxedBuyerScope,
  onOpenOrder,
}: BuyerApprovalsHubPanelProps) {
  const { currentUser, getUserById } = useApp();
  const { purchaseRequests, purchaseOrders, isLoadingPurchases } = usePurchases();

  const myRequestIds = useMemo(() => {
    if (!currentUser) return new Set<string>();
    return new Set(
      purchaseRequests
        .filter((r) => {
          if (!r.compradorId) return false;
          if (relaxedBuyerScope) return true;
          return r.compradorId === currentUser.id;
        })
        .map((r) => r.id)
    );
  }, [purchaseRequests, currentUser, relaxedBuyerScope]);

  const scAguardandoGestao = useMemo(() => {
    return purchaseRequests.filter(
      (r) =>
        myRequestIds.has(r.id) &&
        (['pending_manager', 'pending_director'] as PurchaseRequestStatus[]).includes(r.status)
    );
  }, [purchaseRequests, myRequestIds]);

  const pedidosAguardandoAlcada = useMemo(() => {
    return purchaseOrders.filter((o) => {
      const sa = o.statusAprovacao ?? 'pendente';
      if (sa !== 'pendente' && sa !== 'em_revisao') return false;
      if (!o.compradorId) return false;
      if (relaxedBuyerScope) return true;
      return o.compradorId === currentUser?.id;
    });
  }, [purchaseOrders, currentUser, relaxedBuyerScope]);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando…</CardContent>
      </Card>
    );
  }

  const defaultTab =
    scAguardandoGestao.length > pedidosAguardandoAlcada.length ? 'sc' : 'pedidos';

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Fila de aprovações</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Duas filas distintas: pedidos de compra (PC) aguardando alçada e solicitações (SC) aguardando gestão ou
          diretoria antes de seguir no fluxo.
        </p>
      </header>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="pedidos" className="flex-1 min-w-[140px] sm:flex-none">
            Pedidos ({pedidosAguardandoAlcada.length})
          </TabsTrigger>
          <TabsTrigger value="sc" className="flex-1 min-w-[140px] sm:flex-none">
            Solicitações ({scAguardandoGestao.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos" className="focus-visible:outline-none">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Pedidos aguardando liberação</CardTitle>
              <CardDescription>Status de aprovação: pendente ou em revisão.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead>Comprador</TableHead>
                    <TableHead>Emissão</TableHead>
                    <TableHead className="w-[100px]">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pedidosAguardandoAlcada.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                        Nenhum pedido aguardando alçada no seu escopo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pedidosAguardandoAlcada.map((o) => {
                      const created =
                        o.createdAt instanceof Date
                          ? o.createdAt
                          : new Date(o.createdAt as unknown as string);
                      const comprador = o.compradorId ? getUserById(o.compradorId) : undefined;
                      return (
                        <TableRow key={o.id}>
                          <TableCell className="font-medium">
                            {o.numeroOmie ?? o.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(o.valorTotal)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-[#3F76FF] text-white border-transparent">
                              {o.statusAprovacao === 'em_revisao' ? 'Em revisão' : 'Pendente'}
                            </Badge>
                          </TableCell>
                          <TableCell>{comprador?.name ?? '—'}</TableCell>
                          <TableCell>{format(created, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                          <TableCell>
                            {onOpenOrder && (
                              <Button
                                type="button"
                                variant="link"
                                className="h-auto p-0 text-primary"
                                onClick={() => onOpenOrder(o.id)}
                              >
                                Abrir pedido
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sc" className="focus-visible:outline-none">
          <Card className="border-border/60 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Solicitações aguardando gestão</CardTitle>
              <CardDescription>Gestor ou diretoria ainda não liberaram a etapa seguinte.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SC</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Emissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scAguardandoGestao.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        Nenhuma solicitação aguardando gestão no seu escopo.
                      </TableCell>
                    </TableRow>
                  ) : (
                    scAguardandoGestao.map((r) => {
                      const created =
                        r.createdAt instanceof Date
                          ? r.createdAt
                          : new Date(r.createdAt as unknown as string);
                      const sol = getUserById(r.solicitanteId);
                      return (
                        <TableRow key={r.id}>
                          <TableCell className="font-mono text-xs">{r.id.slice(0, 8)}…</TableCell>
                          <TableCell>{sol?.name ?? '—'}</TableCell>
                          <TableCell>
                            <PurchaseRequestStatusBadge status={r.status} />
                          </TableCell>
                          <TableCell>{format(created, 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
