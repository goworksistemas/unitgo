import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar, ExternalLink, FileText, RefreshCw, ShoppingBag, Truck,
} from 'lucide-react'
import { MlNfAcoes } from '@/components/compras/MlNfAcoes'
import { MlPedidoCompraAcoes } from '@/components/compras/MlPedidoCompraAcoes'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { MlEnvio, MlNotaFiscal, MlPedido, MlPedidoItem } from '@/types/database'
import { formatDate, formatDateTime, formatMoney } from './_shared'

const STATUS_LABEL: Record<string, string> = {
  confirmed:           'Confirmado',
  payment_required:    'Aguardando pagamento',
  payment_in_process:  'Pagamento em processo',
  partially_paid:      'Parcialmente pago',
  paid:                'Pago',
  cancelled:           'Cancelado',
  invalid:             'Inválido',
  partially_refunded:  'Parcialmente reembolsado',
}

const SHIP_STATUS_LABEL: Record<string, string> = {
  pending:        'Pendente',
  handling:       'Em separação',
  ready_to_ship:  'Pronto para envio',
  shipped:        'Em trânsito',
  delivered:      'Entregue',
  not_delivered:  'Não entregue',
  cancelled:      'Cancelado',
}

const SHIP_SUBSTATUS_LABEL: Record<string, string> = {
  invoice_pending:  'NF pendente',
  ready_to_print:   'Pronto p/ etiqueta',
  printed:          'Etiqueta impressa',
  in_hub:           'No centro de distribuição',
  out_for_delivery: 'Saiu para entrega',
  delivered:        'Entregue',
}

type Props = {
  mlPedidoId: string
  /** painel = bloco embutido no pedido de compra; pagina = tela de detalhe dedicada */
  modo?: 'painel' | 'pagina'
}

type DadosCompletos = Omit<MlPedido, 'itens' | 'envio' | 'notas_fiscais' | 'pedido_compra'> & {
  itens: MlPedidoItem[]
  envio: MlEnvio | null
  notas_fiscais: MlNotaFiscal[]
  pedido_compra?: { id: string; numero: string; status: string } | null
  credencial?: { empresa_id: string } | null
}

export function PainelMercadoLivre({ mlPedidoId, modo = 'painel' }: Props) {
  const [dados, setDados] = useState<DadosCompletos | null>(null)
  const [loading, setLoading] = useState(true)
  const [resync, setResync] = useState(false)

  async function carregar() {
    setLoading(true)
    const { data: pedR } = await supabase
      .from('ml_pedidos')
      .select(`
        *,
        itens:ml_pedidos_itens(*),
        credencial:ml_credenciais(empresa_id),
        pedido_compra:cmp_pedidos_compra!pedido_compra_id(id,numero,status)
      `)
      .eq('id', mlPedidoId)
      .maybeSingle()

    const pedido = pedR as unknown as (MlPedido & {
      itens: MlPedidoItem[]
      pedido_compra?: { id: string; numero: string; status: string } | null
    }) | null
    if (!pedido) { setDados(null); setLoading(false); return }

    const packKey = pedido.ml_pack_id ?? pedido.ml_order_id
    const [envioR, nfsR] = await Promise.all([
      pedido.ml_shipment_id
        ? supabase.from('ml_envios').select('*').eq('ml_shipment_id', pedido.ml_shipment_id).maybeSingle()
        : Promise.resolve({ data: null } as const),
      packKey
        ? supabase.from('ml_notas_fiscais').select('*').eq('ml_pack_id', packKey)
        : Promise.resolve({ data: [] } as const),
    ])

    setDados({
      ...pedido,
      envio: (envioR.data ?? null) as MlEnvio | null,
      notas_fiscais: (nfsR.data ?? []) as MlNotaFiscal[],
      pedido_compra: pedido.pedido_compra ?? null,
    })
    setLoading(false)
  }

  useEffect(() => { carregar() }, [mlPedidoId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function resincronizar() {
    if (!dados) return
    setResync(true)
    const { data, error } = await supabase.functions.invoke('ml-sync-resource', {
      body: {
        acao: 'sync_order',
        credencial_id: dados.credencial_id,
        ml_order_id: dados.ml_order_id,
      },
    })
    setResync(false)
    if (error) { toast.error(`Falha: ${error.message}`); return }
    const resp = data as {
      ok?: boolean
      error?: string
      nfs?: { encontradas?: number; salvas?: number; avisos?: string[] }
    }
    if (resp?.error) { toast.error(resp.error); return }
    const nfs = resp?.nfs
    if (nfs?.salvas && nfs.salvas > 0) {
      toast.success(`${nfs.salvas} nota(s) fiscal(is) sincronizada(s)`)
    } else if (nfs?.avisos?.length) {
      toast.warning(nfs.avisos[0], { description: nfs.avisos.slice(1, 3).join(' · ') || undefined })
    } else {
      toast.success('Pedido resincronizado (nenhuma NF disponível no ML)')
    }
    carregar()
  }

  if (loading) {
    return (
      <div>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
      </div>
    )
  }
  if (!dados) {
    return (
      <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/40 dark:bg-yellow-950/20 px-5 py-6 text-sm text-gray-600 dark:text-gray-300">
        Pedido ML não encontrado.
      </div>
    )
  }

  const statusLabel = dados.status ? STATUS_LABEL[dados.status] ?? dados.status : '—'
  const shipLabel = dados.envio?.status ? SHIP_STATUS_LABEL[dados.envio.status] ?? dados.envio.status : null
  const subLabel = dados.envio?.substatus ? SHIP_SUBSTATUS_LABEL[dados.envio.substatus] ?? dados.envio.substatus : null

  const wrapperCls = modo === 'pagina'
    ? 'space-y-4'
    : 'rounded-2xl border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/30 dark:bg-yellow-950/15 overflow-hidden'

  return (
    <section className={wrapperCls}>
      {modo === 'painel' && (
        <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-yellow-200/60 dark:border-yellow-800/30 bg-yellow-50/60 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <ShoppingBag size={16} className="text-yellow-700 dark:text-yellow-400" />
            <h2 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">Mercado Livre</h2>
            <Link
              to={`/compras/mercado-livre/${mlPedidoId}`}
              className="ml-2 text-xs text-emerald-600 hover:underline"
            >
              abrir detalhe
            </Link>
          </div>
          <Button
            isDisabled={resync}
            onPress={resincronizar}
            className="bg-white dark:bg-gray-800 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-950/40 px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1.5"
          >
            {resync ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            Resincronizar
          </Button>
        </header>
      )}

      {modo === 'pagina' && (
        <div className="flex items-center justify-end">
          <Button
            isDisabled={resync}
            onPress={resincronizar}
            className="bg-yellow-600 text-white hover:bg-yellow-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
          >
            {resync ? <RefreshCw size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            Resincronizar pedido
          </Button>
        </div>
      )}

      <div className={modo === 'painel' ? 'p-5 space-y-4' : 'space-y-4'}>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Linha label="Pedido ML">
            <a
              href={`https://www.mercadolivre.com.br/gz/home#order/${dados.ml_order_id}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-emerald-700 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              #{dados.ml_order_id} <ExternalLink size={11} />
            </a>
          </Linha>
          <Linha label="Status">{statusLabel}</Linha>
          <Linha label="Vendedor">{dados.vendedor_nickname ?? '—'}</Linha>
          <Linha label="Data da compra">
            {dados.data_criacao ? formatDateTime(dados.data_criacao) : '—'}
          </Linha>
          <Linha label="Total">
            {dados.moeda === 'BRL' ? formatMoney(dados.total ?? 0) : `${dados.total ?? 0} ${dados.moeda ?? ''}`}
          </Linha>
          <Linha label="Pack ID">
            {dados.ml_pack_id ? <span className="font-mono">{dados.ml_pack_id}</span> : '—'}
          </Linha>
        </dl>

        {dados.envio && (
          <div className="rounded-xl border border-sky-200/60 dark:border-sky-800/40 bg-sky-50/40 dark:bg-sky-950/20 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Truck size={14} className="text-sky-600 dark:text-sky-400" />
              <span className="text-sm font-semibold text-sky-900 dark:text-sky-100">Envio</span>
              {shipLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[10px] font-semibold">
                  {shipLabel}
                </span>
              )}
              {subLabel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100/60 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 px-2 py-0.5 text-[10px]">
                  {subLabel}
                </span>
              )}
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-xs">
              <Linha label="Rastreio">
                {dados.envio.tracking_number
                  ? <span className="font-mono">{dados.envio.tracking_number}</span>
                  : '—'}
              </Linha>
              <Linha label="Transportadora">{dados.envio.tracking_method ?? '—'}</Linha>
              <Linha label="Tipo logístico">{dados.envio.logistic_type ?? '—'}</Linha>
              <Linha label="Estimativa">
                {dados.envio.data_estimada ? <span className="inline-flex items-center gap-1"><Calendar size={11} />{formatDate(dados.envio.data_estimada)}</span> : '—'}
              </Linha>
              {dados.envio.data_entrega && (
                <Linha label="Entregue em">
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    {formatDateTime(dados.envio.data_entrega)}
                  </span>
                </Linha>
              )}
            </dl>
          </div>
        )}

        {(modo === 'pagina' || dados.notas_fiscais.length > 0) && (
          <div className="rounded-xl border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/30 dark:bg-violet-950/15 px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={14} className="text-violet-600 dark:text-violet-400" />
              <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">
                Notas fiscais{dados.notas_fiscais.length > 0 ? ` (${dados.notas_fiscais.length})` : ''}
              </span>
            </div>

            {dados.notas_fiscais.length === 0 ? (
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-2">
                <p>
                  Nenhuma NF no banco para este pedido (chave pack/pedido{' '}
                  <span className="font-mono">{dados.ml_pack_id ?? dados.ml_order_id}</span>).
                  No Brasil o ML muitas vezes não expõe NF via pack — tentamos também o faturador e stream por pedido.
                </p>
                <Button
                  isDisabled={resync}
                  onPress={resincronizar}
                  className="bg-violet-600 text-white hover:bg-violet-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                >
                  {resync ? <RefreshCw size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                  Buscar NF no Mercado Livre
                </Button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {dados.notas_fiscais.map(nf => (
                  <li key={nf.id} className="flex items-center gap-2 text-xs rounded-lg bg-white/80 dark:bg-gray-900/80 border border-violet-100 dark:border-violet-900/50 px-3 py-2">
                    <FileText size={11} className="text-violet-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-800 dark:text-gray-200">
                        {nf.numero_nf
                          ? <>NF nº {nf.numero_nf}{nf.serie ? ` série ${nf.serie}` : ''}</>
                          : (nf.filename ?? nf.ml_doc_id)}
                      </p>
                      <p className="text-[10px] text-gray-500 truncate">
                        {nf.chave_acesso && <span className="font-mono mr-2">{nf.chave_acesso}</span>}
                        {nf.valor_total != null && <span>{formatMoney(nf.valor_total)}</span>}
                        {!nf.storage_path && (
                          <span className="text-amber-600 dark:text-amber-400 ml-1">· arquivo pendente — use Resincronizar</span>
                        )}
                      </p>
                    </div>
                    <MlNfAcoes nf={nf} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {dados.credencial?.empresa_id && (
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/15 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-200 mb-2">
              Pedido de compra
            </p>
            <MlPedidoCompraAcoes
              mlPedidoId={mlPedidoId}
              mlOrderId={dados.ml_order_id}
              empresaId={dados.credencial.empresa_id}
              pedidoCompra={dados.pedido_compra ? { id: dados.pedido_compra.id, numero: dados.pedido_compra.numero } : null}
              vendedorNickname={dados.vendedor_nickname}
              itens={dados.itens}
              total={dados.total}
              onChanged={carregar}
            />
          </div>
        )}

        {dados.itens.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Itens comprados ({dados.itens.length})
            </h3>
            <ul className="space-y-1.5">
              {dados.itens.map(it => (
                <li key={it.id} className="flex items-center gap-3 rounded-lg bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-2">
                  {it.thumbnail ? (
                    <img src={it.thumbnail} alt="" className="h-10 w-10 rounded object-cover bg-gray-100 dark:bg-gray-800 shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-gray-100 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      <ShoppingBag size={14} className="text-gray-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{it.titulo ?? '—'}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{it.ml_item_id}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs tabular-nums text-gray-800 dark:text-gray-200">
                      {it.quantidade ?? 0} × {formatMoney(it.preco_unitario ?? 0)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}

function Linha({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-gray-800 dark:text-gray-200">{children}</dd>
    </div>
  )
}
