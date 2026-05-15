/**
 * EstoquesAbaixoMinimoPage — drill-down do KPI "Estoque baixo".
 *
 * Lista paginada via RPC `fn_listar_estoques_abaixo_minimo`.
 */
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyDashboard } from '@/components/shared/EmptyDashboard';
import { SemAcesso } from '@/components/crud/SemAcesso';
import type { ViewEstoqueAbaixoMinimo } from '@/types';

export function EstoquesAbaixoMinimoPage() {
  const { podeLer } = usePermissao('dashboards.estoques-abaixo-minimo');

  const lista = useListaPaginada<ViewEstoqueAbaixoMinimo>({
    rpc: 'fn_listar_estoques_abaixo_minimo',
  });

  if (!podeLer) return <SemAcesso rotaCodigo="dashboards.estoques-abaixo-minimo" />;

  const colunas: ColunaDataTable<ViewEstoqueAbaixoMinimo>[] = [
    {
      chave: 'itemNome',
      titulo: 'Item',
      render: (l) => <span className="font-medium">{l.itemNome}</span>,
    },
    {
      chave: 'produtoCodigo',
      titulo: 'Codigo',
      largura: '120px',
      render: (l) => (
        <span className="text-muted-foreground font-mono text-xs">{l.produtoCodigo ?? '—'}</span>
      ),
    },
    {
      chave: 'unidadeNome',
      titulo: 'Unidade',
      render: (l) => <span className="text-sm">{l.unidadeNome}</span>,
    },
    {
      chave: 'quantidade',
      titulo: 'Quantidade',
      largura: '130px',
      alinhar: 'right',
      render: (l) => <span className="font-mono">{l.quantidade}</span>,
    },
    {
      chave: 'quantidadeMinima',
      titulo: 'Minimo',
      largura: '130px',
      alinhar: 'right',
      render: (l) => <span className="text-muted-foreground font-mono">{l.quantidadeMinima}</span>,
    },
    {
      chave: 'deficit',
      titulo: 'Deficit',
      largura: '120px',
      alinhar: 'right',
      render: (l) => <span className="text-destructive font-mono font-semibold">{l.deficit}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Estoques Abaixo do Minimo"
        subtitulo="Itens que precisam de ressuprimento (saldo abaixo do minimo configurado)"
      />

      {!lista.isLoading && lista.total > 0 && (
        <div className="flex">
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            {lista.total} {lista.total === 1 ? 'item' : 'itens'} em alerta
          </Badge>
        </div>
      )}

      {!lista.isLoading && lista.total === 0 ? (
        <EmptyDashboard
          icone="PackageCheck"
          titulo="Estoques saudaveis"
          descricao="Nenhum item esta abaixo do minimo configurado."
        />
      ) : (
        <DataTable<ViewEstoqueAbaixoMinimo>
          itens={lista.itens}
          colunas={colunas}
          isLoading={lista.isLoading}
          mensagemVazia="Nenhum item em alerta."
          paginacao={{
            total: lista.total,
            pagina: lista.paginacao.pagina,
            tamanho: lista.paginacao.tamanho,
            busca: lista.paginacao.busca,
            placeholderBusca: 'Buscar por item ou unidade...',
            aoMudarPagina: lista.paginacao.setPagina,
            aoMudarTamanho: lista.paginacao.setTamanho,
            aoMudarBusca: lista.paginacao.setBusca,
          }}
        />
      )}
    </div>
  );
}
