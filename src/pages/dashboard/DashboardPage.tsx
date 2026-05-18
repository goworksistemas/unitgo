import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, FileSearch, ShoppingCart, Receipt, ChevronRight, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

interface PipelineCounts {
  // SC
  sc_aguardando_aprovacao: number
  sc_aprovada_sem_cotacao: number
  // Cotação
  cot_aberta: number
  cot_respondida: number
  cot_vencedor_escolhido: number
  // Pedido aguardando aprovação (alçada)
  ped_aguardando_aprovacao: number
  ped_aguardando_envio: number
  ped_enviado: number
  ped_parcial: number
  // Recebimento
  rec_hoje: number
}

const ZERO: PipelineCounts = {
  sc_aguardando_aprovacao: 0, sc_aprovada_sem_cotacao: 0,
  cot_aberta: 0, cot_respondida: 0, cot_vencedor_escolhido: 0,
  ped_aguardando_aprovacao: 0, ped_aguardando_envio: 0, ped_enviado: 0, ped_parcial: 0,
  rec_hoje: 0,
}

export function DashboardPage() {
  const { profile } = useAuth()
  const hora = new Date().getHours()
  const saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const [counts, setCounts] = useState<PipelineCounts>(ZERO)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function carregar() {
      setLoading(true)
      const c = { ...ZERO }

      const consultas = await Promise.all([
        supabase.from('cmp_solicitacoes_compra').select('*', { count: 'exact', head: true }).eq('status', 'aguardando_aprovacao'),
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true }).eq('status', 'respondida'),
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true }).eq('status', 'vencedor_escolhido'),
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true }).eq('status', 'aguardando_aprovacao'),
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true }).eq('status', 'aprovado').is('enviado_em', null),
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true }).eq('status', 'parcialmente_recebido'),
      ])

      c.sc_aguardando_aprovacao = consultas[0].count ?? 0
      c.cot_aberta              = consultas[1].count ?? 0
      c.cot_respondida          = consultas[2].count ?? 0
      c.cot_vencedor_escolhido  = consultas[3].count ?? 0
      c.ped_aguardando_aprovacao= consultas[4].count ?? 0
      c.ped_aguardando_envio    = consultas[5].count ?? 0
      c.ped_enviado             = consultas[6].count ?? 0
      c.ped_parcial             = consultas[7].count ?? 0

      // SCs aprovadas que ainda têm itens pendentes (= aguardando virar cotação)
      const { data: scsAprov } = await supabase
        .from('cmp_solicitacoes_compra')
        .select('id, itens:cmp_solicitacoes_compra_itens(status_item)')
        .eq('status', 'aprovada')
      c.sc_aprovada_sem_cotacao = (scsAprov ?? []).filter(sc => {
        const itens = (sc as { itens?: { status_item: string }[] }).itens ?? []
        return itens.some(i => i.status_item === 'pendente')
      }).length

      // Recebimentos de hoje
      const hojeIso = new Date(); hojeIso.setHours(0, 0, 0, 0)
      const { count: recHoje } = await supabase
        .from('cmp_recebimentos')
        .select('*', { count: 'exact', head: true })
        .gte('data_recebimento', hojeIso.toISOString())
      c.rec_hoje = recHoje ?? 0

      setCounts(c)
      setLoading(false)
    }
    carregar()
  }, [profile?.id])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
          {saudacao}, {profile?.nome?.split(' ')[0] ?? 'usuário'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Aqui está o que está rolando no pipeline de compras.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        <>
          {/* Pipeline visual */}
          <section className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
            <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-3">
              <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Pipeline de compras</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-gray-100 dark:divide-gray-800">
              <EtapaPipeline
                titulo="Solicitação"
                icone={<FileText size={18} />}
                tone="blue"
                href="/compras/solicitacoes"
                primario={counts.sc_aguardando_aprovacao}
                primarioLabel="aguardando aprovação"
                secundario={counts.sc_aprovada_sem_cotacao}
                secundarioLabel={`${counts.sc_aprovada_sem_cotacao} aprovada(s) aguardando cotação`}
              />
              <EtapaPipeline
                titulo="Cotação"
                icone={<FileSearch size={18} />}
                tone="violet"
                href="/compras/cotacoes"
                primario={counts.cot_aberta + counts.cot_respondida}
                primarioLabel="em andamento"
                secundario={counts.cot_vencedor_escolhido}
                secundarioLabel={`${counts.cot_vencedor_escolhido} com vencedor escolhido`}
              />
              <EtapaPipeline
                titulo="Pedido"
                icone={<ShoppingCart size={18} />}
                tone="indigo"
                href="/compras/pedidos"
                primario={counts.ped_aguardando_aprovacao}
                primarioLabel="aguardando aprovação"
                secundario={counts.ped_enviado + counts.ped_parcial}
                secundarioLabel={`${counts.ped_enviado + counts.ped_parcial} em trânsito`}
              />
              <EtapaPipeline
                titulo="Recebimento"
                icone={<Receipt size={18} />}
                tone="emerald"
                href="/compras/recebimentos"
                primario={counts.ped_enviado + counts.ped_parcial}
                primarioLabel="pedidos esperando entrega"
                secundario={counts.rec_hoje}
                secundarioLabel={`${counts.rec_hoje} recebido${counts.rec_hoje !== 1 ? 's' : ''} hoje`}
              />
            </div>
          </section>

          {/* Ações rápidas */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AcaoRapida to="/compras/solicitacoes/nova" icone={<FileText size={16} />} cor="blue" titulo="Nova solicitação" descricao="Preciso de algo" />
            <AcaoRapida to="/compras/cotacoes/nova" icone={<FileSearch size={16} />} cor="violet" titulo="Nova cotação" descricao="Cotar com fornecedores" />
            <AcaoRapida to="/compras/pedidos" icone={<ShoppingCart size={16} />} cor="indigo" titulo="Ver pedidos" descricao="Acompanhar status" />
            <AcaoRapida to="/compras/recebimentos/novo" icone={<Receipt size={16} />} cor="emerald" titulo="Registrar recebimento" descricao="Chegou mercadoria" />
          </section>
        </>
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────

function EtapaPipeline({
  titulo, icone, tone, href, primario, primarioLabel, secundarioLabel,
}: {
  titulo: string
  icone: React.ReactNode
  tone: 'blue' | 'violet' | 'indigo' | 'emerald'
  href: string
  primario: number
  primarioLabel: string
  secundario?: number
  secundarioLabel: string
}) {
  const toneCls = {
    blue:    { chip: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400', num: 'text-blue-700 dark:text-blue-300', hover: 'hover:bg-blue-50/40 dark:hover:bg-blue-950/20' },
    violet:  { chip: 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400', num: 'text-violet-700 dark:text-violet-300', hover: 'hover:bg-violet-50/40 dark:hover:bg-violet-950/20' },
    indigo:  { chip: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400', num: 'text-indigo-700 dark:text-indigo-300', hover: 'hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20' },
    emerald: { chip: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400', num: 'text-emerald-700 dark:text-emerald-300', hover: 'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20' },
  }[tone]

  return (
    <Link to={href} className={`block px-5 py-4 transition-colors ${toneCls.hover}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${toneCls.chip}`}>{icone}</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</span>
        </div>
        <ArrowRight size={14} className="text-gray-300 dark:text-gray-600" />
      </div>
      <p className={`text-3xl font-bold tabular-nums ${primario > 0 ? toneCls.num : 'text-gray-300 dark:text-gray-700'}`}>
        {primario}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{primarioLabel}</p>
      <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
        {secundarioLabel}
      </p>
    </Link>
  )
}

function AcaoRapida({
  to, icone, cor, titulo, descricao,
}: {
  to: string
  icone: React.ReactNode
  cor: 'blue' | 'violet' | 'indigo' | 'emerald'
  titulo: string
  descricao: string
}) {
  const cls = {
    blue:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    violet:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
    indigo:  'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
    emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  }[cor]

  return (
    <Link to={to} className="flex items-center gap-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm px-4 py-3 hover:shadow-md hover:border-gray-200 dark:hover:border-gray-700 transition-all">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${cls}`}>
        {icone}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{titulo}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
      </div>
      <ChevronRight size={14} className="text-gray-300 dark:text-gray-600 shrink-0" />
    </Link>
  )
}
