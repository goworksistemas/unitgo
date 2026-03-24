import type { User } from '@/types';

/** Motorista: perfil dedicado ou almox com tipo entrega (legado). */
export function isDriverUser(user: Pick<User, 'role' | 'warehouseType'>): boolean {
  return user.role === 'driver' || (user.role === 'warehouse' && user.warehouseType === 'delivery');
}
