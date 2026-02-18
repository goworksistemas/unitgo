import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle } from 'lucide-react';
import { getStatusConfig, formatDate } from '@/lib/format';
import type { Request, FurnitureTransfer, UnitStock, Item, Unit, User } from '@/types';

interface RequestsTableProps {
  requests: Request[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
}

export function RequestsTable({ requests, getItemById, getUnitById, getUserById }: RequestsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos Recentes</CardTitle>
        <CardDescription>Últimas solicitações de materiais</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qtd</TableHead>
                <TableHead className="hidden md:table-cell">Unidade</TableHead>
                <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhum pedido pendente</TableCell></TableRow>
              ) : requests.map((req) => {
                const config = getStatusConfig(req.status);
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{getItemById(req.itemId)?.name || 'Item não encontrado'}</TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell className="hidden md:table-cell">{getUnitById(req.requestingUnitId)?.name || '-'}</TableCell>
                    <TableCell className="hidden lg:table-cell">{getUserById(req.requestedByUserId)?.name || '-'}</TableCell>
                    <TableCell><Badge variant={config.variant}>{config.label}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(req.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface StockTableProps {
  lowStockItems: Array<{ id: string; quantity: number; minimumQuantity: number; item?: Item; unit?: Unit }>;
}

export function StockTable({ lowStockItems }: StockTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Itens com Estoque Baixo</CardTitle>
        <CardDescription>Itens que atingiram ou estão abaixo do estoque mínimo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Atual</TableHead>
                <TableHead>Mínimo</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lowStockItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    <CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" />
                    <p>Todos os estoques estão adequados!</p>
                  </TableCell>
                </TableRow>
              ) : lowStockItems.map((stock) => (
                <TableRow key={stock.id}>
                  <TableCell className="font-medium">{stock.item?.name}</TableCell>
                  <TableCell>{stock.unit?.name}</TableCell>
                  <TableCell><span className={stock.quantity === 0 ? 'text-red-600 font-bold' : 'text-yellow-600'}>{stock.quantity}</span></TableCell>
                  <TableCell>{stock.minimumQuantity}</TableCell>
                  <TableCell>
                    {stock.quantity === 0 ? <Badge variant="destructive">Esgotado</Badge> : <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Baixo</Badge>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface TransfersTableProps {
  transfers: FurnitureTransfer[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function TransfersTable({ transfers, getItemById, getUnitById }: TransfersTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transferências em Andamento</CardTitle>
        <CardDescription>Movimentações de móveis entre unidades</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Móvel</TableHead>
                <TableHead className="hidden md:table-cell">Origem</TableHead>
                <TableHead className="hidden md:table-cell">Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma transferência em andamento</TableCell></TableRow>
              ) : transfers.map((transfer) => {
                const config = getStatusConfig(transfer.status);
                return (
                  <TableRow key={transfer.id}>
                    <TableCell className="font-medium">{getItemById(transfer.itemId)?.name || 'Item não encontrado'}</TableCell>
                    <TableCell className="hidden md:table-cell">{getUnitById(transfer.fromUnitId)?.name || '-'}</TableCell>
                    <TableCell className="hidden md:table-cell">{getUnitById(transfer.toUnitId)?.name || '-'}</TableCell>
                    <TableCell><Badge variant={config.variant}>{config.label}</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(transfer.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
