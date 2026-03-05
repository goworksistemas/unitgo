import { useMemo, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Send, Eye, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { QuotationStatus } from '@/types/purchases';

const STATUS_LABELS: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-700 border-gray-300' },
  sent: { label: 'Enviada', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  responded: { label: 'Respondida', className: 'bg-green-50 text-green-700 border-green-300' },
  approved: { label: 'Aprovada', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Rejeitada', className: 'bg-red-50 text-red-700 border-red-300' },
};

export function QuotationManagementPanel() {
  const { getUserById } = useApp();
  const {
    quotations, suppliers, currencies, purchaseRequests,
    createQuotation, isLoadingPurchases,
  } = usePurchases();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [form, setForm] = useState({
    solicitacaoId: '',
    fornecedorId: '',
    moedaId: '',
    formaPagamento: '',
    condicoesPagamento: '',
    prazoEntrega: 0,
    observacoes: '',
  });

  const approvedRequests = useMemo(
    () => purchaseRequests.filter((r) => r.status === 'in_quotation'),
    [purchaseRequests]
  );

  const sortedQuotations = useMemo(
    () => [...quotations].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [quotations]
  );

  const getSupplierName = (id: string) => suppliers.find((s) => s.id === id)?.razaoSocial ?? '—';
  const getRequestCode = (id: string) => purchaseRequests.find((r) => r.id === id)?.id.slice(0, 8) ?? '—';

  const handleCreate = async () => {
    if (!form.solicitacaoId || !form.fornecedorId) {
      toast.error('Selecione a solicitação e o fornecedor');
      return;
    }
    const request = purchaseRequests.find((r) => r.id === form.solicitacaoId);
    if (!request) return;

    const itens = request.itens.map((i) => ({
      id: crypto.randomUUID(),
      cotacaoId: '',
      itemSolicitacaoId: i.id,
      descricao: i.descricao,
      quantidade: i.quantidade,
      unidadeMedida: i.unidadeMedida,
    }));

    await createQuotation({
      solicitacaoId: form.solicitacaoId,
      fornecedorId: form.fornecedorId,
      moedaId: form.moedaId || currencies[0]?.id || '',
      formaPagamento: form.formaPagamento,
      condicoesPagamento: form.condicoesPagamento,
      prazoEntrega: form.prazoEntrega,
      observacoes: form.observacoes,
      status: 'draft',
      itens,
      linkPreenchimento: crypto.randomUUID(),
    });

    setCreateDialogOpen(false);
    setForm({ solicitacaoId: '', fornecedorId: '', moedaId: '', formaPagamento: '', condicoesPagamento: '', prazoEntrega: 0, observacoes: '' });
  };

  if (isLoadingPurchases) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Cotações
            </CardTitle>
            <CardDescription>{sortedQuotations.length} cotação(ões) registrada(s)</CardDescription>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)} disabled={approvedRequests.length === 0}>
            <Plus className="h-4 w-4 mr-2" /> Nova Cotação
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {sortedQuotations.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma cotação criada</p>
            {approvedRequests.length > 0 && (
              <Button variant="outline" className="mt-3" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Criar primeira cotação
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedQuotations.map((q) => {
              const statusConfig = STATUS_LABELS[q.status];
              return (
                <div key={q.id} className="rounded-lg border p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium">Cotação #{q.id.slice(0, 8)}</span>
                      <span className="text-muted-foreground ml-2">→ Solicitação #{getRequestCode(q.solicitacaoId)}</span>
                    </div>
                    <Badge variant="outline" className={statusConfig.className}>{statusConfig.label}</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Fornecedor:</span>{' '}
                      <span className="font-medium">{getSupplierName(q.fornecedorId)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Prazo:</span> {q.prazoEntrega ?? '—'} dias
                    </div>
                    <div>
                      <span className="text-muted-foreground">Itens:</span> {q.itens.length}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Criada:</span>{' '}
                      {format(new Date(q.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                    </div>
                  </div>
                  {q.itens.some((i) => i.precoUnitario != null) && (
                    <div className="mt-2 text-sm">
                      <span className="text-muted-foreground">Valor total:</span>{' '}
                      <span className="font-medium">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          q.itens.reduce((s, i) => s + ((i.precoUnitario ?? 0) * i.quantidade), 0)
                        )}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Nova Cotação</DialogTitle>
              <DialogDescription>Selecione a solicitação e o fornecedor para criar a cotação</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Solicitação *</Label>
                <Select value={form.solicitacaoId} onValueChange={(v) => setForm((f) => ({ ...f, solicitacaoId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione a solicitação" /></SelectTrigger>
                  <SelectContent>
                    {approvedRequests.map((r) => (
                      <SelectItem key={r.id} value={r.id}>#{r.id.slice(0, 8)} — {r.itens.length} item(ns)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Fornecedor *</Label>
                <Select value={form.fornecedorId} onValueChange={(v) => setForm((f) => ({ ...f, fornecedorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o fornecedor" /></SelectTrigger>
                  <SelectContent>
                    {suppliers.filter((s) => s.status === 'active').map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.razaoSocial}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Moeda</Label>
                  <Select value={form.moedaId || currencies[0]?.id || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, moedaId: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.simbolo} {c.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Prazo Entrega (dias)</Label>
                  <Input type="number" min={0} value={form.prazoEntrega} onChange={(e) => setForm((f) => ({ ...f, prazoEntrega: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Condições de Pagamento</Label>
                <Input value={form.condicoesPagamento} onChange={(e) => setForm((f) => ({ ...f, condicoesPagamento: e.target.value }))} placeholder="Ex: 30/60/90 dias" />
              </div>
              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm((f) => ({ ...f, observacoes: e.target.value }))} rows={2} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.solicitacaoId || !form.fornecedorId}>Criar Cotação</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
