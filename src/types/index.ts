/**
 * Tipos TypeScript do SupplyGo.
 *
 * Convencoes:
 *  - Nomes em pt-br (sem acento), camelCase no front
 *  - Status/tipos em ingles (compativel com CHECK constraint do banco)
 *  - Datas em ISO string (Supabase serializa timestamptz como string)
 */

// ============================================================================
// Identidade & Organizacao
// ============================================================================

export interface Usuario {
  id: string;
  authUsuarioId: string | null;
  nome: string;
  email: string;
  cargo: string | null;
  unidadesIds: string[];
  departamentoId: string | null;
  codigoDiario: string | null;
  codigoDiarioGeradoEm: string | null;
  exigeTrocaSenha: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Unidade {
  id: string;
  nome: string;
  endereco: string | null;
  andares: string[];
  status: 'active' | 'inactive';
  criadoEm: string;
  atualizadoEm: string;
}

export interface Departamento {
  id: string;
  nome: string;
  descricao: string | null;
  responsavelUsuarioId: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface EmpresaEmitente {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Moeda {
  id: string;
  codigo: string;
  simbolo: string;
  nome: string;
  ativo: boolean;
  criadoEm: string;
}

// ============================================================================
// Listas Cadastraveis
// ============================================================================

export interface UnidadeMedida {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface FormaPagamento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface CondicaoPagamento {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  /** Numero de dias ate o vencimento (NULL = a vista). */
  dias: number | null;
  ativo: boolean;
  criadoEm: string;
}

// ============================================================================
// Catalogo
// ============================================================================

export interface Categoria {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface CategoriaFornecedor {
  id: string;
  nome: string;
  descricao: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface Item {
  id: string;
  produtoCodigo: number | null;
  categoriaId: string | null;
  nome: string;
  descricao: string | null;
  marca: string | null;
  modelo: string | null;
  unidadeMedidaId: string | null;
  urlImagem: string | null;
  ehMovel: boolean;
  ehConsumivel: boolean;
  permiteEmprestimo: boolean;
  exigeTermoResponsabilidade: boolean;
  diasEmprestimoPadrao: number | null;
  quantidadeMinimaPadrao: number;
  precoReferencia: number | null;
  fornecedorPreferencialId: string | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Fornecedor {
  id: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  cnpj: string | null;
  cpf: string | null;
  inscricaoEstadual: string | null;
  categoriaId: string | null;
  contatoNome: string | null;
  contatoEmail: string | null;
  contatoTelefone: string | null;
  contatoWhatsapp: string | null;
  endereco: Record<string, unknown>;
  dadosBancarios: Record<string, unknown>;
  totalPedidos: number;
  valorTotalComprado: number;
  ultimaCompraEm: string | null;
  notaAvaliacao: number | null;
  status: 'active' | 'inactive' | 'blocked';
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ============================================================================
// Estoque & Movimentacoes
// ============================================================================

export interface EstoqueUnidade {
  id: string;
  itemId: string;
  unidadeId: string;
  quantidade: number;
  quantidadeMinima: number;
  criadoEm: string;
  atualizadoEm: string;
}

export type TipoMovimentacao =
  | 'entry'
  | 'exit'
  | 'transfer'
  | 'loan_out'
  | 'loan_return'
  | 'disposal'
  | 'adjustment';

export interface Movimentacao {
  id: string;
  tipo: TipoMovimentacao;
  itemId: string;
  quantidade: number;
  usuarioId: string;
  unidadeId: string | null;
  unidadeOrigemId: string | null;
  unidadeDestinoId: string | null;
  tomadorUsuarioId: string | null;
  emprestimoDevolucaoPrevista: string | null;
  movimentacaoOrigemId: string | null;
  solicitacaoId: string | null;
  loteEntregaId: string | null;
  pedidoCompraId: string | null;
  notaFiscalId: string | null;
  observacoes: string | null;
  ordemServico: string | null;
  motivoDescarte: string | null;
  metadados: Record<string, unknown>;
  criadoEm: string;
}

// ============================================================================
// Solicitacoes operacionais (material, movel, retirada-movel, emprestimo)
// ============================================================================

export type TipoSolicitacao = 'material' | 'furniture_to_unit' | 'furniture_removal' | 'loan';

export type StatusSolicitacao =
  | 'pending'
  | 'approved'
  | 'awaiting_pickup'
  | 'out_for_delivery'
  | 'delivery_confirmed'
  | 'received_confirmed'
  | 'completed'
  | 'rejected'
  | 'cancelled'
  | 'pending_designer'
  | 'approved_designer'
  | 'approved_storage'
  | 'separated'
  | 'awaiting_delivery'
  | 'in_transit'
  | 'pending_confirmation'
  | 'pending_approval'
  | 'active'
  | 'returned'
  | 'overdue'
  | 'approved_disposal';

export type Urgencia = 'low' | 'medium' | 'high';

export interface Solicitacao {
  id: string;
  numero: string | null;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  itemId: string;
  quantidade: number;
  unidadeSolicitanteId: string;
  solicitadoPorUsuarioId: string;
  andarDestino: string | null;
  localizacaoDetalhe: string | null;
  justificativa: string | null;
  urgencia: Urgencia;
  aprovadoPorUsuarioId: string | null;
  aprovadoEm: string | null;
  designerUsuarioId: string | null;
  designerDecididoEm: string | null;
  decisaoDescarte: 'storage' | 'disposal' | null;
  justificativaDescarte: string | null;
  emprestimoDevolucaoPrevista: string | null;
  tomadorUsuarioId: string | null;
  controladorAprovadorId: string | null;
  motivoRejeicao: string | null;
  rejeitadoPorUsuarioId: string | null;
  rejeitadoEm: string | null;
  codigoQr: string | null;
  separadoPorUsuarioId: string | null;
  separadoEm: string | null;
  prontoRetiradaEm: string | null;
  retiradoPorUsuarioId: string | null;
  retiradoEm: string | null;
  entregueEm: string | null;
  concluidoEm: string | null;
  canceladoEm: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ============================================================================
// Entregas
// ============================================================================

export type StatusLoteEntrega =
  | 'pending'
  | 'in_transit'
  | 'delivered'
  | 'received_confirmed'
  | 'completed'
  | 'cancelled';

export interface LoteEntrega {
  id: string;
  numero: string | null;
  unidadeDestinoId: string;
  motoristaUsuarioId: string;
  codigoQr: string;
  status: StatusLoteEntrega;
  despachadoEm: string | null;
  entregueEm: string | null;
  recebidoEm: string | null;
  concluidoEm: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface LoteEntregaItem {
  id: string;
  loteId: string;
  solicitacaoId: string;
  ordem: number;
  criadoEm: string;
}

export type TipoConfirmacaoEntrega = 'driver_delivery' | 'reception_receipt' | 'requester_confirm';

export interface ConfirmacaoEntrega {
  id: string;
  loteId: string | null;
  solicitacaoId: string | null;
  tipo: TipoConfirmacaoEntrega;
  confirmadoPorUsuarioId: string;
  recebidoPorUsuarioId: string | null;
  urlFoto: string | null;
  urlAssinatura: string | null;
  localizacao: { latitude: number; longitude: number } | null;
  codigoDiario: string | null;
  observacoes: string | null;
  criadoEm: string;
}

// ============================================================================
// Permissoes
// ============================================================================

export interface Perfil {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ehProtegido: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

export interface Rota {
  id: string;
  caminho: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  modulo: string | null;
  icone: string | null;
  ordem: number;
  ehPublica: boolean;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/**
 * Linha de matriz `perfis_acesso_rotas`.
 */
export interface PerfilRota {
  perfilId: string;
  rotaId: string;
  podeLer: boolean;
  podeEscrever: boolean;
  podeExcluir: boolean;
  podeAprovar: boolean;
  criadoEm: string;
}

/**
 * Vinculo N:N usuarios <-> perfis.
 */
export interface UsuarioPerfil {
  usuarioId: string;
  perfilId: string;
  criadoEm: string;
  criadoPorUsuarioId: string | null;
}

/**
 * Permissoes extras concedidas diretamente a um usuario (alem dos perfis).
 */
export interface UsuarioRotaExtra {
  usuarioId: string;
  rotaId: string;
  podeLer: boolean;
  podeEscrever: boolean;
  podeExcluir: boolean;
  podeAprovar: boolean;
  motivo: string | null;
  criadoEm: string;
  criadoPorUsuarioId: string | null;
}

/** Escopo de aplicacao da alcada de aprovacao. */
export type EscopoAlcada = 'pedido' | 'requisicao';

/**
 * Alcada de aprovacao por faixa de valor.
 *
 * Aprovador (usuario direto OU perfil) aprova quando o valor do pedido cai na
 * faixa `[valor_limite_min, valor_limite_max]`. `valor_limite_max` NULL = sem
 * teto. Pode ainda ser restringida a departamentos especificos via N:N.
 */
export interface AlcadaAprovacao {
  id: string;
  escopo: EscopoAlcada;
  usuarioId: string | null;
  perfilAprovador: string | null;
  valorLimiteMin: number;
  valorLimiteMax: number | null;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}

/** Vinculo N:N alcadas <-> departamentos (restringe alcada a setores). */
export interface AlcadaAprovacaoDepartamento {
  alcadaId: string;
  departamentoId: string;
}

/**
 * Rota com flags de permissao consolidadas (retornada por meu_perfil()).
 */
export interface RotaPermitida {
  id: string;
  codigo: string;
  caminho: string;
  nome: string;
  modulo: string | null;
  icone: string | null;
  ordem: number;
  podeLer: boolean;
  podeEscrever: boolean;
  podeExcluir: boolean;
  podeAprovar: boolean;
}

export type FlagPermissao = 'podeLer' | 'podeEscrever' | 'podeExcluir' | 'podeAprovar';

/**
 * Resposta da RPC `meu_perfil()`.
 */
export interface MeuPerfil {
  usuario: Usuario | null;
  perfis: Perfil[];
  rotasPermitidas: RotaPermitida[];
}

// ============================================================================
// Compras
// ============================================================================

export type StatusSolicitacaoCompra =
  | 'pending_manager'
  | 'approved_manager'
  | 'rejected_manager'
  | 'in_quotation'
  | 'quotation_completed'
  | 'pending_director'
  | 'in_purchase'
  | 'completed'
  | 'cancelled';

export interface SolicitacaoCompra {
  id: string;
  numero: string | null;
  solicitanteId: string;
  unidadeId: string | null;
  departamentoId: string | null;
  empresaEmitenteId: string | null;
  contratoId: string | null;
  fornecedorSugeridoId: string | null;
  linkReferencia: string | null;
  justificativa: string;
  urgencia: Urgencia;
  status: StatusSolicitacaoCompra;
  aprovadorGestorId: string | null;
  gestorAprovadoEm: string | null;
  gestorAprovadoPorId: string | null;
  gestorMotivoRejeicao: string | null;
  compradorId: string | null;
  atribuidoEm: string | null;
  anexos: unknown[];
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface SolicitacaoCompraItem {
  id: string;
  solicitacaoId: string;
  itemId: string | null;
  descricao: string;
  codigo: string | null;
  quantidade: number;
  unidadeMedidaId: string | null;
  contaContabil: string | null;
  dataNecessidade: string | null;
  prioridade: 'normal' | 'emergencial';
  observacao: string | null;
  ordem: number;
}

export type StatusCotacao =
  | 'draft'
  | 'sent'
  | 'partially_responded'
  | 'fully_responded'
  | 'finalized'
  | 'cancelled';

export interface Cotacao {
  id: string;
  numero: string | null;
  compradorId: string;
  dataLimiteResposta: string | null;
  observacoesFornecedor: string | null;
  localEntregaUnidadeId: string | null;
  linkPreenchimento: string | null;
  enviarEmailFornecedor: boolean;
  copiarSolicitanteEmail: boolean;
  status: StatusCotacao;
  fornecedorVencedorId: string | null;
  finalizadaEm: string | null;
  finalizadaPorId: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface CotacaoFornecedor {
  id: string;
  cotacaoId: string;
  fornecedorId: string;
  emailEnviadoEm: string | null;
  linkToken: string | null;
}

export type StatusCotacaoResposta = 'pending' | 'responded' | 'declined' | 'expired';

export interface CotacaoResposta {
  id: string;
  cotacaoId: string;
  cotacaoFornecedorId: string;
  fornecedorId: string;
  moedaId: string | null;
  formaPagamentoId: string | null;
  condicoesPagamentoId: string | null;
  prazoEntregaDias: number | null;
  dataPrevisaoEntrega: string | null;
  valorSubtotal: number | null;
  valorFrete: number;
  valorDesconto: number;
  percentualIpi: number;
  percentualIcms: number;
  percentualPisCofins: number;
  valorTotal: number | null;
  status: StatusCotacaoResposta;
  respondidoEm: string | null;
  observacoesFornecedor: string | null;
  anexos: unknown[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface CotacaoRespostaItem {
  id: string;
  respostaId: string;
  solicitacaoCompraItemId: string;
  precoUnitario: number | null;
  quantidade: number | null;
  totalItem: number | null;
  observacoes: string | null;
}

export type StatusPedidoCompra =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'rejected'
  | 'sent_to_supplier'
  | 'awaiting_nf'
  | 'nf_issued'
  | 'in_transit'
  | 'partially_received'
  | 'fully_received'
  | 'completed'
  | 'cancelled';

export type StatusAprovacaoPedido = 'pendente' | 'aprovado' | 'reprovado' | 'em_revisao';

export interface PedidoCompra {
  id: string;
  numero: string | null;
  cotacaoId: string | null;
  fornecedorId: string;
  empresaEmitenteId: string;
  compradorId: string;
  solicitantePrincipalId: string | null;
  contratoId: string | null;
  localEntregaUnidadeId: string | null;
  passaPeloEstoque: boolean;
  contatoFornecedorNome: string | null;
  contatoFornecedorEmail: string | null;
  moedaId: string | null;
  formaPagamentoId: string | null;
  condicoesPagamentoId: string | null;
  valorSubtotal: number | null;
  valorFrete: number;
  valorDesconto: number;
  valorImpostos: number;
  valorTotal: number;
  status: StatusPedidoCompra;
  statusAprovacao: StatusAprovacaoPedido;
  versaoAprovacao: number;
  aprovadorAlcadaId: string | null;
  enviadoFornecedorEm: string | null;
  dataPrevisaoEntrega: string | null;
  canceladoEm: string | null;
  motivoCancelamento: string | null;
  observacoes: string | null;
  anexos: unknown[];
  criadoEm: string;
  atualizadoEm: string;
}

export interface PedidoCompraItem {
  id: string;
  pedidoId: string;
  solicitacaoCompraItemId: string | null;
  itemId: string | null;
  descricao: string;
  codigo: string | null;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  unidadeMedidaId: string | null;
  ordem: number;
}

export interface PedidoCompraAprovacao {
  id: string;
  pedidoId: string;
  versao: number;
  aprovadorId: string | null;
  acao: 'pendente' | 'aprovado' | 'reprovado' | 'reenviado';
  observacao: string | null;
  valorReferencia: number | null;
  criadoEm: string;
}

export type StatusNotaFiscal = 'received' | 'paid' | 'cancelled' | 'returned';

export type TipoNotaFiscal = 'entrada' | 'devolucao' | 'servico';

export interface NotaFiscal {
  id: string;
  numero: string;
  serie: string | null;
  chaveAcesso: string | null;
  tipo: TipoNotaFiscal;
  fornecedorId: string;
  cnpjEmissor: string;
  empresaEmitenteId: string;
  moedaId: string | null;
  valorProdutos: number | null;
  valorFrete: number;
  valorDesconto: number;
  valorImpostos: number;
  valorTotal: number;
  dataEmissao: string;
  dataEntrada: string | null;
  dataVencimento: string | null;
  status: StatusNotaFiscal;
  urlXml: string | null;
  urlPdf: string | null;
  urlBoleto: string | null;
  lancadaPorUsuarioId: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export interface NotaFiscalPedido {
  notaFiscalId: string;
  pedidoCompraId: string;
  /** Quanto do total da NF foi alocado a este pedido (R$). */
  valorAlocado: number | null;
}

export type StatusContrato = 'active' | 'concluded' | 'suspended' | 'cancelled';

export interface Contrato {
  id: string;
  numero: string;
  nome: string;
  fornecedorId: string;
  empresaEmitenteId: string;
  departamentoId: string | null;
  valorTotal: number;
  valorConsumido: number;
  saldo: number;
  dataInicio: string;
  dataFim: string;
  status: StatusContrato;
  urlContratoPdf: string | null;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

export type StatusRecebimento = 'pending_check' | 'partial' | 'complete' | 'rejected';

export interface RecebimentoCompra {
  id: string;
  pedidoId: string;
  pedidoItemId: string;
  notaFiscalId: string | null;
  unidadeRecebimentoId: string;
  quantidadeEsperada: number;
  quantidadeRecebida: number;
  quantidadeAvariada: number;
  quantidadeDevolvida: number;
  dataRecebimento: string;
  recebidoPorUsuarioId: string;
  conferidoPorUsuarioId: string | null;
  urlFotoRecebimento: string | null;
  status: StatusRecebimento;
  observacoes: string | null;
  criadoEm: string;
  atualizadoEm: string;
}

// ============================================================================
// Auditoria & Notificacoes
// ============================================================================

export interface LogAtividade {
  id: string;
  tipoEntidade: string;
  entidadeId: string;
  acao: string;
  usuarioId: string | null;
  statusAnterior: string | null;
  statusNovo: string | null;
  dados: Record<string, unknown>;
  ipOrigem: string | null;
  userAgent: string | null;
  criadoEm: string;
}

export type PrioridadeNotificacao = 'low' | 'normal' | 'high' | 'urgent';

export interface Notificacao {
  id: string;
  usuarioId: string;
  tipo: string;
  prioridade: PrioridadeNotificacao;
  titulo: string;
  mensagem: string | null;
  linkAcao: string | null;
  tipoEntidade: string | null;
  entidadeId: string | null;
  lidoEm: string | null;
  arquivadoEm: string | null;
  enviadoEmail: boolean;
  enviadoWhatsapp: boolean;
  enviadoPush: boolean;
  criadoEm: string;
}

// ============================================================================
// Views de Dashboard (somente leitura)
//
// Refletem as views SQL criadas em 001_schema_completo.sql (secao 16).
// Cada interface estende a tabela base com os campos enriquecidos via JOIN.
// ============================================================================

/** View `estoques_abaixo_minimo` — itens cujo saldo esta abaixo do minimo. */
export interface ViewEstoqueAbaixoMinimo extends EstoqueUnidade {
  itemNome: string;
  produtoCodigo: number | null;
  unidadeNome: string;
  /** Quantidade que falta para atingir o minimo. */
  deficit: number;
}

/** View `emprestimos_atrasados` — emprestimos em aberto com prazo vencido. */
export interface ViewEmprestimoAtrasado extends Movimentacao {
  /** Sempre `loan_out` aqui, herdado de Movimentacao.tipo. */
}

/** View `contratos_proximos_vencimento` — contratos vencendo em 30d ou saldo < 10%. */
export interface ViewContratoProximoVencimento extends Contrato {
  fornecedorRazaoSocial: string;
  /** Pode ser negativo se ja venceu. */
  diasParaVencer: number;
  /** Percentual restante do contrato (0-100). */
  percentualSaldo: number | null;
}

/** View `pedidos_aguardando_aprovacao` — pedidos com status_aprovacao = 'pendente'. */
export interface ViewPedidoAguardandoAprovacao extends PedidoCompra {
  fornecedorRazaoSocial: string;
  compradorNome: string;
  aprovadorNome: string | null;
}

/**
 * View `solicitacoes_tempo_etapas` — agregado de tempos por etapa de solicitacao.
 * So inclui solicitacoes ja concluidas.
 */
export interface ViewSolicitacaoTempoEtapas {
  id: string;
  numero: string | null;
  tipo: TipoSolicitacao;
  status: StatusSolicitacao;
  criadoEm: string;
  aprovadoEm: string | null;
  concluidoEm: string;
  horasAteAprovacao: number | null;
  horasAprovacaoAConclusao: number | null;
  horasTotal: number;
}
