/**
 * AlcadasAprovacaoPage — define quem aprova ate qual valor.
 *
 * Modelo simples: (usuario_id, valor_limite). Quem tem alcada maior
 * aprova tudo abaixo. valor_limite NULL = sem teto.
 */
import { Badge } from '@/components/ui/badge';
import { CrudPage } from '@/components/crud/CrudPage';
import { useOpcoesFK } from '@/hooks/useOpcoesFK';
import type { AlcadaAprovacao } from '@/types';

const FMT_BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

export function AlcadasAprovacaoPage() {
  const { opcoes: usuarios } = useOpcoesFK('usuarios', 'nome', { filtros: { ativo: true } });

  const nomeUsuario = (id: string) =>
    usuarios.find((u) => u.valor === id)?.label ?? '—';

  return (
    <CrudPage<AlcadaAprovacao>
      rotaCodigo="admin.alcadas-aprovacao"
      tabela="alcadas_aprovacao"
      titulo="Alcadas de Aprovacao"
      subtitulo="Quem pode aprovar pedidos de compra ate determinado valor"
      ordenarPor="valorLimite"
      ascendente={false}
      textoBotaoNovo="Nova alcada"
      mensagemVazia="Nenhuma alcada cadastrada. Cadastre os aprovadores para viabilizar a 2a camada de aprovacao."
      colunas={[
        {
          chave: 'usuarioId',
          titulo: 'Aprovador',
          render: (a) => <span className="font-medium">{nomeUsuario(a.usuarioId)}</span>,
        },
        {
          chave: 'valorLimite',
          titulo: 'Aprova ate',
          render: (a) =>
            a.valorLimite === null || a.valorLimite === undefined ? (
              <Badge variant="default">Sem teto</Badge>
            ) : (
              <span className="font-mono text-sm">{FMT_BRL.format(Number(a.valorLimite))}</span>
            ),
        },
        {
          chave: 'ativo',
          titulo: 'Status',
          largura: '120px',
          alinhar: 'center',
          render: (a) => (
            <Badge variant={a.ativo ? 'default' : 'outline'}>
              {a.ativo ? 'Ativa' : 'Inativa'}
            </Badge>
          ),
        },
      ]}
      campos={[
        {
          nome: 'usuarioId',
          label: 'Aprovador',
          tipo: 'select',
          obrigatorio: true,
          opcoes: usuarios,
          ajuda: 'Usuario com poder de aprovacao',
          span: 2,
        },
        {
          nome: 'valorLimite',
          label: 'Valor limite (R$)',
          tipo: 'number',
          ajuda: 'Aprova pedidos ate este valor. Vazio = sem teto (aprova qualquer valor).',
          span: 2,
        },
        { nome: 'ativo', label: 'Ativa', tipo: 'boolean' },
      ]}
    />
  );
}
