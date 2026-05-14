import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { Moeda } from '@/types';

export function MoedasPage() {
  return (
    <CrudPage<Moeda>
      rotaCodigo="cadastros.moedas"
      tabela="moedas"
      titulo="Moedas"
      subtitulo="Moedas suportadas pelo sistema"
      ordenarPor="codigo"
      textoBotaoNovo="Nova moeda"
      colunas={[
        {
          chave: 'codigo',
          titulo: 'Codigo',
          pesquisavel: true,
          largura: '120px',
          render: (m) => <span className="font-mono">{m.codigo}</span>,
        },
        {
          chave: 'simbolo',
          titulo: 'Simbolo',
          largura: '90px',
          render: (m) => <span className="text-lg">{m.simbolo}</span>,
        },
        { chave: 'nome', titulo: 'Nome', pesquisavel: true },
        {
          chave: 'ativo',
          titulo: 'Ativo',
          largura: '100px',
          alinhar: 'center',
          render: (m) => (
            <Badge variant={m.ativo ? 'default' : 'outline'}>
              {m.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'codigo',
          label: 'Codigo (ISO)',
          tipo: 'text',
          obrigatorio: true,
          placeholder: 'BRL, USD, EUR...',
          validar: (v) =>
            !v || typeof v !== 'string' || !/^[A-Z]{3}$/.test(v) ? '3 letras maiusculas' : null,
        },
        { nome: 'simbolo', label: 'Simbolo', tipo: 'text', obrigatorio: true, placeholder: 'R$, $, €' },
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
