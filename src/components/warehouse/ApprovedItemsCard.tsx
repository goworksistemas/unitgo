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
    <Card className="border-2 border-primary bg-primary/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Itens Aprovados - Criar Lote
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              {approvedOnly.length} item(ns) aprovado(s) prontos para criar lote
            </CardDescription>
          </div>
          <Button onClick={onCreateBatch} className="bg-primary hover:bg-primary/90" size="lg">
            <Truck className="h-5 w-5 mr-2" />
            Criar Lote
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {Object.entries(itemsByUnit).map(([unitId, unitRequests]) => {
            const unit = getUnitById(unitId);
            return (
              <div key={unitId} className="bg-card rounded-lg p-4 border-2 border-primary/30">
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
