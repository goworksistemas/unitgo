/**
 * NotasFiscaisPage — CRUD de notas fiscais com vinculo a pedidos.
 *
 * Lista via RPC `fn_listar_notas_fiscais` (paginada, JOIN com fornecedor e
 * empresa emitente ja resolvidos).
 */
import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import { formatDate } from '@/lib/format';
import type { NotaFiscal } from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface NotaFiscalListada extends NotaFiscal {
  fornecedorRazaoSocial: string;
  empresaEmitenteRazaoSocial: string;
}

export function NotasFiscaisPage() {
  const { opcoes: fornecedores } = useOpcoesFK('fornecedores', 'razao_social');
  const { opcoes: empresas } = useOpcoesFK('empresas_emitentes', 'razao_social', {
    filtros: { ativo: true },
  });
  const { opcoes: moedas } = useOpcoesFK('moedas', 'codigo', { filtros: { ativo: true } });

  return (
    <CrudPage<NotaFiscalListada>
      rotaCodigo="compras.notas-fiscais"
      tabela="notas_fiscais"
      titulo="Notas Fiscais"
      subtitulo="Lancamento e gestao de NFs de entrada"
      textoBotaoNovo="Nova NF"
      rpcLista="fn_listar_notas_fiscais"
      placeholderBusca="Buscar por numero, chave, fornecedor ou CNPJ..."
      colunas={[
        {
          chave: 'numero',
          titulo: 'Numero',
          largura: '120px',
          render: (n) => (
            <span className="font-mono text-sm">
              {n.numero}
              {n.serie ? `-${n.serie}` : ''}
            </span>
          ),
        },
        {
          chave: 'dataEmissao',
          titulo: 'Emissao',
          largura: '140px',
          render: (n) => <span className="text-xs">{formatDate(n.dataEmissao)}</span>,
        },
        {
          chave: 'fornecedorRazaoSocial',
          titulo: 'Fornecedor',
          render: (n) => <span className="text-sm">{n.fornecedorRazaoSocial}</span>,
        },
        {
          chave: 'empresaEmitenteRazaoSocial',
          titulo: 'Empresa',
          render: (n) => <span className="text-sm">{n.empresaEmitenteRazaoSocial}</span>,
        },
        {
          chave: 'valorTotal',
          titulo: 'Valor',
          alinhar: 'right',
          render: (n) => <span className="font-mono">{FMT_BRL.format(Number(n.valorTotal))}</span>,
        },
        {
          chave: 'status',
          titulo: 'Status',
          alinhar: 'center',
          largura: '100px',
          render: (n) => (
            <Badge
              variant={
                n.status === 'paid'
                  ? 'default'
                  : n.status === 'cancelled'
                    ? 'destructive'
                    : 'secondary'
              }
            >
              {n.status}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'numero', label: 'Numero NF', tipo: 'text', obrigatorio: true },
        { nome: 'serie', label: 'Serie', tipo: 'text' },
        { nome: 'chaveAcesso', label: 'Chave de acesso (44 digitos)', tipo: 'text', span: 2 },
        {
          nome: 'fornecedorId',
          label: 'Fornecedor',
          tipo: 'select',
          obrigatorio: true,
          opcoes: fornecedores,
          span: 2,
        },
        { nome: 'cnpjEmissor', label: 'CNPJ emissor', tipo: 'text', obrigatorio: true },
        {
          nome: 'empresaEmitenteId',
          label: 'Empresa emitente (destino)',
          tipo: 'select',
          obrigatorio: true,
          opcoes: empresas,
        },
        {
          nome: 'moedaId',
          label: 'Moeda',
          tipo: 'select',
          opcoes: moedas,
          permiteVazio: true,
        },
        {
          nome: 'tipo',
          label: 'Tipo',
          tipo: 'select',
          obrigatorio: true,
          opcoes: [
            { valor: 'entrada', label: 'Entrada' },
            { valor: 'saida', label: 'Saida' },
          ],
        },
        { nome: 'valorProdutos', label: 'Valor produtos', tipo: 'number' },
        { nome: 'valorFrete', label: 'Frete', tipo: 'number' },
        { nome: 'valorDesconto', label: 'Desconto', tipo: 'number' },
        { nome: 'valorImpostos', label: 'Impostos', tipo: 'number' },
        { nome: 'valorTotal', label: 'Valor total', tipo: 'number', obrigatorio: true },
        {
          nome: 'dataEmissao',
          label: 'Data emissao',
          tipo: 'text',
          obrigatorio: true,
          ajuda: 'YYYY-MM-DD ou ISO completo',
        },
        { nome: 'dataVencimento', label: 'Data vencimento', tipo: 'text' },
        {
          nome: 'status',
          label: 'Status',
          tipo: 'select',
          obrigatorio: true,
          opcoes: [
            { valor: 'received', label: 'Recebida' },
            { valor: 'paid', label: 'Paga' },
            { valor: 'cancelled', label: 'Cancelada' },
            { valor: 'returned', label: 'Devolvida' },
          ],
        },
        { nome: 'observacoes', label: 'Observacoes', tipo: 'textarea', span: 2 },
      ]}
    />
  );
}
