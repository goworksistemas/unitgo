/**
 * ContratosVencendoPage — drill-down do KPI "Contratos vencendo".
 *
 * Lista paginada via RPC `fn_listar_contratos_vencendo` (vencem em 30d ou
 * saldo < 10%).
 */
import { FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyDashboard } from '@/components/shared/EmptyDashboard';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDateShort } from '@/lib/format';
import type { ViewContratoProximoVencimento } from '@/types';

function formatBRL(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ContratosVencendoPage() {
  const { podeLer } = usePermissao('dashboards.contratos-vencendo');

  const lista = useListaPaginada<ViewContratoProximoVencimento>({
    rpc: 'fn_listar_contratos_vencendo',
  });

  if (!podeLer) return <SemAcesso rotaCodigo="dashboards.contratos-vencendo" />;

  const colunas: ColunaDataTable<ViewContratoProximoVencimento>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      largura: '130px',
      render: (c) => <span className="font-mono text-xs">{c.numero}</span>,
    },
    {
      chave: 'nome',
      titulo: 'Nome',
      render: (c) => <span className="font-medium">{c.nome}</span>,
    },
    {
      chave: 'fornecedorRazaoSocial',
      titulo: 'Fornecedor',
      render: (c) => <span className="text-sm">{c.fornecedorRazaoSocial}</span>,
    },
    {
      chave: 'dataFim',
      titulo: 'Vence em',
      largura: '120px',
      render: (c) => (
        <span className="text-muted-foreground text-xs">{formatDateShort(c.dataFim)}</span>
      ),
    },
    {
      chave: 'diasParaVencer',
      titulo: 'Dias',
      largura: '100px',
      alinhar: 'right',
      render: (c) => {
        const venceuOuQuase = c.diasParaVencer <= 7;
        return (
          <span
            className={`font-mono font-semibold ${
              venceuOuQuase ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'
            }`}
          >
            {c.diasParaVencer}
          </span>
        );
      },
    },
    {
      chave: 'saldo',
      titulo: 'Saldo (R$)',
      largura: '140px',
      alinhar: 'right',
      render: (c) => <span className="font-mono">{formatBRL(Number(c.saldo))}</span>,
    },
    {
      chave: 'percentualSaldo',
      titulo: '% saldo',
      largura: '100px',
      alinhar: 'right',
      render: (c) => (
        <span className="text-muted-foreground font-mono">
          {c.percentualSaldo !== null ? `${Number(c.percentualSaldo).toFixed(1)}%` : '—'}
        </span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Contratos Vencendo"
        subtitulo="Contratos que vencem em ate 30 dias ou com saldo restante abaixo de 10%"
      />

      {!lista.isLoading && lista.total > 0 && (
        <div className="flex">
          <Badge variant="destructive" className="gap-1">
            <FileWarning className="h-3 w-3" />
            {lista.total} {lista.total === 1 ? 'contrato' : 'contratos'}
          </Badge>
        </div>
      )}

      {!lista.isLoading && lista.total === 0 ? (
        <EmptyDashboard
          icone="FileCheck2"
          titulo="Tudo em dia"
          descricao="Nenhum contrato em alerta de vencimento ou saldo."
        />
      ) : (
        <DataTable<ViewContratoProximoVencimento>
          itens={lista.itens}
          colunas={colunas}
          isLoading={lista.isLoading}
          mensagemVazia="Nenhum contrato em alerta."
          paginacao={{
            total: lista.total,
            pagina: lista.paginacao.pagina,
            tamanho: lista.paginacao.tamanho,
            busca: lista.paginacao.busca,
            placeholderBusca: 'Buscar por numero, nome ou fornecedor...',
            aoMudarPagina: lista.paginacao.setPagina,
            aoMudarTamanho: lista.paginacao.setTamanho,
            aoMudarBusca: lista.paginacao.setBusca,
          }}
        />
      )}
    </div>
  );
}
