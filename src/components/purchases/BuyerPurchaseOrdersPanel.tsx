import { Fragment, useCallback, useMemo, useState } from 'react';
import { endOfDay, format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import type { PurchaseOrder, PurchaseOrderStatus } from '@/types/purchases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  CalendarIcon,
  ChevronDown,
  Filter,
  Mail,
  MessageCircle,
  MoreVertical,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIMARY = '#3F76FF';

const fmt = (n: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date) => void;
}) {
  return (
    <div className="space-y-1.5 min-w-[140px]">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-start font-normal text-left h-9">
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0 opacity-70" />
            {format(value, 'dd/MM/yyyy', { locale: ptBR })}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => d && onChange(startOfDay(d))}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function deliveryBadge(status: PurchaseOrderStatus): { label: string; className: string } {
  switch (status) {
    case 'fully_received':
      return { label: 'Entregue', className: 'bg-emerald-600 text-white border-transparent' };
    case 'partially_received':
      return { label: 'Parcial', className: 'bg-amber-100 text-amber-900 border-amber-300' };
    default:
      return { label: 'Pendente', className: 'bg-slate-200 text-slate-800 border-slate-300' };
  }
}

function approvalBadge(sa: PurchaseOrder['statusAprovacao']): { label: string; className: string } {
  switch (sa) {
    case 'aprovado':
      return { label: 'Liberado', className: 'bg-emerald-600 text-white border-transparent' };
    case 'reprovado':
      return { label: 'Rejeitado', className: 'bg-red-600 text-white border-transparent' };
    case 'em_revisao':
      return { label: 'Em Aprovação', className: 'text-white border-transparent' };
    case 'pendente':
    default:
      return { label: 'Em Aprovação', className: 'text-white border-transparent' };
  }
}

export interface BuyerPurchaseOrdersPanelProps {
  onOpenOrderForm: (orderId: string | null) => void;
  simulatedBuyer?: boolean;
}

export default function BuyerPurchaseOrdersPanel({
  onOpenOrderForm,
  simulatedBuyer,
}: BuyerPurchaseOrdersPanelProps) {
  const { currentUser, users, units, getUserById } = useApp();
  const {
    purchaseOrders,
    quotations,
    suppliers,
    currencies,
    receivings,
    isLoadingPurchases,
    refreshPurchases,
  } = usePurchases();

  const today = startOfDay(new Date());
  const defaultFrom = startOfDay(new Date(today.getFullYear(), today.getMonth(), 1));

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [draft, setDraft] = useState({
    buyerId: null as string | null,
    dateFrom: defaultFrom,
    dateTo: today,
    delivery: 'all' as 'all' | 'pending' | 'done',
    approval: 'all' as 'all' | 'pending' | 'released' | 'rejected',
    numeroPedido: '',
    numeroCotacao: '',
    numeroSc: '',
    supplierId: null as string | null,
    unitId: null as string | null,
  });

  const [applied, setApplied] = useState({ ...draft });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const isAdminLike =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'purchases_admin' ||
    currentUser?.role === 'developer';

  const isRealBuyer = currentUser?.role === 'buyer';

  const buyerUsers = useMemo(
    () => users.filter((u) => u.role === 'buyer' || u.role === 'purchases_admin'),
    [users]
  );

  const applyFilters = useCallback(() => {
    setApplied({ ...draft });
    setPage(1);
  }, [draft]);

  const filteredOrders = useMemo(() => {
    if (!currentUser) return [];
    return purchaseOrders.filter((o) => {
      if (isRealBuyer || simulatedBuyer) {
        if (!o.compradorId) return false;
        if (isRealBuyer && !simulatedBuyer && o.compradorId !== currentUser.id) return false;
      } else if (isAdminLike) {
        if (applied.buyerId && o.compradorId !== applied.buyerId) return false;
      } else {
        return false;
      }

      const created = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as unknown as string);
      if (created < startOfDay(applied.dateFrom) || created > endOfDay(applied.dateTo)) return false;

      if (applied.delivery === 'pending') {
        if (o.status === 'fully_received') return false;
      }
      if (applied.delivery === 'done') {
        if (o.status !== 'fully_received') return false;
      }

      if (applied.approval === 'pending') {
        const sa = o.statusAprovacao ?? 'pendente';
        if (sa === 'aprovado' || sa === 'reprovado') return false;
      }
      if (applied.approval === 'released' && o.statusAprovacao !== 'aprovado') return false;
      if (applied.approval === 'rejected' && o.statusAprovacao !== 'reprovado') return false;

      if (applied.numeroPedido.trim()) {
        const q = applied.numeroPedido.trim().toLowerCase();
        if (!(o.numeroOmie ?? '').toLowerCase().includes(q) && !o.id.toLowerCase().includes(q)) {
          return false;
        }
      }

      if (applied.numeroCotacao.trim()) {
        const q = applied.numeroCotacao.trim().toLowerCase();
        if (!o.cotacaoId.toLowerCase().includes(q)) return false;
      }

      if (applied.numeroSc.trim()) {
        const q = quotations.find((c) => c.id === o.cotacaoId);
        if (!q || !q.solicitacaoId.toLowerCase().includes(applied.numeroSc.trim().toLowerCase())) {
          return false;
        }
      }

      if (applied.supplierId) {
        const q = quotations.find((c) => c.id === o.cotacaoId);
        if (!q || q.fornecedorId !== applied.supplierId) return false;
      }

      return true;
    });
  }, [purchaseOrders, currentUser, isAdminLike, isRealBuyer, simulatedBuyer, applied, quotations]);

  /** Filtro local de entrega: aproximação via receivings.local_entrega contendo nome da unidade */
  const filteredWithUnit = useMemo(() => {
    if (!applied.unitId) return filteredOrders;
    const un = units.find((u) => u.id === applied.unitId);
    if (!un) return filteredOrders;
    return filteredOrders.filter((o) => {
      const rec = receivings.filter((r) => r.pedidoId === o.id);
      if (rec.length === 0) return true;
      return rec.some((r) => (r.localEntrega ?? '').toLowerCase().includes(un.name.toLowerCase()));
    });
  }, [filteredOrders, applied.unitId, receivings, units]);

  const sorted = useMemo(
    () =>
      [...filteredWithUnit].sort(
        (a, b) =>
          new Date(b.createdAt as unknown as string).getTime() -
          new Date(a.createdAt as unknown as string).getTime()
      ),
    [filteredWithUnit]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = sorted.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const saldoForOrder = useCallback(
    (o: PurchaseOrder) => {
      const rec = receivings.filter((r) => r.pedidoId === o.id);
      if (rec.length === 0) return '—';
      const exp = rec.reduce((a, r) => a + r.quantidadeEsperada, 0);
      const got = rec.reduce((a, r) => a + r.quantidadeRecebida, 0);
      const pend = Math.max(0, exp - got);
      return pend > 0 ? `${pend} (pend.)` : '0';
    },
    [receivings]
  );

  const priorityForOrder = useCallback((o: PurchaseOrder): 'Emergencial' | 'Normal' => {
    try {
      const p = JSON.parse(o.observacoes ?? '{}') as { lines?: { prioridade?: string }[] };
      if (p?.lines?.some((l) => l.prioridade === 'emergencial')) return 'Emergencial';
    } catch {
      /* ignore */
    }
    return 'Normal';
  }, []);

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando pedidos…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Pedidos de compra</CardTitle>
            <CardDescription>
              PCs do seu escopo — use os filtros para achar por período, entrega ou aprovação. Filtros extras ficam
              no painel recolhível.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-1 justify-end">
            <Button type="button" variant="outline" size="icon" onClick={() => refreshPurchases()} title="Atualizar">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setAdvancedOpen((v) => !v)}
              title="Filtro avançado"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              className="text-white hover:opacity-90"
              style={{ backgroundColor: PRIMARY }}
              size="sm"
              onClick={() => onOpenOrderForm(null)}
            >
              + Pedido
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="outline" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    const blob = new Blob([JSON.stringify(sorted.slice(0, 200), null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'pedidos-comprador.json';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast.success('Exportação iniciada');
                  }}
                >
                  Exportar JSON (amostra)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>Outras ações</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1.5 min-w-[200px] flex-1">
            <span className="text-xs text-muted-foreground">Comprador</span>
            <div className="flex gap-1">
              <Select
                value={
                  simulatedBuyer ? '__preview__' : isAdminLike ? draft.buyerId ?? '__all__' : '__me__'
                }
                onValueChange={(v) => {
                  if (v === '__me__') setDraft((d) => ({ ...d, buyerId: currentUser?.id ?? null }));
                  else if (v === '__all__') setDraft((d) => ({ ...d, buyerId: null }));
                  else setDraft((d) => ({ ...d, buyerId: v }));
                }}
                disabled={!isAdminLike || simulatedBuyer}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {simulatedBuyer && (
                    <SelectItem value="__preview__">Pré-visualização (todos os compradores)</SelectItem>
                  )}
                  {!isAdminLike && currentUser && (
                    <SelectItem value="__me__">{getUserById(currentUser.id)?.name ?? 'Eu'}</SelectItem>
                  )}
                  {isAdminLike && !simulatedBuyer && <SelectItem value="__all__">Todos</SelectItem>}
                  {buyerUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isAdminLike && draft.buyerId && !simulatedBuyer && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setDraft((d) => ({ ...d, buyerId: null }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <DatePickerField
            label="Emissão Início"
            value={draft.dateFrom}
            onChange={(d) => setDraft((prev) => ({ ...prev, dateFrom: d }))}
          />
          <DatePickerField
            label="Emissão Final"
            value={draft.dateTo}
            onChange={(d) => setDraft((prev) => ({ ...prev, dateTo: d }))}
          />
          <div className="space-y-1.5 min-w-[180px]">
            <span className="text-xs text-muted-foreground">Status Entrega</span>
            <Select
              value={draft.delivery}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, delivery: v as typeof draft.delivery }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Somente Pendentes</SelectItem>
                <SelectItem value="done">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 min-w-[180px]">
            <span className="text-xs text-muted-foreground">Status Aprovação</span>
            <Select
              value={draft.approval}
              onValueChange={(v) =>
                setDraft((d) => ({ ...d, approval: v as typeof draft.approval }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Em Aprovação</SelectItem>
                <SelectItem value="released">Liberado</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            className="text-white hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
            onClick={applyFilters}
          >
            Buscar
          </Button>
        </div>

        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 px-0 text-muted-foreground">
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', advancedOpen && 'rotate-180')}
              />
              Filtros avançados
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3">
            <div className="flex flex-wrap gap-2 items-end border rounded-md p-3 bg-muted/30">
              <div className="space-y-1.5 min-w-[140px] flex-1">
                <span className="text-xs text-muted-foreground">Nº Pedido</span>
                <Input
                  value={draft.numeroPedido}
                  onChange={(e) => setDraft((d) => ({ ...d, numeroPedido: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 min-w-[140px] flex-1">
                <span className="text-xs text-muted-foreground">Nº Cotação</span>
                <Input
                  value={draft.numeroCotacao}
                  onChange={(e) => setDraft((d) => ({ ...d, numeroCotacao: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 min-w-[140px] flex-1">
                <span className="text-xs text-muted-foreground">Nº SC</span>
                <Input
                  value={draft.numeroSc}
                  onChange={(e) => setDraft((d) => ({ ...d, numeroSc: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <span className="text-xs text-muted-foreground">Fornecedor</span>
                <Select
                  value={draft.supplierId ?? '__all__'}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, supplierId: v === '__all__' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <span className="text-xs text-muted-foreground">Local de Entrega</span>
                <Select
                  value={draft.unitId ?? '__all__'}
                  onValueChange={(v) =>
                    setDraft((d) => ({ ...d, unitId: v === '__all__' ? null : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">Todos</SelectItem>
                    {units
                      .filter((u) => u.status === 'active')
                      .map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Pedido</TableHead>
                <TableHead>Tp</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Saldo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Prev. Entrega</TableHead>
                <TableHead>Aprovação</TableHead>
                <TableHead>Envio Forn.</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="w-[90px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={15} className="text-center text-muted-foreground py-10">
                    Nenhum pedido encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.map((o) => {
                  const q = quotations.find((c) => c.id === o.cotacaoId);
                  const sup = q ? suppliers.find((s) => s.id === q.fornecedorId) : undefined;
                  const moeda = q ? currencies.find((c) => c.id === q.moedaId) : undefined;
                  const comprador = o.compradorId ? getUserById(o.compradorId) : undefined;
                  const created =
                    o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt as unknown as string);
                  const prevEnt = q?.dataPrevisaoEntrega
                    ? format(parseMaybeDate(q.dataPrevisaoEntrega), 'dd/MM/yyyy', { locale: ptBR })
                    : '—';
                  const ab = approvalBadge(o.statusAprovacao);
                  const db = deliveryBadge(o.status);
                  const pri = priorityForOrder(o);
                  const isOpen = expandedId === o.id;

                  return (
                    <Fragment key={o.id}>
                      <TableRow className={cn(isOpen && 'bg-muted/40')}>
                        <TableCell className="p-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setExpandedId(isOpen ? null : o.id)}
                          >
                            <ChevronDown
                              className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')}
                            />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <button
                            type="button"
                            className="text-left font-medium text-[#3F76FF] hover:underline"
                            onClick={() => onOpenOrderForm(o.id)}
                          >
                            {o.numeroOmie ?? o.id.slice(0, 8)}
                          </button>
                          <div className="text-xs text-muted-foreground">
                            {o.numeroOmie ? `Omie / ERP: ${o.numeroOmie}` : 'Sem integração ERP (nº interno acima)'}
                          </div>
                        </TableCell>
                        <TableCell>PC</TableCell>
                        <TableCell className="max-w-[200px]">
                          <div className="font-semibold truncate">{sup?.razaoSocial ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">{sup?.cnpj ?? ''}</div>
                          {q && (
                            <button
                              type="button"
                              className="text-xs text-[#3F76FF] hover:underline"
                              onClick={() => toast.message(`Cotação ${q.id.slice(0, 8)}`)}
                            >
                              Cotação:{q.id.slice(0, 8).toUpperCase()}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>{comprador?.name ?? '—'}</TableCell>
                        <TableCell>{moeda?.codigo ?? '—'}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(o.valorTotal)}</TableCell>
                        <TableCell>{saldoForOrder(o)}</TableCell>
                        <TableCell>
                          {pri === 'Emergencial' ? (
                            <Badge variant="destructive">Emergencial</Badge>
                          ) : (
                            <span className="text-sm">Normal</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(created, 'dd/MM/yyyy', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm">{prevEnt}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              ab.className,
                              (o.statusAprovacao === 'pendente' || !o.statusAprovacao || o.statusAprovacao === 'em_revisao') &&
                                'bg-[#3F76FF]'
                            )}
                          >
                            {ab.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                            <X className="h-4 w-4" />
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={db.className}>
                            {db.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => toast.message('Comentários do pedido')}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onOpenOrderForm(o.id)}>
                                  Ver Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onOpenOrderForm(o.id)}>
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => toast.error('Cancelar pedido: acione o fluxo formal de compras.')}
                                >
                                  Cancelar Pedido
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                      {isOpen && (
                        <TableRow className="bg-muted/20 hover:bg-muted/20">
                          <TableCell colSpan={15} className="text-xs text-muted-foreground py-2">
                            Cotação: {q?.id ?? '—'} · Itens na cotação: {q?.itens?.length ?? 0}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span>Total de registros: {sorted.length}</span>
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.max(1, p - 1));
                    }}
                    className={pageSafe <= 1 ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 py-1.5">
                    {pageSafe} / {totalPages}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage((p) => Math.min(totalPages, p + 1));
                    }}
                    className={pageSafe >= totalPages ? 'pointer-events-none opacity-50' : undefined}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function parseMaybeDate(v: string): Date {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date() : d;
}
