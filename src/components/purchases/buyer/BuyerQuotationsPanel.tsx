import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import type { Quotation, QuotationItem } from '@/types/purchases';
import { quotationStatusBadgeClass, quotationStatusLabel } from './quotationStatus';

const PRIMARY = '#3F76FF';

interface BuyerQuotationsPanelProps {
  relaxedBuyerScope?: boolean;
}

export default function BuyerQuotationsPanel({ relaxedBuyerScope }: BuyerQuotationsPanelProps) {
  const { currentUser } = useApp();
  const {
    purchaseRequests,
    quotations,
    suppliers,
    currencies,
    createQuotation,
    updateQuotationStatus,
    isLoadingPurchases,
    refreshPurchases,
  } = usePurchases();

  const [createOpen, setCreateOpen] = useState(false);
  const [scId, setScId] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [moedaId, setMoedaId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [listQuery, setListQuery] = useState('');

  const assignableRequests = useMemo(() => {
    if (!currentUser) return [];
    return purchaseRequests.filter((r) => {
      if (!r.compradorId) return false;
      if (relaxedBuyerScope) return true;
      return r.compradorId === currentUser.id;
    });
  }, [purchaseRequests, currentUser, relaxedBuyerScope]);

  const assignableIds = useMemo(() => new Set(assignableRequests.map((r) => r.id)), [assignableRequests]);

  const myQuotations = useMemo(() => {
    return quotations
      .filter((q) => assignableIds.has(q.solicitacaoId))
      .sort(
        (a, b) =>
          new Date(b.updatedAt as unknown as string).getTime() -
          new Date(a.updatedAt as unknown as string).getTime()
      );
  }, [quotations, assignableIds]);

  const filteredQuotations = useMemo(() => {
    const q = listQuery.trim().toLowerCase();
    if (!q) return myQuotations;
    return myQuotations.filter((cot) => {
      const sup = suppliers.find((s) => s.id === cot.fornecedorId);
      const hay = [
        cot.id,
        cot.solicitacaoId,
        sup?.razaoSocial ?? '',
        quotationStatusLabel(cot.status),
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [myQuotations, listQuery, suppliers]);

  const scOptionsForCreate = useMemo(
    () => assignableRequests.filter((r) => r.status === 'in_quotation' || r.status === 'quotation_completed'),
    [assignableRequests]
  );

  const openCreate = () => {
    const first = scOptionsForCreate[0];
    setScId(first?.id ?? '');
    setFornecedorId(suppliers[0]?.id ?? '');
    setMoedaId(currencies.find((c) => c.codigo === 'BRL')?.id ?? currencies[0]?.id ?? '');
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    if (!scId || !fornecedorId || !moedaId) {
      toast.error('Preencha SC, fornecedor e moeda');
      return;
    }
    const pr = purchaseRequests.find((r) => r.id === scId);
    if (!pr) return;
    const itens: QuotationItem[] = (pr.itens || []).map((it) => ({
      id: crypto.randomUUID(),
      cotacaoId: '',
      itemSolicitacaoId: it.id,
      descricao: it.descricao,
      quantidade: it.quantidade,
      unidadeMedida: it.unidadeMedida,
    }));
    setSubmitting(true);
    try {
      const created = await createQuotation({
        solicitacaoId: scId,
        fornecedorId,
        moedaId,
        status: 'draft',
        itens,
      });
      if (created) {
        setCreateOpen(false);
        await refreshPurchases();
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando cotações…</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Cotações</h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Propostas ligadas às suas solicitações. Crie rascunhos a partir de SCs em cotação e acompanhe envio e
            resposta dos fornecedores.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button type="button" variant="outline" size="sm" onClick={() => refreshPurchases()}>
            Atualizar
          </Button>
          <Button
            type="button"
            size="sm"
            className="text-white hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
            onClick={openCreate}
            disabled={scOptionsForCreate.length === 0}
          >
            Nova cotação
          </Button>
        </div>
      </header>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <CardTitle className="text-base">Suas cotações</CardTitle>
              <CardDescription>
                {filteredQuotations.length} de {myQuotations.length} no escopo
                {listQuery.trim() ? ' (filtro ativo)' : ''}
                {scOptionsForCreate.length === 0 && myQuotations.length > 0 && (
                  <span className="block sm:inline">
                    <span className="hidden sm:inline"> · </span>
                    Nenhuma SC em cotação para abrir nova proposta agora.
                  </span>
                )}
              </CardDescription>
            </div>
            <Input
              className="sm:max-w-xs"
              placeholder="Filtrar por fornecedor, SC ou status…"
              value={listQuery}
              onChange={(e) => setListQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="hidden lg:table-cell">Ref.</TableHead>
                <TableHead>SC</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Atualizado</TableHead>
                <TableHead className="w-[160px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {myQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhuma cotação no seu escopo ainda.
                  </TableCell>
                </TableRow>
              ) : filteredQuotations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    Nenhum resultado para “{listQuery.trim()}”. Ajuste o filtro.
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotations.map((q) => {
                  const sup = suppliers.find((s) => s.id === q.fornecedorId);
                  const updated =
                    q.updatedAt instanceof Date
                      ? q.updatedAt
                      : new Date(q.updatedAt as unknown as string);
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="hidden lg:table-cell font-mono text-xs text-muted-foreground">
                        {q.id.slice(0, 8)}…
                      </TableCell>
                      <TableCell className="font-mono text-xs">{q.solicitacaoId.slice(0, 8)}…</TableCell>
                      <TableCell className="max-w-[200px] truncate">{sup?.razaoSocial ?? '—'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={quotationStatusBadgeClass(q.status)}>
                          {quotationStatusLabel(q.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {q.totalGeral != null
                          ? new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL',
                            }).format(q.totalGeral)
                          : '—'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(updated, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="space-x-1">
                        {q.status === 'draft' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                              updateQuotationStatus(q.id, 'sent', {
                                linkPreenchimento: q.linkPreenchimento ?? crypto.randomUUID(),
                              })
                            }
                          >
                            Enviar
                          </Button>
                        )}
                        {q.status === 'responded' && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => updateQuotationStatus(q.id, 'approved')}
                          >
                            Aprovar
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cotação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-2">
              <Label>Solicitação (SC)</Label>
              <Select value={scId} onValueChange={setScId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {scOptionsForCreate.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.id.slice(0, 8)}… — {r.justificativa.slice(0, 40)}
                      {r.justificativa.length > 40 ? '…' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={fornecedorId} onValueChange={setFornecedorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers
                    .filter((s) => s.status === 'active')
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.razaoSocial}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Moeda</Label>
              <Select value={moedaId} onValueChange={setMoedaId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={submitting}
              className="text-white"
              style={{ backgroundColor: PRIMARY }}
              onClick={handleCreate}
            >
              Criar rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
