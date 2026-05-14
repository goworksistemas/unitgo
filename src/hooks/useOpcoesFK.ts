/**
 * Hook auxiliar: carrega opcoes para selects de FK.
 *
 * Uso:
 *   const { opcoes: usuarios } = useOpcoesFK('usuarios', 'nome');
 *   // opcoes: [{ valor: '<uuid>', label: 'Fulano de Tal' }]
 */
import { useEffect, useState } from 'react';
import { crud } from '@/lib/api';
import type { OpcaoSelect } from '@/components/crud/FormDialog';

interface Opts {
  /** Filtros igualdade (ex: { ativo: true }). */
  filtros?: Record<string, unknown>;
  /** Coluna para gerar o label. Pode ser uma funcao para concatenar. */
  labelFn?: (item: Record<string, unknown>) => string;
}

export function useOpcoesFK(
  tabela: string,
  campoLabel: string,
  opts: Opts = {},
): { opcoes: OpcaoSelect[]; isLoading: boolean } {
  const [opcoes, setOpcoes] = useState<OpcaoSelect[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelado = false;
    setIsLoading(true);
    crud<{ id: string } & Record<string, unknown>>(tabela)
      .list({
        ordenarPor: campoLabel,
        igualdade: opts.filtros,
      })
      .then((lista) => {
        if (cancelado) return;
        setOpcoes(
          lista.map((item) => ({
            valor: item.id,
            label: opts.labelFn
              ? opts.labelFn(item)
              : String((item as Record<string, unknown>)[campoLabel] ?? item.id),
          })),
        );
      })
      .catch(() => {
        if (!cancelado) setOpcoes([]);
      })
      .finally(() => {
        if (!cancelado) setIsLoading(false);
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabela, campoLabel, JSON.stringify(opts.filtros)]);

  return { opcoes, isLoading };
}
