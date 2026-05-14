import { SolicitacaoListaPage } from './_SolicitacaoListaPage';

export function MaterialPage() {
  return (
    <SolicitacaoListaPage
      tipoSolicitacao="material"
      rotaCodigo="solicitacoes.material"
      titulo="Pedidos de Material"
      subtitulo="Solicitacoes de materiais consumiveis para uma unidade"
      statusInicial="pending"
      filtroItens={(it) => it.ehConsumivel || (!it.ehMovel && !it.permiteEmprestimo)}
    />
  );
}
