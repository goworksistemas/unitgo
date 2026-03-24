import type { UserRole } from '@/types';

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

const ROLE_LABELS: Record<string, string> = {
  controller: 'Controlador',
  admin: 'Administrador',
  warehouse: 'Almoxarifado',
  designer: 'Designer',
  developer: 'Desenvolvedor',
  requester: 'Solicitante',
};

export function getRoleName(role: string): string {
  return ROLE_LABELS[role] || role;
}

const ROLE_BADGE: Record<string, string> = {
  controller: 'CTR',
  admin: 'ADM',
  warehouse: 'ALM',
  designer: 'DSG',
  developer: 'DEV',
  requester: 'REQ',
};

export function getRoleBadge(role: string): string {
  return ROLE_BADGE[role] || role.substring(0, 3).toUpperCase();
}

export function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'admin':
    case 'developer':
      return 'destructive';
    case 'controller':
      return 'default';
    case 'warehouse':
      return 'secondary';
    default:
      return 'outline';
  }
}

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

export type StatusConfig = { label: string; variant: BadgeVariant };

const STATUS_MAP: Record<string, StatusConfig> = {
  pending: { label: 'Pendente', variant: 'outline' },
  approved: { label: 'Aprovado', variant: 'default' },
  processing: { label: 'Processando', variant: 'secondary' },
  awaiting_pickup: { label: 'Aguardando Retirada', variant: 'secondary' },
  out_for_delivery: { label: 'Em Entrega', variant: 'default' },
  completed: { label: 'Concluído', variant: 'outline' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
  in_transit: { label: 'Em Trânsito', variant: 'secondary' },
  delivered: { label: 'Entregue', variant: 'default' },
  pending_confirmation: { label: 'Aguardando Confirmação', variant: 'outline' },
  confirmed: { label: 'Confirmado', variant: 'default' },
  pending_designer: { label: 'Aguardando Designer', variant: 'outline' },
  approved_designer: { label: 'Aprovado', variant: 'default' },
  approved_storage: { label: 'Aprovado Armazenagem', variant: 'default' },
  approved_disposal: { label: 'Aprovado Descarte', variant: 'destructive' },
};

export function getStatusConfig(status: string): StatusConfig {
  return STATUS_MAP[status] || { label: status, variant: 'outline' as const };
}

/** Substitui UUIDs de unidades no texto pelos nomes (ex.: notas de movimentação com destino). */
export function replaceUnitIdsWithNames(
  text: string,
  units: readonly { id: string; name: string }[]
): string {
  let result = text;
  for (const u of units) {
    if (u.id && result.includes(u.id)) {
      result = result.split(u.id).join(u.name);
    }
  }
  return result;
}
