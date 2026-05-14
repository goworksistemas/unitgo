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
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
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
import { Timeline } from '@/components/shared/Timeline';
import { formatDate, getUrgenciaLabel } from '@/lib/format';
import type {
  Item,
  Solicitacao,
  StatusSolicitacao,
  TipoSolicitacao,
  Unidade,
  Urgencia,
  Usuario,
} from '@/types';

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
  /** Filtra itens por flag. ex: ehMovel para furniture. */
  filtroItens?: (item: Item) => boolean;
}

export function SolicitacaoListaPage({
  tipoSolicitacao,
  rotaCodigo,
  titulo,
  subtitulo,
  statusInicial,
  mostrarTomador = false,
  mostrarDevolucaoPrevista = false,
  filtroItens,
}: Props) {
  const { podeLer, podeEscrever } = usePermissao(rotaCodigo);
  const perfil = usePerfil();

  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [dialogNovo, setDialogNovo] = useState(false);
  const [verSolicitacao, setVerSolicitacao] = useState<Solicitacao | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [sols, its, unis, usrs] = await Promise.all([
        crud<Solicitacao>('solicitacoes').list({
          igualdade: { tipo: tipoSolicitacao },
          ordenarPor: 'criadoEm',
          ascendente: false,
        }),
        crud<Item>('itens').list({}),
        crud<Unidade>('unidades').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setSolicitacoes(sols);
      setItens(filtroItens ? its.filter(filtroItens) : its);
      setUnidades(unis);
      setUsuarios(usrs);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao carregar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSolicitacao]);

  const itensMap = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const unidadesMap = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const usuariosMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const filtradas = useMemo(() => {
    let r = solicitacoes;
    if (filtroStatus !== 'todos') r = r.filter((s) => s.status === filtroStatus);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter((s) => {
        const item = itensMap.get(s.itemId);
        return (
          item?.nome.toLowerCase().includes(t) ||
          (s.numero ?? '').toLowerCase().includes(t)
        );
      });
    }
    return r;
  }, [solicitacoes, filtroStatus, busca, itensMap]);

  const statusUnicos = useMemo(
    () => Array.from(new Set(solicitacoes.map((s) => s.status))),
    [solicitacoes],
  );

  if (!podeLer) return <SemAcesso rotaCodigo={rotaCodigo} />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo={titulo}
        subtitulo={subtitulo}
        acoes={
          podeEscrever && (
            <Button onClick={() => setDialogNovo(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova solicitacao
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item ou numero..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
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

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Numero</TableHead>
                <TableHead className="w-32">Quando</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-20">Qtd</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead className="w-24">Urgencia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Nenhuma solicitacao encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((s) => {
                  const item = itensMap.get(s.itemId);
                  const unidade = unidadesMap.get(s.unidadeSolicitanteId);
                  const solicitante = usuariosMap.get(s.solicitadoPorUsuarioId);
                  return (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setVerSolicitacao(s)}
                    >
                      <TableCell className="font-mono text-xs">
                        {s.numero ?? s.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="text-xs">{formatDate(s.criadoEm)}</TableCell>
                      <TableCell className="text-sm">{item?.nome ?? '?'}</TableCell>
                      <TableCell className="text-right font-mono">{s.quantidade}</TableCell>
                      <TableCell className="text-sm">{unidade?.nome ?? '?'}</TableCell>
                      <TableCell className="text-sm">{solicitante?.nome ?? '?'}</TableCell>
                      <TableCell>
                        <Badge variant={urgenciaVariant(s.urgencia)}>
                          {getUrgenciaLabel(s.urgencia)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => {
                          e.stopPropagation();
                          setVerSolicitacao(s);
                        }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        {filtradas.length} de {solicitacoes.length} registro(s)
      </div>

      {dialogNovo && (
        <DialogNova
          tipoSolicitacao={tipoSolicitacao}
          statusInicial={statusInicial}
          itens={itens}
          unidades={unidades}
          usuarios={usuarios}
          meuUsuarioId={perfil.usuario?.id ?? null}
          unidadePadraoId={perfil.usuario?.unidadesIds?.[0] ?? null}
          mostrarTomador={mostrarTomador}
          mostrarDevolucaoPrevista={mostrarDevolucaoPrevista}
          aoFechar={() => setDialogNovo(false)}
          aoSalvar={async () => {
            setDialogNovo(false);
            await recarregar();
          }}
        />
      )}

      {verSolicitacao && (
        <DialogDetalhe
          solicitacao={verSolicitacao}
          item={itensMap.get(verSolicitacao.itemId)}
          unidade={unidadesMap.get(verSolicitacao.unidadeSolicitanteId)}
          solicitante={usuariosMap.get(verSolicitacao.solicitadoPorUsuarioId)}
          aoFechar={() => setVerSolicitacao(null)}
        />
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
  itens,
  unidades,
  usuarios,
  meuUsuarioId,
  unidadePadraoId,
  mostrarTomador,
  mostrarDevolucaoPrevista,
  aoFechar,
  aoSalvar,
}: {
  tipoSolicitacao: TipoSolicitacao;
  statusInicial: StatusSolicitacao;
  itens: Item[];
  unidades: Unidade[];
  usuarios: Usuario[];
  meuUsuarioId: string | null;
  unidadePadraoId: string | null;
  mostrarTomador: boolean;
  mostrarDevolucaoPrevista: boolean;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [unidadeId, setUnidadeId] = useState(unidadePadraoId ?? '');
  const [andarDestino, setAndarDestino] = useState('');
  const [localizacaoDetalhe, setLocalizacaoDetalhe] = useState('');
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<Urgencia>('medium');
  const [tomadorId, setTomadorId] = useState('');
  const [devolucaoPrevista, setDevolucaoPrevista] = useState('');
  const [salvando, setSalvando] = useState(false);

  const unidadeSelecionada = useMemo(
    () => unidades.find((u) => u.id === unidadeId),
    [unidades, unidadeId],
  );

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
      if (mostrarTomador) payload.tomadorUsuarioId = tomadorId;
      if (mostrarDevolucaoPrevista)
        payload.emprestimoDevolucaoPrevista = devolucaoPrevista;

      await crud<Solicitacao>('solicitacoes').create(payload);
      toast.success('Solicitacao criada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

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
            <Select value={itemId} onValueChange={setItemId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {itens.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Select value={unidadeId} onValueChange={setUnidadeId}>
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

          {unidadeSelecionada && unidadeSelecionada.andares.length > 0 && (
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
                  {unidadeSelecionada.andares.map((a) => (
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
              <Select value={tomadorId} onValueChange={setTomadorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
  item,
  unidade,
  solicitante,
  aoFechar,
}: {
  solicitacao: Solicitacao;
  item?: Item;
  unidade?: Unidade;
  solicitante?: Usuario;
  aoFechar: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Solicitacao {solicitacao.numero ?? solicitacao.id.slice(0, 8)}</span>
            <StatusBadge status={solicitacao.status} />
          </DialogTitle>
          <DialogDescription>
            Criada em {formatDate(solicitacao.criadoEm)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 py-2 text-sm">
          <Linha label="Item" valor={item?.nome ?? '?'} />
          <Linha label="Quantidade" valor={String(solicitacao.quantidade)} />
          <Linha label="Unidade" valor={unidade?.nome ?? '?'} />
          <Linha label="Andar" valor={solicitacao.andarDestino ?? '—'} />
          <Linha label="Localizacao" valor={solicitacao.localizacaoDetalhe ?? '—'} />
          <Linha label="Solicitante" valor={solicitante?.nome ?? '?'} />
          <Linha label="Urgencia" valor={getUrgenciaLabel(solicitacao.urgencia)} />
          {solicitacao.justificativa && (
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Justificativa</span>
              <p className="mt-1 text-sm">{solicitacao.justificativa}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-3">Linha do tempo</h3>
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
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm">{valor}</p>
    </div>
  );
}
