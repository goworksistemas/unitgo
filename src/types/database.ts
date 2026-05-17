export type UserRole = 'admin' | 'user'

export interface Profile {
  id: string
  email: string
  nome: string | null
  avatar_url: string | null
  role: UserRole
  ativo: boolean
  created_at: string
  updated_at: string
}

// Tipagem mínima do banco para o cliente Supabase — expande conforme novas tabelas forem criadas
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Omit<Profile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
  }
}
