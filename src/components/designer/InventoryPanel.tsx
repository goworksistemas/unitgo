import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Plus, MapPin, ArrowRightLeft, Search, Maximize2 } from 'lucide-react';
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
  const [search, setSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);

  const filteredStock = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return furnitureStock;
    return furnitureStock.filter((stock) => {
      const item = getItemById(stock.itemId);
      if (!item) return false;
      const hay = `${item.name} ${item.description ?? ''} ${item.brand ?? ''} ${item.model ?? ''} ${stock.location ?? ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [furnitureStock, search, getItemById]);

  return (
    <>
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <CardTitle>Inventário de móveis</CardTitle>
            <CardDescription>
              Escolha a unidade, busque por nome ou local e solicite transferência quando precisar.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <Button type="button" onClick={onAddFurniture} size="sm" className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar móvel
            </Button>
            <div className="flex flex-col gap-1.5 sm:min-w-[220px]">
              <Label htmlFor="unit-selector" className="text-xs text-muted-foreground">
                Unidade
              </Label>
              <Select value={viewingUnit} onValueChange={onViewingUnitChange}>
                <SelectTrigger id="unit-selector" className="w-full sm:w-[240px]">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {viewableUnits.map((unit) => (
                    <SelectItem key={unit.id} value={unit.id}>
                      {unit.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        {viewingUnit ? (
          <div className="relative pt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por móvel, marca ou local…"
              className="pl-9"
              aria-label="Buscar móveis nesta unidade"
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        {viewingUnit ? (
          <>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3">
              {filteredStock.length === furnitureStock.length
                ? `${furnitureStock.length} item(ns) nesta unidade`
                : `${filteredStock.length} de ${furnitureStock.length} item(ns)`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
              {filteredStock.map((stock) => {
                const item = getItemById(stock.itemId);
                if (!item) return null;

                const transferTitle =
                  availableUnitsCount === 0
                    ? 'Não há outras unidades disponíveis para transferência'
                    : 'Solicitar transferência';

                return (
                  <Card key={stock.id} className="overflow-hidden border-border/80 shadow-none">
                    {item.imageUrl ? (
                      <div className="flex flex-col gap-0">
                        <div className="relative h-14 sm:h-16 w-full overflow-hidden bg-muted">
                          <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex border-b border-border/50 bg-muted/30">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-6 w-full shrink-0 rounded-none text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setImagePreview({ src: item.imageUrl!, title: item.name })
                            }
                            aria-label={`Ver imagem completa: ${item.name}`}
                            title="Ver imagem completa"
                          >
                            <Maximize2 className="h-3 w-3" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    ) : null}
                    <CardContent className="p-1.5 sm:p-2">
                      <div className="space-y-1">
                        <h3
                          className="text-[11px] sm:text-xs font-medium leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem]"
                          title={item.name}
                        >
                          {item.name}
                        </h3>
                        {item.description ? (
                          <p
                            className="text-[10px] text-muted-foreground line-clamp-1 leading-tight"
                            title={item.description}
                          >
                            {item.description}
                          </p>
                        ) : null}

                        <div className="flex items-start gap-0.5 text-[10px] text-muted-foreground leading-tight">
                          <MapPin className="h-3 w-3 shrink-0 mt-px" aria-hidden />
                          <span className="line-clamp-1" title={stock.location || undefined}>
                            {stock.location || '—'}
                          </span>
                        </div>

                        <div className="flex items-center justify-between gap-1 border-t border-border/80 pt-1">
                          <span className="text-xs font-semibold tabular-nums shrink-0" title="Quantidade">
                            ×{stock.quantity}
                          </span>
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => onRequestTransfer(item.id, stock.unitId)}
                            disabled={stock.quantity === 0 || availableUnitsCount === 0}
                            title={transferTitle}
                            aria-label={`Transferir ${item.name}`}
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {furnitureStock.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground text-sm">
                  Nenhum móvel com estoque nesta unidade. Use <span className="font-medium text-foreground">Cadastrar móvel</span> para incluir itens.
                </div>
              )}

              {furnitureStock.length > 0 && filteredStock.length === 0 && (
                <div className="col-span-full rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground text-sm">
                  Nenhum resultado para &quot;{search.trim()}&quot;. Ajuste o termo de busca.
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground text-sm">
            Selecione uma unidade para carregar o inventário.
          </div>
        )}
      </CardContent>
    </Card>

    <Dialog open={!!imagePreview} onOpenChange={(open) => !open && setImagePreview(null)}>
      <DialogContent className="max-w-[min(100vw-1.5rem,56rem)] gap-3 p-3 sm:p-4">
        <DialogHeader className="pr-8 text-left">
          <DialogTitle className="text-base leading-snug">{imagePreview?.title}</DialogTitle>
        </DialogHeader>
        {imagePreview ? (
          <div className="flex max-h-[min(85vh,calc(100dvh-8rem))] justify-center overflow-auto rounded-md border border-border bg-muted/30 p-2">
            <img
              src={imagePreview.src}
              alt={imagePreview.title}
              className="h-auto max-h-[min(80vh,calc(100dvh-10rem))] w-auto max-w-full object-contain"
            />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
    </>
  );
}
