import React from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit } from 'lucide-react';
import type { DeveloperState } from './types';
import { ItemFormBody } from './ItemFormBody';

type Props = Pick<DeveloperState,
  | 'items' | 'categories'
  | 'isAddItemDialogOpen' | 'setIsAddItemDialogOpen'
  | 'itemForm' | 'setItemForm'
  | 'isUploadingImage'
  | 'handleAddItem' | 'handleEditItem' | 'handleImageUpload'
>;

export function ItemCreationPanel({
  items, categories,
  isAddItemDialogOpen, setIsAddItemDialogOpen,
  itemForm, setItemForm,
  isUploadingImage,
  handleAddItem, handleEditItem, handleImageUpload,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card p-6 rounded-xl border shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Gestão de Produtos</h2>
          <p className="text-sm text-muted-foreground">Adicione novos itens ao sistema</p>
        </div>
        <Dialog open={isAddItemDialogOpen} onOpenChange={setIsAddItemDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto bg-primary hover:bg-primary/90">
              <PlusCircle className="w-4 h-4" />
              Novo Produto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Novo Produto</DialogTitle>
              <DialogDescription>O produto será criado em todas as unidades com estoque zerado</DialogDescription>
            </DialogHeader>
            <ItemFormBody
              itemForm={itemForm}
              setItemForm={setItemForm}
              categories={categories}
              isUploadingImage={isUploadingImage}
              handleImageUpload={handleImageUpload}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddItemDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddItem} className="bg-primary hover:bg-primary/90">Criar Produto</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ItemsTable items={items} categories={categories} handleEditItem={handleEditItem} />
    </div>
  );
}

function ItemsTable({ items, categories, handleEditItem }: Pick<Props, 'items' | 'categories' | 'handleEditItem'>) {
  return (
    <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-accent/50">
            <TableHead>ID</TableHead>
            <TableHead>Nome</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Estoque Mín.</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                Nenhum produto cadastrado. Use o botão acima para adicionar.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.id.replace('item-', '')}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-8 h-8 rounded object-cover"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                    <span>{item.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {categories.find(c => c.id === item.categoryId)?.name || '-'}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    {item.isFurniture && <Badge variant="outline" className="text-xs">Móvel</Badge>}
                    {item.isConsumable && <Badge variant="secondary" className="text-xs">Consumível</Badge>}
                    {!item.isFurniture && !item.isConsumable && <Badge variant="default" className="text-xs">Material</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-center">{item.defaultMinimumQuantity || 0}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditItem(item)}
                    className="h-8 w-8 text-slate-500 hover:text-slate-900"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
