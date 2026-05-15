/**
 * RecepcaoPage — recepcionista registra recebimento fisico do lote.
 *
 * Fluxo:
 *  1. Lista lotes com status 'in_transit' ou 'pending' via RPC paginada.
 *  2. Recepcionista clica em "Registrar recebimento"
 *  3. Cria linha em confirmacoes_entrega com tipo='reception_receipt'
 *  4. Atualiza status do lote para 'received_confirmed'
 */
import { useMemo, useState } from 'react';
import { Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { DataTable, type ColunaDataTable } from '@/components/crud/DataTable';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatDate } from '@/lib/format';
import type { ConfirmacaoEntrega, LoteEntrega } from '@/types';

interface LoteListado extends LoteEntrega {
  unidadeDestinoNome: string;
  motoristaNome: string;
  totalSolicitacoes: number;
}

export function RecepcaoPage() {
  const { podeLer, podeEscrever } = usePermissao('entregas.recepcao');
  const perfil = usePerfil();

  const [filtroStatus, setFiltroStatus] = useState<'in_transit' | 'pending'>('in_transit');
  const [registrando, setRegistrando] = useState<LoteListado | null>(null);

  const filtros = useMemo(() => ({ pStatus: filtroStatus }), [filtroStatus]);
  const lista = useListaPaginada<LoteListado>({
    rpc: 'fn_listar_lotes_entrega',
    filtros,
  });

  if (!podeLer) return <SemAcesso rotaCodigo="entregas.recepcao" />;

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
      chave: 'motoristaNome',
      titulo: 'Motorista',
      render: (l) => <span className="text-sm">{l.motoristaNome}</span>,
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
          <Button size="sm" onClick={() => setRegistrando(l)}>
            Registrar recebimento
          </Button>
        ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <PageHeader
        titulo="Recepcao de Entregas"
        subtitulo="Confirmacao do recebimento fisico (sem responsabilidade pelo conteudo)"
      />

      <div className="flex flex-wrap gap-3">
        <Select
          value={filtroStatus}
          onValueChange={(v) => setFiltroStatus(v as 'in_transit' | 'pending')}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="in_transit">Em transito</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable<LoteListado>
        itens={lista.itens}
        colunas={colunas}
        isLoading={lista.isLoading}
        mensagemVazia="Nenhum lote aguardando recepcao."
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por numero ou motorista...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      {lista.itens.length === 0 && !lista.isLoading && (
        <div className="text-muted-foreground rounded-md border border-dashed p-12 text-center">
          <Inbox className="mx-auto mb-2 h-10 w-10 opacity-40" />
          Nenhum lote aguardando recepcao.
        </div>
      )}

      {registrando && perfil.usuario?.id && (
        <DialogConfirmar
          lote={registrando}
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setRegistrando(null)}
          aoSalvar={async () => {
            setRegistrando(null);
            await lista.recarregar();
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
  lote: LoteListado;
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    setSalvando(true);
    try {
      await crud<ConfirmacaoEntrega>('confirmacoes_entrega').create({
        loteId: lote.id,
        tipo: 'reception_receipt',
        confirmadoPorUsuarioId: meuUsuarioId,
        observacoes: observacoes.trim() || null,
      });

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
