/**
 * MovimentacoesPage — historico de movimentacoes + criacao manual.
 *
 * Lista todas as movimentacoes com filtros por tipo/item/unidade.
 * Permite criar movimentacao manual (entry, exit, transfer, disposal, adjustment).
 * O trigger fn_aplicar_movimentacao no banco atualiza saldos automaticamente.
 */
import { useEffect, useMemo, useState } from 'react';
import { Plus, Search } from 'lucide-react';
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
import { formatDate, getTipoMovimentacaoLabel } from '@/lib/format';
import type { Item, Movimentacao, TipoMovimentacao, Unidade, Usuario } from '@/types';

const TIPOS_MOV: { valor: TipoMovimentacao; label: string }[] = [
  { valor: 'entry', label: 'Entrada' },
  { valor: 'exit', label: 'Saida' },
  { valor: 'transfer', label: 'Transferencia' },
  { valor: 'disposal', label: 'Descarte' },
  { valor: 'adjustment', label: 'Ajuste' },
];

export function MovimentacoesPage() {
  const { podeLer, podeEscrever } = usePermissao('estoque.movimentacoes');
  const perfil = usePerfil();

  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('todos');
  const [dialogAberto, setDialogAberto] = useState(false);

  async function recarregar() {
    setCarregando(true);
    try {
      const [mov, its, unis, usrs] = await Promise.all([
        crud<Movimentacao>('movimentacoes').list({
          ordenarPor: 'criadoEm',
          ascendente: false,
          limite: 500,
        }),
        crud<Item>('itens').list({}),
        crud<Unidade>('unidades').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setMovimentacoes(mov);
      setItens(its);
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

  const itensMap = useMemo(() => new Map(itens.map((i) => [i.id, i])), [itens]);
  const unidadesMap = useMemo(() => new Map(unidades.map((u) => [u.id, u])), [unidades]);
  const usuariosMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const movFiltradas = useMemo(() => {
    let r = movimentacoes;
    if (filtroTipo !== 'todos') r = r.filter((m) => m.tipo === filtroTipo);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter((m) => {
        const item = itensMap.get(m.itemId);
        return item?.nome.toLowerCase().includes(t);
      });
    }
    return r;
  }, [movimentacoes, filtroTipo, busca, itensMap]);

  if (!podeLer) return <SemAcesso rotaCodigo="estoque.movimentacoes" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Movimentacoes de Estoque"
        subtitulo="Historico de entradas, saidas, transferencias e ajustes"
        acoes={
          podeEscrever && (
            <Button onClick={() => setDialogAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova movimentacao
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por item..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {TIPOS_MOV.map((t) => (
              <SelectItem key={t.valor} value={t.valor}>
                {t.label}
              </SelectItem>
            ))}
            <SelectItem value="loan_out">Emprestimo (saida)</SelectItem>
            <SelectItem value="loan_return">Devolucao</SelectItem>
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
                <TableHead className="w-32">Quando</TableHead>
                <TableHead className="w-36">Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-24">Qtd</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Observacoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movFiltradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma movimentacao encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                movFiltradas.map((m) => {
                  const item = itensMap.get(m.itemId);
                  const unidade = m.unidadeId ? unidadesMap.get(m.unidadeId) : null;
                  const origem = m.unidadeOrigemId ? unidadesMap.get(m.unidadeOrigemId) : null;
                  const destino = m.unidadeDestinoId ? unidadesMap.get(m.unidadeDestinoId) : null;
                  const usuario = usuariosMap.get(m.usuarioId);
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="text-xs">{formatDate(m.criadoEm)}</TableCell>
                      <TableCell>
                        <Badge variant={tipoVariant(m.tipo)}>
                          {getTipoMovimentacaoLabel(m.tipo)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{item?.nome ?? '?'}</TableCell>
                      <TableCell className="text-right font-mono">{m.quantidade}</TableCell>
                      <TableCell className="text-sm">
                        {m.tipo === 'transfer'
                          ? `${origem?.nome ?? '?'} → ${destino?.nome ?? '?'}`
                          : (unidade?.nome ?? '—')}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {usuario?.nome ?? '?'}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {m.observacoes ?? ''}
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
        {movFiltradas.length} de {movimentacoes.length} registro(s)
      </div>

      {dialogAberto && (
        <DialogNovaMov
          itens={itens}
          unidades={unidades}
          meuUsuarioId={perfil.usuario?.id ?? null}
          aoFechar={() => setDialogAberto(false)}
          aoSalvar={async () => {
            setDialogAberto(false);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

function tipoVariant(t: TipoMovimentacao) {
  switch (t) {
    case 'entry':
    case 'loan_return':
      return 'default' as const;
    case 'exit':
    case 'loan_out':
      return 'secondary' as const;
    case 'disposal':
      return 'destructive' as const;
    case 'transfer':
    case 'adjustment':
    default:
      return 'outline' as const;
  }
}

// ============================================================================
// Dialog: nova movimentacao
// ============================================================================

function DialogNovaMov({
  itens,
  unidades,
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  itens: Item[];
  unidades: Unidade[];
  meuUsuarioId: string | null;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoMovimentacao>('entry');
  const [itemId, setItemId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [unidadeId, setUnidadeId] = useState('');
  const [unidadeOrigemId, setUnidadeOrigemId] = useState('');
  const [unidadeDestinoId, setUnidadeDestinoId] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [motivoDescarte, setMotivoDescarte] = useState('');
  const [salvando, setSalvando] = useState(false);

  const ehTransferencia = tipo === 'transfer';
  const ehDescarte = tipo === 'disposal';

  async function handleSalvar() {
    if (!meuUsuarioId) {
      toast.error('Usuario nao identificado');
      return;
    }
    if (!itemId) return toast.error('Selecione um item');
    if (quantidade <= 0) return toast.error('Quantidade deve ser positiva');

    if (ehTransferencia) {
      if (!unidadeOrigemId || !unidadeDestinoId) {
        return toast.error('Selecione origem e destino');
      }
      if (unidadeOrigemId === unidadeDestinoId) {
        return toast.error('Origem e destino devem ser diferentes');
      }
    } else if (!unidadeId) {
      return toast.error('Selecione a unidade');
    }

    setSalvando(true);
    try {
      const payload: Partial<Movimentacao> = {
        tipo,
        itemId,
        quantidade,
        usuarioId: meuUsuarioId,
        observacoes: observacoes.trim() || null,
      };

      if (ehTransferencia) {
        payload.unidadeOrigemId = unidadeOrigemId;
        payload.unidadeDestinoId = unidadeDestinoId;
        payload.unidadeId = null;
      } else {
        payload.unidadeId = unidadeId;
      }

      if (ehDescarte) {
        payload.motivoDescarte = motivoDescarte.trim() || null;
      }

      await crud<Movimentacao>('movimentacoes').create(payload);
      toast.success('Movimentacao registrada');
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
          <DialogTitle>Nova movimentacao</DialogTitle>
          <DialogDescription>
            O saldo do estoque sera atualizado automaticamente
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as TipoMovimentacao)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_MOV.map((t) => (
                  <SelectItem key={t.valor} value={t.valor}>
                    {t.label}
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

          {ehTransferencia ? (
            <>
              <div className="space-y-1.5">
                <Label>Origem</Label>
                <Select value={unidadeOrigemId} onValueChange={setUnidadeOrigemId}>
                  <SelectTrigger>
                    <SelectValue placeholder="..." />
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
                <Label>Destino</Label>
                <Select value={unidadeDestinoId} onValueChange={setUnidadeDestinoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="..." />
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
            </>
          ) : (
            <div className="col-span-2 space-y-1.5">
              <Label>Unidade</Label>
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
          )}

          {ehDescarte && (
            <div className="col-span-2 space-y-1.5">
              <Label>Motivo do descarte</Label>
              <Input
                value={motivoDescarte}
                onChange={(e) => setMotivoDescarte(e.target.value)}
                placeholder="quebrado, vencido, obsoleto..."
              />
            </div>
          )}

          <div className="col-span-2 space-y-1.5">
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
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
