/**
 * TimelinePage — busca log de atividades de qualquer entidade.
 *
 * Permite filtrar por tipo de entidade + id especifico ou ver todos os
 * eventos recentes do sistema.
 */
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, crud } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { formatDate, formatRelativeTimePast } from '@/lib/format';
import type { LogAtividade, Usuario } from '@/types';

const TIPOS_ENTIDADE = [
  'usuario',
  'unidade',
  'item',
  'movimentacao',
  'solicitacao',
  'solicitacao_compra',
  'cotacao',
  'pedido_compra',
  'nota_fiscal',
  'contrato',
  'recebimento',
  'lote_entrega',
];

export function TimelinePage() {
  const { podeLer } = usePermissao('auditoria.timeline');

  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [usuariosMap, setUsuariosMap] = useState<Map<string, Usuario>>(new Map());
  const [carregando, setCarregando] = useState(false);
  const [tipoEntidade, setTipoEntidade] = useState<string>('todos');
  const [entidadeId, setEntidadeId] = useState('');

  async function buscar() {
    setCarregando(true);
    try {
      const filtros: Record<string, unknown> = {};
      if (tipoEntidade !== 'todos') filtros.tipoEntidade = tipoEntidade;
      if (entidadeId.trim()) filtros.entidadeId = entidadeId.trim();

      const [ls, us] = await Promise.all([
        crud<LogAtividade>('log_atividades').list({
          igualdade: Object.keys(filtros).length > 0 ? filtros : undefined,
          ordenarPor: 'criadoEm',
          ascendente: false,
          limite: 200,
        }),
        usuariosMap.size === 0 ? crud<Usuario>('usuarios').list({}) : Promise.resolve([]),
      ]);
      setLogs(ls);
      if (Array.isArray(us) && us.length > 0) {
        setUsuariosMap(new Map(us.map((u) => [u.id, u])));
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao buscar');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void buscar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!podeLer) return <SemAcesso rotaCodigo="auditoria.timeline" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Timeline de Atividades"
        subtitulo="Historico de mudancas em qualquer entidade do sistema"
      />

      <div className="rounded-md border p-4 space-y-3">
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-4 space-y-1.5">
            <Label>Tipo de entidade</Label>
            <Select value={tipoEntidade} onValueChange={setTipoEntidade}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                {TIPOS_ENTIDADE.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-6 space-y-1.5">
            <Label>ID da entidade (opcional)</Label>
            <Input
              value={entidadeId}
              onChange={(e) => setEntidadeId(e.target.value)}
              placeholder="UUID"
            />
          </div>
          <div className="col-span-2 flex items-end">
            <Button onClick={buscar} disabled={carregando} className="w-full">
              <Search className="h-4 w-4 mr-1.5" />
              Buscar
            </Button>
          </div>
        </div>
      </div>

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhum log encontrado.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Quando</TableHead>
                <TableHead className="w-40">Entidade</TableHead>
                <TableHead className="w-40">Acao</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Usuario</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="text-xs">
                    <div>{formatDate(l.criadoEm)}</div>
                    <div className="text-muted-foreground">{formatRelativeTimePast(l.criadoEm)}</div>
                  </TableCell>
                  <TableCell className="text-xs">
                    <div className="font-mono">{l.tipoEntidade}</div>
                    <div className="text-muted-foreground">{l.entidadeId.slice(0, 8)}...</div>
                  </TableCell>
                  <TableCell className="text-sm font-medium">{l.acao}</TableCell>
                  <TableCell className="text-xs">
                    {l.statusAnterior && l.statusNovo ? (
                      <span className="font-mono">
                        {l.statusAnterior} → {l.statusNovo}
                      </span>
                    ) : (
                      '—'
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {l.usuarioId ? usuariosMap.get(l.usuarioId)?.nome ?? '?' : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="text-xs text-muted-foreground">{logs.length} evento(s)</div>
    </div>
  );
}
