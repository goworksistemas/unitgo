import React, { useMemo, useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { 
  AlertCircle, 
  CheckCircle, 
  Sofa, 
  XCircle, 
  Building2, 
  MapPin, 
  Clock, 
  User,
  Package,
  Truck,
  PackageCheck
} from 'lucide-react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { isDriverUser } from '@/lib/userProfile';

interface FurnitureWarehousePanelProps {
  isDeveloperMode?: boolean;
}

export function FurnitureWarehousePanel({ isDeveloperMode = false }: FurnitureWarehousePanelProps) {
  const { 
    currentUser, 
    furnitureRequestsToDesigner, 
    updateFurnitureRequestToDesigner, 
    getItemById, 
    getUnitById, 
    getUserById,
    users,
    getStockForItem,
    getWarehouseUnitId,
  } = useApp();

  const [reviewDialog, setReviewDialog] = useState<{ 
    open: boolean; 
    requestId: string; 
    action: 'approve_storage' | 'separate_and_assign' | 'reject_storage';
  }>({
    open: false,
    requestId: '',
    action: 'approve_storage',
  });
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [notes, setNotes] = useState('');

  const isStorageWorker = isDeveloperMode || currentUser?.warehouseType === 'storage';
  const isDeliveryDriver = isDeveloperMode || currentUser?.warehouseType === 'delivery';

  // Motoristas disponíveis
  const drivers = useMemo(
    () => [...users].filter(isDriverUser).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [users],
  );

  const { 
    pendingStorageApproval, 
    approvedStorage, 
    inTransit,
    myDeliveries,
    completed 
  } = useMemo(() => {
    return {
      pendingStorageApproval: furnitureRequestsToDesigner.filter(r => r.status === 'approved_designer'),
      approvedStorage: furnitureRequestsToDesigner.filter(r => r.status === 'approved_storage'),
      inTransit: furnitureRequestsToDesigner.filter(r => r.status === 'in_transit'),
      myDeliveries: furnitureRequestsToDesigner.filter(r => 
        r.status === 'in_transit' && 
        r.assignedToWarehouseUserId === currentUser?.id
      ),
      completed: furnitureRequestsToDesigner.filter(r => r.status === 'completed'),
    };
  }, [furnitureRequestsToDesigner, currentUser]);

  const handleAction = () => {
    if (!currentUser) return;

    const { requestId, action } = reviewDialog;

    if (action === 'reject_storage' && !rejectionReason.trim()) {
      toast.error('Informe o motivo da rejeição');
      return;
    }

    if (action === 'separate_and_assign' && !selectedDriverId) {
      toast.error('Selecione um motorista');
      return;
    }

    const updates: any = {};

    switch (action) {
      case 'approve_storage':
        updates.status = 'approved_storage';
        updates.approvedByStorageUserId = currentUser.id;
        updates.approvedByStorageAt = new Date();
        toast.success('✅ Solicitação aprovada!', {
          description: 'Aguardando separação e atribuição de motorista'
        });
        break;

      case 'separate_and_assign':
        updates.status = 'in_transit';
        updates.separatedByUserId = currentUser.id;
        updates.separatedAt = new Date();
        updates.assignedToWarehouseUserId = selectedDriverId;
        updates.assignedAt = new Date();
        const driver = getUserById(selectedDriverId);
        toast.success('✅ Item separado e atribuído!', {
          description: `${driver?.name} foi notificado para realizar a entrega`
        });
        break;

      case 'reject_storage':
        updates.status = 'rejected';
        updates.rejectionReason = rejectionReason.trim();
        toast.success('Solicitação rejeitada', {
          description: 'O controlador foi notificado'
        });
        break;
    }

    if (notes.trim()) {
      updates.observations = notes.trim();
    }

    updateFurnitureRequestToDesigner(requestId, updates);

    setReviewDialog({ open: false, requestId: '', action: 'approve_storage' });
    setRejectionReason('');
    setSelectedDriverId('');
    setNotes('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved_designer':
        return <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700">Designer Aprovou</Badge>;
      case 'approved_storage':
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">Storage Aprovou</Badge>;
      case 'in_transit':
        return <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700">Em Trânsito</Badge>;
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

  const RequestCard = ({ request, showActions }: { request: any; showActions?: boolean }) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.requestingUnitId);
    const requester = getUserById(request.requestedByUserId);
    const designer = request.reviewedByDesignerId ? getUserById(request.reviewedByDesignerId) : null;
    const storageWorker = request.approvedByStorageUserId ? getUserById(request.approvedByStorageUserId) : null;
    const separator = request.separatedByUserId ? getUserById(request.separatedByUserId) : null;
    const driver = request.assignedToWarehouseUserId ? getUserById(request.assignedToWarehouseUserId) : null;
    const deliverer = request.deliveredByUserId ? getUserById(request.deliveredByUserId) : null;
    const receiver = request.receivedByUserId ? getUserById(request.receivedByUserId) : null;

    // Verificar estoque disponível no Almoxarifado Central
    const warehouseUnitId = getWarehouseUnitId();
    const warehouseStock = warehouseUnitId ? getStockForItem(request.itemId, warehouseUnitId) : undefined;
    const availableQuantity = warehouseStock?.quantity || 0;
    const hasInsufficientStock = availableQuantity < request.quantity;

    // Motorista pode marcar como entregue se for atribuído a ele
    const canDriverDeliver = isDeliveryDriver && request.status === 'in_transit' && request.assignedToWarehouseUserId === currentUser?.id;

    if (!item || !unit || !requester) return null;

    return (
      <div className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sofa className="h-4 w-4 text-primary flex-shrink-0" />
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
            <span>Solicitante: {requester.name}</span>
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

        {/* Alerta de estoque insuficiente */}
        {request.status === 'approved_designer' && hasInsufficientStock && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Estoque insuficiente!</strong><br />
              Solicitado: {request.quantity} unidade{request.quantity > 1 ? 's' : ''} | 
              Disponível: {availableQuantity} unidade{availableQuantity !== 1 ? 's' : ''}
            </AlertDescription>
          </Alert>
        )}

        {/* Informação de estoque disponível */}
        {request.status === 'approved_designer' && !hasInsufficientStock && availableQuantity > 0 && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700">
            <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-300">
              <Package className="h-3 w-3" />
              <span>
                <strong>Estoque:</strong> {availableQuantity} unidade{availableQuantity !== 1 ? 's' : ''} disponível{availableQuantity !== 1 ? 'is' : ''}
              </span>
            </div>
          </div>
        )}

        {/* Timeline de aprovações */}
        {(designer || storageWorker || separator || driver || deliverer || receiver) && (
          <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
            {designer && request.reviewedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Designer: <strong className="text-foreground">{designer.name}</strong> em {formatDate(request.reviewedAt)}</span>
              </div>
            )}
            {storageWorker && request.approvedByStorageAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Aprovado: <strong className="text-foreground">{storageWorker.name}</strong> em {formatDate(request.approvedByStorageAt)}</span>
              </div>
            )}
            {separator && request.separatedAt && (
              <div className="flex items-center gap-2">
                <PackageCheck className="h-3 w-3 text-purple-600" />
                <span>Separado: <strong className="text-foreground">{separator.name}</strong> em {formatDate(request.separatedAt)}</span>
              </div>
            )}
            {driver && request.assignedAt && (
              <div className="flex items-center gap-2">
                <Truck className="h-3 w-3 text-orange-600" />
                <span>Motorista: <strong className="text-foreground">{driver.name}</strong> em {formatDate(request.assignedAt)}</span>
              </div>
            )}
            {deliverer && request.deliveredAt && (
              <div className="flex items-center gap-2">
                <Package className="h-3 w-3 text-primary" />
                <span>Entrega confirmada por: <strong className="text-foreground">{deliverer.name}</strong> em {formatDate(request.deliveredAt)}</span>
              </div>
            )}
            {receiver && request.completedAt && (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-green-600" />
                <span>Recebido por: <strong className="text-foreground">{receiver.name}</strong> em {formatDate(request.completedAt)}</span>
              </div>
            )}
          </div>
        )}

        {request.observations && (
          <Alert className="mt-3">
            <AlertDescription className="text-xs">
              <strong>Observações:</strong> {request.observations}
            </AlertDescription>
          </Alert>
        )}

        {request.status === 'rejected' && request.rejectionReason && (
          <Alert variant="destructive" className="mt-3">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong>Motivo da rejeição:</strong> {request.rejectionReason}
            </AlertDescription>
          </Alert>
        )}

        {showActions && isStorageWorker && (
          <div className="flex gap-2 mt-4">
            {request.status === 'approved_designer' && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setReviewDialog({ 
                    open: true, 
                    requestId: request.id, 
                    action: 'reject_storage' 
                  })}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Rejeitar
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={hasInsufficientStock}
                  onClick={() => setReviewDialog({ 
                    open: true, 
                    requestId: request.id, 
                    action: 'approve_storage' 
                  })}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Aprovar
                </Button>
              </>
            )}

            {request.status === 'approved_storage' && (
              <Button
                size="sm"
                className="w-full"
                onClick={() => setReviewDialog({ 
                  open: true, 
                  requestId: request.id, 
                  action: 'separate_and_assign' 
                })}
              >
                <Package className="h-4 w-4 mr-2" />
                Marcar como Separado e Atribuir Motorista
              </Button>
            )}
          </div>
        )}
        
        {/* Botão para motorista marcar como entregue */}
        {canDriverDeliver && (
          <div className="mt-4">
            <Button
              size="sm"
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => {
                if (!currentUser) return;
                updateFurnitureRequestToDesigner(request.id, {
                  status: 'completed',
                  deliveredByUserId: currentUser.id,
                  deliveredAt: new Date(),
                  completedAt: new Date(),
                });
                toast.success('✅ Entrega confirmada!', {
                  description: 'O móvel foi entregue com sucesso'
                });
              }}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirmar Entrega
            </Button>
          </div>
        )}
      </div>
    );
  };

  if (!isStorageWorker && !isDeliveryDriver) {
    return null;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg flex items-center gap-2">
            <Sofa className="h-5 w-5 text-primary" />
            Solicitações de Móveis
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Fluxo: aprovar no almox → separar e escolher motorista → entrega. Use as abas da esquerda para a direita.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-0.5 p-1">
              <TabsTrigger value="pending" className="relative px-2 py-2.5 text-xs md:text-sm">
                Aprovar
                {pendingStorageApproval.length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-[10px]">
                    {pendingStorageApproval.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="approved" className="px-2 py-2.5 text-xs md:text-sm">
                Separar
                {approvedStorage.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {approvedStorage.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="transit" className="px-2 py-2.5 text-xs md:text-sm">
                Rota
                {inTransit.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {inTransit.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3 mt-4">
              {pendingStorageApproval.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhuma solicitação pendente de aprovação</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pendingStorageApproval.map(request => (
                    <RequestCard key={request.id} request={request} showActions />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved" className="space-y-3 mt-4">
              {approvedStorage.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum item aguardando separação</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {approvedStorage.map(request => (
                    <RequestCard key={request.id} request={request} showActions />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="transit" className="space-y-3 mt-4">
              {/* Motorista vê apenas suas entregas, Storage vê todas */}
              {(() => {
                const deliveriesToShow = isDeliveryDriver ? myDeliveries : inTransit;
                
                if (deliveriesToShow.length === 0) {
                  return (
                    <div className="text-center py-8 text-muted-foreground">
                      <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">
                        {isDeliveryDriver 
                          ? 'Nenhuma entrega atribuída a você' 
                          : 'Nenhuma entrega em andamento'}
                      </p>
                    </div>
                  );
                }
                
                return (
                  <div className="grid gap-3">
                    {deliveriesToShow.map(request => (
                      <RequestCard key={request.id} request={request} showActions={false} />
                    ))}
                  </div>
                );
              })()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Action Dialog */}
      <Dialog open={reviewDialog.open} onOpenChange={(open) => {
        if (!open) {
          setReviewDialog({ open: false, requestId: '', action: 'approve_storage' });
          setRejectionReason('');
          setSelectedDriverId('');
          setNotes('');
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDialog.action === 'approve_storage' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Aprovar Solicitação
                </>
              )}
              {reviewDialog.action === 'separate_and_assign' && (
                <>
                  <Package className="h-5 w-5 text-purple-600" />
                  Marcar como Separado e Atribuir Motorista
                </>
              )}
              {reviewDialog.action === 'reject_storage' && (
                <>
                  <XCircle className="h-5 w-5 text-red-600" />
                  Rejeitar Solicitação
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {reviewDialog.action === 'approve_storage' && 'Aprovar solicitação de móvel para separação'}
              {reviewDialog.action === 'separate_and_assign' && 'Confirmar que o item foi separado e está pronto para entrega'}
              {reviewDialog.action === 'reject_storage' && 'Informe o motivo da rejeição'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {reviewDialog.action === 'reject_storage' ? (
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
            ) : reviewDialog.action === 'separate_and_assign' ? (
              <div className="space-y-2">
                <Label htmlFor="driver">Motorista *</Label>
                <select
                  id="driver"
                  className="w-full px-3 py-2 border border-border bg-input-background text-foreground rounded-md"
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                >
                  <option value="">Selecione um motorista...</option>
                  {drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name}
                    </option>
                  ))}
                </select>
                <div className="space-y-2 mt-3">
                  <Label htmlFor="notes">Observações (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instruções adicionais para o motorista..."
                    rows={2}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setReviewDialog({ open: false, requestId: '', action: 'approve_storage' });
                setRejectionReason('');
                setSelectedDriverId('');
                setNotes('');
              }}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant={reviewDialog.action === 'reject_storage' ? 'destructive' : 'default'}
              onClick={handleAction}
            >
              {reviewDialog.action === 'approve_storage' && 'Aprovar'}
              {reviewDialog.action === 'separate_and_assign' && 'Confirmar Separação e Atribuir'}
              {reviewDialog.action === 'reject_storage' && 'Rejeitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}