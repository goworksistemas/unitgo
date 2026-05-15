/**
 * PedidosCompraPage — pedidos fechados aguardando aprovacao por alcada.
 *
 * Cria pedido a partir de uma cotacao finalizada. Status inicial:
 * pending_approval. Apos aprovado por alcada, vira sent_to_supplier.
 */
import { useEffect, useState } from 'react';
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
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { formatDate } from '@/lib/format';
import type { Cotacao, CotacaoResposta, EmpresaEmitente, Fornecedor, PedidoCompra } from '@/types';

interface PedidoListado extends PedidoCompra {
  fornecedorRazaoSocial: string;
  fornecedorNomeFantasia: string | null;
  empresaEmitenteRazaoSocial: string;
  compradorNome: string;
  aprovadorNome: string | null;
}

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function PedidosCompraPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.pedidos');
  const perfil = usePerfil();

  const [novoAberto, setNovoAberto] = useState(false);
  const [verPedido, setVerPedido] = useState<PedidoListado | null>(null);

  const lista = useListaPaginada<PedidoListado>({ rpc: 'fn_listar_pedidos_compra' });

  if (!podeLer) return <SemAcesso rotaCodigo="compras.pedidos" />;

  const colunas: ColunaDataTable<PedidoListado>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      render: (p) => <span className="font-mono text-xs">{p.numero ?? p.id.slice(0, 8)}</span>,
    },
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      render: (p) => <span className="text-xs">{formatDate(p.criadoEm)}</span>,
    },
    {
      chave: 'fornecedorRazaoSocial',
      titulo: 'Fornecedor',
      render: (p) => <span className="text-sm">{p.fornecedorRazaoSocial}</span>,
    },
    {
      chave: 'compradorNome',
      titulo: 'Comprador',
      render: (p) => <span className="text-sm">{p.compradorNome}</span>,
    },
    {
      chave: 'valorTotal',
      titulo: 'Valor total',
      largura: '160px',
      alinhar: 'right',
      render: (p) => <span className="font-mono">{FMT_BRL.format(Number(p.valorTotal))}</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (p) => <StatusBadge status={p.status} />,
    },
    {
      chave: 'acao',
      titulo: '',
      largura: '60px',
      render: (p) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setVerPedido(p);
          }}
        >
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Pedidos de Compra"
        subtitulo="Pedido fechado para fornecedor. Apos aprovado por alcada, vai para o fornecedor."
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo pedido
            </Button>
          )
        }
      />

      <DataTable<PedidoListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum pedido criado."
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

      {novoAberto && perfil.usuario && (
        <DialogNovoPedido
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await lista.recarregar();
          }}
        />
      )}

      {verPedido && (
        <DialogVerPedido
          pedido={verPedido}
          fornecedorNome={verPedido.fornecedorRazaoSocial}
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
            <div className="bg-muted/30 rounded-md border p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Valor total: </span>
                <strong className="font-mono">
                  {FMT_BRL.format(Number(respostaVencedora.valorTotal ?? 0))}
                </strong>
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
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
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
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
                <span className="text-muted-foreground text-xs">Observacoes</span>
                <p className="mt-1 text-sm">{pedido.observacoes}</p>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-semibold">Linha do tempo</h3>
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
      <span className="text-muted-foreground text-xs">{label}</span>
      <p className="text-sm">{valor}</p>
    </div>
  );
}
