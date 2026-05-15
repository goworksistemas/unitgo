import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { Categoria } from '@/types';

export function CategoriasPage() {
  return (
    <CrudPage<Categoria>
      rotaCodigo="cadastros.categorias"
      tabela="categorias"
      titulo="Categorias de Itens"
      subtitulo="Mobiliario, Eletronicos, Limpeza, Cafe..."
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
