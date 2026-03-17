import { useMemo, useState, useCallback, useEffect } from 'react';
import { usePurchases } from '@/contexts/PurchaseContext';
import { api } from '@/utils/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Send, Check, X, Copy, Paperclip } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Quotation, QuotationStatus } from '@/types/purchases';

const STATUS_LABELS: Record<QuotationStatus, { label: string; className: string }> = {
  draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground border-border' },
  sent: { label: 'Enviada', className: 'bg-blue-50 text-blue-700 border-blue-300' },
  responded: { label: 'Respondida', className: 'bg-green-50 text-green-700 border-green-300' },
  approved: { label: 'Aprovada', className: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  rejected: { label: 'Rejeitada', className: 'bg-red-50 text-red-700 border-red-300' },
};

interface PurchaseAuditLog {
  id: string;
  timestamp: string;
  type: string;
  action: string;
  userId: string;
  userName: string;
  userRole: string;
  entityId?: string;
  details?: Record<string, unknown>;
}

interface QuotationDetailPageProps {
  quotationId: string;
  onBack: () => void;
}

export function QuotationDetailPage({ quotationId, onBack }: QuotationDetailPageProps) {
  const {
    quotations,
    suppliers,
    currencies,
    purchaseRequests,
    updateQuotation,
    updateQuotationStatus,
    refreshPurchases,
  } = usePurchases();

  const quotation = useMemo(
    () => quotations.find((q) => q.id === quotationId),
    [quotations, quotationId]
  );

  const [auditLogs, setAuditLogs] = useState<PurchaseAuditLog[]>([]);
  const [localFrete, setLocalFrete] = useState<number>(0);
  const [localDesconto, setLocalDesconto] = useState<number>(0);
  const [localIpi, setLocalIpi] = useState<number>(0);
  const [localIcms, setLocalIcms] = useState<number>(0);
  const [localPisCofins, setLocalPisCofins] = useState<number>(0);
  const [localItens, setLocalItens] = useState<{ id: string; precoUnitario: number }[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const supplier = useMemo(
    () => suppliers.find((s) => s.id === quotation?.fornecedorId),
    [suppliers, quotation]
  );

  const currency = useMemo(
    () => currencies.find((c) => c.id === quotation?.moedaId),
    [currencies, quotation]
  );

  const isDraft = quotation?.status === 'draft';

  const subtotal = useMemo(() => {
    if (!quotation) return 0;
    return quotation.itens.reduce(
      (s, i) => s + ((i.precoUnitario ?? 0) * i.quantidade),
      0
    );
  }, [quotation]);

  const freteVal = isDraft ? localFrete : (quotation?.frete ?? 0);
  const descontoVal = isDraft ? localDesconto : (quotation?.desconto ?? 0);
  const ipiVal = isDraft ? localIpi : (quotation?.ipi ?? 0);
  const icmsVal = isDraft ? localIcms : (quotation?.icms ?? 0);
  const pisCofinsVal = isDraft ? localPisCofins : (quotation?.pisCofins ?? 0);

  const valorImpostos = useMemo(() => {
    const base = subtotal + freteVal;
    return (base * (ipiVal + icmsVal + pisCofinsVal)) / 100;
  }, [subtotal, freteVal, ipiVal, icmsVal, pisCofinsVal]);

  const valorDesconto = useMemo(() => {
    return (subtotal + freteVal + valorImpostos) * (descontoVal / 100);
  }, [subtotal, freteVal, valorImpostos, descontoVal]);

  const totalGeral = useMemo(() => {
    return Math.max(0, subtotal + freteVal + valorImpostos - valorDesconto);
  }, [subtotal, freteVal, valorImpostos, valorDesconto]);

  useEffect(() => {
    if (quotation) {
      setLocalFrete(quotation.frete ?? 0);
      setLocalDesconto(quotation.desconto ?? 0);
      setLocalIpi(quotation.ipi ?? 0);
      setLocalIcms(quotation.icms ?? 0);
      setLocalPisCofins(quotation.pisCofins ?? 0);
      setLocalItens(
        quotation.itens.map((i) => ({
          id: i.id,
          precoUnitario: i.precoUnitario ?? 0,
        }))
      );
    }
  }, [quotation]);

  useEffect(() => {
    api.purchaseAuditLogs
      .getByEntity(quotationId, 'quotation')
      .then((data: PurchaseAuditLog[]) => setAuditLogs(Array.isArray(data) ? data : []))
      .catch(() => setAuditLogs([]));
  }, [quotationId]);

  const handleCopyLink = useCallback(() => {
    if (quotation?.linkPreenchimento) {
      navigator.clipboard.writeText(
        `${window.location.origin}/cotacao/${quotation.linkPreenchimento}`
      );
      toast.success('Link copiado para a área de transferência');
    }
  }, [quotation]);

  const handleEnviar = useCallback(async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      await updateQuotationStatus(quotation.id, 'sent', {
        linkPreenchimento: crypto.randomUUID(),
      });
      await refreshPurchases();
    } finally {
      setIsUpdating(false);
    }
  }, [quotation, updateQuotationStatus, refreshPurchases]);

  const handleMarcarRespondida = useCallback(async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      await updateQuotationStatus(quotation.id, 'responded');
      await refreshPurchases();
    } finally {
      setIsUpdating(false);
    }
  }, [quotation, updateQuotationStatus, refreshPurchases]);

  const handleAprovar = useCallback(async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      await updateQuotationStatus(quotation.id, 'approved');
      await refreshPurchases();
    } finally {
      setIsUpdating(false);
    }
  }, [quotation, updateQuotationStatus, refreshPurchases]);

  const handleRejeitar = useCallback(async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      await updateQuotationStatus(quotation.id, 'rejected');
      await refreshPurchases();
    } finally {
      setIsUpdating(false);
    }
  }, [quotation, updateQuotationStatus, refreshPurchases]);

  const handleSalvarDraft = useCallback(async () => {
    if (!quotation) return;
    setIsUpdating(true);
    try {
      const itensAtualizados = quotation.itens.map((item) => {
        const local = localItens.find((l) => l.id === item.id);
        return {
          ...item,
          precoUnitario: local?.precoUnitario ?? item.precoUnitario,
        };
      });
      await updateQuotation(quotation.id, {
        frete: localFrete,
        desconto: localDesconto,
        ipi: localIpi,
        icms: localIcms,
        pisCofins: localPisCofins,
        itens: itensAtualizados,
      });
      await refreshPurchases();
    } finally {
      setIsUpdating(false);
    }
  }, [
    quotation,
    localFrete,
    localDesconto,
    localIpi,
    localIcms,
    localPisCofins,
    localItens,
    updateQuotation,
    refreshPurchases,
  ]);

  const handlePrecoChange = useCallback((itemId: string, valor: number) => {
    setLocalItens((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, precoUnitario: valor } : i))
    );
  }, []);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files?.length || !quotation) return;
      setIsUploading(true);
      try {
        const urls: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const url = await api.uploadQuotationAttachment(files[i]);
          urls.push(url);
        }
        const anexosAtuais = quotation.anexos ?? [];
        await updateQuotation(quotation.id, {
          anexos: [...anexosAtuais, ...urls],
        });
        await refreshPurchases();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Erro ao enviar anexo');
      } finally {
        setIsUploading(false);
        e.target.value = '';
      }
    },
    [quotation, updateQuotation, refreshPurchases]
  );

  if (!quotation) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Cotação não encontrada.
          <Button variant="link" onClick={onBack} className="ml-2">
            Voltar
          </Button>
        </CardContent>
      </Card>
    );
  }

  const statusConfig = STATUS_LABELS[quotation.status];
  const showLink = quotation.status === 'sent' || quotation.status === 'responded';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <span className="font-mono font-medium">
              Cotação #{quotation.id.slice(0, 8)}
            </span>
            <Badge variant="outline" className={statusConfig.className}>
              {statusConfig.label}
            </Badge>
            <span className="text-muted-foreground">
              {supplier?.razaoSocial ?? '—'} •{' '}
              {format(new Date(quotation.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {quotation.status === 'draft' && (
              <>
                <Button size="sm" variant="outline" onClick={handleSalvarDraft} disabled={isUpdating}>
                  Salvar
                </Button>
                <Button size="sm" onClick={handleEnviar} disabled={isUpdating}>
                  <Send className="h-4 w-4 mr-1" /> Enviar para fornecedor
                </Button>
              </>
            )}
            {quotation.status === 'sent' && (
              <Button size="sm" onClick={handleMarcarRespondida} disabled={isUpdating}>
                Marcar como respondida
              </Button>
            )}
            {quotation.status === 'responded' && (
              <>
                <Button size="sm" variant="outline" onClick={handleRejeitar} disabled={isUpdating}>
                  <X className="h-4 w-4 mr-1" /> Rejeitar
                </Button>
                <Button size="sm" onClick={handleAprovar} disabled={isUpdating}>
                  <Check className="h-4 w-4 mr-1" /> Aprovar
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="font-medium mb-2">Dados financeiros</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>
                  {currency?.simbolo ?? 'R$'}{' '}
                  {new Intl.NumberFormat('pt-BR').format(subtotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Frete:</span>
                {isDraft ? (
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    className="h-8 w-28 text-right"
                    value={localFrete || ''}
                    onChange={(e) => setLocalFrete(parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span>
                    {currency?.simbolo ?? 'R$'}{' '}
                    {new Intl.NumberFormat('pt-BR').format(freteVal)}
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Desconto (%):</span>
                {isDraft ? (
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.01}
                    className="h-8 w-20 text-right"
                    value={localDesconto || ''}
                    onChange={(e) => setLocalDesconto(parseFloat(e.target.value) || 0)}
                  />
                ) : (
                  <span>{descontoVal}%</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">IPI / ICMS / PIS-COFINS (%):</span>
                {isDraft ? (
                  <span className="flex gap-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="h-8 w-16 text-right"
                      value={localIpi || ''}
                      onChange={(e) => setLocalIpi(parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="h-8 w-16 text-right"
                      value={localIcms || ''}
                      onChange={(e) => setLocalIcms(parseFloat(e.target.value) || 0)}
                    />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      className="h-8 w-16 text-right"
                      value={localPisCofins || ''}
                      onChange={(e) => setLocalPisCofins(parseFloat(e.target.value) || 0)}
                    />
                  </span>
                ) : (
                  <span>
                    {ipiVal}% / {icmsVal}% / {pisCofinsVal}%
                  </span>
                )}
              </div>
              <div className="flex justify-between font-bold border-t pt-2">
                <span>Total geral:</span>
                <span>
                  {currency?.simbolo ?? 'R$'}{' '}
                  {new Intl.NumberFormat('pt-BR').format(totalGeral)}
                </span>
              </div>
              <div className="text-muted-foreground text-xs">
                Moeda: {currency?.simbolo} {currency?.nome}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Entrega e pagamento</h3>
            <div className="space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Prazo:</span>{' '}
                {quotation.prazoEntrega ?? '—'} dias
              </p>
              <p>
                <span className="text-muted-foreground">Data prevista:</span>{' '}
                {quotation.dataPrevisaoEntrega
                  ? format(new Date(quotation.dataPrevisaoEntrega), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })
                  : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Forma de pagamento:</span>{' '}
                {quotation.formaPagamento || '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Condições:</span>{' '}
                {quotation.condicoesPagamento || '—'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-2">Tabela de itens</h3>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium">Descrição</th>
                  <th className="text-center p-2 font-medium w-20">Qtd</th>
                  <th className="text-center p-2 font-medium w-16">Und</th>
                  <th className="text-right p-2 font-medium w-28">Preço unit.</th>
                  <th className="text-right p-2 font-medium w-28">Total</th>
                </tr>
              </thead>
              <tbody>
                {quotation.itens.map((item) => {
                  const preco =
                    isDraft
                      ? localItens.find((l) => l.id === item.id)?.precoUnitario ??
                        item.precoUnitario ??
                        0
                      : (item.precoUnitario ?? 0);
                  const totalItem = preco * item.quantidade;
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="p-2">{item.descricao}</td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-center">{item.unidadeMedida}</td>
                      <td className="p-2 text-right">
                        {isDraft ? (
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            className="h-8 w-24 text-right"
                            value={preco || ''}
                            onChange={(e) =>
                              handlePrecoChange(
                                item.id,
                                parseFloat(e.target.value) || 0
                              )
                            }
                          />
                        ) : (
                          new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          }).format(preco)
                        )}
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
        </div>

        {showLink && quotation.linkPreenchimento && (
          <div>
            <h3 className="font-medium mb-2">Link para fornecedor</h3>
            <div className="flex gap-2">
              <Input
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/cotacao/${quotation.linkPreenchimento}`}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <div>
          <h3 className="font-medium mb-2">Anexos</h3>
          <div className="flex flex-col gap-2">
            <Input
              type="file"
              multiple
              onChange={handleFileUpload}
              disabled={isUploading}
            />
            {(quotation.anexos ?? []).length > 0 && (
              <ul className="text-sm space-y-1">
                {quotation.anexos!.map((url) => (
                  <li key={url} className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline truncate max-w-md"
                    >
                      {url.split('/').pop() ?? url}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {auditLogs.length > 0 && (
          <div>
            <h3 className="font-medium mb-2">Log de alterações</h3>
            <div className="rounded-md border overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-2 font-medium">Data/Hora</th>
                    <th className="text-left p-2 font-medium">Usuário</th>
                    <th className="text-left p-2 font-medium">Ação</th>
                    <th className="text-left p-2 font-medium">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0">
                      <td className="p-2">
                        {format(new Date(log.timestamp), 'dd/MM/yyyy HH:mm', {
                          locale: ptBR,
                        })}
                      </td>
                      <td className="p-2">
                        {log.userName} ({log.userRole})
                      </td>
                      <td className="p-2">{log.action}</td>
                      <td className="p-2 text-muted-foreground">
                        {log.details
                          ? JSON.stringify(log.details)
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
