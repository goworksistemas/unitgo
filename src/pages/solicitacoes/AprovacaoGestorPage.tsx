/**
 * AprovacaoGestorPage — fila de solicitacoes pendentes para o gestor.
 *
 * Mostra solicitacoes com status pendente que aguardam aprovacao tecnica.
 * Aprovador pode aprovar (avanca status) ou rejeitar (com motivo).
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
import {
  formatDate,
  getTipoSolicitacaoLabel,
  getUrgenciaLabel,
} from '@/lib/format';
import type {
  Item,
  Solicitacao,
  StatusSolicitacao,
  Unidade,
  Urgencia,
  Usuario,
} from '@/types';

const STATUS_PENDENTES: StatusSolicitacao[] = [
  'pending',
  'pending_approval',
  'pending_designer',
  'pending_confirmation',
];

export function AprovacaoGestorPage() {
  const { podeLer, podeAprovar } = usePermissao('solicitacoes.aprovacao-gestor');
  const perfil = usePerfil();

  const [pendentes, setPendentes] = useState<Solicitacao[]>([]);
  const [itens, setItens] = useState<Item[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [rejeitando, setRejeitando] = useState<Solicitacao | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [todas, its, unis, usrs] = await Promise.all([
        crud<Solicitacao>('solicitacoes').list({
          ordenarPor: 'criadoEm',
          ascendente: true,
        }),
        crud<Item>('itens').list({}),
        crud<Unidade>('unidades').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setPendentes(todas.filter((s) => STATUS_PENDENTES.includes(s.status)));
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

  if (!podeLer) return <SemAcesso rotaCodigo="solicitacoes.aprovacao-gestor" />;

  async function aprovar(s: Solicitacao) {
    if (!perfil.usuario?.id) return;
    const novoStatus: StatusSolicitacao = proximoStatusAprovado(s);
    try {
      await crud<Solicitacao>('solicitacoes').update(s.id, {
        status: novoStatus,
        aprovadoPorUsuarioId: perfil.usuario.id,
        aprovadoEm: new Date().toISOString(),
      });
      toast.success('Solicitacao aprovada');
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao aprovar');
    }
  }

  async function rejeitar(s: Solicitacao, motivo: string) {
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
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao rejeitar');
    }
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Aprovacao do Gestor"
        subtitulo="Solicitacoes aguardando aprovacao tecnica (sem valor)"
      />

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : pendentes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center text-muted-foreground">
          Nenhuma solicitacao pendente.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Numero</TableHead>
                <TableHead className="w-32">Quando</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Item</TableHead>
                <TableHead className="text-right w-20">Qtd</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead className="w-24">Urgencia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-32">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendentes.map((s) => {
                const item = itensMap.get(s.itemId);
                const unidade = unidadesMap.get(s.unidadeSolicitanteId);
                const solicitante = usuariosMap.get(s.solicitadoPorUsuarioId);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      {s.numero ?? s.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(s.criadoEm)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {getTipoSolicitacaoLabel(s.tipo)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{item?.nome ?? '?'}</TableCell>
                    <TableCell className="text-right font-mono">{s.quantidade}</TableCell>
                    <TableCell className="text-sm">{solicitante?.nome ?? '?'}</TableCell>
                    <TableCell className="text-sm">{unidade?.nome ?? '?'}</TableCell>
                    <TableCell>
                      <Badge variant={urgenciaVariant(s.urgencia)}>
                        {getUrgenciaLabel(s.urgencia)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {podeAprovar && (
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
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

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

/** Define o proximo status apos aprovacao tecnica, conforme tipo. */
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
  solicitacao: Solicitacao;
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
