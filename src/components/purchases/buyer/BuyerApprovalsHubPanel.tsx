import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
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

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Central de Aprovações</h2>
        <p className="text-sm text-muted-foreground">
          O que está aguardando aprovação de gestão/diretoria (SCs) ou alçada de pedido (PC).
        </p>
      </div>

      <Tabs defaultValue="pedidos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pedidos">
            Pedidos ({pedidosAguardandoAlcada.length})
          </TabsTrigger>
          <TabsTrigger value="sc">Solicitações ({scAguardandoGestao.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pedidos">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pedidos aguardando aprovação</CardTitle>
              <CardDescription>Status aprovação: pendente ou em revisão</CardDescription>
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
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum pedido nesta fila.
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
                              <button
                                type="button"
                                className="text-sm text-[#3F76FF] hover:underline"
                                onClick={() => onOpenOrder(o.id)}
                              >
                                Abrir
                              </button>
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

        <TabsContent value="sc">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SCs aguardando aprovação</CardTitle>
              <CardDescription>Fluxo gestor / diretoria antes de liberar cotação</CardDescription>
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
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Nenhuma SC nesta fila.
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
