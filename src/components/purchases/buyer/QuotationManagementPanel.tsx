import { useMemo, useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, Plus, Send, Database } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { QuotationStatus } from '@/types/purchases';

const STATUS_LABELS: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Enviada', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  responded: { label: 'Respondida', className: 'bg-green-50 text-green-700 border-green-300' },
  approved: { label: 'Aprovada', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Rejeitada', className: 'bg-red-50 text-red-700 border-red-300' },
};

interface QuotationManagementPanelProps {
  onNavigateToCreate?: (solicitacaoId?: string) => void;
  onNavigateToDetail?: (quotationId: string) => void;
}

export function QuotationManagementPanel({
  onNavigateToCreate,
  onNavigateToDetail,
}: QuotationManagementPanelProps) {
  const {
    quotations,
    suppliers,
    purchaseRequests,
    isLoadingPurchases,
    refreshPurchases,
    updateQuotationStatus,
  } = usePurchases();

  const [isSeeding, setIsSeeding] = useState(false);

  const quotationsBySolicitacao = useMemo(() => {
    const map = new Map<string, typeof quotations>();
    for (const q of quotations) {
      const list = map.get(q.solicitacaoId) ?? [];
      list.push(q);
      map.set(q.solicitacaoId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return map;
  }, [quotations]);

  const approvedRequests = useMemo(
    () => purchaseRequests.filter((r) => r.status === 'in_quotation'),
    [purchaseRequests]
  );

  const solicitacoesComCotacoes = useMemo(() => {
    const ids = new Set(quotations.map((q) => q.solicitacaoId));
    return purchaseRequests
      .filter((r) => ids.has(r.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [quotations, purchaseRequests]);

  const getSupplierName = (id: string) =>
    suppliers.find((s) => s.id === id)?.razaoSocial ?? '—';
  const getRequestCode = (id: string) =>
    purchaseRequests.find((r) => r.id === id)?.id.slice(0, 8) ?? '—';

  const handleSeedPurchases = async () => {
    setIsSeeding(true);
    try {
      await api.purchases.seed();
      toast.success('Dados de compras populados com sucesso');
      await refreshPurchases();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { details?: { error?: string } })?.details?.error ?? 'Erro ao popular dados';
      toast.error(msg);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleEnviarParaFornecedor = async (q: (typeof quotations)[0]) => {
    try {
      await updateQuotationStatus(q.id, 'sent', {
        linkPreenchimento: crypto.randomUUID(),
      });
      await refreshPurchases();
      toast.success('Cotação enviada. Link gerado.');
    } catch {
      toast.error('Erro ao enviar cotação');
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cotações
            </CardTitle>
            <CardDescription>
              {quotations.length} cotação(ões) registrada(s)
            </CardDescription>
          </div>
          <Button
            onClick={() => onNavigateToCreate?.()}
            disabled={approvedRequests.length === 0}
          >
            <Plus className="h-4 w-4 mr-2" /> Nova Cotação
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {quotations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma cotação criada</p>
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-3">
              {approvedRequests.length > 0 && (
                <Button variant="outline" onClick={() => onNavigateToCreate?.()}>
                  <Plus className="h-4 w-4 mr-2" /> Criar primeira cotação
                </Button>
              )}
              <Button variant="outline" onClick={handleSeedPurchases} disabled={isSeeding}>
                <Database className="h-4 w-4 mr-2" />
                {isSeeding ? 'Populando...' : 'Popular dados de demonstração'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {solicitacoesComCotacoes.map((req) => {
              const cots = quotationsBySolicitacao.get(req.id) ?? [];
              const fornecedoresCount = new Set(cots.map((c) => c.fornecedorId)).size;
              return (
                <div key={req.id} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>Solicitação #{getRequestCode(req.id)}</span>
                    <Badge variant="outline" className="text-xs">
                      {fornecedoresCount} fornecedor(es)
                    </Badge>
                  </div>
                  <div className="space-y-2 pl-2 border-l-2 border-muted">
                    {cots.map((q) => {
                      const statusConfig = STATUS_LABELS[q.status];
                      const valorTotal =
                        q.totalGeral ??
                        q.itens.reduce(
                          (s, i) => s + ((i.precoUnitario ?? 0) * i.quantidade),
                          0
                        );
                      return (
                        <div
                          key={q.id}
                          className="rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => onNavigateToDetail?.(q.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onNavigateToDetail?.(q.id);
                            }
                          }}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                Cotação #{q.id.slice(0, 8)}
                              </span>
                              <Badge variant="outline" className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                              <span className="text-muted-foreground">
                                {getSupplierName(q.fornecedorId)}
                              </span>
                            </div>
                            {q.status === 'draft' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEnviarParaFornecedor(q);
                                }}
                              >
                                <Send className="h-4 w-4 mr-1" /> Enviar para fornecedor
                              </Button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                            <div>
                              <span className="text-muted-foreground">Valor total:</span>{' '}
                              <span className="font-medium">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL',
                                }).format(valorTotal)}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Prazo:</span>{' '}
                              {q.prazoEntrega ?? '—'} dias
                            </div>
                            <div>
                              <span className="text-muted-foreground">Previsão:</span>{' '}
                              {q.dataPrevisaoEntrega
                                ? format(new Date(q.dataPrevisaoEntrega), 'dd/MM/yyyy', {
                                    locale: ptBR,
                                  })
                                : '—'}
                            </div>
                            <div>
                              <span className="text-muted-foreground">Criada:</span>{' '}
                              {format(new Date(q.createdAt), 'dd/MM/yyyy', {
                                locale: ptBR,
                              })}
                            </div>
                          </div>
                          {q.status === 'sent' && q.linkPreenchimento && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Link: ...{q.linkPreenchimento.slice(-8)}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
