import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Package, Armchair, Truck, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import type { Request, FurnitureRequestToDesigner } from '../../types';

interface CreateBatchDeliveryDialogProps {
  open: boolean;
  onClose: () => void;
  requests: Request[];
  furnitureRequests: FurnitureRequestToDesigner[];
  targetUnitId?: string;
}

export function CreateBatchDeliveryDialog({ 
  open, 
  onClose, 
  requests, 
  furnitureRequests,
  targetUnitId 
}: CreateBatchDeliveryDialogProps) {
  const { 
    currentUser, 
    users,
    getItemById, 
    getUnitById,
    createDeliveryBatch
  } = useApp();

  const [selectedRequestIds, setSelectedRequestIds] = useState<string[]>([]);
  const [selectedFurnitureIds, setSelectedFurnitureIds] = useState<string[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');

  // Filtrar apenas motoristas
  const drivers = users.filter(u => u.warehouseType === 'delivery');

  // Filtrar apenas itens aprovados (que ainda não fazem parte de lote)
  const filteredRequests = targetUnitId 
    ? requests.filter(r => r.requestingUnitId === targetUnitId && r.status === 'approved')
    : requests.filter(r => r.status === 'approved');

  const filteredFurnitureRequests = targetUnitId
    ? furnitureRequests.filter(r => r.requestingUnitId === targetUnitId && r.status === 'in_transit')
    : furnitureRequests.filter(r => r.status === 'in_transit');

  const toggleRequest = (requestId: string) => {
    const request = requests.find(r => r.id === requestId);
    if (!request) return;

    // Se já está selecionado, remover
    if (selectedRequestIds.includes(requestId)) {
      setSelectedRequestIds(prev => prev.filter(id => id !== requestId));
      return;
    }

    // Verificar se há itens de outra unidade já selecionados
    const currentUnitId = request.requestingUnitId;
    const hasOtherUnit = [
      ...requests.filter(r => selectedRequestIds.includes(r.id)).map(r => r.requestingUnitId),
      ...furnitureRequests.filter(r => selectedFurnitureIds.includes(r.id)).map(r => r.requestingUnitId)
    ].some(unitId => unitId !== currentUnitId);

    if (hasOtherUnit) {
      toast.error('⚠️ Um lote só pode ter itens da MESMA unidade!');
      return;
    }

    setSelectedRequestIds(prev => [...prev, requestId]);
  };

  const toggleFurnitureRequest = (requestId: string) => {
    const request = furnitureRequests.find(r => r.id === requestId);
    if (!request) return;

    // Se já está selecionado, remover
    if (selectedFurnitureIds.includes(requestId)) {
      setSelectedFurnitureIds(prev => prev.filter(id => id !== requestId));
      return;
    }

    // Verificar se há itens de outra unidade já selecionados
    const currentUnitId = request.requestingUnitId;
    const hasOtherUnit = [
      ...requests.filter(r => selectedRequestIds.includes(r.id)).map(r => r.requestingUnitId),
      ...furnitureRequests.filter(r => selectedFurnitureIds.includes(r.id)).map(r => r.requestingUnitId)
    ].some(unitId => unitId !== currentUnitId);

    if (hasOtherUnit) {
      toast.error('⚠️ Um lote só pode ter itens da MESMA unidade!');
      return;
    }

    setSelectedFurnitureIds(prev => [...prev, requestId]);
  };

  const selectAllFromUnit = (unitId: string) => {
    const unitRequestIds = filteredRequests
      .filter(r => r.requestingUnitId === unitId)
      .map(r => r.id);
    const unitFurnitureIds = filteredFurnitureRequests
      .filter(r => r.requestingUnitId === unitId)
      .map(r => r.id);

    setSelectedRequestIds(prev => [...new Set([...prev, ...unitRequestIds])]);
    setSelectedFurnitureIds(prev => [...new Set([...prev, ...unitFurnitureIds])]);
  };

  const handleCreateBatch = () => {
    if (selectedRequestIds.length === 0 && selectedFurnitureIds.length === 0) {
      toast.error('Selecione pelo menos um item para entrega');
      return;
    }

    if (!selectedDriverId) {
      toast.error('Selecione um motorista');
      return;
    }

    // Verificar unidade de destino
    const destinationUnitId = targetUnitId || 
      (selectedRequestIds.length > 0 
        ? requests.find(r => r.id === selectedRequestIds[0])?.requestingUnitId
        : furnitureRequests.find(r => r.id === selectedFurnitureIds[0])?.requestingUnitId);

    if (!destinationUnitId) {
      toast.error('Erro ao determinar unidade de destino');
      return;
    }

    // VALIDAÇÃO CRÍTICA: Todos os itens devem ser da mesma unidade
    const selectedMaterialRequests = requests.filter(r => selectedRequestIds.includes(r.id));
    const selectedFurnitures = furnitureRequests.filter(r => selectedFurnitureIds.includes(r.id));
    
    const allHaveSameUnit = [
      ...selectedMaterialRequests.map(r => r.requestingUnitId),
      ...selectedFurnitures.map(r => r.requestingUnitId)
    ].every(unitId => unitId === destinationUnitId);

    if (!allHaveSameUnit) {
      toast.error('❌ Todos os itens do lote devem ser para a MESMA unidade!');
      return;
    }

    const batchId = createDeliveryBatch(
      selectedRequestIds,
      selectedFurnitureIds,
      destinationUnitId,
      selectedDriverId
    );

    const driver = users.find(u => u.id === selectedDriverId);
    const unit = getUnitById(destinationUnitId);
    const totalItems = selectedRequestIds.length + selectedFurnitureIds.length;

    toast.success(
      `Lote criado! ${totalItems} item(ns) atribuído(s) a ${driver?.name} para ${unit?.name} 🚚`,
      { duration: 5000 }
    );

    onClose();
    
    // Resetar seleções
    setSelectedRequestIds([]);
    setSelectedFurnitureIds([]);
    setSelectedDriverId('');
  };

  // Agrupar por unidade
  const requestsByUnit = filteredRequests.reduce((acc, req) => {
    const unitId = req.requestingUnitId;
    if (!acc[unitId]) acc[unitId] = [];
    acc[unitId].push(req);
    return acc;
  }, {} as Record<string, Request[]>);

  const furnitureRequestsByUnit = filteredFurnitureRequests.reduce((acc, req) => {
    const unitId = req.requestingUnitId;
    if (!acc[unitId]) acc[unitId] = [];
    acc[unitId].push(req);
    return acc;
  }, {} as Record<string, FurnitureRequestToDesigner[]>);

  const allUnits = [...new Set([
    ...Object.keys(requestsByUnit),
    ...Object.keys(furnitureRequestsByUnit)
  ])];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            Criar Lote de Entrega
          </DialogTitle>
          <DialogDescription>
            Selecione 1 ou mais itens da mesma unidade para criar o lote
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Seleção de Motorista */}
          <div className="space-y-2">
            <Label>Motorista Responsável *</Label>
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="w-full border border-border bg-input-background rounded-lg p-2 text-sm text-foreground"
            >
              <option value="">Selecione um motorista</option>
              {drivers.map(driver => (
                <option key={driver.id} value={driver.id}>
                  {driver.name}
                </option>
              ))}
            </select>
          </div>

          {/* Alert informativo */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              ⚠️ <strong>Importante:</strong> Selecione apenas itens da MESMA unidade. Cada lote gera um QR Code único para rastreamento.
            </AlertDescription>
          </Alert>

          {/* Lista de Itens por Unidade */}
          <div className="border rounded-lg max-h-96 overflow-y-auto">
            {allUnits.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                Nenhum item disponível para entrega
              </div>
            ) : (
              <div className="divide-y">
                {allUnits.map(unitId => {
                  const unit = getUnitById(unitId);
                  const unitRequests = requestsByUnit[unitId] || [];
                  const unitFurniture = furnitureRequestsByUnit[unitId] || [];
                  const totalUnitItems = unitRequests.length + unitFurniture.length;

                  return (
                    <div key={unitId} className="p-4 space-y-3">
                      {/* Header da Unidade */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-primary">{unit?.name}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {totalUnitItems} item(ns)
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => selectAllFromUnit(unitId)}
                        >
                          Selecionar Todos
                        </Button>
                      </div>

                      {/* Materiais */}
                      {unitRequests.map(request => {
                        const item = getItemById(request.itemId);
                        const isSelected = selectedRequestIds.includes(request.id);

                        return (
                          <div
                            key={request.id}
                            className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleRequest(request.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRequest(request.id)}
                            />
                            <Package className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm">{item?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Quantidade: {request.quantity}
                              </p>
                            </div>
                          </div>
                        );
                      })}

                      {/* Móveis */}
                      {unitFurniture.map(request => {
                        const item = getItemById(request.itemId);
                        const isSelected = selectedFurnitureIds.includes(request.id);

                        return (
                          <div
                            key={request.id}
                            className={`flex items-center gap-3 p-2 rounded border transition-colors cursor-pointer ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
                            onClick={() => toggleFurnitureRequest(request.id)}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleFurnitureRequest(request.id)}
                            />
                            <Armchair className="h-4 w-4 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="text-sm">{item?.name}</p>
                              <p className="text-xs text-muted-foreground">
                                Quantidade: {request.quantity}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resumo da Seleção */}
          {(selectedRequestIds.length > 0 || selectedFurnitureIds.length > 0) ? (
            <Alert className="bg-primary/10 border-primary">
              <Package className="h-4 w-4" />
              <AlertDescription>
                <span className="font-medium">
                  ✓ {selectedRequestIds.length + selectedFurnitureIds.length} item(ns) selecionado(s)
                </span>
                <br />
                <span className="text-xs">
                  {selectedRequestIds.length} material(is) • {selectedFurnitureIds.length} móvel(is)
                </span>
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-700">
              <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertDescription className="text-yellow-900 dark:text-yellow-300 text-xs">
                Selecione pelo menos 1 item para criar o lote
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleCreateBatch}
            disabled={
              (selectedRequestIds.length === 0 && selectedFurnitureIds.length === 0) || 
              !selectedDriverId
            }
            className="bg-primary hover:bg-primary/90"
          >
            <Truck className="h-4 w-4 mr-2" />
            Criar Lote e Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}