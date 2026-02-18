import { useState } from 'react';
import type { UserRole } from '@/types';
import type { DeveloperState } from './types';
import { useUserHandlers } from './useUserHandlers';
import { useItemHandlers } from './useItemHandlers';
import { useUnitHandlers } from './useUnitHandlers';

export function useDeveloperState(): DeveloperState {
  const [viewAsRole, setViewAsRole] = useState<UserRole | null>(null);
  const userHandlers = useUserHandlers();
  const itemHandlers = useItemHandlers();
  const unitHandlers = useUnitHandlers();

  return {
    ...userHandlers,
    ...itemHandlers,
    ...unitHandlers,
    viewAsRole,
    setViewAsRole,
  };
}
