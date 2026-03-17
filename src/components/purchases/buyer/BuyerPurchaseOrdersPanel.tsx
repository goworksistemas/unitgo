import { useMemo, useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { useApp } from '@/contexts/AppContext';
import { api } from '@/utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Package, Database, RefreshCw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { OrderApprovalTimeline } from '../shared/OrderApprovalTimeline';
import type { PurchaseOrder, PurchaseOrderStatus, Quotation } from '@/types/purchases';

const STATUS_CONFIG: Record<PurchaseOrderStatus, { label: string; className: string }> = {
  created: { label: 'Criado', className: 'bg-muted text-muted-foreground border-border' },
  awaiting_nf: { label: 'Aguardando NF', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  nf_issued: { label: 'NF Emitida', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  in_transit: { label: 'Em Trânsito', className: 'bg-purple-50 text-purple-700 border-purple-300' },
  partially_received: { label: 'Parcialmente Recebido', className: 'bg-orange-50 text-orange-700 border-orange-300' },
  fully_received: { label: 'Recebido', className: 'bg-green-50 text-green-700 border-green-300' },
};

const STATUS_APROVACAO_CONFIG: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente aprovação', className: 'bg-amber-50 text-amber-700 border-amber-300' },
  aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-300' },
  reprovado: { label: 'Reprovado', className: 'bg-red-50 text-red-700 border-red-300' },
  em_revisao: { label: 'Em revisão', className: 'bg-blue-50 text-blue-700 border-blue-300' },
};

const MAX_ITENS_RESUMO = 3;

function getItemResumo(quotations: { itens?: { descricao: string; quantidade: number; unidadeMedida: string }[] }[], order: PurchaseOrder): string {
  const quotation = quotations.find((q) => (q as { id?: string }).id === order.cotacaoId);
  const itens = (quotation as { itens?: { descricao: string; quantidade: number; unidadeMedida: string }[] })?.itens;
  if (!itens?.length) return 'Sem itens';
  const linhas = itens.slice(0, MAX_ITENS_RESUMO).map((i) => `${i.descricao} (${i.quantidade} ${i.unidadeMedida})`);
  const resto = itens.length - MAX_ITENS_RESUMO;
  if (resto > 0) linhas.push(`e mais ${resto} item(ns)`);
  return linhas.join('\n');
}

function getUltimaObservacaoReprovador(order: PurchaseOrder): string | undefined {
  const reprovacao = order.approvals?.slice().reverse().find((a) => a.acao === 'reprovado');
  return reprovacao?.observacao;
}

export function BuyerPurchaseOrdersPanel() {
  const {
    purchaseOrders,
    quotations,
    suppliers,
    isLoadingPurchases,
    refreshPurchases,
    resendOrderForApproval,
  } = usePurchases();
  const { currentUser } = useApp();
  const [isSeeding, setIsSeeding] = useState(false);
  const [orderParaReenviar, setOrderParaReenviar] = useState<PurchaseOrder | null>(null);
  const [isReenviando, setIsReenviando] = useState(false);

  const sortedOrders = useMemo(
    () => [...purchaseOrders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [purchaseOrders]
  );

  const handleSeedPurchases = async () => {
    setIsSeeding(true);
    try {
      await api.purchases.seed();
      toast.success('Dados de compras populados com sucesso');
      await refreshPurchases();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { details?: { error?: string } })?.details?.error ?? 'Erro ao popular dados';
      toast.error(msg);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleSolicitarReenvio = (order: PurchaseOrder) => {
    const status = order.statusAprovacao ?? 'pendente';
    if (status === 'aprovado' || status === 'reprovado') {
      setOrderParaReenviar(order);
    }
  };

  const handleConfirmarReenvio = async () => {
    if (!orderParaReenviar || !currentUser?.id) return;
    setIsReenviando(true);
    try {
      await resendOrderForApproval(orderParaReenviar.id, currentUser.id);
      await refreshPurchases();
      toast.success('Pedido reenviado para aprovação');
      setOrderParaReenviar(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao reenviar');
    } finally {
      setIsReenviando(false);
    }
  };

  const getSupplierForOrder = (order: PurchaseOrder) => {
    const quotation = quotations.find((q) => q.id === order.cotacaoId);
    if (!quotation) return '—';
    return suppliers.find((s) => s.id === quotation.fornecedorId)?.razaoSocial ?? '—';
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const podeReenviar = (order: PurchaseOrder) => {
    const status = order.statusAprovacao ?? 'pendente';
    return (status === 'aprovado' || status === 'reprovado') && order.compradorId === currentUser?.id;
  };

  if (isLoadingPurchases) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <>
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
              <Button variant="outline" className="mt-4" onClick={handleSeedPurchases} disabled={isSeeding}>
                <Database className="h-4 w-4 mr-2" />
                {isSeeding ? 'Populando...' : 'Popular dados de demonstração'}
              </Button>
            </div>
          ) : (
            <Accordion type="single" collapsible className="space-y-2">
              {sortedOrders.map((order) => {
                const statusConfig = STATUS_CONFIG[order.status];
                const statusAprovConfig = STATUS_APROVACAO_CONFIG[order.statusAprovacao ?? 'pendente'] ?? STATUS_APROVACAO_CONFIG.pendente;
                const observacaoReprov = getUltimaObservacaoReprovador(order);
                const itensResumo = getItemResumo(quotations, order);
                return (
                  <AccordionItem key={order.id} value={order.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="text-left space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium">Pedido #{order.id.slice(0, 8)}</span>
                            {order.numeroOmie && (
                              <span className="text-muted-foreground text-sm">Omie: {order.numeroOmie}</span>
                            )}
                            <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
                            <Badge variant="outline" className={statusAprovConfig.className}>{statusAprovConfig.label}</Badge>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-0 text-sm text-muted-foreground">
                            <span>Fornecedor: <span className="font-medium text-foreground">{getSupplierForOrder(order)}</span></span>
                            <span>Valor: <span className="font-medium text-foreground">{fmt(order.valorTotal)}</span></span>
                            <span>Criado: {format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
                          </div>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      {order.notasFiscais?.length > 0 && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">NFs:</span>{' '}
                          {order.notasFiscais.map((nf) => nf.numero).join(', ')}
                        </div>
                      )}
                      <div className="text-sm">
                        <span className="text-muted-foreground">Resumo dos itens:</span>
                        <pre className="mt-1 text-xs whitespace-pre-wrap font-sans">{itensResumo}</pre>
                      </div>
                      {observacaoReprov && (
                        <div className="text-sm p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                          <span className="text-muted-foreground">Observação do reprovador:</span>
                          <p className="mt-1 italic">&quot;{observacaoReprov}&quot;</p>
                        </div>
                      )}
                      {order.approvals && order.approvals.length > 0 && (
                        <div>
                          <h4 className="text-sm font-medium mb-2">Aprovações</h4>
                          <OrderApprovalTimeline approvals={order.approvals} />
                        </div>
                      )}
                      {podeReenviar(order) && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSolicitarReenvio(order)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Reenviar para aprovação
                        </Button>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!orderParaReenviar} onOpenChange={(open) => !open && setOrderParaReenviar(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar pedido aprovado</DialogTitle>
            <DialogDescription>
              Editar este pedido irá devolvê-lo para aprovação.
              O histórico de aprovações anteriores será preservado.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOrderParaReenviar(null)} disabled={isReenviando}>
              Cancelar
            </Button>
            <Button onClick={handleConfirmarReenvio} disabled={isReenviando}>
              {isReenviando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
