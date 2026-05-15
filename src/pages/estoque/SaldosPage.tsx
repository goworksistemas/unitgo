/**
 * SaldosPage — saldos por unidade, com alerta de minimo.
 *
 * Listagem via RPC `fn_listar_saldos` (paginada server-side, JOIN com item
 * e unidade ja resolvido pelo banco).
 */
import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import type { EstoqueUnidade } from '@/types';

interface LinhaSaldo extends EstoqueUnidade {
  itemNome: string;
  produtoCodigo: number | null;
  itemCategoriaId: string | null;
  unidadeNome: string;
  deficit: number;
}

export function SaldosPage() {
  const { podeLer } = usePermissao('estoque.saldos');

  const { opcoes: unidadesOpcoes } = useOpcoesFK('unidades', 'nome');
  const [filtroUnidade, setFiltroUnidade] = useState<string>('todas');
  const [apenasAbaixo, setApenasAbaixo] = useState<string>('todos');

  const filtrosRpc = useMemo<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = {};
    if (filtroUnidade !== 'todas') f.pUnidadeId = filtroUnidade;
    if (apenasAbaixo === 'abaixo') f.pApenasAbaixoMinimo = true;
    return f;
  }, [filtroUnidade, apenasAbaixo]);

  const lista = useListaPaginada<LinhaSaldo>({
    rpc: 'fn_listar_saldos',
    filtros: filtrosRpc,
  });

  if (!podeLer) return <SemAcesso rotaCodigo="estoque.saldos" />;

  const colunas: ColunaDataTable<LinhaSaldo>[] = [
    {
      chave: 'itemNome',
      titulo: 'Item',
      render: (l) => <span className="font-medium">{l.itemNome}</span>,
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
      chave: 'status',
      titulo: 'Status',
      largura: '100px',
      alinhar: 'center',
      render: (l) => {
        const abaixo = l.quantidadeMinima > 0 && l.quantidade < l.quantidadeMinima;
        if (abaixo)
          return (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Baixo
            </Badge>
          );
        if (l.quantidade === 0) return <Badge variant="outline">Zerado</Badge>;
        return <Badge variant="default">OK</Badge>;
      },
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Saldos por Unidade"
        subtitulo="Quantidades atuais com alerta para itens abaixo do minimo"
      />

      <div className="flex flex-wrap items-center gap-3">
        <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por unidade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as unidades</SelectItem>
            {unidadesOpcoes.map((u) => (
              <SelectItem key={u.valor} value={u.valor}>
                {u.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={apenasAbaixo} onValueChange={setApenasAbaixo}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os saldos</SelectItem>
            <SelectItem value="abaixo">Apenas abaixo do minimo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<LinhaSaldo>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum saldo encontrado."
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
    </div>
  );
}
