import { CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PurchaseApproval } from '@/types/purchases';

interface ApprovalTimelineProps {
  aprovacoes: PurchaseApproval[];
}

export function ApprovalTimeline({ aprovacoes }: ApprovalTimelineProps) {
  if (!aprovacoes?.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma aprovação registrada</p>;
  }

  return (
    <div className="space-y-3">
      {aprovacoes.map((a) => (
        <div key={a.id} className="flex gap-3 items-start">
          <div
            className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${
              a.action === 'approved' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
            }`}
          >
            {a.action === 'approved' ? (
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
            ) : (
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {a.userName} ({a.role === 'manager' ? 'Gestor' : 'Diretoria'}) —{' '}
              {a.action === 'approved' ? 'Aprovado' : 'Rejeitado'}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(a.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
            {a.justificativa && (
              <p className="text-xs text-muted-foreground mt-1 italic">&quot;{a.justificativa}&quot;</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
