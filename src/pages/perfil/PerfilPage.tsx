import { useState, type FormEvent } from 'react'
import { User, Mail, Shield, Save } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

const ROLE_LABEL: Record<string, string> = { admin: 'Administrador', user: 'Usuário' }

export function PerfilPage() {
  const { profile, user, refreshProfile } = useAuth()
  const [nome, setNome] = useState(profile?.nome ?? '')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    setError(null)
    setSuccess(false)

    const { error } = await supabase
      .from('profiles')
      .update({ nome: nome.trim() || null })
      .eq('id', profile.id)

    setSaving(false)
    if (error) { setError('Erro ao salvar. Tente novamente.'); return }
    await refreshProfile()
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Meu perfil</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Gerencie suas informações pessoais.</p>
      </div>

      {/* Avatar + info */}
      <div className="flex items-center gap-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
        <div className="h-16 w-16 shrink-0 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
          <User className="w-7 h-7 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
            {profile?.nome ?? '(sem nome)'}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Mail className="w-3 h-3" />
              {user?.email}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-violet-100 dark:bg-violet-900/40 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
              <Shield className="w-3 h-3" />
              {ROLE_LABEL[profile?.role ?? 'user']}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm space-y-5">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Informações básicas</h2>

        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 px-3 py-2 text-sm text-green-700 dark:text-green-400">
            Perfil atualizado com sucesso.
          </div>
        )}

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Seu nome completo"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">E-mail</label>
          <input
            type="email"
            value={user?.email ?? ''}
            disabled
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-400 dark:text-gray-500 outline-none cursor-not-allowed"
          />
          <p className="text-[11px] text-gray-400 dark:text-gray-500">O e-mail não pode ser alterado.</p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Papel</label>
          <input
            type="text"
            value={ROLE_LABEL[profile?.role ?? 'user']}
            disabled
            className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 px-3 py-2 text-sm text-gray-400 dark:text-gray-500 outline-none cursor-not-allowed"
          />
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-4 py-2 text-sm font-medium text-white transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}
