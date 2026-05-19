import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText, FileSearch, ShoppingCart, Receipt, ChevronRight, ArrowRight,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

// ─── Tipos e modelo de contadores ──────────────────────────────────────────

interface PipelineCounts {
  // SC ─ ação: aprovar / acompanhar
  sc_aguardando_aprovacao: number  // gestor precisa aprovar
  sc_em_andamento: number          // aprovada com itens não finalizados
  sc_atendidas_mes: number         // concluídas no mês corrente

  // Cotação ─ ação: aguardar fornec. / escolher vencedor / gerar pedido
  cot_aberta: number               // aguardando resposta de fornecedor
  cot_respondida: number           // precisa escolher vencedor
  cot_vencedor_escolhido: number   // precisa gerar pedido
  cot_encerradas_mes: number       // encerradas no mês corrente

  // Pedido ─ ação: aprovar / comprar / receber
  ped_aguardando_aprovacao: number // aprovador precisa aprovar
  ped_aprovado: number             // comprador precisa efetuar compra
  ped_em_transito: number          // enviado + parcialmente_recebido
  ped_recebidos_mes: number        // concluídos no mês corrente

  // Recebimento ─ ação: registrar entrada
  rec_hoje: number                 // registrados hoje (local)
  rec_7d: number                   // registrados nos últimos 7 dias
}

const ZERO: PipelineCounts = {
  sc_aguardando_aprovacao: 0, sc_em_andamento: 0, sc_atendidas_mes: 0,
  cot_aberta: 0, cot_respondida: 0, cot_vencedor_escolhido: 0, cot_encerradas_mes: 0,
  ped_aguardando_aprovacao: 0, ped_aprovado: 0, ped_em_transito: 0, ped_recebidos_mes: 0,
  rec_hoje: 0, rec_7d: 0,
}

// ─── Helpers de data ──────────────────────────────────────────────────────

function inicioDoDiaLocalIso(): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function inicioDoMesLocalIso(): string {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
function nDiasAtrasLocalIso(n: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d.toISOString()
}

// ─── Componente ────────────────────────────────────────────────────────────

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
      const inicioDia = inicioDoDiaLocalIso()
      const inicioMes = inicioDoMesLocalIso()
      const inicio7d = nDiasAtrasLocalIso(7)

      // Contadores diretos por status (paralelo)
      const resultados = await Promise.all([
        // 0  SC aguardando aprovação
        supabase.from('cmp_solicitacoes_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'aguardando_aprovacao'),
        // 1  SC atendidas no mês
        supabase.from('cmp_solicitacoes_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'atendida').gte('updated_at', inicioMes),
        // 2  Cotação aberta
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true })
          .eq('status', 'aberta'),
        // 3  Cotação respondida (precisa escolher vencedor)
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true })
          .eq('status', 'respondida'),
        // 4  Cotação vencedor escolhido (precisa gerar pedido)
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true })
          .eq('status', 'vencedor_escolhido'),
        // 5  Cotação encerradas no mês
        supabase.from('cmp_cotacoes').select('*', { count: 'exact', head: true })
          .eq('status', 'encerrada').gte('updated_at', inicioMes),
        // 6  Pedido aguardando aprovação
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'aguardando_aprovacao'),
        // 7  Pedido aprovado (a comprar com fornecedor)
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'aprovado'),
        // 8  Pedido enviado (em trânsito completo)
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'enviado'),
        // 9  Pedido parcialmente recebido (em trânsito parcial)
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'parcialmente_recebido'),
        // 10 Pedidos recebidos no mês
        supabase.from('cmp_pedidos_compra').select('*', { count: 'exact', head: true })
          .eq('status', 'recebido').gte('updated_at', inicioMes),
        // 11 Recebimentos hoje
        supabase.from('cmp_recebimentos').select('*', { count: 'exact', head: true })
          .gte('data_recebimento', inicioDia),
        // 12 Recebimentos últimos 7 dias
        supabase.from('cmp_recebimentos').select('*', { count: 'exact', head: true })
          .gte('data_recebimento', inicio7d),
      ])

      c.sc_aguardando_aprovacao = resultados[0].count ?? 0
      c.sc_atendidas_mes        = resultados[1].count ?? 0
      c.cot_aberta              = resultados[2].count ?? 0
      c.cot_respondida          = resultados[3].count ?? 0
      c.cot_vencedor_escolhido  = resultados[4].count ?? 0
      c.cot_encerradas_mes      = resultados[5].count ?? 0
      c.ped_aguardando_aprovacao= resultados[6].count ?? 0
      c.ped_aprovado            = resultados[7].count ?? 0
      const pedEnviado          = resultados[8].count ?? 0
      const pedParcial          = resultados[9].count ?? 0
      c.ped_em_transito         = pedEnviado + pedParcial
      c.ped_recebidos_mes       = resultados[10].count ?? 0
      c.rec_hoje                = resultados[11].count ?? 0
      c.rec_7d                  = resultados[12].count ?? 0

      // ─── SCs em andamento: aprovadas com pelo menos 1 item ativo
      // (não atendido e não cancelado) — significa que ainda há linha
      // aguardando cotação/pedido/recebimento.
      const { data: scsAprov } = await supabase
        .from('cmp_solicitacoes_compra')
        .select('id, itens:cmp_solicitacoes_compra_itens(status_item)')
        .eq('status', 'aprovada')
      c.sc_em_andamento = (scsAprov ?? []).filter(sc => {
        const itens = (sc as { itens?: { status_item: string }[] }).itens ?? []
        return itens.some(i => i.status_item !== 'atendido' && i.status_item !== 'cancelado')
      }).length

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
                stats={[
                  { numero: counts.sc_em_andamento, label: 'em andamento' },
                  { numero: counts.sc_atendidas_mes, label: 'concluídas no mês' },
                ]}
              />
              <EtapaPipeline
                titulo="Cotação"
                icone={<FileSearch size={18} />}
                tone="violet"
                href="/compras/cotacoes"
                primario={counts.cot_respondida + counts.cot_vencedor_escolhido}
                primarioLabel="precisam de ação"
                stats={[
                  { numero: counts.cot_aberta, label: 'aguardando resposta' },
                  { numero: counts.cot_encerradas_mes, label: 'encerradas no mês' },
                ]}
              />
              <EtapaPipeline
                titulo="Pedido"
                icone={<ShoppingCart size={18} />}
                tone="indigo"
                href="/compras/pedidos"
                primario={counts.ped_aguardando_aprovacao}
                primarioLabel="aguardando aprovação"
                stats={[
                  { numero: counts.ped_aprovado, label: 'aprovados a comprar' },
                  { numero: counts.ped_recebidos_mes, label: 'recebidos no mês' },
                ]}
              />
              <EtapaPipeline
                titulo="Recebimento"
                icone={<Receipt size={18} />}
                tone="emerald"
                href="/compras/recebimentos"
                primario={counts.ped_em_transito}
                primarioLabel="pedidos esperando entrega"
                stats={[
                  { numero: counts.rec_hoje, label: 'recebidos hoje' },
                  { numero: counts.rec_7d, label: 'em 7 dias' },
                ]}
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

type StatPipeline = { numero: number; label: string }

function EtapaPipeline({
  titulo, icone, tone, href, primario, primarioLabel, stats,
}: {
  titulo: string
  icone: React.ReactNode
  tone: 'blue' | 'violet' | 'indigo' | 'emerald'
  href: string
  primario: number
  primarioLabel: string
  stats?: StatPipeline[]
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
      {stats && stats.length > 0 && (
        <dl className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
          {stats.map(s => (
            <div key={s.label} className="flex items-baseline justify-between gap-2 text-[11px]">
              <dt className="text-gray-500 dark:text-gray-400 truncate">{s.label}</dt>
              <dd className={`tabular-nums font-semibold ${s.numero > 0 ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-700'}`}>
                {s.numero}
              </dd>
            </div>
          ))}
        </dl>
      )}
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
