import { SolicitacaoListaPage } from './_SolicitacaoListaPage';

export function EmprestimoPage() {
  return (
    <SolicitacaoListaPage
      tipoSolicitacao="loan"
      rotaCodigo="solicitacoes.emprestimo"
      titulo="Emprestimos"
      subtitulo="Itens emprestados temporariamente. Aprovacao do controlador"
      statusInicial="pending_approval"
      mostrarTomador
      mostrarDevolucaoPrevista
      filtroItens={(it) => it.permiteEmprestimo}
    />
  );
}
