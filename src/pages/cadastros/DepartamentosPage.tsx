import { useEffect, useState } from 'react'
import { Plus, Power, Edit2, Lock, Network, X, Check, AlertCircle, User as UserIcon } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SelectField } from '@/components/ui/SelectField'
import type { CoreDepartamento, Profile } from '@/types/database'

type DeptoFull = CoreDepartamento & {
  gestor?: Pick<Profile, 'id' | 'nome' | 'email'>
}

export function DepartamentosPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [perfis, setPerfis] = useState<Profile[]>([])
  const [departamentos, setDepartamentos] = useState<DeptoFull[]>([])
  const [loading, setLoading] = useState(true)

  const [editando, setEditando] = useState<DeptoFull | 'novo' | null>(null)

  async function fetchData() {
    setLoading(true)
    const [perfisResp, deptosResp] = await Promise.all([
      supabase.from('profiles').select('id,email,nome,avatar_url,role,ativo,departamento_id,created_at,updated_at')
        .eq('ativo', true).order('nome'),
      supabase.from('core_departamentos').select(`
        *,
        gestor:profiles!core_departamentos_gestor_id_fkey(id,nome,email)
      `).order('nome'),
    ])
    setPerfis(perfisResp.data ?? [])
    setDepartamentos((deptosResp.data ?? []) as DeptoFull[])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  async function toggle(d: DeptoFull) {
    await supabase.from('core_departamentos').update({ ativo: !d.ativo }).eq('id', d.id)
    toast.success(d.ativo ? 'Departamento inativado' : 'Departamento reativado')
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Departamentos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Estrutura da organização. O <strong>gestor</strong> do departamento aprova as solicitações de compra criadas pelos usuários do departamento.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isAdmin && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Lock size={12} /> Somente leitura
            </div>
          )}
          {isAdmin && (
            <Button
              onPress={() => setEditando('novo')}
              className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={14} /> Novo departamento
            </Button>
          )}
        </div>
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : departamentos.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhum departamento cadastrado.
            </p>
          ) : (
            <div>
              <div className="grid grid-cols-[100px_1fr_240px_1fr_90px] gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <span>Código</span>
                <span>Nome</span>
                <span>Gestor responsável</span>
                <span>Descrição</span>
                <span className="text-right">Ações</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {departamentos.map(d => (
                  <li key={d.id} className={`grid grid-cols-[100px_1fr_240px_1fr_90px] gap-3 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${!d.ativo ? 'opacity-60' : ''}`}>
                    <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">{d.codigo ?? '—'}</span>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                        <Network size={13} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <span className="text-sm text-gray-800 dark:text-gray-200 truncate">{d.nome}</span>
                      {!d.ativo && (
                        <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Inativo</span>
                      )}
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-300 inline-flex items-center gap-1.5">
                      <UserIcon size={12} className="text-gray-400" />
                      {d.gestor?.nome ?? d.gestor?.email ?? <span className="text-amber-600 dark:text-amber-400 text-xs">sem gestor</span>}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {d.descricao ?? '—'}
                    </span>
                    {isAdmin ? (
                      <div className="flex items-center gap-0.5 justify-end">
                        <button
                          onClick={() => setEditando(d)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => toggle(d)}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                            d.ativo
                              ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400'
                              : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 dark:hover:text-green-400'
                          }`}
                          title={d.ativo ? 'Inativar' : 'Reativar'}
                        >
                          <Power size={14} />
                        </button>
                      </div>
                    ) : <div />}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {editando !== null && (
        <ModalDepartamento
          perfis={perfis}
          departamento={editando === 'novo' ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvar={() => { setEditando(null); fetchData() }}
        />
      )}
    </div>
  )
}

// ────────────────────────────────────────────────────────────────
// Modal Nova / Editar
// ────────────────────────────────────────────────────────────────

function ModalDepartamento({ perfis, departamento, onFechar, onSalvar }: {
  perfis: Profile[]
  departamento: DeptoFull | null
  onFechar: () => void
  onSalvar: () => void
}) {
  const isEdit = !!departamento
  const [codigo, setCodigo] = useState(departamento?.codigo ?? '')
  const [nome, setNome] = useState(departamento?.nome ?? '')
  const [descricao, setDescricao] = useState(departamento?.descricao ?? '')
  const [gestorId, setGestorId] = useState(departamento?.gestor_id ?? '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSaving(true); setErro(null)
    const payload = {
      codigo: codigo.trim().toUpperCase() || null,
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      gestor_id: gestorId || null,
    }
    const { error } = isEdit
      ? await supabase.from('core_departamentos').update(payload).eq('id', departamento!.id)
      : await supabase.from('core_departamentos').insert(payload)
    setSaving(false)
    if (error) {
      setErro(
        error.message.includes('core_departamentos_codigo_key') ? 'Já existe um departamento com este código.'
        : error.message.includes('core_departamentos_nome_key') ? 'Já existe um departamento com este nome.'
        : 'Erro ao salvar.'
      )
      return
    }
    toast.success(isEdit ? 'Departamento atualizado' : 'Departamento criado')
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="border-b border-gray-100 dark:border-gray-800 px-5 py-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Editar departamento' : 'Novo departamento'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <Field label="Código">
              <input value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase())} placeholder="Ex: TI"
                className={inputCls() + ' font-mono uppercase'} maxLength={20} />
            </Field>
            <div className="col-span-2">
              <Field label="Nome" required>
                <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Tecnologia da Informação"
                  className={inputCls()} />
              </Field>
            </div>
          </div>

          <Field label="Descrição">
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} rows={2}
              placeholder="Opcional"
              className={inputCls()} />
          </Field>

          <SelectField
            label="Gestor responsável"
            value={gestorId}
            onChange={setGestorId}
            placeholder="— sem gestor definido —"
            helper="Sem gestor, somente admin poderá aprovar SCs deste departamento."
            options={perfis.map(p => ({
              value: p.id,
              label: p.nome ?? p.email,
              hint: p.role !== 'user' ? p.role : undefined,
            }))}
          />
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <Button
            isDisabled={saving}
            onPress={salvar}
            className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium flex items-center gap-1.5"
          >
            <Check size={14} /> {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar departamento'}
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
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
}
