import { useEffect, useState } from 'react'
import { Search, Shield, User, Power, Edit2 } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

const ROLE_LABELS: Record<UserRole, string> = { admin: 'Administrador', user: 'Usuário' }
const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-violet-100 text-violet-700',
  user:  'bg-gray-100 text-gray-600',
}

export function UsuariosPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<Profile | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchUsers() {
    setLoading(true)
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('nome')
    setUsers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const filtered = users.filter(u =>
    u.nome?.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function handleSave() {
    if (!editing) return
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ nome: editing.nome, role: editing.role, ativo: editing.ativo })
      .eq('id', editing.id)
    setSaving(false)
    if (error) { setError('Erro ao salvar. Tente novamente.'); return }
    setEditing(null)
    fetchUsers()
  }

  async function toggleAtivo(user: Profile) {
    await supabase.from('profiles').update({ ativo: !user.ativo }).eq('id', user.id)
    fetchUsers()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Usuários</h1>
          <p className="mt-1 text-sm text-gray-500">{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          placeholder="Buscar por nome ou e-mail…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Tabela */}
      <Card className="shadow-sm border border-gray-100">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-gray-400">
              {search ? 'Nenhum usuário encontrado.' : 'Nenhum usuário cadastrado.'}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(user => (
                <div key={user.id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    user.role === 'admin' ? 'bg-violet-100' : 'bg-blue-100'
                  }`}>
                    {user.role === 'admin' ? (
                      <Shield size={16} className="text-violet-700" />
                    ) : (
                      <User size={16} className="text-blue-700" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.nome ?? '(sem nome)'}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                      {!user.ativo && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-600">
                          Inativo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{user.email}</p>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditing({ ...user })}
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => toggleAtivo(user)}
                      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        user.ativo
                          ? 'text-gray-400 hover:bg-red-50 hover:text-red-500'
                          : 'text-gray-400 hover:bg-green-50 hover:text-green-600'
                      }`}
                      title={user.ativo ? 'Desativar' : 'Ativar'}
                    >
                      <Power size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de edição */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditing(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-6 py-4">
              <h2 className="text-base font-semibold text-gray-900">Editar usuário</h2>
              <p className="text-xs text-gray-500 mt-0.5">{editing.email}</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Nome</label>
                <input
                  type="text"
                  value={editing.nome ?? ''}
                  onChange={e => setEditing(p => p ? { ...p, nome: e.target.value } : p)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">Papel</label>
                <select
                  value={editing.role}
                  onChange={e => setEditing(p => p ? { ...p, role: e.target.value as UserRole } : p)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editing.ativo}
                  onChange={e => setEditing(p => p ? { ...p, ativo: e.target.checked } : p)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Usuário ativo</span>
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-6 py-4">
              <button
                onClick={() => setEditing(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
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
