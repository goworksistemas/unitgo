import { CheckCircle, XCircle, RefreshCw, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PurchaseOrderApproval } from '@/types/purchases';

const ACAO_CONFIG: Record<PurchaseOrderApproval['acao'], { label: string; Icon: typeof CheckCircle; className: string }> = {
  pendente: { label: 'Pendente', Icon: Clock, className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
  aprovado: { label: 'Aprovado', Icon: CheckCircle, className: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  reprovado: { label: 'Reprovado', Icon: XCircle, className: 'bg-red-100 dark:bg-red-900/30 text-red-600' },
  reenviado: { label: 'Reenviado', Icon: RefreshCw, className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
};

interface OrderApprovalTimelineProps {
  approvals: PurchaseOrderApproval[];
}

export function OrderApprovalTimeline({ approvals }: OrderApprovalTimelineProps) {
  if (!approvals?.length) {
    return <p className="text-sm text-muted-foreground">Nenhuma aprovação registrada</p>;
  }

  const porVersao = approvals.reduce<Map<number, PurchaseOrderApproval[]>>((acc, a) => {
    const v = a.versao ?? 1;
    if (!acc.has(v)) acc.set(v, []);
    acc.get(v)!.push(a);
    return acc;
  }, new Map());

  const versoesOrdenadas = Array.from(porVersao.entries()).sort(([a], [b]) => a - b);

  return (
    <div className="space-y-4">
      {versoesOrdenadas.map(([versao, itens]) => {
        const ultimo = itens[itens.length - 1];
        const config = ACAO_CONFIG[ultimo.acao];
        const Icon = config.Icon;
        return (
          <div key={versao} className="flex gap-3 items-start">
            <div className={`mt-0.5 flex-shrink-0 rounded-full p-1 ${config.className}`}>
              <Icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">
                v{versao} — {format(new Date(ultimo.createdAt), 'dd/MM/yyyy', { locale: ptBR })} — {config.label}
              </p>
              {ultimo.observacao && (
                <p className="text-xs text-muted-foreground mt-1 italic">&quot;{ultimo.observacao}&quot;</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
