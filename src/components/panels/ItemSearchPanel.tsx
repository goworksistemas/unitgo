import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Search, Filter } from 'lucide-react';
import { ItemCard } from '../shared/ItemCard';
import { ItemDetailDialog } from '../dialogs/ItemDetailDialog';
import { Item } from '../../types';

export function ItemSearchPanel() {
  const { currentUnit, items, categories, getStockForItem } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);

  const filteredItems = useMemo(() => {
    // Excluir móveis da busca geral (móveis têm seção própria para designers)
    let result = items.filter(item => item.active && !item.isFurniture);

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
  }, [items, searchTerm, selectedCategory]);

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
        <CardHeader>
          <CardTitle>Buscar Itens</CardTitle>
          <CardDescription>Encontre itens disponíveis no estoque de {currentUnit.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search and Filters */}
            <div className="flex gap-3 flex-col sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                <div className="text-center py-12 text-slate-500">
                  <p>Nenhum item encontrado</p>
                  {searchTerm && (
                    <p className="text-sm mt-1">Tente ajustar os filtros de busca</p>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-sm text-slate-600">
                    {filteredItems.length} item(ns) encontrado(s)
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
          </div>
        </CardContent>
      </Card>

      {selectedItem && (
        <ItemDetailDialog
          item={selectedItem}
          stock={getStockForItem(selectedItem.id, currentUnit.id)}
          open={!!selectedItem}
          onClose={handleCloseDialog}
        />
      )}
    </>
  );
}
