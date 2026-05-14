/**
 * Timeline — exibe log de atividades de uma entidade.
 *
 * Le `log_atividades` filtrado por (tipo_entidade, entidade_id), ordenado
 * cronologicamente, e renderiza como linha do tempo vertical.
 */
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate, formatRelativeTimePast } from '@/lib/format';
import { ApiError, crud } from '@/lib/api';
import type { LogAtividade } from '@/types';

interface Props {
  tipoEntidade: string;
  entidadeId: string;
  /** Mapa opcional de tradutor de acoes para texto legivel. */
  acaoLabels?: Record<string, string>;
  /** Quantidade maxima de eventos. Default: 50. */
  limite?: number;
}

export function Timeline({ tipoEntidade, entidadeId, acaoLabels, limite = 50 }: Props) {
  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);
    setErro(null);

    crud<LogAtividade>('log_atividades')
      .list({
        igualdade: { tipoEntidade, entidadeId },
        ordenarPor: 'criadoEm',
        ascendente: true,
        limite,
      })
      .then((lista) => {
        if (!cancelado) setLogs(lista);
      })
      .catch((e) => {
        if (!cancelado)
          setErro(e instanceof ApiError ? e.message : 'Erro ao carregar timeline');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [tipoEntidade, entidadeId, limite]);

  if (carregando) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  if (erro) {
    return <p className="text-sm text-red-500">{erro}</p>;
  }

  if (logs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-6 text-center">
        Sem eventos registrados ainda.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {logs.map((log, idx) => (
        <li key={log.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-4 w-4 text-primary" />
            </div>
            {idx < logs.length - 1 && <div className="w-px flex-1 bg-border my-1" />}
          </div>
          <div className="flex-1 pb-3">
            <div className="flex items-baseline gap-2">
              <span className="font-medium text-sm">
                {acaoLabels?.[log.acao] ?? log.acao}
              </span>
              {log.statusAnterior && log.statusNovo && (
                <span className="text-xs text-muted-foreground">
                  {log.statusAnterior} → {log.statusNovo}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(log.criadoEm)} ({formatRelativeTimePast(log.criadoEm)})
            </div>
            {log.dados && Object.keys(log.dados).length > 0 && (
              <pre className="mt-1 text-xs bg-muted/50 p-2 rounded overflow-x-auto max-w-full">
                {JSON.stringify(log.dados, null, 2)}
              </pre>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
