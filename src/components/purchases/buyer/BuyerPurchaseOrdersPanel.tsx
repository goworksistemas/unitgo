import { useMemo } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PurchaseOrderStatus } from '@/types/purchases';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  created: { label: 'Criado', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  awaiting_nf: { label: 'Aguardando NF', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  nf_issued: { label: 'NF Emitida', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  in_transit: { label: 'Em Trânsito', className: 'bg-purple-50 text-purple-700 border-purple-300' },
  partially_received: { label: 'Parcialmente Recebido', className: 'bg-orange-50 text-orange-700 border-orange-300' },
  fully_received: { label: 'Recebido', className: 'bg-green-50 text-green-700 border-green-300' },
};

export function BuyerPurchaseOrdersPanel() {
  const { purchaseOrders, quotations, suppliers, isLoadingPurchases } = usePurchases();

  const sortedOrders = useMemo(
    () => [...purchaseOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [purchaseOrders]
  );

  const getSupplierForOrder = (order: typeof purchaseOrders[0]) => {
    const quotation = quotations.find((q) => q.id === order.cotacaoId);
    if (!quotation) return '—';
    return suppliers.find((s) => s.id === quotation.fornecedorId)?.razaoSocial ?? '—';
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoadingPurchases) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pedidos de Compra
        </CardTitle>
        <CardDescription>{sortedOrders.length} pedido(s) registrado(s)</CardDescription>
      </CardHeader>
      <CardContent>
        {sortedOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum pedido criado</p>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos são criados a partir de cotações aprovadas
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOrders.map((order) => {
              const statusConfig = STATUS_CONFIG[order.status];
              return (
                <div key={order.id} className="rounded-lg border p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium">Pedido #{order.id.slice(0, 8)}</span>
                      {order.numeroOmie && (
                        <span className="ml-2 text-muted-foreground">Omie: {order.numeroOmie}</span>
                      )}
                    </div>
                    <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>{' '}
                      <span className="font-medium">{getSupplierForOrder(order)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Valor:</span>{' '}
                      <span className="font-medium">{fmt(order.valorTotal)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criado:</span>{' '}
                      {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  {order.notasFiscais.length > 0 && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">NFs:</span>{' '}
                      {order.notasFiscais.map((nf) => nf.numero).join(', ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
