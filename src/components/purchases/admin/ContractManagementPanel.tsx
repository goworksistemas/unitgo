import { useMemo, useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ContractProgressBar } from '../shared/ContractProgressBar';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

const emptyForm = {
  fornecedorId: '',
  numero: '',
  nome: '',
  cnpjCliente: '',
  valorTotal: 0,
  dataInicio: '',
  dataFim: '',
  centroCustoId: '',
  status: 'active' as const,
};

export function ContractManagementPanel() {
  const { contracts, costCenters, suppliers, createContract, isLoadingPurchases } = usePurchases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'active'),
    [suppliers]
  );

  const handleSubmit = async () => {
    if (!form.fornecedorId || !form.numero.trim() || !form.nome.trim() || !form.dataInicio || !form.dataFim) return;
    const sup = suppliers.find((s) => s.id === form.fornecedorId);
    const cnpjCliente = (form.cnpjCliente || sup?.cnpj || '').trim();
    await createContract({
      fornecedorId: form.fornecedorId,
      numero: form.numero,
      nome: form.nome,
      cnpjCliente,
      valorTotal: form.valorTotal,
      dataInicio: new Date(form.dataInicio),
      dataFim: new Date(form.dataFim),
      centroCustoId: form.centroCustoId,
      status: form.status,
    });
    setDialogOpen(false);
    setForm({ ...emptyForm });
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Contratos</CardTitle>
            <CardDescription>Cada contrato fica vinculado a um fornecedor cadastrado</CardDescription>
          </div>
          <Button onClick={() => setDialogOpen(true)} disabled={activeSuppliers.length === 0}>
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {activeSuppliers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Cadastre ao menos um fornecedor na aba Fornecedores para criar contratos.
          </p>
        ) : contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum contrato cadastrado</p>
        ) : (
          <div className="space-y-4">
            {contracts.map((c) => {
              const fornecedor = c.fornecedorId
                ? suppliers.find((s) => s.id === c.fornecedorId)
                : undefined;
              return (
              <div key={c.id} className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.numero} — {c.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      Fornecedor: {fornecedor?.razaoSocial ?? '—'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(c.dataInicio), 'dd/MM/yyyy')} a {format(new Date(c.dataFim), 'dd/MM/yyyy')}
                    </p>
                  </div>
                  <Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div><p className="text-muted-foreground">Total</p><p className="font-medium">{fmt(c.valorTotal)}</p></div>
                  <div><p className="text-muted-foreground">Consumido</p><p className="font-medium">{fmt(c.valorConsumido)}</p></div>
                  <div><p className="text-muted-foreground">Saldo</p><p className="font-medium">{fmt(c.saldo)}</p></div>
                </div>
                <ContractProgressBar valorTotal={c.valorTotal} valorConsumido={c.valorConsumido} />
              </div>
            );
            })}
          </div>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Contrato</DialogTitle>
              <DialogDescription>Selecione o fornecedor e preencha os dados do contrato</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Fornecedor *</Label>
                <Select
                  value={form.fornecedorId || 'none'}
                  onValueChange={(v) => {
                    if (v === 'none') {
                      setForm((f) => ({ ...f, fornecedorId: '', cnpjCliente: '' }));
                      return;
                    }
                    const sup = suppliers.find((s) => s.id === v);
                    setForm((f) => ({
                      ...f,
                      fornecedorId: v,
                      cnpjCliente: sup?.cnpj ?? f.cnpjCliente,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o fornecedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Selecione…</SelectItem>
                    {activeSuppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.razaoSocial}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>CNPJ (cliente / referência)</Label>
                <Input
                  value={form.cnpjCliente}
                  onChange={(e) => setForm((f) => ({ ...f, cnpjCliente: e.target.value }))}
                  placeholder="Preenchido pelo fornecedor; ajuste se necessário"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Número *</Label><Input value={form.numero} onChange={(e) => setForm((f) => ({ ...f, numero: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Valor Total (R$)</Label><Input type="number" min={0} step={0.01} value={form.valorTotal} onChange={(e) => setForm((f) => ({ ...f, valorTotal: parseFloat(e.target.value) || 0 }))} /></div>
                <div className="grid gap-2">
                  <Label>Centro de Custo</Label>
                  <Select value={form.centroCustoId || 'none'} onValueChange={(v) => setForm((f) => ({ ...f, centroCustoId: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {costCenters.filter((cc) => cc.status === 'active').map((cc) => (<SelectItem key={cc.id} value={cc.id}>{cc.codigo} - {cc.nome}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Data Início *</Label><Input type="date" value={form.dataInicio} onChange={(e) => setForm((f) => ({ ...f, dataInicio: e.target.value }))} /></div>
                <div className="grid gap-2"><Label>Data Fim *</Label><Input type="date" value={form.dataFim} onChange={(e) => setForm((f) => ({ ...f, dataFim: e.target.value }))} /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !form.fornecedorId ||
                  !form.numero.trim() ||
                  !form.nome.trim() ||
                  !form.dataInicio ||
                  !form.dataFim
                }
              >
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
