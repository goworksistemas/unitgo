import { useCallback, useEffect, useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/utils/supabase/client';
import type { ApprovalConfigEscopo } from '@/types/purchases';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Building2, Check, ChevronsUpDown, Pencil, Plus, Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Department {
  id: string;
  name: string;
  is_active: boolean;
}

interface Row {
  id: string;
  role_name: string;
  user_id: string | null;
  valor_limite_min: number;
  valor_limite_max: number | null;
  active: boolean;
  department_ids: string[];
}

const fmtMoney = (n: number | null) =>
  n === null || n === undefined
    ? '—'
    : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));

export function PurchaseApproversConfigPanel() {
  const { users } = useApp();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentsLoadError, setDepartmentsLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setDepartmentsLoadError(null);

    const [configRes, deptsRes, linksRes] = await Promise.all([
      supabase.from('purchase_approval_config').select('*').order('valor_limite_min'),
      // Sem filtro is_active: evita lista vazia se a coluna for NULL ou divergir; inativos aparecem marcados no diálogo
      supabase.from('org_departments').select('id, name, is_active').order('name'),
      supabase.from('purchase_approval_config_departments').select('approval_config_id, department_id'),
    ]);

    if (configRes.error) {
      setLoadError(configRes.error.message);
      setRows([]);
      setLoading(false);
      return;
    }

    if (deptsRes.error) {
      setDepartmentsLoadError(deptsRes.error.message);
      setDepartments([]);
      toast.error(`Departamentos: ${deptsRes.error.message}`);
    } else {
      setDepartments((deptsRes.data || []) as Department[]);
    }

    const linkMap = new Map<string, string[]>();
    for (const link of (linksRes.data || []) as { approval_config_id: string; department_id: string }[]) {
      const arr = linkMap.get(link.approval_config_id) || [];
      arr.push(link.department_id);
      linkMap.set(link.approval_config_id, arr);
    }

    const mapped: Row[] = ((configRes.data || []) as Omit<Row, 'department_ids'>[]).map((r) => ({
      ...r,
      department_ids: linkMap.get(r.id) || [],
    }));

    setRows(mapped);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const userName = (id: string | null) => {
    if (!id) return '—';
    const u = users.find((x) => x.id === id);
    return u ? u.name : id.slice(0, 8) + '…';
  };

  const deptName = (id: string) => {
    const d = departments.find((x) => x.id === id);
    return d ? d.name : id.slice(0, 8) + '…';
  };

  const rowsPedido = rows.filter((r) => r.role_name !== 'requisicao');
  const rowsRequisicao = rows.filter((r) => r.role_name === 'requisicao');

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando regras de aprovação…
        </CardContent>
      </Card>
    );
  }

  if (loadError) {
    return (
      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Não foi possível carregar purchase_approval_config</CardTitle>
          <CardDescription>
            Verifique se a tabela existe no Supabase após o reset. Erro: {loadError}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Como funcionam as alçadas</CardTitle>
          <CardDescription className="space-y-2 text-sm">
            <p>
              Cada linha associa <strong>um usuário</strong> a uma <strong>faixa de valor</strong> e,
              opcionalmente, a <strong>um ou mais setores</strong>. O motor escolhe a faixa em que o valor
              está entre o mínimo e o máximo (máximo vazio = sem teto), entre as regras{' '}
              <strong>ativas</strong>, priorizando a maior faixa mínima compatível.
            </p>
            <p>
              Exemplo: usuário A de <strong>R$ 0,00</strong> a <strong>R$ 4.999,99</strong>; usuário B de{' '}
              <strong>R$ 5.000,00</strong> sem teto.
            </p>
            <p>
              Se <strong>nenhum setor</strong> estiver selecionado, a regra vale para todos. Se setores forem
              escolhidos, só se aplica a solicitações de compra/pedidos originados daqueles setores.
            </p>
            <p className="text-amber-700 dark:text-amber-400">
              <strong>Pedidos</strong>: regras para o valor total do pedido de compra.{' '}
              <strong>Solicitações de compra</strong>: regras para quando o fluxo usar valor estimado na solicitação.
            </p>
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pedido" className="w-full">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="pedido">Aprovadores de pedidos</TabsTrigger>
          <TabsTrigger value="requisicao">Aprovadores de solicitações de compra</TabsTrigger>
        </TabsList>
        <TabsContent value="pedido" className="mt-4">
          <ApproversTable
            escopo="pedido"
            rows={rowsPedido}
            users={users}
            departments={departments}
            departmentsLoadError={departmentsLoadError}
            userName={userName}
            deptName={deptName}
            onRefresh={load}
          />
        </TabsContent>
        <TabsContent value="requisicao" className="mt-4">
          <ApproversTable
            escopo="requisicao"
            rows={rowsRequisicao}
            users={users}
            departments={departments}
            departmentsLoadError={departmentsLoadError}
            userName={userName}
            deptName={deptName}
            onRefresh={load}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ApproversTable({
  escopo,
  rows,
  users,
  departments,
  departmentsLoadError,
  userName,
  deptName,
  onRefresh,
}: {
  escopo: ApprovalConfigEscopo;
  rows: Row[];
  users: { id: string; name: string; email: string }[];
  departments: Department[];
  departmentsLoadError: string | null;
  userName: (id: string | null) => string;
  deptName: (id: string) => string;
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [deptPopoverOpen, setDeptPopoverOpen] = useState(false);
  const [deptSearch, setDeptSearch] = useState('');
  const [form, setForm] = useState({
    userId: '',
    valorMin: '0',
    valorMax: '',
    active: true,
    departmentIds: [] as string[],
  });

  const openCreate = () => {
    setEditing(null);
    setDeptSearch('');
    setForm({ userId: '', valorMin: '0', valorMax: '', active: true, departmentIds: [] });
    setDialogOpen(true);
  };

  const openEdit = (r: Row) => {
    setEditing(r);
    setDeptSearch('');
    setForm({
      userId: r.user_id || '',
      valorMin: String(r.valor_limite_min ?? 0),
      valorMax: r.valor_limite_max === null || r.valor_limite_max === undefined ? '' : String(r.valor_limite_max),
      active: r.active,
      departmentIds: [...r.department_ids],
    });
    setDialogOpen(true);
  };

  const toggleDept = (deptId: string) => {
    setForm((f) => ({
      ...f,
      departmentIds: f.departmentIds.includes(deptId)
        ? f.departmentIds.filter((d) => d !== deptId)
        : [...f.departmentIds, deptId],
    }));
  };

  const parseNum = (s: string) => {
    const t = s.trim().replace(',', '.');
    if (t === '') return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : NaN;
  };

  const handleSave = async () => {
    const min = parseNum(form.valorMin);
    const maxRaw = form.valorMax.trim() === '' ? null : parseNum(form.valorMax);
    if (!form.userId) {
      toast.error('Selecione o aprovador (usuário)');
      return;
    }
    if (Number.isNaN(min) || (min !== null && min < 0)) {
      toast.error('Valor mínimo inválido');
      return;
    }
    if (maxRaw !== null && (Number.isNaN(maxRaw) || (min !== null && maxRaw < min))) {
      toast.error('Valor máximo deve ser vazio ou maior/igual ao mínimo');
      return;
    }

    setSaving(true);
    const payload = {
      role_name: escopo,
      user_id: form.userId,
      valor_limite_min: min,
      valor_limite_max: maxRaw,
      active: form.active,
    };

    try {
      let configId: string;

      if (editing) {
        const { error } = await supabase.from('purchase_approval_config').update(payload).eq('id', editing.id);
        if (error) throw error;
        configId = editing.id;
      } else {
        const { data, error } = await supabase.from('purchase_approval_config').insert(payload).select('id').single();
        if (error) throw error;
        configId = data.id;
      }

      await supabase.from('purchase_approval_config_departments').delete().eq('approval_config_id', configId);

      if (form.departmentIds.length > 0) {
        const links = form.departmentIds.map((dId) => ({
          approval_config_id: configId,
          department_id: dId,
        }));
        const { error: linkErr } = await supabase.from('purchase_approval_config_departments').insert(links);
        if (linkErr) throw linkErr;
      }

      toast.success(editing ? 'Regra atualizada' : 'Regra criada');
      setDialogOpen(false);
      await onRefresh();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro ao salvar';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: Row) => {
    if (!window.confirm('Remover esta faixa de aprovação?')) return;
    const { error } = await supabase.from('purchase_approval_config').delete().eq('id', r.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Removido');
    await onRefresh();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">
              {escopo === 'pedido' ? 'Pedidos de compra' : 'Solicitações de compra'}
            </CardTitle>
            <CardDescription>
              {escopo === 'pedido'
                ? 'Quem aprova o pedido conforme o valor total e setor de origem (regra de corte).'
                : 'Quem aprova a solicitação de compra conforme o valor e setor de origem.'}
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Nova faixa
          </Button>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma faixa cadastrada. Adicione pelo menos uma para o motor localizar o aprovador.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Aprovador</TableHead>
                    <TableHead>Mínimo</TableHead>
                    <TableHead>Máximo</TableHead>
                    <TableHead>Setores</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{userName(r.user_id)}</TableCell>
                      <TableCell>{fmtMoney(r.valor_limite_min)}</TableCell>
                      <TableCell>{fmtMoney(r.valor_limite_max)}</TableCell>
                      <TableCell>
                        {r.department_ids.length === 0 ? (
                          <span className="text-xs text-muted-foreground">Todos</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {r.department_ids.map((dId) => (
                              <Badge key={dId} variant="outline" className="text-xs whitespace-nowrap">
                                <Building2 className="h-3 w-3 mr-1" />
                                {deptName(dId)}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.active ? (
                          <Badge variant="default" className="text-xs">Sim</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Não</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(r)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar faixa' : 'Nova faixa'}</DialogTitle>
            <DialogDescription>
              Defina o aprovador, limites em reais e os setores atendidos. Deixe o máximo vazio para "sem teto".
              Sem setores selecionados = vale para todos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="space-y-1.5">
              <Label>Usuário aprovador</Label>
              <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {users.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum usuário carregado.</div>
                  ) : (
                    users.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Valor mínimo (R$)</Label>
                <Input value={form.valorMin} onChange={(e) => setForm((f) => ({ ...f, valorMin: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor máximo (R$)</Label>
                <Input
                  placeholder="Vazio = sem teto"
                  value={form.valorMax}
                  onChange={(e) => setForm((f) => ({ ...f, valorMax: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Setores (departamentos)</Label>
              {departmentsLoadError && (
                <p className="text-xs text-destructive">
                  Não foi possível carregar setores: {departmentsLoadError}
                </p>
              )}
              {!departmentsLoadError && departments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Nenhum departamento retornado. Confira se a tabela <code className="text-xs">departments</code> tem
                  dados e se o RLS permite SELECT para o seu usuário autenticado.
                </p>
              )}
              <Popover
                open={deptPopoverOpen}
                onOpenChange={(open) => {
                  setDeptPopoverOpen(open);
                  if (!open) setDeptSearch('');
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={deptPopoverOpen}
                    className="w-full justify-between font-normal"
                    disabled={!!departmentsLoadError || departments.length === 0}
                  >
                    {form.departmentIds.length === 0
                      ? 'Todos os setores (nenhum filtro)'
                      : `${form.departmentIds.length} setor(es) selecionado(s)`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  className="w-[var(--radix-popover-trigger-width)] min-w-[280px] p-0 z-[200]"
                  align="start"
                  sideOffset={4}
                  onOpenAutoFocus={(e) => e.preventDefault()}
                >
                  {/* shouldFilter={false}: cmdk dentro de Dialog não filtra itens incorretamente */}
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="Buscar setor…"
                      value={deptSearch}
                      onValueChange={setDeptSearch}
                    />
                    <CommandList className="max-h-[280px]">
                      <CommandEmpty>Nenhum setor com esse texto.</CommandEmpty>
                      <CommandGroup>
                        {departments
                          .filter((d) => {
                            const q = deptSearch.trim().toLowerCase();
                            if (!q) return true;
                            return d.name.toLowerCase().includes(q);
                          })
                          .map((d) => {
                            const selected = form.departmentIds.includes(d.id);
                            return (
                              <CommandItem
                                key={d.id}
                                value={d.id}
                                onSelect={() => toggleDept(d.id)}
                              >
                                <Checkbox
                                  checked={selected}
                                  className={cn('mr-2 pointer-events-none')}
                                  aria-hidden
                                />
                                <Building2 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground shrink-0" />
                                <span className={cn(d.is_active === false && 'text-muted-foreground')}>
                                  {d.name}
                                  {d.is_active === false ? ' (inativo)' : ''}
                                </span>
                                {selected && <Check className="ml-auto h-4 w-4 text-primary shrink-0" />}
                              </CommandItem>
                            );
                          })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {form.departmentIds.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {form.departmentIds.map((dId) => {
                    const d = departments.find((x) => x.id === dId);
                    return (
                      <Badge
                        key={dId}
                        variant="secondary"
                        className="text-xs cursor-pointer hover:bg-destructive/20"
                        onClick={() => toggleDept(dId)}
                      >
                        {d?.name || dId.slice(0, 8)}
                        <span className="ml-1">×</span>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))} id="ac-active" />
              <Label htmlFor="ac-active">Regra ativa</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
