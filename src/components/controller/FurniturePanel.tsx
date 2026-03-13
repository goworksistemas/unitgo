import type { Unit, Item, UnitStock, FurnitureRemovalRequest, FurnitureRequestToDesigner } from '@/types';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import { Armchair, Plus, Trash2, MoreHorizontal, Clock, History, Palette, ScrollText } from 'lucide-react';
import { UnitMovementsHistory } from '../delivery/UnitMovementsHistory';

type RemovalRequestWithOrigin = FurnitureRemovalRequest & { originUnitId?: string };

interface FurniturePanelProps {
  currentUnit: Unit;
  items: Item[];
  unitStocks: UnitStock[];
  getItemById: (id: string) => Item | undefined;
  furnitureRemovalRequests: RemovalRequestWithOrigin[];
  furnitureRequestsToDesigner?: FurnitureRequestToDesigner[];
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
  furnitureRequestsToDesigner = [],
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

  const pendingToDesigner = furnitureRequestsToDesigner.filter(
    r => r.requestingUnitId === currentUnit.id && r.status === 'pending_designer'
  );

  return (
    <div className="space-y-4">
      <Tabs defaultValue={pendingToDesigner.length > 0 ? 'designer' : 'moveis'} className="w-full">
        <TabsList className="h-auto rounded-none bg-transparent border-b border-border p-0 mb-4 gap-0 w-full justify-start">
          <TabsTrigger
            value="moveis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
          >
            <Armchair className="h-4 w-4 shrink-0" />
            Móveis da Unidade
          </TabsTrigger>
          <TabsTrigger
            value="designer"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
          >
            <Palette className="h-4 w-4 shrink-0" />
            Solicitações ao Designer
            {pendingToDesigner.length > 0 && (
              <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                {pendingToDesigner.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="historico"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-foreground text-muted-foreground px-4 py-2.5 text-sm data-[state=active]:font-medium flex items-center gap-2 transition-colors"
          >
            <ScrollText className="h-4 w-4 shrink-0" />
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="moveis" className="mt-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Armchair className="h-3.5 w-3.5 text-muted-foreground" />
          <h3 className="text-xs font-medium text-foreground">Móveis da Unidade</h3>
          <span className="text-xs text-muted-foreground">{furnitureStock.length} itens</span>
          {pendingRemovals.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
              {pendingRemovals.length} retirada(s) pendente(s)
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <Select value={selectedFloor} onValueChange={onFloorChange}>
            <SelectTrigger className="h-7 text-xs w-[140px]">
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
          <Button onClick={onAddFurniture} size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Cadastrar
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onRequestFurniture}>
                <Plus className="h-3.5 w-3.5 mr-2" />
                Solicitar ao Designer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemoval}>
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                Solicitar Retirada
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {furnitureStock.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Armchair className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum móvel cadastrado nesta unidade</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          {furnitureStock.map(stock => {
            const item = getItemById(stock.itemId);
            if (!item) return null;
            const locationPart = stock.location?.split(' - ')[0] || '';
            const roomPart = stock.location?.includes(' - ') ? stock.location.split(' - ')[1] : stock.location || '';
            return (
              <div
                key={stock.id}
                className="rounded-md border border-border overflow-hidden bg-background"
              >
                {item.imageUrl ? (
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="aspect-video bg-muted flex flex-col items-center justify-center gap-1">
                    <Armchair className="h-5 w-5 text-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground/50">sem imagem</span>
                  </div>
                )}
                <div className="p-2.5">
                  <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[11px] text-muted-foreground truncate max-w-[60%]">
                      {roomPart || locationPart || '—'}
                    </span>
                    <span className="text-[11px] text-muted-foreground">×{stock.quantity}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {pendingRemovals.length > 0 && (
        <>
          <Separator className="my-4" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-medium text-foreground">Solicitações Pendentes</h3>
              <span className="text-xs text-muted-foreground">{pendingRemovals.length} itens</span>
            </div>
          </div>
          <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
            {pendingRemovals.map(req => {
              const item = getItemById(req.itemId);
              if (!item) return null;
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-muted/50 transition-colors border-l-[3px] border-yellow-400"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Qtd: {req.quantity}</p>
                  </div>
                  <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 shrink-0">
                    Aguardando aprovação
                  </Badge>
                </div>
              );
            })}
          </div>
        </>
      )}
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <UnitMovementsHistory filterByFurniture={true} />
        </TabsContent>

        <TabsContent value="designer" className="mt-4">
          {pendingToDesigner.length > 0 ? (
            <div className="rounded-md border border-border overflow-hidden divide-y divide-border bg-background">
              {pendingToDesigner.map(r => {
                const item = getItemById(r.itemId);
                return (
                  <div
                    key={r.id}
                    className="flex items-center gap-2.5 px-3 py-2.5 hover:bg-muted/50 transition-colors border-l-[3px] border-yellow-400"
                  >
                    <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item?.name ?? '—'}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Qtd: {r.quantity}</p>
                    </div>
                    <Badge variant="outline" className="border-yellow-300 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 shrink-0">
                      Aguardando designer
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
              <Armchair className="h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Nenhuma solicitação aguardando designer</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
