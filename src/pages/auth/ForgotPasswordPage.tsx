import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Field, inputClass } from './LoginPage'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/redefinir-senha`,
    })

    setLoading(false)

    if (error) {
      setError('Não foi possível enviar o e-mail. Verifique o endereço e tente novamente.')
      return
    }

    setSent(true)
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-8">
          <SupplyGoLogo variant="colored" size={56} />
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Recuperar senha</h1>
          <p className="text-sm text-gray-500 text-center">
            Informe seu e-mail e enviaremos um link para redefinir sua senha.
          </p>
        </div>

        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            {sent ? (
              <div className="text-center space-y-4 py-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <CheckIcon />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">E-mail enviado!</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Verifique a caixa de entrada de <strong>{email}</strong>.
                  </p>
                </div>
                <Link
                  to="/auth/login"
                  className="block text-sm text-blue-600 hover:underline pt-2"
                >
                  ← Voltar para o login
                </Link>
              </div>
            ) : (
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

                <Button
                  type="submit"
                  isDisabled={loading}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 py-2.5 font-medium"
                >
                  {loading ? 'Enviando…' : 'Enviar link de recuperação'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {!sent && (
          <p className="text-center text-sm text-gray-500 mt-5">
            Lembrou a senha?{' '}
            <Link to="/auth/login" className="text-blue-600 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        )}
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
