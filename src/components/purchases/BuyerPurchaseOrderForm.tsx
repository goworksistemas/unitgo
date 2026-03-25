import { useCallback, useEffect, useMemo, useState } from 'react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '@/contexts/AppContext';
import { usePurchases } from '@/contexts/PurchaseContext';
import { supabase } from '@/utils/supabase/client';
import { getAprovadorNecessario } from '@/utils/approvalRules';
import type { PurchaseOrder } from '@/types/purchases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Check, ChevronsUpDown, Info, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const PRIMARY = '#3F76FF';

export type GoworkPoLineV1 = {
  localId: string;
  productId: string;
  unidade: string;
  quantidade: number;
  descricaoComplementar: string;
  unidadeEntregaId: string;
  dataEntrega: string;
  prioridade: 'normal' | 'emergencial';
  centroCustoId: string;
  valorUnitario: number;
  desconto: number;
};

export type GoworkPoV1 = {
  v: 1;
  workflowStatus: 'draft' | 'pending_approval';
  tipoFrete: 'sem' | 'cif' | 'fob' | 'outros';
  transportadora: string;
  observacaoPagamento: string;
  justificativaCompra: string;
  condicaoPagamento: string;
  parcelas: { valor: number; vencimento: string }[];
  nf: { numero: string; serie: string; emissao: string; vencimento: string; chave: string };
  attachmentUrls: string[];
  lines: GoworkPoLineV1[];
  freteValor: number;
  moedaCodigo: string;
  solicitanteId: string;
  compradorId: string;
  contato: string;
  email: string;
  cotacaoId: string;
};

function emptyLine(): GoworkPoLineV1 {
  return {
    localId: crypto.randomUUID(),
    productId: '',
    unidade: '',
    quantidade: 1,
    descricaoComplementar: '',
    unidadeEntregaId: '',
    dataEntrega: format(startOfDay(new Date()), 'yyyy-MM-dd'),
    prioridade: 'normal',
    centroCustoId: '',
    valorUnitario: 0,
    desconto: 0,
  };
}

function defaultPayload(cotacaoId: string, solicitanteId: string, compradorId: string): GoworkPoV1 {
  return {
    v: 1,
    workflowStatus: 'draft',
    tipoFrete: 'sem',
    transportadora: '',
    observacaoPagamento: '',
    justificativaCompra: '',
    condicaoPagamento: 'a_vista',
    parcelas: [],
    nf: { numero: '', serie: '', emissao: '', vencimento: '', chave: '' },
    attachmentUrls: [],
    lines: [emptyLine()],
    freteValor: 0,
    moedaCodigo: 'BRL',
    solicitanteId,
    compradorId,
    contato: '',
    email: '',
    cotacaoId,
  };
}

function tryParseObservacoes(raw: string | undefined): GoworkPoV1 | null {
  if (!raw?.trim()) return null;
  try {
    const o = JSON.parse(raw) as GoworkPoV1;
    if (o && o.v === 1 && Array.isArray(o.lines)) return o;
  } catch {
    /* legado: texto livre */
  }
  return null;
}

export interface BuyerPurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  onSaved: () => void;
}

export default function BuyerPurchaseOrderForm({
  open,
  onOpenChange,
  orderId,
  onSaved,
}: BuyerPurchaseOrderFormProps) {
  const { currentUser, users, items, units, getUserById, getItemById } = useApp();
  const {
    purchaseOrders,
    purchaseRequests,
    quotations,
    suppliers,
    costCenters,
    createPurchaseOrder,
    updatePurchaseOrder,
  } = usePurchases();

  const [submitting, setSubmitting] = useState(false);
  const [payload, setPayload] = useState<GoworkPoV1 | null>(null);
  const [numeroOmie, setNumeroOmie] = useState('');
  const [emissao, setEmissao] = useState(startOfDay(new Date()));
  const [productOpen, setProductOpen] = useState<Record<string, boolean>>({});

  const order = useMemo(
    () => (orderId ? purchaseOrders.find((o) => o.id === orderId) ?? null : null),
    [orderId, purchaseOrders]
  );

  const initFromOrder = useCallback(
    (o: PurchaseOrder) => {
      const parsed = tryParseObservacoes(o.observacoes);
      const q = quotations.find((x) => x.id === o.cotacaoId);
      const sc = q ? purchaseRequests.find((r) => r.id === q.solicitacaoId) : undefined;
      if (parsed) {
        setPayload(parsed);
      } else {
        const base = defaultPayload(
          o.cotacaoId,
          o.solicitanteId ?? sc?.solicitanteId ?? currentUser?.id ?? '',
          o.compradorId ?? currentUser?.id ?? ''
        );
        base.justificativaCompra = (o.observacoes ?? '').slice(0, 2000);
        setPayload(base);
      }
      setNumeroOmie(o.numeroOmie ?? '');
      setEmissao(
        o.createdAt instanceof Date
          ? startOfDay(o.createdAt)
          : startOfDay(new Date(o.createdAt as unknown as string))
      );
    },
    [quotations, purchaseRequests, currentUser?.id]
  );

  const initNew = useCallback(() => {
    if (!currentUser) return;
    const firstApproved = quotations.find((q) => q.status === 'approved');
    const cotacaoId = firstApproved?.id ?? '';
    const sc = firstApproved
      ? purchaseRequests.find((r) => r.id === firstApproved.solicitacaoId)
      : undefined;
    const solicitanteId = sc?.solicitanteId ?? currentUser.id;
    setPayload(defaultPayload(cotacaoId, solicitanteId, currentUser.id));
    setNumeroOmie('');
    setEmissao(startOfDay(new Date()));
  }, [currentUser, quotations, purchaseRequests]);

  useEffect(() => {
    if (!open || !currentUser) return;
    if (order) {
      initFromOrder(order);
    } else {
      initNew();
    }
  }, [open, order, currentUser, initFromOrder, initNew]);

  const selectedQuotation = useMemo(
    () => quotations.find((q) => q.id === payload?.cotacaoId),
    [quotations, payload?.cotacaoId]
  );

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === selectedQuotation?.fornecedorId),
    [suppliers, selectedQuotation?.fornecedorId]
  );

  const subtotalLines = useMemo(() => {
    if (!payload) return 0;
    return payload.lines.reduce((acc, l) => acc + l.quantidade * l.valorUnitario, 0);
  }, [payload]);

  const descontoTotal = useMemo(() => {
    if (!payload) return 0;
    return payload.lines.reduce((acc, l) => acc + (l.desconto || 0), 0);
  }, [payload]);

  const totalGeral = useMemo(() => {
    if (!payload) return 0;
    return Math.max(0, subtotalLines - descontoTotal + (payload.freteValor || 0));
  }, [payload, subtotalLines, descontoTotal]);

  const persistOrder = async (workflow: 'draft' | 'pending_approval') => {
    if (!currentUser || !payload) return;
    if (!payload.cotacaoId) {
      toast.error('Selecione uma cotação aprovada');
      return;
    }
    if (!payload.solicitanteId) {
      toast.error('Selecione o solicitante');
      return;
    }
    if (!payload.compradorId) {
      toast.error('Selecione o comprador');
      return;
    }
    if (!payload.justificativaCompra.trim()) {
      toast.error('Justificativa da compra é obrigatória');
      return;
    }
    const linesOk = payload.lines.every(
      (l) =>
        l.quantidade > 0 &&
        l.valorUnitario >= 0 &&
        l.unidadeEntregaId &&
        l.dataEntrega &&
        l.centroCustoId
    );
    if (!linesOk) {
      toast.error(
        'Preencha quantidade, valor unitário, local de entrega, data de entrega e centro de custo em todos os itens'
      );
      return;
    }
    if (workflow === 'pending_approval') {
      const chave = payload.nf.chave.replace(/\D/g, '');
      if (chave && chave.length !== 44) {
        toast.error('Chave da NF deve ter 44 dígitos ou ficar vazia');
        return;
      }
    }

    const next: GoworkPoV1 = { ...payload, workflowStatus: workflow };
    const obs = JSON.stringify(next);
    const valorTotal = Math.max(0, totalGeral);
    const deptId = getUserById(next.solicitanteId)?.departmentId ?? undefined;

    setSubmitting(true);
    try {
      let aprovadorNecessarioId: string | undefined;
      if (workflow === 'pending_approval') {
        const { userId } = await getAprovadorNecessario(valorTotal, supabase, 'pedido', deptId);
        aprovadorNecessarioId = userId ?? undefined;
      }

      const baseRecord: Omit<PurchaseOrder, 'id' | 'createdAt' | 'updatedAt'> = {
        cotacaoId: next.cotacaoId,
        numeroOmie: numeroOmie || `PC-${Date.now()}`,
        valorTotal,
        status: 'created',
        notasFiscais: [],
        observacoes: obs,
        compradorId: next.compradorId,
        solicitanteId: next.solicitanteId,
        contatoFornecedor: next.contato,
        emailFornecedor: next.email,
        statusAprovacao: workflow === 'pending_approval' ? 'pendente' : undefined,
        aprovadorNecessarioId,
      };

      if (order) {
        await updatePurchaseOrder(order.id, baseRecord);
      } else {
        await createPurchaseOrder(baseRecord);
      }

      if (workflow === 'pending_approval' && aprovadorNecessarioId) {
        const { error } = await supabase.from('notifications').insert({
          user_id: aprovadorNecessarioId,
          title: 'Pedido aguardando aprovação',
          body: `Pedido ${baseRecord.numeroOmie ?? ''} enviado pelo comprador.`,
          read: false,
        });
        if (error) {
          console.warn('[BuyerPurchaseOrderForm] notifications:', error.message);
        }
      }

      toast.success(workflow === 'draft' ? 'Rascunho salvo' : 'Pedido gerado e enviado para aprovação');
      onSaved();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Falha ao salvar pedido');
    } finally {
      setSubmitting(false);
    }
  };

  if (!payload || !currentUser) return null;

  const moedaLabel = (c: string) => {
    if (c === 'BRL') return 'Real';
    if (c === 'USD') return 'Dólar';
    if (c === 'EUR') return 'Euro';
    return c;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order ? 'Editar Pedido de Compra' : 'Novo Pedido de Compra'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Número</Label>
            <Input disabled value={numeroOmie || '(automático ao salvar)'} readOnly />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Input disabled value="PC" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Cotação (aprovada) *</Label>
            <Select
              value={payload.cotacaoId ? payload.cotacaoId : '__empty__'}
              onValueChange={(cotacaoId) => {
                if (cotacaoId === '__empty__') {
                  setPayload((p) => (p ? { ...p, cotacaoId: '' } : p));
                  return;
                }
                const q = quotations.find((x) => x.id === cotacaoId);
                const sc = q ? purchaseRequests.find((r) => r.id === q.solicitacaoId) : undefined;
                setPayload((p) =>
                  p
                    ? {
                        ...p,
                        cotacaoId,
                        solicitanteId: sc?.solicitanteId ?? p.solicitanteId,
                      }
                    : p
                );
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a cotação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__empty__">Selecione…</SelectItem>
                {quotations
                  .filter((q) => q.status === 'approved')
                  .map((q) => (
                    <SelectItem key={q.id} value={q.id}>
                      {q.id.slice(0, 8)}…
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Fornecedor</Label>
            <Input
              readOnly
              disabled
              value={supplier ? `${supplier.razaoSocial} — ${supplier.cnpj}` : '— (definido pela cotação)'}
            />
          </div>
          <div className="space-y-2">
            <Label>Emissão *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(emissao, 'dd/MM/yyyy', { locale: ptBR })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={emissao}
                  onSelect={(d) => d && setEmissao(startOfDay(d))}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>Solicitante *</Label>
            <Select
              value={payload.solicitanteId}
              onValueChange={(v) => setPayload((p) => (p ? { ...p, solicitanteId: v } : p))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comprador *</Label>
            <Select
              value={payload.compradorId}
              onValueChange={(v) => setPayload((p) => (p ? { ...p, compradorId: v } : p))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {users
                  .filter(
                    (u) =>
                      u.role === 'buyer' ||
                      u.role === 'purchases_admin' ||
                      u.role === 'admin' ||
                      u.role === 'developer'
                  )
                  .map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moeda</Label>
            <Select
              value={payload.moedaCodigo}
              onValueChange={(v) => setPayload((p) => (p ? { ...p, moedaCodigo: v } : p))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BRL">{moedaLabel('BRL')}</SelectItem>
                <SelectItem value="USD">{moedaLabel('USD')}</SelectItem>
                <SelectItem value="EUR">{moedaLabel('EUR')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Contato</Label>
            <Input
              value={payload.contato}
              onChange={(e) => setPayload((p) => (p ? { ...p, contato: e.target.value } : p))}
            />
          </div>
          <div className="space-y-2">
            <Label>E-mail</Label>
            <Input
              type="email"
              value={payload.email}
              onChange={(e) => setPayload((p) => (p ? { ...p, email: e.target.value } : p))}
            />
          </div>
        </div>

        <div className="border-t pt-4 mt-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold">Itens</h3>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setPayload((p) => (p ? { ...p, lines: [...p.lines, emptyLine()] } : p))
              }
            >
              + Adicionar Item
            </Button>
          </div>
          <div className="space-y-6">
            {payload.lines.map((line, idx) => {
              const catItem = line.productId ? getItemById(line.productId) : undefined;
              const totalLinha = line.quantidade * line.valorUnitario;
              const finalLinha = Math.max(0, totalLinha - (line.desconto || 0));
              const popKey = line.localId;
              const openP = productOpen[popKey] ?? false;
              return (
                <div key={line.localId} className="rounded-lg border p-3 space-y-3 bg-muted/20">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                      <div className="flex items-center gap-2">
                        <Label>Produto</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Detalhe do produto no catálogo"
                          onClick={() => {
                            if (catItem) toast.message(catItem.name, { description: catItem.description });
                          }}
                        >
                          <Info className="h-4 w-4" />
                        </Button>
                      </div>
                      <Popover
                        open={openP}
                        onOpenChange={(o) => setProductOpen((m) => ({ ...m, [popKey]: o }))}
                      >
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-between font-normal">
                            {catItem?.name ?? 'Buscar produto…'}
                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar…" />
                            <CommandList>
                              <CommandEmpty>Nenhum item.</CommandEmpty>
                              <CommandGroup>
                                {items
                                  .filter((i) => i.active)
                                  .map((i) => (
                                    <CommandItem
                                      key={i.id}
                                      value={`${i.name} ${i.description ?? ''}`}
                                      onSelect={() => {
                                        setPayload((p) => {
                                          if (!p) return p;
                                          const lines = [...p.lines];
                                          lines[idx] = {
                                            ...lines[idx],
                                            productId: i.id,
                                            unidade: i.unitOfMeasure,
                                          };
                                          return { ...p, lines };
                                        });
                                        setProductOpen((m) => ({ ...m, [popKey]: false }));
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          'mr-2 h-4 w-4',
                                          line.productId === i.id ? 'opacity-100' : 'opacity-0'
                                        )}
                                      />
                                      {i.name}
                                    </CommandItem>
                                  ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label>Unid.</Label>
                      <Input
                        value={line.unidade}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], unidade: e.target.value };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Qtde. *</Label>
                      <Input
                        type="number"
                        min={0.001}
                        step="any"
                        value={line.quantidade}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], quantidade: Number(e.target.value) || 0 };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Descrição complementar</Label>
                      <Input
                        value={line.descricaoComplementar}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], descricaoComplementar: e.target.value };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Local de Entrega *</Label>
                      <Select
                        value={line.unidadeEntregaId}
                        onValueChange={(v) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], unidadeEntregaId: v };
                            return { ...p, lines };
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Unidade" />
                        </SelectTrigger>
                        <SelectContent>
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
                    <div className="space-y-2">
                      <Label>Data Entrega *</Label>
                      <Input
                        type="date"
                        value={line.dataEntrega}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], dataEntrega: e.target.value };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select
                        value={line.prioridade}
                        onValueChange={(v) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = {
                              ...lines[idx],
                              prioridade: v as 'normal' | 'emergencial',
                            };
                            return { ...p, lines };
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="emergencial">Emergencial</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Centro de Custo *</Label>
                      <Select
                        value={line.centroCustoId}
                        onValueChange={(v) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = { ...lines[idx], centroCustoId: v };
                            return { ...p, lines };
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {costCenters
                            .filter((c) => c.status === 'active')
                            .map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.codigo} — {c.nome}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Unit. *</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.valorUnitario}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = {
                              ...lines[idx],
                              valorUnitario: Number(e.target.value) || 0,
                            };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input disabled value={totalLinha.toFixed(2)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Desconto</Label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        value={line.desconto}
                        onChange={(e) =>
                          setPayload((p) => {
                            if (!p) return p;
                            const lines = [...p.lines];
                            lines[idx] = {
                              ...lines[idx],
                              desconto: Number(e.target.value) || 0,
                            };
                            return { ...p, lines };
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Final</Label>
                      <Input disabled value={finalLinha.toFixed(2)} />
                    </div>
                  </div>
                  {payload.lines.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() =>
                        setPayload((p) =>
                          p ? { ...p, lines: p.lines.filter((_, i) => i !== idx) } : p
                        )
                      }
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remover Item
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label>Tipo Frete</Label>
            <Select
              value={payload.tipoFrete}
              onValueChange={(v) =>
                setPayload((p) => (p ? { ...p, tipoFrete: v as GoworkPoV1['tipoFrete'] } : p))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sem">Sem Frete</SelectItem>
                <SelectItem value="cif">CIF</SelectItem>
                <SelectItem value="fob">FOB</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Transportadora</Label>
            <Input
              disabled={payload.tipoFrete === 'sem'}
              value={payload.transportadora}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, transportadora: e.target.value } : p))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observação Pagamento</Label>
            <Textarea
              rows={2}
              value={payload.observacaoPagamento}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, observacaoPagamento: e.target.value } : p))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Justificativa Compra *</Label>
            <Textarea
              rows={2}
              value={payload.justificativaCompra}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, justificativaCompra: e.target.value } : p))
              }
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label>Cond. de Pagamento</Label>
            <Select
              value={payload.condicaoPagamento}
              onValueChange={(v) => setPayload((p) => (p ? { ...p, condicaoPagamento: v } : p))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a_vista">À Vista</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="30_60">30/60 dias</SelectItem>
                <SelectItem value="30_60_90">30/60/90 dias</SelectItem>
                <SelectItem value="outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setPayload((p) =>
                  p
                    ? {
                        ...p,
                        parcelas: [
                          ...p.parcelas,
                          { valor: 0, vencimento: format(new Date(), 'yyyy-MM-dd') },
                        ],
                      }
                    : p
                )
              }
            >
              + Parcelas
            </Button>
          </div>
          {payload.parcelas.map((par, i) => (
            <div key={i} className="md:col-span-2 grid grid-cols-2 gap-2 items-end">
              <div className="space-y-1">
                <Label>Valor parcela {i + 1}</Label>
                <Input
                  type="number"
                  value={par.valor}
                  onChange={(e) =>
                    setPayload((p) => {
                      if (!p) return p;
                      const parcelas = [...p.parcelas];
                      parcelas[i] = { ...parcelas[i], valor: Number(e.target.value) || 0 };
                      return { ...p, parcelas };
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={par.vencimento}
                  onChange={(e) =>
                    setPayload((p) => {
                      if (!p) return p;
                      const parcelas = [...p.parcelas];
                      parcelas[i] = { ...parcelas[i], vencimento: e.target.value };
                      return { ...p, parcelas };
                    })
                  }
                />
              </div>
            </div>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-2 border-t pt-4">
          <div className="space-y-2">
            <Label>Numero NF</Label>
            <Input
              value={payload.nf.numero}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, nf: { ...p.nf, numero: e.target.value } } : p))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Série</Label>
            <Input
              value={payload.nf.serie}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, nf: { ...p.nf, serie: e.target.value } } : p))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Emissão NF</Label>
            <Input
              type="date"
              value={payload.nf.emissao}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, nf: { ...p.nf, emissao: e.target.value } } : p))
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Vencimento</Label>
            <Input
              type="date"
              value={payload.nf.vencimento}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, nf: { ...p.nf, vencimento: e.target.value } } : p))
              }
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Chave Nota Fiscal (44 dígitos)</Label>
            <Input
              value={payload.nf.chave}
              onChange={(e) =>
                setPayload((p) => (p ? { ...p, nf: { ...p.nf, chave: e.target.value } } : p))
              }
              maxLength={44}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Anexar</Label>
            <Input
              type="file"
              accept=".pdf,.xml,.xls,.xlsx,.doc,.docx"
              multiple
              onChange={async (e) => {
                const fl = e.target.files;
                if (!fl?.length || !currentUser) return;
                for (const file of Array.from(fl)) {
                  const path = `${currentUser.id}/${Date.now()}_${file.name}`;
                  const { error } = await supabase.storage.from('purchase-documents').upload(path, file);
                  if (error) {
                    toast.error(`Upload: ${error.message}`);
                    continue;
                  }
                  const { data } = supabase.storage.from('purchase-documents').getPublicUrl(path);
                  setPayload((p) =>
                    p ? { ...p, attachmentUrls: [...p.attachmentUrls, data.publicUrl] } : p
                  );
                }
                toast.success('Arquivos enviados');
              }}
            />
            {payload.attachmentUrls.length > 0 && (
              <ul className="text-xs text-muted-foreground mt-1 list-disc pl-4">
                {payload.attachmentUrls.map((u) => (
                  <li key={u}>
                    <a
                      href={u}
                      className="text-[#3F76FF] underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {u.slice(-28)}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t pt-4 text-sm">
          <div>
            <div className="text-muted-foreground">Subtotal</div>
            <div className="font-medium">{subtotalLines.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Desconto Total</div>
            <div className="font-medium">{descontoTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Frete</div>
            <Input
              type="number"
              className="h-8 mt-1"
              value={payload.freteValor}
              onChange={(e) =>
                setPayload((p) =>
                  p ? { ...p, freteValor: Number(e.target.value) || 0 } : p
                )
              }
            />
          </div>
          <div>
            <div className="text-muted-foreground">Total Geral</div>
            <div className="font-semibold text-base">{totalGeral.toFixed(2)}</div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={submitting}
            onClick={() => persistOrder('draft')}
          >
            Salvar Rascunho
          </Button>
          <Button
            type="button"
            className="text-white hover:opacity-90"
            style={{ backgroundColor: PRIMARY }}
            disabled={submitting}
            onClick={() => persistOrder('pending_approval')}
          >
            Gerar Pedido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
