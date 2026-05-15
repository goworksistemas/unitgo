/**
 * RecebimentosPage — registra recebimento de itens de pedido de compra.
 *
 * Cada linha = recebimento de um item (parcial ou total).
 * Quando status='complete', trigger gera entrada no estoque automaticamente.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
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
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type { PedidoCompra, PedidoCompraItem, RecebimentoCompra, Unidade } from '@/types';

interface RecebimentoListado extends RecebimentoCompra {
  pedidoNumero: string | null;
  itemDescricao: string;
  itemNome: string | null;
  unidadeRecebimentoNome: string;
  recebidoPorNome: string;
  conferidoPorNome: string | null;
  notaFiscalNumero: string | null;
}

export function RecebimentosPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.recebimentos');
  const perfil = usePerfil();

  const [novoAberto, setNovoAberto] = useState(false);

  const lista = useListaPaginada<RecebimentoListado>({ rpc: 'fn_listar_recebimentos' });

  if (!podeLer) return <SemAcesso rotaCodigo="compras.recebimentos" />;

  const colunas: ColunaDataTable<RecebimentoListado>[] = [
    {
      chave: 'dataRecebimento',
      titulo: 'Quando',
      largura: '140px',
      render: (r) => <span className="text-xs">{formatDate(r.dataRecebimento)}</span>,
    },
    {
      chave: 'pedidoNumero',
      titulo: 'Pedido',
      render: (r) => (
        <span className="font-mono text-xs">{r.pedidoNumero ?? r.pedidoId.slice(0, 8)}</span>
      ),
    },
    {
      chave: 'item',
      titulo: 'Item',
      render: (r) => <span className="text-sm">{r.itemNome ?? r.itemDescricao}</span>,
    },
    {
      chave: 'unidadeRecebimentoNome',
      titulo: 'Unidade',
      render: (r) => <span className="text-sm">{r.unidadeRecebimentoNome}</span>,
    },
    {
      chave: 'quantidadeEsperada',
      titulo: 'Esperada',
      largura: '100px',
      alinhar: 'right',
      render: (r) => <span className="font-mono">{r.quantidadeEsperada}</span>,
    },
    {
      chave: 'quantidadeRecebida',
      titulo: 'Recebida',
      largura: '100px',
      alinhar: 'right',
      render: (r) => <span className="font-mono">{r.quantidadeRecebida}</span>,
    },
    {
      chave: 'quantidadeAvariada',
      titulo: 'Avariada',
      largura: '100px',
      alinhar: 'right',
      render: (r) => <span className="font-mono text-amber-600">{r.quantidadeAvariada}</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (r) => <StatusBadge status={r.status} />,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Recebimentos"
        subtitulo="Registro de recebimento de itens dos pedidos de compra"
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo recebimento
            </Button>
          )
        }
      />

      <DataTable<RecebimentoListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum recebimento registrado."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por pedido ou item...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {novoAberto && perfil.usuario && (
        <DialogNovoRecebimento
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

function DialogNovoRecebimento({
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [pedidoId, setPedidoId] = useState('');
  const [itensPedido, setItensPedido] = useState<PedidoCompraItem[]>([]);
  const [pedidoItemId, setPedidoItemId] = useState('');
  const [unidadeRecebimentoId, setUnidadeRecebimentoId] = useState('');
  const [quantidadeRecebida, setQuantidadeRecebida] = useState(0);
  const [quantidadeAvariada, setQuantidadeAvariada] = useState(0);
  const [observacoes, setObservacoes] = useState('');
  const [status, setStatus] = useState<'pending_check' | 'partial' | 'complete'>('complete');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      crud<PedidoCompra>('pedidos_compra').list({}),
      crud<Unidade>('unidades').list({}),
    ]).then(([ps, us]) => {
      setPedidos(
        ps.filter((p) =>
          ['sent_to_supplier', 'awaiting_nf', 'partially_received'].includes(p.status),
        ),
      );
      setUnidades(us);
    });
  }, []);

  useEffect(() => {
    if (!pedidoId) return setItensPedido([]);
    crud<PedidoCompraItem>('pedidos_compra_itens')
      .list({ igualdade: { pedidoId }, ordenarPor: 'ordem' })
      .then(setItensPedido);
  }, [pedidoId]);

  const itemSelecionado = useMemo(
    () => itensPedido.find((i) => i.id === pedidoItemId),
    [itensPedido, pedidoItemId],
  );

  async function handleSalvar() {
    if (!pedidoId) return toast.error('Selecione o pedido');
    if (!pedidoItemId) return toast.error('Selecione o item do pedido');
    if (!unidadeRecebimentoId) return toast.error('Selecione a unidade de recebimento');
    if (quantidadeRecebida <= 0) return toast.error('Quantidade recebida deve ser positiva');
    if (!itemSelecionado) return;

    setSalvando(true);
    try {
      await crud<RecebimentoCompra>('recebimentos_compra').create({
        pedidoId,
        pedidoItemId,
        unidadeRecebimentoId,
        quantidadeEsperada: itemSelecionado.quantidade,
        quantidadeRecebida,
        quantidadeAvariada,
        recebidoPorUsuarioId: meuUsuarioId,
        status,
        observacoes: observacoes.trim() || null,
      });
      toast.success('Recebimento registrado');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo recebimento</DialogTitle>
          <DialogDescription>
            Registre o que foi recebido. Quando completo, sera dado entrada automatica no estoque.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Pedido de compra</Label>
            <Select value={pedidoId} onValueChange={setPedidoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {pedidos.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.numero ?? p.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {pedidoId && (
            <div className="col-span-2 space-y-1.5">
              <Label>Item do pedido</Label>
              <Select value={pedidoItemId} onValueChange={setPedidoItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {itensPedido.map((it) => (
                    <SelectItem key={it.id} value={it.id}>
                      {it.descricao} (qtd esperada: {it.quantidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
            <Label>Unidade de recebimento</Label>
            <Select value={unidadeRecebimentoId} onValueChange={setUnidadeRecebimentoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Qtd recebida</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={quantidadeRecebida}
              onChange={(e) => setQuantidadeRecebida(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Qtd avariada</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={quantidadeAvariada}
              onChange={(e) => setQuantidadeAvariada(Number(e.target.value))}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending_check">Pendente conferencia</SelectItem>
                <SelectItem value="partial">Parcial</SelectItem>
                <SelectItem value="complete">Completo</SelectItem>
              </SelectContent>
            </Select>
          </div>

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
            {salvando ? '...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
