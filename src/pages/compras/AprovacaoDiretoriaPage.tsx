/**
 * AprovacaoDiretoriaPage — fila de pedidos aguardando aprovacao por alcada.
 *
 * Mostra apenas pedidos cujo valor_total cai dentro da faixa da alcada do
 * usuario logado (`valor_limite_min <= valor_total <= valor_limite_max`,
 * onde `valor_limite_max NULL` = sem teto). Considera apenas alcadas com
 * escopo = 'pedido'.
 *
 * Aprovador pode aprovar (vira sent_to_supplier) ou reprovar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { AlcadaAprovacao, PedidoCompra, PedidoCompraAprovacao } from '@/types';

interface PedidoListado extends PedidoCompra {
  fornecedorRazaoSocial: string;
  compradorNome: string;
  aprovadorNome: string | null;
}

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function AprovacaoDiretoriaPage() {
  const { podeLer, podeAprovar } = usePermissao('compras.aprovacao-diretoria');
  const perfil = usePerfil();

  const [minhaAlcada, setMinhaAlcada] = useState<AlcadaAprovacao | null>(null);
  const [carregandoAlcada, setCarregandoAlcada] = useState(true);
  const [acao, setAcao] = useState<{
    pedido: PedidoListado;
    tipo: 'aprovar' | 'reprovar';
  } | null>(null);

  const lista = useListaPaginada<PedidoListado>({
    rpc: 'fn_listar_pedidos_compra',
    filtros: { pStatus: 'pending_approval' },
    tamanho: 100,
  });

  useEffect(() => {
    let cancelado = false;
    setCarregandoAlcada(true);
    (async () => {
      const meuId = perfil.usuario?.id;
      if (!meuId) {
        setCarregandoAlcada(false);
        return;
      }
      try {
        const alcadas = await crud<AlcadaAprovacao>('alcadas_aprovacao').list({
          igualdade: { ativo: true, escopo: 'pedido', usuario_id: meuId },
        });
        const a =
          alcadas.sort((x, y) => {
            const xv = x.valorLimiteMax ?? Number.POSITIVE_INFINITY;
            const yv = y.valorLimiteMax ?? Number.POSITIVE_INFINITY;
            return yv - xv;
          })[0] ?? null;
        if (!cancelado) setMinhaAlcada(a);
      } finally {
        if (!cancelado) setCarregandoAlcada(false);
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [perfil.usuario?.id]);

  const visiveis = useMemo(() => {
    if (!minhaAlcada) return [];
    const min = Number(minhaAlcada.valorLimiteMin ?? 0);
    const max = minhaAlcada.valorLimiteMax;
    return lista.itens.filter((p) => {
      const v = Number(p.valorTotal);
      if (v < min) return false;
      if (max !== null && v > Number(max)) return false;
      return true;
    });
  }, [lista.itens, minhaAlcada]);

  if (!podeLer) return <SemAcesso rotaCodigo="compras.aprovacao-diretoria" />;

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
      chave: 'acoes',
      titulo: 'Acoes',
      largura: '110px',
      alinhar: 'right',
      render: (p) =>
        podeAprovar && (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAcao({ pedido: p, tipo: 'aprovar' })}
              className="text-green-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAcao({ pedido: p, tipo: 'reprovar' })}
              className="text-red-600"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Aprovacao Diretoria"
        subtitulo="Pedidos aguardando aprovacao por alcada (valor)"
      />

      {!carregandoAlcada &&
        (minhaAlcada ? (
          <div className="bg-muted/30 rounded-md border p-3 text-sm">
            Sua alcada:{' '}
            <strong>
              {FMT_BRL.format(Number(minhaAlcada.valorLimiteMin ?? 0))}
              {' a '}
              {minhaAlcada.valorLimiteMax === null
                ? 'sem teto'
                : FMT_BRL.format(Number(minhaAlcada.valorLimiteMax))}
            </strong>
          </div>
        ) : (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:bg-amber-950/30">
            Voce nao tem alcada cadastrada. Solicite a um administrador.
          </div>
        ))}

      <DataTable<PedidoListado>
        itens={visiveis}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum pedido pendente dentro da sua alcada."
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

      {acao && perfil.usuario && (
        <DialogAcao
          pedido={acao.pedido}
          tipo={acao.tipo}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setAcao(null)}
          aoSalvar={async () => {
            setAcao(null);
            await lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

function DialogAcao({
  pedido,
  tipo,
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  pedido: PedidoListado;
  tipo: 'aprovar' | 'reprovar';
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleConfirmar() {
    if (tipo === 'reprovar' && !observacao.trim()) {
      return toast.error('Informe o motivo da reprovacao');
    }

    setSalvando(true);
    try {
      // 1. Cria registro versionado
      await crud<PedidoCompraAprovacao>('pedidos_compra_aprovacoes').create({
        pedidoId: pedido.id,
        versao: pedido.versaoAprovacao,
        aprovadorId: meuUsuarioId,
        acao: tipo === 'aprovar' ? 'aprovado' : 'reprovado',
        observacao: observacao.trim() || null,
        valorReferencia: Number(pedido.valorTotal),
      });

      // 2. Atualiza pedido
      await crud<PedidoCompra>('pedidos_compra').update(pedido.id, {
        status: tipo === 'aprovar' ? 'sent_to_supplier' : 'cancelled',
        statusAprovacao: tipo === 'aprovar' ? 'aprovado' : 'reprovado',
        aprovadorAlcadaId: meuUsuarioId,
        ...(tipo === 'aprovar'
          ? { enviadoFornecedorEm: new Date().toISOString() }
          : {
              canceladoEm: new Date().toISOString(),
              motivoCancelamento: observacao.trim(),
            }),
      });

      toast.success(
        tipo === 'aprovar' ? 'Pedido aprovado e enviado ao fornecedor' : 'Pedido reprovado',
      );
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{tipo === 'aprovar' ? 'Aprovar pedido' : 'Reprovar pedido'}</DialogTitle>
          <DialogDescription>
            {pedido.numero ?? pedido.id.slice(0, 8)} —{' '}
            <Badge variant="secondary" className="font-mono">
              {FMT_BRL.format(Number(pedido.valorTotal))}
            </Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Observacao{tipo === 'reprovar' ? ' (obrigatoria)' : ''}</Label>
          <Textarea rows={3} value={observacao} onChange={(e) => setObservacao(e.target.value)} />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={salvando}
            className={tipo === 'aprovar' ? '' : 'bg-red-600 hover:bg-red-700'}
          >
            {salvando ? '...' : tipo === 'aprovar' ? 'Aprovar' : 'Reprovar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
