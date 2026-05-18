import { useEffect, useState } from 'react'
import { Plus, Power, Edit2, Lock, Building2, X, Check, AlertCircle } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CoreEmpresa } from '@/types/database'

export function EmpresasPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [empresas, setEmpresas] = useState<CoreEmpresa[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Criação
  const [novaRazao, setNovaRazao] = useState('')
  const [novoFantasia, setNovoFantasia] = useState('')
  const [novoCnpj, setNovoCnpj] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Edição inline
  const [editando, setEditando] = useState<CoreEmpresa | null>(null)
  const [editRazao, setEditRazao] = useState('')
  const [editFantasia, setEditFantasia] = useState('')
  const [editCnpj, setEditCnpj] = useState('')

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('core_empresas').select('*').order('razao_social')
    setEmpresas(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  async function criar() {
    if (!novaRazao.trim()) { setError('Razão social é obrigatória.'); return }
    setSalvando(true); setError(null)
    const { error } = await supabase.from('core_empresas').insert({
      razao_social: novaRazao.trim(),
      nome_fantasia: novoFantasia.trim() || null,
      cnpj: novoCnpj.trim() || null,
    })
    setSalvando(false)
    if (error) {
      setError(error.message.includes('duplicate') ? 'CNPJ já cadastrado.' : 'Erro ao salvar.')
      return
    }
    setNovaRazao(''); setNovoFantasia(''); setNovoCnpj('')
    toast.success('Empresa criada')
    fetchData()
  }

  async function salvarEdit() {
    if (!editando || !editRazao.trim()) return
    setError(null)
    const { error } = await supabase.from('core_empresas')
      .update({
        razao_social: editRazao.trim(),
        nome_fantasia: editFantasia.trim() || null,
        cnpj: editCnpj.trim() || null,
      })
      .eq('id', editando.id)
    if (error) {
      setError(error.message.includes('duplicate') ? 'CNPJ já cadastrado.' : 'Erro ao salvar.')
      return
    }
    setEditando(null)
    toast.success('Empresa atualizada')
    fetchData()
  }

  async function toggle(e: CoreEmpresa) {
    await supabase.from('core_empresas').update({ ativo: !e.ativo }).eq('id', e.id)
    toast.success(e.ativo ? 'Empresa inativada' : 'Empresa reativada')
    fetchData()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Empresas</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {empresas.filter(e => e.ativo).length} empresa{empresas.filter(e => e.ativo).length !== 1 ? 's' : ''} ativa{empresas.filter(e => e.ativo).length !== 1 ? 's' : ''}
          </p>
        </div>
        {!isAdmin && (
          <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
            <Lock size={12} /> Somente leitura
          </div>
        )}
      </div>

      {/* Form de criação */}
      {isAdmin && (
        <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
          <CardContent className="px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-2">Nova empresa</p>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-5">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Razão social *</label>
                <input
                  type="text" value={novaRazao} onChange={e => setNovaRazao(e.target.value)}
                  placeholder="Ex: ACME Indústria Ltda"
                  className={inputCls()}
                  onKeyDown={e => e.key === 'Enter' && criar()}
                />
              </div>
              <div className="md:col-span-4">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Nome fantasia</label>
                <input
                  type="text" value={novoFantasia} onChange={e => setNovoFantasia(e.target.value)}
                  placeholder="Ex: ACME"
                  className={inputCls()}
                  onKeyDown={e => e.key === 'Enter' && criar()}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">CNPJ</label>
                <input
                  type="text" value={novoCnpj} onChange={e => setNovoCnpj(e.target.value)}
                  placeholder="00.000.000/0001-00"
                  className={inputCls()}
                  onKeyDown={e => e.key === 'Enter' && criar()}
                />
              </div>
              <div className="md:col-span-1">
                <Button
                  isDisabled={salvando || !novaRazao.trim()}
                  onPress={criar}
                  className="w-full bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-3 h-9 text-sm font-medium flex items-center justify-center gap-1.5"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* Tabela */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : empresas.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma empresa cadastrada.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_220px_180px_90px] gap-3 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <span>Razão social</span>
                <span>Nome fantasia</span>
                <span>CNPJ</span>
                <span className="text-right">Ações</span>
              </div>
              <ul className="divide-y divide-gray-100 dark:divide-gray-800">
                {empresas.map(e => (
                  <li key={e.id} className={`grid grid-cols-[1fr_220px_180px_90px] gap-3 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${!e.ativo ? 'opacity-60' : ''}`}>
                    {editando?.id === e.id ? (
                      <>
                        <input value={editRazao} onChange={ev => setEditRazao(ev.target.value)} autoFocus
                          className="rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm outline-none" />
                        <input value={editFantasia} onChange={ev => setEditFantasia(ev.target.value)} placeholder="(opcional)"
                          className="rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm outline-none" />
                        <input value={editCnpj} onChange={ev => setEditCnpj(ev.target.value)} placeholder="(opcional)"
                          className="rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm outline-none font-mono"
                          onKeyDown={ev => { if (ev.key === 'Enter') salvarEdit(); if (ev.key === 'Escape') setEditando(null) }}
                        />
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={salvarEdit} className="flex h-7 w-7 items-center justify-center rounded-lg text-green-600 hover:bg-green-50 dark:hover:bg-green-950/40 transition-colors">
                            <Check size={14} />
                          </button>
                          <button onClick={() => setEditando(null)} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                            <X size={14} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-blue-50 dark:bg-blue-900/30">
                            <Building2 size={13} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{e.razao_social}</span>
                          {!e.ativo && (
                            <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Inativa</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-600 dark:text-gray-300 truncate">{e.nome_fantasia ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{e.cnpj ?? <span className="text-gray-300 dark:text-gray-600">—</span>}</span>
                        {isAdmin ? (
                          <div className="flex items-center gap-0.5 justify-end">
                            <button
                              onClick={() => { setEditando(e); setEditRazao(e.razao_social); setEditFantasia(e.nome_fantasia ?? ''); setEditCnpj(e.cnpj ?? '') }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => toggle(e)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                e.ativo
                                  ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400'
                                  : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 dark:hover:text-green-400'
                              }`}
                              title={e.ativo ? 'Inativar' : 'Reativar'}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        ) : <div />}
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 h-9 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
}
