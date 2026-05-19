import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, Check, CheckCircle2, ExternalLink, Lock, RefreshCw, Trash2, Unplug,
  X, AlertCircle, ShoppingBag,
} from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CoreEmpresa, MlCredencial } from '@/types/database'

const ML_AUTH_URL = 'https://auth.mercadolivre.com.br/authorization'

// O App ID precisa estar acessível no frontend para montar a URL de OAuth.
// Não é segredo (apenas o client_secret é).
// Configure em VITE_ML_CLIENT_ID no .env.
const ML_CLIENT_ID = import.meta.env.VITE_ML_CLIENT_ID as string | undefined

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const ML_REDIRECT_URI = `${SUPABASE_URL}/functions/v1/ml-oauth-callback`

type CredencialEnriquecida = MlCredencial & { empresa?: CoreEmpresa }

export function MercadoLivrePage() {
  const { profile } = useAuth()
  const isAdmin = profile?.role === 'admin' || profile?.role === 'diretor'

  const [searchParams, setSearchParams] = useSearchParams()
  const [empresas, setEmpresas] = useState<CoreEmpresa[]>([])
  const [credenciais, setCredenciais] = useState<CredencialEnriquecida[]>([])
  const [loading, setLoading] = useState(true)
  const [acaoLoading, setAcaoLoading] = useState<string | null>(null)
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [emps, creds] = await Promise.all([
      supabase.from('core_empresas').select('*').eq('ativo', true).order('razao_social'),
      supabase.from('ml_credenciais').select(`
        *,
        empresa:core_empresas(id,razao_social,nome_fantasia,cnpj,ativo,created_at,updated_at)
      `).order('created_at', { ascending: false }),
    ])
    setEmpresas((emps.data ?? []) as CoreEmpresa[])
    setCredenciais((creds.data ?? []) as unknown as CredencialEnriquecida[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Captura retorno do OAuth callback
  useEffect(() => {
    const sucesso = searchParams.get('ml_success')
    const err = searchParams.get('ml_error')
    const errDesc = searchParams.get('ml_error_description')
    if (sucesso === '1') {
      toast.success(`Conta do Mercado Livre conectada${
        searchParams.get('nickname') ? ` (${searchParams.get('nickname')})` : ''
      }`)
      setSearchParams({})
      fetchData()
    } else if (err) {
      toast.error(`Erro na conexão: ${errDesc || err}`)
      setSearchParams({})
    }
  }, [searchParams, setSearchParams, fetchData])

  function iniciarConexao() {
    if (!ML_CLIENT_ID) {
      toast.error('VITE_ML_CLIENT_ID não está configurado no .env')
      return
    }
    if (!empresaSelecionada) {
      toast.error('Selecione uma empresa primeiro')
      return
    }
    const url = new URL(ML_AUTH_URL)
    url.searchParams.set('response_type', 'code')
    url.searchParams.set('client_id', ML_CLIENT_ID)
    url.searchParams.set('redirect_uri', ML_REDIRECT_URI)
    url.searchParams.set('state', empresaSelecionada)
    window.location.href = url.toString()
  }

  async function sincronizar(credencialId: string, max: number) {
    setAcaoLoading(`sync-${credencialId}`)
    const { data, error } = await supabase.functions.invoke('ml-sync-resource', {
      body: { acao: 'import_orders', credencial_id: credencialId, max },
    })
    setAcaoLoading(null)
    if (error) {
      toast.error(`Falha ao sincronizar: ${error.message}`)
      return
    }
    const resp = data as { ok?: boolean; importados?: number; error?: string }
    if (resp?.error) {
      toast.error(`Falha: ${resp.error}`)
      return
    }
    toast.success(`${resp.importados ?? 0} pedidos sincronizados`)
    fetchData()
  }

  async function desativar(credencialId: string) {
    if (!window.confirm('Desativar esta conexão? Os tokens armazenados serão mantidos, mas as sincronizações automáticas pararão.')) return
    setAcaoLoading(`disable-${credencialId}`)
    const { error } = await supabase.from('ml_credenciais').update({ ativo: false }).eq('id', credencialId)
    setAcaoLoading(null)
    if (error) { toast.error(error.message); return }
    toast.success('Conexão desativada')
    fetchData()
  }

  async function reativar(credencialId: string) {
    setAcaoLoading(`enable-${credencialId}`)
    const { error } = await supabase.from('ml_credenciais').update({ ativo: true }).eq('id', credencialId)
    setAcaoLoading(null)
    if (error) { toast.error(error.message); return }
    toast.success('Conexão reativada')
    fetchData()
  }

  async function remover(credencialId: string) {
    if (!window.confirm('Remover permanentemente? Tokens e histórico de pedidos vinculados serão preservados, mas você perderá acesso ao ML até reconectar.')) return
    setAcaoLoading(`del-${credencialId}`)
    const { error } = await supabase.from('ml_credenciais').delete().eq('id', credencialId)
    setAcaoLoading(null)
    if (error) { toast.error(error.message); return }
    toast.success('Conexão removida')
    fetchData()
  }

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Mercado Livre</h1>
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="px-5 py-6 flex items-center gap-2 text-sm text-gray-500">
            <Lock size={14} /> Apenas administradores e diretores podem gerenciar a integração.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Mercado Livre</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Conecte uma conta do Mercado Livre para acompanhar pedidos, envios e notas fiscais.
          </p>
        </div>
      </div>

      {!ML_CLIENT_ID && (
        <Card className="shadow-sm border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="px-5 py-4 text-sm text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-semibold">VITE_ML_CLIENT_ID não configurado</p>
              <p className="mt-1">
                Adicione no arquivo <code className="font-mono">.env</code> a chave{' '}
                <code className="font-mono">VITE_ML_CLIENT_ID</code> com o App ID que você criou no
                DevCenter do Mercado Livre. As Edge Functions também precisam dos secrets{' '}
                <code className="font-mono">ML_CLIENT_ID</code>, <code className="font-mono">ML_CLIENT_SECRET</code>,{' '}
                <code className="font-mono">ML_REDIRECT_URI</code> e <code className="font-mono">FRONTEND_URL</code>.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Conectar nova conta</h2>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={empresaSelecionada}
              onChange={e => setEmpresaSelecionada(e.target.value)}
              className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Selecione a empresa…</option>
              {empresas.map(e => (
                <option key={e.id} value={e.id}>
                  {e.nome_fantasia ?? e.razao_social}
                </option>
              ))}
            </select>
            <Button
              isDisabled={!ML_CLIENT_ID || !empresaSelecionada}
              onPress={iniciarConexao}
              className="bg-yellow-400 text-gray-900 hover:bg-yellow-500 px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
            >
              <ShoppingBag size={14} /> Conectar conta Mercado Livre
            </Button>
          </div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Você será redirecionado para o site do Mercado Livre para autorizar o acesso.
            Os tokens são armazenados de forma segura no Supabase.
          </p>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Contas conectadas</h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : credenciais.length === 0 ? (
          <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
            <CardContent className="px-5 py-12 text-center text-sm text-gray-400">
              Nenhuma conta conectada ainda.
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {credenciais.map(c => {
              const expira = new Date(c.token_expira_em)
              const venceu = expira.getTime() < Date.now()
              return (
                <li key={c.id}>
                  <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
                    <CardContent className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/40">
                              <ShoppingBag size={14} className="text-yellow-700 dark:text-yellow-400" />
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                              {c.nickname ?? `User ${c.ml_user_id}`}
                            </span>
                            {c.ativo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-semibold">
                                <CheckCircle2 size={10} /> Ativa
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 text-[10px] font-semibold">
                                <X size={10} /> Inativa
                              </span>
                            )}
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                            <span className="inline-flex items-center gap-1">
                              <Building2 size={11} className="text-gray-400" />
                              {c.empresa?.nome_fantasia ?? c.empresa?.razao_social ?? '—'}
                            </span>
                            <span>
                              <span className="text-gray-400">ML user_id:</span>{' '}
                              <span className="font-mono">{c.ml_user_id}</span>
                            </span>
                            <span>
                              <span className="text-gray-400">E-mail:</span> {c.email ?? '—'}
                            </span>
                            <span>
                              <span className="text-gray-400">Site:</span> {c.site_id ?? '—'}
                            </span>
                            <span>
                              <span className="text-gray-400">Última sync:</span>{' '}
                              {c.ultima_sync ? new Date(c.ultima_sync).toLocaleString('pt-BR') : 'nunca'}
                            </span>
                            <span className={venceu ? 'text-red-600 dark:text-red-400' : ''}>
                              <span className="text-gray-400">Token expira:</span>{' '}
                              {expira.toLocaleString('pt-BR')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap">
                          {c.ativo && (
                            <Button
                              isDisabled={acaoLoading === `sync-${c.id}`}
                              onPress={() => sincronizar(c.id, 50)}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              {acaoLoading === `sync-${c.id}` ? (
                                <><RefreshCw size={12} className="animate-spin" /> Sincronizando…</>
                              ) : (
                                <><RefreshCw size={12} /> Sincronizar 50 últimos</>
                              )}
                            </Button>
                          )}
                          {c.ativo ? (
                            <Button
                              isDisabled={acaoLoading === `disable-${c.id}`}
                              onPress={() => desativar(c.id)}
                              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              <Unplug size={12} /> Desativar
                            </Button>
                          ) : (
                            <Button
                              isDisabled={acaoLoading === `enable-${c.id}`}
                              onPress={() => reativar(c.id)}
                              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                            >
                              <Check size={12} /> Reativar
                            </Button>
                          )}
                          <Button
                            isDisabled={acaoLoading === `del-${c.id}`}
                            onPress={() => remover(c.id)}
                            className="bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-3 py-1.5 text-xs font-medium inline-flex items-center gap-1.5"
                          >
                            <Trash2 size={12} /> Remover
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="px-5 py-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>
            <span className="font-semibold text-gray-700 dark:text-gray-300">URL de redirecionamento:</span>{' '}
            <code className="font-mono">{ML_REDIRECT_URI}</code>
          </p>
          <p className="flex items-center gap-1">
            <ExternalLink size={11} />
            Cadastre essa URL no DevCenter (
            <a
              href="https://developers.mercadolivre.com.br/devcenter"
              target="_blank"
              rel="noreferrer"
              className="text-emerald-600 hover:underline"
            >
              developers.mercadolivre.com.br/devcenter
            </a>
            )
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
