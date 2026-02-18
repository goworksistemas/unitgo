import React, { useState } from 'react';
import { Item, UnitStock } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Package, AlertTriangle, MapPin, Calendar, FileText, ShoppingCart, Plus, Minus, UserPlus } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import { users } from '../../lib/mockData';

interface ItemDetailDialogProps {
  item: Item;
  stock: UnitStock | undefined;
  open: boolean;
  onClose: () => void;
}

export function ItemDetailDialog({ item, stock, open, onClose }: ItemDetailDialogProps) {
  const { currentUser, currentUnit, getCategoryById, addMovement, addLoan, updateStock } = useApp();
  const [actionType, setActionType] = useState<'none' | 'consume' | 'add' | 'remove' | 'loanToUser'>('none');
  const [quantity, setQuantity] = useState(1);
  const [observations, setObservations] = useState('');
  const [loanDays, setLoanDays] = useState(item.defaultLoanDays || 3);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [documentNumber, setDocumentNumber] = useState('');
  const [serviceOrder, setServiceOrder] = useState('');

  const category = getCategoryById(item.categoryId);
  const isBelowMinimum = stock && stock.quantity < stock.minimumQuantity;
  const isOutOfStock = stock && stock.quantity === 0;

  const isController = currentUser?.role === 'controller' || currentUser?.role === 'admin';

  // Filter users from current unit for loan assignment
  const unitUsers = users.filter(u => 
    u.primaryUnitId === currentUnit?.id && u.id !== currentUser?.id
  );

  const handleConsume = () => {
    if (!currentUser || !currentUnit || !stock) return;

    if (quantity > stock.quantity) {
      toast.error(`Saldo insuficiente para consumir ${quantity} unidades; saldo disponível: ${stock.quantity}`);
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    // For executors (controller with executor-like flow), service order is required
    if ((currentUser.role === 'executor' || currentUser.role === 'controller') && !serviceOrder.trim()) {
      toast.error('Informe a Ordem de Serviço ou tipo de serviço');
      return;
    }

    // Add movement
    addMovement({
      type: 'consumption',
      itemId: item.id,
      unitId: currentUnit.id,
      userId: currentUser.id,
      quantity,
      notes: serviceOrder ? `Serviço: ${serviceOrder}` : (item.isConsumable ? 'Consumo de item' : 'Uso definitivo'),
      workOrder: serviceOrder || undefined,
    });

    // Update stock
    updateStock(stock.id, stock.quantity - quantity);

    toast.success(`${quantity} ${item.unitOfMeasure} de "${item.name}" consumido(s) com sucesso`);
    
    resetForm();
    onClose();
  };



  const handleLoanToUser = () => {
    if (!currentUser || !currentUnit || !stock) return;

    if (!selectedUserId) {
      toast.error('Selecione um usuário responsável');
      return;
    }

    if (quantity > stock.quantity) {
      toast.error(`Saldo insuficiente para emprestar ${quantity} unidades; saldo disponível: ${stock.quantity}`);
      return;
    }

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (loanDays <= 0) {
      toast.error('Prazo deve ser maior que zero');
      return;
    }

    const expectedReturnDate = new Date();
    expectedReturnDate.setDate(expectedReturnDate.getDate() + loanDays);

    const responsibleUser = users.find(u => u.id === selectedUserId);

    // Add movement
    addMovement({
      type: 'loan',
      itemId: item.id,
      unitId: currentUnit.id,
      userId: currentUser.id,
      quantity,
      borrowerUnitId: currentUnit.id,
      notes: `Empréstimo para ${responsibleUser?.name}`,
    });

    // Add loan
    addLoan({
      itemId: item.id,
      unitId: currentUnit.id,
      responsibleUserId: selectedUserId,
      expectedReturnDate,
      status: 'active',
      observations: observations || undefined,
      serialNumber: item.serialNumber,
    });

    // Update stock
    updateStock(stock.id, stock.quantity - quantity);

    const returnDateStr = expectedReturnDate.toLocaleDateString('pt-BR');
    toast.success(`Empréstimo para ${responsibleUser?.name} registrado. Devolução prevista: ${returnDateStr}`);
    
    resetForm();
    onClose();
  };

  const handleAddStock = () => {
    if (!currentUser || !currentUnit || !stock) return;

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    // Add movement
    addMovement({
      type: 'entry',
      itemId: item.id,
      unitId: currentUnit.id,
      userId: currentUser.id,
      quantity,
      notes: documentNumber ? `Doc: ${documentNumber}` : 'Entrada de estoque',
    });

    // Update stock
    updateStock(stock.id, stock.quantity + quantity);

    toast.success(`${quantity} ${item.unitOfMeasure} de "${item.name}" adicionado(s) ao estoque`);
    
    resetForm();
    onClose();
  };

  const handleRemoveStock = () => {
    if (!currentUser || !currentUnit || !stock) return;

    if (quantity <= 0) {
      toast.error('Quantidade deve ser maior que zero');
      return;
    }

    if (quantity > stock.quantity) {
      toast.error(`Não é possível remover ${quantity} unidades; saldo disponível: ${stock.quantity}`);
      return;
    }

    if (!observations) {
      toast.error('Justificativa obrigatória para remoção de estoque');
      return;
    }

    // Add movement
    addMovement({
      type: 'adjustment',
      itemId: item.id,
      unitId: currentUnit.id,
      userId: currentUser.id,
      quantity: -quantity,
      notes: `Ajuste de estoque (remoção): ${observations}`,
    });

    // Update stock
    updateStock(stock.id, stock.quantity - quantity);

    toast.success(`${quantity} ${item.unitOfMeasure} de "${item.name}" removido(s) do estoque`);
    
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setActionType('none');
    setQuantity(1);
    setObservations('');
    setLoanDays(item.defaultLoanDays || 3);
    setSelectedUserId('');
    setDocumentNumber('');
    setServiceOrder('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const willBeBelowMinimum = stock && (stock.quantity - quantity) < stock.minimumQuantity;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">Detalhes do Item</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Informações completas e ações disponíveis
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Item Image and Basic Info */}
          <div className="flex gap-3 sm:gap-4">
            <div className="w-20 h-20 sm:w-32 sm:h-32 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
              {item.imageUrl ? (
                <ImageWithFallback
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Package className="w-8 h-8 sm:w-12 sm:h-12 text-slate-400" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-slate-900 mb-1 sm:mb-2 text-sm sm:text-base">{item.name}</h2>
              <p className="text-slate-600 mb-2 sm:mb-3 text-xs sm:text-sm">{item.description}</p>
              
              <div className="flex flex-wrap gap-2">
                {category && (
                  <Badge variant="outline">{category.name}</Badge>
                )}
                {item.isConsumable && (
                  <Badge variant="secondary">Consumível</Badge>
                )}
                {item.requiresResponsibilityTerm && (
                  <Badge variant="secondary">Requer Termo</Badge>
                )}
                {item.serialNumber && (
                  <Badge>Serial: {item.serialNumber}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Stock Info */}
          {stock && (
            <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3">
              <h3 className="text-slate-900 text-sm sm:text-base">Estoque na Unidade</h3>
              
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Quantidade Disponível</p>
                  <p className={`text-xl sm:text-2xl ${
                    isOutOfStock ? 'text-red-600' : 
                    isBelowMinimum ? 'text-orange-600' : 
                    'text-green-600'
                  }`}>
                    {stock.quantity} {item.unitOfMeasure}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Estoque Mínimo</p>
                  <p className="text-xl sm:text-2xl text-slate-900">{stock.minimumQuantity} {item.unitOfMeasure}</p>
                </div>
              </div>

              {stock.location && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">{stock.location}</span>
                </div>
              )}

              {isBelowMinimum && (
                <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded">
                  <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="text-xs sm:text-sm">Estoque abaixo do mínimo recomendado</span>
                </div>
              )}
            </div>
          )}

          {/* Loan Rules */}
          {!item.isConsumable && item.defaultLoanDays > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 sm:p-4">
              <div className="flex items-start gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs sm:text-sm text-blue-900">Prazo padrão de empréstimo</p>
                  <p className="text-xs sm:text-sm text-blue-700">{item.defaultLoanDays} dias</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          {stock && (
            <div className="border-t pt-3 sm:pt-4 space-y-3 sm:space-y-4">
              <h3 className="text-slate-900 text-sm sm:text-base">Ações Disponíveis</h3>

              {actionType === 'none' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {/* Executor Actions */}
                  {currentUser?.role === 'executor' && stock.quantity > 0 && (
                    <Button
                      onClick={() => setActionType('consume')}
                      variant="outline"
                      className="h-auto py-4 flex-col gap-2"
                    >
                      <ShoppingCart className="w-5 h-5" />
                      <span className="text-center">Consumir para Serviço</span>
                    </Button>
                  )}

                  {/* Controller Actions */}
                  {isController && (
                    <>
                      <Button
                        onClick={() => setActionType('add')}
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span className="text-center">Adicionar Estoque</span>
                      </Button>
                      <Button
                        onClick={() => setActionType('remove')}
                        variant="outline"
                        className="h-auto py-4 flex-col gap-2"
                      >
                        <Minus className="w-5 h-5" />
                        <span className="text-center">Remover Estoque</span>
                      </Button>
                      {!item.isConsumable && stock.quantity > 0 && (
                        <Button
                          onClick={() => setActionType('loanToUser')}
                          variant="outline"
                          className="h-auto py-4 flex-col gap-2"
                        >
                          <UserPlus className="w-5 h-5" />
                          <span className="text-center">Emprestar p/ Usuário</span>
                        </Button>
                      )}
                      {stock.quantity > 0 && (
                        <Button
                          onClick={() => setActionType('consume')}
                          variant="outline"
                          className="h-auto py-4 flex-col gap-2"
                        >
                          <ShoppingCart className="w-5 h-5" />
                          <span className="text-center">Registrar Consumo</span>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Add Stock Form */}
              {actionType === 'add' && (
                <div className="space-y-4 bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-slate-900 text-sm sm:text-base">Adicionar ao Estoque</h4>
                    <Button variant="ghost" size="sm" onClick={() => setActionType('none')} className="flex-shrink-0">
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="add-quantity">Quantidade a Adicionar</Label>
                      <Input
                        id="add-quantity"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="document-number">Número do Documento (Nota/OS)</Label>
                      <Input
                        id="document-number"
                        placeholder="Ex: NF-123456"
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="add-observations">Observações</Label>
                      <Textarea
                        id="add-observations"
                        placeholder="Motivo da entrada, fornecedor, etc..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="bg-green-50 p-3 rounded text-sm text-green-800">
                      Novo saldo: {stock.quantity + quantity} {item.unitOfMeasure}
                    </div>

                    <Button onClick={handleAddStock} className="w-full">
                      Confirmar Entrada
                    </Button>
                  </div>
                </div>
              )}

              {/* Remove Stock Form */}
              {actionType === 'remove' && (
                <div className="space-y-4 bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-slate-900 text-sm sm:text-base">Remover do Estoque</h4>
                    <Button variant="ghost" size="sm" onClick={() => setActionType('none')} className="flex-shrink-0">
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="remove-quantity">Quantidade a Remover</Label>
                      <Input
                        id="remove-quantity"
                        type="number"
                        min={1}
                        max={stock.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="remove-observations">Justificativa (Obrigatória)</Label>
                      <Textarea
                        id="remove-observations"
                        placeholder="Ex: Item danificado, descarte, correção de inventário..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="bg-orange-50 p-3 rounded text-sm text-orange-800">
                      Novo saldo: {stock.quantity - quantity} {item.unitOfMeasure}
                    </div>

                    <Button onClick={handleRemoveStock} className="w-full" variant="destructive">
                      Confirmar Remoção
                    </Button>
                  </div>
                </div>
              )}

              {/* Loan to User Form */}
              {actionType === 'loanToUser' && (
                <div className="space-y-4 bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-slate-900 text-sm sm:text-base">Emprestar para Usuário</h4>
                    <Button variant="ghost" size="sm" onClick={() => setActionType('none')} className="flex-shrink-0">
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="responsible-user">Responsável pelo Empréstimo</Label>
                      <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                        <SelectTrigger id="responsible-user">
                          <SelectValue placeholder="Selecione um usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {unitUsers.map(user => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name} - {user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="loan-user-quantity">Quantidade</Label>
                      <Input
                        id="loan-user-quantity"
                        type="number"
                        min={1}
                        max={stock.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="loan-user-days">Prazo (dias)</Label>
                      <Input
                        id="loan-user-days"
                        type="number"
                        min={1}
                        value={loanDays}
                        onChange={(e) => setLoanDays(parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Devolução prevista: {new Date(Date.now() + loanDays * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR')}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="loan-user-observations">Observações</Label>
                      <Textarea
                        id="loan-user-observations"
                        placeholder="Motivo do empréstimo..."
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {item.requiresResponsibilityTerm && (
                      <div className="flex items-center gap-2 text-blue-600 bg-blue-50 p-2 rounded text-sm">
                        <FileText className="w-4 h-4" />
                        <span>Este item requer termo de responsabilidade</span>
                      </div>
                    )}

                    {willBeBelowMinimum && (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Esta ação deixará o estoque abaixo do mínimo</span>
                      </div>
                    )}

                    <Button onClick={handleLoanToUser} className="w-full">
                      Confirmar Empréstimo
                    </Button>
                  </div>
                </div>
              )}

              {/* Existing consume and loan forms */}
              {actionType === 'consume' && (
                <div className="space-y-4 bg-muted p-4 rounded-lg">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-slate-900 text-sm sm:text-base">
                      {currentUser?.role === 'executor' ? 'Consumir Item para Serviço' : (item.isConsumable ? 'Consumir Item' : 'Usar Item (Definitivo)')}
                    </h4>
                    <Button variant="ghost" size="sm" onClick={() => setActionType('none')} className="flex-shrink-0">
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {currentUser?.role === 'executor' && (
                      <div>
                        <Label htmlFor="service-order">
                          Ordem de Serviço / Tipo de Serviço <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="service-order"
                          placeholder="Ex: OS-12345 ou Manutenção Elétrica Sala 301"
                          value={serviceOrder}
                          onChange={(e) => setServiceOrder(e.target.value)}
                          required
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Informe a OS ou descrição do serviço que está realizando
                        </p>
                      </div>
                    )}

                    <div>
                      <Label htmlFor="consume-quantity">Quantidade</Label>
                      <Input
                        id="consume-quantity"
                        type="number"
                        min={1}
                        max={stock.quantity}
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="consume-observations">Observações {currentUser?.role === 'executor' ? '(Opcional)' : ''}</Label>
                      <Textarea
                        id="consume-observations"
                        placeholder={currentUser?.role === 'executor' 
                          ? "Detalhes adicionais sobre o serviço..." 
                          : "Motivo ou observações sobre o uso..."}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {willBeBelowMinimum && (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded text-sm">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Esta ação deixará o estoque abaixo do mínimo</span>
                      </div>
                    )}

                    <Button onClick={handleConsume} className="w-full">
                      Confirmar Consumo
                    </Button>
                  </div>
                </div>
              )}


            </div>
          )}

          {isOutOfStock && (
            <div className="text-center py-4 text-slate-500">
              <p className="text-xs sm:text-sm">Item sem estoque disponível nesta unidade</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
