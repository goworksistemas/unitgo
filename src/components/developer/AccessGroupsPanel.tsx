import { useEffect, useState, useCallback } from 'react';
import { useApp } from '@/contexts/AppContext';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { PlusCircle, Trash2, UserPlus, Pencil, Shield, Loader2 } from 'lucide-react';
import type { AccessGroup } from '@/types';
import { AVAILABLE_TABS, TAB_LABEL_MAP, type TabCategory } from '@/constants/availableTabs';

interface GroupForm {
  codigo: string;
  nome: string;
  descricao: string;
  tabs: string[];
}

const EMPTY_FORM: GroupForm = { codigo: '', nome: '', descricao: '', tabs: [] };

export function AccessGroupsPanel() {
  const { users } = useApp();
  const [groups, setGroups] = useState<AccessGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [form, setForm] = useState<GroupForm>({ ...EMPTY_FORM });
  const [addMemberGroupId, setAddMemberGroupId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');

  const loadGroups = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.accessGroups.getAll();
      setGroups(Array.isArray(data) ? data : []);
    } catch {
      setGroups([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);

  const handleOpenCreate = () => {
    setEditingGroupId(null);
    setForm({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const handleOpenEdit = (group: AccessGroup) => {
    setEditingGroupId(group.id);
    setForm({ codigo: group.codigo, nome: group.nome, descricao: group.descricao ?? '', tabs: [...group.tabs] });
    setDialogOpen(true);
  };

  const handleToggleTab = (tabId: string) => {
    setForm((prev) => ({
      ...prev,
      tabs: prev.tabs.includes(tabId) ? prev.tabs.filter((t) => t !== tabId) : [...prev.tabs, tabId],
    }));
  };

  const handleToggleCategory = (category: TabCategory) => {
    const catIds = category.tabs.map((t) => t.id);
    const allSelected = catIds.every((id) => form.tabs.includes(id));
    setForm((prev) => ({
      ...prev,
      tabs: allSelected
        ? prev.tabs.filter((t) => !catIds.includes(t))
        : [...new Set([...prev.tabs, ...catIds])],
    }));
  };

  const handleSave = async () => {
    if (!form.nome.trim()) { toast.error('Nome é obrigatório'); return; }
    if (!editingGroupId && !form.codigo.trim()) { toast.error('Código é obrigatório'); return; }
    if (form.tabs.length === 0) { toast.error('Selecione pelo menos uma aba'); return; }
    setIsSubmitting(true);
    try {
      if (editingGroupId) {
        await api.accessGroups.update(editingGroupId, { nome: form.nome, descricao: form.descricao || undefined, tabs: form.tabs });
        toast.success('Grupo atualizado');
      } else {
        await api.accessGroups.create({ codigo: form.codigo.toLowerCase().replace(/\s+/g, '_'), nome: form.nome, descricao: form.descricao || undefined, tabs: form.tabs });
        toast.success('Grupo criado');
      }
      setDialogOpen(false);
      await loadGroups();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao salvar grupo');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!window.confirm('Excluir este grupo? Todos os membros perderão o acesso.')) return;
    try {
      await api.accessGroups.remove(groupId);
      toast.success('Grupo excluído');
      await loadGroups();
    } catch { toast.error('Erro ao excluir grupo'); }
  };

  const handleAddMember = async () => {
    if (!addMemberGroupId || !selectedUserId) return;
    setIsSubmitting(true);
    try {
      await api.accessGroups.addMember(addMemberGroupId, selectedUserId);
      toast.success('Usuário adicionado ao grupo');
      setAddMemberGroupId(null);
      setSelectedUserId('');
      await loadGroups();
    } catch (e: any) {
      toast.error(e?.message || 'Erro ao adicionar membro');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (groupId: string, userId: string) => {
    try {
      await api.accessGroups.removeMember(groupId, userId);
      toast.success('Membro removido');
      await loadGroups();
    } catch { toast.error('Erro ao remover membro'); }
  };

  const getAvailableUsers = (group: AccessGroup) => {
    const memberIds = new Set(group.members.map((m) => m.userId));
    return users.filter((u) => !memberIds.has(u.id));
  };

  if (isLoading) {
    return <Card><CardContent className="py-12 text-center text-muted-foreground">Carregando...</CardContent></Card>;
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Grupos de Acesso
              </CardTitle>
              <CardDescription>Defina grupos com abas específicas de qualquer módulo e atribua usuários</CardDescription>
            </div>
            <Button onClick={handleOpenCreate}><PlusCircle className="h-4 w-4 mr-2" />Novo Grupo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum grupo criado</p>
              <p className="text-xs text-muted-foreground mt-1">Crie um grupo para definir quais abas cada usuário pode acessar</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groups.map((group) => (
                <Card key={group.id} className="flex flex-col">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base truncate">{group.nome}</CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs font-mono">{group.codigo}</Badge>
                          <Badge variant="secondary" className="text-xs">{group.members.length} membro(s)</Badge>
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-wrap mt-2">
                      {group.tabs.slice(0, 4).map((tabId) => (
                        <Badge key={tabId} variant="outline" className="text-xs">
                          {TAB_LABEL_MAP.get(tabId) ?? tabId}
                        </Badge>
                      ))}
                      {group.tabs.length > 4 && (
                        <Badge variant="outline" className="text-xs">+{group.tabs.length - 4}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col gap-3 pt-0">
                    {group.descricao && <p className="text-xs text-muted-foreground line-clamp-2">{group.descricao}</p>}
                    <div className="flex flex-wrap gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => handleOpenEdit(group)} className="h-7 text-xs">
                        <Pencil className="h-3 w-3 mr-1" /> Editar
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setAddMemberGroupId(group.id); setSelectedUserId(''); }} className="h-7 text-xs">
                        <UserPlus className="h-3 w-3 mr-1" /> Adicionar
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteGroup(group.id)} className="h-7 text-xs">
                        <Trash2 className="h-3 w-3 mr-1" /> Excluir
                      </Button>
                    </div>
                    <div className="flex-1 min-h-0">
                      <h4 className="text-xs font-medium mb-1.5">Membros</h4>
                      {group.members.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nenhum membro</p>
                      ) : (
                        <div className="space-y-1 max-h-24 overflow-y-auto">
                          {group.members.map((m) => (
                            <div key={m.userId} className="flex items-center justify-between py-1 px-2 rounded bg-muted/50 text-xs">
                              <span className="truncate">{m.userName}</span>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 shrink-0 text-destructive hover:text-destructive" onClick={() => handleRemoveMember(group.id, m.userId)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && setDialogOpen(false)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroupId ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
            <DialogDescription>Defina o nome e selecione as abas que este grupo pode acessar</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!editingGroupId && (
              <div className="space-y-2">
                <Label htmlFor="group-codigo">Código (identificador único)</Label>
                <Input id="group-codigo" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="ex: compradores" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="group-nome">Nome</Label>
              <Input id="group-nome" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} placeholder="ex: Compradores" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-desc">Descrição</Label>
              <Textarea id="group-desc" value={form.descricao} onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} rows={2} placeholder="Opcional" />
            </div>
            <div className="space-y-3">
              <Label>Abas permitidas</Label>
              {AVAILABLE_TABS.map((category) => {
                const catIds = category.tabs.map((t) => t.id);
                const allSelected = catIds.every((id) => form.tabs.includes(id));
                const someSelected = catIds.some((id) => form.tabs.includes(id));
                return (
                  <div key={category.label} className="space-y-1.5">
                    <label className="flex items-center gap-2 cursor-pointer font-medium text-sm">
                      <Checkbox
                        checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                        onCheckedChange={() => handleToggleCategory(category)}
                      />
                      {category.label}
                    </label>
                    <div className="ml-6 space-y-1">
                      {category.tabs.map((tab) => (
                        <label key={tab.id} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox checked={form.tabs.includes(tab.id)} onCheckedChange={() => handleToggleTab(tab.id)} />
                          <span className="text-sm">{tab.label}</span>
                          <span className="text-xs text-muted-foreground font-mono">{tab.id}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingGroupId ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addMemberGroupId} onOpenChange={(open) => !open && setAddMemberGroupId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Usuário ao Grupo</DialogTitle>
            <DialogDescription>Selecione um usuário para adicioná-lo a este grupo</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Usuário</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione um usuário" /></SelectTrigger>
              <SelectContent>
                {addMemberGroupId && getAvailableUsers(groups.find((g) => g.id === addMemberGroupId)!).map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.name} ({u.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMemberGroupId(null)} disabled={isSubmitting}>Cancelar</Button>
            <Button onClick={handleAddMember} disabled={!selectedUserId || isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
