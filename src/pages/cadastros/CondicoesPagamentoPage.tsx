/**
 * CondicoesPagamentoPage — CRUD modular com wizard e simulacao.
 *
 * Estrutura:
 *  - Lista (DataTable)
 *  - Botao "Nova condicao" abre Dialog amplo com:
 *     - Form a esquerda (campos condicionais por tipo)
 *     - Painel de simulacao a direita (vencimentos + valores)
 */
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCrud } from '@/hooks/useCrud';
import { usePermissao } from '@/hooks/usePermissao';
import { SemAcesso } from '@/components/crud/SemAcesso';
import {
  PERIODICIDADE_DIAS,
  PERIODICIDADE_LABEL,
  TIPO_CONDICAO_LABEL,
  resumoCondicao,
  simularParcelas,
} from '@/lib/condicaoPagamento';
import type {
  CondicaoPagamento,
  PeriodicidadeCondicaoPagamento,
  TipoCondicaoPagamento,
} from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DATA = new Intl.DateTimeFormat('pt-BR');

export function CondicoesPagamentoPage() {
  const { podeLer, podeEscrever, podeExcluir } = usePermissao('cadastros.condicoes-pagamento');

  const { itens, isLoading, criar, atualizar, excluir } = useCrud<CondicaoPagamento>(
    'condicoes_pagamento',
    { ordenarPor: 'codigo' },
  );

  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<CondicaoPagamento | null>(null);
  const [excluindo, setExcluindo] = useState<CondicaoPagamento | null>(null);

  if (!podeLer) return <SemAcesso rotaCodigo="cadastros.condicoes-pagamento" />;

  function abrirNovo() {
    setEditando(null);
    setDialogAberto(true);
  }

  function abrirEdicao(item: CondicaoPagamento) {
    setEditando(item);
    setDialogAberto(true);
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Condicoes de Pagamento</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Modelos de pagamento (a vista, parcelado, recorrente) usados em pedidos e contratos
          </p>
        </div>
        {podeEscrever && (
          <Button onClick={abrirNovo}>
            <Plus className="h-4 w-4 mr-1.5" />
            Nova condicao
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-44">Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead className="w-32">Tipo</TableHead>
                <TableHead>Resumo</TableHead>
                <TableHead className="text-center w-24">Status</TableHead>
                <TableHead className="text-right w-32">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {itens.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhuma condicao cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                itens.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <span className="font-mono text-sm">{c.codigo}</span>
                    </TableCell>
                    <TableCell className="font-medium">{c.nome}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {TIPO_CONDICAO_LABEL[c.tipo]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {resumoCondicao(c)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={c.ativo ? 'default' : 'outline'}>
                        {c.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {podeEscrever && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEdicao(c)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {podeExcluir && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExcluindo(c)}
                            title="Excluir"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {dialogAberto && (
        <DialogCondicao
          condicao={editando}
          aoFechar={() => {
            setDialogAberto(false);
            setEditando(null);
          }}
          aoSalvar={async (payload) => {
            const ok = editando
              ? await atualizar(editando.id, payload)
              : await criar(payload);
            if (ok) {
              setDialogAberto(false);
              setEditando(null);
            }
          }}
        />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir condicao?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (excluindo) {
                  const ok = await excluir(excluindo.id);
                  if (ok) setExcluindo(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Dialog: form modular + simulacao
// ============================================================================

interface FormState {
  codigo: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  tipo: TipoCondicaoPagamento;
  periodicidade: PeriodicidadeCondicaoPagamento | null;
  intervaloDias: number;
  qtdParcelas: number;
  primeiroVencDias: number;
  ehIndefinido: boolean;
}

const PADRAO: FormState = {
  codigo: '',
  nome: '',
  descricao: '',
  ativo: true,
  tipo: 'a_vista',
  periodicidade: null,
  intervaloDias: 0,
  qtdParcelas: 1,
  primeiroVencDias: 0,
  ehIndefinido: false,
};

function DialogCondicao({
  condicao,
  aoSalvar,
  aoFechar,
}: {
  condicao: CondicaoPagamento | null;
  aoSalvar: (payload: Partial<CondicaoPagamento>) => Promise<void>;
  aoFechar: () => void;
}) {
  const [form, setForm] = useState<FormState>(() =>
    condicao
      ? {
          codigo: condicao.codigo,
          nome: condicao.nome,
          descricao: condicao.descricao ?? '',
          ativo: condicao.ativo,
          tipo: condicao.tipo,
          periodicidade: condicao.periodicidade,
          intervaloDias: condicao.intervaloDias,
          qtdParcelas: condicao.qtdParcelas ?? 1,
          primeiroVencDias: condicao.primeiroVencDias,
          ehIndefinido: condicao.ehIndefinido,
        }
      : PADRAO,
  );
  const [salvando, setSalvando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Simulacao
  const [valorSim, setValorSim] = useState(1000);
  const [dataSim, setDataSim] = useState(() => new Date().toISOString().slice(0, 10));

  function setCampo<K extends keyof FormState>(chave: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [chave]: valor }));
  }

  // Reage a mudanca de tipo
  function mudarTipo(novo: TipoCondicaoPagamento) {
    if (novo === 'a_vista') {
      setForm((prev) => ({
        ...prev,
        tipo: 'a_vista',
        periodicidade: null,
        intervaloDias: 0,
        qtdParcelas: 1,
        primeiroVencDias: 0,
        ehIndefinido: false,
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        tipo: novo,
        periodicidade: prev.periodicidade ?? 'mensal',
        intervaloDias:
          prev.periodicidade === 'customizada'
            ? prev.intervaloDias
            : PERIODICIDADE_DIAS[
                (prev.periodicidade ?? 'mensal') as Exclude<
                  PeriodicidadeCondicaoPagamento,
                  'customizada'
                >
              ],
        qtdParcelas: novo === 'parcelado' && prev.qtdParcelas < 2 ? 2 : prev.qtdParcelas,
        primeiroVencDias: prev.primeiroVencDias === 0 ? 30 : prev.primeiroVencDias,
        ehIndefinido: novo === 'recorrente' ? prev.ehIndefinido : false,
      }));
    }
  }

  function mudarPeriodicidade(p: PeriodicidadeCondicaoPagamento) {
    if (p === 'customizada') {
      setForm((prev) => ({ ...prev, periodicidade: p }));
    } else {
      setForm((prev) => ({
        ...prev,
        periodicidade: p,
        intervaloDias: PERIODICIDADE_DIAS[p],
      }));
    }
  }

  // Valida o form
  function validar(): boolean {
    const e: Record<string, string> = {};
    if (!form.codigo.trim()) e.codigo = 'Obrigatorio';
    if (!form.nome.trim()) e.nome = 'Obrigatorio';
    if (form.tipo === 'parcelado') {
      if (form.qtdParcelas < 1) e.qtdParcelas = 'Minimo 1';
    }
    if (form.tipo === 'recorrente' && !form.ehIndefinido) {
      if (form.qtdParcelas < 1) e.qtdParcelas = 'Minimo 1 (ou marque indefinido)';
    }
    if (form.tipo !== 'a_vista' && !form.periodicidade) {
      e.periodicidade = 'Obrigatorio';
    }
    if (form.periodicidade === 'customizada' && form.intervaloDias < 1) {
      e.intervaloDias = 'Minimo 1';
    }
    if (form.primeiroVencDias < 0) e.primeiroVencDias = 'Nao pode ser negativo';
    setErros(e);
    return Object.keys(e).length === 0;
  }

  async function handleSalvar() {
    if (!validar()) return;
    setSalvando(true);
    try {
      await aoSalvar({
        codigo: form.codigo.trim(),
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        ativo: form.ativo,
        tipo: form.tipo,
        periodicidade: form.tipo === 'a_vista' ? null : form.periodicidade,
        intervaloDias: form.tipo === 'a_vista' ? 0 : form.intervaloDias,
        qtdParcelas:
          form.tipo === 'recorrente' && form.ehIndefinido ? null : form.qtdParcelas,
        primeiroVencDias: form.primeiroVencDias,
        ehIndefinido: form.tipo === 'recorrente' ? form.ehIndefinido : false,
      });
    } finally {
      setSalvando(false);
    }
  }

  // Simulacao em tempo real
  const parcelas = useMemo(() => {
    if (!dataSim) return [];
    const d = new Date(dataSim + 'T00:00:00');
    if (Number.isNaN(d.getTime())) return [];
    if (!Number.isFinite(valorSim) || valorSim < 0) return [];
    try {
      return simularParcelas(
        {
          tipo: form.tipo,
          intervaloDias: form.intervaloDias,
          qtdParcelas: form.qtdParcelas,
          primeiroVencDias: form.primeiroVencDias,
          ehIndefinido: form.ehIndefinido,
        },
        d,
        valorSim,
      );
    } catch {
      return [];
    }
  }, [form, valorSim, dataSim]);

  // ESC para fechar
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [aoFechar]);

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{condicao ? 'Editar condicao' : 'Nova condicao'}</DialogTitle>
          <DialogDescription>
            Defina como o pagamento sera estruturado e veja a simulacao ao lado
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-2">
          {/* ---------------- COLUNA ESQUERDA: FORM ---------------- */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>
                  Codigo <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.codigo}
                  onChange={(e) => setCampo('codigo', e.target.value)}
                  placeholder="a_vista, 30_60_90..."
                />
                {erros.codigo && <p className="text-xs text-red-500">{erros.codigo}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setCampo('nome', e.target.value)}
                  placeholder="A vista, 30/60/90..."
                />
                {erros.nome && <p className="text-xs text-red-500">{erros.nome}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descricao</Label>
              <Textarea
                rows={2}
                value={form.descricao}
                onChange={(e) => setCampo('descricao', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Tipo <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {(['a_vista', 'parcelado', 'recorrente'] as TipoCondicaoPagamento[]).map(
                  (t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => mudarTipo(t)}
                      className={`rounded-md border-2 p-3 text-sm text-left transition ${
                        form.tipo === t
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="font-medium">{TIPO_CONDICAO_LABEL[t]}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {t === 'a_vista' && 'Pagamento no ato'}
                        {t === 'parcelado' && 'N parcelas com fim'}
                        {t === 'recorrente' && 'Cobranca recorrente'}
                      </div>
                    </button>
                  ),
                )}
              </div>
            </div>

            {form.tipo !== 'a_vista' && (
              <>
                <div className="space-y-1.5">
                  <Label>
                    Periodicidade <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.periodicidade ?? undefined}
                    onValueChange={(v) =>
                      mudarPeriodicidade(v as PeriodicidadeCondicaoPagamento)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(
                        [
                          'diaria',
                          'semanal',
                          'quinzenal',
                          'mensal',
                          'bimestral',
                          'trimestral',
                          'semestral',
                          'anual',
                          'customizada',
                        ] as PeriodicidadeCondicaoPagamento[]
                      ).map((p) => (
                        <SelectItem key={p} value={p}>
                          {PERIODICIDADE_LABEL[p]}
                          {p !== 'customizada' && (
                            <span className="text-muted-foreground text-xs ml-2">
                              ({PERIODICIDADE_DIAS[p]}d)
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {erros.periodicidade && (
                    <p className="text-xs text-red-500">{erros.periodicidade}</p>
                  )}
                </div>

                {form.periodicidade === 'customizada' && (
                  <div className="space-y-1.5">
                    <Label>
                      Intervalo (dias) <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      value={form.intervaloDias}
                      onChange={(e) => setCampo('intervaloDias', Number(e.target.value))}
                    />
                    {erros.intervaloDias && (
                      <p className="text-xs text-red-500">{erros.intervaloDias}</p>
                    )}
                  </div>
                )}

                {form.tipo === 'recorrente' && (
                  <div className="flex items-center justify-between rounded-md border border-border p-3">
                    <div>
                      <Label className="text-sm">Sem data fim (indefinido)</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Cobra continuamente ate ser cancelado
                      </p>
                    </div>
                    <Switch
                      checked={form.ehIndefinido}
                      onCheckedChange={(v) => setCampo('ehIndefinido', v)}
                    />
                  </div>
                )}

                {!(form.tipo === 'recorrente' && form.ehIndefinido) && (
                  <div className="space-y-1.5">
                    <Label>
                      {form.tipo === 'parcelado' ? 'Quantidade de parcelas' : 'Quantidade de cobrancas'}{' '}
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min={form.tipo === 'parcelado' ? 1 : 1}
                      value={form.qtdParcelas}
                      onChange={(e) => setCampo('qtdParcelas', Number(e.target.value))}
                    />
                    {erros.qtdParcelas && (
                      <p className="text-xs text-red-500">{erros.qtdParcelas}</p>
                    )}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Primeiro vencimento (dias apos emissao)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={form.primeiroVencDias}
                    onChange={(e) => setCampo('primeiroVencDias', Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    0 = no ato; 30 = primeira parcela em 30 dias
                  </p>
                  {erros.primeiroVencDias && (
                    <p className="text-xs text-red-500">{erros.primeiroVencDias}</p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setCampo('ativo', v)} />
              <Label>Ativa</Label>
            </div>
          </div>

          {/* ---------------- COLUNA DIREITA: SIMULACAO ---------------- */}
          <div className="space-y-3">
            <div className="rounded-md border border-border p-4 space-y-3">
              <h3 className="font-semibold text-sm">Simulacao</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Data emissao</Label>
                  <Input
                    type="date"
                    value={dataSim}
                    onChange={(e) => setDataSim(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Valor (R$)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={valorSim}
                    onChange={(e) => setValorSim(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                {form.tipo === 'recorrente' && form.ehIndefinido && (
                  <span>Mostrando primeiras 12 cobrancas (indefinido)</span>
                )}
              </div>
            </div>

            <div className="rounded-md border border-border overflow-hidden max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parcelas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Configure os parametros para ver a simulacao.
                      </TableCell>
                    </TableRow>
                  ) : (
                    parcelas.map((p) => (
                      <TableRow key={p.numero}>
                        <TableCell className="text-center font-mono text-xs">
                          {p.numero}
                        </TableCell>
                        <TableCell className="text-sm">
                          {Number.isNaN(p.vencimento.getTime())
                            ? '—'
                            : FMT_DATA.format(p.vencimento)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {FMT_BRL.format(p.valor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {parcelas.length > 0 && (
              <div className="text-xs text-muted-foreground flex justify-between px-1">
                <span>{parcelas.length} parcela(s)</span>
                <span>
                  Total:{' '}
                  <strong>
                    {FMT_BRL.format(parcelas.reduce((acc, p) => acc + p.valor, 0))}
                  </strong>
                </span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
