import type {
  CmpCotacaoStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'
import { COTACAO_STATUS_META, PEDIDO_STATUS_META, STATUS_META } from './_shared'
import { StatusBadge } from './_StatusBadge'

/**
 * Exibe o status real do documento (SC, cotação ou pedido), alinhado com
 * listagens, filtros, vínculos e RPC — não a etapa genérica do fluxo.
 */
type Props =
  | { tipo: 'solicitacao'; status: CmpSolicitacaoStatus; size?: 'sm' | 'md' }
  | { tipo: 'cotacao'; status: CmpCotacaoStatus; size?: 'sm' | 'md' }
  | { tipo: 'pedido'; status: CmpPedidoStatus; size?: 'sm' | 'md' }

export function EtapaProcesso(props: Props) {
  const size = props.size ?? 'sm'
  const meta =
    props.tipo === 'solicitacao' ? STATUS_META[props.status]
    : props.tipo === 'cotacao' ? COTACAO_STATUS_META[props.status]
    : PEDIDO_STATUS_META[props.status]

  return <StatusBadge meta={meta} size={size} />
}
