import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Search, Filter, Plus, Boxes, ScrollText } from 'lucide-react';
import { ItemCard } from '../shared/ItemCard';
import { ItemDetailDialog } from '../dialogs/ItemDetailDialog';
import { AddToUnitDialog } from '../dialogs/AddToUnitDialog';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';
import { Item } from '../../types';

interface ItemSearchPanelProps {
  title?: string;
  description?: string;
}

export function ItemSearchPanel({ title = 'Buscar Itens', description }: ItemSearchPanelProps) {
  const { currentUnit, items, categories, getStockForItem } = useApp();
  const desc = description ?? (currentUnit ? `Encontre itens disponíveis no estoque de ${currentUnit.name}` : '');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'estoque' | 'historico'>('estoque');

  const filteredItems = useMemo(() => {
    if (!currentUnit) return [];
    // Excluir móveis da busca geral (móveis têm seção própria para designers)
    // Mostrar APENAS itens que têm estoque na unidade atual (não o catálogo completo)
    let result = items.filter(item => {
      if (!item.active || item.isFurniture) return false;
      const stock = getStockForItem(item.id, currentUnit.id);
      return stock !== undefined;
    });

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        item =>
          item.name.toLowerCase().includes(search) ||
          item.description.toLowerCase().includes(search) ||
          item.serialNumber?.toLowerCase().includes(search)
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      result = result.filter(item => item.categoryId === selectedCategory);
    }

    return result;
  }, [items, searchTerm, selectedCategory, currentUnit, getStockForItem]);

  const handleItemClick = (item: Item) => {
    setSelectedItem(item);
  };

  const handleCloseDialog = () => {
    setSelectedItem(null);
  };

  if (!currentUnit) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buscar Itens</CardTitle>
          <CardDescription>Selecione uma unidade para visualizar os itens disponíveis</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{desc}</CardDescription>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'estoque' | 'historico')} className="w-full">
            <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
              <TabsTrigger
                value="estoque"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              >
                <Boxes className="h-4 w-4 shrink-0" />
                Estoque
              </TabsTrigger>
              <TabsTrigger
                value="historico"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
              >
                <ScrollText className="h-4 w-4 shrink-0" />
                Histórico
              </TabsTrigger>
            </TabsList>

            <TabsContent value="estoque" className="mt-4 space-y-4" forceMount={false}>
              {mainTab === 'estoque' ? (
              <>
              {/* Search and Filters */}
              <div className="flex gap-3 flex-col sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, descrição ou serial..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories
                      .filter(cat => cat.name !== 'Móveis')
                      .map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {filteredItems.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>Nenhum material no estoque desta unidade</p>
                    {searchTerm || selectedCategory !== 'all' ? (
                      <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
                    ) : (
                      <p className="text-sm mt-1">Use o botão Adicionar para registrar entrada de materiais</p>
                    )}
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      {filteredItems.length} item(ns) no estoque da unidade
                    </p>
                    {filteredItems.map(item => {
                      const stock = getStockForItem(item.id, currentUnit.id);
                      return (
                        <ItemCard
                          key={item.id}
                          item={item}
                          stock={stock}
                          onClick={() => handleItemClick(item)}
                        />
                      );
                    })}
                  </>
                )}
              </div>
              </>
              ) : null}
            </TabsContent>

            <TabsContent value="historico" className="mt-4" forceMount={false}>
              {mainTab === 'historico' ? <UnitMovementsHistory filterByFurniture={false} /> : null}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <AddToUnitDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />

      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          stock={getStockForItem(selectedItem.id, currentUnit.id)}
          open={!!selectedItem}
          onClose={handleCloseDialog}
          showControllerActions
        />
      )}
    </>
  );
}
