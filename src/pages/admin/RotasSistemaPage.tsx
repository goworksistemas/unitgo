import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { Rota } from '@/types';

export function RotasSistemaPage() {
  return (
    <CrudPage<Rota>
      rotaCodigo="admin.rotas-sistema"
      tabela="rotas_sistema"
      titulo="Rotas do Sistema"
      subtitulo="Catalogo de telas que podem ser permissionadas"
      ordenarPor="ordem"
      textoBotaoNovo="Nova rota"
      // Rotas publicas/protegidas nao podem ser excluidas
      permiteExcluir={(r) => !r.ehPublica}
      colunas={[
        {
          chave: 'codigo',
          titulo: 'Codigo',
          pesquisavel: true,
          largura: '220px',
          render: (r) => <span className="font-mono text-sm">{r.codigo}</span>,
        },
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'modulo',
          titulo: 'Modulo',
          largura: '140px',
          render: (r) =>
            r.modulo ? (
              <Badge variant="secondary">{r.modulo}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          chave: 'caminho',
          titulo: 'Caminho',
          pesquisavel: true,
          render: (r) => <span className="font-mono text-xs">{r.caminho}</span>,
        },
        {
          chave: 'ordem',
          titulo: 'Ordem',
          alinhar: 'center',
          largura: '90px',
        },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '100px',
          alinhar: 'center',
          render: (r) => (
            <Badge variant={r.ativo ? 'default' : 'outline'}>
              {r.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'codigo',
          label: 'Codigo',
          tipo: 'text',
          obrigatorio: true,
          placeholder: 'modulo.tela (ex: cadastros.itens)',
          ajuda: 'Identificador unico, no formato modulo.tela',
        },
        {
          nome: 'caminho',
          label: 'Caminho',
          tipo: 'text',
          obrigatorio: true,
          placeholder: '/cadastros/itens',
        },
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        {
          nome: 'modulo',
          label: 'Modulo',
          tipo: 'text',
          placeholder: 'admin, cadastros, estoque, compras...',
        },
        {
          nome: 'icone',
          label: 'Icone',
          tipo: 'text',
          placeholder: 'lucide-react: Box, Users, Settings...',
        },
        { nome: 'ordem', label: 'Ordem', tipo: 'number' },
        { nome: 'ehPublica', label: 'E publica', tipo: 'boolean' },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
