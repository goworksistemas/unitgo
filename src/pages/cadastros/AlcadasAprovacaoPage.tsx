import { useEffect, useMemo, useState } from 'react'
import { Plus, Power, Edit2, Lock, Scale, X, Check, AlertCircle, User as UserIcon, Building2 } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SelectField } from '@/components/ui/SelectField'
import type { CmpAlcadaAprovacao, CoreEmpresa, Profile } from '@/types/database'
import { formatMoney } from '../compras/_shared'

type AlcadaFull = CmpAlcadaAprovacao & {
  empresa?: Pick<CoreEmpresa, 'id' | 'razao_social' | 'nome_fantasia'>
  aprovador?: Pick<Profile, 'id' | 'nome' | 'email' | 'role'>
}

export function AlcadasAprovacaoPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [alcadas, setAlcadas] = useState<AlcadaFull[]>([])
  const [empresas, setEmpresas] = useState<CoreEmpresa[]>([])
  const [perfis, setPerfis] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [editando, setEditando] = useState<AlcadaFull | 'novo' | null>(null)

  async function fetchData() {
    setLoading(true)
    const [aResp, eResp, pResp] = await Promise.all([
      supabase.from('cmp_alcadas_aprovacao').select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia),
        aprovador:profiles!cmp_alcadas_aprovacao_aprovador_id_fkey(id,nome,email,role)
      `).order('empresa_id').order('ordem').order('valor_min'),
      supabase.from('core_empresas').select('*').eq('ativo', true).order('razao_social'),
      supabase.from('profiles').select('id,email,nome,avatar_url,role,ativo,departamento_id,created_at,updated_at')
        .eq('ativo', true).order('nome'),
    ])
    setAlcadas((aResp.data ?? []) as AlcadaFull[])
    setEmpresas(eResp.data ?? [])
    setPerfis(pResp.data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtradas = useMemo(
    () => filtroEmpresa ? alcadas.filter(a => a.empresa_id === filtroEmpresa) : alcadas,
    [alcadas, filtroEmpresa]
  )

  async function toggle(a: AlcadaFull) {
    await supabase.from('cmp_alcadas_aprovacao').update({ ativo: !a.ativo }).eq('id', a.id)
    toast.success(a.ativo ? 'Alçada inativada' : 'Alçada reativada')
    fetchData()
  }

  // Agrupa por empresa pra visualização
  const grupos = useMemo(() => {
    const map: Record<string, AlcadaFull[]> = {}
    filtradas.forEach(a => {
      const k = a.empresa_id
      if (!map[k]) map[k] = []
      map[k].push(a)
    })
    return map
  }, [filtradas])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Alçadas de aprovação</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Define <strong>quem</strong> aprova o pedido conforme o <strong>valor total</strong>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Lock size={12} /> Somente leitura
            </div>
          )}
          {isAdmin && (
            <Button onPress={() => setEditando('novo')}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5">
              <Plus size={14} /> Nova alçada
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-xs font-medium text-gray-500">Empresa:</label>
        <select value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}
          className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm px-3 py-1.5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
          <option value="">Todas</option>
          {empresas.map(e => (
            <option key={e.id} value={e.id}>{e.nome_fantasia ?? e.razao_social}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {loading ? (
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </CardContent>
        </Card>
      ) : Object.keys(grupos).length === 0 ? (
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="py-16 text-center">
            <Scale size={32} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma alçada cadastrada. Sem alçada, apenas admin pode aprovar pedidos.</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grupos).map(([empresaId, lista]) => {
          const empresa = empresas.find(e => e.id === empresaId)
          return (
            <Card key={empresaId} className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/30">
                  <Building2 size={14} className="text-gray-400" />
                  <p className="text-sm font-semibold">{empresa?.nome_fantasia ?? empresa?.razao_social ?? '—'}</p>
                </div>
                <div>
                  <div className="grid grid-cols-[150px_150px_1fr_60px_90px] gap-3 px-5 py-2 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    <span>Valor min.</span>
                    <span>Valor max.</span>
                    <span>Aprovador</span>
                    <span>Ordem</span>
                    <span className="text-right">Ações</span>
                  </div>
                  <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                    {lista.map(a => (
                      <li key={a.id} className={`grid grid-cols-[150px_150px_1fr_60px_90px] gap-3 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/40 ${!a.ativo ? 'opacity-60' : ''}`}>
                        <span className="text-sm tabular-nums">{formatMoney(a.valor_min)}</span>
                        <span className="text-sm tabular-nums">{a.valor_max != null ? formatMoney(a.valor_max) : <span className="text-gray-400 italic">sem limite</span>}</span>
                        <span className="text-sm inline-flex items-center gap-1.5">
                          <UserIcon size={12} className="text-gray-400" />
                          {a.aprovador?.nome ?? a.aprovador?.email}
                          {a.aprovador?.role && a.aprovador.role !== 'user' && (
                            <span className="text-[10px] text-gray-400">({a.aprovador.role})</span>
                          )}
                        </span>
                        <span className="text-sm text-gray-500 tabular-nums">{a.ordem}</span>
                        {isAdmin ? (
                          <div className="flex items-center gap-0.5 justify-end">
                            <button onClick={() => setEditando(a)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                              <Edit2 size={14} />
                            </button>
                            <button onClick={() => toggle(a)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                a.ativo
                                  ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500'
                                  : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600'
                              }`}>
                              <Power size={14} />
                            </button>
                          </div>
                        ) : <div />}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}

      {editando !== null && (
        <ModalAlcada
          empresas={empresas} perfis={perfis}
          alcada={editando === 'novo' ? null : editando}
          empresaPadrao={filtroEmpresa || undefined}
          onFechar={() => setEditando(null)}
          onSalvar={() => { setEditando(null); fetchData() }}
        />
      )}
    </div>
  )
}

function ModalAlcada({ empresas, perfis, alcada, empresaPadrao, onFechar, onSalvar }: {
  empresas: CoreEmpresa[]
  perfis: Profile[]
  alcada: AlcadaFull | null
  empresaPadrao?: string
  onFechar: () => void
  onSalvar: () => void
}) {
  const isEdit = !!alcada
  const [empresaId, setEmpresaId] = useState(alcada?.empresa_id ?? empresaPadrao ?? '')
  const [valorMin, setValorMin] = useState<string>(alcada?.valor_min?.toString() ?? '0')
  const [valorMax, setValorMax] = useState<string>(alcada?.valor_max?.toString() ?? '')
  const [aprovadorId, setAprovadorId] = useState(alcada?.aprovador_id ?? '')
  const [ordem, setOrdem] = useState<string>(alcada?.ordem?.toString() ?? '0')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!empresaId) { setErro('Selecione a empresa.'); return }
    if (!aprovadorId) { setErro('Selecione o aprovador.'); return }
    const vMin = parseFloat(valorMin) || 0
    const vMax = valorMax.trim() ? parseFloat(valorMax) : null
    if (vMax != null && vMax < vMin) { setErro('Valor máximo deve ser maior que mínimo.'); return }

    setSaving(true); setErro(null)
    const payload = {
      empresa_id: empresaId,
      valor_min: vMin, valor_max: vMax,
      aprovador_id: aprovadorId,
      ordem: parseInt(ordem) || 0,
    }
    const { error } = isEdit
      ? await supabase.from('cmp_alcadas_aprovacao').update(payload).eq('id', alcada!.id)
      : await supabase.from('cmp_alcadas_aprovacao').insert(payload)
    setSaving(false)
    if (error) { setErro('Erro ao salvar.'); return }
    toast.success(isEdit ? 'Alçada atualizada' : 'Alçada criada')
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold">{isEdit ? 'Editar alçada' : 'Nova alçada'}</h2>
          <button onClick={onFechar}><X size={16} className="text-gray-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          <SelectField
            label="Empresa" required accent="emerald"
            value={empresaId} onChange={setEmpresaId}
            placeholder="— selecione —"
            options={empresas.map(e => ({ value: e.id, label: e.nome_fantasia ?? e.razao_social }))}
          />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor mínimo (R$)" required>
              <input type="number" min="0" step="0.01" value={valorMin}
                onChange={e => setValorMin(e.target.value)} className={inputCls() + ' tabular-nums'} />
            </Field>
            <Field label="Valor máximo (R$)">
              <input type="number" min="0" step="0.01" value={valorMax}
                onChange={e => setValorMax(e.target.value)} placeholder="vazio = sem limite"
                className={inputCls() + ' tabular-nums'} />
            </Field>
          </div>

          <SelectField
            label="Aprovador" required accent="emerald"
            value={aprovadorId} onChange={setAprovadorId}
            placeholder="— selecione —"
            options={perfis.map(p => ({
              value: p.id,
              label: p.nome ?? p.email,
              hint: p.role !== 'user' ? p.role : undefined,
            }))}
            helper="Pessoa específica que aprovará pedidos nessa faixa de valor."
          />

          <Field label="Ordem (em caso de empate, menor valor aplica primeiro)">
            <input type="number" min="0" value={ordem} onChange={e => setOrdem(e.target.value)} className={inputCls() + ' tabular-nums'} />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800">Cancelar</button>
          <Button isDisabled={saving} onPress={salvar} className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium flex items-center gap-1.5">
            <Check size={14} /> {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}
function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
