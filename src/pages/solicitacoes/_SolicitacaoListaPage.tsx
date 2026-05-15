/**
 * Componente generico para listar/criar/visualizar solicitacoes de um tipo.
 *
 * Usado pelas paginas:
 *  - solicitacoes/material
 *  - solicitacoes/movel
 *  - solicitacoes/retirada-movel
 *  - solicitacoes/emprestimo
 *
 * Cada pagina e' uma instancia com props: tipoSolicitacao, rotaCodigo, etc.
 *
 * Listagem via RPC `fn_listar_solicitacoes` (paginada server-side, JOIN
 * com item/unidade/solicitante ja resolvido pelo banco).
 */
import { useMemo, useState } from 'react';
import { Eye, Plus } from 'lucide-react';
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
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { formatDate, getUrgenciaLabel } from '@/lib/format';
import type { Solicitacao, StatusSolicitacao, TipoSolicitacao, Unidade, Urgencia } from '@/types';

interface SolicitacaoListada extends Solicitacao {
  itemNome: string;
  unidadeNome: string;
  solicitanteNome: string;
  tomadorNome: string | null;
}

interface Props {
  tipoSolicitacao: TipoSolicitacao;
  rotaCodigo: string;
  titulo: string;
  subtitulo?: string;
  statusInicial: StatusSolicitacao;
  /** Mostra campo "tomador" no form (so emprestimo). */
  mostrarTomador?: boolean;
  /** Mostra campo "previsao de devolucao" (so emprestimo). */
  mostrarDevolucaoPrevista?: boolean;
  /** Filtra itens por flag (no Combobox). ex: ehMovel para furniture. */
  filtroItensParamsRpc?: Record<string, unknown>;
}

export function SolicitacaoListaPage({
  tipoSolicitacao,
  rotaCodigo,
  titulo,
  subtitulo,
  statusInicial,
  mostrarTomador = false,
  mostrarDevolucaoPrevista = false,
  filtroItensParamsRpc,
}: Props) {
  const { podeLer, podeEscrever } = usePermissao(rotaCodigo);
  const perfil = usePerfil();

  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [verSolicitacao, setVerSolicitacao] = useState<SolicitacaoListada | null>(null);

  const filtrosRpc = useMemo<Record<string, unknown>>(() => {
    const f: Record<string, unknown> = { pTipo: tipoSolicitacao };
    if (filtroStatus !== 'todos') f.pStatus = filtroStatus;
    return f;
  }, [tipoSolicitacao, filtroStatus]);

  const lista = useListaPaginada<SolicitacaoListada>({
    rpc: 'fn_listar_solicitacoes',
    filtros: filtrosRpc,
  });

  if (!podeLer) return <SemAcesso rotaCodigo={rotaCodigo} />;

  const statusUnicos = Array.from(new Set(lista.itens.map((s) => s.status)));

  const colunas: ColunaDataTable<SolicitacaoListada>[] = [
    {
      chave: 'numero',
      titulo: 'Numero',
      largura: '120px',
      render: (s) => <span className="font-mono text-xs">{s.numero ?? s.id.slice(0, 8)}</span>,
    },
    {
      chave: 'criadoEm',
      titulo: 'Quando',
      largura: '130px',
      render: (s) => <span className="text-xs">{formatDate(s.criadoEm)}</span>,
    },
    {
      chave: 'itemNome',
      titulo: 'Item',
      render: (s) => <span className="text-sm">{s.itemNome}</span>,
    },
    {
      chave: 'quantidade',
      titulo: 'Qtd',
      largura: '80px',
      alinhar: 'right',
      render: (s) => <span className="font-mono">{s.quantidade}</span>,
    },
    {
      chave: 'unidadeNome',
      titulo: 'Unidade',
      render: (s) => <span className="text-sm">{s.unidadeNome}</span>,
    },
    {
      chave: 'solicitanteNome',
      titulo: 'Solicitante',
      render: (s) => <span className="text-sm">{s.solicitanteNome}</span>,
    },
    {
      chave: 'urgencia',
      titulo: 'Urgencia',
      largura: '110px',
      render: (s) => (
        <Badge variant={urgenciaVariant(s.urgencia)}>{getUrgenciaLabel(s.urgencia)}</Badge>
      ),
    },
    {
      chave: 'status',
      titulo: 'Status',
      render: (s) => <StatusBadge status={s.status} />,
    },
    {
      chave: 'acao',
      titulo: '',
      largura: '60px',
      render: (s) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            setVerSolicitacao(s);
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
        titulo={titulo}
        subtitulo={subtitulo}
        acoes={
          podeEscrever && (
            <Button onClick={() => setDialogNovo(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Nova solicitacao
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {statusUnicos.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable<SolicitacaoListada>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhuma solicitacao encontrada."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por numero, item ou justificativa...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {dialogNovo && (
        <DialogNova
          tipoSolicitacao={tipoSolicitacao}
          statusInicial={statusInicial}
          meuUsuarioId={perfil.usuario?.id ?? null}
          unidadePadraoId={perfil.usuario?.unidadesIds?.[0] ?? null}
          mostrarTomador={mostrarTomador}
          mostrarDevolucaoPrevista={mostrarDevolucaoPrevista}
          filtroItensParamsRpc={filtroItensParamsRpc}
          aoFechar={() => setDialogNovo(false)}
          aoSalvar={async () => {
            setDialogNovo(false);
            await lista.recarregar();
          }}
        />
      )}

      {verSolicitacao && (
        <DialogDetalhe solicitacao={verSolicitacao} aoFechar={() => setVerSolicitacao(null)} />
      )}
    </div>
  );
}

function urgenciaVariant(u: Urgencia) {
  switch (u) {
    case 'high':
      return 'destructive' as const;
    case 'medium':
      return 'secondary' as const;
    default:
      return 'outline' as const;
  }
}

// ============================================================================
// Dialog: nova solicitacao
// ============================================================================

function DialogNova({
  tipoSolicitacao,
  statusInicial,
  meuUsuarioId,
  unidadePadraoId,
  mostrarTomador,
  mostrarDevolucaoPrevista,
  filtroItensParamsRpc,
  aoFechar,
  aoSalvar,
}: {
  tipoSolicitacao: TipoSolicitacao;
  statusInicial: StatusSolicitacao;
  meuUsuarioId: string | null;
  unidadePadraoId: string | null;
  mostrarTomador: boolean;
  mostrarDevolucaoPrevista: boolean;
  filtroItensParamsRpc?: Record<string, unknown>;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  // Unidades e usuarios sao universos pequenos -> carregamos pre.
  const { opcoes: unidadesOpcoes } = useOpcoesFK('unidades', 'nome', {
    filtros: { status: 'active' },
  });
  const [unidadesAndares, setUnidadesAndares] = useState<Map<string, string[]>>(new Map());

  const [itemId, setItemId] = useState<string | null>(null);
  const [quantidade, setQuantidade] = useState(1);
  const [unidadeId, setUnidadeId] = useState(unidadePadraoId ?? '');
  const [andarDestino, setAndarDestino] = useState('');
  const [localizacaoDetalhe, setLocalizacaoDetalhe] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<Urgencia>('medium');
  const [tomadorId, setTomadorId] = useState<string | null>(null);
  const [devolucaoPrevista, setDevolucaoPrevista] = useState('');
  const [salvando, setSalvando] = useState(false);

  const andaresDisponiveis = unidadesAndares.get(unidadeId) ?? [];

  // Carrega lazy os andares da unidade selecionada.
  async function carregarAndaresSeNecessario(id: string) {
    if (!id || unidadesAndares.has(id)) return;
    try {
      const u = await crud<Unidade>('unidades').get(id);
      setUnidadesAndares((prev) => {
        const nv = new Map(prev);
        nv.set(id, u?.andares ?? []);
        return nv;
      });
    } catch {
      // silencioso
    }
  }

  async function handleSalvar() {
    if (!meuUsuarioId) return toast.error('Usuario nao identificado');
    if (!itemId) return toast.error('Selecione um item');
    if (quantidade <= 0) return toast.error('Quantidade deve ser positiva');
    if (!unidadeId) return toast.error('Selecione a unidade');
    if (mostrarTomador && !tomadorId) return toast.error('Selecione o tomador');
    if (mostrarDevolucaoPrevista && !devolucaoPrevista)
      return toast.error('Informe data de devolucao prevista');

    setSalvando(true);
    try {
      const payload: Partial<Solicitacao> = {
        tipo: tipoSolicitacao,
        status: statusInicial,
        itemId,
        quantidade,
        unidadeSolicitanteId: unidadeId,
        solicitadoPorUsuarioId: meuUsuarioId,
        andarDestino: andarDestino || null,
        localizacaoDetalhe: localizacaoDetalhe || null,
        justificativa: justificativa || null,
        urgencia,
      };
      if (mostrarTomador && tomadorId) payload.tomadorUsuarioId = tomadorId;
      if (mostrarDevolucaoPrevista) payload.emprestimoDevolucaoPrevista = devolucaoPrevista;

      await crud<Solicitacao>('solicitacoes').create(payload);
      toast.success('Solicitacao criada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  // Carrega andares da unidade padrao na abertura.
  useState(() => {
    if (unidadePadraoId) void carregarAndaresSeNecessario(unidadePadraoId);
  });

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova solicitacao</DialogTitle>
          <DialogDescription>Preencha os campos abaixo</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="col-span-2 space-y-1.5">
            <Label>Item</Label>
            <ComboboxFK
              valor={itemId}
              aoMudar={setItemId}
              rpc="fn_listar_itens"
              campoLabel="nome"
              paramsRpc={{ pAtivo: true, ...(filtroItensParamsRpc ?? {}) }}
              placeholder="Buscar item..."
              permiteVazio={false}
            />
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

          <div className="space-y-1.5">
            <Label>Urgencia</Label>
            <Select value={urgencia} onValueChange={(v) => setUrgencia(v as Urgencia)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Media</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Unidade solicitante</Label>
            <Select
              value={unidadeId}
              onValueChange={(v) => {
                setUnidadeId(v);
                setAndarDestino('');
                void carregarAndaresSeNecessario(v);
              }}
            >
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

          {andaresDisponiveis.length > 0 && (
            <div className="space-y-1.5">
              <Label>Andar destino</Label>
              <Select
                value={andarDestino}
                onValueChange={(v) => setAndarDestino(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— nenhum —</SelectItem>
                  {andaresDisponiveis.map((a) => (
                    <SelectItem key={a} value={a}>
                      {a}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Localizacao detalhada</Label>
            <Input
              value={localizacaoDetalhe}
              onChange={(e) => setLocalizacaoDetalhe(e.target.value)}
              placeholder="sala 12, copa, ..."
            />
          </div>

          {mostrarTomador && (
            <div className="col-span-2 space-y-1.5">
              <Label>Tomador (quem vai usar)</Label>
              <ComboboxFK
                valor={tomadorId}
                aoMudar={setTomadorId}
                rpc="fn_listar_usuarios"
                campoLabel="nome"
                paramsRpc={{ pAtivo: true }}
                placeholder="Buscar usuario..."
                permiteVazio={false}
              />
            </div>
          )}

          {mostrarDevolucaoPrevista && (
            <div className="col-span-2 space-y-1.5">
              <Label>Data de devolucao prevista</Label>
              <Input
                type="date"
                value={devolucaoPrevista}
                onChange={(e) => setDevolucaoPrevista(e.target.value)}
              />
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
            <Label>Justificativa</Label>
            <Textarea
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que voce esta solicitando?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog: detalhe + timeline
// ============================================================================

function DialogDetalhe({
  solicitacao,
  aoFechar,
}: {
  solicitacao: SolicitacaoListada;
  aoFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Solicitacao {solicitacao.numero ?? solicitacao.id.slice(0, 8)}</span>
            <StatusBadge status={solicitacao.status} />
          </DialogTitle>
          <DialogDescription>Criada em {formatDate(solicitacao.criadoEm)}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
          <Linha label="Item" valor={solicitacao.itemNome} />
          <Linha label="Quantidade" valor={String(solicitacao.quantidade)} />
          <Linha label="Unidade" valor={solicitacao.unidadeNome} />
          <Linha label="Andar" valor={solicitacao.andarDestino ?? '—'} />
          <Linha label="Localizacao" valor={solicitacao.localizacaoDetalhe ?? '—'} />
          <Linha label="Solicitante" valor={solicitacao.solicitanteNome} />
          <Linha label="Urgencia" valor={getUrgenciaLabel(solicitacao.urgencia)} />
          {solicitacao.tomadorNome && <Linha label="Tomador" valor={solicitacao.tomadorNome} />}
          {solicitacao.justificativa && (
            <div className="col-span-2">
              <span className="text-muted-foreground text-xs">Justificativa</span>
              <p className="mt-1 text-sm">{solicitacao.justificativa}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 font-semibold">Linha do tempo</h3>
          <Timeline tipoEntidade="solicitacao" entidadeId={solicitacao.id} />
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
