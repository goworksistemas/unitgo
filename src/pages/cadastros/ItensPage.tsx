import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import type { Item } from '@/types';

export function ItensPage() {
  const { opcoes: categorias } = useOpcoesFK('categorias', 'nome', { filtros: { ativo: true } });
  const { opcoes: unidadesMedida } = useOpcoesFK('unidades_medida', 'nome', {
    filtros: { ativo: true },
  });
  const { opcoes: fornecedores } = useOpcoesFK('fornecedores', 'razao_social', {
    filtros: { status: 'active' },
  });

  const nomeCategoria = (id: string | null) =>
    categorias.find((c) => c.valor === id)?.label ?? '—';
  const nomeUnidade = (id: string | null) =>
    unidadesMedida.find((u) => u.valor === id)?.label ?? '—';

  return (
    <CrudPage<Item>
      rotaCodigo="cadastros.itens"
      tabela="itens"
      titulo="Catalogo de Itens"
      subtitulo="Produtos consumiveis e moveis cadastrados no grupo"
      ordenarPor="nome"
      textoBotaoNovo="Novo item"
      colunas={[
        {
          chave: 'produtoCodigo',
          titulo: 'Cod.',
          largura: '90px',
          render: (i) =>
            i.produtoCodigo ? (
              <span className="font-mono text-sm">{i.produtoCodigo}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'categoriaId',
          titulo: 'Categoria',
          render: (i) => <span className="text-sm">{nomeCategoria(i.categoriaId)}</span>,
        },
        {
          chave: 'unidadeMedidaId',
          titulo: 'Unid. Medida',
          largura: '120px',
          render: (i) => <span className="text-sm">{nomeUnidade(i.unidadeMedidaId)}</span>,
        },
        {
          chave: 'flags',
          titulo: 'Flags',
          render: (i) => (
            <div className="flex flex-wrap gap-1">
              {i.ehMovel && (
                <Badge variant="secondary" className="text-xs">
                  Movel
                </Badge>
              )}
              {i.ehConsumivel && (
                <Badge variant="secondary" className="text-xs">
                  Consumivel
                </Badge>
              )}
              {i.permiteEmprestimo && (
                <Badge variant="secondary" className="text-xs">
                  Emprestavel
                </Badge>
              )}
            </div>
          ),
        },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '90px',
          alinhar: 'center',
          render: (i) => (
            <Badge variant={i.ativo ? 'default' : 'outline'}>{i.ativo ? 'Ativo' : 'Inativo'}</Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        {
          nome: 'produtoCodigo',
          label: 'Codigo (sequencial)',
          tipo: 'number',
          ajuda: 'Opcional. Sera gerado automaticamente se vazio.',
        },
        {
          nome: 'categoriaId',
          label: 'Categoria',
          tipo: 'select',
          opcoes: categorias,
          permiteVazio: true,
        },
        { nome: 'marca', label: 'Marca', tipo: 'text' },
        { nome: 'modelo', label: 'Modelo', tipo: 'text' },
        {
          nome: 'unidadeMedidaId',
          label: 'Unidade de Medida',
          tipo: 'select',
          opcoes: unidadesMedida,
          permiteVazio: true,
        },
        {
          nome: 'fornecedorPreferencialId',
          label: 'Fornecedor Preferencial',
          tipo: 'select',
          opcoes: fornecedores,
          permiteVazio: true,
        },
        {
          nome: 'precoReferencia',
          label: 'Preco Referencia (R$)',
          tipo: 'number',
        },
        {
          nome: 'quantidadeMinimaPadrao',
          label: 'Qtd. Minima Padrao',
          tipo: 'number',
          ajuda: 'Usado como default ao criar estoque por unidade',
        },
        { nome: 'urlImagem', label: 'URL da Imagem', tipo: 'text', span: 2 },
        { nome: 'ehMovel', label: 'E movel', tipo: 'boolean' },
        { nome: 'ehConsumivel', label: 'E consumivel', tipo: 'boolean' },
        { nome: 'permiteEmprestimo', label: 'Permite emprestimo', tipo: 'boolean' },
        {
          nome: 'exigeTermoResponsabilidade',
          label: 'Exige termo de responsabilidade',
          tipo: 'boolean',
        },
        {
          nome: 'diasEmprestimoPadrao',
          label: 'Dias emprestimo (padrao)',
          tipo: 'number',
          ajuda: 'Usado quando permite emprestimo',
        },
        { nome: 'ativo', label: 'Ativo', tipo: 'boolean' },
      ]}
    />
  );
}
