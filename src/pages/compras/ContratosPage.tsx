/**
 * ContratosPage — CRUD de contratos com fornecedores.
 * O saldo e calculado automaticamente (valor_total - valor_consumido).
 */
import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import type { Contrato } from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

interface ContratoListado extends Contrato {
  fornecedorRazaoSocial: string;
  empresaEmitenteRazaoSocial: string;
  departamentoNome: string | null;
  diasParaVencer: number;
  percentualSaldo: number | null;
}

export function ContratosPage() {
  const { opcoes: fornecedores } = useOpcoesFK('fornecedores', 'razao_social');
  const { opcoes: empresas } = useOpcoesFK('empresas_emitentes', 'razao_social', {
    filtros: { ativo: true },
  });
  const { opcoes: departamentos } = useOpcoesFK('departamentos', 'nome', {
    filtros: { ativo: true },
  });

  return (
    <CrudPage<ContratoListado>
      rotaCodigo="compras.contratos"
      tabela="contratos"
      titulo="Contratos"
      subtitulo="Contratos com fornecedores. Saldo debita automaticamente quando NF e vinculada."
      textoBotaoNovo="Novo contrato"
      rpcLista="fn_listar_contratos"
      placeholderBusca="Buscar por numero, nome ou fornecedor..."
      colunas={[
        {
          chave: 'numero',
          titulo: 'Numero',
          largura: '140px',
          render: (c) => <span className="font-mono text-sm">{c.numero}</span>,
        },
        { chave: 'nome', titulo: 'Nome' },
        {
          chave: 'fornecedorRazaoSocial',
          titulo: 'Fornecedor',
          render: (c) => <span className="text-sm">{c.fornecedorRazaoSocial}</span>,
        },
        {
          chave: 'valorTotal',
          titulo: 'Total',
          alinhar: 'right',
          render: (c) => <span className="font-mono">{FMT_BRL.format(Number(c.valorTotal))}</span>,
        },
        {
          chave: 'saldo',
          titulo: 'Saldo',
          alinhar: 'right',
          render: (c) => {
            const saldo = Number(c.saldo);
            const total = Number(c.valorTotal);
            const pct = total > 0 ? (saldo / total) * 100 : 0;
            return (
              <div>
                <div className="font-mono">{FMT_BRL.format(saldo)}</div>
                <div className="text-muted-foreground text-xs">{pct.toFixed(0)}% restante</div>
              </div>
            );
          },
        },
        {
          chave: 'status',
          titulo: 'Status',
          alinhar: 'center',
          largura: '120px',
          render: (c) => (
            <Badge
              variant={
                c.status === 'active'
                  ? 'default'
                  : c.status === 'concluded'
                    ? 'outline'
                    : 'destructive'
              }
            >
              {c.status}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'numero', label: 'Numero', tipo: 'text', obrigatorio: true },
        { nome: 'nome', label: 'Nome do contrato', tipo: 'text', obrigatorio: true, span: 2 },
        {
          nome: 'fornecedorId',
          label: 'Fornecedor',
          tipo: 'select',
          obrigatorio: true,
          opcoes: fornecedores,
        },
        {
          nome: 'empresaEmitenteId',
          label: 'Empresa emitente',
          tipo: 'select',
          obrigatorio: true,
          opcoes: empresas,
        },
        {
          nome: 'departamentoId',
          label: 'Departamento',
          tipo: 'select',
          opcoes: departamentos,
          permiteVazio: true,
        },
        { nome: 'valorTotal', label: 'Valor total (R$)', tipo: 'number', obrigatorio: true },
        { nome: 'dataInicio', label: 'Data inicio (YYYY-MM-DD)', tipo: 'text', obrigatorio: true },
        { nome: 'dataFim', label: 'Data fim (YYYY-MM-DD)', tipo: 'text', obrigatorio: true },
        {
          nome: 'status',
          label: 'Status',
          tipo: 'select',
          obrigatorio: true,
          opcoes: [
            { valor: 'active', label: 'Ativo' },
            { valor: 'concluded', label: 'Concluido' },
            { valor: 'suspended', label: 'Suspenso' },
            { valor: 'cancelled', label: 'Cancelado' },
          ],
        },
        { nome: 'urlContratoPdf', label: 'URL do PDF', tipo: 'text', span: 2 },
        { nome: 'observacoes', label: 'Observacoes', tipo: 'textarea', span: 2 },
      ]}
    />
  );
}
