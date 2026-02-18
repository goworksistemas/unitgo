import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '@/utils/supabase/info';
import type { Unit } from '@/types';
import type { UnitFormState } from './types';

const INITIAL_UNIT_FORM: UnitFormState = {
  name: '',
  address: '',
  status: 'active',
  floors: [],
};

export function useUnitHandlers() {
  const { units, addUnit, updateUnit, deleteUnit, getWarehouseUnitId } = useApp();

  const [isAddUnitDialogOpen, setIsAddUnitDialogOpen] = useState(false);
  const [isEditUnitDialogOpen, setIsEditUnitDialogOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [unitForm, setUnitForm] = useState<UnitFormState>({ ...INITIAL_UNIT_FORM });

  const resetUnitForm = () => setUnitForm({ ...INITIAL_UNIT_FORM });

  const handleAddUnit = async () => {
    if (!unitForm.name || !unitForm.address) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    try {
      await addUnit({
        name: unitForm.name,
        address: unitForm.address,
        status: unitForm.status,
        floors: unitForm.floors,
      });
      toast.success('Unidade criada com sucesso');
      setIsAddUnitDialogOpen(false);
      resetUnitForm();
    } catch (error) {
      toast.error('Erro ao criar unidade. Verifique o console.');
      console.error('Error creating unit:', error);
    }
  };

  const handleEditUnit = (unit: Unit) => {
    setSelectedUnit(unit);
    setUnitForm({
      name: unit.name,
      address: unit.address,
      status: unit.status,
      floors: Array.isArray(unit.floors) ? unit.floors : [],
    });
    setIsEditUnitDialogOpen(true);
  };

  const handleUpdateUnit = async () => {
    if (!selectedUnit) return;
    try {
      await updateUnit(selectedUnit.id, {
        name: unitForm.name,
        address: unitForm.address,
        status: unitForm.status,
        floors: unitForm.floors,
      });
      toast.success('Unidade atualizada com sucesso');
      setIsEditUnitDialogOpen(false);
      setSelectedUnit(null);
      resetUnitForm();
    } catch (error) {
      toast.error('Erro ao atualizar unidade. Verifique o console.');
      console.error('Error updating unit:', error);
    }
  };

  const handleDeleteUnit = (unitId: string) => {
    const warehouseId = getWarehouseUnitId();
    if (unitId === warehouseId) {
      toast.error('Não é possível excluir o Almoxarifado Central');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta unidade? Todos os estoques serão removidos.')) {
      deleteUnit(unitId);
      toast.success('Unidade excluída com sucesso');
    }
  };

  const handleInitSchema = async () => {
    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-46b247d8/init-schema`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      toast.success('Schema inicializado! Verifique o console para detalhes.');
      console.log('Schema initialization:', data);
    } catch (error) {
      console.error('Error initializing schema:', error);
      toast.error('Erro ao inicializar schema. Verifique o console.');
    }
  };

  return {
    units,
    isAddUnitDialogOpen, setIsAddUnitDialogOpen,
    isEditUnitDialogOpen, setIsEditUnitDialogOpen,
    selectedUnit, unitForm, setUnitForm,
    handleAddUnit, handleEditUnit, handleUpdateUnit,
    handleDeleteUnit, handleInitSchema, getWarehouseUnitId,
  };
}
