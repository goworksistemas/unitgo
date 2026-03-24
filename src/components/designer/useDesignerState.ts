import { useState, useEffect } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';

export function useDesignerState() {
  const {
    currentUser,
    currentUnit,
    items,
    unitStocks,
    units,
    furnitureTransfers,
    furnitureRemovalRequests,
    getItemById,
    getUnitById,
    getUserById,
    addFurnitureTransfer,
    updateFurnitureRemovalRequest,
    getWarehouseUnitId,
  } = useApp();

  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [addFurnitureDialogOpen, setAddFurnitureDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [transferObservations, setTransferObservations] = useState('');
  const [viewingUnit, setViewingUnit] = useState('');
  const [removalDialogOpen, setRemovalDialogOpen] = useState(false);
  const [selectedRemovalRequest, setSelectedRemovalRequest] = useState<string | null>(null);
  const [disposalJustification, setDisposalJustification] = useState('');
  const [requestRemovalDialogOpen, setRequestRemovalDialogOpen] = useState(false);

  useEffect(() => {
    if (currentUnit) setViewingUnit(currentUnit.id);
  }, [currentUnit]);

  // --- derived data ---
  const furnitureItems = items.filter(i => i.isFurniture && i.active);
  const furnitureStock = unitStocks.filter(
    s => viewingUnit && s.unitId === viewingUnit && s.quantity > 0 && furnitureItems.some(i => i.id === s.itemId)
  );
  const myTransfers = furnitureTransfers.filter(t => t.requestedByUserId === currentUser?.id);
  const pendingTransfers = myTransfers.filter(t => t.status === 'pending');
  const approvedTransfers = myTransfers.filter(t => t.status === 'approved');
  const completedTransfers = myTransfers.filter(t => t.status === 'completed');
  const warehouseId = getWarehouseUnitId();
  const availableUnits = units.filter(u => u.id !== warehouseId && u.id !== viewingUnit && u.status === 'active');
  const viewableUnits = units.filter(u => u.id !== warehouseId && u.status === 'active');
  const pendingRemovalRequests = furnitureRemovalRequests.filter(r => r.status === 'pending');
  const approvedRemovalRequests = furnitureRemovalRequests.filter(
    r => r.status === 'approved_storage' || r.status === 'approved_disposal' ||
        r.status === 'awaiting_pickup' || r.status === 'in_transit'
  );
  const myRemovalRequests = furnitureRemovalRequests.filter(r => r.requestedByUserId === currentUser?.id);

  // --- handlers ---
  const handleRequestTransfer = (itemId: string, _fromUnitId: string) => {
    setSelectedItem(itemId);
    setTransferDialogOpen(true);
    setSelectedUnit('');
    setTransferObservations('');
  };

  const confirmTransfer = () => {
    if (!selectedItem || !selectedUnit || !currentUser || !viewingUnit) {
      toast.error('Por favor, selecione uma unidade de destino');
      return;
    }
    addFurnitureTransfer({
      itemId: selectedItem,
      fromUnitId: viewingUnit,
      toUnitId: selectedUnit,
      requestedByUserId: currentUser.id,
      status: 'pending',
      observations: transferObservations,
    });
    toast.success('Solicitação de transferência criada!', {
      description: 'Aguardando aprovação da administração',
    });
    setTransferDialogOpen(false);
    setSelectedItem(null);
    setSelectedUnit('');
    setTransferObservations('');
  };

  const handleApproveRemoval = (decision: 'storage' | 'disposal') => {
    if (!selectedRemovalRequest || !currentUser) return;
    const request = furnitureRemovalRequests.find(r => r.id === selectedRemovalRequest);
    if (!request) return;

    if (decision === 'disposal' && !disposalJustification.trim()) {
      toast.error('Justificativa é obrigatória para descarte');
      return;
    }

    const status = decision === 'storage' ? 'approved_storage' : 'approved_disposal';

    updateFurnitureRemovalRequest(selectedRemovalRequest, {
      status,
      reviewedByUserId: currentUser.id,
      reviewedAt: new Date(),
      disposalJustification: decision === 'disposal' ? disposalJustification : undefined,
    });

    const item = getItemById(request.itemId);
    const actionText = decision === 'storage' ? 'armazenagem' : 'descarte';
    toast.success(`Solicitação aprovada para ${actionText}!`, {
      description: `${item?.name} - Aguardando coleta do motorista`,
    });

    setRemovalDialogOpen(false);
    setSelectedRemovalRequest(null);
    setDisposalJustification('');
  };

  const handleRejectRemoval = (requestId: string) => {
    if (!currentUser) return;
    updateFurnitureRemovalRequest(requestId, {
      status: 'rejected',
      reviewedByUserId: currentUser.id,
      reviewedAt: new Date(),
    });
    toast.success('Solicitação rejeitada');
  };

  const handleEvaluateRemoval = (requestId: string) => {
    setSelectedRemovalRequest(requestId);
    setRemovalDialogOpen(true);
    setDisposalJustification('');
  };

  return {
    getItemById, getUnitById, getUserById, furnitureRemovalRequests,
    furnitureStock, viewingUnit, viewableUnits, availableUnits,
    pendingTransfers, approvedTransfers, completedTransfers,
    pendingRemovalRequests, approvedRemovalRequests, myRemovalRequests,
    selectedItem, transferDialogOpen, setTransferDialogOpen,
    addFurnitureDialogOpen, setAddFurnitureDialogOpen,
    selectedUnit, setSelectedUnit, transferObservations, setTransferObservations,
    removalDialogOpen, setRemovalDialogOpen, selectedRemovalRequest,
    disposalJustification, setDisposalJustification,
    requestRemovalDialogOpen, setRequestRemovalDialogOpen, setViewingUnit,
    handleRequestTransfer, confirmTransfer,
    handleApproveRemoval, handleRejectRemoval, handleEvaluateRemoval,
  };
}
