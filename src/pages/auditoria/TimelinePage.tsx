/**
 * TimelinePage — busca log de atividades de qualquer entidade.
 *
 * Lista via RPC `fn_listar_log_atividades` (paginada server-side, JOIN com
 * usuario ja resolvido).
 */
import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate, formatRelativeTimePast } from '@/lib/format';
import type { LogAtividade } from '@/types';

interface LogListado extends LogAtividade {
  usuarioNome: string | null;
}

const TIPOS_ENTIDADE = [
  'usuario',
  'unidade',
  'item',
  'movimentacao',
  'solicitacao',
  'solicitacao_compra',
  'cotacao',
  'pedido_compra',
  'nota_fiscal',
  'contrato',
  'recebimento_compra',
  'lote_entrega',
];

export function TimelinePage() {
  const { podeLer } = usePermissao('auditoria.timeline');

  const [tipoEntidade, setTipoEntidade] = useState<string>('todos');
  const [entidadeId, setEntidadeId] = useState('');

  const filtrosRpc = useMemo<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = {};
    if (tipoEntidade !== 'todos') f.pTipoEntidade = tipoEntidade;
    const id = entidadeId.trim();
    // UUID basico tem 36 caracteres com hifens. So passa para o servidor
    // quando parecer um UUID valido para nao gerar erro.
    if (id && /^[0-9a-f-]{30,40}$/i.test(id)) f.pEntidadeId = id;
    return f;
  }, [tipoEntidade, entidadeId]);

  const lista = useListaPaginada<LogListado>({
    rpc: 'fn_listar_log_atividades',
    filtros: filtrosRpc,
  });

  if (!podeLer) return <SemAcesso rotaCodigo="auditoria.timeline" />;

  const colunas: ColunaDataTable<LogListado>[] = [
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      largura: '180px',
      render: (l) => (
        <div className="text-xs">
          <div>{formatDate(l.criadoEm)}</div>
          <div className="text-muted-foreground">{formatRelativeTimePast(l.criadoEm)}</div>
        </div>
      ),
    },
    {
      chave: 'entidade',
      titulo: 'Entidade',
      largura: '180px',
      render: (l) => (
        <div className="text-xs">
          <div className="font-mono">{l.tipoEntidade}</div>
          <div className="text-muted-foreground">{l.entidadeId.slice(0, 8)}...</div>
        </div>
      ),
    },
    {
      chave: 'acao',
      titulo: 'Acao',
      largura: '160px',
      render: (l) => <span className="text-sm font-medium">{l.acao}</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (l) =>
        l.statusAnterior && l.statusNovo ? (
          <span className="font-mono text-xs">
            {l.statusAnterior} → {l.statusNovo}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      chave: 'usuarioNome',
      titulo: 'Usuario',
      render: (l) => <span className="text-sm">{l.usuarioNome ?? '—'}</span>,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Timeline de Atividades"
        subtitulo="Historico de mudancas em qualquer entidade do sistema"
      />

      <div className="grid grid-cols-1 gap-3 rounded-md border p-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tipo de entidade</Label>
          <Select value={tipoEntidade} onValueChange={setTipoEntidade}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              {TIPOS_ENTIDADE.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>ID da entidade (opcional)</Label>
          <Input
            value={entidadeId}
            onChange={(e) => setEntidadeId(e.target.value)}
            placeholder="UUID"
          />
        </div>
      </div>

      <DataTable<LogListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum log encontrado."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar acao, tipo de entidade ou usuario...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />
    </div>
  );
}
