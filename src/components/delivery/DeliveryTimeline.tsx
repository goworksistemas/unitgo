import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Package, Truck, CheckCircle, Camera, MapPin, Clock, Armchair } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { DeliveryBatch, DeliveryConfirmation } from '../../types';
import { useApp } from '../../contexts/AppContext';

interface DeliveryTimelineProps {
  batch: DeliveryBatch;
  confirmations: DeliveryConfirmation[];
}

export function DeliveryTimeline({ batch, confirmations }: DeliveryTimelineProps) {
  const { getUserById, getUnitById, getItemById, requests, furnitureRequestsToDesigner } = useApp();

  const driver = getUserById(batch.driverUserId);
  const targetUnit = getUnitById(batch.targetUnitId);
  
  const deliveryConfirmation = confirmations.find(c => c.type === 'delivery');
  const receiptConfirmation = confirmations.find(c => c.type === 'receipt');

  const batchRequests = requests.filter(r => batch.requestIds.includes(r.id));
  const batchFurnitureRequests = furnitureRequestsToDesigner.filter(r => 
    batch.furnitureRequestIds?.includes(r.id)
  );

  const totalItems = batchRequests.length + batchFurnitureRequests.length;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'received_confirmed': return 'bg-secondary';
      case 'delivery_confirmed': return 'bg-primary';
      case 'in_transit': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Entrega Concluída';
      case 'received_confirmed': return 'Recebimento Confirmado';
      case 'delivery_confirmed': return 'Entrega Confirmada';
      case 'in_transit': return 'Em Trânsito';
      case 'pending': return 'Aguardando Retirada';
      default: return status;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Clock className="h-5 w-5 text-primary" />
          Timeline da Entrega
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Informações do Lote */}
        <div className="bg-muted rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Código:</span>
            <Badge variant="outline" className="font-mono">{batch.qrCode}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Destino:</span>
            <Badge>{targetUnit?.name}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Motorista:</span>
            <Badge variant="secondary">{driver?.name}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge className={getStatusColor(batch.status)}>
              {getStatusText(batch.status)}
            </Badge>
          </div>
        </div>

        {/* Lista de Itens */}
       <div className="border-t pt-3">
  <p className="text-sm mb-2">Itens ({totalItems}):</p>
  <div className="space-y-1 max-h-32 overflow-y-auto">
    {batchRequests.map((request) => {
      const item = getItemById(request.itemId);
      return (
        <div key={`request-${request.id}`} className="flex items-center gap-2 text-sm">
          <Package className="h-3 w-3 text-gray-400" />
          <span>{item?.name}</span>
          <Badge variant="secondary" className="ml-auto">{request.quantity}x</Badge>
        </div>
      );
    })}
    {batchFurnitureRequests.map((request) => {
      const item = getItemById(request.itemId);
      return (
        <div key={`furniture-${request.id}`} className="flex items-center gap-2 text-sm">
          <Armchair className="h-3 w-3 text-gray-400" />
          <span>{item?.name}</span>
          <Badge variant="secondary" className="ml-auto">{request.quantity}x</Badge>
        </div>
      );
    })}
  </div>
</div>

        {/* Timeline de Eventos */}
        <div className="border-t pt-3 space-y-4">
          <p className="text-sm mb-3">Histórico:</p>

          {/* Criação do Lote */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="rounded-full bg-gray-200 p-2">
                <Package className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="w-px bg-gray-300 flex-1 min-h-8" />
            </div>
            <div className="flex-1 pb-4">
              <p className="text-sm">Lote Criado</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(batch.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Saída para Entrega */}
          {batch.dispatchedAt && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-blue-100 p-2">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div className="w-px bg-gray-300 flex-1 min-h-8" />
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm">Saiu para Entrega</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(batch.dispatchedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">{driver?.name}</p>
              </div>
            </div>
          )}

          {/* Confirmação de Entrega */}
          {deliveryConfirmation && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-blue-100 p-2">
                  <Camera className="h-4 w-4 text-primary" />
                </div>
                {receiptConfirmation && <div className="w-px bg-gray-300 flex-1 min-h-8" />}
              </div>
              <div className="flex-1 pb-4">
                <p className="text-sm">Entrega Confirmada</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(deliveryConfirmation.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">{getUserById(deliveryConfirmation.confirmedByUserId)?.name}</p>
                
                {/* Foto da Entrega */}
                {deliveryConfirmation.photoUrl && (
                  <div className="mt-2">
                    <img 
                      src={deliveryConfirmation.photoUrl} 
                      alt="Foto da entrega" 
                      className="rounded border max-w-xs cursor-pointer hover:opacity-80"
                      onClick={() => window.open(deliveryConfirmation.photoUrl, '_blank')}
                    />
                  </div>
                )}
                
                {/* Localização */}
                {deliveryConfirmation.location && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span>
                      {deliveryConfirmation.location.latitude.toFixed(6)}, {deliveryConfirmation.location.longitude.toFixed(6)}
                    </span>
                  </div>
                )}
                
                {/* Notas */}
                {deliveryConfirmation.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{deliveryConfirmation.notes}"</p>
                )}
              </div>
            </div>
          )}

          {/* Confirmação de Recebimento */}
          {receiptConfirmation && (
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="rounded-full bg-cyan-100 p-2">
                  <CheckCircle className="h-4 w-4 text-secondary" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-sm">Recebimento Confirmado</p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(receiptConfirmation.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
                <p className="text-xs text-muted-foreground">{getUserById(receiptConfirmation.confirmedByUserId)?.name}</p>
                
                {/* Foto do Recebimento */}
                {receiptConfirmation.photoUrl && (
                  <div className="mt-2">
                    <img 
                      src={receiptConfirmation.photoUrl} 
                      alt="Foto do recebimento" 
                      className="rounded border max-w-xs cursor-pointer hover:opacity-80"
                      onClick={() => window.open(receiptConfirmation.photoUrl, '_blank')}
                    />
                  </div>
                )}
                
                {/* Notas */}
                {receiptConfirmation.notes && (
                  <p className="text-xs text-muted-foreground mt-1 italic">"{receiptConfirmation.notes}"</p>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
