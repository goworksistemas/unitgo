import { projectId, publicAnonKey, functionSlug } from './supabase/info';

const API_URL = `https://${projectId}.supabase.co/functions/v1/${functionSlug}`;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'gowork_auth_token',
  REFRESH_TOKEN: 'gowork_refresh_token',
  CURRENT_USER: 'gowork_current_user',
  PENDING_USER_ID: 'gowork_pending_user_id',
} as const;

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
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
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

  async getSession() {
    const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);

    if (!token) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/session`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        // Token expirado/inválido: tenta refresh antes de desistir
        const refreshed = await this.refreshSession();
        if (refreshed) {
          return refreshed;
        }
        this.clearStorage();
        return null;
      }

      const data = await response.json();

      // Atualiza token se o backend retornar um novo
      if (data.session?.access_token) {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, data.session.access_token);
      }
      if (data.session?.refresh_token) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, data.session.refresh_token);
      }

      return data;
    } catch (error) {
      console.error('Error getting session:', error);
      // Em caso de erro de rede, não limpa a sessão — pode ser offline temporário
      return null;
    }
  },

  async refreshSession(): Promise<any | null> {
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
        localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      console.error('Error refreshing session:', error);
      return null;
    }
  },

  getCurrentUser() {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  },

  hasStoredSession(): boolean {
    return !!(
      localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) &&
      localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    );
  },

  getStoredUserId(): string | null {
    const user = this.getCurrentUser();
    return user?.id ?? null;
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