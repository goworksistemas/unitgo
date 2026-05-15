import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { CategoriaFornecedor } from '@/types';

export function CategoriasFornecedorPage() {
  return (
    <CrudPage<CategoriaFornecedor>
      rotaCodigo="cadastros.categorias-fornecedor"
      tabela="categorias_fornecedor"
      titulo="Categorias de Fornecedor"
      subtitulo="E-commerce, Distribuidor, Fabricante, Prestador de Servico..."
      ordenarPor="nome"
      textoBotaoNovo="Nova categoria"
      colunasBuscaServidor={['nome', 'descricao']}
      placeholderBusca="Buscar por nome ou descricao..."
      colunas={[
        { chave: 'nome', titulo: 'Nome' },
        {
          chave: 'descricao',
          titulo: 'Descricao',
          render: (c) => <span className="text-muted-foreground">{c.descricao ?? '—'}</span>,
        },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '100px',
          alinhar: 'center',
          render: (c) => (
            <Badge variant={c.ativo ? 'default' : 'outline'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
