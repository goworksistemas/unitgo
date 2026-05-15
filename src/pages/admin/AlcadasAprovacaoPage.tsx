/**
 * AlcadasAprovacaoPage — define quem aprova requisicoes/pedidos por escopo.
 *
 * Existem DUAS camadas de aprovacao no sistema:
 *
 *  1. **Requisicao** (`escopo = 'requisicao'`) — aprovacao tecnica do gestor.
 *     Quem aprova: o gestor do(s) departamento(s) do solicitante.
 *     **Nao depende de valor** — o gestor responsavel aprova qualquer
 *     requisicao do seu time.
 *
 *  2. **Pedido** (`escopo = 'pedido'`) — aprovacao por alcada de valor.
 *     Pedido de compra ja cotado precisa de aprovador da diretoria de acordo
 *     com a faixa `[valor_limite_min, valor_limite_max]`. Departamentos sao
 *     opcionais (alcada pode ser global ou restrita).
 *
 * O formulario muda os campos exibidos conforme o escopo selecionado.
 */
import { useEffect, useMemo, useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
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
import { ApiError, crud, supabase } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import type {
  AlcadaAprovacao,
  AlcadaAprovacaoDepartamento,
  Departamento,
  EscopoAlcada,
  Usuario,
} from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

function formatBRL(v: number | null | undefined): string {
  if (v === null || v === undefined) return '—';
  return FMT_BRL.format(Number(v));
}

interface FormState {
  escopo: EscopoAlcada;
  aprovadorTipo: 'usuario' | 'perfil';
  usuarioId: string;
  perfilAprovador: string;
  valorLimiteMin: string;
  valorLimiteMax: string;
  departamentosIds: string[];
  ativo: boolean;
}

const FORM_INICIAL: FormState = {
  escopo: 'requisicao',
  aprovadorTipo: 'usuario',
  usuarioId: '',
  perfilAprovador: '',
  valorLimiteMin: '0',
  valorLimiteMax: '',
  departamentosIds: [],
  ativo: true,
};

export function AlcadasAprovacaoPage() {
  const { podeLer, podeEscrever, podeExcluir } = usePermissao('admin.alcadas-aprovacao');

  const [alcadas, setAlcadas] = useState<AlcadaAprovacao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [vinculos, setVinculos] = useState<AlcadaAprovacaoDepartamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [editando, setEditando] = useState<AlcadaAprovacao | null>(null);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [excluindo, setExcluindo] = useState<AlcadaAprovacao | null>(null);

  async function recarregar() {
    setCarregando(true);
    setErro(null);
    try {
      const [als, us, deps] = await Promise.all([
        crud<AlcadaAprovacao>('alcadas_aprovacao').list({ ordenarPor: 'criadoEm' }),
        crud<Usuario>('usuarios').list({ igualdade: { ativo: true } }),
        crud<Departamento>('departamentos').list({
          ordenarPor: 'nome',
          igualdade: { ativo: true },
        }),
      ]);
      setAlcadas(als);
      setUsuarios(us);
      setDepartamentos(deps);

      // vinculos N:N — leitura direta para enriquecer a lista
      const { data: vincRaw, error } = await supabase
        .from('alcadas_aprovacao_departamentos')
        .select('alcada_id, departamento_id');
      if (error) throw new ApiError(error);
      setVinculos(
        (vincRaw ?? []).map((v) => ({
          alcadaId: v.alcada_id as string,
          departamentoId: v.departamento_id as string,
        })),
      );
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao carregar alcadas';
      setErro(msg);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  const usuariosMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);
  const departamentosMap = useMemo(
    () => new Map(departamentos.map((d) => [d.id, d])),
    [departamentos],
  );
  const vinculosPorAlcada = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const v of vinculos) {
      const arr = map.get(v.alcadaId) ?? [];
      arr.push(v.departamentoId);
      map.set(v.alcadaId, arr);
    }
    return map;
  }, [vinculos]);

  if (!podeLer) return <SemAcesso rotaCodigo="admin.alcadas-aprovacao" />;

  function abrirNovo() {
    setEditando(null);
    setCriandoNovo(true);
  }

  function abrirEdicao(a: AlcadaAprovacao) {
    setEditando(a);
  }

  async function handleSalvar(payload: SalvarPayload) {
    try {
      let alcadaId: string;
      if (payload.id) {
        await crud<AlcadaAprovacao>('alcadas_aprovacao').update(payload.id, payload.dados);
        alcadaId = payload.id;
      } else {
        const novo = await crud<AlcadaAprovacao>('alcadas_aprovacao').create(payload.dados);
        alcadaId = novo.id;
      }

      // Sincroniza departamentos: deleta antigos + insere novos
      const { error: delErr } = await supabase
        .from('alcadas_aprovacao_departamentos')
        .delete()
        .eq('alcada_id', alcadaId);
      if (delErr) throw new ApiError(delErr);

      if (payload.departamentosIds.length > 0) {
        const rows = payload.departamentosIds.map((depId) => ({
          alcada_id: alcadaId,
          departamento_id: depId,
        }));
        const { error: insErr } = await supabase
          .from('alcadas_aprovacao_departamentos')
          .insert(rows);
        if (insErr) throw new ApiError(insErr);
      }

      toast.success(payload.id ? 'Alcada atualizada' : 'Alcada criada');
      setEditando(null);
      setCriandoNovo(false);
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
    }
  }

  async function handleExcluir(a: AlcadaAprovacao) {
    try {
      // Vinculos N:N tem ON DELETE? Garantimos limpando antes.
      await supabase.from('alcadas_aprovacao_departamentos').delete().eq('alcada_id', a.id);
      await crud<AlcadaAprovacao>('alcadas_aprovacao').remove(a.id);
      toast.success('Alcada excluida');
      setExcluindo(null);
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro ao excluir');
    }
  }

  function nomeAprovador(a: AlcadaAprovacao): string {
    if (a.usuarioId) return usuariosMap.get(a.usuarioId)?.nome ?? '—';
    if (a.perfilAprovador) return a.perfilAprovador;
    return '—';
  }

  function nomeDepartamentos(alcadaId: string): string[] {
    return (vinculosPorAlcada.get(alcadaId) ?? [])
      .map((id) => departamentosMap.get(id)?.nome)
      .filter((n): n is string => !!n);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <PageHeader
            titulo="Alcadas de Aprovacao"
            subtitulo="Configura aprovadores das duas camadas: requisicao (gestor do departamento) e pedido (alcada por valor)"
          />
        </div>
        {podeEscrever && (
          <Button onClick={abrirNovo}>
            <Plus className="mr-1.5 h-4 w-4" />
            Nova alcada
          </Button>
        )}
      </div>

      {erro && <p className="text-destructive text-sm">{erro}</p>}

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : alcadas.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-md border border-dashed p-12 text-center">
          Nenhuma alcada cadastrada. Cadastre os aprovadores para viabilizar as aprovacoes.
        </div>
      ) : (
        <div className="border-border overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Escopo</TableHead>
                <TableHead>Aprovador</TableHead>
                <TableHead>Departamentos</TableHead>
                <TableHead className="w-44 text-right">Faixa de valor</TableHead>
                <TableHead className="w-24 text-center">Status</TableHead>
                <TableHead className="w-32 text-right">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alcadas.map((a) => {
                const nomesDeps = nomeDepartamentos(a.id);
                return (
                  <TableRow key={a.id}>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {a.escopo === 'pedido' ? 'Pedido' : 'Requisicao'}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{nomeAprovador(a)}</TableCell>
                    <TableCell>
                      {nomesDeps.length === 0 ? (
                        <span className="text-muted-foreground text-xs italic">
                          {a.escopo === 'requisicao' ? '— (sem vinculo)' : 'Todos'}
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {nomesDeps.map((nome) => (
                            <Badge key={nome} variant="outline" className="text-xs">
                              {nome}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {a.escopo === 'requisicao' ? (
                        <span className="text-muted-foreground text-xs">N/A</span>
                      ) : (
                        <span className="font-mono text-sm">
                          {formatBRL(a.valorLimiteMin)} —{' '}
                          {a.valorLimiteMax === null ? (
                            <span className="text-emerald-600 dark:text-emerald-400">sem teto</span>
                          ) : (
                            formatBRL(a.valorLimiteMax)
                          )}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={a.ativo ? 'default' : 'outline'}>
                        {a.ativo ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {podeEscrever && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => abrirEdicao(a)}
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        {podeExcluir && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExcluindo(a)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {(criandoNovo || editando) && (
        <DialogAlcada
          alcada={editando}
          departamentosVinculadosIds={editando ? (vinculosPorAlcada.get(editando.id) ?? []) : []}
          usuarios={usuarios}
          departamentos={departamentos}
          aoFechar={() => {
            setCriandoNovo(false);
            setEditando(null);
          }}
          aoSalvar={handleSalvar}
        />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir alcada?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acao nao pode ser desfeita. Os vinculos com departamentos tambem serao removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => excluindo && handleExcluir(excluindo)}
              className="bg-destructive hover:bg-destructive/90"
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
// Dialog de criacao/edicao com campos condicionais
// ============================================================================

interface SalvarPayload {
  id?: string;
  dados: Partial<AlcadaAprovacao>;
  departamentosIds: string[];
}

function DialogAlcada({
  alcada,
  departamentosVinculadosIds,
  usuarios,
  departamentos,
  aoFechar,
  aoSalvar,
}: {
  alcada: AlcadaAprovacao | null;
  departamentosVinculadosIds: string[];
  usuarios: Usuario[];
  departamentos: Departamento[];
  aoFechar: () => void;
  aoSalvar: (payload: SalvarPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<FormState>(FORM_INICIAL);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (alcada) {
      setForm({
        escopo: alcada.escopo,
        aprovadorTipo: alcada.usuarioId ? 'usuario' : 'perfil',
        usuarioId: alcada.usuarioId ?? '',
        perfilAprovador: alcada.perfilAprovador ?? '',
        valorLimiteMin: String(alcada.valorLimiteMin ?? 0),
        valorLimiteMax: alcada.valorLimiteMax === null ? '' : String(alcada.valorLimiteMax),
        departamentosIds: departamentosVinculadosIds,
        ativo: alcada.ativo,
      });
    } else {
      setForm(FORM_INICIAL);
    }
    setErro(null);
  }, [alcada, departamentosVinculadosIds]);

  function setCampo<K extends keyof FormState>(campo: K, valor: FormState[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro(null);
  }

  function toggleDepartamento(id: string) {
    setForm((prev) => ({
      ...prev,
      departamentosIds: prev.departamentosIds.includes(id)
        ? prev.departamentosIds.filter((d) => d !== id)
        : [...prev.departamentosIds, id],
    }));
  }

  function validar(): string | null {
    // Aprovador obrigatorio
    if (form.aprovadorTipo === 'usuario' && !form.usuarioId) {
      return 'Selecione o usuario aprovador';
    }
    if (form.aprovadorTipo === 'perfil' && !form.perfilAprovador.trim()) {
      return 'Informe o codigo do perfil aprovador';
    }

    if (form.escopo === 'requisicao') {
      // Para requisicao, departamentos sao obrigatorios — define quais setores o gestor cobre
      if (form.departamentosIds.length === 0) {
        return 'Selecione ao menos um departamento que este gestor aprova';
      }
    } else {
      // Para pedido, validar faixa de valor
      const min = Number(form.valorLimiteMin || 0);
      if (Number.isNaN(min) || min < 0) return 'Valor minimo invalido';
      if (form.valorLimiteMax !== '') {
        const max = Number(form.valorLimiteMax);
        if (Number.isNaN(max)) return 'Valor maximo invalido';
        if (max <= min) return 'Valor maximo deve ser maior que o minimo';
      }
    }
    return null;
  }

  async function handleSalvar() {
    const err = validar();
    if (err) {
      setErro(err);
      return;
    }
    setSalvando(true);
    try {
      const dados: Partial<AlcadaAprovacao> = {
        escopo: form.escopo,
        usuarioId: form.aprovadorTipo === 'usuario' ? form.usuarioId : null,
        perfilAprovador: form.aprovadorTipo === 'perfil' ? form.perfilAprovador.trim() : null,
        // Para requisicao: zera valores (nao se aplicam)
        // Para pedido: usa os valores do formulario
        valorLimiteMin: form.escopo === 'requisicao' ? 0 : Number(form.valorLimiteMin || 0),
        valorLimiteMax:
          form.escopo === 'requisicao'
            ? null
            : form.valorLimiteMax === ''
              ? null
              : Number(form.valorLimiteMax),
        ativo: form.ativo,
      };

      await aoSalvar({
        id: alcada?.id,
        dados,
        departamentosIds: form.departamentosIds,
      });
    } finally {
      setSalvando(false);
    }
  }

  const escopoRequisicao = form.escopo === 'requisicao';
  const escopoPedido = form.escopo === 'pedido';

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{alcada ? 'Editar alcada' : 'Nova alcada'}</DialogTitle>
          <DialogDescription>
            {escopoRequisicao
              ? 'Define o gestor que aprova requisicoes de um ou mais departamentos.'
              : 'Define o aprovador de pedidos de compra dentro de uma faixa de valor.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Escopo */}
          <div className="space-y-1.5">
            <Label>
              Escopo<span className="ml-0.5 text-red-500">*</span>
            </Label>
            <Select
              value={form.escopo}
              onValueChange={(v) => setCampo('escopo', v as EscopoAlcada)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requisicao">Requisicao (gestor do departamento)</SelectItem>
                <SelectItem value="pedido">Pedido (alcada por valor)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-muted-foreground text-xs">
              {escopoRequisicao
                ? 'Aprovacao tecnica do gestor — sem dependencia de valor.'
                : 'Aprovacao por alcada (diretoria) baseada no valor total do pedido.'}
            </p>
          </div>

          {/* Tipo de aprovador */}
          <div className="space-y-1.5">
            <Label>Aprovador identificado por</Label>
            <Select
              value={form.aprovadorTipo}
              onValueChange={(v) => setCampo('aprovadorTipo', v as 'usuario' | 'perfil')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="usuario">Usuario especifico</SelectItem>
                <SelectItem value="perfil">Perfil de acesso (codigo)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Aprovador: usuario OU perfil */}
          {form.aprovadorTipo === 'usuario' ? (
            <div className="space-y-1.5">
              <Label>
                Usuario aprovador<span className="ml-0.5 text-red-500">*</span>
              </Label>
              <Select value={form.usuarioId} onValueChange={(v) => setCampo('usuarioId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um usuario..." />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.nome}
                      {u.cargo ? ` — ${u.cargo}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>
                Perfil aprovador<span className="ml-0.5 text-red-500">*</span>
              </Label>
              <Input
                placeholder="ex: DIRETOR_FINANCEIRO"
                value={form.perfilAprovador}
                onChange={(e) => setCampo('perfilAprovador', e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Qualquer usuario com este perfil podera aprovar.
              </p>
            </div>
          )}

          {/* Valores — somente para escopo = pedido */}
          {escopoPedido && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor minimo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={form.valorLimiteMin}
                  onChange={(e) => setCampo('valorLimiteMin', e.target.value)}
                />
                <p className="text-muted-foreground text-xs">Aprova a partir deste valor (≥).</p>
              </div>
              <div className="space-y-1.5">
                <Label>Valor maximo (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  placeholder="Vazio = sem teto"
                  value={form.valorLimiteMax}
                  onChange={(e) => setCampo('valorLimiteMax', e.target.value)}
                />
                <p className="text-muted-foreground text-xs">Aprova ate este valor (≤).</p>
              </div>
            </div>
          )}

          {/* Departamentos */}
          <div className="space-y-1.5">
            <Label>
              Departamentos
              {escopoRequisicao && <span className="ml-0.5 text-red-500">*</span>}
            </Label>
            <p className="text-muted-foreground text-xs">
              {escopoRequisicao
                ? 'Quais setores este gestor aprova. Obrigatorio.'
                : 'Restringe a alcada a setores especificos. Vazio = aplica a todos.'}
            </p>
            {departamentos.length === 0 ? (
              <div className="text-muted-foreground rounded-md border border-dashed p-3 text-xs">
                Nenhum departamento cadastrado.
              </div>
            ) : (
              <div className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border p-3">
                {departamentos.map((d) => {
                  const checked = form.departamentosIds.includes(d.id);
                  return (
                    <label
                      key={d.id}
                      className="hover:bg-muted/50 flex cursor-pointer items-center gap-2 rounded-md px-2 py-1"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleDepartamento(d.id)}
                      />
                      <span className="text-sm">{d.nome}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ativo */}
          <div className="flex items-center justify-between rounded-md border p-3">
            <div>
              <Label className="text-sm">Alcada ativa</Label>
              <p className="text-muted-foreground text-xs">
                Inativas nao sao consideradas no fluxo de aprovacao.
              </p>
            </div>
            <Switch checked={form.ativo} onCheckedChange={(v) => setCampo('ativo', v)} />
          </div>

          {erro && <p className="text-sm text-red-500">{erro}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : alcada ? 'Atualizar' : 'Criar alcada'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
