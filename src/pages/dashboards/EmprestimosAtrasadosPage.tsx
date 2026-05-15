/**
 * EmprestimosAtrasadosPage — drill-down do KPI "Emprestimos atrasados".
 *
 * Lista paginada via RPC `fn_listar_emprestimos_atrasados` (JOIN com item,
 * tomador e unidade ja resolvido).
 */
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyDashboard } from '@/components/shared/EmptyDashboard';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate } from '@/lib/format';
import type { ViewEmprestimoAtrasado } from '@/types';

interface Linha extends ViewEmprestimoAtrasado {
  itemNome: string;
  tomadorNome: string | null;
  unidadeNome: string | null;
  diasAtraso: number;
}

export function EmprestimosAtrasadosPage() {
  const { podeLer } = usePermissao('dashboards.emprestimos-atrasados');

  const lista = useListaPaginada<Linha>({
    rpc: 'fn_listar_emprestimos_atrasados',
  });

  if (!podeLer) return <SemAcesso rotaCodigo="dashboards.emprestimos-atrasados" />;

  const colunas: ColunaDataTable<Linha>[] = [
    {
      chave: 'itemNome',
      titulo: 'Item',
      render: (l) => <span className="font-medium">{l.itemNome}</span>,
    },
    {
      chave: 'tomadorNome',
      titulo: 'Tomador',
      render: (l) => <span className="text-sm">{l.tomadorNome ?? '—'}</span>,
    },
    {
      chave: 'unidadeNome',
      titulo: 'Unidade',
      render: (l) => <span className="text-sm">{l.unidadeNome ?? '—'}</span>,
    },
    {
      chave: 'quantidade',
      titulo: 'Quantidade',
      largura: '120px',
      alinhar: 'right',
      render: (l) => <span className="font-mono">{l.quantidade}</span>,
    },
    {
      chave: 'emprestimoDevolucaoPrevista',
      titulo: 'Prazo previsto',
      largura: '160px',
      render: (l) => (
        <span className="text-muted-foreground text-xs">
          {l.emprestimoDevolucaoPrevista ? formatDate(l.emprestimoDevolucaoPrevista) : '—'}
        </span>
      ),
    },
    {
      chave: 'diasAtraso',
      titulo: 'Dias atrasado',
      largura: '130px',
      alinhar: 'right',
      render: (l) => (
        <span className="text-destructive font-mono font-semibold">{l.diasAtraso}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Emprestimos Atrasados"
        subtitulo="Emprestimos com prazo de devolucao vencido"
      />

      {!lista.isLoading && lista.total > 0 && (
        <div className="flex">
          <Badge variant="destructive" className="gap-1">
            <Clock className="h-3 w-3" />
            {lista.total} {lista.total === 1 ? 'atrasado' : 'atrasados'}
          </Badge>
        </div>
      )}

      {!lista.isLoading && lista.total === 0 ? (
        <EmptyDashboard
          titulo="Sem atrasos"
          descricao="Todos os emprestimos estao dentro do prazo."
        />
      ) : (
        <DataTable<Linha>
          itens={lista.itens}
          colunas={colunas}
          isLoading={lista.isLoading}
          mensagemVazia="Nenhum emprestimo atrasado."
          paginacao={{
            total: lista.total,
            pagina: lista.paginacao.pagina,
            tamanho: lista.paginacao.tamanho,
            busca: lista.paginacao.busca,
            placeholderBusca: 'Buscar por item ou tomador...',
            aoMudarPagina: lista.paginacao.setPagina,
            aoMudarTamanho: lista.paginacao.setTamanho,
            aoMudarBusca: lista.paginacao.setBusca,
          }}
        />
      )}
    </div>
  );
}
