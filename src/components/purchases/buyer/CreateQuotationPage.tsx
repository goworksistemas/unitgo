import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ChevronsUpDown, X } from 'lucide-react';
import { addDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { PurchaseRequest, QuotationItem, PurchaseRequestItem } from '@/types/purchases';

interface CreateQuotationPageProps {
  solicitacaoIdPreenchido?: string;
  onBack: () => void;
  onSuccess: () => void;
}

interface FormItem extends Omit<QuotationItem, 'cotacaoId' | 'valorTotal'> {
  precoUnitario: number;
}

export function CreateQuotationPage({
  solicitacaoIdPreenchido,
  onBack,
  onSuccess,
}: CreateQuotationPageProps) {
  const {
    purchaseRequests,
    suppliers,
    currencies,
    refreshPurchases,
  } = usePurchases();

  const approvedRequests = useMemo(
    () => purchaseRequests.filter((r) => r.status === 'in_quotation'),
    [purchaseRequests]
  );

  const activeSuppliers = useMemo(
    () => suppliers.filter((s) => s.status === 'active'),
    [suppliers]
  );

  const [solicitacaoId, setSolicitacaoId] = useState(solicitacaoIdPreenchido ?? '');
  const [fornecedorIds, setFornecedorIds] = useState<string[]>([]);
  const [moedaId, setMoedaId] = useState(currencies[0]?.id ?? '');
  const [prazoEntrega, setPrazoEntrega] = useState<number>(0);
  const [formaPagamento, setFormaPagamento] = useState('');
  const [condicoesPagamento, setCondicoesPagamento] = useState('');
  const [frete, setFrete] = useState<number>(0);
  const [desconto, setDesconto] = useState<number>(0);
  const [ipi, setIpi] = useState<number>(0);
  const [icms, setIcms] = useState<number>(0);
  const [pisCofins, setPisCofins] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState<FormItem[]>([]);
  const [anexos, setAnexos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [supplierPopoverOpen, setSupplierPopoverOpen] = useState(false);

  const selectedRequest = useMemo(
    () => purchaseRequests.find((r) => r.id === solicitacaoId),
    [purchaseRequests, solicitacaoId]
  );

  const buildItensFromRequest = useCallback((request: PurchaseRequest): FormItem[] => {
    return request.itens.map((item: PurchaseRequestItem) => ({
      id: crypto.randomUUID(),
      cotacaoId: '',
      itemSolicitacaoId: item.id,
      descricao: item.descricao,
      quantidade: item.quantidade,
      unidadeMedida: item.unidadeMedida,
      precoUnitario: 0,
      observacoes: item.observacao,
    }));
  }, []);

  useEffect(() => {
    if (solicitacaoIdPreenchido && selectedRequest) {
      setItens(buildItensFromRequest(selectedRequest));
    }
  }, [solicitacaoIdPreenchido, selectedRequest, buildItensFromRequest]);

  const dataPrevisaoEntrega = useMemo(() => {
    if (prazoEntrega <= 0) return null;
    return format(addDays(new Date(), prazoEntrega), 'yyyy-MM-dd');
  }, [prazoEntrega]);

  const subtotal = useMemo(() => {
    return itens.reduce((s, i) => s + (i.precoUnitario ?? 0) * i.quantidade, 0);
  }, [itens]);

  const valorImpostos = useMemo(() => {
    const base = subtotal + frete;
    return (base * (ipi + icms + pisCofins)) / 100;
  }, [subtotal, frete, ipi, icms, pisCofins]);

  const valorDesconto = useMemo(() => {
    return (subtotal + frete + valorImpostos) * (desconto / 100);
  }, [subtotal, frete, valorImpostos, desconto]);

  const totalGeral = useMemo(() => {
    return Math.max(0, subtotal + frete + valorImpostos - valorDesconto);
  }, [subtotal, frete, valorImpostos, valorDesconto]);

  const toggleFornecedor = useCallback((id: string) => {
    setFornecedorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleSolicitacaoChange = useCallback(
    (id: string) => {
      setSolicitacaoId(id);
      const req = purchaseRequests.find((r) => r.id === id);
      if (req) setItens(buildItensFromRequest(req));
      else setItens([]);
    },
    [purchaseRequests, buildItensFromRequest]
  );

  const handlePrecoChange = useCallback((itemId: string, valor: number) => {
    setItens((prev) =>
      prev.map((i) =>
        i.id === itemId ? { ...i, precoUnitario: valor } : i
      )
    );
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length) return;
      setIsUploading(true);
      try {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await api.uploadQuotationAttachment(files[i]);
          urls.push(url);
        }
        setAnexos((prev) => [...prev, ...urls]);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar anexo');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    },
    []
  );

  const removeAnexo = useCallback((url: string) => {
    setAnexos((prev) => prev.filter((u) => u !== url));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!solicitacaoId || fornecedorIds.length === 0 || prazoEntrega <= 0) {
      toast.error('Selecione solicitação, ao menos um fornecedor e informe o prazo de entrega');
      return;
    }
    const request = purchaseRequests.find((r) => r.id === solicitacaoId);
    if (!request) return;

    setIsCreating(true);
    let createdCount = 0;
    try {
      for (const fornecedorId of fornecedorIds) {
        const itensParaCotacao = itens.map((i) => ({
          id: crypto.randomUUID(),
          cotacaoId: '',
          itemSolicitacaoId: i.itemSolicitacaoId,
          descricao: i.descricao,
          quantidade: i.quantidade,
          unidadeMedida: i.unidadeMedida,
          precoUnitario: i.precoUnitario,
          observacoes: i.observacoes,
        }));

        const cotacao = await api.quotations.create({
          solicitacaoId,
          fornecedorId,
          moedaId: moedaId || currencies[0]?.id || '',
          formaPagamento: formaPagamento || undefined,
          condicoesPagamento: condicoesPagamento || undefined,
          prazoEntrega,
          dataPrevisaoEntrega: dataPrevisaoEntrega ?? undefined,
          frete: frete || undefined,
          desconto: desconto || undefined,
          ipi: ipi || undefined,
          icms: icms || undefined,
          pisCofins: pisCofins || undefined,
          observacoes: observacoes || undefined,
          status: 'draft',
          itens: itensParaCotacao,
          linkPreenchimento: crypto.randomUUID(),
          anexos: anexos.length > 0 ? anexos : undefined,
          totalGeral,
        });
        if (cotacao) createdCount++;
      }
      await refreshPurchases();
      toast.success(
        createdCount === fornecedorIds.length
          ? `${createdCount} cotação(ões) criada(s) com sucesso`
          : `${createdCount} de ${fornecedorIds.length} cotação(ões) criada(s)`
      );
      onSuccess();
    } finally {
      setIsCreating(false);
    }
  }, [
    solicitacaoId,
    fornecedorIds,
    prazoEntrega,
    itens,
    moedaId,
    currencies,
    formaPagamento,
    condicoesPagamento,
    dataPrevisaoEntrega,
    frete,
    desconto,
    ipi,
    icms,
    pisCofins,
    observacoes,
    anexos,
    totalGeral,
    purchaseRequests,
    refreshPurchases,
    onSuccess,
  ]);

  const canCreate = solicitacaoId && fornecedorIds.length > 0 && prazoEntrega > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
          <CardTitle>Nova Cotação</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Solicitação vinculada</Label>
            <Select
              value={solicitacaoId}
              onValueChange={handleSolicitacaoChange}
              disabled={!!solicitacaoIdPreenchido}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a solicitação" />
              </SelectTrigger>
              <SelectContent>
                {approvedRequests.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    #{r.id.slice(0, 8)} — {r.itens.length} item(ns)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Fornecedores *</Label>
            <Popover open={supplierPopoverOpen} onOpenChange={setSupplierPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {fornecedorIds.length > 0
                    ? `${fornecedorIds.length} fornecedor(es) selecionado(s)`
                    : 'Selecione os fornecedores'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar fornecedor..." />
                  <CommandList>
                    <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                    <CommandGroup>
                      {activeSuppliers.map((s) => (
                        <CommandItem
                          key={s.id}
                          onSelect={() => toggleFornecedor(s.id)}
                        >
                          <Checkbox
                            checked={fornecedorIds.includes(s.id)}
                            onCheckedChange={() => toggleFornecedor(s.id)}
                          />
                          <span className="ml-2">{s.razaoSocial}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {fornecedorIds.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {fornecedorIds.map((id) => {
                  const s = suppliers.find((x) => x.id === id);
                  return (
                    <Badge
                      key={id}
                      variant="secondary"
                      className="gap-1"
                    >
                      {s?.razaoSocial ?? id.slice(0, 8)}
                      <button
                        type="button"
                        onClick={() => toggleFornecedor(id)}
                        className="ml-1 hover:bg-muted rounded"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="grid gap-2">
            <Label>Moeda</Label>
            <Select value={moedaId} onValueChange={setMoedaId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.simbolo} {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>Prazo de entrega (dias) *</Label>
            <Input
              type="number"
              min={1}
              value={prazoEntrega || ''}
              onChange={(e) => setPrazoEntrega(parseInt(e.target.value) || 0)}
              placeholder="Ex: 15"
            />
          </div>
          <div className="grid gap-2">
            <Label>Data prevista de entrega</Label>
            <Input
              value={
                dataPrevisaoEntrega
                  ? format(new Date(dataPrevisaoEntrega), 'dd/MM/yyyy', { locale: ptBR })
                  : '—'
              }
              readOnly
              className="bg-muted"
            />
          </div>
          <div className="grid gap-2">
            <Label>Forma de pagamento</Label>
            <Select value={formaPagamento || 'none'} onValueChange={(v) => setFormaPagamento(v === 'none' ? '' : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a forma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">—</SelectItem>
                <SelectItem value="Boleto">Boleto</SelectItem>
                <SelectItem value="PIX">PIX</SelectItem>
                <SelectItem value="Transferência bancária">Transferência bancária</SelectItem>
                <SelectItem value="Cartão de crédito">Cartão de crédito</SelectItem>
                <SelectItem value="Cartão de débito">Cartão de débito</SelectItem>
                <SelectItem value="Débito em conta">Débito em conta</SelectItem>
                <SelectItem value="Cheque">Cheque</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <Label>Condições de pagamento</Label>
            <Input
              value={condicoesPagamento}
              onChange={(e) => setCondicoesPagamento(e.target.value)}
              placeholder="Ex: 30/60/90 dias"
            />
          </div>
          <div className="grid gap-2">
            <Label>Frete (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={frete || ''}
              onChange={(e) => setFrete(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="grid gap-2">
            <Label>Desconto (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={desconto || ''}
              onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2">
            <Label>IPI (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={ipi || ''}
              onChange={(e) => setIpi(parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="grid gap-2">
            <Label>ICMS (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={icms || ''}
              onChange={(e) => setIcms(parseFloat(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="grid gap-2 md:w-48">
          <Label>PIS/COFINS (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            step={0.01}
            value={pisCofins || ''}
            onChange={(e) => setPisCofins(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div className="grid gap-2">
          <Label>Observações</Label>
          <Textarea
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid gap-2">
          <Label>Anexos</Label>
          <Input
            type="file"
            multiple
            onChange={handleFileUpload}
            disabled={isUploading}
          />
          {anexos.length > 0 && (
            <ul className="text-sm text-muted-foreground space-y-1 mt-2">
              {anexos.map((url) => (
                <li key={url} className="flex items-center gap-2">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline truncate max-w-md"
                  >
                    {url.split('/').pop() ?? url}
                  </a>
                  <button
                    type="button"
                    onClick={() => removeAnexo(url)}
                    className="text-destructive hover:underline"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {selectedRequest && itens.length > 0 && (
          <div className="space-y-2">
            <Label>Tabela de itens da solicitação</Label>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Descrição</th>
                    <th className="text-center p-2 font-medium w-20">Qtd</th>
                    <th className="text-center p-2 font-medium w-16">Und</th>
                    <th className="text-left p-2 font-medium">Obs</th>
                    <th className="text-right p-2 font-medium w-28">Preço unit.</th>
                    <th className="text-right p-2 font-medium w-28">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const totalItem = (item.precoUnitario ?? 0) * item.quantidade;
                    return (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-2">{item.descricao}</td>
                        <td className="p-2 text-center">{item.quantidade}</td>
                        <td className="p-2 text-center">{item.unidadeMedida}</td>
                        <td className="p-2 text-muted-foreground">
                          {item.observacoes || '—'}
                        </td>
                        <td className="p-2 text-right">
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-8 w-24 text-right"
                            value={item.precoUnitario || ''}
                            onChange={(e) =>
                              handlePrecoChange(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        </td>
                        <td className="p-2 text-right font-medium">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(totalItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col items-end gap-1 pt-2 text-sm">
              <div className="flex justify-end gap-4">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(subtotal)}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-muted-foreground">+ Frete:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(frete)}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-muted-foreground">+ Impostos:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(valorImpostos)}
                </span>
              </div>
              <div className="flex justify-end gap-4">
                <span className="text-muted-foreground">- Desconto:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(valorDesconto)}
                </span>
              </div>
              <div className="flex justify-end gap-4 font-bold border-t pt-2">
                <span>Total geral:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalGeral)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onBack}>
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={!canCreate || isCreating}
          >
            {isCreating ? 'Criando...' : `Criar Cotação(ões) (${fornecedorIds.length})`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
