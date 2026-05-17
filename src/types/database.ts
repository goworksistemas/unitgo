export type UserRole = 'admin' | 'user'

export type Profile = {
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

export type PrdUnidadeMedida = {
  id: string
  nome: string
  sigla: string
  ativo: boolean
}

export type PrdAtributo = {
  id: string
  nome: string
  tipo_dado: 'texto' | 'numero' | 'lista'
  ordem: number
  ativo: boolean
}

export type PrdAtributoValor = {
  id: string
  atributo_id: string
  valor: string
  ordem: number
  atributo?: PrdAtributo
}

export type PrdProduto = {
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

export type PrdVariante = {
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

export type PrdVarianteAtributo = {
  variante_id: string
  atributo_valor_id: string
  atributo_id: string
  atributo_valor?: PrdAtributoValor
  atributo?: PrdAtributo
}

// ── Tipagem do cliente Supabase ───────────────────────────────

// Linhas "puras" do banco (sem campos relacionais opcionais), usadas pelo cliente Supabase.

type PrdUnidadeMedidaRow = PrdUnidadeMedida

type PrdAtributoRow = PrdAtributo

type PrdAtributoValorRow = Omit<PrdAtributoValor, 'atributo'>

type PrdProdutoRow = Omit<PrdProduto, 'unidade_medida' | 'variantes'>

type PrdVarianteRow = Omit<PrdVariante, 'atributos'>

type PrdVarianteAtributoRow = Omit<PrdVarianteAtributo, 'atributo_valor' | 'atributo'>

// Torna opcionais as chaves cujo valor admite null (colunas com default no banco).
type NullableKeys<T> = { [K in keyof T]-?: null extends T[K] ? K : never }[keyof T]
type WithNullableOptional<T> = Omit<T, NullableKeys<T>> & Partial<Pick<T, NullableKeys<T>>>

type Relationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type TableDef<Row, Insert, Update, Rels extends Relationship[] = []> = {
  Row: Row
  Insert: WithNullableOptional<Insert>
  Update: Update
  Relationships: Rels
}

// Tipagem do banco para o cliente Supabase — expande conforme novas tabelas forem criadas
export type Database = {
  public: {
    Tables: {
      profiles: TableDef<
        Profile,
        Omit<Profile, 'created_at' | 'updated_at'>,
        Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>
      >
      prd_unidades_medida: TableDef<
        PrdUnidadeMedidaRow,
        Omit<PrdUnidadeMedidaRow, 'id' | 'ativo'> & Partial<Pick<PrdUnidadeMedidaRow, 'id' | 'ativo'>>,
        Partial<Omit<PrdUnidadeMedidaRow, 'id'>>
      >
      prd_atributos: TableDef<
        PrdAtributoRow,
        Omit<PrdAtributoRow, 'id' | 'ordem' | 'ativo'> & Partial<Pick<PrdAtributoRow, 'id' | 'ordem' | 'ativo'>>,
        Partial<Omit<PrdAtributoRow, 'id'>>
      >
      prd_atributo_valores: TableDef<
        PrdAtributoValorRow,
        Omit<PrdAtributoValorRow, 'id' | 'ordem'> & Partial<Pick<PrdAtributoValorRow, 'id' | 'ordem'>>,
        Partial<Omit<PrdAtributoValorRow, 'id'>>,
        [
          {
            foreignKeyName: 'prd_atributo_valores_atributo_id_fkey'
            columns: ['atributo_id']
            isOneToOne: false
            referencedRelation: 'prd_atributos'
            referencedColumns: ['id']
          },
        ]
      >
      prd_produtos: TableDef<
        PrdProdutoRow,
        Omit<PrdProdutoRow, 'id' | 'codigo' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<PrdProdutoRow, 'id' | 'codigo' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<PrdProdutoRow, 'id' | 'created_at' | 'updated_at'>>
      >
      prd_variantes: TableDef<
        PrdVarianteRow,
        Omit<PrdVarianteRow, 'id' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<PrdVarianteRow, 'id' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<PrdVarianteRow, 'id' | 'created_at' | 'updated_at'>>,
        [
          {
            foreignKeyName: 'prd_variantes_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'prd_produtos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prd_variantes_unidade_medida_id_fkey'
            columns: ['unidade_medida_id']
            isOneToOne: false
            referencedRelation: 'prd_unidades_medida'
            referencedColumns: ['id']
          },
        ]
      >
      prd_variante_atributos: TableDef<
        PrdVarianteAtributoRow,
        PrdVarianteAtributoRow,
        Partial<PrdVarianteAtributoRow>,
        [
          {
            foreignKeyName: 'prd_variante_atributos_variante_id_fkey'
            columns: ['variante_id']
            isOneToOne: false
            referencedRelation: 'prd_variantes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prd_variante_atributos_atributo_id_fkey'
            columns: ['atributo_id']
            isOneToOne: false
            referencedRelation: 'prd_atributos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prd_variante_atributos_atributo_valor_id_fkey'
            columns: ['atributo_valor_id']
            isOneToOne: false
            referencedRelation: 'prd_atributo_valores'
            referencedColumns: ['id']
          },
        ]
      >
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: {
      user_role: UserRole
    }
  }
}
