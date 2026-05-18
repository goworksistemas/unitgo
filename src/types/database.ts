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

export type CmpAprovacaoTipo = 'solicitacao' | 'cotacao' | 'pedido'
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

// ── Módulo de Compras — Fornecedor ────────────────────────────

export type CmpFornecedor = {
  id: string
  cnpj_cpf: string | null
  razao_social: string
  nome_fantasia: string | null
  email: string | null
  telefone: string | null
  observacoes: string | null
  ativo: boolean
  created_at: string
  updated_at: string
}

// ── Módulo de Compras — Cotação ───────────────────────────────

export type CmpCotacaoStatus =
  | 'aberta'
  | 'respondida'
  | 'vencedor_escolhido'
  | 'encerrada'
  | 'cancelada'

export type CmpCotacao = {
  id: string
  numero: string
  empresa_id: string
  comprador_id: string
  titulo: string
  observacoes: string | null
  prazo_resposta: string | null
  status: CmpCotacaoStatus
  aprovador_id: string | null
  aprovado_em: string | null
  motivo_reprovacao: string | null
  cancelada_em: string | null
  created_at: string
  updated_at: string
  empresa?: CoreEmpresa
  comprador?: Profile
  aprovador?: Profile
  solicitacoes?: CmpSolicitacao[]
  itens?: CmpCotacaoItem[]
  fornecedores?: CmpCotacaoFornecedor[]
  escolhas?: CmpCotacaoEscolha[]
}

export type CmpCotacaoSolicitacao = {
  cotacao_id: string
  solicitacao_id: string
}

export type CmpCotacaoItem = {
  id: string
  cotacao_id: string
  linha: number
  solicitacao_item_id: string | null
  produto_id: string
  variante_id: string | null
  unidade_medida_id: string
  quantidade: number
  observacao: string | null
  created_at: string
  produto?: PrdProduto
  variante?: PrdVariante
  unidade_medida?: PrdUnidadeMedida
}

export type CmpCotacaoFornecedorStatus = 'convidado' | 'respondido' | 'recusado'

export type CmpCotacaoFornecedor = {
  id: string
  cotacao_id: string
  fornecedor_id: string
  status_convite: CmpCotacaoFornecedorStatus
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  observacao: string | null
  respondido_em: string | null
  created_at: string
  fornecedor?: CmpFornecedor
  respostas?: CmpCotacaoRespostaItem[]
}

export type CmpCotacaoRespostaItem = {
  id: string
  cotacao_fornecedor_id: string
  cotacao_item_id: string
  preco_unitario: number
  observacao: string | null
  created_at: string
}

export type CmpCotacaoEscolha = {
  id: string
  cotacao_id: string
  cotacao_item_id: string
  cotacao_fornecedor_id: string
  preco_final_unitario: number
  observacao: string | null
  created_at: string
}

// ── Módulo de Compras — Alçada de Aprovação ──────────────────

export type CmpAlcadaAprovacao = {
  id: string
  empresa_id: string
  valor_min: number
  valor_max: number | null
  aprovador_id: string
  ordem: number
  ativo: boolean
  created_at: string
  updated_at: string
  empresa?: CoreEmpresa
  aprovador?: Profile
}

// ── Módulo de Compras — Pedido de Compra ─────────────────────

export type CmpPedidoStatus =
  | 'aguardando_aprovacao'
  | 'aprovado'
  | 'enviado'
  | 'parcialmente_recebido'
  | 'recebido'
  | 'cancelado'

export type CmpPedidoItemStatus =
  | 'pendente'
  | 'parcialmente_recebido'
  | 'recebido'
  | 'cancelado'

export type CmpPedido = {
  id: string
  numero: string
  empresa_id: string
  fornecedor_id: string
  cotacao_id: string | null
  comprador_id: string
  prazo_entrega_dias: number | null
  condicao_pagamento: string | null
  observacoes: string | null
  status: CmpPedidoStatus
  aprovador_id: string | null
  alcada_id: string | null
  aprovado_em: string | null
  enviado_em: string | null
  cancelada_em: string | null
  motivo_cancelamento: string | null
  created_at: string
  updated_at: string
  empresa?: CoreEmpresa
  fornecedor?: CmpFornecedor
  cotacao?: CmpCotacao
  comprador?: Profile
  aprovador?: Profile
  alcada?: CmpAlcadaAprovacao
  itens?: CmpPedidoItem[]
}

export type CmpPedidoItem = {
  id: string
  pedido_id: string
  linha: number
  cotacao_item_id: string | null
  solicitacao_item_id: string | null
  produto_id: string
  variante_id: string | null
  unidade_medida_id: string
  quantidade: number
  preco_unitario: number
  quantidade_recebida: number
  observacao: string | null
  status_item: CmpPedidoItemStatus
  created_at: string
  updated_at: string
  produto?: PrdProduto
  variante?: PrdVariante
  unidade_medida?: PrdUnidadeMedida
}

// ── Módulo de Compras — Recebimento + NF ─────────────────────

export type CmpRecebimento = {
  id: string
  numero: string
  pedido_id: string
  recebedor_id: string
  data_recebimento: string
  observacoes: string | null
  nf_id: string | null
  created_at: string
  updated_at: string
  pedido?: CmpPedido
  recebedor?: Profile
  nf?: CmpNotaFiscal
  itens?: CmpRecebimentoItem[]
}

export type CmpRecebimentoItem = {
  id: string
  recebimento_id: string
  pedido_item_id: string
  quantidade_recebida: number
  divergencia: string | null
  observacao: string | null
  created_at: string
  pedido_item?: CmpPedidoItem
}

export type CmpNotaFiscal = {
  id: string
  cnpj_emitente: string
  fornecedor_id: string | null
  numero: string
  serie: string | null
  data_emissao: string
  valor_total: number
  chave_acesso: string | null
  observacoes: string | null
  created_at: string
  updated_at: string
  fornecedor?: CmpFornecedor
  pedidos?: CmpPedido[]
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

type CmpFornecedorRow            = CmpFornecedor
type CmpCotacaoRow               = Omit<CmpCotacao, 'empresa' | 'comprador' | 'aprovador' | 'solicitacoes' | 'itens' | 'fornecedores' | 'escolhas'>
type CmpCotacaoSolicitacaoRow    = CmpCotacaoSolicitacao
type CmpCotacaoItemRow           = Omit<CmpCotacaoItem, 'produto' | 'variante' | 'unidade_medida'>
type CmpCotacaoFornecedorRow     = Omit<CmpCotacaoFornecedor, 'fornecedor' | 'respostas'>
type CmpCotacaoRespostaItemRow   = CmpCotacaoRespostaItem
type CmpCotacaoEscolhaRow        = CmpCotacaoEscolha
type CmpPedidoRow                = Omit<CmpPedido, 'empresa' | 'fornecedor' | 'cotacao' | 'comprador' | 'aprovador' | 'alcada' | 'itens'>
type CmpAlcadaAprovacaoRow       = Omit<CmpAlcadaAprovacao, 'empresa' | 'aprovador'>
type CmpPedidoItemRow            = Omit<CmpPedidoItem, 'produto' | 'variante' | 'unidade_medida'>
type CmpRecebimentoRow           = Omit<CmpRecebimento, 'pedido' | 'recebedor' | 'nf' | 'itens'>
type CmpRecebimentoItemRow       = Omit<CmpRecebimentoItem, 'pedido_item'>
type CmpNotaFiscalRow            = Omit<CmpNotaFiscal, 'fornecedor' | 'pedidos'>

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
      cmp_fornecedores: TableDef<
        CmpFornecedorRow,
        Omit<CmpFornecedorRow, 'id' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<CmpFornecedorRow, 'id' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CmpFornecedorRow, 'id' | 'created_at' | 'updated_at'>>
      >
      cmp_cotacoes: TableDef<
        CmpCotacaoRow,
        Omit<CmpCotacaoRow,
          'id' | 'numero' | 'status' |
          'aprovador_id' | 'aprovado_em' | 'motivo_reprovacao' | 'cancelada_em' |
          'created_at' | 'updated_at'> &
          Partial<Pick<CmpCotacaoRow,
            'id' | 'numero' | 'status' |
            'aprovador_id' | 'aprovado_em' | 'motivo_reprovacao' | 'cancelada_em' |
            'created_at' | 'updated_at'>>,
        Partial<Omit<CmpCotacaoRow, 'id' | 'numero' | 'created_at' | 'updated_at'>>
      >
      cmp_cotacoes_solicitacoes: TableDef<
        CmpCotacaoSolicitacaoRow,
        CmpCotacaoSolicitacaoRow,
        Partial<CmpCotacaoSolicitacaoRow>
      >
      cmp_cotacoes_itens: TableDef<
        CmpCotacaoItemRow,
        Omit<CmpCotacaoItemRow, 'id' | 'created_at'> &
          Partial<Pick<CmpCotacaoItemRow, 'id' | 'created_at'>>,
        Partial<Omit<CmpCotacaoItemRow, 'id' | 'created_at'>>
      >
      cmp_cotacoes_fornecedores: TableDef<
        CmpCotacaoFornecedorRow,
        Omit<CmpCotacaoFornecedorRow, 'id' | 'status_convite' | 'created_at'> &
          Partial<Pick<CmpCotacaoFornecedorRow, 'id' | 'status_convite' | 'created_at'>>,
        Partial<Omit<CmpCotacaoFornecedorRow, 'id' | 'created_at'>>
      >
      cmp_cotacoes_respostas_itens: TableDef<
        CmpCotacaoRespostaItemRow,
        Omit<CmpCotacaoRespostaItemRow, 'id' | 'created_at'> &
          Partial<Pick<CmpCotacaoRespostaItemRow, 'id' | 'created_at'>>,
        Partial<Omit<CmpCotacaoRespostaItemRow, 'id' | 'created_at'>>
      >
      cmp_cotacoes_escolhas: TableDef<
        CmpCotacaoEscolhaRow,
        Omit<CmpCotacaoEscolhaRow, 'id' | 'created_at'> &
          Partial<Pick<CmpCotacaoEscolhaRow, 'id' | 'created_at'>>,
        Partial<Omit<CmpCotacaoEscolhaRow, 'id' | 'created_at'>>
      >
      cmp_pedidos_compra: TableDef<
        CmpPedidoRow,
        Omit<CmpPedidoRow,
          'id' | 'numero' | 'status' |
          'aprovador_id' | 'alcada_id' | 'aprovado_em' | 'enviado_em' | 'cancelada_em' | 'motivo_cancelamento' |
          'created_at' | 'updated_at'> &
          Partial<Pick<CmpPedidoRow,
            'id' | 'numero' | 'status' |
            'aprovador_id' | 'alcada_id' | 'aprovado_em' | 'enviado_em' | 'cancelada_em' | 'motivo_cancelamento' |
            'created_at' | 'updated_at'>>,
        Partial<Omit<CmpPedidoRow, 'id' | 'numero' | 'created_at' | 'updated_at'>>
      >
      cmp_alcadas_aprovacao: TableDef<
        CmpAlcadaAprovacaoRow,
        Omit<CmpAlcadaAprovacaoRow, 'id' | 'valor_min' | 'ordem' | 'ativo' | 'created_at' | 'updated_at'> &
          Partial<Pick<CmpAlcadaAprovacaoRow, 'id' | 'valor_min' | 'ordem' | 'ativo' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CmpAlcadaAprovacaoRow, 'id' | 'created_at' | 'updated_at'>>,
        [
          {
            foreignKeyName: 'cmp_alcadas_aprovacao_empresa_id_fkey'
            columns: ['empresa_id']
            isOneToOne: false
            referencedRelation: 'core_empresas'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cmp_alcadas_aprovacao_aprovador_id_fkey'
            columns: ['aprovador_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
        ]
      >
      cmp_pedidos_compra_itens: TableDef<
        CmpPedidoItemRow,
        Omit<CmpPedidoItemRow,
          'id' | 'status_item' | 'quantidade_recebida' |
          'created_at' | 'updated_at'> &
          Partial<Pick<CmpPedidoItemRow,
            'id' | 'status_item' | 'quantidade_recebida' |
            'created_at' | 'updated_at'>>,
        Partial<Omit<CmpPedidoItemRow, 'id' | 'created_at' | 'updated_at'>>
      >
      cmp_recebimentos: TableDef<
        CmpRecebimentoRow,
        Omit<CmpRecebimentoRow,
          'id' | 'numero' | 'data_recebimento' | 'created_at' | 'updated_at'> &
          Partial<Pick<CmpRecebimentoRow,
            'id' | 'numero' | 'data_recebimento' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CmpRecebimentoRow, 'id' | 'numero' | 'created_at' | 'updated_at'>>
      >
      cmp_recebimentos_itens: TableDef<
        CmpRecebimentoItemRow,
        Omit<CmpRecebimentoItemRow, 'id' | 'created_at'> &
          Partial<Pick<CmpRecebimentoItemRow, 'id' | 'created_at'>>,
        Partial<Omit<CmpRecebimentoItemRow, 'id' | 'created_at'>>
      >
      cmp_notas_fiscais: TableDef<
        CmpNotaFiscalRow,
        Omit<CmpNotaFiscalRow, 'id' | 'created_at' | 'updated_at'> &
          Partial<Pick<CmpNotaFiscalRow, 'id' | 'created_at' | 'updated_at'>>,
        Partial<Omit<CmpNotaFiscalRow, 'id' | 'created_at' | 'updated_at'>>
      >
      cmp_notas_fiscais_pedidos: TableDef<
        { nf_id: string; pedido_id: string },
        { nf_id: string; pedido_id: string },
        Partial<{ nf_id: string; pedido_id: string }>
      >
    }
    Views: Record<string, never>
    Functions: {
      get_aprovador_alcada: {
        Args: { p_empresa_id: string; p_valor: number }
        Returns: string | null
      }
      get_my_role: {
        Args: Record<string, never>
        Returns: UserRole
      }
    }
    Enums: {
      user_role: UserRole
    }
  }
}
