/**
 * Tipos do Módulo Sistema de Compras
 */

export type SupplierStatus = 'active' | 'inactive';
export type SupplierCategoryStatus = 'active' | 'inactive';
export type CostCenterStatus = 'active' | 'inactive';
export type ContractStatus = 'active' | 'encerrado' | 'suspenso';
export type CurrencyStatus = 'active' | 'inactive';

export interface SupplierDadosBancarios {
  banco?: string;
  agencia?: string;
  conta?: string;
  pix?: string;
}

export interface Supplier {
  id: string;
  razaoSocial: string;
  cnpj: string;
  contato?: string;
  email?: string;
  telefone?: string;
  categoriaId?: string;
  endereco?: string;
  dadosBancarios?: SupplierDadosBancarios;
  status: SupplierStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupplierCategory {
  id: string;
  nome: string;
  descricao?: string;
  status: SupplierCategoryStatus;
}

export interface CostCenter {
  id: string;
  codigo: string;
  nome: string;
  descricao?: string;
  status: CostCenterStatus;
}

export interface Contract {
  id: string;
  numero: string;
  nome: string;
  cnpjCliente: string;
  valorTotal: number;
  valorConsumido: number;
  saldo: number;
  dataInicio: Date;
  dataFim: Date;
  centroCustoId: string;
  status: ContractStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface Currency {
  id: string;
  codigo: string;
  simbolo: string;
  nome: string;
  status: CurrencyStatus;
}

export type PurchaseRequestStatus =
  | 'pending_manager'
  | 'approved_manager'
  | 'rejected_manager'
  | 'pending_director'
  | 'approved_director'
  | 'rejected_director'
  | 'in_quotation'
  | 'quotation_completed'
  | 'in_purchase'
  | 'completed';

export interface PurchaseRequestItem {
  id: string;
  solicitacaoId: string;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  observacao?: string;
}

export interface PurchaseApproval {
  id: string;
  userId: string;
  userName: string;
  role: 'manager' | 'director';
  action: 'approved' | 'rejected';
  justificativa?: string;
  timestamp: Date;
}

export interface PurchaseRequest {
  id: string;
  solicitanteId: string;
  unidadeId: string;
  centroCustoId: string;
  cnpjSolicitante?: string;
  contratoId?: string;
  justificativa: string;
  status: PurchaseRequestStatus;
  itens: PurchaseRequestItem[];
  aprovacoes: PurchaseApproval[];
  compradorId?: string;
  atribuidoEm?: string; // ISO date
  createdAt: Date;
  updatedAt: Date;
}

export type QuotationStatus = 'draft' | 'sent' | 'responded' | 'approved' | 'rejected';

export interface QuotationItem {
  id: string;
  cotacaoId: string;
  itemSolicitacaoId: string;
  descricao: string;
  quantidade: number;
  unidadeMedida: string;
  precoUnitario?: number;
  totalItem?: number; // precoUnitario * quantidade
  valorTotal?: number; // alias para totalItem (retrocompatibilidade)
  observacoes?: string;
}

export interface Quotation {
  id: string;
  solicitacaoId: string;
  fornecedorId: string;
  moedaId: string;
  formaPagamento?: string;
  condicoesPagamento?: string;
  prazoEntrega?: number;
  dataPrevisaoEntrega?: string; // ISO date
  frete?: number;
  desconto?: number; // percentual
  ipi?: number; // percentual
  icms?: number; // percentual
  pisCofins?: number; // percentual
  observacoes?: string;
  status: QuotationStatus;
  itens: QuotationItem[];
  linkPreenchimento?: string;
  anexos?: string[]; // URLs Supabase Storage
  totalGeral?: number; // calculado
  enviadoEm?: Date;
  respondidoEm?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type PurchaseOrderStatus =
  | 'created'
  | 'awaiting_nf'
  | 'nf_issued'
  | 'in_transit'
  | 'partially_received'
  | 'fully_received';

export interface InvoiceInfo {
  numero: string;
  valor: number;
  dataEmissao: Date;
  chaveAcesso?: string;
}

export type StatusAprovacao = 'pendente' | 'aprovado' | 'reprovado' | 'em_revisao';
export type AcaoAprovacao = 'pendente' | 'aprovado' | 'reprovado' | 'reenviado';

export interface PurchaseOrderApproval {
  id: string;
  pedidoId: string;
  aprovadorId?: string;
  acao: AcaoAprovacao;
  observacao?: string;
  valorReferencia?: number;
  versao: number;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  cotacaoId: string;
  numeroOmie?: string;
  valorTotal: number;
  status: PurchaseOrderStatus;
  notasFiscais: InvoiceInfo[];
  observacoes?: string;
  statusAprovacao?: StatusAprovacao;
  versao?: number;
  aprovadorNecessarioId?: string;
  compradorId?: string;
  approvals?: PurchaseOrderApproval[];
  createdAt: Date;
  updatedAt: Date;
}

export type ReceivingStatus = 'pending' | 'partially_received' | 'fully_received';

export interface Receiving {
  id: string;
  pedidoId: string;
  itemId: string;
  quantidadeEsperada: number;
  quantidadeRecebida: number;
  responsavelId: string;
  dataRecebimento: Date;
  localEntrega: string;
  status: ReceivingStatus;
  observacoes?: string;
  createdAt: Date;
}

/** Valor em `approval_config.role_name` para separar alçadas de pedido vs requisição */
export type ApprovalConfigEscopo = 'pedido' | 'requisicao';
