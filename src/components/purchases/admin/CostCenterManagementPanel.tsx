import { useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil } from 'lucide-react';
import type { CostCenter } from '@/types/purchases';

const empty: Omit<CostCenter, 'id'> = { codigo: '', nome: '', descricao: '', status: 'active' };

export function CostCenterManagementPanel() {
  const { costCenters, createCostCenter, isLoadingPurchases } = usePurchases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.nome.trim()) return;
    await createCostCenter(form);
    setDialogOpen(false);
    setForm(empty);
  };

  if (isLoadingPurchases) return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div><CardTitle>Centros de Custo</CardTitle><CardDescription>Gerenciamento de centros de custo</CardDescription></div>
          <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-2" />Novo</Button>
        </div>
      </CardHeader>
      <CardContent>
        {costCenters.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">Nenhum centro de custo cadastrado</p>
        ) : (
          <Table>
            <TableHeader><TableRow><TableHead>Código</TableHead><TableHead>Nome</TableHead><TableHead>Descrição</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {costCenters.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.codigo}</TableCell>
                  <TableCell className="font-medium">{c.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{c.descricao || '—'}</TableCell>
                  <TableCell><Badge variant={c.status === 'active' ? 'default' : 'secondary'}>{c.status === 'active' ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo Centro de Custo</DialogTitle><DialogDescription>Preencha os dados</DialogDescription></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label>Código *</Label><Input value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="CC001" /></div>
              <div className="grid gap-2"><Label>Nome *</Label><Input value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="Administrativo" /></div>
              <div className="grid gap-2"><Label>Descrição</Label><Input value={form.descricao || ''} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!form.codigo.trim() || !form.nome.trim()}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
