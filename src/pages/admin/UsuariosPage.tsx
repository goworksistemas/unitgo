/**
 * UsuariosPage — lista, edita e atribui perfis aos usuarios.
 *
 * Cadastro novo: feito apenas via /signup (usa Supabase Auth).
 * Aqui o admin pode:
 *  - Editar dados (nome, cargo, departamento, unidades, ativo)
 *  - Atribuir perfis (multi-select de perfis_acesso)
 *  - Inativar/reativar
 */
import { useEffect, useState } from 'react';
import { Pencil, Search, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { useCrud } from '@/hooks/useCrud';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { usePermissao } from '@/hooks/usePermissao';
import { FormDialog } from '@/components/crud/FormDialog';
import { SemAcesso } from '@/components/crud/SemAcesso';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { Perfil, Usuario, UsuarioPerfil } from '@/types';

export function UsuariosPage() {
  const { podeLer, podeEscrever } = usePermissao('admin.usuarios');

  const { itens: usuarios, isLoading, atualizar, recarregar } = useCrud<Usuario>('usuarios', {
    ordenarPor: 'nome',
  });

  const { opcoes: departamentos } = useOpcoesFK('departamentos', 'nome', {
    filtros: { ativo: true },
  });
  const { opcoes: unidades } = useOpcoesFK('unidades', 'nome', { filtros: { status: 'active' } });

  const [busca, setBusca] = useState('');
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [perfilUsuario, setPerfilUsuario] = useState<Usuario | null>(null);

  if (!podeLer) return <SemAcesso rotaCodigo="admin.usuarios" />;

  const usuariosFiltrados = busca.trim()
    ? usuarios.filter(
        (u) =>
          u.nome.toLowerCase().includes(busca.toLowerCase()) ||
          u.email.toLowerCase().includes(busca.toLowerCase()) ||
          (u.cargo ?? '').toLowerCase().includes(busca.toLowerCase()),
      )
    : usuarios;

  const nomeDepartamento = (id: string | null) =>
    departamentos.find((d) => d.valor === id)?.label ?? '—';

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Cadastros novos sao feitos via tela de signup. Aqui voce edita dados e atribui perfis.
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou cargo..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-9"
        />
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
                <TableHead>Nome</TableHead>
                <TableHead>E-mail</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead className="text-center w-24">Ativo</TableHead>
                <TableHead className="text-right w-32">Acoes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usuariosFiltrados.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    Nenhum usuario encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                usuariosFiltrados.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.nome}</TableCell>
                    <TableCell className="text-sm">{u.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.cargo ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {nomeDepartamento(u.departamentoId)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={u.ativo ? 'default' : 'outline'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {podeEscrever && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setEditando(u)}
                              title="Editar"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setPerfilUsuario(u)}
                              title="Atribuir perfis"
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                          </>
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

      <div className="text-xs text-muted-foreground">
        {usuariosFiltrados.length} de {usuarios.length} usuario(s)
      </div>

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
          // Remove campos imutaveis
          const { id: _id, email: _email, criadoEm: _c, atualizadoEm: _a, authUsuarioId: _au, ...rest } =
            valores as Record<string, unknown>;
          const ok = await atualizar(editando.id, rest as Partial<Usuario>);
          if (ok) setEditando(null);
        }}
        aoFechar={() => setEditando(null)}
      />

      {perfilUsuario && (
        <DialogPerfis
          usuario={perfilUsuario}
          aoFechar={() => {
            setPerfilUsuario(null);
            void recarregar();
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
          <DialogDescription>
            {usuario.nome} — selecione os perfis aplicaveis
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 space-y-2">
          {carregando ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : perfis.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum perfil cadastrado. Crie em Admin {'>'} Perfis de acesso.
            </p>
          ) : (
            perfis.map((p) => (
              <label
                key={p.id}
                className="flex items-start gap-3 p-3 rounded-md border border-input hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={perfisAtuais.includes(p.id)}
                  onCheckedChange={() => alternar(p.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium cursor-pointer">{p.nome}</Label>
                    <span className="text-xs font-mono text-muted-foreground">{p.codigo}</span>
                    {p.ehProtegido && (
                      <Badge variant="secondary" className="text-xs">
                        protegido
                      </Badge>
                    )}
                  </div>
                  {p.descricao && (
                    <p className="text-xs text-muted-foreground mt-0.5">{p.descricao}</p>
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
