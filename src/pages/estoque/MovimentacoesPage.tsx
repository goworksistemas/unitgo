/**
 * MovimentacoesPage — historico de movimentacoes + criacao manual.
 *
 * Listagem via RPC `fn_listar_movimentacoes` (paginada server-side, JOIN
 * com item/unidade/usuario ja resolvido pelo banco — sem N+1 no client).
 * O trigger fn_aplicar_movimentacao no banco atualiza saldos automaticamente.
 */
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ApiError, crud } from '@/lib/api';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { ComboboxFK } from '@/components/crud/ComboboxFK';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate, getTipoMovimentacaoLabel } from '@/lib/format';
import type { Movimentacao, TipoMovimentacao } from '@/types';

interface MovimentacaoListada extends Movimentacao {
  itemNome: string;
  produtoCodigo: number | null;
  unidadeNome: string | null;
  unidadeOrigemNome: string | null;
  unidadeDestinoNome: string | null;
  usuarioNome: string;
  tomadorNome: string | null;
}

const TIPOS_MOV: { valor: TipoMovimentacao; label: string }[] = [
  { valor: 'entry', label: 'Entrada' },
  { valor: 'exit', label: 'Saida' },
  { valor: 'transfer', label: 'Transferencia' },
  { valor: 'disposal', label: 'Descarte' },
  { valor: 'adjustment', label: 'Ajuste' },
];

export function MovimentacoesPage() {
  const { podeLer, podeEscrever } = usePermissao('estoque.movimentacoes');
  const perfil = usePerfil();

  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dialogAberto, setDialogAberto] = useState(false);

  const lista = useListaPaginada<MovimentacaoListada, { pTipo?: string }>({
    rpc: 'fn_listar_movimentacoes',
    filtros: filtroTipo !== 'todos' ? { pTipo: filtroTipo } : {},
  });

  if (!podeLer) return <SemAcesso rotaCodigo="estoque.movimentacoes" />;

  const colunas: ColunaDataTable<MovimentacaoListada>[] = [
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      largura: '140px',
      render: (m) => <span className="text-xs">{formatDate(m.criadoEm)}</span>,
    },
    {
      chave: 'tipo',
      titulo: 'Tipo',
      largura: '140px',
      render: (m) => (
        <Badge variant={tipoVariant(m.tipo)}>{getTipoMovimentacaoLabel(m.tipo)}</Badge>
      ),
    },
    {
      chave: 'item',
      titulo: 'Item',
      render: (m) => <span className="text-sm">{m.itemNome}</span>,
    },
    {
      chave: 'quantidade',
      titulo: 'Qtd',
      largura: '90px',
      alinhar: 'right',
      render: (m) => <span className="font-mono">{m.quantidade}</span>,
    },
    {
      chave: 'unidade',
      titulo: 'Unidade',
      render: (m) => (
        <span className="text-sm">
          {m.tipo === 'transfer'
            ? `${m.unidadeOrigemNome ?? '?'} -> ${m.unidadeDestinoNome ?? '?'}`
            : (m.unidadeNome ?? '—')}
        </span>
      ),
    },
    {
      chave: 'usuario',
      titulo: 'Usuario',
      render: (m) => <span className="text-muted-foreground text-sm">{m.usuarioNome}</span>,
    },
    {
      chave: 'observacoes',
      titulo: 'Observacoes',
      render: (m) => (
        <span className="text-muted-foreground line-clamp-1 text-xs">{m.observacoes ?? ''}</span>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Movimentacoes de Estoque"
        subtitulo="Historico de entradas, saidas, transferencias e ajustes"
        acoes={
          podeEscrever && (
            <Button onClick={() => setDialogAberto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nova movimentacao
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_MOV.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.label}
              </SelectItem>
            ))}
            <SelectItem value="loan_out">Emprestimo (saida)</SelectItem>
            <SelectItem value="loan_return">Devolucao</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<MovimentacaoListada>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhuma movimentacao encontrada."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por item, observacao ou OS...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {dialogAberto && (
        <DialogNovaMov
          meuUsuarioId={perfil.usuario?.id ?? null}
          aoFechar={() => setDialogAberto(false)}
          aoSalvar={async () => {
            setDialogAberto(false);
            await lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

function tipoVariant(t: TipoMovimentacao) {
  switch (t) {
    case 'entry':
    case 'loan_return':
      return 'default' as const;
    case 'exit':
    case 'loan_out':
      return 'secondary' as const;
    case 'disposal':
      return 'destructive' as const;
    case 'transfer':
    case 'adjustment':
    default:
      return 'outline' as const;
  }
}

// ============================================================================
// Dialog: nova movimentacao
// ============================================================================

function DialogNovaMov({
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  meuUsuarioId: string | null;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  // Unidades sao um universo pequeno -> mantemos select carregado.
  const { opcoes: unidadesOpcoes } = useOpcoesFK('unidades', 'nome');

  const [tipo, setTipo] = useState<TipoMovimentacao>('entry');
  const [itemId, setItemId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [unidadeId, setUnidadeId] = useState('');
  const [unidadeOrigemId, setUnidadeOrigemId] = useState('');
  const [unidadeDestinoId, setUnidadeDestinoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ehTransferencia = tipo === 'transfer';
  const ehDescarte = tipo === 'disposal';

  async function handleSalvar() {
    if (!meuUsuarioId) {
      toast.error('Usuario nao identificado');
      return;
    }
    if (!itemId) return toast.error('Selecione um item');
    if (quantidade <= 0) return toast.error('Quantidade deve ser positiva');

    if (ehTransferencia) {
      if (!unidadeOrigemId || !unidadeDestinoId) {
        return toast.error('Selecione origem e destino');
      }
      if (unidadeOrigemId === unidadeDestinoId) {
        return toast.error('Origem e destino devem ser diferentes');
      }
    } else if (!unidadeId) {
      return toast.error('Selecione a unidade');
    }

    setSalvando(true);
    try {
      const payload: Partial<Movimentacao> = {
        tipo,
        itemId,
        quantidade,
        usuarioId: meuUsuarioId,
        observacoes: observacoes.trim() || null,
      };

      if (ehTransferencia) {
        payload.unidadeOrigemId = unidadeOrigemId;
        payload.unidadeDestinoId = unidadeDestinoId;
        payload.unidadeId = null;
      } else {
        payload.unidadeId = unidadeId;
      }

      if (ehDescarte) {
        payload.motivoDescarte = motivoDescarte.trim() || null;
      }

      await crud<Movimentacao>('movimentacoes').create(payload);
      toast.success('Movimentacao registrada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova movimentacao</DialogTitle>
          <DialogDescription>O saldo do estoque sera atualizado automaticamente</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MOV.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              value={quantidade}
              onChange={(e) => setQuantidade(Number(e.target.value))}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Item</Label>
            <ComboboxFK
              valor={itemId}
              aoMudar={setItemId}
              rpc="fn_listar_itens"
              campoLabel="nome"
              paramsRpc={{ pAtivo: true }}
              placeholder="Buscar item..."
              permiteVazio={false}
            />
          </div>

          {ehTransferencia ? (
            <>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={unidadeOrigemId} onValueChange={setUnidadeOrigemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesOpcoes.map((u) => (
                      <SelectItem key={u.valor} value={u.valor}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destino</Label>
                <Select value={unidadeDestinoId} onValueChange={setUnidadeDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unidadesOpcoes.map((u) => (
                      <SelectItem key={u.valor} value={u.valor}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-1.5">
              <Label>Unidade</Label>
              <Select value={unidadeId} onValueChange={setUnidadeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {unidadesOpcoes.map((u) => (
                    <SelectItem key={u.valor} value={u.valor}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {ehDescarte && (
            <div className="col-span-2 space-y-1.5">
              <Label>Motivo do descarte</Label>
              <Input
                value={motivoDescarte}
                onChange={(e) => setMotivoDescarte(e.target.value)}
                placeholder="quebrado, vencido, obsoleto..."
              />
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
