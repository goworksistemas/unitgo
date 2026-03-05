import { Badge } from '@/components/ui/badge';
import type { PurchaseRequestStatus } from '@/types/purchases';

const STATUS_CONFIG: Record<PurchaseRequestStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  pending_manager: { label: 'Aguardando Gestor', variant: 'outline', className: 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-300' },
  approved_manager: { label: 'Aprovado Gestor', variant: 'outline', className: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-300' },
  rejected_manager: { label: 'Rejeitado Gestor', variant: 'destructive' },
  pending_director: { label: 'Aguardando Diretoria', variant: 'outline', className: 'bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 border-violet-300' },
  approved_director: { label: 'Aprovado Diretoria', variant: 'outline', className: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-300' },
  rejected_director: { label: 'Rejeitado Diretoria', variant: 'destructive' },
  in_quotation: { label: 'Em Cotação', variant: 'outline', className: 'bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border-cyan-300' },
  quotation_completed: { label: 'Cotação Concluída', variant: 'outline', className: 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border-teal-300' },
  in_purchase: { label: 'Em Compra', variant: 'outline', className: 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-300' },
  completed: { label: 'Concluído', variant: 'default', className: 'bg-green-600' },
};

export function PurchaseRequestStatusBadge({ status }: { status: PurchaseRequestStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: 'outline' as const };
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}
