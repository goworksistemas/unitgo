import { useState } from 'react';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { PurchaseRequestItem } from '@/types/purchases';

export function CreatePurchaseRequestPanel() {
  const { currentUser, currentUnit, getUnitById } = useApp();
  const { costCenters, contracts, createPurchaseRequest, isLoadingPurchases } = usePurchases();
  const [justificativa, setJustificativa] = useState('');
  const [centroCustoId, setCentroCustoId] = useState('');
  const [contratoId, setContratoId] = useState('');
  const [itens, setItens] = useState<Omit<PurchaseRequestItem, 'id' | 'solicitacaoId'>[]>([
    { descricao: '', quantidade: 1, unidadeMedida: 'UN', observacao: '' },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const handleAddItem = () => {
    setItens((prev) => [...prev, { descricao: '', quantidade: 1, unidadeMedida: 'UN', observacao: '' }]);
  };

  const handleRemoveItem = (idx: number) => {
    if (itens.length <= 1) return;
    setItens((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: keyof PurchaseRequestItem, value: string | number) => {
    setItens((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const effectiveUnit = currentUnit || (currentUser?.primaryUnitId ? getUnitById(currentUser.primaryUnitId) : null);

  const handleSubmit = async () => {
    if (!currentUser || !effectiveUnit) {
      toast.error('Selecione uma unidade no menu lateral');
      return;
    }
    if (!justificativa.trim() || justificativa.trim().length < 10) {
      toast.error('Justificativa deve ter no mínimo 10 caracteres');
      return;
    }
    if (!centroCustoId) {
      toast.error('Selecione o centro de custo');
      return;
    }
    const validItens = itens.filter((i) => i.descricao.trim() && i.quantidade > 0);
    if (validItens.length === 0) {
      toast.error('Adicione pelo menos um item válido');
      return;
    }

    setSubmitting(true);
    try {
      const itensComIds = validItens.map((i) => ({
        ...i,
        id: crypto.randomUUID(),
        solicitacaoId: '',
      }));
      await createPurchaseRequest({
        solicitanteId: currentUser.id,
        unidadeId: effectiveUnit.id,
        centroCustoId,
        contratoId: contratoId || undefined,
        justificativa: justificativa.trim(),
        status: 'pending_manager',
        itens: itensComIds,
        aprovacoes: [],
      });
      setJustificativa('');
      setCentroCustoId('');
      setContratoId('');
      setItens([{ descricao: '', quantidade: 1, unidadeMedida: 'UN', observacao: '' }]);
    } finally {
      setSubmitting(false);
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
    <Card>
      <CardHeader>
        <CardTitle>Nova Solicitação de Compra</CardTitle>
        <CardDescription>Preencha os dados e adicione os itens necessários</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Centro de Custo *</Label>
            <Select value={centroCustoId} onValueChange={setCentroCustoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {costCenters.filter((c) => c.status === 'active').map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} - {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contrato (opcional)</Label>
            <Select value={contratoId || 'none'} onValueChange={(v) => setContratoId(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum</SelectItem>
                {contracts.filter((c) => c.status === 'active').map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.numero} - {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Justificativa *</Label>
          <Textarea
            placeholder="Descreva a necessidade da compra (mín. 10 caracteres)"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            rows={3}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>Itens</Label>
            <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar
            </Button>
          </div>
          <div className="space-y-3">
            {itens.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start p-3 rounded-lg border bg-muted/30">
                <div className="flex-1 grid gap-2 sm:grid-cols-4">
                  <Input
                    placeholder="Descrição"
                    value={item.descricao}
                    onChange={(e) => handleItemChange(idx, 'descricao', e.target.value)}
                  />
                  <Input
                    type="number"
                    min={1}
                    placeholder="Qtd"
                    value={item.quantidade}
                    onChange={(e) => handleItemChange(idx, 'quantidade', parseInt(e.target.value) || 0)}
                  />
                  <Select
                    value={item.unidadeMedida}
                    onValueChange={(v) => handleItemChange(idx, 'unidadeMedida', v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UN">UN</SelectItem>
                      <SelectItem value="CX">CX</SelectItem>
                      <SelectItem value="PC">PC</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="M">M</SelectItem>
                      <SelectItem value="L">L</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Obs."
                    value={item.observacao || ''}
                    onChange={(e) => handleItemChange(idx, 'observacao', e.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveItem(idx)}
                  disabled={itens.length <= 1}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar Solicitação'}
        </Button>
      </CardContent>
    </Card>
  );
}
