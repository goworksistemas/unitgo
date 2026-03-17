import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PurchaseRequestStatusBadge } from '../shared/PurchaseRequestStatusBadge';
import { ApprovalTimeline } from '../shared/ApprovalTimeline';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FileText, Plus, ChevronDown, ChevronUp, Database, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import type { PurchaseRequest } from '@/types/purchases';

interface ApprovedPurchaseRequestsPanelProps {
  onNavigateToCreateQuotation?: (solicitacaoId: string) => void;
}

function RequestCard({
  req,
  getUserById,
  getUnitById,
  expandedId,
  setExpandedId,
  onNavigateToCreateQuotation,
  onAtribuir,
  isAtribuindo,
  showAtribuirButton,
  showAtribuidoEm,
}: {
  req: PurchaseRequest;
  getUserById: (id: string) => { name: string } | undefined;
  getUnitById: (id: string) => { name: string } | undefined;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onNavigateToCreateQuotation?: (id: string) => void;
  onAtribuir?: (id: string) => void;
  isAtribuindo: string | null;
  showAtribuirButton: boolean;
  showAtribuidoEm: boolean;
}) {
  const solicitante = getUserById(req.solicitanteId);
  const unidade = getUnitById(req.unidadeId);
  const isExpanded = expandedId === req.id;

  return (
    <div key={req.id} className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium">#{req.id.slice(0, 8)}</span>
            <PurchaseRequestStatusBadge status={req.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {solicitante?.name ?? '—'} • {unidade?.name ?? '—'} •{' '}
            {format(new Date(req.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            {showAtribuidoEm && req.atribuidoEm && (
              <span className="ml-2 text-primary">
                • Atribuído em {format(new Date(req.atribuidoEm), 'dd/MM/yyyy', { locale: ptBR })}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showAtribuirButton && (
            <Button
              size="sm"
              variant="default"
              onClick={() => onAtribuir?.(req.id)}
              disabled={isAtribuindo === req.id}
            >
              <UserPlus className="h-4 w-4 mr-1" />
              {isAtribuindo === req.id ? 'Atribuindo...' : 'Pegar para mim'}
            </Button>
          )}
          {req.status === 'in_quotation' && onNavigateToCreateQuotation && !showAtribuirButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onNavigateToCreateQuotation(req.id)}
            >
              <Plus className="h-4 w-4 mr-1" /> Criar Cotação
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setExpandedId(isExpanded ? null : req.id)}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-3 pt-2 border-t">
          <p className="text-sm">
            <span className="font-medium">Justificativa:</span> {req.justificativa}
          </p>
          <div>
            <p className="text-sm font-medium mb-2">Itens ({req.itens.length}):</p>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Descrição</th>
                    <th className="text-center p-2 font-medium w-20">Qtd</th>
                    <th className="text-center p-2 font-medium w-16">Und</th>
                    <th className="text-left p-2 font-medium">Obs</th>
                  </tr>
                </thead>
                <tbody>
                  {req.itens.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-2">{item.descricao}</td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-center">{item.unidadeMedida}</td>
                      <td className="p-2 text-muted-foreground">{item.observacao || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {req.aprovacoes.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Aprovações:</p>
              <ApprovalTimeline aprovacoes={req.aprovacoes} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApprovedPurchaseRequestsPanel({
  onNavigateToCreateQuotation,
}: ApprovedPurchaseRequestsPanelProps = {}) {
  const { getUserById, getUnitById, units, currentUser } = useApp();
  const {
    purchaseRequests,
    semAtribuicao,
    atribuirComprador,
    isLoadingPurchases,
    refreshPurchases,
  } = usePurchases();
  const [isSeeding, setIsSeeding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isAtribuindo, setIsAtribuindo] = useState<string | null>(null);

  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState<string>('all');
  const [filtroDataDe, setFiltroDataDe] = useState('');
  const [filtroDataAte, setFiltroDataAte] = useState('');

  const approvedRequests = useMemo(
    () =>
      purchaseRequests
        .filter(
          (r) =>
            r.status === 'in_quotation' ||
            r.status === 'quotation_completed' ||
            r.status === 'in_purchase'
        )
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [purchaseRequests]
  );

  const filaRequests = useMemo(
    () => approvedRequests.filter((r) => !r.compradorId),
    [approvedRequests]
  );

  const meusRequests = useMemo(
    () => approvedRequests.filter((r) => r.compradorId === currentUser?.id),
    [approvedRequests, currentUser?.id]
  );

  const handleAtribuir = async (requestId: string) => {
    setIsAtribuindo(requestId);
    try {
      await atribuirComprador(requestId);
      toast.success('Solicitação atribuída a você');
    } catch {
      toast.error('Erro ao atribuir solicitação');
    } finally {
      setIsAtribuindo(null);
    }
  };

  const handleSeedPurchases = async () => {
    setIsSeeding(true);
    try {
      await api.purchases.seed();
      toast.success('Dados de compras populados com sucesso');
      await refreshPurchases();
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : (e as { details?: { error?: string } })?.details?.error ?? 'Erro ao popular dados';
      toast.error(msg);
    } finally {
      setIsSeeding(false);
    }
  };

  const unidadesOptions = useMemo(() => {
    const ids = new Set(approvedRequests.map((r) => r.unidadeId));
    return units.filter((u) => ids.has(u.id));
  }, [units, approvedRequests]);

  const filaFiltrada = useMemo(() => {
    return filaRequests.filter((req) => {
      if (filtroBusca.trim()) {
        const busca = filtroBusca.toLowerCase();
        const matchItem = req.itens.some((i) =>
          i.descricao.toLowerCase().includes(busca)
        );
        const matchJust = req.justificativa.toLowerCase().includes(busca);
        if (!matchItem && !matchJust) return false;
      }
      if (filtroUnidade && filtroUnidade !== 'all' && req.unidadeId !== filtroUnidade) {
        return false;
      }
      if (filtroDataDe) {
        const dataDe = new Date(filtroDataDe);
        if (new Date(req.createdAt) < dataDe) return false;
      }
      if (filtroDataAte) {
        const dataAte = new Date(filtroDataAte);
        dataAte.setHours(23, 59, 59, 999);
        if (new Date(req.createdAt) > dataAte) return false;
      }
      return true;
    });
  }, [filaRequests, filtroBusca, filtroUnidade, filtroDataDe, filtroDataAte]);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Carregando...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Solicitações Aprovadas
            </CardTitle>
            <CardDescription>
              {approvedRequests.length} solicitação(ões) aprovadas aguardando cotação/pedido
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {approvedRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma solicitação aprovada no momento</p>
            <p className="text-xs text-muted-foreground mt-1">
              As solicitações aparecerão aqui após aprovação da diretoria
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={handleSeedPurchases}
              disabled={isSeeding}
            >
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? 'Populando...' : 'Popular dados de demonstração'}
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="fila" className="space-y-4">
            <TabsList>
              <TabsTrigger value="fila">
                Fila
                {semAtribuicao > 0 && (
                  <Badge variant="secondary" className="ml-1.5">
                    {semAtribuicao}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="meus">Meus pedidos</TabsTrigger>
            </TabsList>

            <TabsContent value="fila" className="space-y-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-xs text-muted-foreground block mb-1">Busca (descrição)</label>
                  <Input
                    placeholder="Buscar por descrição do item..."
                    value={filtroBusca}
                    onChange={(e) => setFiltroBusca(e.target.value)}
                  />
                </div>
                <div className="w-[180px]">
                  <label className="text-xs text-muted-foreground block mb-1">Unidade</label>
                  <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      {unidadesOptions.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[140px]">
                  <label className="text-xs text-muted-foreground block mb-1">Data de</label>
                  <Input
                    type="date"
                    value={filtroDataDe}
                    onChange={(e) => setFiltroDataDe(e.target.value)}
                  />
                </div>
                <div className="w-[140px]">
                  <label className="text-xs text-muted-foreground block mb-1">Data até</label>
                  <Input
                    type="date"
                    value={filtroDataAte}
                    onChange={(e) => setFiltroDataAte(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filaFiltrada.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Nenhuma solicitação na fila
                    {filaRequests.length > 0 ? ' com os filtros aplicados' : ''}
                  </p>
                ) : (
                  filaFiltrada.map((req) => (
                    <RequestCard
                      key={req.id}
                      req={req}
                      getUserById={getUserById}
                      getUnitById={getUnitById}
                      expandedId={expandedId}
                      setExpandedId={setExpandedId}
                      onAtribuir={handleAtribuir}
                      isAtribuindo={isAtribuindo}
                      showAtribuirButton
                      showAtribuidoEm={false}
                    />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="meus" className="space-y-3">
              {meusRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Nenhum pedido atribuído a você
                </p>
              ) : (
                meusRequests.map((req) => (
                  <RequestCard
                    key={req.id}
                    req={req}
                    getUserById={getUserById}
                    getUnitById={getUnitById}
                    expandedId={expandedId}
                    setExpandedId={setExpandedId}
                    onNavigateToCreateQuotation={onNavigateToCreateQuotation}
                    isAtribuindo={null}
                    showAtribuirButton={false}
                    showAtribuidoEm
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
