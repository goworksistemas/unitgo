import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseRequestStatusBadge } from '@/components/purchases/shared/PurchaseRequestStatusBadge';
import { ApprovalTimeline } from '@/components/purchases/shared/ApprovalTimeline';
import { ContractProgressBar } from '@/components/purchases/shared/ContractProgressBar';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  TrendingUp,
  Package,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PurchaseRequest, PurchaseRequestStatus } from '@/types/purchases';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

type TrackingFilter = 'all' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';

export function AdminRequestTrackingPanel() {
  const { currentUser, getUserById, getUnitById } = useApp();
  const { purchaseRequests, contracts, costCenters, isLoadingPurchases } = usePurchases();
  const [filter, setFilter] = useState<TrackingFilter>('all');

  const filteredRequests = useMemo(() => {
    let list = [...purchaseRequests].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    switch (filter) {
      case 'pending':
        list = list.filter((r) =>
          ['pending_manager', 'pending_director'].includes(r.status)
        );
        break;
      case 'approved':
        list = list.filter((r) =>
          ['approved_manager', 'approved_director', 'in_quotation'].includes(r.status)
        );
        break;
      case 'in_progress':
        list = list.filter((r) =>
          ['in_quotation', 'quotation_completed', 'in_purchase'].includes(r.status)
        );
        break;
      case 'completed':
        list = list.filter((r) => r.status === 'completed');
        break;
      case 'rejected':
        list = list.filter((r) =>
          ['rejected_manager', 'rejected_director'].includes(r.status)
        );
        break;
    }

    return list;
  }, [purchaseRequests, filter]);

  const stats = useMemo(() => {
    const pending = purchaseRequests.filter((r) =>
      ['pending_manager', 'pending_director'].includes(r.status)
    ).length;
    const inProgress = purchaseRequests.filter((r) =>
      ['in_quotation', 'quotation_completed', 'in_purchase'].includes(r.status)
    ).length;
    const completed = purchaseRequests.filter((r) => r.status === 'completed').length;
    const rejected = purchaseRequests.filter((r) =>
      ['rejected_manager', 'rejected_director'].includes(r.status)
    ).length;
    return { pending, inProgress, completed, rejected, total: purchaseRequests.length };
  }, [purchaseRequests]);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total"
          value={stats.total}
          icon={<FileText className="h-4 w-4" />}
          color="blue"
          onClick={() => setFilter('all')}
          active={filter === 'all'}
        />
        <StatCard
          label="Pendentes"
          value={stats.pending}
          icon={<Clock className="h-4 w-4" />}
          color="amber"
          onClick={() => setFilter('pending')}
          active={filter === 'pending'}
        />
        <StatCard
          label="Em Andamento"
          value={stats.inProgress}
          icon={<TrendingUp className="h-4 w-4" />}
          color="blue"
          onClick={() => setFilter('in_progress')}
          active={filter === 'in_progress'}
        />
        <StatCard
          label="Concluídas"
          value={stats.completed}
          icon={<CheckCircle2 className="h-4 w-4" />}
          color="green"
          onClick={() => setFilter('completed')}
          active={filter === 'completed'}
        />
        <StatCard
          label="Rejeitadas"
          value={stats.rejected}
          icon={<XCircle className="h-4 w-4" />}
          color="red"
          onClick={() => setFilter('rejected')}
          active={filter === 'rejected'}
        />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Acompanhamento de Solicitações</CardTitle>
              <CardDescription>
                {filteredRequests.length} solicitação(ões){' '}
                {filter !== 'all' && `(filtro: ${filterLabel(filter)})`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Nenhuma solicitação encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {filteredRequests.map((req) => {
                const solicitante = getUserById(req.solicitanteId);
                const unidade = getUnitById(req.unidadeId);
                const cc = costCenters.find((c) => c.id === req.centroCustoId);
                const contract = req.contratoId
                  ? contracts.find((c) => c.id === req.contratoId)
                  : null;

                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-lg border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">
                            #{req.id.slice(0, 8)}
                          </span>
                          <PurchaseRequestStatusBadge status={req.status} />
                        </div>
                        <p className="text-sm mt-1">{req.justificativa}</p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                          <span>Solicitante: {solicitante?.name ?? '—'}</span>
                          <span>Unidade: {unidade?.name ?? '—'}</span>
                          {cc && <span>CC: {cc.codigo} — {cc.nome}</span>}
                          <span>
                            {req.itens.length} item(ns) •{' '}
                            {format(new Date(req.createdAt), 'dd/MM/yyyy HH:mm', {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Itens */}
                    {req.itens.length > 0 && (
                      <div className="bg-muted/50 rounded-md p-3">
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Itens solicitados:
                        </p>
                        <div className="space-y-1">
                          {req.itens.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between text-sm"
                            >
                              <span>{item.descricao}</span>
                              <span className="text-muted-foreground">
                                {item.quantidade} {item.unidadeMedida}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Contrato associado */}
                    {contract && (
                      <div className="text-sm space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">
                          Contrato: {contract.numero} — {contract.nome}
                        </p>
                        <ContractProgressBar
                          valorTotal={contract.valorTotal}
                          valorConsumido={contract.valorConsumido}
                        />
                      </div>
                    )}

                    {/* Timeline de aprovações */}
                    {req.aprovacoes.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">
                          Histórico de aprovações:
                        </p>
                        <ApprovalTimeline aprovacoes={req.aprovacoes} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function filterLabel(f: TrackingFilter): string {
  const labels: Record<TrackingFilter, string> = {
    all: 'Todas',
    pending: 'Pendentes',
    approved: 'Aprovadas',
    in_progress: 'Em andamento',
    completed: 'Concluídas',
    rejected: 'Rejeitadas',
  };
  return labels[f];
}

function StatCard({
  label,
  value,
  icon,
  color,
  onClick,
  active,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  active: boolean;
}) {
  const colorClasses: Record<string, string> = {
    blue: 'text-blue-600 dark:text-blue-400',
    amber: 'text-amber-600 dark:text-amber-400',
    green: 'text-green-600 dark:text-green-400',
    red: 'text-red-600 dark:text-red-400',
  };

  return (
    <Card
      className={`cursor-pointer transition-all hover:border-primary/50 ${
        active ? 'border-primary ring-1 ring-primary/20' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-3 flex items-center gap-3">
        <div className={colorClasses[color] || ''}>{icon}</div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
