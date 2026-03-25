import { useCallback, useEffect, useMemo, useState } from 'react';
import { endOfDay, format, subDays, startOfDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import type { PurchaseRequest, PurchaseRequestItem, PurchaseRequestStatus } from '@/types/purchases';
import type { UserRole } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  MessageCircle,
  MoreVertical,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIMARY = '#3F76FF';
const NEED_RED = '#DC2626';
const EMERGENCY_ROW = '#FEE2E2';

type BuyerScFilter = 'all' | 'pendente_comprar' | 'em_cotacao' | 'pedido_gerado' | 'cancelado';
type GroupBy = 'none' | 'unit' | 'priority';

interface AppliedFilters {
  buyerId: string | null;
  unitId: string | null;
  dateFrom: Date;
  dateTo: Date;
  status: BuyerScFilter;
  groupBy: GroupBy;
  costCenterQuery: string;
  requesterId: string | null;
  scNumberQuery: string;
  categoryId: string | null;
}

export interface BuyerRequestRow {
  key: string;
  request: PurchaseRequest;
  item: PurchaseRequestItem;
}

function scItemLabel(requestId: string, itemId: string): string {
  const a = requestId.replace(/-/g, '').slice(0, 6).toUpperCase();
  const b = itemId.replace(/-/g, '').slice(0, 4).toUpperCase();
  return `${a}/${b}`;
}

function hasPurchaseOrderForRequest(
  requestId: string,
  purchaseOrders: { cotacaoId: string }[],
  quotations: { id: string; solicitacaoId: string }[]
): boolean {
  const qids = new Set(quotations.filter((q) => q.solicitacaoId === requestId).map((q) => q.id));
  return purchaseOrders.some((o) => qids.has(o.cotacaoId));
}

function mapBuyerRowStatus(
  status: PurchaseRequestStatus,
  requestId: string,
  purchaseOrders: { cotacaoId: string }[],
  quotations: { id: string; solicitacaoId: string }[]
): { label: string; tone: 'blue' | 'yellow' | 'green' | 'gray' } {
  if (status === 'rejected_manager' || status === 'rejected_director') {
    return { label: 'Cancelado', tone: 'gray' };
  }
  if (hasPurchaseOrderForRequest(requestId, purchaseOrders, quotations)) {
    return { label: 'Pedido Gerado', tone: 'green' };
  }
  if (status === 'in_quotation') {
    return { label: 'Em Cotação', tone: 'yellow' };
  }
  if (status === 'quotation_completed') {
    return { label: 'Pendente', tone: 'blue' };
  }
  if (status === 'in_purchase' || status === 'completed') {
    return { label: 'Pedido Gerado', tone: 'green' };
  }
  return { label: 'Pendente', tone: 'blue' };
}

function matchesBuyerScFilter(
  filter: BuyerScFilter,
  status: PurchaseRequestStatus,
  requestId: string,
  purchaseOrders: { cotacaoId: string }[],
  quotations: { id: string; solicitacaoId: string }[]
): boolean {
  if (filter === 'all') return true;
  if (filter === 'cancelado') {
    return status === 'rejected_manager' || status === 'rejected_director';
  }
  const hasPo = hasPurchaseOrderForRequest(requestId, purchaseOrders, quotations);
  if (filter === 'pedido_gerado') {
    return hasPo || status === 'in_purchase' || status === 'completed';
  }
  if (filter === 'em_cotacao') {
    return status === 'in_quotation';
  }
  if (filter === 'pendente_comprar') {
    return status === 'quotation_completed' && !hasPo;
  }
  return true;
}

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
            onSelect={(d) => d && onChange(d)}
            locale={ptBR}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

function statusBadgeClass(tone: 'blue' | 'yellow' | 'green' | 'gray'): string {
  switch (tone) {
    case 'blue':
      return 'border-transparent text-white';
    case 'yellow':
      return 'bg-amber-100 text-amber-900 border-amber-300 dark:bg-amber-900/40 dark:text-amber-100';
    case 'green':
      return 'bg-emerald-600 text-white border-transparent';
    case 'gray':
    default:
      return 'bg-slate-200 text-slate-800 border-slate-300 dark:bg-slate-700 dark:text-slate-100';
  }
}

export interface BuyerPurchaseRequestsPanelProps {
  /** Dev “visualizar como comprador”: lista SCs com qualquer comprador atribuído. */
  simulatedBuyer?: boolean;
}

export default function BuyerPurchaseRequestsPanel({ simulatedBuyer }: BuyerPurchaseRequestsPanelProps = {}) {
  const { currentUser, users, units, getUserById, getUnitById, categories, items } = useApp();
  const { purchaseRequests, purchaseOrders, quotations, costCenters, isLoadingPurchases, refreshPurchases } =
    usePurchases();

  const today = startOfDay(new Date());
  const defaultFrom = subDays(today, 60);

  const [draft, setDraft] = useState({
    buyerId: null as string | null,
    unitId: null as string | null,
    dateFrom: defaultFrom,
    dateTo: today,
    status: 'all' as BuyerScFilter,
    groupBy: 'none' as GroupBy,
    costCenterQuery: '',
    requesterId: null as string | null,
    scNumberQuery: '',
    categoryId: null as string | null,
    quickSearch: '',
  });

  const [applied, setApplied] = useState<AppliedFilters>({
    buyerId: null,
    unitId: null,
    dateFrom: defaultFrom,
    dateTo: today,
    status: 'all',
    groupBy: 'none',
    costCenterQuery: '',
    requesterId: null,
    scNumberQuery: '',
    categoryId: null,
  });

  const [quickApplied, setQuickApplied] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentsTitle, setCommentsTitle] = useState('');

  const isAdminLike =
    currentUser?.role === 'admin' ||
    currentUser?.role === 'purchases_admin' ||
    currentUser?.role === 'developer';

  const isRealBuyer = currentUser?.role === 'buyer';
  const compactFilters = isRealBuyer && !simulatedBuyer;

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role === 'buyer') {
      setDraft((d) => ({ ...d, buyerId: currentUser.id }));
    }
  }, [currentUser]);

  const buyerRoleUsers = useMemo(
    () =>
      users.filter((u) => {
        const r = u.role as UserRole;
        return r === 'buyer' || r === 'purchases_admin';
      }),
    [users]
  );

  const applyBuscar = useCallback(() => {
    setApplied({
      buyerId: draft.buyerId,
      unitId: draft.unitId,
      dateFrom: draft.dateFrom,
      dateTo: draft.dateTo,
      status: draft.status,
      groupBy: draft.groupBy,
      costCenterQuery: draft.costCenterQuery.trim().toLowerCase(),
      requesterId: draft.requesterId,
      scNumberQuery: draft.scNumberQuery.trim().toLowerCase(),
      categoryId: draft.categoryId,
    });
    setQuickApplied(draft.quickSearch.trim().toLowerCase());
    setPage(1);
  }, [draft]);

  const baseRows = useMemo((): BuyerRequestRow[] => {
    const rows: BuyerRequestRow[] = [];
    for (const pr of purchaseRequests) {
      for (const item of pr.itens || []) {
        rows.push({ key: `${pr.id}:${item.id}`, request: pr, item });
      }
    }
    return rows;
  }, [purchaseRequests]);

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    return baseRows.filter(({ request: pr, item }) => {
      if (isRealBuyer || simulatedBuyer) {
        if (!pr.compradorId) return false;
        if (isRealBuyer && !simulatedBuyer && pr.compradorId !== currentUser.id) return false;
      } else if (isAdminLike) {
        if (applied.buyerId && pr.compradorId !== applied.buyerId) return false;
      } else {
        return false;
      }

      const created = pr.createdAt instanceof Date ? pr.createdAt : new Date(pr.createdAt as unknown as string);
      const from = startOfDay(applied.dateFrom);
      const to = endOfDay(applied.dateTo);
      if (created < from || created > to) return false;

      if (applied.unitId && pr.unidadeId !== applied.unitId) return false;

      if (!matchesBuyerScFilter(applied.status, pr.status, pr.id, purchaseOrders, quotations)) {
        return false;
      }

      if (applied.costCenterQuery) {
        const cc = costCenters.find((c) => c.id === pr.centroCustoId);
        const blob = `${cc?.codigo ?? ''} ${cc?.nome ?? ''}`.toLowerCase();
        if (!blob.includes(applied.costCenterQuery)) return false;
      }

      if (applied.requesterId && pr.solicitanteId !== applied.requesterId) return false;

      if (applied.scNumberQuery) {
        const label = scItemLabel(pr.id, item.id).toLowerCase();
        if (!label.includes(applied.scNumberQuery) && !pr.id.toLowerCase().includes(applied.scNumberQuery)) {
          return false;
        }
      }

      if (applied.categoryId) {
        const pid = item.productId;
        const cat = pid ? items.find((i) => i.id === pid)?.categoryId : undefined;
        if (cat !== applied.categoryId) return false;
      }

      if (quickApplied) {
        const sol = getUserById(pr.solicitanteId)?.name?.toLowerCase() ?? '';
        const desc = `${item.descricao} ${item.observacao ?? ''}`.toLowerCase();
        const code = (item.codigo ?? '').toLowerCase();
        if (
          !desc.includes(quickApplied) &&
          !sol.includes(quickApplied) &&
          !code.includes(quickApplied) &&
          !pr.id.toLowerCase().includes(quickApplied)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [
    baseRows,
    currentUser,
    isAdminLike,
    isRealBuyer,
    simulatedBuyer,
    applied,
    purchaseOrders,
    quotations,
    costCenters,
    items,
    getUserById,
    quickApplied,
  ]);

  const sortedRows = useMemo(() => {
    const copy = [...filtered];
    if (applied.groupBy === 'unit') {
      copy.sort((a, b) => a.request.unidadeId.localeCompare(b.request.unidadeId) || a.key.localeCompare(b.key));
    } else if (applied.groupBy === 'priority') {
      copy.sort((a, b) => {
        const pe = a.item.prioridade === 'emergencial' ? 0 : 1;
        const qe = b.item.prioridade === 'emergencial' ? 0 : 1;
        if (pe !== qe) return pe - qe;
        return a.key.localeCompare(b.key);
      });
    }
    return copy;
  }, [filtered, applied.groupBy]);

  const totalPages = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const pageSafe = Math.min(page, totalPages);
  const pageRows = sortedRows.slice((pageSafe - 1) * pageSize, pageSafe * pageSize);

  const toggleRow = (key: string, checked: boolean) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(key);
      else n.delete(key);
      return n;
    });
  };

  const openComments = (title: string) => {
    setCommentsTitle(title);
    setCommentsOpen(true);
  };

  const compradorSelectValue = simulatedBuyer
    ? '__preview__'
    : isAdminLike
      ? draft.buyerId ?? '__all__'
      : '__me__';

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando solicitações…</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Solicitações de compra</CardTitle>
            <CardDescription>
              {compactFilters
                ? 'Fila atribuída a você — refine por período, unidade e status.'
                : 'Fila por comprador — filtros para operação e suporte.'}
            </CardDescription>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => refreshPurchases()}>
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap gap-2 items-end">
            {!compactFilters && (
              <div className="space-y-1.5 min-w-[200px] flex-1">
                <span className="text-xs text-muted-foreground">Comprador</span>
                <div className="flex gap-1">
                  <Select
                    value={compradorSelectValue}
                    onValueChange={(v) => {
                      if (v === '__me__') {
                        setDraft((d) => ({ ...d, buyerId: currentUser?.id ?? null }));
                      } else if (v === '__all__') {
                        setDraft((d) => ({ ...d, buyerId: null }));
                      } else {
                        setDraft((d) => ({ ...d, buyerId: v }));
                      }
                    }}
                    disabled={!isAdminLike || simulatedBuyer}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Comprador" />
                    </SelectTrigger>
                    <SelectContent>
                      {simulatedBuyer && (
                        <SelectItem value="__preview__">Pré-visualização (todas as filas)</SelectItem>
                      )}
                      {!isAdminLike && currentUser && (
                        <SelectItem value="__me__">{getUserById(currentUser.id)?.name ?? 'Eu'}</SelectItem>
                      )}
                      {isAdminLike && !simulatedBuyer && <SelectItem value="__all__">Todos</SelectItem>}
                      {buyerRoleUsers.map((u) => (
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
            )}

            <div className="space-y-1.5 min-w-[180px] flex-1">
              <span className="text-xs text-muted-foreground">Local de entrega</span>
              <Select
                value={draft.unitId ?? '__all__'}
                onValueChange={(v) => setDraft((d) => ({ ...d, unitId: v === '__all__' ? null : v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Todas</SelectItem>
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

            <DatePickerField
              label="Emissão — de"
              value={draft.dateFrom}
              onChange={(d) => setDraft((prev) => ({ ...prev, dateFrom: startOfDay(d) }))}
            />
            <DatePickerField
              label="Emissão — até"
              value={draft.dateTo}
              onChange={(d) => setDraft((prev) => ({ ...prev, dateTo: startOfDay(d) }))}
            />

            <div className="space-y-1.5 min-w-[180px] flex-1">
              <span className="text-xs text-muted-foreground">Situação na fila</span>
              <Select
                value={draft.status}
                onValueChange={(v) => setDraft((d) => ({ ...d, status: v as BuyerScFilter }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="pendente_comprar">Aguardando compra</SelectItem>
                  <SelectItem value="em_cotacao">Em cotação</SelectItem>
                  <SelectItem value="pedido_gerado">Com pedido gerado</SelectItem>
                  <SelectItem value="cancelado">Canceladas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex min-w-[120px] justify-end pb-0.5">
              <Button
                type="button"
                className="text-white hover:opacity-90"
                style={{ backgroundColor: PRIMARY }}
                onClick={applyBuscar}
              >
                Aplicar filtros
              </Button>
            </div>
          </div>

          <Collapsible defaultOpen={!compactFilters} className="group/coll">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1.5 px-0 h-8 text-muted-foreground hover:text-foreground">
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-data-[state=open]/coll:rotate-180" />
                Mais filtros e agrupamento
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 pt-1">
              <div className="flex flex-wrap gap-2 items-end rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="space-y-1.5 min-w-[200px] flex-1">
                  <span className="text-xs text-muted-foreground">Agrupar linhas por</span>
                  <Select
                    value={draft.groupBy}
                    onValueChange={(v) => setDraft((d) => ({ ...d, groupBy: v as GroupBy }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem agrupamento</SelectItem>
                      <SelectItem value="unit">Unidade</SelectItem>
                      <SelectItem value="priority">Prioridade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-[160px] flex-1">
                  <span className="text-xs text-muted-foreground">Centro de custo</span>
                  <Input
                    placeholder="Código ou nome"
                    value={draft.costCenterQuery}
                    onChange={(e) => setDraft((d) => ({ ...d, costCenterQuery: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5 min-w-[200px] flex-1">
                  <span className="text-xs text-muted-foreground">Solicitante</span>
                  <Select
                    value={draft.requesterId ?? '__all__'}
                    onValueChange={(v) => setDraft((d) => ({ ...d, requesterId: v === '__all__' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 min-w-[140px] flex-1">
                  <span className="text-xs text-muted-foreground">Nº / trecho da SC</span>
                  <Input
                    placeholder="Buscar"
                    value={draft.scNumberQuery}
                    onChange={(e) => setDraft((d) => ({ ...d, scNumberQuery: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5 min-w-[200px] flex-1">
                  <span className="text-xs text-muted-foreground">Grupo de produto</span>
                  <Select
                    value={draft.categoryId ?? '__all__'}
                    onValueChange={(v) => setDraft((d) => ({ ...d, categoryId: v === '__all__' ? null : v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">Todos</SelectItem>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-border/60 pt-4">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Dica: use a busca rápida no grid atual e pressione Enter para aplicar junto com os filtros.
          </p>
          <Input
            className="sm:max-w-sm"
            placeholder="Busca rápida na lista (Enter para aplicar)"
            value={draft.quickSearch}
            onChange={(e) => setDraft((d) => ({ ...d, quickSearch: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') applyBuscar();
            }}
          />
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>SC/Item</TableHead>
                <TableHead>Produto/Serviço</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Classificação</TableHead>
                <TableHead>Qtde.</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead>Necessidade</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-muted-foreground py-10">
                    Nenhum registro com os filtros atuais.
                  </TableCell>
                </TableRow>
              ) : (
                pageRows.flatMap((row, idx) => {
                  const { key, request: pr, item } = row;
                  const unit = getUnitById(pr.unidadeId);
                  const filial = unit?.name ?? '—';
                  const sol = getUserById(pr.solicitanteId);
                  const cc = costCenters.find((c) => c.id === pr.centroCustoId);
                  const comprador = pr.compradorId ? getUserById(pr.compradorId) : undefined;
                  const st = mapBuyerRowStatus(pr.status, pr.id, purchaseOrders, quotations);
                  const created = pr.createdAt instanceof Date ? pr.createdAt : new Date(pr.createdAt as unknown as string);
                  const needRaw = item.dataNecessidade;
                  let needOverdue = false;
                  let needLabel = '—';
                  if (needRaw) {
                    try {
                      const nd = startOfDay(parseISO(needRaw));
                      needOverdue = nd < today;
                      needLabel = format(nd, 'dd/MM/yyyy', { locale: ptBR });
                    } catch {
                      needLabel = needRaw;
                    }
                  }
                  const catalog = item.productId ? items.find((i) => i.id === item.productId) : undefined;
                  const codigo =
                    item.codigo ??
                    (catalog?.productId != null ? String(catalog.productId) : undefined);
                  const emerg = item.prioridade === 'emergencial';

                  const globalIdx = (pageSafe - 1) * pageSize + idx;
                  const prevRow = globalIdx > 0 ? sortedRows[globalIdx - 1] : null;
                  const showUnitHeader =
                    applied.groupBy === 'unit' && (!prevRow || prevRow.request.unidadeId !== pr.unidadeId);

                  const dataRow = (
                    <TableRow
                      key={key}
                      className={cn(emerg && 'border-l-4 border-l-red-500')}
                      style={emerg ? { backgroundColor: EMERGENCY_ROW } : undefined}
                    >
                      <TableCell>
                        <Checkbox
                          checked={selected.has(key)}
                          onCheckedChange={(c) => toggleRow(key, c === true)}
                        />
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div className="text-muted-foreground text-xs">Filial: {filial}</div>
                        <div className="font-medium tabular-nums">{scItemLabel(pr.id, item.id)}</div>
                      </TableCell>
                      <TableCell className="align-top max-w-[240px]">
                        <div className="font-semibold text-sm">{catalog?.name ?? item.descricao}</div>
                        {codigo ? (
                          <button
                            type="button"
                            className="text-sm text-[#3F76FF] hover:underline"
                            onClick={() => toast.message(`Código: ${codigo}`)}
                          >
                            ({codigo})
                          </button>
                        ) : null}
                        {(item.observacao || catalog?.description) && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.observacao || catalog?.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">
                        <div>{sol?.name ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{filial}</div>
                      </TableCell>
                      <TableCell className="align-top text-xs font-mono">
                        <div>Conta:{item.contaContabil ?? '—'}</div>
                        <div>C.Cus::{cc?.codigo ?? '—'}</div>
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap">
                        {item.quantidade} {item.unidadeMedida}
                      </TableCell>
                      <TableCell className="align-top whitespace-nowrap text-sm">
                        {format(created, 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell
                        className="align-top whitespace-nowrap text-sm"
                        style={needOverdue ? { color: NEED_RED } : undefined}
                      >
                        {needLabel}
                      </TableCell>
                      <TableCell className="align-top">
                        {emerg ? (
                          <Badge variant="destructive">Emergencial</Badge>
                        ) : (
                          <span className="text-sm">Normal</span>
                        )}
                      </TableCell>
                      <TableCell className="align-top text-sm">{comprador?.name ?? '—'}</TableCell>
                      <TableCell className="align-top">
                        <Badge
                          variant="outline"
                          className={cn(statusBadgeClass(st.tone), st.tone === 'blue' && 'bg-[#3F76FF]')}
                        >
                          {st.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openComments(scItemLabel(pr.id, item.id))}
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
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.message('Detalhes: em desenvolvimento', { description: pr.id })
                                }
                              >
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  toast.message('Abrir cotação vinculada à SC', { description: pr.id })
                                }
                              >
                                Ir para Cotação
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => toast.error('Cancelar SC: use o fluxo de aprovação ou suporte.')}
                              >
                                Cancelar SC
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  );

                  if (!showUnitHeader) return [dataRow];
                  return [
                    <TableRow key={`${key}-unit-h`} className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={12} className="font-medium text-xs py-2">
                        Unidade: {filial}
                      </TableCell>
                    </TableRow>,
                    dataRow,
                  ];
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <span>Total de registros: {sortedRows.length}</span>
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

      <Dialog open={commentsOpen} onOpenChange={setCommentsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Comentários — {commentsTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Histórico de comentários e trilha de auditoria podem ser integrados ao `purchase_audit_logs` neste fluxo.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
