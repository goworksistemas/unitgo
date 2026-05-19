import type {
  CmpCotacaoStatus, CmpItemStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import {
  COTACAO_STATUS_META, ITEM_STATUS_META, PEDIDO_STATUS_META, STATUS_META, type StatusMeta,
} from './_shared'
import type { StatusTone } from '@/components/ui/StatusDot'

// ─── Tons (StatusTone) por status — usado pelo StatusDot ──────────────────────

export function toneSolicitacao(status: CmpSolicitacaoStatus): StatusTone {
  switch (status) {
    case 'aguardando_aprovacao': return 'amber'
    case 'aprovada':              return 'emerald'
    case 'atendida':              return 'blue'
    case 'reprovada':             return 'red'
    case 'cancelada':             return 'gray'
  }
}

export function toneItem(status: CmpItemStatus): StatusTone {
  switch (status) {
    case 'pendente':   return 'gray'
    case 'em_cotacao': return 'violet'
    case 'em_pedido':  return 'indigo'
    case 'atendido':   return 'emerald'
    case 'cancelado':  return 'red'
  }
}

export function toneCotacao(status: CmpCotacaoStatus): StatusTone {
  switch (status) {
    case 'aberta':             return 'gray'
    case 'respondida':         return 'violet'
    case 'vencedor_escolhido': return 'indigo'
    case 'encerrada':          return 'emerald'
    case 'cancelada':          return 'gray'
  }
}

export function tonePedido(status: CmpPedidoStatus): StatusTone {
  switch (status) {
    case 'aguardando_aprovacao':   return 'amber'
    case 'aprovado':               return 'emerald'
    case 'enviado':                return 'blue'
    case 'parcialmente_recebido':  return 'violet'
    case 'recebido':               return 'emerald'
    case 'cancelado':              return 'gray'
  }
}

export function toneEtapaProcessoSC(etapa:
  | 'aguardando_aprovacao' | 'compra_itens' | 'pedido_aprovacao'
  | 'pedido_compra' | 'aguardando_recebimento' | 'concluida',
): StatusTone {
  switch (etapa) {
    case 'aguardando_aprovacao': return 'amber'
    case 'compra_itens':         return 'sky'
    case 'pedido_aprovacao':     return 'amber'
    case 'pedido_compra':        return 'indigo'
    case 'aguardando_recebimento': return 'blue'
    case 'concluida':            return 'emerald'
  }
}

/** Etapa do fluxo — nome + ação esperada (compatível com o que o usuário precisa fazer) */
export type EtapaFluxo<T extends string> = {
  key: T
  ordem: number
  etapa: string
  acao: string
  /** Rótulo da contagem na toolbar (ex.: itens, pedidos, SCs) */
  unidade?: string
}

export const ETAPAS_SOLICITACAO: EtapaFluxo<CmpSolicitacaoStatus>[] = [
  { key: 'aguardando_aprovacao', ordem: 1, etapa: 'Aprovação da Solicitação', acao: 'Gestor aprova ou reprova' },
  { key: 'aprovada',             ordem: 2, etapa: 'Em andamento',             acao: 'Acompanhar itens e pedidos vinculados' },
  { key: 'atendida',             ordem: 3, etapa: 'Concluída',                acao: 'Itens recebidos' },
  { key: 'reprovada',            ordem: 0, etapa: 'Reprovada',                acao: 'Encerrada pelo gestor' },
  { key: 'cancelada',            ordem: 0, etapa: 'Cancelada',                acao: 'Encerrada pelo solicitante' },
]

export const ETAPAS_SOLICITACAO_FLUXO = ETAPAS_SOLICITACAO.filter(e => e.ordem > 0)

/**
 * Fluxo da SC — alinhado à linha do tempo (aprovação → compra → pedido → recebimento).
 * Contagens na listagem: itens ou pedidos na etapa, não só status administrativo da SC.
 */
export type EtapaProcessoSC =
  | 'aguardando_aprovacao'
  | 'compra_itens'
  | 'pedido_aprovacao'
  | 'pedido_compra'
  | 'aguardando_recebimento'
  | 'concluida'

export const ETAPAS_PROCESSO_SC: EtapaFluxo<EtapaProcessoSC>[] = [
  {
    key: 'aguardando_aprovacao',
    ordem: 1,
    etapa: 'Aprovação da Solicitação',
    acao: 'Gestor aprova ou reprova a SC',
    unidade: 'SC',
  },
  {
    key: 'compra_itens',
    ordem: 2,
    etapa: 'Cotação / Pedido direto',
    acao: 'Comprador abre cotação ou pedido para os itens',
    unidade: 'itens',
  },
  {
    key: 'pedido_aprovacao',
    ordem: 3,
    etapa: 'Aprovação do Pedido',
    acao: 'Aprovador da alçada aprova o pedido',
    unidade: 'pedidos',
  },
  {
    key: 'pedido_compra',
    ordem: 4,
    etapa: 'Compra',
    acao: 'Comprador efetua a compra com o fornecedor',
    unidade: 'pedidos',
  },
  {
    key: 'aguardando_recebimento',
    ordem: 5,
    etapa: 'Recebimento',
    acao: 'Registrar entrega da mercadoria',
    unidade: 'pedidos',
  },
  {
    key: 'concluida',
    ordem: 6,
    etapa: 'Concluída',
    acao: 'Itens recebidos',
    unidade: 'itens',
  },
]

export const ETAPAS_ITEM: EtapaFluxo<CmpItemStatus>[] = [
  { key: 'pendente',   ordem: 1, etapa: 'Cotação / Pedido', acao: 'Incluir em cotação ou pedido direto' },
  { key: 'em_cotacao', ordem: 2, etapa: 'Em cotação',       acao: 'Aguardar propostas e escolher vencedor' },
  { key: 'em_pedido',  ordem: 3, etapa: 'Em pedido',        acao: 'Acompanhar aprovação, compra e recebimento' },
  { key: 'atendido',   ordem: 4, etapa: 'Recebido',         acao: 'Item concluído' },
  { key: 'cancelado',  ordem: 0, etapa: 'Cancelado',        acao: 'Item removido do fluxo' },
]

export const ETAPAS_COTACAO: EtapaFluxo<CmpCotacaoStatus>[] = [
  { key: 'aberta',             ordem: 1, etapa: 'Propostas', acao: 'Aguardando propostas dos fornecedores' },
  { key: 'respondida',         ordem: 2, etapa: 'Análise',   acao: 'Comparar preços e prazos' },
  { key: 'vencedor_escolhido', ordem: 3, etapa: 'Pedido',    acao: 'Gerar pedido com o vencedor' },
  { key: 'encerrada',          ordem: 4, etapa: 'Concluída', acao: 'Pedido(s) gerado(s)' },
  { key: 'cancelada',          ordem: 0, etapa: 'Cancelada', acao: 'Encerrada' },
]

export const ETAPAS_COTACAO_FLUXO = ETAPAS_COTACAO.filter(e => e.ordem > 0)

export const ETAPAS_PEDIDO: EtapaFluxo<CmpPedidoStatus>[] = [
  { key: 'aguardando_aprovacao',  ordem: 1, etapa: 'Aprovação',          acao: 'Aprovador da alçada aprova o pedido' },
  { key: 'aprovado',              ordem: 2, etapa: 'Compra',             acao: 'Comprador efetua a compra com o fornecedor' },
  { key: 'enviado',               ordem: 3, etapa: 'Recebimento',        acao: 'Aguardar e registrar a entrega' },
  { key: 'parcialmente_recebido', ordem: 4, etapa: 'Recebimento parcial', acao: 'Concluir recebimento do que faltou' },
  { key: 'recebido',              ordem: 5, etapa: 'Concluído',          acao: 'Processo encerrado' },
  { key: 'cancelado',             ordem: 0, etapa: 'Cancelado',          acao: 'Encerrado' },
]

export const ETAPAS_PEDIDO_FLUXO = ETAPAS_PEDIDO.filter(e => e.ordem > 0)

function findEtapa<T extends string>(lista: EtapaFluxo<T>[], status: T): EtapaFluxo<T> | undefined {
  return lista.find(e => e.key === status)
}

export function metaEtapaProcessoSC(etapa: EtapaProcessoSC): StatusMeta {
  const cores: Record<EtapaProcessoSC, StatusMeta> = {
    aguardando_aprovacao: {
      label: 'Aprovação da Solicitação',
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    compra_itens: {
      label: 'Cotação / Pedido direto',
      badge: 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
      dot: 'bg-sky-500',
    },
    pedido_aprovacao: {
      label: 'Aprovação do Pedido',
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
      dot: 'bg-amber-500',
    },
    pedido_compra: {
      label: 'Compra',
      badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
      dot: 'bg-indigo-500',
    },
    aguardando_recebimento: {
      label: 'Recebimento',
      badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
      dot: 'bg-blue-500',
    },
    concluida: {
      label: 'Concluída',
      badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
      dot: 'bg-emerald-500',
    },
  }
  const e = ETAPAS_PROCESSO_SC.find(x => x.key === etapa)
  const base = cores[etapa]
  return e ? { ...base, label: e.etapa } : base
}

export function metaItem(status: CmpItemStatus): StatusMeta {
  const e = findEtapa(ETAPAS_ITEM, status)
  const base = ITEM_STATUS_META[status]
  return e ? { ...base, label: e.etapa } : base
}

export function resumoEtapaItem(status: CmpItemStatus): string | null {
  const e = findEtapa(ETAPAS_ITEM, status)
  if (!e || e.ordem === 0) return e ? `${e.etapa} — ${e.acao}` : null
  return `Etapa ${e.ordem} · ${e.etapa} — ${e.acao}`
}

export function metaSolicitacao(status: CmpSolicitacaoStatus): StatusMeta {
  const e = findEtapa(ETAPAS_SOLICITACAO, status)
  const base = STATUS_META[status]
  return e ? { ...base, label: e.etapa } : base
}

export function metaCotacao(status: CmpCotacaoStatus): StatusMeta {
  const e = findEtapa(ETAPAS_COTACAO, status)
  const base = COTACAO_STATUS_META[status]
  return e ? { ...base, label: e.etapa } : base
}

export function metaPedido(status: CmpPedidoStatus): StatusMeta {
  const e = findEtapa(ETAPAS_PEDIDO, status)
  const base = PEDIDO_STATUS_META[status]
  return e ? { ...base, label: e.etapa } : base
}

export function etapaSolicitacao(status: CmpSolicitacaoStatus) {
  return findEtapa(ETAPAS_SOLICITACAO, status)
}

export function etapaCotacao(status: CmpCotacaoStatus) {
  return findEtapa(ETAPAS_COTACAO, status)
}

export function etapaPedido(status: CmpPedidoStatus) {
  return findEtapa(ETAPAS_PEDIDO, status)
}

export function resumoEtapaPedido(status: CmpPedidoStatus): string | null {
  const e = etapaPedido(status)
  if (!e || e.ordem === 0) return e ? `${e.etapa} — ${e.acao}` : null
  return `Etapa ${e.ordem} · ${e.etapa} — ${e.acao}`
}

export function resumoEtapaSolicitacao(status: CmpSolicitacaoStatus): string | null {
  const e = etapaSolicitacao(status)
  if (!e || e.ordem === 0) return e ? `${e.etapa} — ${e.acao}` : null
  return `Etapa ${e.ordem} · ${e.etapa} — ${e.acao}`
}

export function resumoEtapaCotacao(status: CmpCotacaoStatus): string | null {
  const e = etapaCotacao(status)
  if (!e || e.ordem === 0) return e ? `${e.etapa} — ${e.acao}` : null
  return `Etapa ${e.ordem} · ${e.etapa} — ${e.acao}`
}
