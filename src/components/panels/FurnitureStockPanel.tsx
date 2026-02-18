import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Armchair, Sofa, AlertCircle, Plus, Edit } from 'lucide-react';
import { EditFurnitureStockDialog } from '../dialogs/EditFurnitureStockDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface FurnitureStockPanelProps {
  onAddFurniture: () => void;
}

export function FurnitureStockPanel({ onAddFurniture }: FurnitureStockPanelProps) {
  const { items, getItemById, unitStocks, getWarehouseUnitId } = useApp();
  const [editingStockId, setEditingStockId] = useState<string | null>(null);

  const warehouseId = getWarehouseUnitId();
  const warehouseStock = unitStocks.filter(s => s.unitId === warehouseId);
  
  const furnitureStock = warehouseStock.filter(s => {
    const item = items.find(i => i.id === s.itemId);
    return item?.isFurniture;
  });

  const lowStockFurniture = furnitureStock.filter(s => s.quantity < s.minimumQuantity);

  // Categorizar móveis por tipo
  const chairs = furnitureStock.filter(s => {
    const item = getItemById(s.itemId);
    return item?.name.toLowerCase().includes('cadeira');
  });

  const tables = furnitureStock.filter(s => {
    const item = getItemById(s.itemId);
    return item?.name.toLowerCase().includes('mesa') || item?.name.toLowerCase().includes('escrivaninha');
  });

  const storage = furnitureStock.filter(s => {
    const item = getItemById(s.itemId);
    return item?.name.toLowerCase().includes('armário') || item?.name.toLowerCase().includes('estante');
  });

  const seating = furnitureStock.filter(s => {
    const item = getItemById(s.itemId);
    return item?.name.toLowerCase().includes('poltrona') || item?.name.toLowerCase().includes('sofá');
  });

  const renderFurnitureTable = (stockList: typeof furnitureStock, emptyMessage: string) => {
    if (stockList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500 text-sm">
          {emptyMessage}
        </div>
      );
    }

    return (
      <>
        {/* Mobile View - Cards */}
        <div className="block lg:hidden space-y-2">
          {stockList.map(stock => {
            const item = getItemById(stock.itemId);
            const isLow = stock.quantity < stock.minimumQuantity;
            
            return (
              <div key={stock.id} className="border rounded-lg p-3 bg-white">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Armchair className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">{item?.name || 'Item não encontrado'}</h4>
                      <p className="text-xs text-gray-500 line-clamp-1">{item?.description}</p>
                    </div>
                  </div>
                  {isLow ? (
                    <Badge variant="destructive" className="gap-1 text-xs flex-shrink-0">
                      <AlertCircle className="h-3 w-3" />
                      Baixo
                    </Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-600 text-xs flex-shrink-0">OK</Badge>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-gray-500 truncate flex-1 mr-2">{stock.location}</span>
                  <div className="flex gap-2 items-center flex-shrink-0">
                    <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                      {stock.quantity}
                    </span>
                    <span className="text-gray-400">/</span>
                    <span className="text-gray-600">{stock.minimumQuantity}</span>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingStockId(stock.id)}
                  className="w-full"
                >
                  <Edit className="h-3 w-3 mr-2" />
                  Editar Estoque
                </Button>
              </div>
            );
          })}
        </div>

        {/* Desktop View - Table */}
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Móvel</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead className="text-center">Disponível</TableHead>
                <TableHead className="text-center">Mínimo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockList.map(stock => {
                const item = getItemById(stock.itemId);
                const isLow = stock.quantity < stock.minimumQuantity;
                
                return (
                  <TableRow key={stock.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Armchair className="h-4 w-4 text-primary" />
                        <span className="font-medium">{item?.name || 'Item não encontrado'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{item?.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{stock.location}</span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`font-semibold ${isLow ? 'text-red-600' : 'text-green-600'}`}>
                        {stock.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {stock.minimumQuantity}
                    </TableCell>
                    <TableCell>
                      {isLow ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Baixo
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Disponível</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingStockId(stock.id)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </>
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Sofa className="h-5 w-5 text-primary" />
              Estoque de Móveis
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Gestão completa de móveis disponíveis para distribuição às unidades
            </CardDescription>
          </div>
          <Button onClick={onAddFurniture} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 sm:mr-2" />
            <span className="sm:inline">Cadastrar Móvel</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 text-xs">
            <TabsTrigger value="all" className="text-xs">
              <span>Todos</span>
              <span className="ml-1">({furnitureStock.length})</span>
            </TabsTrigger>
            <TabsTrigger value="low" className="text-xs">
              <AlertCircle className="h-3 w-3 sm:mr-1" />
              <span className="hidden sm:inline">Baixo Estoque</span>
              <span className="sm:hidden">Baixo</span>
              <span className="ml-1">({lowStockFurniture.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4">
              <Card>
                <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-6">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-primary">{furnitureStock.length}</div>
                    <p className="text-xs text-gray-600 mt-1">Total de Móveis</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-6">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-green-600">
                      {furnitureStock.filter(s => s.quantity >= s.minimumQuantity).length}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Estoque OK</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-6">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-red-600">{lowStockFurniture.length}</div>
                    <p className="text-xs text-gray-600 mt-1">Baixo Estoque</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 sm:pt-6 pb-3 sm:pb-6">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-semibold text-secondary">
                      {furnitureStock.reduce((sum, s) => sum + s.quantity, 0)}
                    </div>
                    <p className="text-xs text-gray-600 mt-1">Unidades Total</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            {renderFurnitureTable(furnitureStock, 'Nenhum móvel em estoque')}
          </TabsContent>

          <TabsContent value="low" className="space-y-3 sm:space-y-4">
            {lowStockFurniture.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-green-100 mb-3 sm:mb-4">
                  <Armchair className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-1 sm:mb-2">Estoque de Móveis OK</h3>
                <p className="text-sm text-gray-600">Todos os móveis estão com quantidade adequada</p>
              </div>
            ) : (
              <>
                <div className="bg-red-50 p-3 sm:p-4 rounded-lg border border-red-200 mb-3 sm:mb-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-sm sm:text-base text-red-900">Atenção: Reposição Necessária</h4>
                      <p className="text-xs sm:text-sm text-red-700 mt-1">
                        {lowStockFurniture.length} {lowStockFurniture.length === 1 ? 'móvel está' : 'móveis estão'} abaixo do estoque mínimo
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 sm:space-y-3">
                  {lowStockFurniture.map(stock => {
                    const item = getItemById(stock.itemId);
                    const percentage = ((stock.quantity / stock.minimumQuantity) * 100).toFixed(0);
                    
                    return (
                      <div 
                        key={stock.id} 
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-white rounded-lg border-2 border-red-200 hover:border-red-300 transition-colors gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-1 min-w-0">
                          <div className="p-2 sm:p-3 rounded-lg bg-red-50 flex-shrink-0">
                            <Armchair className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm sm:text-lg truncate">{item?.name}</div>
                            <div className="text-xs sm:text-sm text-gray-600 line-clamp-1">{item?.description}</div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs">
                                {stock.location}
                              </Badge>
                              <Badge 
                                variant="destructive" 
                                className="text-xs"
                              >
                                {percentage}% do mínimo
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                          <div className="text-right flex-shrink-0">
                            <div className="text-2xl sm:text-3xl font-bold text-red-600">
                              {stock.quantity}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600">
                              de {stock.minimumQuantity} mínimo
                            </div>
                            <div className="text-xs text-red-600 font-medium mt-1">
                              Faltam {stock.minimumQuantity - stock.quantity}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingStockId(stock.id)}
                            className="flex-shrink-0"
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>

      {/* Dialog de Edição de Estoque */}
      {editingStockId && (
        <EditFurnitureStockDialog
          open={!!editingStockId}
          onOpenChange={(open) => !open && setEditingStockId(null)}
          stockId={editingStockId}
        />
      )}
    </Card>
  );
}