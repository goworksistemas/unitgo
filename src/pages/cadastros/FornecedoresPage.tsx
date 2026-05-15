import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import type { Fornecedor } from '@/types';

function formatarDoc(cnpj?: string | null, cpf?: string | null): string {
  if (cnpj && cnpj.length === 14) {
    return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
  }
  if (cpf && cpf.length === 11) {
    return `${cpf.slice(0, 3)}.${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-${cpf.slice(9)}`;
  }
  return cnpj ?? cpf ?? '—';
}

interface FornecedorListado extends Fornecedor {
  categoriaNome: string | null;
}

export function FornecedoresPage() {
  const { opcoes: categorias } = useOpcoesFK('categorias_fornecedor', 'nome', {
    filtros: { ativo: true },
  });

  return (
    <CrudPage<FornecedorListado>
      rotaCodigo="cadastros.fornecedores"
      tabela="fornecedores"
      titulo="Fornecedores"
      subtitulo="Empresas e pessoas que vendem para o grupo"
      textoBotaoNovo="Novo fornecedor"
      rpcLista="fn_listar_fornecedores"
      placeholderBusca="Buscar por razao social, fantasia, CNPJ..."
      antesDeSalvar={(valores) => {
        // Garante que JSONB nunca seja null/string vazia
        if (!valores.endereco || typeof valores.endereco !== 'object') valores.endereco = {};
        if (!valores.dadosBancarios || typeof valores.dadosBancarios !== 'object')
          valores.dadosBancarios = {};
        // CNPJ/CPF: se string vazia, vira null (compativel com check XOR)
        if (valores.cnpj === '') valores.cnpj = null;
        if (valores.cpf === '') valores.cpf = null;
        return valores;
      }}
      colunas={[
        { chave: 'razaoSocial', titulo: 'Razao Social' },
        {
          chave: 'nomeFantasia',
          titulo: 'Nome Fantasia',
          render: (f) => f.nomeFantasia ?? '—',
        },
        {
          chave: 'documento',
          titulo: 'CNPJ/CPF',
          largura: '180px',
          render: (f) => <span className="font-mono text-xs">{formatarDoc(f.cnpj, f.cpf)}</span>,
        },
        {
          chave: 'contatoNome',
          titulo: 'Contato',
          render: (f) => (
            <div className="text-sm">
              <div>{f.contatoNome ?? '—'}</div>
              {f.contatoEmail && (
                <div className="text-muted-foreground text-xs">{f.contatoEmail}</div>
              )}
            </div>
          ),
        },
        {
          chave: 'status',
          titulo: 'Status',
          largura: '120px',
          alinhar: 'center',
          render: (f) => (
            <Badge
              variant={
                f.status === 'active'
                  ? 'default'
                  : f.status === 'blocked'
                    ? 'destructive'
                    : 'outline'
              }
            >
              {f.status === 'active' ? 'Ativo' : f.status === 'blocked' ? 'Bloqueado' : 'Inativo'}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'razaoSocial', label: 'Razao Social', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'nomeFantasia', label: 'Nome Fantasia', tipo: 'text', span: 2 },
        {
          nome: 'cnpj',
          label: 'CNPJ',
          tipo: 'text',
          placeholder: '14 digitos sem mascara',
          ajuda: 'Preencha CNPJ OU CPF',
          validar: (v) =>
            v && typeof v === 'string' && v.length > 0 && !/^\d{14}$/.test(v)
              ? 'CNPJ deve ter 14 digitos'
              : null,
        },
        {
          nome: 'cpf',
          label: 'CPF',
          tipo: 'text',
          placeholder: '11 digitos sem mascara',
          ajuda: 'Preencha CNPJ OU CPF',
          validar: (v) =>
            v && typeof v === 'string' && v.length > 0 && !/^\d{11}$/.test(v)
              ? 'CPF deve ter 11 digitos'
              : null,
        },
        { nome: 'inscricaoEstadual', label: 'Inscricao Estadual', tipo: 'text' },
        {
          nome: 'categoriaId',
          label: 'Categoria',
          tipo: 'select',
          opcoes: categorias,
          permiteVazio: true,
        },
        { nome: 'contatoNome', label: 'Nome do Contato', tipo: 'text' },
        { nome: 'contatoEmail', label: 'E-mail', tipo: 'text' },
        { nome: 'contatoTelefone', label: 'Telefone', tipo: 'text' },
        { nome: 'contatoWhatsapp', label: 'WhatsApp', tipo: 'text' },
        {
          nome: 'status',
          label: 'Status',
          tipo: 'select',
          obrigatorio: true,
          opcoes: [
            { valor: 'active', label: 'Ativo' },
            { valor: 'inactive', label: 'Inativo' },
            { valor: 'blocked', label: 'Bloqueado' },
          ],
        },
        { nome: 'notaAvaliacao', label: 'Nota (0-5)', tipo: 'number' },
        { nome: 'observacoes', label: 'Observacoes', tipo: 'textarea', span: 2 },
      ]}
    />
  );
}
