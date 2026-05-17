import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Button, Card, CardContent } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { generatePassword } from '@/lib/password'
import { SupplyGoLogo } from '@/components/shared/SupplyGoLogo'
import { AuthLayout } from '@/layouts/AuthLayout'
import { Field, PasswordInput, inputClass } from './LoginPage'

export default function RegisterPage() {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
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

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })

    setLoading(false)

    if (error) {
      setError(traduzirErro(error.message))
      return
    }

    setDone(true)
  }

  if (done) {
    return (
      <AuthLayout>
        <div className="w-full max-w-[400px] text-center space-y-6">
          <div className="flex justify-center">
            <SupplyGoLogo variant="colored" size={56} />
          </div>
          <div className="rounded-xl bg-green-50 border border-green-200 p-6 space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckIcon />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Conta criada!</h2>
            <p className="text-sm text-gray-600">
              Enviamos um e-mail de confirmação para <strong>{email}</strong>.<br />
              Confirme seu e-mail para ativar o acesso.
            </p>
          </div>
          <Link to="/auth/login" className="block text-sm text-blue-600 hover:underline">
            ← Voltar para o login
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px]">
        <div className="flex flex-col items-center gap-2 mb-8">
          <SupplyGoLogo variant="colored" size={56} />
          <h1 className="text-xl font-semibold text-gray-900 mt-2">Criar conta</h1>
          <p className="text-sm text-gray-500">Preencha os dados abaixo para começar.</p>
        </div>

        <Card className="shadow-sm border border-gray-200">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Field label="Nome completo" htmlFor="nome">
                <input
                  id="nome"
                  type="text"
                  autoComplete="name"
                  required
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="João da Silva"
                  className={inputClass}
                  disabled={loading}
                />
              </Field>

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

              <Field label="Senha" htmlFor="password">
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
                <PasswordStrength password={password} />
              </Field>

              <Field label="Confirmar senha" htmlFor="confirm">
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
                className="w-full bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 py-2.5 font-medium mt-2"
              >
                {loading ? 'Criando conta…' : 'Criar conta'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-5">
          Já tem conta?{' '}
          <Link to="/auth/login" className="text-blue-600 font-medium hover:underline">
            Entrar
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null

  const score = getStrength(password)
  const labels = ['Muito fraca', 'Fraca', 'Razoável', 'Forte', 'Muito forte']
  const colors = ['bg-red-500', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500', 'bg-green-600']

  return (
    <div className="mt-1.5 space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${i <= score ? colors[score] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500">{labels[score]}</p>
    </div>
  )
}

function getStrength(password: string): number {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return Math.min(score, 4)
}

function traduzirErro(msg: string): string {
  if (msg.includes('already registered')) return 'Este e-mail já está cadastrado.'
  if (msg.includes('Password should be')) return 'A senha deve ter pelo menos 6 caracteres.'
  if (msg.includes('Unable to validate')) return 'E-mail inválido.'
  return 'Erro ao criar conta. Tente novamente.'
}

function CheckIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}
