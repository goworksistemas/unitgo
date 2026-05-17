import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { AuthLayout } from '@/layouts/AuthLayout'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(traduzirErro(error.message))
      setLoading(false)
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-8">
          <SupplyGoLogo variant="colored" size={56} />
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mt-2">Entrar no SupplyGo</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Bem-vindo de volta.</p>
        </div>

        <Card className="shadow-sm border border-gray-200 dark:border-gray-700 dark:bg-gray-900">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Field label="E-mail" htmlFor="email">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  className={inputClass}
                  disabled={loading}
                />
              </Field>

              <Field
                label="Senha"
                htmlFor="password"
                action={<Link to="/auth/esqueci-senha" className="text-xs text-blue-600 hover:underline">Esqueci minha senha</Link>}
              >
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  onToggle={() => setShowPassword(v => !v)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </Field>

              <Button
                type="submit"
                isDisabled={loading}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 py-2.5 font-medium mt-2"
              >
                {loading ? 'Entrando…' : 'Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-5">
          Não tem conta?{' '}
          <Link to="/auth/criar-conta" className="text-blue-600 font-medium hover:underline">
            Criar conta
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

function traduzirErro(msg: string): string {
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.'
  if (msg.includes('Email not confirmed')) return 'Confirme seu e-mail antes de entrar.'
  if (msg.includes('Too many requests')) return 'Muitas tentativas. Aguarde alguns minutos.'
  return 'Erro ao entrar. Tente novamente.'
}

// ─── Componentes internos compartilhados ───────────────────────────────────

export const inputClass =
  'w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50'

export function Field({
  label,
  htmlFor,
  children,
  action,
}: {
  label: string
  htmlFor: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {action}
      </div>
      {children}
    </div>
  )
}

export function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  onGenerate,
  disabled,
  autoComplete = 'new-password',
  placeholder = '••••••••',
}: {
  id: string
  value: string
  onChange: (v: string) => void
  show: boolean
  onToggle: () => void
  onGenerate?: () => void
  disabled?: boolean
  autoComplete?: string
  placeholder?: string
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} ${onGenerate ? 'pr-16' : 'pr-10'}`}
        disabled={disabled}
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
        {onGenerate && (
          <button
            type="button"
            onClick={onGenerate}
            tabIndex={-1}
            aria-label="Gerar senha forte"
            title="Gerar senha forte"
            className="text-blue-400 hover:text-blue-600 transition-colors"
          >
            <WandIcon />
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          tabIndex={-1}
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  )
}

function WandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 4V2" /><path d="M15 16v-2" /><path d="M8 9h2" /><path d="M20 9h2" />
      <path d="M17.8 11.8 19 13" /><path d="M15 9h.01" /><path d="M17.8 6.2 19 5" />
      <path d="m3 21 9-9" /><path d="M12.2 6.2 11 5" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
