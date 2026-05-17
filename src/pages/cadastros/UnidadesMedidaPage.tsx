import { useEffect, useState } from 'react'
import { Plus, Power, Edit2, Lock, Scale, X, Check } from 'lucide-react'
import { Button, Card, CardContent, TextField, Label, Input } from '@heroui/react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { PrdUnidadeMedida } from '@/types/database'

function FInput({ label, value, onChange, placeholder, onEnter, autoFocus }: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; onEnter?: () => void; autoFocus?: boolean
}) {
  return (
    <TextField value={value} onChange={onChange} className="flex flex-col gap-1 w-full">
      <Label className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">{label}</Label>
      <Input
        autoFocus={autoFocus}
        placeholder={placeholder}
        onKeyDown={e => e.key === 'Enter' && onEnter?.()}
        className="w-full h-9 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />
    </TextField>
  )
}

export function UnidadesMedidaPage() {
  const { profile: me } = useAuth()
  const isAdmin = me?.role === 'admin'

  const [unidades, setUnidades] = useState<PrdUnidadeMedida[]>([])
  const [loading, setLoading] = useState(true)
  const [novoNome, setNovoNome] = useState('')
  const [novaSigla, setNovaSigla] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState<PrdUnidadeMedida | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editSigla, setEditSigla] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function fetchUnidades() {
    setLoading(true)
    const { data } = await supabase.from('prd_unidades_medida').select('*').order('nome')
    setUnidades(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchUnidades() }, [])

  async function criar() {
    if (!novoNome.trim() || !novaSigla.trim()) { setError('Nome e sigla são obrigatórios.'); return }
    setSalvando(true); setError(null)
    const { error } = await supabase.from('prd_unidades_medida').insert({ nome: novoNome.trim(), sigla: novaSigla.trim() })
    setSalvando(false)
    if (error) { setError('Sigla já existe ou erro ao salvar.'); return }
    setNovoNome(''); setNovaSigla(''); fetchUnidades()
  }

  async function salvarEdit() {
    if (!editando || !editNome.trim() || !editSigla.trim()) return
    setError(null)
    const { error } = await supabase.from('prd_unidades_medida')
      .update({ nome: editNome.trim(), sigla: editSigla.trim() })
      .eq('id', editando.id)
    if (error) { setError('Sigla já existe ou erro ao salvar.'); return }
    setEditando(null); fetchUnidades()
  }

  async function toggle(u: PrdUnidadeMedida) {
    await supabase.from('prd_unidades_medida').update({ ativo: !u.ativo }).eq('id', u.id)
    fetchUnidades()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Unidades de medida</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {unidades.filter(u => u.ativo).length} unidade{unidades.filter(u => u.ativo).length !== 1 ? 's' : ''} ativa{unidades.filter(u => u.ativo).length !== 1 ? 's' : ''}
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
        <div className="flex items-end gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <FInput
              label="Nome"
              value={novoNome}
              onChange={setNovoNome}
              placeholder="Ex: Quilograma"
              onEnter={criar}
            />
          </div>
          <div className="w-32">
            <FInput
              label="Sigla"
              value={novaSigla}
              onChange={setNovaSigla}
              placeholder="Ex: kg"
              onEnter={criar}
            />
          </div>
          <Button
            isDisabled={salvando || !novoNome.trim() || !novaSigla.trim()}
            onPress={criar}
            className="bg-blue-600 text-white hover:bg-blue-700 aria-disabled:opacity-60 px-3 h-9 text-sm font-medium flex items-center gap-1.5"
          >
            <Plus size={14} /> Criar
          </Button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Tabela */}
      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
          ) : unidades.length === 0 ? (
            <p className="py-14 text-center text-sm text-gray-400 dark:text-gray-500">Nenhuma unidade cadastrada.</p>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_100px_100px] gap-2 px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                <span>Nome</span>
                <span>Sigla</span>
                <span className="text-right">Ações</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {unidades.map(u => (
                  <div
                    key={u.id}
                    className={`grid grid-cols-[1fr_100px_100px] gap-2 items-center px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${!u.ativo ? 'opacity-60' : ''}`}
                  >
                    {editando?.id === u.id ? (
                      <>
                        <input
                          value={editNome}
                          onChange={e => setEditNome(e.target.value)}
                          autoFocus
                          className="rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm outline-none"
                        />
                        <input
                          value={editSigla}
                          onChange={e => setEditSigla(e.target.value)}
                          className="rounded-lg border border-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-2 py-1.5 text-sm outline-none font-mono"
                          onKeyDown={e => { if (e.key === 'Enter') salvarEdit(); if (e.key === 'Escape') setEditando(null) }}
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
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gray-100 dark:bg-gray-800">
                            <Scale size={13} className="text-gray-500 dark:text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-800 dark:text-gray-200">{u.nome}</span>
                          {!u.ativo && (
                            <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">
                              Inativo
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-mono text-gray-500 dark:text-gray-400">{u.sigla}</span>
                        {isAdmin ? (
                          <div className="flex items-center gap-0.5 justify-end">
                            <button
                              onClick={() => { setEditando(u); setEditNome(u.nome); setEditSigla(u.sigla) }}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => toggle(u)}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                                u.ativo
                                  ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400'
                                  : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600 dark:hover:text-green-400'
                              }`}
                              title={u.ativo ? 'Inativar' : 'Reativar'}
                            >
                              <Power size={14} />
                            </button>
                          </div>
                        ) : <div />}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
