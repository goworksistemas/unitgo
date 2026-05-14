/**
 * Helpers de formatacao (datas, status, badges).
 */

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDateShort(date: Date | string): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
  });
}

/** Texto curto para "ha quanto tempo" (passado), em pt-BR. */
export function formatRelativeTimePast(date: Date | string | undefined): string {
  if (date === undefined || date === null) return '';
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `ha ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `ha ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `ha ${days} ${days === 1 ? 'dia' : 'dias'}`;
  return formatDateShort(date);
}

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export type StatusConfig = { label: string; variant: BadgeVariant };

/**
 * Mapa de status (banco -> label + variante de badge).
 * Cobre todos os status validos do schema novo.
 */
const STATUS_MAP: Record<string, StatusConfig> = {
  // Solicitacoes - tipo material
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'default' },
  awaiting_pickup: { label: 'Aguardando Retirada', variant: 'secondary' },
  out_for_delivery: { label: 'Em Entrega', variant: 'default' },
  delivery_confirmed: { label: 'Entrega Confirmada', variant: 'default' },
  received_confirmed: { label: 'Recebimento Confirmado', variant: 'default' },
  completed: { label: 'Concluido', variant: 'outline' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },

  // Solicitacoes - tipo furniture
  pending_designer: { label: 'Aguardando Designer', variant: 'outline' },
  approved_designer: { label: 'Aprovado pelo Designer', variant: 'default' },
  approved_storage: { label: 'Aprovado Armazenagem', variant: 'default' },
  approved_disposal: { label: 'Aprovado Descarte', variant: 'destructive' },
  separated: { label: 'Separado', variant: 'secondary' },
  awaiting_delivery: { label: 'Aguardando Entrega', variant: 'secondary' },
  in_transit: { label: 'Em Transito', variant: 'secondary' },
  pending_confirmation: { label: 'Aguardando Confirmacao', variant: 'outline' },

  // Solicitacoes - tipo loan
  pending_approval: { label: 'Aguardando Aprovacao', variant: 'outline' },
  active: { label: 'Ativo', variant: 'default' },
  returned: { label: 'Devolvido', variant: 'outline' },
  overdue: { label: 'Atrasado', variant: 'destructive' },

  // Lotes de entrega
  delivered: { label: 'Entregue', variant: 'default' },

  // Solicitacoes de compra
  pending_manager: { label: 'Aguardando Gestor', variant: 'outline' },
  approved_manager: { label: 'Aprovado Gestor', variant: 'default' },
  rejected_manager: { label: 'Rejeitado pelo Gestor', variant: 'destructive' },
  in_quotation: { label: 'Em Cotacao', variant: 'secondary' },
  quotation_completed: { label: 'Cotacao Finalizada', variant: 'default' },
  pending_director: { label: 'Aguardando Diretor', variant: 'outline' },
  in_purchase: { label: 'Em Compra', variant: 'secondary' },

  // Cotacoes
  draft: { label: 'Rascunho', variant: 'outline' },
  sent: { label: 'Enviada', variant: 'secondary' },
  partially_responded: { label: 'Parcialmente Respondida', variant: 'secondary' },
  fully_responded: { label: 'Respondida', variant: 'default' },
  finalized: { label: 'Finalizada', variant: 'default' },
  responded: { label: 'Respondida', variant: 'default' },
  declined: { label: 'Recusada', variant: 'destructive' },
  expired: { label: 'Expirada', variant: 'outline' },

  // Pedidos de compra
  sent_to_supplier: { label: 'Enviado ao Fornecedor', variant: 'default' },
  awaiting_nf: { label: 'Aguardando NF', variant: 'outline' },
  nf_issued: { label: 'NF Emitida', variant: 'default' },
  partially_received: { label: 'Parcialmente Recebido', variant: 'secondary' },
  fully_received: { label: 'Totalmente Recebido', variant: 'default' },

  // Status de aprovacao (versionado)
  pendente: { label: 'Pendente', variant: 'outline' },
  aprovado: { label: 'Aprovado', variant: 'default' },
  reprovado: { label: 'Reprovado', variant: 'destructive' },
  em_revisao: { label: 'Em Revisao', variant: 'secondary' },

  // Notas fiscais
  received: { label: 'Recebida', variant: 'default' },
  paid: { label: 'Paga', variant: 'default' },

  // Recebimentos
  pending_check: { label: 'Aguardando Conferencia', variant: 'outline' },
  partial: { label: 'Parcial', variant: 'secondary' },
  complete: { label: 'Completo', variant: 'default' },

  // Contratos
  concluded: { label: 'Concluido', variant: 'outline' },
  suspended: { label: 'Suspenso', variant: 'destructive' },

  // Generico
  active_status: { label: 'Ativo', variant: 'default' },
  inactive: { label: 'Inativo', variant: 'outline' },
  blocked: { label: 'Bloqueado', variant: 'destructive' },
};

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, variant: 'outline' as const };
}

/**
 * Tipos de movimentacao (banco -> label).
 */
const TIPO_MOVIMENTACAO_LABELS: Record<string, string> = {
  entry: 'Entrada',
  exit: 'Saida',
  transfer: 'Transferencia',
  loan_out: 'Emprestimo (saida)',
  loan_return: 'Devolucao de Emprestimo',
  disposal: 'Descarte',
  adjustment: 'Ajuste',
};

export function getTipoMovimentacaoLabel(tipo: string): string {
  return TIPO_MOVIMENTACAO_LABELS[tipo] || tipo;
}

/**
 * Tipos de solicitacao (banco -> label).
 */
const TIPO_SOLICITACAO_LABELS: Record<string, string> = {
  material: 'Material',
  furniture_to_unit: 'Movel para Unidade',
  furniture_removal: 'Retirada de Movel',
  loan: 'Emprestimo',
};

export function getTipoSolicitacaoLabel(tipo: string): string {
  return TIPO_SOLICITACAO_LABELS[tipo] || tipo;
}

/**
 * Urgencia (banco -> label).
 */
const URGENCIA_LABELS: Record<string, string> = {
  low: 'Baixa',
  medium: 'Media',
  high: 'Alta',
};

export function getUrgenciaLabel(urgencia: string): string {
  return URGENCIA_LABELS[urgencia] || urgencia;
}
