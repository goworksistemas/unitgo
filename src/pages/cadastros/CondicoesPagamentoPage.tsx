/**
 * CondicoesPagamentoPage — CRUD simples (id, codigo, nome, descricao, dias).
 *
 * `dias` define quantos dias apos a emissao a parcela vence (NULL = a vista).
 * Modelos com multiplas parcelas/recorrencia ficam fora do escopo atual —
 * comprador pode usar "30 dias", "60 dias", etc. e cadastrar variantes.
 */
import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { CondicaoPagamento } from '@/types';

export function CondicoesPagamentoPage() {
  return (
    <CrudPage<CondicaoPagamento>
      rotaCodigo="cadastros.condicoes-pagamento"
      tabela="condicoes_pagamento"
      titulo="Condicoes de Pagamento"
      subtitulo="A vista, 7 dias, 30 dias, 60 dias..."
      ordenarPor="codigo"
      textoBotaoNovo="Nova condicao"
      colunasBuscaServidor={['codigo', 'nome', 'descricao']}
      placeholderBusca="Buscar por codigo, nome ou descricao..."
      colunas={[
        {
          chave: 'codigo',
          titulo: 'Codigo',
          largura: '180px',
          render: (c) => <span className="font-mono text-sm">{c.codigo}</span>,
        },
        { chave: 'nome', titulo: 'Nome' },
        {
          chave: 'descricao',
          titulo: 'Descricao',
          render: (c) => <span className="text-muted-foreground">{c.descricao ?? '—'}</span>,
        },
        {
          chave: 'dias',
          titulo: 'Vencimento',
          largura: '160px',
          alinhar: 'center',
          render: (c) =>
            c.dias === null || c.dias === undefined ? (
              <Badge variant="secondary">A vista</Badge>
            ) : (
              <span className="font-mono text-sm">{c.dias} dias</span>
            ),
        },
        {
          chave: 'ativo',
          titulo: 'Ativa',
          largura: '100px',
          alinhar: 'center',
          render: (c) => (
            <Badge variant={c.ativo ? 'default' : 'outline'}>{c.ativo ? 'Ativa' : 'Inativa'}</Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'codigo',
          label: 'Codigo',
          tipo: 'text',
          obrigatorio: true,
          placeholder: 'a_vista, 7d, 30d, 60d...',
          ajuda: 'Identificador unico (sem espacos)',
        },
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        {
          nome: 'dias',
          label: 'Dias para vencimento',
          tipo: 'number',
          ajuda: 'Quantos dias apos a emissao a parcela vence. Vazio = a vista (D+0).',
        },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
