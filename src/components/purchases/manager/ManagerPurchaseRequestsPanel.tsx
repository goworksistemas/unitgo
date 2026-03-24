import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PurchaseRequestStatusBadge } from '../shared/PurchaseRequestStatusBadge';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function ManagerPurchaseRequestsPanel() {
  const { currentUser, currentUnit, getUserById, getUnitById } = useApp();
  const {
    purchaseRequests,
    isLoadingPurchases,
    approvePurchaseRequestManager,
    rejectPurchaseRequestManager,
  } = usePurchases();
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    requestId: string;
    action: 'approve' | 'reject';
  }>({ open: false, requestId: '', action: 'approve' });
  const [justificativa, setJustificativa] = useState('');

  const pendingRequests = useMemo(() => {
    if (!currentUser || !currentUnit) return [];
    return purchaseRequests.filter(
      (r) =>
        r.status === 'pending_manager' &&
        r.unidadeId === currentUnit.id &&
        r.solicitanteId !== currentUser.id
    );
  }, [purchaseRequests, currentUser, currentUnit]);

  const handleReview = async () => {
    if (!currentUser) return;
    const { requestId, action } = reviewDialog;
    if (action === 'reject' && justificativa.trim().length < 10) {
      toast.error('Justificativa obrigatória com mínimo 10 caracteres');
      return;
    }

    if (action === 'approve') {
      await approvePurchaseRequestManager(requestId, currentUser.id, currentUser.name);
    } else {
      await rejectPurchaseRequestManager(requestId, currentUser.id, currentUser.name, justificativa.trim());
    }
    setReviewDialog({ open: false, requestId: '', action: 'approve' });
    setJustificativa('');
  };

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fila para sua análise</CardTitle>
        <CardDescription>
          Pedidos da equipe da unidade aguardando sua decisão antes do comprador
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingRequests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma solicitação pendente de aprovação
          </p>
        ) : (
          <div className="space-y-4">
            {pendingRequests.map((req) => {
              const solicitante = getUserById(req.solicitanteId);
              const unidade = getUnitById(req.unidadeId);
              return (
                <div
                  key={req.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">#{req.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Solicitante: {solicitante?.name ?? '—'} | Unidade: {unidade?.name ?? '—'}
                    </p>
                    <p className="text-sm mt-1">{req.justificativa}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {req.itens.length} item(ns) • {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => setReviewDialog({ open: true, requestId: req.id, action: 'approve' })}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" /> Aprovar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setReviewDialog({ open: true, requestId: req.id, action: 'reject' })}
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Rejeitar
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={reviewDialog.open} onOpenChange={(o) => !o && setReviewDialog({ open: false, requestId: '', action: 'approve' })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {reviewDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'} Solicitação
              </DialogTitle>
              <DialogDescription>
                {reviewDialog.action === 'reject'
                  ? 'Informe o motivo da rejeição (obrigatório, mínimo 10 caracteres).'
                  : 'Confirme a aprovação da solicitação.'}
              </DialogDescription>
            </DialogHeader>
            {reviewDialog.action === 'reject' && (
              <div className="space-y-2">
                <Label>Justificativa *</Label>
                <Textarea
                  placeholder="Motivo da rejeição..."
                  value={justificativa}
                  onChange={(e) => setJustificativa(e.target.value)}
                  rows={3}
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewDialog({ open: false, requestId: '', action: 'approve' })}>
                Cancelar
              </Button>
              <Button
                onClick={handleReview}
                disabled={reviewDialog.action === 'reject' && justificativa.trim().length < 10}
                variant={reviewDialog.action === 'reject' ? 'destructive' : 'default'}
              >
                {reviewDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
