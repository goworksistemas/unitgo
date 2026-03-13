import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PurchaseRequestStatusBadge } from '../shared/PurchaseRequestStatusBadge';
import { ApprovalTimeline } from '../shared/ApprovalTimeline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Plus, ChevronDown, ChevronUp, Database } from 'lucide-react';
import { toast } from 'sonner';

export function ApprovedPurchaseRequestsPanel() {
  const { getUserById, getUnitById } = useApp();
  const { purchaseRequests, isLoadingPurchases, refreshPurchases } = usePurchases();
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const approvedRequests = useMemo(
    () =>
      purchaseRequests
        .filter(
          (r) =>
            r.status === 'in_quotation' ||
            r.status === 'quotation_completed' ||
            r.status === 'in_purchase'
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [purchaseRequests]
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

  if (isLoadingPurchases) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solicitações Aprovadas
            </CardTitle>
            <CardDescription>
              {approvedRequests.length} solicitação(ões) aprovadas aguardando cotação/pedido
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvedRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma solicitação aprovada no momento</p>
            <p className="text-xs text-muted-foreground mt-1">
              As solicitações aparecerão aqui após aprovação da diretoria
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleSeedPurchases}
              disabled={isSeeding}
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? 'Populando...' : 'Popular dados de demonstração'}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedRequests.map((req) => {
              const solicitante = getUserById(req.solicitanteId);
              const unidade = getUnitById(req.unidadeId);
              const isExpanded = expandedId === req.id;

              return (
                <div key={req.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">#{req.id.slice(0, 8)}</span>
                        <PurchaseRequestStatusBadge status={req.status} />
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {solicitante?.name ?? '—'} • {unidade?.name ?? '—'} •{' '}
                        {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {req.status === 'in_quotation' && (
                        <Button size="sm" variant="outline">
                          <Plus className="h-4 w-4 mr-1" /> Criar Cotação
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setExpandedId(isExpanded ? null : req.id)}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="space-y-3 pt-2 border-t">
                      <p className="text-sm">
                        <span className="font-medium">Justificativa:</span> {req.justificativa}
                      </p>
                      <div>
                        <p className="text-sm font-medium mb-2">Itens ({req.itens.length}):</p>
                        <div className="rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/50">
                                <th className="text-left p-2 font-medium">Descrição</th>
                                <th className="text-center p-2 font-medium w-20">Qtd</th>
                                <th className="text-center p-2 font-medium w-16">Und</th>
                                <th className="text-left p-2 font-medium">Obs</th>
                              </tr>
                            </thead>
                            <tbody>
                              {req.itens.map((item) => (
                                <tr key={item.id} className="border-b last:border-0">
                                  <td className="p-2">{item.descricao}</td>
                                  <td className="p-2 text-center">{item.quantidade}</td>
                                  <td className="p-2 text-center">{item.unidadeMedida}</td>
                                  <td className="p-2 text-muted-foreground">{item.observacao || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {req.aprovacoes.length > 0 && (
                        <div>
                          <p className="text-sm font-medium mb-2">Aprovações:</p>
                          <ApprovalTimeline aprovacoes={req.aprovacoes} />
                        </div>
                      )}
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
