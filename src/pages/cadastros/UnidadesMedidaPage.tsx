import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { UnidadeMedida } from '@/types';

export function UnidadesMedidaPage() {
  return (
    <CrudPage<UnidadeMedida>
      rotaCodigo="cadastros.unidades-medida"
      tabela="unidades_medida"
      titulo="Unidades de Medida"
      subtitulo="un, kg, m, l, cx... usadas em itens e pedidos"
      ordenarPor="codigo"
      textoBotaoNovo="Nova unidade"
      colunas={[
        {
          chave: 'codigo',
          titulo: 'Codigo',
          pesquisavel: true,
          largura: '120px',
          render: (u) => <span className="font-mono">{u.codigo}</span>,
        },
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'descricao',
          titulo: 'Descricao',
          pesquisavel: true,
          render: (u) => <span className="text-muted-foreground">{u.descricao ?? '—'}</span>,
        },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '100px',
          alinhar: 'center',
          render: (u) => (
            <Badge variant={u.ativo ? 'default' : 'outline'}>{u.ativo ? 'Ativa' : 'Inativa'}</Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'codigo',
          label: 'Codigo',
          tipo: 'text',
          obrigatorio: true,
          placeholder: 'un, kg, m, l, cx...',
          validar: (v) =>
            typeof v === 'string' && v.trim() !== v.trim().toLowerCase()
              ? 'use minusculas, sem espacos'
              : null,
        },
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
