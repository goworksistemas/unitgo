import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PurchaseRequestStatusBadge } from '../shared/PurchaseRequestStatusBadge';
import { ApprovalTimeline } from '../shared/ApprovalTimeline';
import { ContractProgressBar } from '../shared/ContractProgressBar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileText,
  Package,
  Truck,
  Filter,
} from 'lucide-react';
import type { PurchaseRequestStatus } from '@/types/purchases';

interface MyPurchaseRequestsPanelProps {
  filterApproved?: boolean;
}

type StatusFilter = 'all' | 'pending' | 'approved' | 'in_progress' | 'completed' | 'rejected';

const fmt = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

export function MyPurchaseRequestsPanel({ filterApproved }: MyPurchaseRequestsPanelProps = {}) {
  const { currentUser } = useApp();
  const {
    purchaseRequests,
    quotations,
    purchaseOrders,
    contracts,
    costCenters,
    isLoadingPurchases,
  } = usePurchases();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const myRequests = useMemo(() => {
    if (!currentUser) return [];
    let filtered = purchaseRequests;
    if (filterApproved) {
      filtered = filtered.filter(
        (r) =>
          r.status === 'in_quotation' ||
          r.status === 'quotation_completed' ||
          r.status === 'in_purchase'
      );
    } else {
      filtered = filtered.filter((r) => r.solicitanteId === currentUser.id);
    }

    switch (statusFilter) {
      case 'pending':
        filtered = filtered.filter((r) =>
          ['pending_manager', 'pending_director'].includes(r.status)
        );
        break;
      case 'approved':
        filtered = filtered.filter((r) =>
          ['approved_manager', 'approved_director', 'in_quotation'].includes(r.status)
        );
        break;
      case 'in_progress':
        filtered = filtered.filter((r) =>
          ['in_quotation', 'quotation_completed', 'in_purchase'].includes(r.status)
        );
        break;
      case 'completed':
        filtered = filtered.filter((r) => r.status === 'completed');
        break;
      case 'rejected':
        filtered = filtered.filter((r) =>
          ['rejected_manager', 'rejected_director'].includes(r.status)
        );
        break;
    }

    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [purchaseRequests, currentUser, filterApproved, statusFilter]);

  const stats = useMemo(() => {
    if (!currentUser) return { pending: 0, inProgress: 0, completed: 0, rejected: 0 };
    const mine = filterApproved
      ? purchaseRequests.filter(
          (r) =>
            r.status === 'in_quotation' ||
            r.status === 'quotation_completed' ||
            r.status === 'in_purchase'
        )
      : purchaseRequests.filter((r) => r.solicitanteId === currentUser.id);
    return {
      pending: mine.filter((r) =>
        ['pending_manager', 'pending_director'].includes(r.status)
      ).length,
      inProgress: mine.filter((r) =>
        ['in_quotation', 'quotation_completed', 'in_purchase'].includes(r.status)
      ).length,
      completed: mine.filter((r) => r.status === 'completed').length,
      rejected: mine.filter((r) =>
        ['rejected_manager', 'rejected_director'].includes(r.status)
      ).length,
    };
  }, [purchaseRequests, currentUser, filterApproved]);

  const getQuotationsForRequest = (reqId: string) =>
    quotations.filter((q) => q.solicitacaoId === reqId);

  const getOrdersForQuotations = (reqQuotations: typeof quotations) => {
    const quotIds = new Set(reqQuotations.map((q) => q.id));
    return purchaseOrders.filter((o) => quotIds.has(o.cotacaoId));
  };

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  const title = filterApproved ? 'Solicitações Aprovadas' : 'Minhas Solicitações de Compra';
  const description = filterApproved
    ? 'Solicitações prontas para cotação'
    : 'Acompanhe o status completo das suas solicitações';

  return (
    <div className="space-y-4">
      {/* KPIs resumo */}
      {!filterApproved && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat
            label="Pendentes"
            value={stats.pending}
            icon={<Clock className="h-4 w-4" />}
            color="amber"
            active={statusFilter === 'pending'}
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
          />
          <MiniStat
            label="Em Andamento"
            value={stats.inProgress}
            icon={<Truck className="h-4 w-4" />}
            color="blue"
            active={statusFilter === 'in_progress'}
            onClick={() =>
              setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')
            }
          />
          <MiniStat
            label="Concluídas"
            value={stats.completed}
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="green"
            active={statusFilter === 'completed'}
            onClick={() =>
              setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')
            }
          />
          <MiniStat
            label="Rejeitadas"
            value={stats.rejected}
            icon={<XCircle className="h-4 w-4" />}
            color="red"
            active={statusFilter === 'rejected'}
            onClick={() =>
              setStatusFilter(statusFilter === 'rejected' ? 'all' : 'rejected')
            }
          />
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription>
                {myRequests.length} solicitação(ões)
                {statusFilter !== 'all' && ' (filtrado)'}
              </CardDescription>
            </div>
            {statusFilter !== 'all' && (
              <Badge
                variant="outline"
                className="cursor-pointer hover:bg-muted"
                onClick={() => setStatusFilter('all')}
              >
                Limpar filtro
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {myRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {statusFilter !== 'all'
                ? 'Nenhuma solicitação encontrada com este filtro'
                : filterApproved
                ? 'Nenhuma solicitação aprovada para cotação'
                : 'Você ainda não possui solicitações de compra'}
            </p>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {myRequests.map((req) => {
                const reqQuotations = getQuotationsForRequest(req.id);
                const reqOrders = getOrdersForQuotations(reqQuotations);
                const cc = costCenters.find((c) => c.id === req.centroCustoId);
                const contract = req.contratoId
                  ? contracts.find((c) => c.id === req.contratoId)
                  : null;
                const isRejected = req.status === 'rejected_manager' || req.status === 'rejected_director';
                const rejectionReason = isRejected
                  ? req.aprovacoes.find((a) => a.action === 'rejected')?.justificativa
                  : null;

                return (
                  <AccordionItem key={req.id} value={req.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4 gap-2">
                        <div className="text-left min-w-0">
                          <span className="font-medium">#{req.id.slice(0, 8)}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {reqQuotations.length > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {reqQuotations.length} cotação(ões)
                            </Badge>
                          )}
                          <PurchaseRequestStatusBadge status={req.status} />
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4 pt-2">
                        {/* Justificativa */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">
                            Justificativa
                          </p>
                          <p className="text-sm">{req.justificativa}</p>
                        </div>

                        {/* Motivo da rejeição */}
                        {isRejected && rejectionReason && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                            <p className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
                              Motivo da rejeição
                            </p>
                            <p className="text-sm text-red-600 dark:text-red-300">
                              {rejectionReason}
                            </p>
                          </div>
                        )}

                        {/* Centro de custo e contrato */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {cc && (
                            <span>
                              Centro de Custo: {cc.codigo} — {cc.nome}
                            </span>
                          )}
                          {contract && (
                            <span>
                              Contrato: {contract.numero} — {contract.nome}
                            </span>
                          )}
                        </div>

                        {/* Contrato com barra de progresso */}
                        {contract && contract.valorTotal > 0 && (
                          <div className="p-3 rounded-lg bg-muted/50">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Saldo do Contrato
                            </p>
                            <ContractProgressBar
                              valorTotal={contract.valorTotal}
                              valorConsumido={contract.valorConsumido}
                            />
                            <div className="flex justify-between text-xs text-muted-foreground mt-1">
                              <span>Consumido: {fmt(contract.valorConsumido)}</span>
                              <span>Saldo: {fmt(contract.saldo)}</span>
                            </div>
                          </div>
                        )}

                        {/* Itens */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Itens solicitados ({req.itens.length})
                          </p>
                          <div className="space-y-1">
                            {req.itens.map((i) => (
                              <div
                                key={i.id}
                                className="flex items-center justify-between text-sm p-2 rounded bg-muted/30"
                              >
                                <span>{i.descricao}</span>
                                <span className="text-muted-foreground shrink-0 ml-2">
                                  {i.quantidade} {i.unidadeMedida}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Progresso do fluxo */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">
                            Progresso
                          </p>
                          <RequestFlowProgress status={req.status} />
                        </div>

                        {/* Cotações vinculadas */}
                        {reqQuotations.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Cotações ({reqQuotations.length})
                            </p>
                            <div className="space-y-2">
                              {reqQuotations.map((q) => (
                                <div
                                  key={q.id}
                                  className="p-3 rounded-lg border text-sm space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      Cotação #{q.id.slice(0, 8)}
                                    </span>
                                    <Badge
                                      variant={
                                        q.status === 'approved'
                                          ? 'default'
                                          : q.status === 'rejected'
                                          ? 'destructive'
                                          : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {quotationStatusLabel(q.status)}
                                    </Badge>
                                  </div>
                                  {q.prazoEntrega && (
                                    <p className="text-xs text-muted-foreground">
                                      Prazo de entrega: {q.prazoEntrega} dia(s)
                                    </p>
                                  )}
                                  {q.itens.length > 0 && q.itens.some((i) => i.precoUnitario) && (
                                    <div className="text-xs text-muted-foreground">
                                      {q.itens
                                        .filter((i) => i.valorTotal)
                                        .map((i) => (
                                          <div key={i.id} className="flex justify-between">
                                            <span>{i.descricao}</span>
                                            <span>{fmt(i.valorTotal!)}</span>
                                          </div>
                                        ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Pedidos de compra vinculados */}
                        {reqOrders.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Pedidos de Compra ({reqOrders.length})
                            </p>
                            <div className="space-y-2">
                              {reqOrders.map((o) => (
                                <div
                                  key={o.id}
                                  className="p-3 rounded-lg border text-sm space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">
                                      Pedido #{o.id.slice(0, 8)}
                                      {o.numeroOmie && ` (Omie: ${o.numeroOmie})`}
                                    </span>
                                    <Badge
                                      variant={
                                        o.status === 'fully_received'
                                          ? 'default'
                                          : 'outline'
                                      }
                                      className="text-xs"
                                    >
                                      {orderStatusLabel(o.status)}
                                    </Badge>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Valor: {fmt(o.valorTotal)}
                                  </p>
                                  {o.notasFiscais.length > 0 && (
                                    <div className="text-xs text-muted-foreground">
                                      NF:{' '}
                                      {o.notasFiscais
                                        .map((nf) => `${nf.numero} (${fmt(nf.valor)})`)
                                        .join(', ')}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Timeline de aprovações */}
                        {req.aprovacoes.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Histórico de aprovações
                            </p>
                            <ApprovalTimeline aprovacoes={req.aprovacoes} />
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function RequestFlowProgress({ status }: { status: PurchaseRequestStatus }) {
  const steps = [
    { key: 'created', label: 'Criada' },
    { key: 'manager', label: 'Gestor' },
    { key: 'director', label: 'Diretoria' },
    { key: 'quotation', label: 'Cotação' },
    { key: 'purchase', label: 'Compra' },
    { key: 'completed', label: 'Concluída' },
  ];

  const statusToStep: Record<string, number> = {
    pending_manager: 1,
    approved_manager: 1,
    rejected_manager: 1,
    pending_director: 2,
    approved_director: 2,
    rejected_director: 2,
    in_quotation: 3,
    quotation_completed: 3,
    in_purchase: 4,
    completed: 5,
  };

  const isRejected = status === 'rejected_manager' || status === 'rejected_director';
  const currentStep = statusToStep[status] ?? 0;

  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const isDone = i <= currentStep && !isRejected;
        const isCurrent = i === currentStep;
        const isRejectedStep = isRejected && i === currentStep;

        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                  isRejectedStep
                    ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                    : isDone
                    ? 'bg-primary text-primary-foreground'
                    : isCurrent
                    ? 'bg-primary/20 text-primary border-2 border-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {isRejectedStep ? (
                  <XCircle className="h-3 w-3" />
                ) : isDone ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-[10px] mt-1 text-center leading-tight ${
                  isRejectedStep
                    ? 'text-red-600 dark:text-red-400 font-medium'
                    : isDone || isCurrent
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-0.5 mt-[-14px] ${
                  i < currentStep && !isRejected ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon,
  color,
  active,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  const colorClasses: Record<string, string> = {
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
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

function quotationStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Rascunho',
    sent: 'Enviada',
    responded: 'Respondida',
    approved: 'Aprovada',
    rejected: 'Rejeitada',
  };
  return labels[status] || status;
}

function orderStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    created: 'Criado',
    awaiting_nf: 'Aguardando NF',
    nf_issued: 'NF Emitida',
    in_transit: 'Em Trânsito',
    partially_received: 'Recebido Parcial',
    fully_received: 'Recebido Total',
  };
  return labels[status] || status;
}
