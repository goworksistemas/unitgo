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
            <p className="text-sm text-muted-foreground mb-4">
              {filteredStock.length === furnitureStock.length
                ? `${furnitureStock.length} item(ns) nesta unidade`
                : `${filteredStock.length} de ${furnitureStock.length} item(ns)`}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredStock.map((stock) => {
                const item = getItemById(stock.itemId);
                if (!item) return null;

                return (
                  <Card key={stock.id} className="overflow-hidden border-border/80 text-sm">
                    {item.imageUrl ? (
                      <>
                        <div className="relative aspect-[4/3] max-h-24 sm:max-h-28 w-full overflow-hidden bg-muted">
                          <img
                            src={item.imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="border-b border-border/60 bg-muted/40 px-1 py-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-full gap-1 px-1.5 text-[11px] leading-tight text-muted-foreground hover:text-foreground"
                            onClick={() =>
                              setImagePreview({ src: item.imageUrl!, title: item.name })
                            }
                          >
                            <Maximize2 className="h-3 w-3 shrink-0" aria-hidden />
                            Ver imagem completa
                          </Button>
                        </div>
                      </>
                    ) : null}
                    <CardContent className="p-2.5 sm:p-3">
                      <div className="space-y-2">
                        <div>
                          <h3 className="text-sm font-medium leading-snug">{item.name}</h3>
                          {item.description ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-snug">
                              {item.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          <span className="truncate">{stock.location || 'Sem local definido'}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                              Qtd.
                            </div>
                            <div className="text-lg font-semibold tabular-nums leading-none mt-0.5">
                              {stock.quantity}
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-8 shrink-0 px-2.5 text-xs"
                            onClick={() => onRequestTransfer(item.id, stock.unitId)}
                            disabled={stock.quantity === 0 || availableUnitsCount === 0}
                            title={
                              availableUnitsCount === 0
                                ? 'Não há outras unidades disponíveis para transferência'
                                : undefined
                            }
                          >
                            <ArrowRightLeft className="h-3.5 w-3.5 mr-1" />
                            Transferir
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
