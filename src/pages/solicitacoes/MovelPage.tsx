import { SolicitacaoListaPage } from './_SolicitacaoListaPage';

export function MovelPage() {
  return (
    <SolicitacaoListaPage
      tipoSolicitacao="furniture_to_unit"
      rotaCodigo="solicitacoes.movel"
      titulo="Solicitacoes de Movel"
      subtitulo="Solicitacao de mobiliario para a unidade (passa pela aprovacao do designer)"
      statusInicial="pending_designer"
      filtroItens={(it) => it.ehMovel}
    />
  );
}
