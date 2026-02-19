import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useIsMobile } from '../ui/use-mobile';

export function AddItemDialog() {
  const { categories, addItem } = useApp();
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('unidade');
  const [isConsumable, setIsConsumable] = useState(true);
  const [defaultMinimumQuantity, setDefaultMinimumQuantity] = useState(5);
  const [defaultLoanDays, setDefaultLoanDays] = useState(3);
  const [requiresResponsibilityTerm, setRequiresResponsibilityTerm] = useState(false);
  const [serialNumber, setSerialNumber] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [supplier, setSupplier] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setCategoryId('');
    setUnitOfMeasure('unidade');
    setIsConsumable(true);
    setDefaultMinimumQuantity(5);
    setDefaultLoanDays(3);
    setRequiresResponsibilityTerm(false);
    setSerialNumber('');
    setBrand('');
    setModel('');
    setSupplier('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error('Nome do item é obrigatório');
      return;
    }

    if (!categoryId) {
      toast.error('Categoria é obrigatória');
      return;
    }

    addItem({
      name: name.trim(),
      description: description.trim() || '',
      categoryId: categoryId || '',
      unitOfMeasure: unitOfMeasure || 'unidade',
      isConsumable,
      defaultMinimumQuantity: defaultMinimumQuantity ?? 0,
      defaultLoanDays: isConsumable ? 0 : (defaultLoanDays ?? 3),
      requiresResponsibilityTerm: isConsumable ? false : requiresResponsibilityTerm,
      serialNumber: serialNumber.trim() || undefined,
      brand: brand.trim() || undefined,
      model: model.trim() || undefined,
      active: true,
    });

    toast.success(`Item "${name}" cadastrado com sucesso!`);
    resetForm();
    setOpen(false);
  };

  const FormContent = () => (
    <form onSubmit={handleSubmit} className="space-y-4 px-1">
      {/* Basic Information */}
      <div className="space-y-3">
        <h4 className="text-sm text-foreground">Informações Básicas</h4>
        
        <div>
          <Label htmlFor="name">
            Nome do Item <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            placeholder="Ex: Café em Pó 500g"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Descrição detalhada do item..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="category">
              Categoria <span className="text-red-500">*</span>
            </Label>
            <Select value={categoryId} onValueChange={setCategoryId} required>
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecione a categoria" />
              </SelectTrigger>
              <SelectContent>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="unitOfMeasure">Unidade de Medida</Label>
            <Select value={unitOfMeasure} onValueChange={setUnitOfMeasure}>
              <SelectTrigger id="unitOfMeasure">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unidade">Unidade</SelectItem>
                <SelectItem value="pacote">Pacote</SelectItem>
                <SelectItem value="caixa">Caixa</SelectItem>
                <SelectItem value="kg">Quilograma (kg)</SelectItem>
                <SelectItem value="litro">Litro</SelectItem>
                <SelectItem value="metro">Metro</SelectItem>
                <SelectItem value="rolo">Rolo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Item Type */}
      <div className="space-y-3 pt-3 border-t">
        <h4 className="text-sm text-foreground">Tipo de Item</h4>
        
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex-1 pr-3">
            <Label htmlFor="isConsumable" className="cursor-pointer">
              Item Consumível
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              {isConsumable 
                ? 'Item de uso único (ex: café, papel)' 
                : 'Item emprestável (ex: ferramentas)'}
            </p>
          </div>
          <Switch
            id="isConsumable"
            checked={isConsumable}
            onCheckedChange={setIsConsumable}
          />
        </div>

        <div>
          <Label htmlFor="minQuantity">Quantidade Mínima</Label>
          <Input
            id="minQuantity"
            type="number"
            min={0}
            value={defaultMinimumQuantity}
            onChange={(e) => setDefaultMinimumQuantity(parseInt(e.target.value) || 0)}
          />
        </div>

        {!isConsumable && (
          <>
            <div>
              <Label htmlFor="loanDays">Prazo de Empréstimo (dias)</Label>
              <Input
                id="loanDays"
                type="number"
                min={1}
                value={defaultLoanDays}
                onChange={(e) => setDefaultLoanDays(parseInt(e.target.value) || 1)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg">
              <div className="flex-1 pr-3">
                <Label htmlFor="requiresTerm" className="cursor-pointer">
                  Termo de Responsabilidade
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Para itens de alto valor
                </p>
              </div>
              <Switch
                id="requiresTerm"
                checked={requiresResponsibilityTerm}
                onCheckedChange={setRequiresResponsibilityTerm}
              />
            </div>
          </>
        )}
      </div>

      {/* Additional Details */}
      <div className="space-y-3 pt-3 border-t">
        <h4 className="text-sm text-foreground">Detalhes Adicionais (Opcional)</h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="brand">Marca</Label>
            <Input
              id="brand"
              placeholder="Ex: Pilão"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="model">Modelo</Label>
            <Input
              id="model"
              placeholder="Ex: Tradicional"
              value={model}
              onChange={(e) => setModel(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label htmlFor="serialNumber">Número de Série / SKU</Label>
            <Input
              id="serialNumber"
              placeholder="Ex: CF-500-TRD"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="supplier">Fornecedor</Label>
            <Input
              id="supplier"
              placeholder="Ex: Distribuidora ABC"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isMobile && (
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              resetForm();
              setOpen(false);
            }}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button type="submit" className="flex-1">
            Cadastrar Item
          </Button>
        </div>
      )}
    </form>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild>
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Cadastrar Item</span>
            <span className="sm:hidden">Novo</span>
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[96vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Cadastrar Novo Item</DrawerTitle>
            <DrawerDescription>
              Adicione um novo item ao catálogo
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <FormContent />
          </div>
          <DrawerFooter className="pt-2">
            <Button type="submit" onClick={handleSubmit}>
              Cadastrar Item
            </Button>
            <DrawerClose asChild>
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  setOpen(false);
                }}
              >
                Cancelar
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" />
          Cadastrar Novo Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cadastrar Novo Item no Catálogo</DialogTitle>
          <DialogDescription>
            Adicione um novo item que estará disponível para todas as unidades
          </DialogDescription>
        </DialogHeader>
        <FormContent />
      </DialogContent>
    </Dialog>
  );
}
