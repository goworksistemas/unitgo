/**
 * CotacoesPage — comprador agrupa solicitacoes aprovadas em cotacao multi-fornecedor.
 *
 * Fluxo simplificado:
 *  1. Lista cotacoes
 *  2. Criar: seleciona N solicitacoes (status=approved_manager) + N fornecedores + obs
 *  3. Ver: registra respostas (manualmente — comprador insere precos por fornecedor)
 *  4. Comparativo: mostra valores por fornecedor
 *  5. Finalizar: escolhe vencedor; status vira 'finalized' e sols viram 'quotation_completed'
 */
import { useEffect, useMemo, useState } from 'react';
import { Eye, Plus, Trophy } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import { formatDate } from '@/lib/format';
import type {
  Cotacao,
  CotacaoFornecedor,
  CotacaoResposta,
  Fornecedor,
  SolicitacaoCompra,
  Usuario,
} from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function CotacoesPage() {
  const { podeLer, podeEscrever } = usePermissao('compras.cotacoes');
  const perfil = usePerfil();

  const [cotacoes, setCotacoes] = useState<Cotacao[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [novoAberto, setNovoAberto] = useState(false);
  const [verCotacao, setVerCotacao] = useState<Cotacao | null>(null);

  async function recarregar() {
    setCarregando(true);
    try {
      const [cs, us] = await Promise.all([
        crud<Cotacao>('cotacoes').list({ ordenarPor: 'criadoEm', ascendente: false }),
        crud<Usuario>('usuarios').list({}),
      ]);
      setCotacoes(cs);
      setUsuarios(us);
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

  if (!podeLer) return <SemAcesso rotaCodigo="compras.cotacoes" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <PageHeader
        titulo="Cotacoes"
        subtitulo="Comprador agrupa solicitacoes aprovadas e cota com multiplos fornecedores"
        acoes={
          podeEscrever && (
            <Button onClick={() => setNovoAberto(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova cotacao
            </Button>
          )
        }
      />

      {carregando ? (
        <Skeleton className="h-32 w-full" />
      ) : cotacoes.length === 0 ? (
        <div className="rounded-md border border-dashed p-12 text-center text-muted-foreground">
          Nenhuma cotacao criada.
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Quando</TableHead>
                <TableHead>Comprador</TableHead>
                <TableHead>Limite resposta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cotacoes.map((c) => (
                <TableRow
                  key={c.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setVerCotacao(c)}
                >
                  <TableCell className="font-mono text-xs">
                    {c.numero ?? c.id.slice(0, 8)}
                  </TableCell>
                  <TableCell className="text-xs">{formatDate(c.criadoEm)}</TableCell>
                  <TableCell className="text-sm">
                    {usuariosMap.get(c.compradorId)?.nome ?? '?'}
                  </TableCell>
                  <TableCell className="text-xs">
                    {c.dataLimiteResposta ? formatDate(c.dataLimiteResposta) : '—'}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setVerCotacao(c); }}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {novoAberto && perfil.usuario && (
        <DialogNovaCotacao
          meuUsuarioId={perfil.usuario.id}
          aoFechar={() => setNovoAberto(false)}
          aoSalvar={async () => {
            setNovoAberto(false);
            await recarregar();
          }}
        />
      )}

      {verCotacao && (
        <DialogVerCotacao
          cotacao={verCotacao}
          aoFechar={() => setVerCotacao(null)}
          aoAtualizar={async () => {
            await recarregar();
            // mantem o dialog aberto carregando dados
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Dialog: nova cotacao
// ============================================================================

function DialogNovaCotacao({
  meuUsuarioId,
  aoFechar,
  aoSalvar,
}: {
  meuUsuarioId: string;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoCompra[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [solSel, setSolSel] = useState<Set<string>>(new Set());
  const [fornSel, setFornSel] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState('');
  const [dataLimite, setDataLimite] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    Promise.all([
      crud<SolicitacaoCompra>('solicitacoes_compra').list({}),
      crud<Fornecedor>('fornecedores').list({ igualdade: { status: 'active' } }),
    ]).then(([sols, forns]) => {
      setSolicitacoes(sols.filter((s) => s.status === 'approved_manager'));
      setFornecedores(forns);
    });
  }, []);

  async function handleSalvar() {
    if (solSel.size === 0) return toast.error('Selecione pelo menos uma solicitacao');
    if (fornSel.size < 1) return toast.error('Selecione pelo menos um fornecedor');

    setSalvando(true);
    try {
      const cotacao = await crud<Cotacao>('cotacoes').create({
        compradorId: meuUsuarioId,
        observacoesFornecedor: observacoes.trim() || null,
        dataLimiteResposta: dataLimite || null,
        status: 'draft',
        enviarEmailFornecedor: false,
        copiarSolicitanteEmail: false,
      });

      // Vinculos N:N
      const { error: e1 } = await supabase.from('cotacoes_solicitacoes').insert(
        Array.from(solSel).map((solicitacao_id) => ({
          cotacao_id: cotacao.id,
          solicitacao_id,
        })),
      );
      if (e1) throw new ApiError(e1);

      // Fornecedores convidados (geramos token por fornecedor)
      const { error: e2 } = await supabase.from('cotacoes_fornecedores').insert(
        Array.from(fornSel).map((fornecedor_id) => ({
          cotacao_id: cotacao.id,
          fornecedor_id,
          link_token: crypto.randomUUID(),
        })),
      );
      if (e2) throw new ApiError(e2);

      // Atualiza status das SCs
      const { error: e3 } = await supabase
        .from('solicitacoes_compra')
        .update({ status: 'in_quotation' })
        .in('id', Array.from(solSel));
      if (e3) throw new ApiError(e3);

      toast.success('Cotacao criada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  function toggle(set: Set<string>, setter: (s: Set<string>) => void, id: string) {
    const novo = new Set(set);
    if (novo.has(id)) novo.delete(id);
    else novo.add(id);
    setter(novo);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova cotacao</DialogTitle>
          <DialogDescription>
            Selecione solicitacoes aprovadas e fornecedores para cotar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Data limite de resposta</Label>
            <Input
              type="datetime-local"
              value={dataLimite}
              onChange={(e) => setDataLimite(e.target.value)}
            />
          </div>

          <div>
            <Label>Solicitacoes aprovadas ({solSel.size} selecionadas)</Label>
            <div className="rounded-md border max-h-48 overflow-y-auto p-2 mt-1.5">
              {solicitacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  Nenhuma solicitacao aprovada disponivel.
                </p>
              ) : (
                solicitacoes.map((s) => (
                  <label
                    key={s.id}
                    className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={solSel.has(s.id)}
                      onCheckedChange={() => toggle(solSel, setSolSel, s.id)}
                    />
                    <span className="font-mono text-xs">{s.numero ?? s.id.slice(0, 8)}</span>
                    <span className="flex-1 truncate">{s.justificativa}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div>
            <Label>Fornecedores ({fornSel.size} selecionados)</Label>
            <div className="rounded-md border max-h-48 overflow-y-auto p-2 mt-1.5">
              {fornecedores.map((f) => (
                <label
                  key={f.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-muted/50 cursor-pointer text-sm"
                >
                  <Checkbox
                    checked={fornSel.has(f.id)}
                    onCheckedChange={() => toggle(fornSel, setFornSel, f.id)}
                  />
                  <span>{f.razaoSocial}</span>
                  {f.cnpj && <span className="text-xs font-mono text-muted-foreground">{f.cnpj}</span>}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Observacoes para o fornecedor</Label>
            <Textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Criando...' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Dialog: ver cotacao + comparativo + finalizar
// ============================================================================

function DialogVerCotacao({
  cotacao,
  aoFechar,
  aoAtualizar,
}: {
  cotacao: Cotacao;
  aoFechar: () => void;
  aoAtualizar: () => Promise<void>;
}) {
  const [convidados, setConvidados] = useState<CotacaoFornecedor[]>([]);
  const [respostas, setRespostas] = useState<CotacaoResposta[]>([]);
  const [fornecedoresMap, setFornecedoresMap] = useState<Map<string, Fornecedor>>(new Map());
  const [carregando, setCarregando] = useState(true);
  const [adicionandoResp, setAdicionandoResp] = useState<CotacaoFornecedor | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      const [cf, cr, fs] = await Promise.all([
        crud<CotacaoFornecedor>('cotacoes_fornecedores').list({
          igualdade: { cotacaoId: cotacao.id },
        }),
        crud<CotacaoResposta>('cotacoes_respostas').list({
          igualdade: { cotacaoId: cotacao.id },
        }),
        crud<Fornecedor>('fornecedores').list({}),
      ]);
      setConvidados(cf);
      setRespostas(cr);
      setFornecedoresMap(new Map(fs.map((f) => [f.id, f])));
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cotacao.id]);

  async function escolherVencedor(fornecedorId: string) {
    try {
      await crud<Cotacao>('cotacoes').update(cotacao.id, {
        status: 'finalized',
        fornecedorVencedorId: fornecedorId,
        finalizadaEm: new Date().toISOString(),
      });
      // Atualiza status das SCs vinculadas
      const { data: vinculos } = await supabase
        .from('cotacoes_solicitacoes')
        .select('solicitacao_id')
        .eq('cotacao_id', cotacao.id);
      const solIds = (vinculos ?? []).map((v: { solicitacao_id: string }) => v.solicitacao_id);
      if (solIds.length > 0) {
        await supabase
          .from('solicitacoes_compra')
          .update({ status: 'quotation_completed' })
          .in('id', solIds);
      }
      toast.success('Cotacao finalizada');
      await aoAtualizar();
      await carregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Cotacao {cotacao.numero ?? cotacao.id.slice(0, 8)}</span>
            <StatusBadge status={cotacao.status} />
          </DialogTitle>
          <DialogDescription>Criada em {formatDate(cotacao.criadoEm)}</DialogDescription>
        </DialogHeader>

        {carregando ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-4 py-2">
            <div>
              <h3 className="font-semibold text-sm mb-2">
                Fornecedores convidados ({convidados.length})
              </h3>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead>Resposta</TableHead>
                      <TableHead className="text-right">Valor total</TableHead>
                      <TableHead className="text-right w-32">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {convidados.map((c) => {
                      const f = fornecedoresMap.get(c.fornecedorId);
                      const resp = respostas.find((r) => r.cotacaoFornecedorId === c.id);
                      const ehVencedor = cotacao.fornecedorVencedorId === c.fornecedorId;
                      return (
                        <TableRow key={c.id} className={ehVencedor ? 'bg-primary/5' : ''}>
                          <TableCell className="text-sm">
                            <div className="flex items-center gap-2">
                              {ehVencedor && <Trophy className="h-4 w-4 text-amber-500" />}
                              {f?.razaoSocial ?? '?'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {resp ? <StatusBadge status={resp.status} /> : (
                              <Badge variant="outline">—</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {resp?.valorTotal ? FMT_BRL.format(Number(resp.valorTotal)) : '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {!resp && cotacao.status !== 'finalized' && (
                                <Button size="sm" variant="outline" onClick={() => setAdicionandoResp(c)}>
                                  Lancar resposta
                                </Button>
                              )}
                              {resp && cotacao.status !== 'finalized' && (
                                <Button
                                  size="sm"
                                  onClick={() => escolherVencedor(c.fornecedorId)}
                                  className="bg-amber-500 hover:bg-amber-600"
                                >
                                  <Trophy className="h-3 w-3 mr-1" />
                                  Vencedor
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
            </div>

            {cotacao.observacoesFornecedor && (
              <div>
                <span className="text-xs text-muted-foreground">Observacoes para fornecedor</span>
                <p className="text-sm mt-1">{cotacao.observacoesFornecedor}</p>
              </div>
            )}
          </div>
        )}

        {adicionandoResp && (
          <DialogResposta
            cotacao={cotacao}
            convidado={adicionandoResp}
            aoFechar={() => setAdicionandoResp(null)}
            aoSalvar={async () => {
              setAdicionandoResp(null);
              await carregar();
            }}
          />
        )}

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogResposta({
  cotacao,
  convidado,
  aoFechar,
  aoSalvar,
}: {
  cotacao: Cotacao;
  convidado: CotacaoFornecedor;
  aoFechar: () => void;
  aoSalvar: () => Promise<void>;
}) {
  const [valorTotal, setValorTotal] = useState(0);
  const [valorFrete, setValorFrete] = useState(0);
  const [prazoEntregaDias, setPrazoEntregaDias] = useState(7);
  const [observacoes, setObservacoes] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function handleSalvar() {
    if (valorTotal <= 0) return toast.error('Informe o valor total');
    setSalvando(true);
    try {
      await crud<CotacaoResposta>('cotacoes_respostas').create({
        cotacaoId: cotacao.id,
        cotacaoFornecedorId: convidado.id,
        fornecedorId: convidado.fornecedorId,
        valorTotal,
        valorFrete,
        prazoEntregaDias,
        observacoesFornecedor: observacoes.trim() || null,
        status: 'responded',
        respondidoEm: new Date().toISOString(),
      });
      toast.success('Resposta registrada');
      await aoSalvar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Erro');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lancar resposta do fornecedor</DialogTitle>
          <DialogDescription>Comprador insere os valores informados</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 py-2">
          <div className="space-y-1.5">
            <Label>Valor total (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={valorTotal}
              onChange={(e) => setValorTotal(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frete (R$)</Label>
            <Input
              type="number"
              min={0}
              step={0.01}
              value={valorFrete}
              onChange={(e) => setValorFrete(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Prazo entrega (dias)</Label>
            <Input
              type="number"
              min={0}
              value={prazoEntregaDias}
              onChange={(e) => setPrazoEntregaDias(Number(e.target.value))}
            />
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Observacoes</Label>
            <Textarea
              rows={2}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Lancar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
