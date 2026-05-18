import type { CmpItemStatus, CmpPrioridade, CmpSolicitacaoStatus } from '@/types/database'

export interface StatusMeta {
  label: string
  badge: string
  dot: string
}

export const STATUS_META: Record<CmpSolicitacaoStatus, StatusMeta> = {
  rascunho: {
    label: 'Rascunho',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700',
    dot:   'bg-gray-400',
  },
  aguardando_aprovacao: {
    label: 'Aguardando aprovação',
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
    dot:   'bg-amber-500',
  },
  aprovada: {
    label: 'Aprovada',
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
    dot:   'bg-emerald-500',
  },
  reprovada: {
    label: 'Reprovada',
    badge: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800',
    dot:   'bg-red-500',
  },
  cancelada: {
    label: 'Cancelada',
    badge: 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 line-through',
    dot:   'bg-gray-400',
  },
  atendida: {
    label: 'Atendida',
    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
    dot:   'bg-blue-500',
  },
}

export const ITEM_STATUS_META: Record<CmpItemStatus, StatusMeta> = {
  pendente:   { label: 'Pendente',     badge: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',         dot: 'bg-gray-400' },
  em_cotacao: { label: 'Em cotação',   badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', dot: 'bg-violet-500' },
  em_pedido:  { label: 'Em pedido',    badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300', dot: 'bg-indigo-500' },
  atendido:   { label: 'Atendido',     badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', dot: 'bg-emerald-500' },
  cancelado:  { label: 'Cancelado',    badge: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',           dot: 'bg-red-500' },
}

export const PRIORIDADE_META: Record<CmpPrioridade, StatusMeta> = {
  baixa:   { label: 'Baixa',   badge: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',                  dot: 'bg-gray-400' },
  normal:  { label: 'Normal',  badge: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',                dot: 'bg-blue-500' },
  alta:    { label: 'Alta',    badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',            dot: 'bg-amber-500' },
  urgente: { label: 'Urgente', badge: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300',                    dot: 'bg-red-500' },
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR')
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function formatQty(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}
