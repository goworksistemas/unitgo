/**
 * LotesPage — almoxarife monta lotes de entrega.
 *
 * Lista lotes existentes + botao para criar novo. Para criar:
 *  - selecionar unidade destino
 *  - selecionar motorista
 *  - selecionar solicitacoes elegiveis (status approved/separated/awaiting_pickup)
 *  - codigo_qr e gerado automaticamente (uuid)
 *
 * Apos criar, cada solicitacao vinculada tem status atualizado para
 * 'awaiting_delivery'.
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type {
  Item,
  LoteEntrega,
  LoteEntregaItem,
  Solicitacao,
  StatusSolicitacao,
  Unidade,
  Usuario,
} from '@/types';

const STATUS_ELEGIVEIS: StatusSolicitacao[] = [
  'approved',
  'approved_designer',
  'separated',
  'awaiting_pickup',
];

export function LotesPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.lotes');

  const [lotes, setLotes] = useState<LoteEntrega[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [verLote, setVerLote] = useState<LoteEntrega | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ls, unis, usrs] = await Promise.all([
        crud<LoteEntrega>('lotes_entrega').list({
          ordenarPor: 'criadoEm',
          ascendente: false,
        }),
        crud<Unidade>('unidades').list({}),
        crud<Usuario>('usuarios').list({ igualdade: { ativo: true } }),
      ]);
      setLotes(ls);
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
  }, []);

  const unidadesMap = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const usuariosMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.lotes" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Lotes de Entrega"
        subtitulo="Almoxarife agrupa solicitacoes aprovadas em um lote para o motorista"
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Novo lote
            </Button>
          )
        }
      />

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : lotes.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhum lote criado ainda.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Numero</TableHead>
                <TableHead className="w-32">Quando</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Motorista</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lotes.map((l) => (
                <TableRow key={l.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setVerLote(l)}>
                  <TableCell className="font-mono text-xs">
                    {l.numero ?? l.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(l.criadoEm)}</TableCell>
                  <TableCell className="text-sm">
                    {unidadesMap.get(l.unidadeDestinoId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {usuariosMap.get(l.motoristaUsuarioId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => {
                      e.stopPropagation();
                      setVerLote(l);
                    }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {novoAberto && (
        <DialogNovoLote
          unidades={unidades}
          motoristas={usuarios}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await recarregar();
          }}
        />
      )}

      {verLote && (
        <DialogVerLote
          lote={verLote}
          destinoNome={unidadesMap.get(verLote.unidadeDestinoId)?.nome}
          motoristaNome={usuariosMap.get(verLote.motoristaUsuarioId)?.nome}
          aoFechar={() => setVerLote(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Dialog: novo lote
// ============================================================================

function DialogNovoLote({
  unidades,
  motoristas,
  aoFechar,
  aoSalvar,
}: {
  unidades: Unidade[];
  motoristas: Usuario[];
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [unidadeDestinoId, setUnidadeDestinoId] = useState('');
  const [motoristaId, setMotoristaId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [solicitacoesElegiveis, setSolicitacoesElegiveis] = useState<Solicitacao[]>([]);
  const [itensMap, setItensMap] = useState<Map<string, Item>>(new Map());
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  // Carrega elegiveis quando destino e' selecionado
  useEffect(() => {
    if (!unidadeDestinoId) {
      setSolicitacoesElegiveis([]);
      return;
    }
    setCarregando(true);
    Promise.all([
      crud<Solicitacao>('solicitacoes').list({
        igualdade: { unidadeSolicitanteId: unidadeDestinoId },
      }),
      crud<Item>('itens').list({}),
    ])
      .then(([sols, its]) => {
        setSolicitacoesElegiveis(sols.filter((s) => STATUS_ELEGIVEIS.includes(s.status)));
        setItensMap(new Map(its.map((i) => [i.id, i])));
      })
      .catch((e) => toast.error(e instanceof ApiError ? e.message : 'Erro'))
      .finally(() => setCarregando(false));
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

      // 1. Cria o lote
      const lote = await crud<LoteEntrega>('lotes_entrega').create({
        unidadeDestinoId,
        motoristaUsuarioId: motoristaId,
        codigoQr,
        status: 'pending',
        observacoes: observacoes.trim() || null,
      });

      // 2. Vincula as solicitacoes
      const ids = Array.from(selecionadas);
      const { error: errVinc } = await supabase.from('lotes_entrega_itens').insert(
        ids.map((solicitacao_id, idx) => ({
          lote_id: lote.id,
          solicitacao_id,
          ordem: idx,
        })),
      );
      if (errVinc) throw new ApiError(errVinc);

      // 3. Atualiza status das solicitacoes para awaiting_delivery
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
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo lote de entrega</DialogTitle>
          <DialogDescription>
            Selecione destino, motorista e as solicitacoes elegiveis
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Unidade destino</Label>
            <Select value={unidadeDestinoId} onValueChange={setUnidadeDestinoId}>
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

          <div className="space-y-1.5">
            <Label>Motorista</Label>
            <Select value={motoristaId} onValueChange={setMotoristaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {motoristas.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Solicitacoes elegiveis</Label>
            <div className="rounded-md border border-input p-2 max-h-72 overflow-y-auto">
              {!unidadeDestinoId ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Selecione um destino para ver as solicitacoes elegiveis.
                </p>
              ) : carregando ? (
                <Skeleton className="h-32 w-full" />
              ) : solicitacoesElegiveis.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma solicitacao elegivel para esse destino.
                </p>
              ) : (
                <div className="space-y-1">
                  {solicitacoesElegiveis.map((s) => {
                    const item = itensMap.get(s.itemId);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                      >
                        <Checkbox
                          checked={selecionadas.has(s.id)}
                          onCheckedChange={() => toggle(s.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {s.numero ?? s.id.slice(0, 8)}
                            </span>
                            <StatusBadge status={s.status} />
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item?.nome ?? '?'} × {s.quantidade}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="col-span-2 space-y-1.5">
            <Label>Observacoes</Label>
            <textarea
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
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

// ============================================================================
// Dialog: ver lote (mostra QR code e itens)
// ============================================================================

function DialogVerLote({
  lote,
  destinoNome,
  motoristaNome,
  aoFechar,
}: {
  lote: LoteEntrega;
  destinoNome?: string;
  motoristaNome?: string;
  aoFechar: () => void;
}) {
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
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
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
              <span className="text-xs text-muted-foreground">Destino</span>
              <p>{destinoNome ?? '?'}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Motorista</span>
              <p>{motoristaNome ?? '?'}</p>
            </div>
          </div>

          <div className="rounded-md border border-border p-4 bg-muted/30">
            <div className="flex items-center gap-3">
              <QrCode className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Codigo QR (compartilhe com motorista)</p>
                <p className="font-mono text-xs break-all mt-1">{lote.codigoQr}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Solicitacoes incluidas ({itens.length})</h3>
            {carregando ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <ul className="space-y-1">
                {itens.map((it) => (
                  <li key={it.id} className="text-sm font-mono text-muted-foreground">
                    #{it.ordem + 1} — {it.solicitacaoId.slice(0, 8)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {lote.observacoes && (
            <div>
              <span className="text-xs text-muted-foreground">Observacoes</span>
              <p className="text-sm mt-1">{lote.observacoes}</p>
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
