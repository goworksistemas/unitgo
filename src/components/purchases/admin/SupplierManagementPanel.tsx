import { useState } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Database } from 'lucide-react';
import type { Supplier } from '@/types/purchases';

const emptySupplier: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'> = {
  razaoSocial: '',
  cnpj: '',
  contato: '',
  email: '',
  telefone: '',
  endereco: '',
  status: 'active',
};

export function SupplierManagementPanel() {
  const { suppliers, supplierCategories, createSupplier, updateSupplier, isLoadingPurchases, refreshPurchases } = usePurchases();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptySupplier);

  const handleOpenCreate = () => {
    setEditingId(null);
    setForm(emptySupplier);
    setDialogOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setEditingId(s.id);
    setForm({
      razaoSocial: s.razaoSocial,
      cnpj: s.cnpj,
      contato: s.contato,
      email: s.email,
      telefone: s.telefone,
      categoriaId: s.categoriaId,
      endereco: s.endereco,
      dadosBancarios: s.dadosBancarios,
      status: s.status,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.razaoSocial.trim() || !form.cnpj.trim()) return;
    if (editingId) {
      await updateSupplier(editingId, form);
    } else {
      await createSupplier({
        ...form,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
    setDialogOpen(false);
  };

  const handleSeedPurchases = async () => {
    setIsSeeding(true);
    try {
      await api.purchases.seed();
      toast.success('Dados de compras populados com sucesso');
      await refreshPurchases();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : (e as { details?: { error?: string } })?.details?.error ?? 'Erro ao popular dados';
      toast.error(msg);
    } finally {
      setIsSeeding(false);
    }
  };

  if (isLoadingPurchases) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base">Fornecedores</CardTitle>
            <CardDescription>Cadastro usado nas cotações e pedidos</CardDescription>
          </div>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" /> Novo
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {suppliers.length === 0 ? (
          <div className="py-8 text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Nenhum fornecedor cadastrado. Clique em Novo para adicionar.
            </p>
            <Button variant="outline" onClick={handleSeedPurchases} disabled={isSeeding}>
              <Database className="h-4 w-4 mr-2" />
              {isSeeding ? 'Populando...' : 'Popular dados de demonstração'}
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Razão Social</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.razaoSocial}</TableCell>
                  <TableCell>{s.cnpj}</TableCell>
                  <TableCell>{s.contato || '—'}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'active' ? 'default' : 'secondary'}>{s.status}</Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(s)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar' : 'Novo'} Fornecedor</DialogTitle>
              <DialogDescription>Preencha os dados do fornecedor</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Razão Social *</Label>
                <Input
                  value={form.razaoSocial}
                  onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))}
                  placeholder="Nome da empresa"
                />
              </div>
              <div className="grid gap-2">
                <Label>CNPJ *</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => setForm((f) => ({ ...f, cnpj: e.target.value }))}
                  placeholder="00.000.000/0001-00"
                />
              </div>
              <div className="grid gap-2">
                <Label>Contato</Label>
                <Input
                  value={form.contato || ''}
                  onChange={(e) => setForm((f) => ({ ...f, contato: e.target.value }))}
                  placeholder="Nome do contato"
                />
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Telefone</Label>
                <Input
                  value={form.telefone || ''}
                  onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
              <div className="grid gap-2">
                <Label>Endereço</Label>
                <Input
                  value={form.endereco || ''}
                  onChange={(e) => setForm((f) => ({ ...f, endereco: e.target.value }))}
                  placeholder="Endereço completo"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={!form.razaoSocial.trim() || !form.cnpj.trim()}>
                {editingId ? 'Salvar' : 'Cadastrar'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
