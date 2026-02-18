import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';
import { ImageWithFallback } from '@/components/figma/ImageWithFallback';
import type { Category } from '@/types';
import type { ItemFormState } from './types';

interface ItemFormBodyProps {
  itemForm: ItemFormState;
  setItemForm: (f: ItemFormState) => void;
  categories: Category[];
  isUploadingImage: boolean;
  handleImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function ItemFormBody({ itemForm, setItemForm, categories, isUploadingImage, handleImageUpload }: ItemFormBodyProps) {
  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="itemName">Nome do Produto *</Label>
          <Input
            id="itemName"
            value={itemForm.name}
            onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
            placeholder="Ex: Cabo HDMI 2m"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="category">Categoria *</Label>
          <Select
            value={itemForm.categoryId}
            onValueChange={(value) => setItemForm({ ...itemForm, categoryId: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Input
          id="description"
          value={itemForm.description}
          onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
          placeholder="Descrição detalhada do produto"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
          <Input
            id="unitOfMeasure"
            value={itemForm.unitOfMeasure}
            onChange={(e) => setItemForm({ ...itemForm, unitOfMeasure: e.target.value })}
            placeholder="Ex: unidade, par, caixa"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="serialNumber">Número de Série</Label>
          <Input
            id="serialNumber"
            value={itemForm.serialNumber}
            onChange={(e) => setItemForm({ ...itemForm, serialNumber: e.target.value })}
            placeholder="Opcional"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="defaultMinQuantity">Estoque Mínimo</Label>
          <Input
            id="defaultMinQuantity"
            type="number"
            value={itemForm.defaultMinimumQuantity}
            onChange={(e) => setItemForm({ ...itemForm, defaultMinimumQuantity: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="defaultLoanDays">Dias de Empréstimo Padrão</Label>
          <Input
            id="defaultLoanDays"
            type="number"
            value={itemForm.defaultLoanDays}
            onChange={(e) => setItemForm({ ...itemForm, defaultLoanDays: parseInt(e.target.value) || 0 })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="imageUpload">Imagem do Produto</Label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              id="imageUpload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={isUploadingImage}
              className="cursor-pointer"
            />
            {isUploadingImage && (
              <span className="text-sm text-muted-foreground">Enviando...</span>
            )}
          </div>
          {itemForm.imageUrl && (
            <div className="flex items-center gap-2 p-2 border rounded bg-muted">
              <ImageWithFallback
                src={itemForm.imageUrl}
                alt="Preview"
                className="w-16 h-16 object-cover rounded"
              />
              <div className="flex-1 text-sm text-muted-foreground truncate">
                {itemForm.imageUrl}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setItemForm({ ...itemForm, imageUrl: '' })}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isConsumable"
            checked={itemForm.isConsumable}
            onChange={(e) => setItemForm({ ...itemForm, isConsumable: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="isConsumable" className="cursor-pointer">É consumível?</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="requiresResponsibilityTerm"
            checked={itemForm.requiresResponsibilityTerm}
            onChange={(e) => setItemForm({ ...itemForm, requiresResponsibilityTerm: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="requiresResponsibilityTerm" className="cursor-pointer">Requer termo de responsabilidade?</Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isUniqueProduct"
            checked={itemForm.isUniqueProduct || false}
            onChange={(e) => setItemForm({ ...itemForm, isUniqueProduct: e.target.checked })}
            className="w-4 h-4"
          />
          <Label htmlFor="isUniqueProduct" className="cursor-pointer">Produto Único (requer ID individual)?</Label>
        </div>
      </div>
    </div>
  );
}
