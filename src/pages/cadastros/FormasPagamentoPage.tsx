import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { FormaPagamento } from '@/types';

export function FormasPagamentoPage() {
  return (
    <CrudPage<FormaPagamento>
      rotaCodigo="cadastros.formas-pagamento"
      tabela="formas_pagamento"
      titulo="Formas de Pagamento"
      subtitulo="PIX, cartao, boleto, transferencia..."
      ordenarPor="codigo"
      textoBotaoNovo="Nova forma"
      colunasBuscaServidor={['codigo', 'nome', 'descricao']}
      placeholderBusca="Buscar por codigo, nome ou descricao..."
      colunas={[
        {
          chave: 'codigo',
          titulo: 'Codigo',
          largura: '180px',
          render: (f) => <span className="font-mono text-sm">{f.codigo}</span>,
        },
        { chave: 'nome', titulo: 'Nome' },
        {
          chave: 'descricao',
          titulo: 'Descricao',
          render: (f) => <span className="text-muted-foreground">{f.descricao ?? '—'}</span>,
        },
        {
          chave: 'ativo',
          titulo: 'Ativa',
          largura: '100px',
          alinhar: 'center',
          render: (f) => (
            <Badge variant={f.ativo ? 'default' : 'outline'}>{f.ativo ? 'Ativa' : 'Inativa'}</Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'codigo',
          label: 'Codigo',
          tipo: 'text',
          obrigatorio: true,
          placeholder: 'pix, cartao_credito, boleto...',
        },
        { nome: 'nome', label: 'Nome', tipo: 'text', obrigatorio: true },
        { nome: 'descricao', label: 'Descricao', tipo: 'textarea', span: 2 },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
