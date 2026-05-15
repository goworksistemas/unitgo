/**
 * PedidosAguardandoPage — drill-down do KPI "Pedidos aguardando".
 *
 * Lista paginada via RPC `fn_listar_pedidos_aguardando` (status_aprovacao =
 * 'pendente') com JOIN com fornecedor, comprador e aprovador resolvidos.
 */
import { Hourglass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyDashboard } from '@/components/shared/EmptyDashboard';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate } from '@/lib/format';
import type { ViewPedidoAguardandoAprovacao } from '@/types';

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function diasParado(criadoEm: string): number {
  const ms = Date.now() - new Date(criadoEm).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function PedidosAguardandoPage() {
  const { podeLer } = usePermissao('dashboards.pedidos-aguardando');

  const lista = useListaPaginada<ViewPedidoAguardandoAprovacao>({
    rpc: 'fn_listar_pedidos_aguardando',
  });

  if (!podeLer) return <SemAcesso rotaCodigo="dashboards.pedidos-aguardando" />;

  const colunas: ColunaDataTable<ViewPedidoAguardandoAprovacao>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      largura: '130px',
      render: (p) => <span className="font-mono text-xs">{p.numero ?? '—'}</span>,
    },
    {
      chave: 'fornecedorRazaoSocial',
      titulo: 'Fornecedor',
      render: (p) => <span className="font-medium">{p.fornecedorRazaoSocial}</span>,
    },
    {
      chave: 'compradorNome',
      titulo: 'Comprador',
      render: (p) => <span className="text-sm">{p.compradorNome}</span>,
    },
    {
      chave: 'aprovadorNome',
      titulo: 'Aprovador',
      render: (p) => (
        <span className="text-muted-foreground text-sm">{p.aprovadorNome ?? '—'}</span>
      ),
    },
    {
      chave: 'valorTotal',
      titulo: 'Valor Total',
      largura: '160px',
      alinhar: 'right',
      render: (p) => <span className="font-mono">{formatBRL(Number(p.valorTotal))}</span>,
    },
    {
      chave: 'criadoEm',
      titulo: 'Aberto em',
      largura: '160px',
      render: (p) => (
        <span className="text-muted-foreground text-xs">{formatDate(p.criadoEm)}</span>
      ),
    },
    {
      chave: 'diasParado',
      titulo: 'Dias parado',
      largura: '110px',
      alinhar: 'right',
      render: (p) => {
        const dias = diasParado(p.criadoEm);
        return (
          <span
            className={`font-mono font-semibold ${
              dias >= 7 ? 'text-destructive' : dias >= 3 ? 'text-amber-600 dark:text-amber-400' : ''
            }`}
          >
            {dias}
          </span>
        );
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Pedidos Aguardando Aprovacao"
        subtitulo="Pedidos de compra com status_aprovacao = 'pendente' (alcada)"
      />

      {!lista.isLoading && lista.total > 0 && (
        <div className="flex">
          <Badge variant="secondary" className="gap-1">
            <Hourglass className="h-3 w-3" />
            {lista.total} {lista.total === 1 ? 'pedido' : 'pedidos'}
          </Badge>
        </div>
      )}

      {!lista.isLoading && lista.total === 0 ? (
        <EmptyDashboard
          titulo="Caixa de aprovacao vazia"
          descricao="Nenhum pedido aguardando aprovacao por alcada."
        />
      ) : (
        <DataTable<ViewPedidoAguardandoAprovacao>
          itens={lista.itens}
          colunas={colunas}
          isLoading={lista.isLoading}
          mensagemVazia="Nenhum pedido aguardando."
          paginacao={{
            total: lista.total,
            pagina: lista.paginacao.pagina,
            tamanho: lista.paginacao.tamanho,
            busca: lista.paginacao.busca,
            placeholderBusca: 'Buscar por numero ou fornecedor...',
            aoMudarPagina: lista.paginacao.setPagina,
            aoMudarTamanho: lista.paginacao.setTamanho,
            aoMudarBusca: lista.paginacao.setBusca,
          }}
        />
      )}
    </div>
  );
}
