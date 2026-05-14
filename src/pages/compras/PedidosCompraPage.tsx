/**
 * PedidosCompraPage — pedidos fechados aguardando aprovacao por alcada.
 *
 * Cria pedido a partir de uma cotacao finalizada. Status inicial:
 * pending_approval. Apos aprovado por alcada, vira sent_to_supplier.
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
import { ApiError, crud, supabase } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { formatDate } from '@/lib/format';
import type {
  Cotacao,
  CotacaoResposta,
  EmpresaEmitente,
  Fornecedor,
  PedidoCompra,
  Usuario,
} from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PedidosCompraPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.pedidos');
  const perfil = usePerfil();

  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [fornecedoresMap, setFornMap] = useState<Map<string, Fornecedor>>(new Map());
  const [usuariosMap, setUsuariosMap] = useState<Map<string, Usuario>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [verPedido, setVerPedido] = useState<PedidoCompra | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ps, fs, us] = await Promise.all([
        crud<PedidoCompra>('pedidos_compra').list({
          ordenarPor: 'criadoEm',
          ascendente: false,
        }),
        crud<Fornecedor>('fornecedores').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setPedidos(ps);
      setFornMap(new Map(fs.map((f) => [f.id, f])));
      setUsuariosMap(new Map(us.map((u) => [u.id, u])));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  if (!podeLer) return <SemAcesso rotaCodigo="compras.pedidos" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Pedidos de Compra"
        subtitulo="Pedido fechado para fornecedor. Apos aprovado por alcada, vai para o fornecedor."
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo pedido
            </Button>
          )
        }
      />

      {carregando ? (
        <Skeleton className="h-32 w-full" />
      ) : pedidos.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhum pedido criado.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead className="text-right">Valor total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pedidos.map((p) => (
                <TableRow
                  key={p.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setVerPedido(p)}
                >
                  <TableCell className="font-mono text-xs">
                    {p.numero ?? p.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(p.criadoEm)}</TableCell>
                  <TableCell className="text-sm">
                    {fornecedoresMap.get(p.fornecedorId)?.razaoSocial ?? '?'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {usuariosMap.get(p.compradorId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {FMT_BRL.format(Number(p.valorTotal))}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setVerPedido(p); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {novoAberto && perfil.usuario && (
        <DialogNovoPedido
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await recarregar();
          }}
        />
      )}

      {verPedido && (
        <DialogVerPedido
          pedido={verPedido}
          fornecedorNome={fornecedoresMap.get(verPedido.fornecedorId)?.razaoSocial}
          aoFechar={() => setVerPedido(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Dialog: novo pedido (a partir de cotacao finalizada)
// ============================================================================

function DialogNovoPedido({
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [respostas, setRespostas] = useState<CotacaoResposta[]>([]);
  const [empresas, setEmpresas] = useState<EmpresaEmitente[]>([]);
  const [cotacaoId, setCotacaoId] = useState('');
  const [empresaEmitenteId, setEmpresaEmitenteId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      crud<Cotacao>('cotacoes').list({ igualdade: { status: 'finalized' } }),
      crud<EmpresaEmitente>('empresas_emitentes').list({ igualdade: { ativo: true } }),
    ]).then(([cs, es]) => {
      setCotacoes(cs);
      setEmpresas(es);
    });
  }, []);

  useEffect(() => {
    if (!cotacaoId) {
      setRespostas([]);
      return;
    }
    crud<CotacaoResposta>('cotacoes_respostas')
      .list({ igualdade: { cotacaoId } })
      .then(setRespostas);
  }, [cotacaoId]);

  const cotacaoSelecionada = cotacoes.find((c) => c.id === cotacaoId);
  const respostaVencedora = useMemo(() => {
    if (!cotacaoSelecionada?.fornecedorVencedorId) return null;
    return respostas.find((r) => r.fornecedorId === cotacaoSelecionada.fornecedorVencedorId);
  }, [cotacaoSelecionada, respostas]);

  async function handleSalvar() {
    if (!cotacaoId) return toast.error('Selecione uma cotacao');
    if (!cotacaoSelecionada?.fornecedorVencedorId)
      return toast.error('Cotacao precisa ter fornecedor vencedor');
    if (!respostaVencedora?.valorTotal) return toast.error('Resposta vencedora sem valor');
    if (!empresaEmitenteId) return toast.error('Selecione a empresa emitente');

    setSalvando(true);
    try {
      const pedido = await crud<PedidoCompra>('pedidos_compra').create({
        cotacaoId,
        fornecedorId: cotacaoSelecionada.fornecedorVencedorId,
        empresaEmitenteId,
        compradorId: meuUsuarioId,
        moedaId: respostaVencedora.moedaId,
        formaPagamentoId: respostaVencedora.formaPagamentoId,
        condicoesPagamentoId: respostaVencedora.condicoesPagamentoId,
        valorSubtotal: respostaVencedora.valorSubtotal,
        valorFrete: respostaVencedora.valorFrete,
        valorDesconto: respostaVencedora.valorDesconto,
        valorTotal: respostaVencedora.valorTotal,
        status: 'pending_approval',
        statusAprovacao: 'pendente',
        versaoAprovacao: 1,
        observacoes: observacoes.trim() || null,
      });

      // Vincula solicitacoes da cotacao ao pedido (N:N)
      const { data: vinculos } = await supabase
        .from('cotacoes_solicitacoes')
        .select('solicitacao_id')
        .eq('cotacao_id', cotacaoId);
      const solIds = (vinculos ?? []).map((v: { solicitacao_id: string }) => v.solicitacao_id);
      if (solIds.length > 0) {
        await supabase.from('pedidos_compra_solicitacoes').insert(
          solIds.map((solicitacao_id: string) => ({
            pedido_id: pedido.id,
            solicitacao_id,
          })),
        );
        await supabase
          .from('solicitacoes_compra')
          .update({ status: 'pending_director' })
          .in('id', solIds);
      }

      toast.success('Pedido criado, aguardando aprovacao por alcada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Novo pedido a partir de cotacao</DialogTitle>
          <DialogDescription>
            Apenas cotacoes finalizadas (com vencedor escolhido) podem virar pedido
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Cotacao</Label>
            <Select value={cotacaoId} onValueChange={setCotacaoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {cotacoes.length === 0 ? (
                  <SelectItem value="__nada__" disabled>
                    Nenhuma cotacao finalizada
                  </SelectItem>
                ) : (
                  cotacoes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.numero ?? c.id.slice(0, 8)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {respostaVencedora && (
            <div className="rounded-md border p-3 bg-muted/30 text-sm">
              <p>
                <span className="text-muted-foreground">Valor total: </span>
                <strong className="font-mono">
                  {FMT_BRL.format(Number(respostaVencedora.valorTotal ?? 0))}
                </strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Prazo: {respostaVencedora.prazoEntregaDias ?? '?'} dias
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Empresa emitente (CNPJ)</Label>
            <Select value={empresaEmitenteId} onValueChange={setEmpresaEmitenteId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.razaoSocial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
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
            {salvando ? 'Criando...' : 'Criar pedido'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog: ver pedido + timeline
// ============================================================================

function DialogVerPedido({
  pedido,
  fornecedorNome,
  aoFechar,
}: {
  pedido: PedidoCompra;
  fornecedorNome?: string;
  aoFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Pedido {pedido.numero ?? pedido.id.slice(0, 8)}</span>
            <StatusBadge status={pedido.status} />
          </DialogTitle>
          <DialogDescription>Criado em {formatDate(pedido.criadoEm)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Linha label="Fornecedor" valor={fornecedorNome ?? '?'} />
            <Linha label="Valor total" valor={FMT_BRL.format(Number(pedido.valorTotal))} />
            <Linha label="Frete" valor={FMT_BRL.format(Number(pedido.valorFrete))} />
            <Linha label="Desconto" valor={FMT_BRL.format(Number(pedido.valorDesconto))} />
            <Linha label="Versao aprovacao" valor={String(pedido.versaoAprovacao)} />
            <Linha label="Status aprovacao" valor={pedido.statusAprovacao} />
            {pedido.observacoes && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Observacoes</span>
                <p className="text-sm mt-1">{pedido.observacoes}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">Linha do tempo</h3>
            <Timeline tipoEntidade="pedido_compra" entidadeId={pedido.id} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm">{valor}</p>
    </div>
  );
}
