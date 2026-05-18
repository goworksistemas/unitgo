export type UserRole = 'admin' | 'user' | 'gestor' | 'diretor' | 'comprador'

export type Profile = {
  id: string
  email: string
  nome: string | null
  avatar_url: string | null
  role: UserRole
  ativo: boolean
  departamento_id: string | null
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

export type ProdutoTipo = 'produto' | 'servico'

export type PrdProduto = {
  id: string
  codigo: string
  nome: string
  descricao: string | null
  unidade_medida_id: string
  imagem_url: string | null
  codigo_origem: string | null
  tipo: ProdutoTipo
  empresa_id: string | null
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
  codigo_origem: string | null
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

// ── Tabelas-núcleo ────────────────────────────────────────────

export type CoreEmpresa = {
  id: string
  razao_social: string
  nome_fantasia: string | null
  cnpj: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

export type CoreDepartamento = {
  id: string
  codigo: string | null
  nome: string
  descricao: string | null
  gestor_id: string | null
  ativo: boolean
  created_at: string
  updated_at: string
  gestor?: Profile
}

// ── Módulo de Compras — Solicitação de Compra ────────────────

export type CmpSolicitacaoStatus =
  | 'rascunho'
  | 'aguardando_aprovacao'
  | 'aprovada'
  | 'reprovada'
  | 'cancelada'
  | 'atendida'

export type CmpItemStatus =
  | 'pendente'
  | 'em_cotacao'
  | 'em_pedido'
  | 'atendido'
  | 'cancelado'

export type CmpPrioridade = 'baixa' | 'normal' | 'alta' | 'urgente'

export type CmpSolicitacao = {
  id: string
  numero: string
  empresa_id: string
  departamento_id: string
  solicitante_id: string
  data_necessaria: string | null
  prioridade: CmpPrioridade
  justificativa: string | null
  observacoes: string | null
  status: CmpSolicitacaoStatus
  aprovador_id: string | null
  aprovado_em: string | null
  motivo_reprovacao: string | null
  enviada_em: string | null
  cancelada_em: string | null
  created_at: string
  updated_at: string
  empresa?: CoreEmpresa
  departamento?: CoreDepartamento
  solicitante?: Profile
  aprovador?: Profile
  itens?: CmpSolicitacaoItem[]
}

export type CmpSolicitacaoItem = {
  id: string
  solicitacao_id: string
  linha: number
  produto_id: string
  variante_id: string | null
  unidade_medida_id: string
  quantidade: number
  preco_estimado: number | null
  observacao: string | null
  status_item: CmpItemStatus
  created_at: string
  updated_at: string
  produto?: PrdProduto
  variante?: PrdVariante
  unidade_medida?: PrdUnidadeMedida
}

export type CmpAprovacaoTipo = 'solicitacao' | 'pedido'
export type CmpAprovacaoAcao = 'enviou' | 'aprovou' | 'reprovou' | 'cancelou' | 'encaminhou'

export type CmpAprovacao = {
  id: string
  documento_tipo: CmpAprovacaoTipo
  documento_id: string
  nivel: number
  aprovador_id: string
  acao: CmpAprovacaoAcao
  comentario: string | null
  created_at: string
  aprovador?: Profile
}

// ── Tipagem do cliente Supabase ───────────────────────────────

// Linhas "puras" do banco (sem campos relacionais opcionais), usadas pelo cliente Supabase.

type PrdUnidadeMedidaRow = PrdUnidadeMedida

type PrdAtributoRow = PrdAtributo

type PrdAtributoValorRow = Omit<PrdAtributoValor, 'atributo'>

type PrdProdutoRow = Omit<PrdProduto, 'unidade_medida' | 'variantes'>

type PrdVarianteRow = Omit<PrdVariante, 'atributos'>

type PrdVarianteAtributoRow = Omit<PrdVarianteAtributo, 'atributo_valor' | 'atributo'>

type CoreEmpresaRow      = CoreEmpresa
type CoreDepartamentoRow = Omit<CoreDepartamento, 'gestor'>

type CmpSolicitacaoRow =
  Omit<CmpSolicitacao, 'empresa' | 'departamento' | 'solicitante' | 'aprovador' | 'itens'>

type CmpSolicitacaoItemRow =
  Omit<CmpSolicitacaoItem, 'produto' | 'variante' | 'unidade_medida'>

type CmpAprovacaoRow = Omit<CmpAprovacao, 'aprovador'>

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
      core_empresas: TableDef<
        CoreEmpresaRow,
        Omit<CoreEmpresaRow, 'id' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<CoreEmpresaRow, 'id' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CoreEmpresaRow, 'id' | 'created_at' | 'updated_at'>>
      >
      core_departamentos: TableDef<
        CoreDepartamentoRow,
        Omit<CoreDepartamentoRow, 'id' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<CoreDepartamentoRow, 'id' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CoreDepartamentoRow, 'id' | 'created_at' | 'updated_at'>>,
        [
          {
            foreignKeyName: 'core_departamentos_gestor_id_fkey'
            columns: ['gestor_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      >
      cmp_solicitacoes_compra: TableDef<
        CmpSolicitacaoRow,
        Omit<CmpSolicitacaoRow,
          'id' | 'numero' | 'status' | 'prioridade' |
          'aprovador_id' | 'aprovado_em' | 'motivo_reprovacao' |
          'enviada_em' | 'cancelada_em' |
          'created_at' | 'updated_at'> &
          Partial<Pick<CmpSolicitacaoRow,
            'id' | 'numero' | 'status' | 'prioridade' |
            'aprovador_id' | 'aprovado_em' | 'motivo_reprovacao' |
            'enviada_em' | 'cancelada_em' |
            'created_at' | 'updated_at'>>,
        Partial<Omit<CmpSolicitacaoRow, 'id' | 'numero' | 'created_at' | 'updated_at'>>,
        [
          {
            foreignKeyName: 'cmp_solicitacoes_compra_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'core_empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_departamento_id_fkey'
            columns: ['departamento_id']
            isOneToOne: false
            referencedRelation: 'core_departamentos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_solicitante_id_fkey'
            columns: ['solicitante_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_aprovador_id_fkey'
            columns: ['aprovador_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      >
      cmp_solicitacoes_compra_itens: TableDef<
        CmpSolicitacaoItemRow,
        Omit<CmpSolicitacaoItemRow, 'id' | 'status_item' | 'created_at' | 'updated_at'> &
          Partial<Pick<CmpSolicitacaoItemRow, 'id' | 'status_item' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CmpSolicitacaoItemRow, 'id' | 'created_at' | 'updated_at'>>,
        [
          {
            foreignKeyName: 'cmp_solicitacoes_compra_itens_solicitacao_id_fkey'
            columns: ['solicitacao_id']
            isOneToOne: false
            referencedRelation: 'cmp_solicitacoes_compra'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_itens_produto_id_fkey'
            columns: ['produto_id']
            isOneToOne: false
            referencedRelation: 'prd_produtos'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_itens_variante_id_fkey'
            columns: ['variante_id']
            isOneToOne: false
            referencedRelation: 'prd_variantes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_solicitacoes_compra_itens_unidade_medida_id_fkey'
            columns: ['unidade_medida_id']
            isOneToOne: false
            referencedRelation: 'prd_unidades_medida'
            referencedColumns: ['id']
          },
        ]
      >
      cmp_aprovacoes: TableDef<
        CmpAprovacaoRow,
        Omit<CmpAprovacaoRow, 'id' | 'nivel' | 'created_at'> &
          Partial<Pick<CmpAprovacaoRow, 'id' | 'nivel' | 'created_at'>>,
        Partial<Omit<CmpAprovacaoRow, 'id' | 'created_at'>>,
        [
          {
            foreignKeyName: 'cmp_aprovacoes_aprovador_id_fkey'
            columns: ['aprovador_id']
            isOneToOne: false
            referencedRelation: 'profiles'
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
