/**
 * AprovacaoDiretoriaPage — fila de pedidos aguardando aprovacao por alcada.
 *
 * Mostra apenas pedidos cujo valor_total esta dentro da alcada do usuario
 * logado (valor_limite >= valor_total OU valor_limite IS NULL).
 *
 * Aprovador pode aprovar (vira sent_to_supplier) ou reprovar.
 */
import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
  AlcadaAprovacao,
  Fornecedor,
  PedidoCompra,
  PedidoCompraAprovacao,
  Usuario,
} from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function AprovacaoDiretoriaPage() {
  const { podeLer, podeAprovar } = usePermissao('compras.aprovacao-diretoria');
  const perfil = usePerfil();

  const [pedidos, setPedidos] = useState<PedidoCompra[]>([]);
  const [minhaAlcada, setMinhaAlcada] = useState<AlcadaAprovacao | null>(null);
  const [fornecedoresMap, setFornMap] = useState<Map<string, Fornecedor>>(new Map());
  const [usuariosMap, setUsuariosMap] = useState<Map<string, Usuario>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [acao, setAcao] = useState<{
    pedido: PedidoCompra;
    tipo: 'aprovar' | 'reprovar';
  } | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ps, alcadas, fs, us] = await Promise.all([
        crud<PedidoCompra>('pedidos_compra').list({}),
        crud<AlcadaAprovacao>('alcadas_aprovacao').list({ igualdade: { ativo: true } }),
        crud<Fornecedor>('fornecedores').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setPedidos(ps.filter((p) => p.status === 'pending_approval'));
      const minhaUid = perfil.usuario?.id;
      const a = alcadas.find((al) => al.usuarioId === minhaUid) ?? null;
      setMinhaAlcada(a);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil.usuario?.id]);

  const visiveis = useMemo(() => {
    if (!minhaAlcada) return [];
    if (minhaAlcada.valorLimite === null) return pedidos;
    return pedidos.filter((p) => Number(p.valorTotal) <= Number(minhaAlcada.valorLimite));
  }, [pedidos, minhaAlcada]);

  if (!podeLer) return <SemAcesso rotaCodigo="compras.aprovacao-diretoria" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Aprovacao Diretoria"
        subtitulo="Pedidos aguardando aprovacao por alcada (valor)"
      />

      {minhaAlcada ? (
        <div className="rounded-md border bg-muted/30 p-3 text-sm">
          Sua alcada:{' '}
          <strong>
            {minhaAlcada.valorLimite === null
              ? 'sem teto'
              : FMT_BRL.format(Number(minhaAlcada.valorLimite))}
          </strong>
        </div>
      ) : (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          Voce nao tem alcada cadastrada. Solicite a um administrador.
        </div>
      )}

      {carregando ? (
        <Skeleton className="h-32 w-full" />
      ) : visiveis.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhum pedido pendente dentro da sua alcada.
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
                <TableHead className="text-right w-32">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.map((p) => (
                <TableRow key={p.id}>
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
                  <TableCell className="text-right">
                    {podeAprovar && (
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
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {acao && perfil.usuario && (
        <DialogAcao
          pedido={acao.pedido}
          tipo={acao.tipo}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setAcao(null)}
          aoSalvar={async () => {
            setAcao(null);
            await recarregar();
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
  pedido: PedidoCompra;
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
        ...(tipo === 'aprovar' ? { enviadoFornecedorEm: new Date().toISOString() } : {
          canceladoEm: new Date().toISOString(),
          motivoCancelamento: observacao.trim(),
        }),
      });

      toast.success(tipo === 'aprovar' ? 'Pedido aprovado e enviado ao fornecedor' : 'Pedido reprovado');
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
          <Textarea
            rows={3}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
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
