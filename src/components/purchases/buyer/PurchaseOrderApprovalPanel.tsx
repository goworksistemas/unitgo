import { useMemo, useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, FileText, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { PurchaseOrder, Quotation } from '@/types/purchases';

const MAX_ITENS_RESUMO = 3;

function getItemResumo(quotation: Quotation | undefined): string {
  if (!quotation?.itens?.length) return 'Sem itens';
  const linhas = quotation.itens.slice(0, MAX_ITENS_RESUMO).map(
    (i) => `${i.descricao} (${i.quantidade} ${i.unidadeMedida})`
  );
  const resto = quotation.itens.length - MAX_ITENS_RESUMO;
  if (resto > 0) {
    linhas.push(`e mais ${resto} item(ns)`);
  }
  return linhas.join('\n');
}

export function PurchaseOrderApprovalPanel() {
  const {
    purchaseOrders,
    quotations,
    suppliers,
    approveOrder,
    rejectOrder,
    refreshPurchases,
    isLoadingPurchases,
  } = usePurchases();
  const { currentUser } = useApp();
  const [rejectingOrder, setRejectingOrder] = useState<PurchaseOrder | null>(null);
  const [observacao, setObservacao] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pedidosPendentes = useMemo(() => {
    if (!currentUser?.id) return [];
    return purchaseOrders.filter(
      (o) =>
        (o.statusAprovacao === 'pendente' || o.statusAprovacao === undefined) &&
        o.aprovadorNecessarioId === currentUser.id
    );
  }, [purchaseOrders, currentUser?.id]);

  const getSupplierForOrder = (order: PurchaseOrder) => {
    const quotation = quotations.find((q) => q.id === order.cotacaoId);
    if (!quotation) return '—';
    return suppliers.find((s) => s.id === quotation.fornecedorId)?.razaoSocial ?? '—';
  };

  const getQuotationForOrder = (order: PurchaseOrder) =>
    quotations.find((q) => q.id === order.cotacaoId);

  const getCompradorName = (_order: PurchaseOrder) => {
    return 'Comprador'; // TODO: resolver nome via users quando disponível
  };

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleAprovar = async (order: PurchaseOrder) => {
    if (!currentUser?.id) return;
    setIsSubmitting(true);
    try {
      await approveOrder(order.id, currentUser.id, currentUser.name ?? 'Aprovador');
      await refreshPurchases();
      toast.success('Pedido aprovado');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao aprovar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbrirReprovar = (order: PurchaseOrder) => {
    setRejectingOrder(order);
    setObservacao('');
  };

  const handleFecharReprovar = () => {
    setRejectingOrder(null);
    setObservacao('');
  };

  const handleConfirmarReprovar = async () => {
    if (!rejectingOrder || !currentUser?.id || !observacao.trim()) return;
    setIsSubmitting(true);
    try {
      await rejectOrder(
        rejectingOrder.id,
        currentUser.id,
        currentUser.name ?? 'Aprovador',
        observacao.trim()
      );
      await refreshPurchases();
      toast.success('Pedido reprovado');
      handleFecharReprovar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reprovar');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Aprovações Financeiras
          </CardTitle>
          <CardDescription>
            {pedidosPendentes.length} pedido(s) aguardando sua aprovação
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pedidosPendentes.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum pedido pendente de aprovação</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosPendentes.map((order) => {
                const quotation = getQuotationForOrder(order);
                const supplier = getSupplierForOrder(order);
                const itensResumo = getItemResumo(quotation);
                return (
                  <div
                    key={order.id}
                    className="rounded-lg border p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-medium">Pedido #{order.id.slice(0, 8)}</span>
                        {order.numeroOmie && (
                          <span className="ml-2 text-muted-foreground">Omie: {order.numeroOmie}</span>
                        )}
                      </div>
                      <span className="font-semibold text-lg">{fmt(order.valorTotal)}</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Fornecedor:</span>{' '}
                        <span className="font-medium">{supplier}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Comprador:</span>{' '}
                        {getCompradorName(order)}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Criado:</span>{' '}
                        {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Itens:</span>
                      <pre className="mt-1 text-xs whitespace-pre-wrap font-sans">{itensResumo}</pre>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => handleAprovar(order)}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        )}
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleAbrirReprovar(order)}
                        disabled={isSubmitting}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reprovar
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!rejectingOrder} onOpenChange={(open) => !open && handleFecharReprovar()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reprovar pedido</DialogTitle>
            <DialogDescription>
              A observação é obrigatória para reprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="observacao">Observação</Label>
            <Textarea
              id="observacao"
              placeholder="Motivo da reprovação..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleFecharReprovar} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmarReprovar}
              disabled={!observacao.trim() || isSubmitting}
            >
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar reprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
