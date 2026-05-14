/**
 * ConferenciaPage — CL/Assistente confere conteudo do lote ja recebido pela recepcao.
 *
 * Fluxo:
 *  1. Lista lotes com status 'received_confirmed' destinados a unidade do CL
 *  2. CL abre o lote e marca cada solicitacao como conferida (ou nao)
 *  3. Cria confirmacoes_entrega tipo='requester_confirm' por solicitacao
 *  4. Atualiza status da solicitacao para 'completed' (ou 'cancelled' em caso de divergencia)
 *  5. Quando todas conferidas, lote fica 'completed'
 */
import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
import { formatDate } from '@/lib/format';
import type {
  ConfirmacaoEntrega,
  Item,
  LoteEntrega,
  LoteEntregaItem,
  Solicitacao,
  Unidade,
} from '@/types';

export function ConferenciaPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.conferencia');
  const perfil = usePerfil();

  const [lotes, setLotes] = useState<LoteEntrega[]>([]);
  const [unidadesMap, setUnidadesMap] = useState<Map<string, Unidade>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [conferindo, setConferindo] = useState<LoteEntrega | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ls, unis] = await Promise.all([
        crud<LoteEntrega>('lotes_entrega').list({ ordenarPor: 'criadoEm', ascendente: false }),
        crud<Unidade>('unidades').list({}),
      ]);
      setLotes(ls.filter((l) => l.status === 'received_confirmed'));
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

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.conferencia" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Conferencia de Conteudo"
        subtitulo="CL/Assistente confere o que foi entregue ao destino"
      />

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : lotes.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Nenhum lote aguardando conferencia.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">
                    {l.numero ?? l.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(l.criadoEm)}</TableCell>
                  <TableCell className="text-sm">
                    {unidadesMap.get(l.unidadeDestinoId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {podeEscrever && (
                      <Button size="sm" onClick={() => setConferindo(l)}>
                        Conferir
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {conferindo && perfil.usuario?.id && (
        <DialogConferir
          lote={conferindo}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setConferindo(null)}
          aoSalvar={async () => {
            setConferindo(null);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

function DialogConferir({
  lote,
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  lote: LoteEntrega;
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [itensMap, setItensMap] = useState<Map<string, Item>>(new Map());
  const [conferidas, setConferidas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    setCarregando(true);
    crud<LoteEntregaItem>('lotes_entrega_itens')
      .list({ igualdade: { loteId: lote.id }, ordenarPor: 'ordem' })
      .then(async (vinculos) => {
        const ids = vinculos.map((v) => v.solicitacaoId);
        if (ids.length === 0) {
          setSolicitacoes([]);
          return;
        }
        const { data, error } = await supabase
          .from('solicitacoes')
          .select('*')
          .in('id', ids);
        if (error) throw new ApiError(error);
        const sols = (data ?? []) as Record<string, unknown>[];
        // toCamelCase manual aqui seria muito; o select retorna snake — vamos buscar via crud item por item
        // Simplificacao: usa crud generico (faz N queries)
        const carregadas = await Promise.all(
          ids.map((id) => crud<Solicitacao>('solicitacoes').get(id)),
        );
        setSolicitacoes(carregadas.filter((s): s is Solicitacao => s !== null));
        return sols;
      })
      .then(async () => {
        const its = await crud<Item>('itens').list({});
        setItensMap(new Map(its.map((i) => [i.id, i])));
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erro'))
      .finally(() => setCarregando(false));
  }, [lote.id]);

  const todasConferidas = useMemo(
    () => solicitacoes.length > 0 && solicitacoes.every((s) => conferidas.has(s.id)),
    [solicitacoes, conferidas],
  );

  function toggle(id: string) {
    setConferidas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function handleSalvar() {
    if (conferidas.size === 0) return toast.error('Marque pelo menos uma como conferida');

    setSalvando(true);
    try {
      const ids = Array.from(conferidas);

      // 1. Cria confirmacao por solicitacao
      const confs = ids.map((solicitacaoId) => ({
        lote_id: lote.id,
        solicitacao_id: solicitacaoId,
        tipo: 'requester_confirm',
        confirmado_por_usuario_id: meuUsuarioId,
      }));
      const { error: errConf } = await supabase.from('confirmacoes_entrega').insert(confs);
      if (errConf) throw new ApiError(errConf);

      // 2. Atualiza solicitacoes para completed
      const { error: errUpd } = await supabase
        .from('solicitacoes')
        .update({ status: 'completed', concluido_em: new Date().toISOString() })
        .in('id', ids);
      if (errUpd) throw new ApiError(errUpd);

      // 3. Se todas conferidas, fecha o lote
      if (todasConferidas) {
        await crud<LoteEntrega>('lotes_entrega').update(lote.id, {
          status: 'completed',
          concluidoEm: new Date().toISOString(),
        });
      }

      toast.success(`${ids.length} solicitacao(oes) conferida(s)`);
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao confirmar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferir lote {lote.numero ?? lote.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>
            Marque as solicitacoes que recebeu corretamente
          </DialogDescription>
        </DialogHeader>

        {carregando ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2 py-2">
            {solicitacoes.map((s) => {
              const item = itensMap.get(s.itemId);
              const checked = conferidas.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition ${
                    checked ? 'border-primary bg-primary/5' : 'border-input hover:bg-muted/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(s.id)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {s.numero ?? s.id.slice(0, 8)}
                      </span>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="text-sm">{item?.nome ?? '?'}</div>
                    <div className="text-xs text-muted-foreground">
                      Quantidade: {s.quantidade}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Confirmando...' : `Confirmar ${conferidas.size} item(ns)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
