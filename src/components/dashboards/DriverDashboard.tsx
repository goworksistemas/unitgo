import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  Truck, 
  CheckCircle, 
  Package, 
  Armchair, 
  MapPin, 
  Building2, 
  Clock, 
  QrCode,
  LayoutDashboard
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { DeliveryConfirmationDialog } from '../dialogs/DeliveryConfirmationDialog';
import { FurnitureDeliveryConfirmationDialog } from '../dialogs/FurnitureDeliveryConfirmationDialog';
import { MarkFurnitureDeliveryPendingDialog } from '../dialogs/MarkFurnitureDeliveryPendingDialog';
import { FurnitureQRCodeScannerDialog } from '../dialogs/FurnitureQRCodeScannerDialog';
import { DeliveryTimeline } from '../delivery/DeliveryTimeline';
import { MarkDeliveryPendingDialog } from '../dialogs/MarkDeliveryPendingDialog';
import { useDashboardNav } from '@/hooks/useDashboardNav';
import { useIsMobile } from '@/components/ui/use-mobile';
import type { NavigationSection } from '@/hooks/useNavigation';

interface DriverDashboardProps {
  isDeveloperMode?: boolean;
}

export function DriverDashboard({ isDeveloperMode = false }: DriverDashboardProps) {
  const { 
    currentUser, 
    requests, 
    getItemById, 
    getUnitById, 
    updateRequest,
    furnitureRemovalRequests,
    updateFurnitureRemovalRequest,
    furnitureRequestsToDesigner,
    updateFurnitureRequestToDesigner,
    deliveryBatches,
    deliveryConfirmations,
    getConfirmationsForBatch,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<{ id: string; type: 'material' | 'furniture_removal' | 'furniture_delivery' } | null>(null);
  const [actionType, setActionType] = useState<'pickup' | 'deliver' | null>(null);
  const [selectedBatchForConfirmation, setSelectedBatchForConfirmation] = useState<string | null>(null);
  const [selectedBatchForPending, setSelectedBatchForPending] = useState<string | null>(null);
  const [selectedFurnitureForDelivery, setSelectedFurnitureForDelivery] = useState<string | null>(null);
  const [selectedFurnitureForQRScan, setSelectedFurnitureForQRScan] = useState<string | null>(null);
  const [selectedFurnitureForPending, setSelectedFurnitureForPending] = useState<string | null>(null);
  const [selectedBatchForTimeline, setSelectedBatchForTimeline] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(() => {
    const hasSeenTutorial = localStorage.getItem('driver-tutorial-seen');
    return !hasSeenTutorial;
  });

  const isMobile = useIsMobile();

  // No mobile: uma única seção "Visão Geral" com tudo
  const navigationSections: NavigationSection[] = useMemo(() => {
    if (isMobile) {
      return [{ id: 'overview', label: 'Visão Geral', icon: LayoutDashboard }];
    }
    return [
    {
      id: 'overview',
      label: 'Visão Geral',
      icon: LayoutDashboard,
    },
    {
      id: 'deliveries',
      label: 'Entregas',
      icon: Package,
    },
    {
      id: 'transit',
      label: 'Em Trânsito',
      icon: Truck,
    },
    {
      id: 'pickups',
      label: 'Coletas',
      icon: Armchair,
    },
  ];
  }, [isMobile]);

  const { activeSection, setActiveSection } = useDashboardNav(
    navigationSections,
    'Painel do Motorista',
    'Entregas e coletas',
    'overview'
  );

  // IDs de todos os itens que já estão em lotes
  const itemsInBatches = new Set<string>();
  deliveryBatches.forEach(batch => {
    batch.requestIds.forEach(id => itemsInBatches.add(id));
    batch.furnitureRequestIds?.forEach(id => itemsInBatches.add(id));
  });

  // MOTORISTAS NÃO VEEM MATERIAIS INDIVIDUAIS - APENAS LOTES
  // Materiais regulares sempre vão em lotes, então motorista não precisa ver individuais
  const materialsToPickup: any[] = [];
  const materialsInTransit: any[] = [];

  // Coletas de móveis (para armazenamento/descarte) - APENAS os que NÃO estão em lotes
  // Estes são individuais porque vão direto para o almoxarifado
  const furnitureToCollect = furnitureRemovalRequests.filter(
    r => (r.status === 'approved_storage' || r.status === 'approved_disposal') && 
        !itemsInBatches.has(r.id)
  );
  const furnitureInTransit = furnitureRemovalRequests.filter(
    r => r.status === 'in_transit' && !itemsInBatches.has(r.id)
  );

  // Entregas de móveis aprovadas por designers - INDIVIDUAIS atribuídas ao motorista
  // Filtra entregas que foram atribuídas especificamente a este motorista
  const furnitureToDeliver = furnitureRequestsToDesigner.filter(
    r => r.status === 'in_transit' && 
         r.assignedToWarehouseUserId === currentUser?.id &&
         !itemsInBatches.has(r.id)
  );
  const furnitureDeliveryInTransit = furnitureToDeliver; // Mesma lista

  const totalToPickup = furnitureToCollect.length;
  const totalInTransit = furnitureInTransit.length + furnitureDeliveryInTransit.length;

  // Notificar quando houver novos itens para retirar
  useEffect(() => {
    const previousCount = parseInt(localStorage.getItem('driver-pickup-count') || '0');
    if (totalToPickup > previousCount && previousCount > 0) {
      if ('vibrate' in navigator) {
        navigator.vibrate([200, 100, 200]);
      }
      toast.info('Nova entrega disponível!', {
        description: `Você tem ${totalToPickup} ${totalToPickup === 1 ? 'item' : 'itens'} para retirar`,
      });
    }
    localStorage.setItem('driver-pickup-count', totalToPickup.toString());
  }, [totalToPickup]);

  const vibrate = () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  };

  const handleCollectFurniture = (requestId: string) => {
    vibrate();
    setSelectedRequest({ id: requestId, type: 'furniture_removal' });
    setActionType('pickup');
  };

  const confirmAction = () => {
    if (!selectedRequest || !currentUser) return;

    // Vibração de confirmação (mais longa)
    if ('vibrate' in navigator) {
      navigator.vibrate([100, 50, 100]);
    }

    // Apenas coletas de móveis são individuais (vão para almoxarifado)
    if (selectedRequest.type === 'furniture_removal') {
      updateFurnitureRemovalRequest(selectedRequest.id, {
        status: 'in_transit',
        pickedUpByUserId: currentUser.id,
        pickedUpAt: new Date(),
      });
      toast.success('✓ Móvel coletado!', { description: 'Em trânsito para o almoxarifado' });
    }

    setSelectedRequest(null);
    setActionType(null);
  };

  // Função removida - materiais não são mais entregues individualmente por motoristas

  const renderFurnitureCollectionCard = (request: typeof furnitureRemovalRequests[0]) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.unitId);
    const isStorage = request.status === 'approved_storage';

    return (
      <Card key={request.id} className="border-2">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
            <div className={`p-2 md:p-3 rounded-lg ${isStorage ? 'bg-blue-50' : 'bg-red-50'}`}>
              <Armchair className={`h-6 w-6 md:h-8 md:w-8 ${isStorage ? 'text-primary' : 'text-red-600'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base md:text-lg mb-1 truncate">{item?.name}</h3>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-2">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">{unit?.name}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${isStorage ? 'bg-primary' : 'bg-red-600'} text-sm md:text-base px-2 md:px-3 py-0.5 md:py-1`}>
                  {isStorage ? 'Armazenar' : 'Descartar'}
                </Badge>
                <Badge variant="secondary" className="text-sm md:text-base px-2 md:px-3 py-0.5 md:py-1">
                  Qtd: {request.quantity}
                </Badge>
              </div>
            </div>
          </div>

          <Button 
            className="w-full h-12 md:h-14 text-base md:text-lg"
            onClick={() => handleCollectFurniture(request.id)}
          >
            <Truck className="h-5 w-5 md:h-6 md:w-6 mr-2" />
            Coletar Móvel
          </Button>
        </CardContent>
      </Card>
    );
  };

  // Função removida - entregas de móveis vão em lotes pelo almoxarifado

  // Função removida - materiais vão em lotes

  const renderInTransitFurniture = (request: typeof furnitureRemovalRequests[0]) => {
    const item = getItemById(request.itemId);
    const elapsed = request.pickedUpAt 
      ? Math.floor((new Date().getTime() - new Date(request.pickedUpAt).getTime()) / 60000)
      : 0;

    return (
      <Card key={request.id} className="border-2 border-purple-200 bg-purple-50/30">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-2 md:p-3 rounded-lg bg-purple-100">
              <Armchair className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base md:text-lg mb-1 truncate">{item?.name}</h3>
              <div className="flex items-center gap-2 text-xs md:text-sm text-purple-700">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span>Coletado há {elapsed} min</span>
              </div>
              <Badge variant="secondary" className="mt-2 text-xs md:text-sm">Para Almoxarifado</Badge>
            </div>
          </div>

          <div className="text-xs md:text-sm text-gray-600 text-center p-2 md:p-3 bg-purple-100 rounded-lg">
            Entregue este móvel no almoxarifado central
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderFurnitureDeliveryCard = (request: typeof furnitureRequestsToDesigner[0]) => {
    const item = getItemById(request.itemId);
    const unit = getUnitById(request.requestingUnitId);
    const elapsed = request.assignedAt 
      ? Math.floor((new Date().getTime() - new Date(request.assignedAt).getTime()) / 60000)
      : 0;

    return (
      <Card key={request.id} className="border-2 border-green-200 bg-green-50/30">
        <CardContent className="p-3 md:p-4">
          <div className="flex items-start gap-2 md:gap-3 mb-2 md:mb-3">
            <div className="p-2 md:p-3 rounded-lg bg-green-100">
              <Armchair className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base md:text-lg mb-1 truncate">{item?.name}</h3>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">{unit?.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-1 md:mb-2">
                <MapPin className="h-3 w-3 md:h-4 md:w-4" />
                <span className="truncate">{request.location}</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-green-700 mb-1 md:mb-2">
                <Clock className="h-3 w-3 md:h-4 md:w-4" />
                <span>Atribuído há {elapsed} min</span>
              </div>
              <Badge variant="secondary" className="mt-1 md:mt-2 text-xs md:text-sm">Qtd: {request.quantity}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full h-12 md:h-14 text-base md:text-lg bg-green-600 hover:bg-green-700"
              onClick={() => {
                vibrate();
                setSelectedFurnitureForQRScan(request.id);
              }}
            >
              <QrCode className="h-5 w-5 md:h-6 md:w-6 mr-2" />
              Confirmar Entrega c/ QR Code
            </Button>
            <Button 
              variant="outline"
              className="w-full h-10 md:h-12 text-xs md:text-sm border-2"
              onClick={() => {
                vibrate();
                setSelectedFurnitureForPending(request.id);
              }}
            >
              Marcar como Entregue (Confirmar Depois)
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <Card className="border-2 border-primary">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                    <div className="text-2xl md:text-4xl font-bold text-primary">{totalToPickup}</div>
                  </div>
                  <p className="text-xs md:text-sm font-medium">Para Retirar</p>
                </CardContent>
              </Card>

              <Card className="border-2 border-purple-600">
                <CardContent className="p-3 md:p-4">
                  <div className="flex items-center justify-between mb-1 md:mb-2">
                    <Truck className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                    <div className="text-2xl md:text-4xl font-bold text-purple-600">{totalInTransit}</div>
                  </div>
                  <p className="text-xs md:text-sm font-medium">Em Trânsito</p>
                </CardContent>
              </Card>
            </div>

            {/* Mobile: tudo em uma tela - Coletas, Entregas, Em Trânsito */}
            {isMobile ? (
              <div className="space-y-6">
                {totalToPickup > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Armchair className="h-5 w-5 text-primary" />
                      Coletas para Retirar
                    </h2>
                    <div className="space-y-3">
                      {furnitureToCollect.map(renderFurnitureCollectionCard)}
                    </div>
                  </div>
                )}
                {currentUser && deliveryBatches.filter(b => 
                  b.driverUserId === currentUser.id && 
                  (b.status === 'in_transit' || b.status === 'delivery_confirmed')
                ).length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      Lotes de Entrega
                    </h2>
                    <div className="space-y-3">
                      {deliveryBatches
                        .filter(b => b.driverUserId === currentUser!.id && (b.status === 'in_transit' || b.status === 'delivery_confirmed'))
                        .map(batch => {
                          const unit = getUnitById(batch.targetUnitId);
                          const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
                          const hasDeliveryConfirmation = deliveryConfirmations.some(
                            c => c.batchId === batch.id && c.type === 'delivery'
                          );
                          return (
                            <Card key={batch.id} className="border-2 border-primary">
                              <CardContent className="p-3 md:p-4">
                                <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                                  <div className="p-2 md:p-3 rounded-lg bg-blue-50">
                                    <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-base md:text-lg mb-1">Lote {batch.qrCode}</h3>
                                    <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-2">
                                      <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                                      <span className="truncate">{unit?.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <Badge className="bg-primary text-sm md:text-base px-2 md:px-3 py-0.5 md:py-1">
                                        {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                                      </Badge>
                                      {batch.status === 'delivery_confirmed' && (
                                        <Badge className="bg-green-600 text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1">
                                          ✓ Confirmada
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {batch.status === 'in_transit' && !hasDeliveryConfirmation && (
                                  <div className="space-y-2">
                                    <Button 
                                      className="w-full h-12 md:h-14 text-base md:text-lg bg-primary hover:bg-primary/90"
                                      onClick={() => setSelectedBatchForConfirmation(batch.id)}
                                    >
                                      <QrCode className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                                      Confirmar Entrega c/ QR Code
                                    </Button>
                                    <Button 
                                      variant="outline"
                                      className="w-full h-10 md:h-12 text-xs md:text-sm border-2"
                                      onClick={() => setSelectedBatchForPending(batch.id)}
                                    >
                                      Marcar como Entregue (Confirmar Depois)
                                    </Button>
                                  </div>
                                )}
                                {(batch.status === 'delivery_confirmed' || hasDeliveryConfirmation) && (
                                  <div className="space-y-2">
                                    <div className="text-xs md:text-sm text-center p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                                      ✓ Aguardando confirmação do recebedor
                                    </div>
                                    <Button 
                                      variant="outline"
                                      className="w-full h-10 md:h-12 text-xs md:text-sm"
                                      onClick={() => setSelectedBatchForTimeline(batch.id)}
                                    >
                                      Ver Timeline
                                    </Button>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                    </div>
                  </div>
                )}
                {(furnitureInTransit.length > 0 || furnitureDeliveryInTransit.length > 0) && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                      <Truck className="h-5 w-5 text-purple-600" />
                      Em Trânsito
                    </h2>
                    <div className="space-y-3">
                      {furnitureDeliveryInTransit.map(renderFurnitureDeliveryCard)}
                      {furnitureInTransit.map(renderInTransitFurniture)}
                    </div>
                  </div>
                )}
                {totalToPickup === 0 && totalInTransit === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p>Nenhuma tarefa no momento</p>
                  </div>
                )}
              </div>
            ) : (
              (totalToPickup > 0 || totalInTransit > 0) && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo de Atividades</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {totalToPickup > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Armchair className="h-4 w-4 text-primary" />
                          <span>{totalToPickup} móveis aguardando coleta</span>
                        </div>
                      )}
                      {furnitureInTransit.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-purple-600" />
                          <span>{furnitureInTransit.length} coletas em trânsito para almoxarifado</span>
                        </div>
                      )}
                      {furnitureDeliveryInTransit.length > 0 && (
                        <div className="flex items-center gap-2 text-sm">
                          <Truck className="h-4 w-4 text-green-600" />
                          <span>{furnitureDeliveryInTransit.length} entregas em trânsito para unidades</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            )}
          </div>
        );
      case 'deliveries':
        return (
          <div className="space-y-6">
            {currentUser && deliveryBatches.filter(b => 
              b.driverUserId === currentUser.id && 
              (b.status === 'in_transit' || b.status === 'delivery_confirmed')
            ).length > 0 ? (
              <div className="space-y-3">
                {deliveryBatches
                  .filter(b => b.driverUserId === currentUser.id && (b.status === 'in_transit' || b.status === 'delivery_confirmed'))
                  .map(batch => {
                    const unit = getUnitById(batch.targetUnitId);
                    const totalItems = batch.requestIds.length + (batch.furnitureRequestIds?.length || 0);
                    const hasDeliveryConfirmation = deliveryConfirmations.some(
                      c => c.batchId === batch.id && c.type === 'delivery'
                    );

                    return (
                      <Card key={batch.id} className="border-2 border-primary">
                        <CardContent className="p-3 md:p-4">
                          <div className="flex items-start gap-2 md:gap-3 mb-3 md:mb-4">
                            <div className="p-2 md:p-3 rounded-lg bg-blue-50">
                              <Package className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-base md:text-lg mb-1">Lote {batch.qrCode}</h3>
                              <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 mb-2">
                                <Building2 className="h-3 w-3 md:h-4 md:w-4" />
                                <span className="truncate">{unit?.name}</span>
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className="bg-primary text-sm md:text-base px-2 md:px-3 py-0.5 md:py-1">
                                  {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                                </Badge>
                                {batch.status === 'delivery_confirmed' && (
                                  <Badge className="bg-green-600 text-xs md:text-sm px-2 md:px-3 py-0.5 md:py-1">
                                    ✓ Confirmada
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          {batch.status === 'in_transit' && !hasDeliveryConfirmation && (
                            <div className="space-y-2">
                              <Button 
                                className="w-full h-12 md:h-14 text-base md:text-lg bg-primary hover:bg-primary/90"
                                onClick={() => setSelectedBatchForConfirmation(batch.id)}
                              >
                                <QrCode className="h-5 w-5 md:h-6 md:w-6 mr-2" />
                                Confirmar Entrega c/ QR Code
                              </Button>
                              <Button 
                                variant="outline"
                                className="w-full h-10 md:h-12 text-xs md:text-sm border-2"
                                onClick={() => setSelectedBatchForPending(batch.id)}
                              >
                                Marcar como Entregue (Confirmar Depois)
                              </Button>
                            </div>
                          )}

                          {(batch.status === 'delivery_confirmed' || hasDeliveryConfirmation) && (
                            <div className="space-y-2">
                              <div className="text-xs md:text-sm text-center p-2 md:p-3 bg-blue-50 rounded-lg border border-blue-200">
                                ✓ Aguardando confirmação do recebedor
                              </div>
                              <Button 
                                variant="outline"
                                className="w-full h-10 md:h-12 text-xs md:text-sm"
                                onClick={() => setSelectedBatchForTimeline(batch.id)}
                              >
                                Ver Timeline
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum lote de entrega ativo</p>
              </div>
            )}
          </div>
        );
      case 'transit':
        return (
          <div className="space-y-6">
            {(furnitureInTransit.length > 0 || furnitureDeliveryInTransit.length > 0) ? (
              <div className="space-y-3">
                {furnitureDeliveryInTransit.map(renderFurnitureDeliveryCard)}
                {furnitureInTransit.map(renderInTransitFurniture)}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Truck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhum item em trânsito</p>
              </div>
            )}
          </div>
        );
      case 'pickups':
        return (
          <div className="space-y-6">
            {totalToPickup > 0 ? (
              <div className="space-y-3">
                {furnitureToCollect.map(renderFurnitureCollectionCard)}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Armchair className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Nenhuma coleta pendente</p>
              </div>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {showTutorial && (
        <Card className="border-2 border-primary bg-gradient-to-r from-blue-50 to-cyan-50">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-3 text-primary">
              👋 Bem-vindo, Motorista!
            </h3>
            <div className="space-y-2 text-sm mb-4">
              <p>📦 <strong>Lotes de Entrega:</strong> Itens separados pelo almoxarifado</p>
              <p>✓ <strong>Confirmar com QR Code:</strong> Escaneie o código do recebedor</p>
              <p>⏰ <strong>Confirmar Depois:</strong> Marque como entregue para confirmar mais tarde</p>
              <p>🚛 <strong>Coletas:</strong> Móveis para levar ao almoxarifado</p>
            </div>
            <Button onClick={() => {
              setShowTutorial(false);
              localStorage.setItem('driver-tutorial-seen', 'true');
            }} className="w-full">
              Entendi!
            </Button>
          </CardContent>
        </Card>
      )}

      {renderContent()}

      {selectedBatchForConfirmation && (
        <DeliveryConfirmationDialog
          batch={deliveryBatches.find(b => b.id === selectedBatchForConfirmation)!}
          open={true}
          onClose={() => setSelectedBatchForConfirmation(null)}
        />
      )}

      {selectedBatchForTimeline && (
        <AlertDialog open={true} onOpenChange={() => setSelectedBatchForTimeline(null)}>
          <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Timeline da Entrega</AlertDialogTitle>
            </AlertDialogHeader>
            <DeliveryTimeline
              batch={deliveryBatches.find(b => b.id === selectedBatchForTimeline)!}
              confirmations={getConfirmationsForBatch(selectedBatchForTimeline)}
            />
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSelectedBatchForTimeline(null)}>
                Fechar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {selectedBatchForPending && (
        <MarkDeliveryPendingDialog
          batch={deliveryBatches.find(b => b.id === selectedBatchForPending)!}
          open={true}
          onClose={() => setSelectedBatchForPending(null)}
        />
      )}

      {selectedFurnitureForDelivery && (
        <FurnitureDeliveryConfirmationDialog
          request={furnitureRequestsToDesigner.find(r => r.id === selectedFurnitureForDelivery)!}
          open={true}
          onClose={() => setSelectedFurnitureForDelivery(null)}
        />
      )}

      {selectedFurnitureForQRScan && (
        <FurnitureQRCodeScannerDialog
          request={furnitureRequestsToDesigner.find(r => r.id === selectedFurnitureForQRScan)!}
          open={true}
          onClose={() => setSelectedFurnitureForQRScan(null)}
        />
      )}

      {selectedFurnitureForPending && (
        <MarkFurnitureDeliveryPendingDialog
          request={furnitureRequestsToDesigner.find(r => r.id === selectedFurnitureForPending)!}
          open={true}
          onClose={() => setSelectedFurnitureForPending(null)}
        />
      )}
    </div>
  );
}