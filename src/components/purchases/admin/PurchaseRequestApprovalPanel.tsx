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
import { ContractProgressBar } from '../shared/ContractProgressBar';
import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

export function PurchaseRequestApprovalPanel() {
  const { currentUser, getUserById, getUnitById } = useApp();
  const {
    purchaseRequests,
    contracts,
    isLoadingPurchases,
    approvePurchaseRequestDirector,
    rejectPurchaseRequestDirector,
  } = usePurchases();
  const [reviewDialog, setReviewDialog] = useState<{
    open: boolean;
    requestId: string;
    action: 'approve' | 'reject';
  }>({ open: false, requestId: '', action: 'approve' });
  const [justificativa, setJustificativa] = useState('');

  const pendingDirector = useMemo(() => {
    return purchaseRequests.filter((r) => r.status === 'pending_director');
  }, [purchaseRequests]);

  const getContractById = (id: string) => contracts.find((c) => c.id === id);

  const canApprove = (req: (typeof pendingDirector)[0]) => {
    if (!req.contratoId) return true;
    const contract = getContractById(req.contratoId);
    if (!contract) return true;
    return contract.saldo > 0;
  };

  const handleReview = async () => {
    if (!currentUser) return;
    const { requestId, action } = reviewDialog;
    if (action === 'reject' && justificativa.trim().length < 10) {
      toast.error('Justificativa obrigatória com mínimo 10 caracteres');
      return;
    }

    if (action === 'approve') {
      await approvePurchaseRequestDirector(requestId, currentUser.id, currentUser.name);
    } else {
      await rejectPurchaseRequestDirector(requestId, currentUser.id, currentUser.name, justificativa.trim());
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
        <CardTitle>Solicitações Pendentes (Diretoria)</CardTitle>
        <CardDescription>Aprove ou rejeite solicitações já aprovadas pelo gestor (2ª camada)</CardDescription>
      </CardHeader>
      <CardContent>
        {pendingDirector.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Nenhuma solicitação pendente de aprovação da diretoria
          </p>
        ) : (
          <div className="space-y-4">
            {pendingDirector.map((req) => {
              const solicitante = getUserById(req.solicitanteId);
              const unidade = getUnitById(req.unidadeId);
              const contract = req.contratoId ? getContractById(req.contratoId) : null;
              const blocked = !canApprove(req);

              return (
                <div
                  key={req.id}
                  className={`flex flex-col gap-4 p-4 rounded-lg border ${blocked ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                        disabled={blocked}
                        onClick={() => setReviewDialog({ open: true, requestId: req.id, action: 'approve' })}
                        title={blocked ? 'Saldo do contrato insuficiente' : ''}
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
                  {contract && (
                    <div className="text-sm">
                      <p className="font-medium mb-1">Contrato: {contract.nome}</p>
                      <ContractProgressBar valorTotal={contract.valorTotal} valorConsumido={contract.valorConsumido} />
                      {blocked && (
                        <p className="text-amber-600 dark:text-amber-400 text-xs mt-1">
                          Saldo insuficiente para aprovar
                        </p>
                      )}
                    </div>
                  )}
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
