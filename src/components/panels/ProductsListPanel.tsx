import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Package, Edit, Search, Check, X } from 'lucide-react';
import { Item } from '../../types';
import { toast } from 'sonner';

export function ProductsListPanel() {
  const { items, categories, getCategoryById } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editDialog, setEditDialog] = useState<{ open: boolean; item?: Item }>({
    open: false
  });

  const [formData, setFormData] = useState<Partial<Item>>({});

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = filterCategory === 'all' || item.categoryId === filterCategory;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchTerm, filterCategory]);

  const openEditDialog = (item: Item) => {
    setFormData({
      name: item.name,
      description: item.description,
      categoryId: item.categoryId,
      unitOfMeasure: item.unitOfMeasure,
      isConsumable: item.isConsumable,
      requiresResponsibilityTerm: item.requiresResponsibilityTerm,
      defaultLoanDays: item.defaultLoanDays,
      defaultMinimumQuantity: item.defaultMinimumQuantity,
      brand: item.brand,
      model: item.model,
      imageUrl: item.imageUrl,
      isUniqueProduct: item.isUniqueProduct,
      isFurniture: item.isFurniture,
      active: item.active,
    });
    setEditDialog({ open: true, item });
  };

  const handleSave = () => {
    // Em uma aplicação real, aqui você salvaria as alterações
    toast.success('Produto atualizado com sucesso!');
    setEditDialog({ open: false });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Lista de Produtos
          </CardTitle>
          <CardDescription>
            Visualize e edite os produtos cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Products Table */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map(item => {
                  const category = getCategoryById(item.categoryId);

                  return (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{item.name}</div>
                          {(item.brand || item.model) && (
                            <div className="text-xs text-muted-foreground">
                              {item.brand} {item.model}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{category?.name}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.isConsumable && (
                            <Badge variant="secondary" className="text-xs">
                              Consumível
                            </Badge>
                          )}
                          {item.isUniqueProduct && (
                            <Badge variant="default" className="text-xs bg-primary/10 text-primary border-primary/30">
                              ID Único
                            </Badge>
                          )}
                          {item.isFurniture && (
                            <Badge variant="outline" className="text-xs">
                              Móvel
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{item.unitOfMeasure}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.active ? 'default' : 'secondary'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEditDialog(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-semibold">{items.length}</div>
              <div className="text-xs text-muted-foreground">Total de Produtos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {items.filter(i => i.active).length}
              </div>
              <div className="text-xs text-muted-foreground">Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {items.filter(i => i.isUniqueProduct).length}
              </div>
              <div className="text-xs text-muted-foreground">Com ID Único</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-semibold">
                {items.filter(i => i.isConsumable).length}
              </div>
              <div className="text-xs text-muted-foreground">Consumíveis</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => setEditDialog({ open })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Nome *</Label>
                <Input
                  id="edit-name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-category">Categoria *</Label>
                <Select 
                  value={formData.categoryId} 
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Descrição</Label>
              <Textarea
                id="edit-description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-unit">Unidade de Medida</Label>
                <Input
                  id="edit-unit"
                  value={formData.unitOfMeasure || ''}
                  onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-brand">Marca</Label>
                <Input
                  id="edit-brand"
                  value={formData.brand || ''}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-model">Modelo</Label>
                <Input
                  id="edit-model"
                  value={formData.model || ''}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-loanDays">Dias Empréstimo Padrão</Label>
                <Input
                  id="edit-loanDays"
                  type="number"
                  value={formData.defaultLoanDays || 0}
                  onChange={(e) => setFormData({ ...formData, defaultLoanDays: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-minQty">Quantidade Mínima</Label>
                <Input
                  id="edit-minQty"
                  type="number"
                  value={formData.defaultMinimumQuantity || 0}
                  onChange={(e) => setFormData({ ...formData, defaultMinimumQuantity: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-imageUrl">URL da Imagem</Label>
              <Input
                id="edit-imageUrl"
                value={formData.imageUrl || ''}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-consumable"
                  checked={formData.isConsumable || false}
                  onChange={(e) => setFormData({ ...formData, isConsumable: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-consumable" className="cursor-pointer">
                  É consumível?
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-term"
                  checked={formData.requiresResponsibilityTerm || false}
                  onChange={(e) => setFormData({ ...formData, requiresResponsibilityTerm: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-term" className="cursor-pointer">
                  Requer termo?
                </Label>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-unique"
                  checked={formData.isUniqueProduct || false}
                  onChange={(e) => setFormData({ ...formData, isUniqueProduct: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-unique" className="cursor-pointer">
                  Produto Único?
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-furniture"
                  checked={formData.isFurniture || false}
                  onChange={(e) => setFormData({ ...formData, isFurniture: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-furniture" className="cursor-pointer">
                  É móvel?
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="edit-active"
                  checked={formData.active !== false}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4"
                />
                <Label htmlFor="edit-active" className="cursor-pointer">
                  Ativo?
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false })}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
