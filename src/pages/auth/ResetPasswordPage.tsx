import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { generatePassword } from '@/lib/password'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Field, PasswordInput } from './LoginPage'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [copied, setCopied] = useState(false)

  function handleGenerate() {
    const pwd = generatePassword()
    setPassword(pwd)
    setConfirm(pwd)
    setShowPassword(true)
    setShowConfirm(true)
    navigator.clipboard.writeText(pwd).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  useEffect(() => {
    // O Supabase redireciona com tokens na URL (hash ou query params)
    // onAuthStateChange captura o evento PASSWORD_RECOVERY
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setValidSession(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirm) {
      setError('As senhas não coincidem.')
      return
    }
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)

    if (error) {
      setError('Não foi possível redefinir a senha. O link pode ter expirado.')
      return
    }

    setDone(true)
    setTimeout(() => navigate('/auth/login', { replace: true }), 3000)
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[400px] text-center space-y-6">
          <SupplyGoLogo variant="colored" size={56} className="justify-center" />
          <div className="rounded-xl bg-green-50 border border-green-200 p-6 space-y-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckIcon />
            </div>
            <p className="text-sm font-medium text-gray-800">Senha redefinida com sucesso!</p>
            <p className="text-sm text-gray-500">Redirecionando para o login…</p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-8">
          <SupplyGoLogo variant="colored" size={56} />
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Redefinir senha</h1>
          <p className="text-sm text-gray-500">Escolha uma nova senha para sua conta.</p>
        </div>

        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            {!validSession ? (
              <div className="text-center py-4 space-y-2">
                <p className="text-sm text-gray-500">Verificando link de recuperação…</p>
                <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <Field label="Nova senha" htmlFor="password">
                  <PasswordInput
                    id="password"
                    value={password}
                    onChange={setPassword}
                    show={showPassword}
                    onToggle={() => setShowPassword(v => !v)}
                    onGenerate={handleGenerate}
                    disabled={loading}
                    placeholder="Mín. 8 caracteres"
                  />
                  {copied && (
                    <p className="text-xs text-green-600 mt-1">Senha copiada para a área de transferência.</p>
                  )}
                </Field>

                <Field label="Confirmar nova senha" htmlFor="confirm">
                  <PasswordInput
                    id="confirm"
                    value={confirm}
                    onChange={setConfirm}
                    show={showConfirm}
                    onToggle={() => setShowConfirm(v => !v)}
                    disabled={loading}
                    placeholder="Repita a senha"
                  />
                </Field>

                <Button
                  type="submit"
                  isDisabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 py-2.5 font-medium"
                >
                  {loading ? 'Salvando…' : 'Redefinir senha'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthLayout>
  )
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
