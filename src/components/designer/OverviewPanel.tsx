import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Inbox, ShieldCheck, Truck } from 'lucide-react';

export interface OverviewPanelProps {
  /** Solicitações de transferência criadas por você, aguardando admin */
  myPendingTransfers: number;
  /** Retiradas/descarte aguardando sua decisão */
  pendingRemovalApprovals: number;
  /** Pedidos de móvel das unidades aguardando sua análise (aba Pedidos) */
  pendingUnitFurnitureRequests: number;
}

export function OverviewPanel({
  myPendingTransfers,
  pendingRemovalApprovals,
  pendingUnitFurnitureRequests,
}: OverviewPanelProps) {
  const cards = [
    {
      title: 'Pedidos das unidades',
      description: 'Aguardando sua análise',
      value: pendingUnitFurnitureRequests,
      icon: Inbox,
      iconClass: 'text-amber-600 dark:text-amber-400',
      hint: 'Menu lateral: Pedidos das unidades',
    },
    {
      title: 'Retiradas para decidir',
      description: 'Armazenagem ou descarte',
      value: pendingRemovalApprovals,
      icon: ShieldCheck,
      iconClass: 'text-violet-600 dark:text-violet-400',
      hint: 'Aba: Aprovar retiradas',
    },
    {
      title: 'Suas transferências',
      description: 'Aguardando aprovação da administração',
      value: myPendingTransfers,
      icon: Truck,
      iconClass: 'text-sky-600 dark:text-sky-400',
      hint: 'Aba: Movimentações',
    },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
        <p className="flex items-start gap-2 text-foreground/90">
          <ClipboardList className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <span>
            Use as abas <strong className="font-medium text-foreground">Inventário</strong>,{' '}
            <strong className="font-medium text-foreground">Movimentações</strong> e{' '}
            <strong className="font-medium text-foreground">Aprovar retiradas</strong> para cada tipo de tarefa —
            evita rolagem longa e deixa o fluxo mais direto.
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(({ title, description, value, icon: Icon, iconClass, hint }) => (
          <Card key={title} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium leading-tight pr-2">{title}</CardTitle>
              <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} aria-hidden />
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-3xl font-semibold tabular-nums tracking-tight">{value}</div>
              <p className="text-xs text-muted-foreground">{description}</p>
              <p className="text-xs text-muted-foreground border-t border-border pt-2">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
