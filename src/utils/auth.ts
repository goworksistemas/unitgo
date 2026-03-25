import type { User } from '@/types';
import { projectId, publicAnonKey, functionSlug } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gowork_auth_token',
  REFRESH_TOKEN: 'gowork_refresh_token',
  CURRENT_USER: 'gowork_current_user',
  PENDING_USER_ID: 'gowork_pending_user_id',
} as const;

/** Normaliza usuário vindo do login (camelCase) ou do GET /session (snake_case do Postgres). */
export function normalizeStoredUserRow(user: Record<string, unknown> | null | undefined): User | null {
  if (!user || typeof user.id !== 'string') return null;
  const primary =
    (user.primaryUnitId as string | undefined) ??
    (user.primary_unit_id as string | undefined);
  const additional =
    (user.additionalUnitIds as string[] | undefined) ??
    (user.additional_unit_ids as string[] | undefined);
  const departmentId =
    (user.departmentId as string | null | undefined) ??
    (user.department_id as string | null | undefined);

  return {
    id: user.id,
    name: String(user.name ?? ''),
    email: String(user.email ?? ''),
    role: user.role as User['role'],
    primaryUnitId: primary,
    additionalUnitIds: Array.isArray(additional) ? additional : undefined,
    departmentId: departmentId === undefined ? undefined : departmentId,
    warehouseType: (user.warehouseType ?? user.warehouse_type) as User['warehouseType'],
    adminType: (user.adminType ?? user.admin_type) as User['adminType'],
    jobTitle: (user.jobTitle ?? user.job_title) as string | undefined,
    requirePasswordChange: Boolean(user.requirePasswordChange ?? user.require_password_change),
    dailyCode: (user.dailyCode ?? user.daily_code) as string | undefined,
    dailyCodeGeneratedAt: user.dailyCodeGeneratedAt
      ? new Date(user.dailyCodeGeneratedAt as string)
      : user.daily_code_generated_at
        ? new Date(user.daily_code_generated_at as string)
        : undefined,
  };
}

export type AuthBootstrapState = 'valid' | 'offline' | 'logged_out';

interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams extends SignInParams {
  name: string;
  role: string;
  primaryUnitId?: string;
  warehouseType?: string;
}

export const authService = {
  async signIn({ email, password }: SignInParams) {
    const response = await fetch(`${API_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Erro de autenticação:', error);
      throw new Error(error.error || 'Erro ao fazer login');
    }

    const data = await response.json();

    if (data.session?.access_token) {
      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.session.access_token);
    }

    if (data.session?.refresh_token) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.session.refresh_token);
    }

    if (data.user) {
      const normalized = normalizeStoredUserRow(data.user);
      if (normalized) {
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(normalized));
      }
    }

    return data;
  },

  async signUp(params: SignUpParams) {
    const response = await fetch(`${API_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sign up');
    }

    const data = await response.json();
    return data;
  },

  async signOut() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (token) {
      try {
        await fetch(`${API_URL}/auth/signout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }

    this.clearStorage();
  },

  clearStorage() {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    localStorage.removeItem(STORAGE_KEYS.PENDING_USER_ID);
  },

  /**
   * Valida token com o servidor. Erros de rede / 5xx não removem login local.
   * Só desloga após 401/403 com refresh inválido ou ausente.
   */
  async validateAuthState(): Promise<AuthBootstrapState> {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    if (!token) {
      return 'logged_out';
    }

    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          const refreshed = await this.refreshSession();
          if (refreshed === 'network') {
            console.warn('⚠️ Rede/servidor ao renovar sessão; mantendo login local');
            return 'offline';
          }
          if (refreshed) {
            return 'valid';
          }
          this.clearStorage();
          return 'logged_out';
        }
        console.warn(`⚠️ /auth/session HTTP ${response.status}; mantendo login local`);
        return 'offline';
      }

      const data = await response.json();

      if (data.session?.access_token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.session.access_token);
      }
      if (data.session?.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.session.refresh_token);
      }
      if (data.user) {
        const normalized = normalizeStoredUserRow(data.user);
        if (normalized) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(normalized));
        }
      }

      return 'valid';
    } catch (error) {
      console.error('Error validating session:', error);
      return 'offline';
    }
  },

  async refreshSession(): Promise<any | null | 'network'> {
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    if (!refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`,
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        if (response.status >= 500 || response.status === 429 || response.status === 408) {
          return 'network';
        }
        return null;
      }

      const data = await response.json();

      if (data.session?.access_token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.session.access_token);
      }
      if (data.session?.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.session.refresh_token);
      }
      if (data.user) {
        const normalized = normalizeStoredUserRow(data.user);
        if (normalized) {
          localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(normalized));
        }
      }

      return data;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return 'network';
    }
  },

  getCurrentUser(): Record<string, unknown> | null {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as Record<string, unknown>;
    } catch {
      return null;
    }
  },

  getCurrentUserNormalized(): User | null {
    return normalizeStoredUserRow(this.getCurrentUser());
  },

  hasStoredSession(): boolean {
    return !!(
      localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) &&
      localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    );
  },

  getStoredUserId(): string | null {
    const user = this.getCurrentUser();
    const id = user?.id;
    return typeof id === 'string' ? id : null;
  },

  async updatePassword(userId: string, newPassword: string) {
    const response = await fetch(`${API_URL}/auth/update-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao atualizar senha');
    }

    const data = await response.json();
    return data;
  },
};