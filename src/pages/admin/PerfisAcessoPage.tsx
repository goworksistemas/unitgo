/**
 * PerfisAcessoPage — CRUD de perfis + matriz de permissoes por rota.
 *
 * Layout:
 *  - Lista de perfis (DataTable)
 *  - Botao "Editar permissoes" por linha → abre modal grande com matriz:
 *
 *        codigo da rota          ler  escrever  excluir  aprovar
 *        admin.usuarios          [x]  [x]       [ ]      [ ]
 *        admin.unidades          [x]  [x]       [x]      [ ]
 */
import { useEffect, useState } from 'react';
import { Plus, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Pencil } from 'lucide-react';
import { ApiError, crud, supabase } from '@/lib/api';
import { useCrud } from '@/hooks/useCrud';
import { usePermissao } from '@/hooks/usePermissao';
import { FormDialog } from '@/components/crud/FormDialog';
import { SemAcesso } from '@/components/crud/SemAcesso';
import type { Perfil, PerfilRota, Rota } from '@/types';

export function PerfisAcessoPage() {
  const { podeLer, podeEscrever, podeExcluir } = usePermissao('admin.perfis-acesso');

  const { itens: perfis, isLoading, criar, atualizar, excluir } = useCrud<Perfil>(
    'perfis_acesso',
    { ordenarPor: 'nome' },
  );

  const [editando, setEditando] = useState<Perfil | null>(null);
  const [criandoNovo, setCriandoNovo] = useState(false);
  const [excluindo, setExcluindo] = useState<Perfil | null>(null);
  const [matrizPerfil, setMatrizPerfil] = useState<Perfil | null>(null);

  if (!podeLer) return <SemAcesso rotaCodigo="admin.perfis-acesso" />;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Perfis de Acesso</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Defina perfis e quais rotas cada um pode acessar
          </p>
        </div>
        {podeEscrever && (
          <Button onClick={() => setCriandoNovo(true)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Novo perfil
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="rounded-md border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-40">Codigo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descricao</TableHead>
                <TableHead className="text-center w-24">Status</TableHead>
                <TableHead className="text-right w-44">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {perfis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Nenhum perfil cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                perfis.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <span className="font-mono text-sm">{p.codigo}</span>
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.nome}
                        {p.ehProtegido && (
                          <Badge variant="secondary" className="text-xs">
                            protegido
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {p.descricao ?? '—'}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={p.ativo ? 'default' : 'outline'}>
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {podeEscrever && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setMatrizPerfil(p)}
                              title="Editar permissoes"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditando(p)}
                              title="Editar perfil"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {podeExcluir && !p.ehProtegido && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setExcluindo(p)}
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

      <FormDialog<Perfil>
        aberto={criandoNovo || !!editando}
        titulo={editando ? 'Editar perfil' : 'Novo perfil'}
        valorInicial={editando ?? undefined}
        campos={[
          {
            nome: 'codigo',
            label: 'Codigo',
            tipo: 'text',
            obrigatorio: true,
            placeholder: 'ex: ADMIN, GESTOR_OBRAS',
            ajuda: 'Identificador unico (sem espacos)',
            readonly: !!editando?.ehProtegido,
          },
          { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
          { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
          { nome: 'ativo', label: 'Ativo', tipo: 'boolean' },
        ]}
        aoSalvar={async (valores) => {
          let ok: Perfil | null = null;
          if (editando) {
            const { id: _id, criadoEm: _c, atualizadoEm: _a, ehProtegido: _p, ...rest } =
              valores as Record<string, unknown>;
            ok = await atualizar(editando.id, rest as Partial<Perfil>);
          } else {
            ok = await criar(valores as Partial<Perfil>);
          }
          if (ok) {
            setCriandoNovo(false);
            setEditando(null);
          }
        }}
        aoFechar={() => {
          setCriandoNovo(false);
          setEditando(null);
        }}
      />

      <AlertDialog open={!!excluindo} onOpenChange={(o) => !o && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os usuarios vinculados perderao este perfil. Esta acao nao pode ser desfeita.
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
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {matrizPerfil && (
        <DialogMatrizPermissoes
          perfil={matrizPerfil}
          aoFechar={() => setMatrizPerfil(null)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-dialog: matriz de permissoes (rotas x flags)
// ============================================================================

interface LinhaMatriz {
  rotaId: string;
  podeLer: boolean;
  podeEscrever: boolean;
  podeExcluir: boolean;
  podeAprovar: boolean;
}

function DialogMatrizPermissoes({
  perfil,
  aoFechar,
}: {
  perfil: Perfil;
  aoFechar: () => void;
}) {
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [linhas, setLinhas] = useState<Record<string, LinhaMatriz>>({});
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    Promise.all([
      crud<Rota>('rotas_sistema').list({
        ordenarPor: 'ordem',
        igualdade: { ativo: true },
      }),
      crud<PerfilRota>('perfis_acesso_rotas').list({
        igualdade: { perfilId: perfil.id },
      }),
    ])
      .then(([listaRotas, atribuicoes]) => {
        if (cancelado) return;
        setRotas(listaRotas);
        const mapa: Record<string, LinhaMatriz> = {};
        for (const r of listaRotas) {
          const atual = atribuicoes.find((a) => a.rotaId === r.id);
          mapa[r.id] = {
            rotaId: r.id,
            podeLer: atual?.podeLer ?? false,
            podeEscrever: atual?.podeEscrever ?? false,
            podeExcluir: atual?.podeExcluir ?? false,
            podeAprovar: atual?.podeAprovar ?? false,
          };
        }
        setLinhas(mapa);
      })
      .catch(() => {
        if (!cancelado) toast.error('Erro ao carregar permissoes');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [perfil.id]);

  function alternar(rotaId: string, flag: keyof Omit<LinhaMatriz, 'rotaId'>) {
    setLinhas((prev) => ({
      ...prev,
      [rotaId]: { ...prev[rotaId], [flag]: !prev[rotaId][flag] },
    }));
  }

  async function salvar() {
    setSalvando(true);
    try {
      // Estrategia: deletar tudo do perfil e re-inserir as linhas com qualquer flag true
      const linhasComFlag = Object.values(linhas).filter(
        (l) => l.podeLer || l.podeEscrever || l.podeExcluir || l.podeAprovar,
      );

      const { error: errDel } = await supabase
        .from('perfis_acesso_rotas')
        .delete()
        .eq('perfil_id', perfil.id);
      if (errDel) throw new ApiError(errDel);

      if (linhasComFlag.length > 0) {
        const { error: errIns } = await supabase.from('perfis_acesso_rotas').insert(
          linhasComFlag.map((l) => ({
            perfil_id: perfil.id,
            rota_id: l.rotaId,
            pode_ler: l.podeLer,
            pode_escrever: l.podeEscrever,
            pode_excluir: l.podeExcluir,
            pode_aprovar: l.podeAprovar,
          })),
        );
        if (errIns) throw new ApiError(errIns);
      }

      toast.success('Permissoes atualizadas');
      aoFechar();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao salvar permissoes';
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  // Agrupa rotas por modulo
  const rotasPorModulo = rotas.reduce<Record<string, Rota[]>>((acc, r) => {
    const mod = r.modulo ?? 'outros';
    (acc[mod] ??= []).push(r);
    return acc;
  }, {});

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Permissoes — {perfil.nome}</DialogTitle>
          <DialogDescription>
            Marque as flags por rota. Se nenhuma flag estiver marcada, a rota sera removida do perfil.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          {carregando ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rotas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma rota cadastrada.
            </p>
          ) : (
            Object.entries(rotasPorModulo).map(([modulo, rotasModulo]) => (
              <div key={modulo} className="mb-6">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  {modulo}
                </h3>
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Rota</TableHead>
                        <TableHead className="text-center w-20">Ler</TableHead>
                        <TableHead className="text-center w-24">Escrever</TableHead>
                        <TableHead className="text-center w-24">Excluir</TableHead>
                        <TableHead className="text-center w-24">Aprovar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rotasModulo.map((r) => {
                        const l = linhas[r.id];
                        if (!l) return null;
                        return (
                          <TableRow key={r.id}>
                            <TableCell>
                              <div className="font-medium text-sm">{r.nome}</div>
                              <div className="text-xs font-mono text-muted-foreground">
                                {r.codigo}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.podeLer}
                                onCheckedChange={() => alternar(r.id, 'podeLer')}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.podeEscrever}
                                onCheckedChange={() => alternar(r.id, 'podeEscrever')}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.podeExcluir}
                                onCheckedChange={() => alternar(r.id, 'podeExcluir')}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Checkbox
                                checked={l.podeAprovar}
                                onCheckedChange={() => alternar(r.id, 'podeAprovar')}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando ? 'Salvando...' : 'Salvar permissoes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
