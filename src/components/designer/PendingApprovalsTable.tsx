import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FurnitureRemovalRequest, Item, Unit, User } from '@/types';

export interface PendingApprovalsTableProps {
  requests: FurnitureRemovalRequest[];
  onEvaluate: (requestId: string) => void;
  onReject: (requestId: string) => void;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
}

export function PendingApprovalsTable({
  requests,
  onEvaluate,
  onReject,
  getItemById,
  getUnitById,
  getUserById,
}: PendingApprovalsTableProps) {
  if (requests.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma solicitação pendente
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Unidade</TableHead>
            <TableHead>Quantidade</TableHead>
            <TableHead>Solicitante</TableHead>
            <TableHead>Motivo</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => {
            const item = getItemById(request.itemId);
            const unit = getUnitById(request.unitId);
            const requester = getUserById(request.requestedByUserId);

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
                <TableCell>{requester?.name}</TableCell>
                <TableCell>
                  <div className="text-sm text-muted-foreground max-w-xs">{request.reason}</div>
                </TableCell>
                <TableCell>
                  {new Date(request.createdAt).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEvaluate(request.id)}
                    >
                      Avaliar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onReject(request.id)}
                    >
                      Rejeitar
                    </Button>
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
