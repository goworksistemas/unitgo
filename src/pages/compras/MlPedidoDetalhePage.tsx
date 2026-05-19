import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'
import { BotaoVoltar } from '@/components/shared/BotaoVoltar'
import { supabase } from '@/lib/supabase'
import { PainelMercadoLivre } from './_PainelMercadoLivre'

export function MlPedidoDetalhePage() {
  const { id } = useParams<{ id: string }>()
  const [mlOrderId, setMlOrderId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    let cancel = false
    supabase
      .from('ml_pedidos')
      .select('ml_order_id')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancel) setMlOrderId(data?.ml_order_id != null ? String(data.ml_order_id) : null)
      })
    return () => { cancel = true }
  }, [id])

  if (!id) {
    return (
      <p className="text-sm text-gray-600 dark:text-gray-400">Pedido não informado.</p>
    )
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <BotaoVoltar fallback="/compras/mercado-livre" label="Voltar aos pedidos ML" />

      <header className="flex items-center gap-3">
        <span className="h-10 w-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/40 flex items-center justify-center shrink-0">
          <ShoppingBag size={20} className="text-yellow-700 dark:text-yellow-400" />
        </span>
        <span className="block">
          <span className="block text-xl font-semibold text-gray-900 dark:text-gray-100">
            Pedido Mercado Livre
          </span>
          {mlOrderId ? (
            <span className="block text-sm font-mono text-gray-500 dark:text-gray-400">#{mlOrderId}</span>
          ) : null}
        </span>
      </header>

      <PainelMercadoLivre mlPedidoId={id} modo="pagina" />
    </div>
  )
}
