import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import type { Departamento } from '@/types';

export function DepartamentosPage() {
  const { opcoes: usuarios } = useOpcoesFK('usuarios', 'nome', { filtros: { ativo: true } });

  // Mapa para mostrar o nome do responsavel na lista
  const nomeUsuario = (id: string | null) =>
    usuarios.find((u) => u.valor === id)?.label ?? '—';

  return (
    <CrudPage<Departamento>
      rotaCodigo="admin.departamentos"
      tabela="departamentos"
      titulo="Departamentos"
      subtitulo="Setores funcionais (Obras, Arquitetura, Facilities...)"
      ordenarPor="nome"
      textoBotaoNovo="Novo departamento"
      colunas={[
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'descricao',
          titulo: 'Descricao',
          pesquisavel: true,
          render: (d) => <span className="text-muted-foreground">{d.descricao ?? '—'}</span>,
        },
        {
          chave: 'responsavelUsuarioId',
          titulo: 'Responsavel',
          render: (d) => (
            <span className="text-sm">{nomeUsuario(d.responsavelUsuarioId)}</span>
          ),
        },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '100px',
          alinhar: 'center',
          render: (d) => (
            <Badge variant={d.ativo ? 'default' : 'outline'}>
              {d.ativo ? 'Ativo' : 'Inativo'}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        {
          nome: 'responsavelUsuarioId',
          label: 'Responsavel',
          tipo: 'select',
          opcoes: usuarios,
          permiteVazio: true,
          ajuda: 'Gestor responsavel por este departamento',
          span: 2,
        },
        { nome: 'ativo', label: 'Ativo', tipo: 'boolean' },
      ]}
    />
  );
}
