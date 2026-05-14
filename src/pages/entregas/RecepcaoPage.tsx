/**
 * RecepcaoPage — recepcionista registra recebimento fisico do lote.
 *
 * Fluxo:
 *  1. Lista lotes com status 'in_transit' ou 'pending'
 *  2. Recepcionista clica em "Registrar recebimento"
 *  3. Cria linha em confirmacoes_entrega com tipo='reception_receipt'
 *  4. Atualiza status do lote para 'received_confirmed'
 */
import { useEffect, useState } from 'react';
import { Inbox } from 'lucide-react';
import { toast } from 'sonner';
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
import { formatDate } from '@/lib/format';
import type { ConfirmacaoEntrega, LoteEntrega, Unidade, Usuario } from '@/types';

const STATUS_AGUARDANDO = ['pending', 'in_transit'];

export function RecepcaoPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.recepcao');
  const perfil = usePerfil();

  const [lotes, setLotes] = useState<LoteEntrega[]>([]);
  const [unidadesMap, setUnidadesMap] = useState<Map<string, Unidade>>(new Map());
  const [usuariosMap, setUsuariosMap] = useState<Map<string, Usuario>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [registrando, setRegistrando] = useState<LoteEntrega | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [ls, unis, usrs] = await Promise.all([
        crud<LoteEntrega>('lotes_entrega').list({ ordenarPor: 'criadoEm', ascendente: false }),
        crud<Unidade>('unidades').list({}),
        crud<Usuario>('usuarios').list({}),
      ]);
      setLotes(ls.filter((l) => STATUS_AGUARDANDO.includes(l.status)));
      setUnidadesMap(new Map(unis.map((u) => [u.id, u])));
      setUsuariosMap(new Map(usrs.map((u) => [u.id, u])));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.recepcao" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Recepcao de Entregas"
        subtitulo="Confirmacao do recebimento fisico (sem responsabilidade pelo conteudo)"
      />

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : lotes.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Nenhum lote aguardando recepcao.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Motorista</TableHead>
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
                  <TableCell className="text-sm">
                    {usuariosMap.get(l.motoristaUsuarioId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={l.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {podeEscrever && (
                      <Button size="sm" onClick={() => setRegistrando(l)}>
                        Registrar recebimento
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {registrando && perfil.usuario?.id && (
        <DialogConfirmar
          lote={registrando}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setRegistrando(null)}
          aoSalvar={async () => {
            setRegistrando(null);
            await recarregar();
          }}
        />
      )}
    </div>
  );
}

function DialogConfirmar({
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
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      // 1. Cria confirmacao
      await crud<ConfirmacaoEntrega>('confirmacoes_entrega').create({
        loteId: lote.id,
        tipo: 'reception_receipt',
        confirmadoPorUsuarioId: meuUsuarioId,
        observacoes: observacoes.trim() || null,
      });

      // 2. Atualiza status do lote
      await crud<LoteEntrega>('lotes_entrega').update(lote.id, {
        status: 'received_confirmed',
        recebidoEm: new Date().toISOString(),
      });

      toast.success('Recebimento registrado');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao registrar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar recebimento</DialogTitle>
          <DialogDescription>
            Lote {lote.numero ?? lote.id.slice(0, 8)} — voce confirma o recebimento fisico do lote
            (sem responsabilidade pelo conteudo)?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          <Label>Observacoes</Label>
          <Textarea
            rows={3}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Algo a relatar?"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Registrando...' : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
