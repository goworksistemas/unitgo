/**
 * LotesPage — almoxarife monta lotes de entrega.
 *
 * Lista lotes via RPC `fn_listar_lotes_entrega` (paginada, JOIN com unidade
 * destino, motorista e total_solicitacoes ja resolvidos).
 *
 * Para criar:
 *  - selecionar unidade destino
 *  - selecionar motorista
 *  - selecionar solicitacoes elegiveis (status approved/separated/awaiting_pickup)
 *  - codigo_qr e gerado automaticamente (uuid)
 *
 * Apos criar, cada solicitacao vinculada tem status atualizado para
 * 'awaiting_delivery'.
 */
import { useEffect, useState } from 'react';
import { Eye, Plus, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { usePermissao } from '@/hooks/usePermissao';
import { ComboboxFK } from '@/components/crud/ComboboxFK';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type { LoteEntrega, LoteEntregaItem, StatusSolicitacao } from '@/types';

interface LoteListado extends LoteEntrega {
  unidadeDestinoNome: string;
  motoristaNome: string;
  totalSolicitacoes: number;
}

const STATUS_ELEGIVEIS: StatusSolicitacao[] = [
  'approved',
  'approved_designer',
  'separated',
  'awaiting_pickup',
];

export function LotesPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.lotes');

  const [novoAberto, setNovoAberto] = useState(false);
  const [verLote, setVerLote] = useState<LoteListado | null>(null);

  const lista = useListaPaginada<LoteListado>({
    rpc: 'fn_listar_lotes_entrega',
  });

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.lotes" />;

  const colunas: ColunaDataTable<LoteListado>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      largura: '130px',
      render: (l) => <span className="font-mono text-xs">{l.numero ?? l.id.slice(0, 8)}</span>,
    },
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      largura: '130px',
      render: (l) => <span className="text-xs">{formatDate(l.criadoEm)}</span>,
    },
    {
      chave: 'unidadeDestinoNome',
      titulo: 'Destino',
      render: (l) => <span className="text-sm">{l.unidadeDestinoNome}</span>,
    },
    {
      chave: 'motoristaNome',
      titulo: 'Motorista',
      render: (l) => <span className="text-sm">{l.motoristaNome}</span>,
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
      titulo: '',
      largura: '60px',
      render: (l) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setVerLote(l);
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
        titulo="Lotes de Entrega"
        subtitulo="Almoxarife agrupa solicitacoes aprovadas em um lote para o motorista"
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Novo lote
            </Button>
          )
        }
      />

      <DataTable<LoteListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum lote criado ainda."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por numero, motorista ou QR...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {novoAberto && (
        <DialogNovoLote
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await lista.recarregar();
          }}
        />
      )}

      {verLote && <DialogVerLote lote={verLote} aoFechar={() => setVerLote(null)} />}
    </div>
  );
}

// ============================================================================
// Dialog: novo lote
// ============================================================================

function DialogNovoLote({
  aoFechar,
  aoSalvar,
}: {
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [unidadeDestinoId, setUnidadeDestinoId] = useState<string | null>(null);
  const [motoristaId, setMotoristaId] = useState<string | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [solicitacoesElegiveis, setSolicitacoesElegiveis] = useState<
    Array<{
      id: string;
      numero: string | null;
      status: StatusSolicitacao;
      itemNome: string;
      quantidade: number;
    }>
  >([]);
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carrega elegiveis quando destino e' selecionado via RPC paginada.
  useEffect(() => {
    if (!unidadeDestinoId) {
      setSolicitacoesElegiveis([]);
      return;
    }
    setCarregando(true);
    (async () => {
      try {
        const res = await rpcPaginado<{
          id: string;
          numero: string | null;
          status: StatusSolicitacao;
          itemNome: string;
          quantidade: number;
        }>('fn_listar_solicitacoes', {
          pUnidadeId: unidadeDestinoId,
          pPagina: 1,
          pTamanho: 200,
        });
        setSolicitacoesElegiveis(res.registros.filter((s) => STATUS_ELEGIVEIS.includes(s.status)));
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : 'Erro ao buscar elegiveis');
      } finally {
        setCarregando(false);
      }
    })();
  }, [unidadeDestinoId]);

  function toggle(id: string) {
    setSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  async function handleSalvar() {
    if (!unidadeDestinoId) return toast.error('Selecione o destino');
    if (!motoristaId) return toast.error('Selecione o motorista');
    if (selecionadas.size === 0) return toast.error('Selecione pelo menos uma solicitacao');

    setSalvando(true);
    try {
      const codigoQr = crypto.randomUUID();

      const lote = await crud<LoteEntrega>('lotes_entrega').create({
        unidadeDestinoId,
        motoristaUsuarioId: motoristaId,
        codigoQr,
        status: 'pending',
        observacoes: observacoes.trim() || null,
      });

      const ids = Array.from(selecionadas);
      const { error: errVinc } = await supabase.from('lotes_entrega_itens').insert(
        ids.map((solicitacao_id, idx) => ({
          lote_id: lote.id,
          solicitacao_id,
          ordem: idx,
        })),
      );
      if (errVinc) throw new ApiError(errVinc);

      const { error: errUpd } = await supabase
        .from('solicitacoes')
        .update({ status: 'awaiting_delivery', lote_entrega_id: lote.id })
        .in('id', ids);
      if (errUpd) throw new ApiError(errUpd);

      toast.success(`Lote criado com ${selecionadas.size} solicitacao(oes)`);
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao criar lote');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lote de entrega</DialogTitle>
          <DialogDescription>
            Selecione destino, motorista e as solicitacoes elegiveis
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Unidade destino</Label>
            <SeletorUnidade valor={unidadeDestinoId} aoMudar={setUnidadeDestinoId} />
          </div>

          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <ComboboxFK
              valor={motoristaId}
              aoMudar={setMotoristaId}
              rpc="fn_listar_usuarios"
              campoLabel="nome"
              paramsRpc={{ pAtivo: true }}
              placeholder="Buscar motorista..."
              permiteVazio={false}
            />
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Solicitacoes elegiveis</Label>
            <div className="border-input max-h-72 overflow-y-auto rounded-md border p-2">
              {!unidadeDestinoId ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Selecione um destino para ver as solicitacoes elegiveis.
                </p>
              ) : carregando ? (
                <Skeleton className="h-32 w-full" />
              ) : solicitacoesElegiveis.length === 0 ? (
                <p className="text-muted-foreground py-4 text-center text-sm">
                  Nenhuma solicitacao elegivel para esse destino.
                </p>
              ) : (
                <div className="space-y-1">
                  {solicitacoesElegiveis.map((s) => (
                    <label
                      key={s.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded p-2 text-sm"
                    >
                      <Checkbox
                        checked={selecionadas.has(s.id)}
                        onCheckedChange={() => toggle(s.id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">{s.numero ?? s.id.slice(0, 8)}</span>
                          <StatusBadge status={s.status} />
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {s.itemNome} × {s.quantidade}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Observacoes</Label>
            <textarea
              className="border-input w-full rounded-md border bg-transparent px-3 py-2 text-sm"
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
            {salvando ? 'Criando...' : `Criar lote (${selecionadas.size})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Seletor de unidade (universo pequeno -> Select normal pre-carregado).
function SeletorUnidade({
  valor,
  aoMudar,
}: {
  valor: string | null;
  aoMudar: (v: string) => void;
}) {
  const { opcoes } = useOpcoesFK('unidades', 'nome', { filtros: { status: 'active' } });
  return (
    <select
      className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
      value={valor ?? ''}
      onChange={(e) => aoMudar(e.target.value)}
    >
      <option value="">Selecione...</option>
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

// ============================================================================
// Dialog: ver lote (mostra QR code e itens)
// ============================================================================

function DialogVerLote({ lote, aoFechar }: { lote: LoteListado; aoFechar: () => void }) {
  const [itens, setItens] = useState<LoteEntregaItem[]>([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    crud<LoteEntregaItem>('lotes_entrega_itens')
      .list({ igualdade: { loteId: lote.id }, ordenarPor: 'ordem' })
      .then(setItens)
      .finally(() => setCarregando(false));
  }, [lote.id]);

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Lote {lote.numero ?? lote.id.slice(0, 8)}</span>
            <StatusBadge status={lote.status} />
          </DialogTitle>
          <DialogDescription>Criado em {formatDate(lote.criadoEm)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground text-xs">Destino</span>
              <p>{lote.unidadeDestinoNome}</p>
            </div>
            <div>
              <span className="text-muted-foreground text-xs">Motorista</span>
              <p>{lote.motoristaNome}</p>
            </div>
          </div>

          <div className="border-border bg-muted/30 rounded-md border p-4">
            <div className="flex items-center gap-3">
              <QrCode className="text-primary h-8 w-8" />
              <div className="flex-1">
                <p className="text-muted-foreground text-xs">
                  Codigo QR (compartilhe com motorista)
                </p>
                <p className="mt-1 font-mono text-xs break-all">{lote.codigoQr}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-semibold">Solicitacoes incluidas ({itens.length})</h3>
            {carregando ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="space-y-1">
                {itens.map((it) => (
                  <li key={it.id} className="text-muted-foreground font-mono text-sm">
                    #{it.ordem + 1} — {it.solicitacaoId.slice(0, 8)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lote.observacoes && (
            <div>
              <span className="text-muted-foreground text-xs">Observacoes</span>
              <p className="mt-1 text-sm">{lote.observacoes}</p>
            </div>
          )}
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
