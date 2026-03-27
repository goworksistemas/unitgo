import type { PurchaseOrder, PurchaseRequest } from '@/types/purchases';
import type { User } from '@/types';

/** Pedidos no escopo do comprador (ou fila global no modo dev “visualizar como”). */
export function filterOrdersForBuyer(
  orders: PurchaseOrder[],
  currentUser: User | null,
  relaxedScope: boolean,
): PurchaseOrder[] {
  if (!currentUser) return [];
  return orders.filter((o) => {
    if (!o.compradorId) return false;
    if (relaxedScope) return true;
    return o.compradorId === currentUser.id;
  });
}

/** SCs atribuídas ao comprador (ou todas com comprador no modo relaxado). */
export function filterRequestsForBuyer(
  requests: PurchaseRequest[],
  currentUser: User | null,
  relaxedScope: boolean,
): PurchaseRequest[] {
  if (!currentUser) return [];
  return requests.filter((r) => {
    if (!r.compradorId) return false;
    if (relaxedScope) return true;
    return r.compradorId === currentUser.id;
  });
}
