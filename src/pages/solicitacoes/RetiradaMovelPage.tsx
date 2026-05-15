import { SolicitacaoListaPage } from './_SolicitacaoListaPage';

export function RetiradaMovelPage() {
  return (
    <SolicitacaoListaPage
      tipoSolicitacao="furniture_removal"
      rotaCodigo="solicitacoes.retirada-movel"
      titulo="Retirada de Movel"
      subtitulo="Movel sai da unidade. Designer decide armazenar ou descartar"
      statusInicial="pending_designer"
      filtroItensParamsRpc={{ pEhMovel: true }}
    />
  );
}
