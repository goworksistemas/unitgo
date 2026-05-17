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

// ── Módulo de Produtos ────────────────────────────────────────

export interface PrdUnidadeMedida {
  id: string
  nome: string
  sigla: string
  ativo: boolean
}

export interface PrdAtributo {
  id: string
  nome: string
  tipo_dado: 'texto' | 'numero' | 'lista'
  ordem: number
  ativo: boolean
}

export interface PrdAtributoValor {
  id: string
  atributo_id: string
  valor: string
  ordem: number
  atributo?: PrdAtributo
}

export interface PrdProduto {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  unidade_medida_id: string
  imagem_url: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  unidade_medida?: PrdUnidadeMedida
  variantes?: PrdVariante[]
}

export interface PrdVariante {
  id: string
  produto_id: string
  nome: string | null
  sku: string | null
  chave_variante: string | null
  unidade_medida_id: string | null
  preco_referencia: number | null
  ativo: boolean
  created_at: string
  updated_at: string
  atributos?: PrdVarianteAtributo[]
}

export interface PrdVarianteAtributo {
  variante_id: string
  atributo_valor_id: string
  atributo_id: string
  atributo_valor?: PrdAtributoValor
  atributo?: PrdAtributo
}

// ── Tipagem do cliente Supabase ───────────────────────────────

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
