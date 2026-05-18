import { useEffect, useState } from 'react'
import { Search, Shield, User, Power, Edit2, Lock, Network } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { SelectField } from '@/components/ui/SelectField'
import type { CoreDepartamento, Profile, UserRole } from '@/types/database'

const ROLE_LABELS: Record<UserRole, string> = {
  admin:     'Administrador',
  diretor:   'Diretor',
  gestor:    'Gestor',
  comprador: 'Comprador',
  user:      'Usuário',
}
const ROLE_COLORS: Record<UserRole, string> = {
  admin:     'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300',
  diretor:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300',
  gestor:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
  comprador: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
  user:      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300',
}

type UserComDepto = Profile & {
  departamento?: Pick<CoreDepartamento, 'id' | 'nome' | 'codigo'> | null
}

export function UsuariosPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [users, setUsers] = useState<UserComDepto[]>([])
  const [departamentos, setDepartamentos] = useState<CoreDepartamento[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<UserComDepto | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const [usersResp, deptosResp] = await Promise.all([
      supabase.from('profiles')
        .select('*, departamento:core_departamentos!profiles_departamento_id_fkey(id,nome,codigo)')
        .order('nome'),
      supabase.from('core_departamentos').select('*').eq('ativo', true).order('nome'),
    ])
    setUsers((usersResp.data ?? []) as UserComDepto[])
    setDepartamentos(deptosResp.data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  const filtered = users.filter(u =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!editing || !isAdmin) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        nome: editing.nome,
        role: editing.role,
        departamento_id: editing.departamento_id,
      })
      .eq('id', editing.id)
    setSaving(false)
    if (error) { setError('Erro ao salvar. Tente novamente.'); return }
    toast.success('Usuário atualizado')
    setEditing(null)
    fetchData()
  }

  async function toggleAtivo(user: UserComDepto) {
    if (!isAdmin) return
    await supabase.from('profiles').update({ ativo: !user.ativo }).eq('id', user.id)
    toast.success(user.ativo ? 'Usuário inativado' : 'Usuário reativado')
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Lock size={12} />
            Somente leitura — apenas administradores podem editar
          </div>
        )}
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 pl-9 pr-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Tabela */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400 dark:text-gray-500">
              {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtered.map(user => (
                <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    user.role === 'admin' ? 'bg-violet-100 dark:bg-violet-900/40' : 'bg-blue-100 dark:bg-blue-900/40'
                  }`}>
                    {user.role === 'admin'
                      ? <Shield size={16} className="text-violet-700 dark:text-violet-300" />
                      : <User size={16} className="text-blue-700 dark:text-blue-300" />
                    }
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {user.nome ?? '(sem nome)'}
                        {user.id === me?.id && (
                          <span className="ml-1.5 text-[10px] font-normal text-gray-400 dark:text-gray-500">(você)</span>
                        )}
                      </p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                      {user.departamento && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:text-gray-300">
                          <Network size={9} />
                          {user.departamento.nome}
                        </span>
                      )}
                      {!user.ativo && (
                        <span className="inline-flex items-center rounded-full bg-red-100 dark:bg-red-950/40 px-2 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{user.email}</p>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setEditing({ ...user })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => toggleAtivo(user)}
                        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                          user.ativo
                            ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400'
                            : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 dark:hover:text-green-400'
                        }`}
                        title={user.ativo ? 'Inativar usuário' : 'Reativar usuário'}
                      >
                        <Power size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edição — apenas admins chegam aqui */}
      {editing && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl">
            <div className="border-b border-gray-100 dark:border-gray-800 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Editar usuário</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{editing.email}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
                  {error}
                </div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
                <input
                  type="text"
                  value={editing.nome ?? ''}
                  onChange={e => setEditing(p => p ? { ...p, nome: e.target.value } : p)}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <SelectField
                label="Papel"
                value={editing.role}
                onChange={v => setEditing(p => p ? { ...p, role: v as UserRole } : p)}
                options={[
                  { value: 'user',      label: 'Usuário' },
                  { value: 'gestor',    label: 'Gestor' },
                  { value: 'comprador', label: 'Comprador' },
                  { value: 'diretor',   label: 'Diretor' },
                  { value: 'admin',     label: 'Administrador' },
                ]}
              />
              <SelectField
                label="Departamento"
                value={editing.departamento_id ?? ''}
                onChange={v => setEditing(p => p ? { ...p, departamento_id: v || null } : p)}
                placeholder="— sem departamento —"
                helper="Define quem aprova as solicitações de compra deste usuário (gestor do departamento)."
                options={departamentos.map(d => ({
                  value: d.id,
                  label: d.codigo ? `${d.codigo} · ${d.nome}` : d.nome,
                }))}
              />
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                Para inativar ou reativar o usuário, use o botão <Power size={10} className="inline" /> na listagem.
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-6 py-4">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Cancelar
              </button>
              <Button
                isDisabled={saving}
                onClick={handleSave}
                className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
