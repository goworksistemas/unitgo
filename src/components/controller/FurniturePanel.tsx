import { useMemo, useState } from 'react';
import type { Unit, Item, UnitStock, FurnitureRemovalRequest, FurnitureRequestToDesigner } from '@/types';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Separator } from '../ui/separator';
import {
  Armchair,
  Plus,
  Trash2,
  MoreHorizontal,
  Palette,
  ScrollText,
  Calendar,
  MapPin,
  Maximize2,
  Search,
} from 'lucide-react';
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

  const [furnitureTab, setFurnitureTab] = useState<'moveis' | 'designer' | 'historico'>(() =>
    pendingToDesigner.length > 0 ? 'designer' : 'moveis',
  );
  const [search, setSearch] = useState('');
  const [imagePreview, setImagePreview] = useState<{ src: string; title: string } | null>(null);

  const filteredFurnitureStock = useMemo(() => {
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
    <div className="space-y-4">
      <Tabs
        value={furnitureTab}
        onValueChange={(v) => setFurnitureTab(v as 'moveis' | 'designer' | 'historico')}
        className="w-full"
      >
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

        <TabsContent value="moveis" className="mt-4 space-y-4" forceMount={false}>
          {furnitureTab === 'moveis' ? (
            <>
      <div className="flex flex-col gap-2 mb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            <Armchair className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <h3 className="text-xs font-medium text-foreground">Móveis da Unidade</h3>
            <span className="text-xs text-muted-foreground">
              {filteredFurnitureStock.length === furnitureStock.length
                ? `${furnitureStock.length} item(ns)`
                : `${filteredFurnitureStock.length} de ${furnitureStock.length}`}
            </span>
            {pendingRemovals.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                {pendingRemovals.length} retirada(s) pendente(s)
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
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
            <Button type="button" onClick={onAddFurniture} size="sm">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Cadastrar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" size="sm" variant="outline">
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
        {furnitureStock.length > 0 ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" aria-hidden />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por móvel, marca ou local…"
              className="pl-9 h-9 text-sm"
              aria-label="Buscar móveis nesta unidade"
            />
          </div>
        ) : null}
      </div>

      {furnitureStock.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <Armchair className="h-6 w-6 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhum móvel cadastrado nesta unidade</p>
        </div>
      ) : filteredFurnitureStock.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-muted-foreground text-sm">
          Nenhum resultado para &quot;{search.trim()}&quot;. Ajuste o termo de busca ou o filtro de andar.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
          {filteredFurnitureStock.map((stock) => {
            const item = getItemById(stock.itemId);
            if (!item) return null;

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
                        onClick={() => setImagePreview({ src: item.imageUrl!, title: item.name })}
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
                    <h4
                      className="text-[11px] sm:text-xs font-medium leading-tight line-clamp-2 min-h-[2rem] sm:min-h-[2.25rem]"
                      title={item.name}
                    >
                      {item.name}
                    </h4>
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

                    <div className="flex items-center justify-end border-t border-border/80 pt-1">
                      <span className="text-xs font-semibold tabular-nums" title="Quantidade">
                        ×{stock.quantity}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
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
            </>
          ) : null}
        </TabsContent>

        <TabsContent value="historico" className="mt-4" forceMount={false}>
          {furnitureTab === 'historico' ? <UnitMovementsHistory filterByFurniture={true} /> : null}
        </TabsContent>

        <TabsContent value="designer" className="mt-4" forceMount={false}>
          {furnitureTab === 'designer' ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Palette className="h-4 w-4" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">Solicitações ao designer</h3>
                    <p className="text-xs text-muted-foreground">
                      {pendingToDesigner.length === 0
                        ? 'Nenhuma solicitação na fila'
                        : `${pendingToDesigner.length} solicitação${pendingToDesigner.length === 1 ? '' : 'ões'} aguardando o designer`}
                    </p>
                  </div>
                </div>
                <Button onClick={onRequestFurniture} size="sm" className="shrink-0 w-full sm:w-auto">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Nova solicitação
                </Button>
              </div>

              {pendingToDesigner.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Lista de solicitações</p>
                  {pendingToDesigner.map((r) => {
                    const item = getItemById(r.itemId);
                    const created = new Date(r.createdAt);
                    const dateStr = `${created.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })} · ${created.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                    const hasObs = Boolean(r.observations?.trim());

                    return (
                      <Card
                        key={r.id}
                        className={cn(
                          'border border-border/80 shadow-sm transition-shadow hover:shadow-md',
                          'border-l-4 border-l-amber-500 bg-amber-500/[0.04] dark:bg-amber-950/15',
                        )}
                      >
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-base font-semibold text-foreground leading-snug">
                                {item?.name ?? 'Item removido do catálogo'}
                              </p>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1.5">
                                  <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                  {dateStr}
                                </span>
                                {r.location ? (
                                  <span className="inline-flex items-center gap-1.5 min-w-0">
                                    <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                                    <span className="truncate max-w-[min(100%,280px)]">{r.location}</span>
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-foreground/90 leading-relaxed">
                                <span className="font-medium text-muted-foreground text-xs uppercase tracking-wide block mb-1">Justificativa</span>
                                {r.justification}
                              </p>
                              {hasObs ? (
                                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{r.observations}</p>
                              ) : null}
                            </div>
                            <div className="flex flex-row flex-wrap items-stretch gap-3 lg:flex-col lg:items-end shrink-0">
                              <div className="rounded-lg border border-border/80 bg-muted/40 px-4 py-2.5 min-w-[7rem]">
                                <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Quantidade</p>
                                <p className="text-lg font-semibold tabular-nums text-foreground">{r.quantity}</p>
                              </div>
                              <Badge
                                variant="outline"
                                className="h-fit border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/25 dark:text-amber-200 shrink-0"
                              >
                                Aguardando designer
                              </Badge>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-dashed border-border/80 bg-muted/20">
                  <CardContent className="flex flex-col items-center justify-center py-14 px-6 text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Palette className="h-6 w-6 text-muted-foreground/50" aria-hidden />
                    </div>
                    <p className="text-sm font-medium text-foreground">Nenhuma solicitação na fila</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                      Para pedir móveis ao designer, use <span className="font-medium text-foreground/90">Nova solicitação</span> ou o menu em <span className="font-medium text-foreground/90">Móveis da unidade</span>.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>

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
