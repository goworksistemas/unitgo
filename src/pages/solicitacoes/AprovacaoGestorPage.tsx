/**
 * AprovacaoGestorPage — fila de solicitacoes pendentes para o gestor.
 *
 * Aprovacao tecnica (CAMADA 1): mostra apenas as solicitacoes pendentes cujo
 * solicitante pertence a um departamento que o usuario logado aprova via
 * alcada de `escopo = 'requisicao'`. Sem dependencia de valor.
 *
 * A lista vem paginada via RPC `fn_listar_solicitacoes` + filtro client-side
 * por departamento do solicitante (carregamos `usuarios` da pagina atual
 * pontualmente). Como a fila tende a ser pequena (apenas pendentes) isso
 * funciona bem.
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
import { ApiError, crud, supabase } from '@/lib/api';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate, getTipoSolicitacaoLabel, getUrgenciaLabel } from '@/lib/format';
import type {
  AlcadaAprovacao,
  Departamento,
  Solicitacao,
  StatusSolicitacao,
  Urgencia,
  Usuario,
} from '@/types';

interface SolicitacaoListada extends Solicitacao {
  itemNome: string;
  unidadeNome: string;
  solicitanteNome: string;
}

export function AprovacaoGestorPage() {
  const { podeLer, podeAprovar } = usePermissao('solicitacoes.aprovacao-gestor');
  const perfil = usePerfil();

  /** IDs de departamentos que o usuario logado aprova (alcadas requisicao). */
  const [meusDepartamentosIds, setMeusDepartamentosIds] = useState<Set<string>>(new Set());
  const [nomesMeusDepartamentos, setNomesMeusDepartamentos] = useState<string[]>([]);
  const [carregandoAlcadas, setCarregandoAlcadas] = useState(true);
  const [rejeitando, setRejeitando] = useState<SolicitacaoListada | null>(null);
  /** Usuarios visiveis na pagina atual (para filtro de departamento). */
  const [usuariosMap, setUsuariosMap] = useState<Map<string, Usuario>>(new Map());

  // Lista paginada de solicitacoes pendentes (todos os tipos).
  const lista = useListaPaginada<SolicitacaoListada>({
    rpc: 'fn_listar_solicitacoes',
    paramsRpc: { pStatus: null }, // sem filtro de status: filtramos pelos 'pendentes' no client.
    tamanho: 100, // fila tende a ser pequena
  });

  // Carrega alcadas do usuario logado uma vez.
  useEffect(() => {
    let cancelado = false;
    setCarregandoAlcadas(true);

    (async () => {
      const meuId = perfil.usuario?.id;
      if (!meuId) {
        setCarregandoAlcadas(false);
        return;
      }
      try {
        const alcadas = await crud<AlcadaAprovacao>('alcadas_aprovacao').list({
          igualdade: { ativo: true, escopo: 'requisicao', usuario_id: meuId },
        });

        let depsIds = new Set<string>();
        if (alcadas.length > 0) {
          const ids = alcadas.map((a) => a.id);
          const { data: vincRaw, error } = await supabase
            .from('alcadas_aprovacao_departamentos')
            .select('departamento_id')
            .in('alcada_id', ids);
          if (error) throw new ApiError(error);
          depsIds = new Set((vincRaw ?? []).map((v) => v.departamento_id as string));
        }

        let nomes: string[] = [];
        if (depsIds.size > 0) {
          const { data: depsRaw, error } = await supabase
            .from('departamentos')
            .select('id, nome')
            .in('id', Array.from(depsIds));
          if (error) throw new ApiError(error);
          nomes = (depsRaw ?? []).map((d) => (d as Pick<Departamento, 'nome'>).nome);
        }

        if (!cancelado) {
          setMeusDepartamentosIds(depsIds);
          setNomesMeusDepartamentos(nomes);
        }
      } catch (e) {
        if (!cancelado) toast.error(e instanceof ApiError ? e.message : 'Erro ao carregar alcadas');
      } finally {
        if (!cancelado) setCarregandoAlcadas(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [perfil.usuario?.id]);

  // Quando muda a pagina/lista, carrega usuarios da pagina (para pegar departamento).
  useEffect(() => {
    if (lista.itens.length === 0) {
      setUsuariosMap(new Map());
      return;
    }
    const ids = Array.from(new Set(lista.itens.map((s) => s.solicitadoPorUsuarioId)));
    let cancelado = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('id, nome, departamento_id, email')
          .in('id', ids);
        if (error) throw new ApiError(error);
        if (cancelado) return;
        const map = new Map<string, Usuario>();
        for (const u of (data ?? []) as Array<Record<string, unknown>>) {
          map.set(
            u.id as string,
            {
              id: u.id as string,
              nome: u.nome as string,
              email: u.email as string,
              departamentoId: (u.departamento_id as string | null) ?? null,
            } as Usuario,
          );
        }
        setUsuariosMap(map);
      } catch {
        if (!cancelado) setUsuariosMap(new Map());
      }
    })();
    return () => {
      cancelado = true;
    };
  }, [lista.itens]);

  const pendentesMinhas = useMemo(() => {
    return lista.itens.filter((s) => {
      // status pendente
      if (!isStatusPendente(s.status)) return false;
      if (meusDepartamentosIds.size === 0) return false;
      const solic = usuariosMap.get(s.solicitadoPorUsuarioId);
      return solic?.departamentoId ? meusDepartamentosIds.has(solic.departamentoId) : false;
    });
  }, [lista.itens, meusDepartamentosIds, usuariosMap]);

  if (!podeLer) return <SemAcesso rotaCodigo="solicitacoes.aprovacao-gestor" />;

  async function aprovar(s: SolicitacaoListada) {
    if (!perfil.usuario?.id) return;
    const novoStatus: StatusSolicitacao = proximoStatusAprovado(s);
    try {
      await crud<Solicitacao>('solicitacoes').update(s.id, {
        status: novoStatus,
        aprovadoPorUsuarioId: perfil.usuario.id,
        aprovadoEm: new Date().toISOString(),
      });
      toast.success('Solicitacao aprovada');
      await lista.recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao aprovar');
    }
  }

  async function rejeitar(s: SolicitacaoListada, motivo: string) {
    if (!perfil.usuario?.id) return;
    try {
      await crud<Solicitacao>('solicitacoes').update(s.id, {
        status: 'rejected',
        motivoRejeicao: motivo,
        rejeitadoPorUsuarioId: perfil.usuario.id,
        rejeitadoEm: new Date().toISOString(),
      });
      toast.success('Solicitacao rejeitada');
      setRejeitando(null);
      await lista.recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao rejeitar');
    }
  }

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
      chave: 'tipo',
      titulo: 'Tipo',
      render: (s) => (
        <Badge variant="secondary" className="text-xs">
          {getTipoSolicitacaoLabel(s.tipo)}
        </Badge>
      ),
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
      chave: 'solicitanteNome',
      titulo: 'Solicitante',
      render: (s) => <span className="text-sm">{s.solicitanteNome}</span>,
    },
    {
      chave: 'unidadeNome',
      titulo: 'Unidade',
      render: (s) => <span className="text-sm">{s.unidadeNome}</span>,
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
      chave: 'acoes',
      titulo: 'Acoes',
      largura: '110px',
      alinhar: 'right',
      render: (s) =>
        podeAprovar && (
          <div className="flex justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => aprovar(s)}
              title="Aprovar"
              className="text-green-600 hover:text-green-700"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRejeitando(s)}
              title="Rejeitar"
              className="text-red-600 hover:text-red-700"
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
        titulo="Aprovacao do Gestor"
        subtitulo="Solicitacoes aguardando aprovacao tecnica do gestor de departamento (sem valor)"
      />

      {!carregandoAlcadas && (
        <div className="bg-muted/30 rounded-md border p-3 text-sm">
          {nomesMeusDepartamentos.length === 0 ? (
            <span className="text-amber-700 dark:text-amber-300">
              Voce nao tem alcadas de requisicao cadastradas. Solicite ao administrador para
              cadastrar uma alcada vinculando voce aos departamentos que aprova.
            </span>
          ) : (
            <>
              Voce aprova requisicoes dos departamentos:{' '}
              <span className="inline-flex flex-wrap gap-1">
                {nomesMeusDepartamentos.map((nome) => (
                  <Badge key={nome} variant="outline" className="text-xs">
                    {nome}
                  </Badge>
                ))}
              </span>
            </>
          )}
        </div>
      )}

      <DataTable<SolicitacaoListada>
        itens={pendentesMinhas}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhuma solicitacao pendente nos seus departamentos."
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

      {rejeitando && (
        <DialogRejeicao
          solicitacao={rejeitando}
          aoFechar={() => setRejeitando(null)}
          aoConfirmar={(motivo) => rejeitar(rejeitando, motivo)}
        />
      )}
    </div>
  );
}

function isStatusPendente(s: StatusSolicitacao): boolean {
  return (
    s === 'pending' ||
    s === 'pending_approval' ||
    s === 'pending_designer' ||
    s === 'pending_confirmation'
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

function proximoStatusAprovado(s: Solicitacao): StatusSolicitacao {
  switch (s.tipo) {
    case 'material':
      return 'approved';
    case 'furniture_to_unit':
      return 'approved_designer';
    case 'furniture_removal':
      return 'approved_designer';
    case 'loan':
      return 'approved';
    default:
      return 'approved';
  }
}

function DialogRejeicao({
  solicitacao,
  aoFechar,
  aoConfirmar,
}: {
  solicitacao: SolicitacaoListada;
  aoFechar: () => void;
  aoConfirmar: (motivo: string) => void;
}) {
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleConfirmar() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo');
      return;
    }
    setSalvando(true);
    await aoConfirmar(motivo.trim());
    setSalvando(false);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rejeitar solicitacao</DialogTitle>
          <DialogDescription>
            {solicitacao.numero ?? solicitacao.id.slice(0, 8)} — informe o motivo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Motivo da rejeicao</Label>
          <Textarea
            rows={4}
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Explique brevemente..."
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={salvando}
            className="bg-red-600 hover:bg-red-700"
          >
            {salvando ? 'Rejeitando...' : 'Rejeitar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
