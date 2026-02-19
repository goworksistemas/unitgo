import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle, Sofa, XCircle, Building2, MapPin, Clock, User, ChevronDown, ChevronUp } from 'lucide-react';
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
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';

export function FurnitureRequestsPanel() {
  const { currentUser, furnitureRequestsToDesigner, updateFurnitureRequestToDesigner, getItemById, getUnitById, getUserById } = useApp();
  const [reviewDialog, setReviewDialog] = useState<{ open: boolean; requestId: string; action: 'approve' | 'reject' }>({
    open: false,
    requestId: '',
    action: 'approve',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [observations, setObservations] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const { pendingRequests, approvedRequests, completedRequests } = useMemo(() => {
    const pending = furnitureRequestsToDesigner.filter(r => r.status === 'pending_designer');
    const approved = furnitureRequestsToDesigner.filter(r => 
      r.status === 'approved_designer' || 
      r.status === 'approved_storage' ||
      r.status === 'in_transit'
    );
    const completed = furnitureRequestsToDesigner.filter(r => 
      r.status === 'completed' || 
      r.status === 'rejected'
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

    const updates: any = {
      reviewedByDesignerId: currentUser.id,
      reviewedAt: new Date(),
    };

    if (action === 'approve') {
      updates.status = 'approved_designer';
      updates.observations = observations.trim() || undefined;
      
      toast.success('Solicitação aprovada!', {
        description: 'Enviado para aprovação do almoxarifado storage'
      });
    } else {
      updates.status = 'rejected';
      updates.rejectionReason = rejectionReason.trim();
      
      toast.success('Solicitação rejeitada', {
        description: 'O controlador foi notificado.'
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
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700">Aguardando Análise</Badge>;
      case 'approved_designer':
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">Aprovado</Badge>;
      case 'approved_storage':
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">Aguardando Entrega</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-700">Em Trânsito</Badge>;
      case 'completed':
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Concluído</Badge>;
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

  const RequestCard = ({ request }: { request: any }) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.requestingUnitId);
    const requester = getUserById(request.requestedByUserId);
    const reviewer = request.reviewedByDesignerId ? getUserById(request.reviewedByDesignerId) : null;

    if (!item || !unit || !requester) return null;

    return (
      <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sofa className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <h4 className="font-medium text-foreground">{item.name}</h4>
            </div>
            {item.brand && (
              <p className="text-xs text-muted-foreground">
                {item.brand}{item.model && ` - ${item.model}`}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {getStatusBadge(request.status)}
            <Badge variant="secondary">Qtd: {request.quantity}</Badge>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            <span>{unit.name}</span>
          </div>
          
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            <span className="truncate">{request.location}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span>{requester.name}</span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatDate(request.createdAt)}</span>
          </div>
        </div>

        <div className="mt-3 p-3 bg-muted rounded border border-border">
          <p className="text-xs font-medium text-foreground mb-1">Justificativa:</p>
          <p className="text-xs text-muted-foreground">{request.justification}</p>
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
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              variant="outline"
              className="flex-1"
              onClick={() => setReviewDialog({ open: true, requestId: request.id, action: 'reject' })}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejeitar
            </Button>
            <Button
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

  return (
    <>
      <div className="space-y-4">
        {/* Pending Requests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Solicitações Pendentes
              {pendingRequests.length > 0 && (
                <Badge variant="destructive" className="ml-2">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Solicitações de móveis aguardando sua análise
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {pendingRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Approved Requests */}
        {approvedRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Aprovadas
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">
                Solicitações aprovadas em processo de entrega
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {approvedRequests.map(request => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Completed/Rejected Requests */}
        {completedRequests.length > 0 && (
          <Collapsible open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
            <Card>
              <CardHeader>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center justify-between p-0 hover:bg-transparent">
                    <div className="text-left">
                      <CardTitle className="text-base md:text-lg text-[18px] flex items-center">
                        Histórico
                        <Badge variant="secondary" className="ml-2">{completedRequests.length}</Badge>
                      </CardTitle>
                      <CardDescription className="text-xs md:text-sm">
                        Solicitações concluídas ou rejeitadas
                      </CardDescription>
                    </div>
                    {isHistoryOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </Button>
                </CollapsibleTrigger>
              </CardHeader>
              <CollapsibleContent>
                <CardContent>
                  <div className="grid gap-3">
                    {completedRequests.slice(0, 5).map(request => (
                      <RequestCard key={request.id} request={request} />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, requestId: '', action: 'approve' });
          setRejectionReason('');
          setObservations('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === 'approve' ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Aprovar Solicitação
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Solicitação
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve'
                ? 'A solicitação será enviada ao almoxarifado para entrega'
                : 'Informe o motivo da rejeição para o controlador'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewDialog.action === 'approve' ? (
              <div className="space-y-2">
                <Label htmlFor="observations">Observações (opcional)</Label>
                <Textarea
                  id="observations"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Orientações adicionais para entrega..."
                  rows={3}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="reason">Motivo da Rejeição *</Label>
                <Textarea
                  id="reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Explique por que a solicitação foi rejeitada..."
                  rows={4}
                />
              </div>
            )}
          </div>

          <DialogFooter>
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
              {reviewDialog.action === 'approve' ? 'Aprovar' : 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}