import React, { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { toast } from 'sonner';
import { projectId, publicAnonKey, functionSlug } from '@/utils/supabase/info';
import type { ItemFormState } from './types';

const INITIAL_ITEM_FORM: ItemFormState = {
  name: '',
  categoryId: '',
  description: '',
  unitOfMeasure: 'unidade',
  isConsumable: true,
  requiresResponsibilityTerm: false,
  defaultLoanDays: 0,
  defaultMinimumQuantity: 5,
  serialNumber: '',
  imageUrl: '',
  isUniqueProduct: false,
};

export function useItemHandlers() {
  const { categories, items, addItem, updateItem } = useApp();

  const [isAddItemDialogOpen, setIsAddItemDialogOpen] = useState(false);
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [itemForm, setItemForm] = useState<ItemFormState>({ ...INITIAL_ITEM_FORM });

  const resetItemForm = () => setItemForm({ ...INITIAL_ITEM_FORM });

  const handleAddItem = () => {
    if (!itemForm.name || !itemForm.categoryId) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    addItem({
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      description: itemForm.description,
      unitOfMeasure: itemForm.unitOfMeasure,
      isConsumable: itemForm.isConsumable,
      requiresResponsibilityTerm: itemForm.requiresResponsibilityTerm,
      defaultLoanDays: itemForm.defaultLoanDays,
      defaultMinimumQuantity: itemForm.defaultMinimumQuantity,
      serialNumber: itemForm.serialNumber || undefined,
      imageUrl: itemForm.imageUrl || undefined,
      active: true,
    });
    toast.success('Item criado com sucesso');
    setIsAddItemDialogOpen(false);
    resetItemForm();
  };

  const handleEditItem = (item: any) => {
    setSelectedItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      description: item.description,
      unitOfMeasure: item.unitOfMeasure,
      isConsumable: item.isConsumable,
      requiresResponsibilityTerm: item.requiresResponsibilityTerm,
      defaultLoanDays: item.defaultLoanDays,
      defaultMinimumQuantity: item.defaultMinimumQuantity,
      serialNumber: item.serialNumber || '',
      imageUrl: item.imageUrl || '',
      isUniqueProduct: item.isUniqueProduct || false,
    });
    setIsEditItemDialogOpen(true);
  };

  const handleUpdateItem = () => {
    if (!selectedItem) return;
    updateItem(selectedItem.id, {
      name: itemForm.name,
      categoryId: itemForm.categoryId,
      description: itemForm.description,
      unitOfMeasure: itemForm.unitOfMeasure,
      isConsumable: itemForm.isConsumable,
      requiresResponsibilityTerm: itemForm.requiresResponsibilityTerm,
      defaultLoanDays: itemForm.defaultLoanDays,
      defaultMinimumQuantity: itemForm.defaultMinimumQuantity,
      serialNumber: itemForm.serialNumber || undefined,
      imageUrl: itemForm.imageUrl || undefined,
      active: true,
    });
    toast.success('Item atualizado com sucesso');
    setIsEditItemDialogOpen(false);
    setSelectedItem(null);
    resetItemForm();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione apenas arquivos de imagem');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/${functionSlug}/upload-image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${publicAnonKey}` },
        body: formData,
      });
      if (!response.ok) throw new Error('Falha no upload da imagem');
      const data = await response.json();
      setItemForm((prev) => ({ ...prev, imageUrl: data.url }));
      toast.success('Imagem enviada com sucesso');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Erro ao enviar imagem');
    } finally {
      setIsUploadingImage(false);
    }
  };

  return {
    categories, items,
    isAddItemDialogOpen, setIsAddItemDialogOpen,
    isEditItemDialogOpen, setIsEditItemDialogOpen,
    selectedItem, isUploadingImage,
    itemForm, setItemForm,
    handleAddItem, handleEditItem, handleUpdateItem, handleImageUpload,
  };
}
