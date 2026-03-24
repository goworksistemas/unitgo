import type { Request, Item, Unit } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Truck } from 'lucide-react';

interface ApprovedItemsCardProps {
  approvedRequests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  onCreateBatch: () => void;
}

export function ApprovedItemsCard({
  approvedRequests, getItemById, getUnitById, onCreateBatch,
}: ApprovedItemsCardProps) {
  const approvedOnly = approvedRequests.filter(r => r.status === 'approved');
  if (approvedOnly.length === 0) return null;

  const itemsByUnit = approvedOnly.reduce((acc, req) => {
    if (!acc[req.requestingUnitId]) acc[req.requestingUnitId] = [];
    acc[req.requestingUnitId].push(req);
    return acc;
  }, {} as Record<string, Request[]>);

  return (
    <Card className="border border-primary/40 bg-primary/5 shadow-sm">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-5 w-5 shrink-0 text-primary" />
              Prontos para montar lote
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {approvedOnly.length} pedido(s) aprovado(s). Agrupe por destino em um único lote para o motorista.
            </CardDescription>
          </div>
          <Button onClick={onCreateBatch} className="w-full shrink-0 bg-primary hover:bg-primary/90 sm:w-auto" size="lg">
            <Truck className="h-5 w-5 sm:mr-2" />
            Criar lote
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(itemsByUnit).map(([unitId, unitRequests]) => {
            const unit = getUnitById(unitId);
            return (
              <div key={unitId} className="rounded-lg border border-primary/25 bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-semibold text-sm">{unit?.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {unitRequests.length} {unitRequests.length === 1 ? 'item' : 'itens'}
                    </p>
                  </div>
                  <Badge className="bg-green-600">Aprovado</Badge>
                </div>
                <div className="space-y-2">
                  {unitRequests.map(req => {
                    const item = getItemById(req.itemId);
                    return (
                      <div key={req.id} className="flex items-center justify-between p-2 bg-muted rounded text-xs">
                        <span className="truncate flex-1">{item?.name}</span>
                        <Badge variant="outline" className="ml-2">Qtd: {req.quantity}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
