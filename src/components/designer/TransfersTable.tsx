import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { BadgeVariant } from '@/lib/format';
import type { FurnitureTransfer, Item, Unit } from '@/types';

const TRANSFER_STATUS: Record<string, { variant: BadgeVariant; label: string; icon: LucideIcon }> = {
  pending: { variant: 'outline', label: 'Pendente', icon: Clock },
  approved: { variant: 'default', label: 'Aprovado', icon: CheckCircle },
  completed: { variant: 'default', label: 'Concluído', icon: CheckCircle },
  rejected: { variant: 'destructive', label: 'Rejeitado', icon: XCircle },
};

export interface TransfersTableProps {
  transfers: FurnitureTransfer[];
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
}

export function TransfersTable({ transfers, getItemById, getUnitById }: TransfersTableProps) {
  if (transfers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma transferência nesta categoria
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
      <Table className="min-w-[700px]">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>De</TableHead>
            <TableHead>Para</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Observações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transfers.map((transfer) => {
            const item = getItemById(transfer.itemId);
            const fromUnit = getUnitById(transfer.fromUnitId);
            const toUnit = getUnitById(transfer.toUnitId);
            const config = TRANSFER_STATUS[transfer.status] || TRANSFER_STATUS.pending;
            const Icon = config.icon;

            return (
              <TableRow key={transfer.id}>
                <TableCell>
                  <div>
                    <div>{item?.name}</div>
                    <div className="text-xs text-muted-foreground">{item?.description}</div>
                  </div>
                </TableCell>
                <TableCell>{fromUnit?.name}</TableCell>
                <TableCell>{toUnit?.name}</TableCell>
                <TableCell>
                  <div className="text-sm">
                    {new Date(transfer.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
                    <Icon className="h-3 w-3" />
                    {config.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground max-w-xs truncate">
                    {transfer.observations || '-'}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
