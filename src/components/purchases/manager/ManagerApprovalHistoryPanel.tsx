import { useMemo } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PurchaseRequestStatusBadge } from '../shared/PurchaseRequestStatusBadge';
import { ApprovalTimeline } from '../shared/ApprovalTimeline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function ManagerApprovalHistoryPanel() {
  const { currentUser } = useApp();
  const { purchaseRequests, isLoadingPurchases } = usePurchases();

  const history = useMemo(() => {
    if (!currentUser) return [];
    return purchaseRequests
      .filter((r) => r.aprovacoes.some((a) => a.userId === currentUser.id))
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [purchaseRequests, currentUser]);

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Aprovações</CardTitle>
        <CardDescription>Decisões tomadas por você em solicitações de compra</CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma decisão registrada</p>
        ) : (
          <div className="space-y-4">
            {history.map((req) => (
              <div key={req.id} className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">#{req.id.slice(0, 8)}</span>
                  <PurchaseRequestStatusBadge status={req.status} />
                </div>
                <p className="text-sm">{req.justificativa}</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <ApprovalTimeline aprovacoes={req.aprovacoes.filter((a) => a.userId === currentUser?.id)} />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
