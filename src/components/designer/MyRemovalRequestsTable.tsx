import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, Armchair, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeVariant } from '@/lib/format';
import type { FurnitureRemovalRequest, Item, Unit } from '@/types';

const REMOVAL_STATUS: Record<string, { label: string; variant: BadgeVariant; icon: LucideIcon }> = {
  pending: { label: 'Aguardando Avaliação', variant: 'outline', icon: Clock },
  approved_storage: { label: 'Aguardando Coleta', variant: 'default', icon: Clock },
  approved_disposal: { label: 'Aguardando Coleta', variant: 'default', icon: Clock },
  awaiting_pickup: { label: 'Aguardando Coleta', variant: 'default', icon: Clock },
  in_transit: { label: 'Em Trânsito', variant: 'default', icon: Armchair },
  completed: { label: 'Concluído', variant: 'secondary', icon: CheckCircle },
  rejected: { label: 'Rejeitado', variant: 'destructive', icon: XCircle },
};

export interface MyRemovalRequestsTableProps {
  requests: FurnitureRemovalRequest[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function MyRemovalRequestsTable({ requests, getItemById, getUnitById }: MyRemovalRequestsTableProps) {
  return (
    <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
      <Table className="min-w-[800px]">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Qtd</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Decisão</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const item = getItemById(request.itemId);
            const unit = getUnitById(request.unitId);
            const statusCfg = REMOVAL_STATUS[request.status] || REMOVAL_STATUS.pending;
            const StatusIcon = statusCfg.icon;

            return (
              <TableRow key={request.id}>
                <TableCell>
                  <div>
                    <div>{item?.name}</div>
                    <div className="text-xs text-muted-foreground">{item?.description}</div>
                  </div>
                </TableCell>
                <TableCell>{unit?.name}</TableCell>
                <TableCell>{request.quantity}</TableCell>
                <TableCell>
                  <Badge variant={statusCfg.variant} className="flex items-center gap-1 w-fit">
                    <StatusIcon className="h-3 w-3" />
                    {statusCfg.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.status === 'approved_storage' && (
                    <Badge variant="default">Armazenagem</Badge>
                  )}
                  {request.status === 'approved_disposal' && (
                    <Badge variant="destructive">Descarte</Badge>
                  )}
                  {(request.status === 'pending' || request.status === 'rejected') && (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
