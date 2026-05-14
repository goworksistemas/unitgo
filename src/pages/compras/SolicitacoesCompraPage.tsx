/**
 * SolicitacoesCompraPage — gerenciamento de solicitacoes de compra.
 *
 * Solicitante cria solicitacao com itens. Gestor (1a camada) aprova/rejeita.
 * Apos aprovado, vira disponivel para cotacao.
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ApiError, crud, supabase } from '@/lib/api';
import { usePermissao } from '@/hooks/usePermissao';
import { usePerfil } from '@/contexts/PerfilContext';
import { PageHeader } from '@/components/shared/PageHeader';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Timeline } from '@/components/shared/Timeline';
import { formatDate, getUrgenciaLabel } from '@/lib/format';
import type {
  EmpresaEmitente,
  Item,
  SolicitacaoCompra,
  SolicitacaoCompraItem,
  UnidadeMedida,
  Urgencia,
  Usuario,
} from '@/types';

interface ItemForm {
  descricao: string;
  itemId: string | null;
  quantidade: number;
  unidadeMedidaId: string | null;
  observacao: string;
}

export function SolicitacoesCompraPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.solicitacoes');
  const perfil = usePerfil();

  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [novoAberto, setNovoAberto] = useState(false);
  const [verSolicitacao, setVerSolicitacao] = useState<SolicitacaoCompra | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [sols, usrs] = await Promise.all([
        crud<SolicitacaoCompra>('solicitacoes_compra').list({
          ordenarPor: 'criadoEm',
          ascendente: false,
        }),
        crud<Usuario>('usuarios').list({}),
      ]);
      setSolicitacoes(sols);
      setUsuarios(usrs);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  const usuariosMap = useMemo(() => new Map(usuarios.map((u) => [u.id, u])), [usuarios]);

  const filtradas = useMemo(() => {
    let r = solicitacoes;
    if (filtroStatus !== 'todos') r = r.filter((s) => s.status === filtroStatus);
    if (busca.trim()) {
      const t = busca.toLowerCase();
      r = r.filter(
        (s) =>
          (s.numero ?? '').toLowerCase().includes(t) ||
          s.justificativa.toLowerCase().includes(t),
      );
    }
    return r;
  }, [solicitacoes, filtroStatus, busca]);

  if (!podeLer) return <SemAcesso rotaCodigo="compras.solicitacoes" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Solicitacoes de Compra"
        subtitulo="Solicitacoes que ainda nao viraram pedido. Aguardam aprovacao do gestor."
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova solicitacao
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por numero ou justificativa..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pending_manager">Aguardando Gestor</SelectItem>
            <SelectItem value="approved_manager">Aprovado Gestor</SelectItem>
            <SelectItem value="rejected_manager">Rejeitado</SelectItem>
            <SelectItem value="in_quotation">Em Cotacao</SelectItem>
            <SelectItem value="quotation_completed">Cotacao Finalizada</SelectItem>
            <SelectItem value="in_purchase">Em Compra</SelectItem>
            <SelectItem value="completed">Concluido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carregando ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Solicitante</TableHead>
                <TableHead>Justificativa</TableHead>
                <TableHead>Urgencia</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Nenhuma solicitacao encontrada.
                  </TableCell>
                </TableRow>
              ) : (
                filtradas.map((s) => (
                  <TableRow
                    key={s.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setVerSolicitacao(s)}
                  >
                    <TableCell className="font-mono text-xs">
                      {s.numero ?? s.id.slice(0, 8)}
                    </TableCell>
                    <TableCell className="text-xs">{formatDate(s.criadoEm)}</TableCell>
                    <TableCell className="text-sm">
                      {usuariosMap.get(s.solicitanteId)?.nome ?? '?'}
                    </TableCell>
                    <TableCell className="text-sm max-w-md truncate">
                      {s.justificativa}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.urgencia === 'high' ? 'destructive' : s.urgencia === 'medium' ? 'secondary' : 'outline'}>
                        {getUrgenciaLabel(s.urgencia)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setVerSolicitacao(s); }}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {novoAberto && perfil.usuario && (
        <DialogNovaSolCompra
          meuUsuarioId={perfil.usuario.id}
          meuDepartamentoId={perfil.usuario.departamentoId}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await recarregar();
          }}
        />
      )}

      {verSolicitacao && (
        <DialogVerSolCompra
          solicitacao={verSolicitacao}
          solicitanteNome={usuariosMap.get(verSolicitacao.solicitanteId)?.nome}
          podeEscrever={podeEscrever}
          aoFechar={() => setVerSolicitacao(null)}
          aoAcaoGestor={async (acao, motivo) => {
            if (!perfil.usuario?.id) return;
            try {
              const novoStatus = acao === 'aprovar' ? 'approved_manager' : 'rejected_manager';
              await crud<SolicitacaoCompra>('solicitacoes_compra').update(verSolicitacao.id, {
                status: novoStatus,
                gestorAprovadoPorId: perfil.usuario.id,
                gestorAprovadoEm: new Date().toISOString(),
                gestorMotivoRejeicao: motivo ?? null,
              });
              toast.success(acao === 'aprovar' ? 'Aprovada' : 'Rejeitada');
              setVerSolicitacao(null);
              await recarregar();
            } catch (e) {
              toast.error(e instanceof ApiError ? e.message : 'Erro');
            }
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Dialog: nova solicitacao de compra
// ============================================================================

function DialogNovaSolCompra({
  meuUsuarioId,
  meuDepartamentoId,
  aoFechar,
  aoSalvar,
}: {
  meuUsuarioId: string;
  meuDepartamentoId: string | null;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [justificativa, setJustificativa] = useState('');
  const [urgencia, setUrgencia] = useState<Urgencia>('medium');
  const [empresaEmitenteId, setEmpresaEmitenteId] = useState('');
  const [linkReferencia, setLinkReferencia] = useState('');
  const [itens, setItens] = useState<ItemForm[]>([
    { descricao: '', itemId: null, quantidade: 1, unidadeMedidaId: null, observacao: '' },
  ]);
  const [empresas, setEmpresas] = useState<EmpresaEmitente[]>([]);
  const [itensCatalogo, setItensCatalogo] = useState<Item[]>([]);
  const [unidadesMedida, setUnidadesMedida] = useState<UnidadeMedida[]>([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      crud<EmpresaEmitente>('empresas_emitentes').list({ igualdade: { ativo: true } }),
      crud<Item>('itens').list({ igualdade: { ativo: true } }),
      crud<UnidadeMedida>('unidades_medida').list({ igualdade: { ativo: true } }),
    ]).then(([emps, its, ums]) => {
      setEmpresas(emps);
      setItensCatalogo(its);
      setUnidadesMedida(ums);
    });
  }, []);

  function setItem(idx: number, patch: Partial<ItemForm>) {
    setItens((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItem() {
    setItens((prev) => [
      ...prev,
      { descricao: '', itemId: null, quantidade: 1, unidadeMedidaId: null, observacao: '' },
    ]);
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSalvar() {
    if (!justificativa.trim()) return toast.error('Informe a justificativa');
    if (itens.length === 0) return toast.error('Adicione pelo menos um item');
    if (itens.some((it) => !it.descricao.trim() || it.quantidade <= 0))
      return toast.error('Itens devem ter descricao e quantidade positiva');

    setSalvando(true);
    try {
      const sol = await crud<SolicitacaoCompra>('solicitacoes_compra').create({
        solicitanteId: meuUsuarioId,
        departamentoId: meuDepartamentoId,
        empresaEmitenteId: empresaEmitenteId || null,
        linkReferencia: linkReferencia.trim() || null,
        justificativa: justificativa.trim(),
        urgencia,
        status: 'pending_manager',
      });

      const { error } = await supabase.from('solicitacoes_compra_itens').insert(
        itens.map((it, idx) => ({
          solicitacao_id: sol.id,
          item_id: it.itemId,
          descricao: it.descricao.trim(),
          quantidade: it.quantidade,
          unidade_medida_id: it.unidadeMedidaId,
          observacao: it.observacao.trim() || null,
          ordem: idx,
        })),
      );
      if (error) throw new ApiError(error);

      toast.success('Solicitacao criada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova solicitacao de compra</DialogTitle>
          <DialogDescription>
            A solicitacao sera enviada para aprovacao do gestor do seu departamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Empresa emitente</Label>
              <Select
                value={empresaEmitenteId}
                onValueChange={(v) => setEmpresaEmitenteId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— nenhuma —</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.razaoSocial}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Urgencia</Label>
              <Select value={urgencia} onValueChange={(v) => setUrgencia(v as Urgencia)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Link de referencia (opcional)</Label>
            <Input
              value={linkReferencia}
              onChange={(e) => setLinkReferencia(e.target.value)}
              placeholder="URL do produto, catalogo..."
            />
          </div>

          <div className="space-y-1.5">
            <Label>Justificativa</Label>
            <Textarea
              rows={3}
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Por que voce precisa desta compra?"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens</Label>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" />
                Adicionar
              </Button>
            </div>
            <div className="space-y-2">
              {itens.map((it, idx) => (
                <div key={idx} className="rounded-md border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Item #{idx + 1}</span>
                    {itens.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(idx)}
                        className="h-6 w-6 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-12 space-y-1">
                      <Label className="text-xs">Descricao</Label>
                      <Input
                        value={it.descricao}
                        onChange={(e) => setItem(idx, { descricao: e.target.value })}
                        placeholder="Cadeira ergonomica, papel A4..."
                      />
                    </div>
                    <div className="col-span-5 space-y-1">
                      <Label className="text-xs">Item do catalogo (opc)</Label>
                      <Select
                        value={it.itemId ?? ''}
                        onValueChange={(v) => setItem(idx, { itemId: v === '__none__' ? null : v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="ad-hoc" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— ad-hoc —</SelectItem>
                          {itensCatalogo.map((i) => (
                            <SelectItem key={i.id} value={i.id}>
                              {i.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 space-y-1">
                      <Label className="text-xs">Quantidade</Label>
                      <Input
                        type="number"
                        min={1}
                        value={it.quantidade}
                        onChange={(e) => setItem(idx, { quantidade: Number(e.target.value) })}
                      />
                    </div>
                    <div className="col-span-4 space-y-1">
                      <Label className="text-xs">Unid. medida</Label>
                      <Select
                        value={it.unidadeMedidaId ?? ''}
                        onValueChange={(v) =>
                          setItem(idx, { unidadeMedidaId: v === '__none__' ? null : v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— —</SelectItem>
                          {unidadesMedida.map((um) => (
                            <SelectItem key={um.id} value={um.id}>
                              {um.codigo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog: ver/aprovar solicitacao de compra
// ============================================================================

function DialogVerSolCompra({
  solicitacao,
  solicitanteNome,
  podeEscrever,
  aoFechar,
  aoAcaoGestor,
}: {
  solicitacao: SolicitacaoCompra;
  solicitanteNome?: string;
  podeEscrever: boolean;
  aoFechar: () => void;
  aoAcaoGestor: (acao: 'aprovar' | 'rejeitar', motivo?: string) => Promise<void>;
}) {
  const [itens, setItens] = useState<SolicitacaoCompraItem[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(true);
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    crud<SolicitacaoCompraItem>('solicitacoes_compra_itens')
      .list({ igualdade: { solicitacaoId: solicitacao.id }, ordenarPor: 'ordem' })
      .then(setItens)
      .finally(() => setCarregandoItens(false));
  }, [solicitacao.id]);

  const podeAprovar = podeEscrever && solicitacao.status === 'pending_manager';

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>SC {solicitacao.numero ?? solicitacao.id.slice(0, 8)}</span>
            <StatusBadge status={solicitacao.status} />
          </DialogTitle>
          <DialogDescription>Criada em {formatDate(solicitacao.criadoEm)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <Linha label="Solicitante" valor={solicitanteNome ?? '?'} />
            <Linha label="Urgencia" valor={getUrgenciaLabel(solicitacao.urgencia)} />
            {solicitacao.linkReferencia && (
              <Linha label="Link" valor={solicitacao.linkReferencia} />
            )}
            {solicitacao.gestorMotivoRejeicao && (
              <div className="col-span-2">
                <span className="text-xs text-muted-foreground">Motivo da rejeicao</span>
                <p className="mt-1 text-sm text-red-600">{solicitacao.gestorMotivoRejeicao}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-xs text-muted-foreground">Justificativa</span>
              <p className="mt-1 text-sm">{solicitacao.justificativa}</p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-2">Itens</h3>
            {carregandoItens ? (
              <Skeleton className="h-32 w-full" />
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Descricao</TableHead>
                      <TableHead className="text-right w-24">Qtd</TableHead>
                      <TableHead>Observacao</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itens.map((it, idx) => (
                      <TableRow key={it.id}>
                        <TableCell className="text-center font-mono text-xs">{idx + 1}</TableCell>
                        <TableCell className="text-sm">{it.descricao}</TableCell>
                        <TableCell className="text-right font-mono">{it.quantidade}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {it.observacao ?? ''}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h3 className="font-semibold text-sm mb-2">Linha do tempo</h3>
            <Timeline tipoEntidade="solicitacao_compra" entidadeId={solicitacao.id} />
          </div>

          {podeAprovar && (
            <div className="border-t pt-4 space-y-3">
              <h3 className="font-semibold text-sm">Acao do gestor</h3>
              <Textarea
                rows={2}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Motivo (obrigatorio se rejeitar)"
              />
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    if (!motivo.trim()) return toast.error('Informe o motivo');
                    void aoAcaoGestor('rejeitar', motivo.trim());
                  }}
                  className="text-red-600"
                >
                  Rejeitar
                </Button>
                <Button onClick={() => aoAcaoGestor('aprovar')}>Aprovar</Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Linha({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className="text-sm">{valor}</p>
    </div>
  );
}
