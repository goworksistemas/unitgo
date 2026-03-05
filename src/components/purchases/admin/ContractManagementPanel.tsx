import { useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ContractProgressBar } from '../shared/ContractProgressBar';
import { Plus } from 'lucide-react';
import { format } from 'date-fns';

export function ContractManagementPanel() {
  const { contracts, costCenters, createContract, isLoadingPurchases } = usePurchases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ numero: '', nome: '', cnpjCliente: '', valorTotal: 0, dataInicio: '', dataFim: '', centroCustoId: '', status: 'active' as const });

  const handleSubmit = async () => {
    if (!form.numero.trim() || !form.nome.trim() || !form.dataInicio || !form.dataFim) return;
    await createContract({
      numero: form.numero, nome: form.nome, cnpjCliente: form.cnpjCliente,
      valorTotal: form.valorTotal, dataInicio: new Date(form.dataInicio), dataFim: new Date(form.dataFim),
      centroCustoId: form.centroCustoId, status: form.status,
    });
    setDialogOpen(false);
    setForm({ numero: '', nome: '', cnpjCliente: '', valorTotal: 0, dataInicio: '', dataFim: '', centroCustoId: '', status: 'active' });
  };

  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Contratos</CardTitle><CardDescription>Gestão de contratos e saldos</CardDescription></div>
          <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum contrato cadastrado</p>
        ) : (
          <div className="space-y-4">
            {contracts.map((c) => (
              <div key={c.id} className="p-4 rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{c.numero} — {c.nome}</p>
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
            ))}
          </div>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Contrato</DialogTitle><DialogDescription>Preencha os dados do contrato</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
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
              <Button onClick={handleSubmit} disabled={!form.numero.trim() || !form.nome.trim() || !form.dataInicio || !form.dataFim}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
