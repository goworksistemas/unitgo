import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  CmpCotacaoStatus, CmpPedidoStatus, CmpSolicitacaoStatus,
} from '@/types/database'

type CmpStatusUnion = CmpSolicitacaoStatus | CmpCotacaoStatus | CmpPedidoStatus

/** Contagens por status (head requests em paralelo) para a faixa de etapas */
export function useContagensEtapas<T extends string>(
  tabela: 'cmp_solicitacoes_compra' | 'cmp_cotacoes' | 'cmp_pedidos_compra',
  statusKeys: readonly T[],
  deps: unknown[] = [],
) {
  const [contagens, setContagens] = useState<Partial<Record<T, number>>>({})

  const keysStr = statusKeys.join(',')

  const recarregar = useCallback(async () => {
    const results = await Promise.all(
      statusKeys.map(async status => {
        const { count } = await supabase
          .from(tabela)
          .select('*', { count: 'exact', head: true })
          .eq('status', status as CmpStatusUnion)
        return { status, count: count ?? 0 }
      }),
    )
    const map: Partial<Record<T, number>> = {}
    results.forEach(r => { map[r.status] = r.count })
    setContagens(map)
  }, [tabela, keysStr])

  useEffect(() => { recarregar() }, [recarregar, ...deps])

  return { contagens, recarregarContagens: recarregar }
}
