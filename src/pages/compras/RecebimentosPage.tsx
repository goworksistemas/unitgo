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
import { Skeleton } from '@/components/ui/skeleton';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, crud } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type {
  PedidoCompra,
  PedidoCompraItem,
  RecebimentoCompra,
  Unidade,
} from '@/types';

export function RecebimentosPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.recebimentos');
  const perfil = usePerfil();

  const [recebimentos, setRecebimentos] = useState<RecebimentoCompra[]>([]);
  const [pedidosMap, setPedidosMap] = useState<Map<string, PedidoCompra>>(new Map());
  const [unidadesMap, setUnidadesMap] = useState<Map<string, Unidade>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      const [recs, peds, unis] = await Promise.all([
        crud<RecebimentoCompra>('recebimentos_compra').list({
          ordenarPor: 'dataRecebimento',
          ascendente: false,
        }),
        crud<PedidoCompra>('pedidos_compra').list({}),
        crud<Unidade>('unidades').list({}),
      ]);
      setRecebimentos(recs);
      setPedidosMap(new Map(peds.map((p) => [p.id, p])));
      setUnidadesMap(new Map(unis.map((u) => [u.id, u])));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  if (!podeLer) return <SemAcesso rotaCodigo="compras.recebimentos" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Recebimentos"
        subtitulo="Registro de recebimento de itens dos pedidos de compra"
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo recebimento
            </Button>
          )
        }
      />

      {carregando ? (
        <Skeleton className="h-32 w-full" />
      ) : recebimentos.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhum recebimento registrado.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quando</TableHead>
                <TableHead>Pedido</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="text-right">Esperada</TableHead>
                <TableHead className="text-right">Recebida</TableHead>
                <TableHead className="text-right">Avariada</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recebimentos.map((r) => {
                const ped = pedidosMap.get(r.pedidoId);
                const uni = unidadesMap.get(r.unidadeRecebimentoId);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs">{formatDate(r.dataRecebimento)}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {ped?.numero ?? r.pedidoId.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-sm">{uni?.nome ?? '?'}</TableCell>
                    <TableCell className="text-right font-mono">{r.quantidadeEsperada}</TableCell>
                    <TableCell className="text-right font-mono">{r.quantidadeRecebida}</TableCell>
                    <TableCell className="text-right font-mono text-amber-600">
                      {r.quantidadeAvariada}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {novoAberto && perfil.usuario && (
        <DialogNovoRecebimento
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await recarregar();
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
      setPedidos(ps.filter((p) => ['sent_to_supplier', 'awaiting_nf', 'partially_received'].includes(p.status)));
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
