import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Clock, CheckCircle2, Package, XCircle, AlertCircle } from 'lucide-react';
import type { Request, Item } from '@/types';

interface RequestsPanelProps {
  myRequests: Request[];
  getItemById: (id: string) => Item | undefined;
  onNewRequest: () => void;
}

function getStatusBadge(status: string) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
    pending: { label: 'Pendente', variant: 'secondary', icon: Clock },
    approved: { label: 'Aprovado', variant: 'default', icon: CheckCircle2 },
    processing: { label: 'Separando', variant: 'default', icon: Package },
    awaiting_pickup: { label: 'Pronto', variant: 'default', icon: CheckCircle2 },
    out_for_delivery: { label: 'A Caminho', variant: 'default', icon: Package },
    delivery_confirmed: { label: 'Entregue', variant: 'default', icon: CheckCircle2 },
    completed: { label: 'Concluído', variant: 'outline', icon: CheckCircle2 },
    rejected: { label: 'Rejeitado', variant: 'destructive', icon: XCircle },
    cancelled: { label: 'Cancelado', variant: 'outline', icon: XCircle },
  };
  const config = statusMap[status] || statusMap.pending;
  const Icon = config.icon;
  return <Badge variant={config.variant} className="gap-1"><Icon className="h-3 w-3" />{config.label}</Badge>;
}

function getUrgencyBadge(urgency: string) {
  const map: Record<string, { label: string; className: string }> = {
    low: { label: 'Baixa', className: 'bg-gray-500' },
    medium: { label: 'Média', className: 'bg-secondary' },
    high: { label: 'Alta', className: 'bg-primary' },
  };
  const config = map[urgency] || map.medium;
  return <Badge className={config.className}>{config.label}</Badge>;
}

export function RequestsPanel({ myRequests, getItemById, onNewRequest }: RequestsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Solicitações</CardTitle>
        <CardDescription>Acompanhe o status de todas as suas solicitações</CardDescription>
      </CardHeader>
      <CardContent>
        {myRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Você ainda não fez nenhuma solicitação</p>
            <Button onClick={onNewRequest}><Plus className="h-4 w-4 mr-2" />Fazer Primeira Solicitação</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Urgência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Observações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {myRequests
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(request => {
                    const item = getItemById(request.itemId);
                    return (
                      <TableRow key={request.id}>
                        <TableCell>{item?.name || 'Item não encontrado'}</TableCell>
                        <TableCell>{request.quantity}</TableCell>
                        <TableCell>{getUrgencyBadge(request.urgency)}</TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>{new Date(request.createdAt).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="max-w-xs truncate">{request.observations || '-'}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
