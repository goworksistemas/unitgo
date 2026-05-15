/**
 * UsuariosPage — lista, edita e atribui perfis aos usuarios.
 *
 * Cadastro novo: feito apenas via /signup (usa Supabase Auth).
 * Aqui o admin pode:
 *  - Editar dados (nome, cargo, departamento, unidades, ativo)
 *  - Atribuir perfis (multi-select de perfis_acesso)
 *  - Inativar/reativar
 *
 * Lista carregada via RPC `fn_listar_usuarios` (paginacao server-side).
 */
import { useEffect, useState } from 'react';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { ApiError, crud, supabase } from '@/lib/api';
import { useListaPaginada } from '@/hooks/useListaPaginada';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { usePermissao } from '@/hooks/usePermissao';
import { DataTable } from '@/components/crud/DataTable';
import { FormDialog } from '@/components/crud/FormDialog';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Perfil, Usuario, UsuarioPerfil } from '@/types';

interface UsuarioListado extends Usuario {
  departamentoNome: string | null;
}

export function UsuariosPage() {
  const { podeLer, podeEscrever } = usePermissao('admin.usuarios');

  const lista = useListaPaginada<UsuarioListado>({
    rpc: 'fn_listar_usuarios',
  });

  const { opcoes: departamentos } = useOpcoesFK('departamentos', 'nome', {
    filtros: { ativo: true },
  });
  const { opcoes: unidades } = useOpcoesFK('unidades', 'nome', { filtros: { status: 'active' } });

  const [editando, setEditando] = useState<UsuarioListado | null>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<UsuarioListado | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!podeLer) return <SemAcesso rotaCodigo="admin.usuarios" />;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Cadastros novos sao feitos via tela de signup. Aqui voce edita dados e atribui perfis.
        </p>
      </div>

      <DataTable<UsuarioListado>
        itens={lista.itens}
        isLoading={lista.isLoading}
        colunas={[
          { chave: 'nome', titulo: 'Nome' },
          {
            chave: 'email',
            titulo: 'E-mail',
            render: (u) => <span className="text-sm">{u.email}</span>,
          },
          {
            chave: 'cargo',
            titulo: 'Cargo',
            render: (u) => <span className="text-muted-foreground text-sm">{u.cargo ?? '—'}</span>,
          },
          {
            chave: 'departamentoNome',
            titulo: 'Departamento',
            render: (u) => <span className="text-sm">{u.departamentoNome ?? '—'}</span>,
          },
          {
            chave: 'ativo',
            titulo: 'Ativo',
            largura: '90px',
            alinhar: 'center',
            render: (u) => (
              <Badge variant={u.ativo ? 'default' : 'outline'}>
                {u.ativo ? 'Ativo' : 'Inativo'}
              </Badge>
            ),
          },
          {
            chave: 'acoes_perfis',
            titulo: 'Perfis',
            largura: '70px',
            alinhar: 'center',
            render: (u) =>
              podeEscrever && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setPerfilUsuario(u)}
                  title="Atribuir perfis"
                >
                  <Shield className="h-4 w-4" />
                </Button>
              ),
          },
        ]}
        podeEditar={podeEscrever}
        aoEditar={(u) => setEditando(u)}
        paginacao={{
          total: lista.total,
          pagina: lista.paginacao.pagina,
          tamanho: lista.paginacao.tamanho,
          busca: lista.paginacao.busca,
          placeholderBusca: 'Buscar por nome, email ou cargo...',
          aoMudarPagina: lista.paginacao.setPagina,
          aoMudarTamanho: lista.paginacao.setTamanho,
          aoMudarBusca: lista.paginacao.setBusca,
        }}
      />

      <FormDialog<Usuario>
        aberto={!!editando}
        titulo="Editar usuario"
        descricao="E-mail nao pode ser alterado (gerenciado pelo Supabase Auth)"
        valorInicial={editando ?? undefined}
        campos={[
          { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
          { nome: 'email', label: 'E-mail', tipo: 'text', readonly: true, span: 2 },
          { nome: 'cargo', label: 'Cargo', tipo: 'text' },
          {
            nome: 'departamentoId',
            label: 'Departamento',
            tipo: 'select',
            opcoes: departamentos,
            permiteVazio: true,
          },
          {
            nome: 'unidadesIds',
            label: 'Unidades de acesso',
            tipo: 'multi-select',
            opcoes: unidades,
            ajuda: 'Marque as unidades onde o usuario pode atuar',
            span: 2,
          },
          { nome: 'ativo', label: 'Ativo', tipo: 'boolean' },
        ]}
        aoSalvar={async (valores) => {
          if (!editando) return;
          setSalvando(true);
          try {
            const {
              id: _id,
              email: _email,
              criadoEm: _c,
              atualizadoEm: _a,
              authUsuarioId: _au,
              departamentoNome: _dn,
              ...rest
            } = valores as Record<string, unknown>;
            await crud<Usuario>('usuarios').update(editando.id, rest as Partial<Usuario>);
            toast.success('Usuario atualizado');
            setEditando(null);
            await lista.recarregar();
          } catch (e) {
            toast.error(e instanceof ApiError ? e.message : 'Erro ao salvar');
          } finally {
            setSalvando(false);
          }
        }}
        aoFechar={() => {
          if (!salvando) setEditando(null);
        }}
      />

      {perfilUsuario && (
        <DialogPerfis
          usuario={perfilUsuario}
          aoFechar={() => {
            setPerfilUsuario(null);
            void lista.recarregar();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Sub-dialog: gerenciar perfis do usuario
// ============================================================================

function DialogPerfis({ usuario, aoFechar }: { usuario: Usuario; aoFechar: () => void }) {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [perfisAtuais, setPerfisAtuais] = useState<string[]>([]);
  const [perfisOriginais, setPerfisOriginais] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    let cancelado = false;
    setCarregando(true);

    Promise.all([
      crud<Perfil>('perfis_acesso').list({ ordenarPor: 'nome', igualdade: { ativo: true } }),
      crud<UsuarioPerfil>('usuarios_perfis').list({
        igualdade: { usuarioId: usuario.id },
      }),
    ])
      .then(([listaPerfis, vinculos]) => {
        if (cancelado) return;
        setPerfis(listaPerfis);
        const ids = vinculos.map((v) => v.perfilId);
        setPerfisAtuais(ids);
        setPerfisOriginais(ids);
      })
      .catch(() => {
        if (!cancelado) toast.error('Erro ao carregar perfis');
      })
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });

    return () => {
      cancelado = true;
    };
  }, [usuario.id]);

  function alternar(perfilId: string) {
    setPerfisAtuais((prev) =>
      prev.includes(perfilId) ? prev.filter((p) => p !== perfilId) : [...prev, perfilId],
    );
  }

  async function salvar() {
    setSalvando(true);
    try {
      const adicionar = perfisAtuais.filter((p) => !perfisOriginais.includes(p));
      const remover = perfisOriginais.filter((p) => !perfisAtuais.includes(p));

      if (adicionar.length > 0) {
        const { error } = await supabase
          .from('usuarios_perfis')
          .insert(adicionar.map((perfil_id) => ({ usuario_id: usuario.id, perfil_id })));
        if (error) throw new ApiError(error);
      }

      if (remover.length > 0) {
        const { error } = await supabase
          .from('usuarios_perfis')
          .delete()
          .eq('usuario_id', usuario.id)
          .in('perfil_id', remover);
        if (error) throw new ApiError(error);
      }

      toast.success('Perfis atualizados');
      aoFechar();
    } catch (e) {
      const msg = e instanceof ApiError ? e.message : 'Erro ao salvar perfis';
      toast.error(msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Atribuir perfis</DialogTitle>
          <DialogDescription>{usuario.nome} — selecione os perfis aplicaveis</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-2">
          {carregando ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : perfis.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Nenhum perfil cadastrado. Crie em Admin {'>'} Perfis de acesso.
            </p>
          ) : (
            perfis.map((p) => (
              <label
                key={p.id}
                className="border-input hover:bg-muted/50 flex cursor-pointer items-start gap-3 rounded-md border p-3"
              >
                <Checkbox
                  checked={perfisAtuais.includes(p.id)}
                  onCheckedChange={() => alternar(p.id)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Label className="cursor-pointer font-medium">{p.nome}</Label>
                    <span className="text-muted-foreground font-mono text-xs">{p.codigo}</span>
                    {p.ehProtegido && (
                      <Badge variant="secondary" className="text-xs">
                        protegido
                      </Badge>
                    )}
                  </div>
                  {p.descricao && (
                    <p className="text-muted-foreground mt-0.5 text-xs">{p.descricao}</p>
                  )}
                </div>
              </label>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={aoFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando || carregando}>
            {salvando ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
