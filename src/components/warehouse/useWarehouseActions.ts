import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export type ActionType = 'approve' | 'reject' | 'ready_pickup' | 'picked_up' | 'delivered' | null;

export function useWarehouseActions() {
  const {
    currentUser, requests, updateRequest, unitStocks, getStockForItem,
    furnitureRemovalRequests, updateFurnitureRemovalRequest,
    updateStock, addStock, getWarehouseUnitId,
  } = useApp();

  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [actionType, setActionType] = useState<ActionType>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedBatchToFinalize, setSelectedBatchToFinalize] = useState<string | null>(null);
  const warehouseUnitId = getWarehouseUnitId() ?? null;

  const handleRequestAction = (requestId: string, type: ActionType) => {
    setSelectedRequest(requestId);
    setActionType(type);
  };

  const handleFinalizeBatch = (batchId: string) => setSelectedBatchToFinalize(batchId);

  const confirmFinalizeBatch = () => {
    if (!selectedBatchToFinalize || !currentUser) return;
    toast.success('✅ Entrega registrada com sucesso!', { description: 'O lote foi finalizado no sistema' });
    setSelectedBatchToFinalize(null);
  };

  const confirmAction = () => {
    if (!selectedRequest || !currentUser) return;
    if (actionType === 'approve') {
      const request = requests.find(r => r.id === selectedRequest);
      const whStock = request && warehouseUnitId ? getStockForItem(request.itemId, warehouseUnitId) : null;
      const hasStock = whStock && whStock.quantity >= (request?.quantity || 0);
      updateRequest(selectedRequest, { status: 'approved', approvedByUserId: currentUser.id, approvedAt: new Date() });
      if (!hasStock) toast.warning('⚠️ Solicitação aprovada, mas estoque insuficiente! Providencie reposição.');
      else toast.success('✅ Solicitação aprovada com sucesso!');
    } else if (actionType === 'reject') {
      if (!rejectionReason.trim()) { toast.error('Por favor, informe o motivo da rejeição'); return; }
      updateRequest(selectedRequest, { status: 'rejected', rejectedReason: rejectionReason });
      toast.success('Solicitação rejeitada');
    } else if (actionType === 'ready_pickup') {
      updateRequest(selectedRequest, { status: 'awaiting_pickup', pickupReadyByUserId: currentUser.id, pickupReadyAt: new Date() });
      toast.success('✓ Pedido separado! Agora crie o lote para envio.');
    } else if (actionType === 'picked_up') {
      updateRequest(selectedRequest, { status: 'out_for_delivery', pickedUpByUserId: currentUser.id, pickedUpAt: new Date() });
      toast.success('Pedido retirado e saiu para entrega!');
    } else if (actionType === 'delivered') {
      updateRequest(selectedRequest, { status: 'completed', completedByUserId: currentUser.id, completedAt: new Date() });
      toast.success('Entrega confirmada com sucesso!');
    }
    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason('');
  };

  const handlePickupFurniture = (requestId: string) => {
    if (!currentUser) return;
    updateFurnitureRemovalRequest(requestId, { status: 'in_transit', pickedUpByUserId: currentUser.id, pickedUpAt: new Date() });
    toast.success('Móvel coletado! Em trânsito para o almoxarifado');
  };

  const handleReceiveFurniture = (requestId: string) => {
    if (!currentUser) return;
    const request = furnitureRemovalRequests.find(r => r.id === requestId);
    if (!request) return;
    console.log('🔍 DEBUG handleReceiveFurniture:');
    console.log('  📋 Request:', request);
    console.log('  📦 Request Status:', request.status);
    const warehouseId = getWarehouseUnitId();
    console.log('  🏢 Warehouse ID:', warehouseId);
    if (!warehouseId) { toast.error('Erro: Almoxarifado Central não encontrado no sistema'); return; }

    const originStock = unitStocks.find(s => s.itemId === request.itemId && s.unitId === request.unitId);
    console.log('  📊 Origin Stock:', originStock);
    if (originStock) {
      const newQty = Math.max(0, originStock.quantity - request.quantity);
      console.log(`  ➖ Reduzindo estoque da origem: ${originStock.quantity} -> ${newQty}`);
      updateStock(originStock.id, newQty);
    } else {
      console.log('  ⚠️ Estoque de origem não encontrado!');
    }

    const isStorage = request.status === 'approved_storage' || request.status === 'in_transit';
    console.log('  🔄 Is Storage?', isStorage);
    if (isStorage) {
      const whStock = unitStocks.find(s => s.itemId === request.itemId && s.unitId === warehouseId);
      console.log('  📦 Warehouse Stock:', whStock);
      if (whStock) {
        const newQty = whStock.quantity + request.quantity;
        console.log(`  ➕ Somando ao estoque existente: ${whStock.quantity} + ${request.quantity} = ${newQty}`);
        updateStock(whStock.id, newQty);
      } else {
        console.log(`  ✨ Criando novo estoque no almoxarifado com quantidade: ${request.quantity}`);
        addStock({ itemId: request.itemId, unitId: warehouseId, quantity: request.quantity, minimumQuantity: 1, location: 'Almoxarifado Central' });
      }
    } else {
      console.log('  🗑️ Item para descarte - não adiciona ao estoque');
    }

    updateFurnitureRemovalRequest(requestId, { status: 'completed', receivedByUserId: currentUser.id, receivedAt: new Date(), completedAt: new Date() });
    toast.success(`Móvel recebido e ${isStorage ? 'armazenado' : 'descartado'} com sucesso!`);
    console.log('✅ handleReceiveFurniture concluído');
  };

  const resetActionState = () => {
    setSelectedRequest(null);
    setActionType(null);
    setRejectionReason('');
  };

  return {
    selectedRequest, actionType, rejectionReason, setRejectionReason,
    selectedBatchToFinalize, setSelectedBatchToFinalize, warehouseUnitId,
    handleRequestAction, handleFinalizeBatch, confirmFinalizeBatch,
    confirmAction, handlePickupFurniture, handleReceiveFurniture, resetActionState,
  };
}
