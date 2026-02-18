import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle } from 'lucide-react';
import { getStatusConfig, formatDate } from '@/lib/format';
import type { FurnitureRequestToDesigner, FurnitureTransfer, FurnitureRemovalRequest, Item, Unit, User } from '@/types';

interface GenericTableProps {
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
}

const STATUS_OVERRIDES: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending_designer: { label: 'Aguardando Designer', variant: 'outline' },
  approved_designer: { label: 'Aprovado', variant: 'default' },
  approved_storage: { label: 'Aprovado Armazenagem', variant: 'default' },
  approved_disposal: { label: 'Aprovado Descarte', variant: 'destructive' },
};

function statusBadge(status: string) {
  const config = STATUS_OVERRIDES[status] || getStatusConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface RequestsTableProps extends GenericTableProps {
  requests: FurnitureRequestToDesigner[];
}

export function RequestsTable({ requests, getItemById, getUnitById, getUserById }: RequestsTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Solicitações Pendentes de Análise</CardTitle>
        <CardDescription>Pedidos de móveis aguardando aprovação do designer</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Móvel</TableHead><TableHead>Qtd</TableHead>
                <TableHead className="hidden md:table-cell">Unidade</TableHead>
                <TableHead className="hidden lg:table-cell">Solicitante</TableHead>
                <TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8"><CheckCircle className="h-10 w-10 mx-auto mb-2 text-green-500" /><p>Nenhuma solicitação pendente</p></TableCell></TableRow>
              ) : requests.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{getItemById(r.itemId)?.name || '-'}</TableCell>
                  <TableCell>{r.quantity}</TableCell>
                  <TableCell className="hidden md:table-cell">{getUnitById(r.requestingUnitId)?.name || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{getUserById(r.requestedByUserId)?.name || '-'}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface TransfersTableProps extends GenericTableProps {
  transfers: FurnitureTransfer[];
}

export function TransfersTable({ transfers, getItemById, getUnitById }: TransfersTableProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Transferências em Andamento</CardTitle><CardDescription>Movimentações de móveis entre unidades</CardDescription></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Móvel</TableHead><TableHead className="hidden md:table-cell">Origem</TableHead><TableHead className="hidden md:table-cell">Destino</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Data</TableHead></TableRow></TableHeader>
            <TableBody>
              {transfers.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma transferência em andamento</TableCell></TableRow>
              ) : transfers.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{getItemById(t.itemId)?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{getUnitById(t.fromUnitId)?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{getUnitById(t.toUnitId)?.name || '-'}</TableCell>
                  <TableCell>{statusBadge(t.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(t.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface RemovalsTableProps extends GenericTableProps {
  removals: FurnitureRemovalRequest[];
}

export function RemovalsTable({ removals, getItemById, getUnitById, getUserById }: RemovalsTableProps) {
  return (
    <Card>
      <CardHeader><CardTitle>Solicitações de Remoção</CardTitle><CardDescription>Pedidos de armazenagem ou descarte de móveis</CardDescription></CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow><TableHead>Móvel</TableHead><TableHead className="hidden md:table-cell">Unidade</TableHead><TableHead className="hidden lg:table-cell">Solicitante</TableHead><TableHead>Status</TableHead><TableHead className="hidden sm:table-cell">Data</TableHead></TableRow></TableHeader>
            <TableBody>
              {removals.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma solicitação de remoção</TableCell></TableRow>
              ) : removals.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{getItemById(r.itemId)?.name || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell">{getUnitById(r.unitId)?.name || '-'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{getUserById(r.requestedByUserId)?.name || '-'}</TableCell>
                  <TableCell>{statusBadge(r.status)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatDate(r.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
