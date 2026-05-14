import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import type { EmpresaEmitente } from '@/types';

function formatarCnpj(cnpj: string): string {
  if (!cnpj || cnpj.length !== 14) return cnpj ?? '';
  return `${cnpj.slice(0, 2)}.${cnpj.slice(2, 5)}.${cnpj.slice(5, 8)}/${cnpj.slice(8, 12)}-${cnpj.slice(12)}`;
}

export function EmpresasEmitentesPage() {
  return (
    <CrudPage<EmpresaEmitente>
      rotaCodigo="admin.empresas-emitentes"
      tabela="empresas_emitentes"
      titulo="Empresas Emitentes"
      subtitulo="CNPJs do grupo Gowork (emite NFs e contratos)"
      ordenarPor="razaoSocial"
      textoBotaoNovo="Nova empresa"
      colunas={[
        { chave: 'razaoSocial', titulo: 'Razao Social', pesquisavel: true },
        {
          chave: 'nomeFantasia',
          titulo: 'Nome Fantasia',
          pesquisavel: true,
          render: (e) => e.nomeFantasia ?? '—',
        },
        {
          chave: 'cnpj',
          titulo: 'CNPJ',
          pesquisavel: true,
          largura: '200px',
          render: (e) => <span className="font-mono text-sm">{formatarCnpj(e.cnpj)}</span>,
        },
        {
          chave: 'ativo',
          titulo: 'Ativa',
          largura: '100px',
          alinhar: 'center',
          render: (e) => (
            <Badge variant={e.ativo ? 'default' : 'outline'}>
              {e.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          ),
        },
      ]}
      campos={[
        { nome: 'razaoSocial', label: 'Razao Social', tipo: 'text', obrigatorio: true, span: 2 },
        { nome: 'nomeFantasia', label: 'Nome Fantasia', tipo: 'text' },
        {
          nome: 'cnpj',
          label: 'CNPJ',
          tipo: 'text',
          obrigatorio: true,
          placeholder: '14 digitos sem mascara',
          ajuda: 'Apenas numeros, 14 digitos',
          validar: (v) =>
            !v || typeof v !== 'string' || !/^\d{14}$/.test(v)
              ? 'CNPJ deve ter exatamente 14 digitos numericos'
              : null,
        },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
