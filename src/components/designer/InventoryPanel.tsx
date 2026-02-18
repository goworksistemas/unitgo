import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, MapPin, ArrowRightLeft } from 'lucide-react';
import type { Item, Unit, UnitStock } from '@/types';

export interface InventoryPanelProps {
  furnitureStock: UnitStock[];
  viewingUnit: string;
  viewableUnits: Unit[];
  availableUnitsCount: number;
  onViewingUnitChange: (unitId: string) => void;
  onAddFurniture: () => void;
  onRequestTransfer: (itemId: string, fromUnitId: string) => void;
  getItemById: (id: string) => Item | undefined;
}

export function InventoryPanel({
  furnitureStock,
  viewingUnit,
  viewableUnits,
  availableUnitsCount,
  onViewingUnitChange,
  onAddFurniture,
  onRequestTransfer,
  getItemById,
}: InventoryPanelProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Móveis Disponíveis</CardTitle>
            <CardDescription>Visualize e gerencie o inventário de móveis por unidade</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button onClick={onAddFurniture} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Móvel
            </Button>
            <div className="flex items-center gap-2">
              <Label htmlFor="unit-selector" className="whitespace-nowrap">Unidade:</Label>
              <Select value={viewingUnit} onValueChange={onViewingUnitChange}>
                <SelectTrigger id="unit-selector" className="w-[200px]">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {viewableUnits.map(unit => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewingUnit ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {furnitureStock.map(stock => {
              const item = getItemById(stock.itemId);
              if (!item) return null;

              return (
                <Card key={stock.id} className="overflow-hidden">
                  {item.imageUrl && (
                    <div className="h-48 overflow-hidden bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <h3 className="mb-1">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-foreground">{stock.location}</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-muted-foreground">Quantidade</div>
                          <div className="text-2xl">{stock.quantity}</div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onRequestTransfer(item.id, stock.unitId)}
                          disabled={stock.quantity === 0 || availableUnitsCount === 0}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          Transferir
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {furnitureStock.length === 0 && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                Nenhum móvel cadastrado nesta unidade
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Selecione uma unidade para visualizar os móveis
          </div>
        )}
      </CardContent>
    </Card>
  );
}
