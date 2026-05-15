/**
 * ConferenciaPage — CL/Assistente confere conteudo do lote ja recebido pela recepcao.
 *
 * Fluxo:
 *  1. Lista lotes 'received_confirmed' via RPC paginada.
 *  2. CL abre o lote e marca cada solicitacao como conferida (ou nao).
 *  3. Cria confirmacoes_entrega tipo='requester_confirm' por solicitacao.
 *  4. Atualiza status da solicitacao para 'completed'.
 *  5. Quando todas conferidas, lote fica 'completed'.
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
import { ApiError, crud, rpcPaginado, supabase } from '@/lib/api';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type { ConfirmacaoEntrega, LoteEntrega, LoteEntregaItem, Solicitacao } from '@/types';

interface LoteListado extends LoteEntrega {
  unidadeDestinoNome: string;
  motoristaNome: string;
  totalSolicitacoes: number;
}

interface SolicitacaoBrief {
  id: string;
  numero: string | null;
  status: Solicitacao['status'];
  itemNome: string;
  quantidade: number;
}

export function ConferenciaPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.conferencia');
  const perfil = usePerfil();

  const [conferindo, setConferindo] = useState<LoteListado | null>(null);

  const lista = useListaPaginada<LoteListado>({
    rpc: 'fn_listar_lotes_entrega',
    filtros: { pStatus: 'received_confirmed' },
  });

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.conferencia" />;

  const colunas: ColunaDataTable<LoteListado>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      render: (l) => <span className="font-mono text-xs">{l.numero ?? l.id.slice(0, 8)}</span>,
    },
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      render: (l) => <span className="text-xs">{formatDate(l.criadoEm)}</span>,
    },
    {
      chave: 'unidadeDestinoNome',
      titulo: 'Destino',
      render: (l) => <span className="text-sm">{l.unidadeDestinoNome}</span>,
    },
    {
      chave: 'totalSolicitacoes',
      titulo: 'Solicitacoes',
      largura: '120px',
      alinhar: 'right',
      render: (l) => <span className="font-mono">{l.totalSolicitacoes}</span>,
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (l) => <StatusBadge status={l.status} />,
    },
    {
      chave: 'acoes',
      titulo: 'Acoes',
      alinhar: 'right',
      render: (l) =>
        podeEscrever && (
          <Button size="sm" onClick={() => setConferindo(l)}>
            Conferir
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Conferencia de Conteudo"
        subtitulo="CL/Assistente confere o que foi entregue ao destino"
      />

      <DataTable<LoteListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum lote aguardando conferencia."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar lote ou motorista...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {lista.itens.length === 0 && !lista.isLoading && (
        <div className="text-muted-foreground rounded-md border border-dashed p-12 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-10 w-10 opacity-40" />
          Nenhum lote aguardando conferencia.
        </div>
      )}

      {conferindo && perfil.usuario?.id && (
        <DialogConferir
          lote={conferindo}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setConferindo(null)}
          aoSalvar={async () => {
            setConferindo(null);
            await lista.recarregar();
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
  lote: LoteListado;
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoBrief[]>([]);
  const [conferidas, setConferidas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    (async () => {
      try {
        // 1. Carrega vinculos do lote (ids das solicitacoes).
        const vinculos = await crud<LoteEntregaItem>('lotes_entrega_itens').list({
          igualdade: { loteId: lote.id },
          ordenarPor: 'ordem',
        });
        if (cancelado) return;

        if (vinculos.length === 0) {
          setSolicitacoes([]);
          return;
        }

        // 2. Busca as solicitacoes pela RPC (com item resolvido).
        //    Como nao temos filtro por lista de ids, fazemos uma chamada
        //    que paginariamente trara o que precisamos. Para fins praticos,
        //    o numero de itens por lote e pequeno (< 50), entao 1 pagina basta.
        const res = await rpcPaginado<SolicitacaoBrief & Solicitacao>('fn_listar_solicitacoes', {
          pPagina: 1,
          pTamanho: 200,
          pUnidadeId: lote.unidadeDestinoId,
        });
        if (cancelado) return;

        const idsSet = new Set(vinculos.map((v) => v.solicitacaoId));
        const filtradas = res.registros
          .filter((s) => idsSet.has(s.id))
          .map((s) => ({
            id: s.id,
            numero: s.numero,
            status: s.status,
            itemNome: s.itemNome,
            quantidade: s.quantidade,
          }));
        setSolicitacoes(filtradas);
      } catch (e) {
        if (!cancelado) toast.error(e instanceof ApiError ? e.message : 'Erro ao carregar lote');
      } finally {
        if (!cancelado) setCarregando(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [lote.id, lote.unidadeDestinoId]);

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

      const confs = ids.map((solicitacaoId) => ({
        lote_id: lote.id,
        solicitacao_id: solicitacaoId,
        tipo: 'requester_confirm',
        confirmado_por_usuario_id: meuUsuarioId,
      }));
      const { error: errConf } = await supabase.from('confirmacoes_entrega').insert(confs);
      if (errConf) throw new ApiError(errConf);

      const { error: errUpd } = await supabase
        .from('solicitacoes')
        .update({ status: 'completed', concluido_em: new Date().toISOString() })
        .in('id', ids);
      if (errUpd) throw new ApiError(errUpd);

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
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conferir lote {lote.numero ?? lote.id.slice(0, 8)}</DialogTitle>
          <DialogDescription>Marque as solicitacoes que recebeu corretamente</DialogDescription>
        </DialogHeader>

        {carregando ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-2 py-2">
            {solicitacoes.map((s) => {
              const checked = conferidas.has(s.id);
              return (
                <label
                  key={s.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 transition ${
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
                      <span className="font-mono text-xs">{s.numero ?? s.id.slice(0, 8)}</span>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="text-sm">{s.itemNome}</div>
                    <div className="text-muted-foreground text-xs">Quantidade: {s.quantidade}</div>
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
