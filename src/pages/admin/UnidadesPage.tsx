import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { Unidade } from '@/types';

export function UnidadesPage() {
  return (
    <CrudPage<Unidade>
      rotaCodigo="admin.unidades"
      tabela="unidades"
      titulo="Unidades"
      subtitulo="Coworkings, escritorios e CDs do grupo"
      ordenarPor="nome"
      textoBotaoNovo="Nova unidade"
      colunas={[
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'endereco',
          titulo: 'Endereco',
          pesquisavel: true,
          render: (u) => <span className="text-muted-foreground">{u.endereco ?? '—'}</span>,
        },
        {
          chave: 'andares',
          titulo: 'Andares',
          render: (u) =>
            u.andares.length === 0 ? (
              <span className="text-muted-foreground">—</span>
            ) : (
              <div className="flex flex-wrap gap-1">
                {u.andares.map((a) => (
                  <Badge key={a} variant="secondary" className="text-xs">
                    {a}
                  </Badge>
                ))}
              </div>
            ),
        },
        {
          chave: 'status',
          titulo: 'Status',
          largura: '120px',
          alinhar: 'center',
          render: (u) => (
            <Badge variant={u.status === 'active' ? 'default' : 'outline'}>
              {u.status === 'active' ? 'Ativa' : 'Inativa'}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'endereco', label: 'Endereco', tipo: 'textarea', span: 2 },
        {
          nome: 'andares',
          label: 'Andares',
          tipo: 'array-text',
          span: 2,
          placeholder: 'Ex: Terreo, 1, 2, Mezanino...',
          ajuda: 'Digite e pressione Enter para adicionar cada andar',
        },
        {
          nome: 'status',
          label: 'Status',
          tipo: 'select',
          obrigatorio: true,
          opcoes: [
            { valor: 'active', label: 'Ativa' },
            { valor: 'inactive', label: 'Inativa' },
          ],
        },
      ]}
    />
  );
}
