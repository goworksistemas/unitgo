import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle, Sofa, XCircle, Building2, MapPin, Clock, User } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import type { FurnitureRequestToDesigner } from '@/types';

export function FurnitureRequestsPanel() {
  const { currentUser, furnitureRequestsToDesigner, updateFurnitureRequestToDesigner, getItemById, getUnitById, getUserById } = useApp();
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; requestId: string; action: 'approve' | 'reject' }>({
    open: false,
    requestId: '',
    action: 'approve',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [observations, setObservations] = useState('');

  const { pendingRequests, approvedRequests, completedRequests } = useMemo(() => {
    const pending = furnitureRequestsToDesigner.filter((r) => r.status === 'pending_designer');
    const approved = furnitureRequestsToDesigner.filter(
      (r) =>
        r.status === 'approved_designer' ||
        r.status === 'approved_storage' ||
        r.status === 'awaiting_delivery' ||
        r.status === 'in_transit'
    );
    const completed = furnitureRequestsToDesigner.filter(
      (r) => r.status === 'completed' || r.status === 'rejected'
    );
    return { pendingRequests: pending, approvedRequests: approved, completedRequests: completed };
  }, [furnitureRequestsToDesigner]);

  const handleReview = () => {
    if (!currentUser) return;

    const { requestId, action } = reviewDialog;

    if (action === 'reject' && !rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    const updates: Partial<FurnitureRequestToDesigner> = {
      reviewedByDesignerId: currentUser.id,
      reviewedAt: new Date(),
    };

    if (action === 'approve') {
      updates.status = 'approved_designer';
      updates.observations = observations.trim() || undefined;

      toast.success('Solicitação aprovada!', {
        description: 'Encaminhada ao almoxarifado para separação e entrega.',
      });
    } else {
      updates.status = 'rejected';
      updates.rejectionReason = rejectionReason.trim();

      toast.success('Solicitação rejeitada', {
        description: 'O controlador da unidade pode ver o motivo no histórico.',
      });
    }

    updateFurnitureRequestToDesigner(requestId, updates);

    setReviewDialog({ open: false, requestId: '', action: 'approve' });
    setRejectionReason('');
    setObservations('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_designer':
        return (
          <Badge
            variant="outline"
            className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700"
          >
            Aguardando análise
          </Badge>
        );
      case 'approved_designer':
        return (
          <Badge
            variant="outline"
            className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700"
          >
            Aprovado por você
          </Badge>
        );
      case 'approved_storage':
        return (
          <Badge
            variant="outline"
            className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700"
          >
            Aguardando entrega
          </Badge>
        );
      case 'awaiting_delivery':
        return (
          <Badge
            variant="outline"
            className="bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
          >
            No almoxarifado
          </Badge>
        );
      case 'in_transit':
        return (
          <Badge
            variant="outline"
            className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700"
          >
            Em trânsito
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground border-border">
            Concluído
          </Badge>
        );
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const RequestCard = ({ request }: { request: (typeof furnitureRequestsToDesigner)[0] }) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.requestingUnitId);
    const requester = getUserById(request.requestedByUserId);
    const reviewer = request.reviewedByDesignerId ? getUserById(request.reviewedByDesignerId) : null;

    if (!item || !unit || !requester) return null;

    return (
      <div className="border rounded-xl p-4 bg-card shadow-sm hover:border-border transition-colors">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sofa className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              <h4 className="font-medium text-foreground leading-snug">{item.name}</h4>
            </div>
            {item.brand && (
              <p className="text-xs text-muted-foreground">
                {item.brand}
                {item.model && ` · ${item.model}`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            {getStatusBadge(request.status)}
            <Badge variant="secondary">Qtd. {request.quantity}</Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{unit.name}</span>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{request.location}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>{requester.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span>Solicitado em {formatDate(request.createdAt)}</span>
          </div>
        </div>

        <div className="mt-3 p-3 bg-muted/60 rounded-lg border border-border/80">
          <p className="text-xs font-medium text-foreground mb-1">Justificativa do pedido</p>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{request.justification}</p>
        </div>

        {request.status === 'rejected' && request.rejectionReason && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Motivo da rejeição:</strong> {request.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {reviewer && request.reviewedAt && (
          <div className="mt-3 text-xs text-muted-foreground">
            Avaliado por {reviewer.name} em {formatDate(request.reviewedAt)}
          </div>
        )}

        {request.status === 'pending_designer' && (
          <div className="flex flex-col-reverse sm:flex-row gap-2 mt-4">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setReviewDialog({ open: true, requestId: request.id, action: 'reject' })}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
              type="button"
              size="sm"
              className="flex-1"
              onClick={() => setReviewDialog({ open: true, requestId: request.id, action: 'approve' })}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Aprovar
            </Button>
          </div>
        )}
      </div>
    );
  };

  const emptyMessage = (message: string) => (
    <div className="text-center py-12 text-muted-foreground text-sm rounded-lg border border-dashed border-border">
      {message}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pedidos de móveis das unidades</CardTitle>
          <CardDescription>
            Controladores enviam pedidos de itens do almoxarifado para uso na unidade. Comece pela aba{' '}
            <strong className="text-foreground font-medium">Pendentes</strong> — é onde precisa da sua decisão.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0 scrollbar-hide mb-4">
              <TabsList className="inline-flex h-auto w-max min-w-full sm:w-full sm:grid sm:grid-cols-3 gap-1 rounded-lg bg-muted/60 p-1">
                <TabsTrigger value="pending" className="rounded-md px-3 py-2.5 text-xs sm:text-sm gap-2">
                  Pendentes
                  {pendingRequests.length > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {pendingRequests.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="progress" className="rounded-md px-3 py-2.5 text-xs sm:text-sm gap-2">
                  Em andamento
                  {approvedRequests.length > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {approvedRequests.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
                <TabsTrigger value="history" className="rounded-md px-3 py-2.5 text-xs sm:text-sm gap-2">
                  Histórico
                  {completedRequests.length > 0 ? (
                    <Badge variant="secondary" className="tabular-nums">
                      {completedRequests.length}
                    </Badge>
                  ) : null}
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="pending" className="focus-visible:outline-none mt-0">
              {pendingRequests.length === 0 ? (
                emptyMessage('Nenhum pedido aguardando sua análise.')
              ) : (
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {pendingRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="progress" className="focus-visible:outline-none mt-0">
              {approvedRequests.length === 0 ? (
                emptyMessage('Nada em andamento no momento.')
              ) : (
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {approvedRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="focus-visible:outline-none mt-0">
              {completedRequests.length === 0 ? (
                emptyMessage('Ainda não há pedidos concluídos ou rejeitados.')
              ) : (
                <div className="grid gap-3 sm:grid-cols-1 lg:grid-cols-2">
                  {completedRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog
        open={reviewDialog.open}
        onOpenChange={(open) => {
          if (!open) {
            setReviewDialog({ open: false, requestId: '', action: 'approve' });
            setRejectionReason('');
            setObservations('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden />
                  Aprovar pedido
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden />
                  Rejeitar pedido
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? 'O almoxarifado poderá separar e enviar o móvel para a unidade solicitante.'
                : 'O controlador verá o motivo e poderá ajustar e reenviar, se fizer sentido.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewDialog.action === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="observations">Observações para o almox (opcional)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Ex.: entregar no 3º andar, cuidado com vidro…"
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da rejeição</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique de forma clara para o controlador…"
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, requestId: '', action: 'approve' });
                setRejectionReason('');
                setObservations('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={reviewDialog.action === 'approve' ? 'default' : 'destructive'}
              onClick={handleReview}
            >
              {reviewDialog.action === 'approve' ? 'Confirmar aprovação' : 'Confirmar rejeição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
