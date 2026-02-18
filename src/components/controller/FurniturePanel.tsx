import type { Unit, Item, UnitStock, FurnitureRemovalRequest } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Armchair, Plus, Trash2, MapPin } from 'lucide-react';

type RemovalRequestWithOrigin = FurnitureRemovalRequest & { originUnitId?: string };

interface FurniturePanelProps {
  currentUnit: Unit;
  items: Item[];
  unitStocks: UnitStock[];
  getItemById: (id: string) => Item | undefined;
  furnitureRemovalRequests: RemovalRequestWithOrigin[];
  selectedFloor: string;
  onFloorChange: (floor: string) => void;
  onAddFurniture: () => void;
  onRequestFurniture: () => void;
  onRemoval: () => void;
}

export function FurniturePanel({
  currentUnit,
  items,
  unitStocks,
  getItemById,
  furnitureRemovalRequests,
  selectedFloor,
  onFloorChange,
  onAddFurniture,
  onRequestFurniture,
  onRemoval,
}: FurniturePanelProps) {
  const furnitureItems = items.filter(item => item.isFurniture && item.active);
  let furnitureStock = unitStocks.filter(
    stock => stock.unitId === currentUnit.id &&
    furnitureItems.some(item => item.id === stock.itemId) &&
    stock.quantity > 0
  );

  if (selectedFloor !== 'all') {
    furnitureStock = furnitureStock.filter(stock =>
      stock.location?.startsWith(selectedFloor)
    );
  }

  const pendingRemovals = furnitureRemovalRequests.filter(
    req => req.originUnitId === currentUnit.id && req.status === 'pending'
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Armchair className="h-5 w-5" />
              Móveis da Unidade
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Móveis em {currentUnit.name}
            </CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={selectedFloor} onValueChange={onFloorChange}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filtrar por andar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os andares</SelectItem>
                {currentUnit?.floors && Array.isArray(currentUnit.floors) && currentUnit.floors.length > 0 ? (
                  currentUnit.floors.map((floor) => (
                    <SelectItem key={floor} value={floor}>{floor}</SelectItem>
                  ))
                ) : null}
              </SelectContent>
            </Select>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={onAddFurniture} size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Móvel
              </Button>
              <Button onClick={onRequestFurniture} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Solicitar ao Designer
              </Button>
              <Button onClick={onRemoval} size="sm" variant="outline">
                <Trash2 className="h-4 w-4 mr-2" />
                Solicitar Retirada
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {furnitureStock.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Armchair className="h-12 w-12 mx-auto mb-3 text-slate-300" />
              <p>Nenhum móvel cadastrado nesta unidade</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {furnitureStock.map(stock => {
                const item = getItemById(stock.itemId);
                if (!item) return null;
                return (
                  <Card key={stock.id}>
                    {item.imageUrl && (
                      <div className="h-40 overflow-hidden bg-gray-100">
                        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-base flex-1">{item.name}</CardTitle>
                        {stock.location && (
                          <Badge className="bg-primary shrink-0">{stock.location.split(' - ')[0]}</Badge>
                        )}
                      </div>
                      <CardDescription className="text-xs line-clamp-2">{item.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-600">Quantidade:</span>
                        <Badge variant="outline">{stock.quantity}</Badge>
                      </div>
                      {stock.location && stock.location.includes(' - ') && (
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs truncate">{stock.location.split(' - ')[1]}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {pendingRemovals.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-sm mb-3">Solicitações Pendentes</h4>
              <div className="space-y-2">
                {pendingRemovals.map(req => {
                  const item = getItemById(req.itemId);
                  if (!item) return null;
                  return (
                    <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg border">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-600">Qtd: {req.quantity}</p>
                      </div>
                      <Badge variant="outline">Aguardando aprovação</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
