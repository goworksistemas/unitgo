import { useMemo } from 'react';
import { AlertTriangle, Package } from 'lucide-react';
import { useApp } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useNavigation } from '@/hooks/useNavigation';

const WORK_SECTION_ID = 'buyer-work';

export interface BuyerPurchaseSuggestionsPanelProps {
  relaxedBuyerScope?: boolean;
}

/**
 * Sugestões com base no estoque do almoxarifado central — itens abaixo do mínimo.
 * O comprador usa isso como fila de possíveis recompras (não cria SC automaticamente).
 */
export function BuyerPurchaseSuggestionsPanel(_props: BuyerPurchaseSuggestionsPanelProps) {
  const { items, unitStocks, getWarehouseUnitId, getItemById } = useApp();
  const { setActiveSection } = useNavigation();
  const warehouseId = getWarehouseUnitId();

  const suggestions = useMemo(() => {
    if (!warehouseId) return [];
    const materialItems = items.filter((i) => !i.isFurniture && i.active);
    const byItem = new Map<string, { itemId: string; qty: number; min: number; name: string }>();
    for (const s of unitStocks) {
      if (s.unitId !== warehouseId) continue;
      const item = getItemById(s.itemId);
      if (!item || item.isFurniture) continue;
      if (s.quantity >= s.minimumQuantity) continue;
      byItem.set(s.itemId, {
        itemId: s.itemId,
        qty: s.quantity,
        min: s.minimumQuantity,
        name: item.name,
      });
    }
    return Array.from(byItem.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [warehouseId, unitStocks, items, getItemById]);

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Sugestões de compras</h1>
        <p className="text-sm text-muted-foreground max-w-3xl">
          Itens com estoque abaixo do mínimo no almoxarifado central — candidatos a nova solicitação de compra.
        </p>
      </header>

      {!warehouseId ? (
        <Card className="border-amber-200/80 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20">
          <CardContent className="flex gap-3 py-4 text-sm text-amber-950 dark:text-amber-100">
            <AlertTriangle className="h-5 w-5 shrink-0" aria-hidden />
            <p>Unidade de almoxarifado não configurada. Defina o depósito central no cadastro de unidades.</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-border/60 shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border/60 bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" aria-hidden />
            Fila de recompra sugerida
          </CardTitle>
          <CardDescription>
            {suggestions.length === 0
              ? 'Nenhum material abaixo do mínimo no momento.'
              : `${suggestions.length} item(ns) abaixo do mínimo`}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {suggestions.length === 0 ? (
            <div className="py-14 text-center text-sm text-muted-foreground px-4">
              Quando o estoque central ficar abaixo do mínimo configurado, a lista será preenchida automaticamente.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Material</TableHead>
                  <TableHead className="text-right">Atual</TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Gap</TableHead>
                  <TableHead className="w-[140px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {suggestions.map((s) => (
                  <TableRow key={s.itemId}>
                    <TableCell className="font-medium max-w-[280px]">{s.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{s.qty}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{s.min}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant="destructive" className="font-mono tabular-nums">
                        −{s.min - s.qty}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveSection(WORK_SECTION_ID, 'buyer-sc')}
                      >
                        Ver SCs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
