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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { BadgeVariant } from '@/lib/format';
import type { FurnitureRemovalRequest, Item, Unit, User } from '@/types';
import { PendingApprovalsTable } from './PendingApprovalsTable';

const APPROVAL_STATUS: Record<string, { label: string; variant: BadgeVariant }> = {
  approved_storage: { label: 'Aguardando Coleta', variant: 'outline' },
  approved_disposal: { label: 'Aguardando Coleta', variant: 'outline' },
  awaiting_pickup: { label: 'Aguardando Coleta', variant: 'outline' },
  in_transit: { label: 'Em Trânsito', variant: 'default' },
  completed: { label: 'Concluído', variant: 'secondary' },
};

export interface ApprovalsPanelProps {
  pendingRemovalRequests: FurnitureRemovalRequest[];
  approvedRemovalRequests: FurnitureRemovalRequest[];
  onEvaluate: (requestId: string) => void;
  onReject: (requestId: string) => void;
  getItemById: (id: string) => Item | undefined;
  getUnitById: (id: string) => Unit | undefined;
  getUserById: (id: string) => User | undefined;
}

export function ApprovalsPanel({
  pendingRemovalRequests,
  approvedRemovalRequests,
  onEvaluate,
  onReject,
  getItemById,
  getUnitById,
  getUserById,
}: ApprovalsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aprovações de Retirada de Móveis</CardTitle>
        <CardDescription>Avalie solicitações e decida entre armazenagem ou descarte</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pendentes ({pendingRemovalRequests.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Aprovadas ({approvedRemovalRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            <PendingApprovalsTable
              requests={pendingRemovalRequests}
              onEvaluate={onEvaluate}
              onReject={onReject}
              getItemById={getItemById}
              getUnitById={getUnitById}
              getUserById={getUserById}
            />
          </TabsContent>

          <TabsContent value="approved" className="space-y-4">
            {approvedRemovalRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma solicitação aprovada
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 sm:mx-0 sm:px-0">
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Unidade</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Decisão</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Justificativa</TableHead>
                      <TableHead>Data Aprovação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {approvedRemovalRequests.map((request) => {
                      const item = getItemById(request.itemId);
                      const unit = getUnitById(request.unitId);
                      const config = APPROVAL_STATUS[request.status] || APPROVAL_STATUS.approved_storage;

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
                            <Badge variant={request.status === 'approved_storage' ? 'default' : 'destructive'}>
                              {request.status === 'approved_storage' ? 'Armazenagem' : 'Descarte'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={config.variant}>{config.label}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-muted-foreground max-w-xs">
                              {request.disposalJustification || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {request.reviewedAt && new Date(request.reviewedAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
