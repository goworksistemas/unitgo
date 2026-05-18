import { useEffect, useState } from 'react'
import { Plus, Power, Edit2, Lock, Truck, Search, X, Check, AlertCircle, Mail, Phone } from 'lucide-react'
import { Button, Card, CardContent } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { CmpFornecedor } from '@/types/database'

export function FornecedoresPage() {
  const { profile: me } = useAuth()
  const podeEditar = me?.role === 'admin' || me?.role === 'comprador'

  const [fornecedores, setFornecedores] = useState<CmpFornecedor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editando, setEditando] = useState<CmpFornecedor | 'novo' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('cmp_fornecedores').select('*').order('razao_social')
    setFornecedores(data ?? [])
    setLoading(false)
  }
  useEffect(() => { fetchData() }, [])

  const filtrados = fornecedores.filter(f =>
    f.razao_social.toLowerCase().includes(search.toLowerCase()) ||
    f.nome_fantasia?.toLowerCase().includes(search.toLowerCase()) ||
    f.cnpj_cpf?.includes(search.replace(/\D/g, ''))
  )

  async function toggle(f: CmpFornecedor) {
    await supabase.from('cmp_fornecedores').update({ ativo: !f.ativo }).eq('id', f.id)
    toast.success(f.ativo ? 'Fornecedor inativado' : 'Fornecedor reativado')
    fetchData()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Fornecedores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {fornecedores.filter(f => f.ativo).length} ativo{fornecedores.filter(f => f.ativo).length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!podeEditar && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-3 py-1.5 text-xs text-amber-700 dark:text-amber-400">
              <Lock size={12} /> Somente leitura
            </div>
          )}
          {podeEditar && (
            <Button
              onPress={() => setEditando('novo')}
              className="bg-emerald-600 text-white hover:bg-emerald-700 px-3 py-2 text-sm font-medium flex items-center gap-1.5"
            >
              <Plus size={14} /> Novo fornecedor
            </Button>
          )}
        </div>
      </div>

      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="search" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por razão social, fantasia ou CNPJ…"
          className="w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 pl-8 pr-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={14} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <Card className="shadow-sm border border-gray-100 dark:border-gray-800 dark:bg-gray-900">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            </div>
          ) : filtrados.length === 0 ? (
            <div className="py-14 text-center">
              <Truck size={28} className="mx-auto text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {search ? 'Nenhum fornecedor encontrado.' : 'Nenhum fornecedor cadastrado.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-gray-800">
              {filtrados.map(f => (
                <li key={f.id} className={`flex items-center gap-3 px-5 py-3 hover:bg-gray-50/60 dark:hover:bg-gray-800/60 transition-colors ${!f.ativo ? 'opacity-60' : ''}`}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
                    <Truck size={16} className="text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{f.razao_social}</p>
                      {f.nome_fantasia && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">({f.nome_fantasia})</span>
                      )}
                      {!f.ativo && (
                        <span className="rounded-full bg-red-100 dark:bg-red-950/40 px-1.5 py-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400">Inativo</span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-3 flex-wrap text-xs text-gray-500 dark:text-gray-400">
                      {f.cnpj_cpf && <span className="font-mono">{f.cnpj_cpf}</span>}
                      {f.email && <span className="inline-flex items-center gap-1"><Mail size={11} />{f.email}</span>}
                      {f.telefone && <span className="inline-flex items-center gap-1"><Phone size={11} />{f.telefone}</span>}
                    </div>
                  </div>
                  {podeEditar && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setEditando(f)} className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors" title="Editar">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => toggle(f)} className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${f.ativo ? 'text-gray-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500' : 'text-gray-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-green-600'}`} title={f.ativo ? 'Inativar' : 'Reativar'}>
                        <Power size={14} />
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {editando !== null && (
        <ModalFornecedor
          fornecedor={editando === 'novo' ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvar={() => { setEditando(null); fetchData() }}
          onError={setError}
        />
      )}
    </div>
  )
}

function ModalFornecedor({ fornecedor, onFechar, onSalvar, onError }: {
  fornecedor: CmpFornecedor | null
  onFechar: () => void
  onSalvar: () => void
  onError: (msg: string) => void
}) {
  const isEdit = !!fornecedor
  const [razao, setRazao] = useState(fornecedor?.razao_social ?? '')
  const [fantasia, setFantasia] = useState(fornecedor?.nome_fantasia ?? '')
  const [cnpj, setCnpj] = useState(fornecedor?.cnpj_cpf ?? '')
  const [email, setEmail] = useState(fornecedor?.email ?? '')
  const [telefone, setTelefone] = useState(fornecedor?.telefone ?? '')
  const [observacoes, setObservacoes] = useState(fornecedor?.observacoes ?? '')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function salvar() {
    if (!razao.trim()) { setErro('Razão social é obrigatória.'); return }
    setSaving(true); setErro(null)
    const payload = {
      razao_social: razao.trim(),
      nome_fantasia: fantasia.trim() || null,
      cnpj_cpf: cnpj.replace(/\D/g, '') || null,
      email: email.trim() || null,
      telefone: telefone.trim() || null,
      observacoes: observacoes.trim() || null,
    }
    const { error } = isEdit
      ? await supabase.from('cmp_fornecedores').update(payload).eq('id', fornecedor!.id)
      : await supabase.from('cmp_fornecedores').insert(payload)
    setSaving(false)
    if (error) {
      setErro(error.message.includes('duplicate') ? 'CNPJ/CPF já cadastrado.' : 'Erro ao salvar.')
      onError('Erro ao salvar fornecedor.')
      return
    }
    toast.success(isEdit ? 'Fornecedor atualizado' : 'Fornecedor criado')
    onSalvar()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? 'Editar fornecedor' : 'Novo fornecedor'}
          </h2>
          <button onClick={onFechar} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {erro && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-3 py-2 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={14} className="mt-0.5 shrink-0" /> {erro}
            </div>
          )}

          <Field label="Razão social" required>
            <input value={razao} onChange={e => setRazao(e.target.value)} placeholder="Ex: ACME Indústria e Comércio Ltda" className={inputCls()} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome fantasia">
              <input value={fantasia} onChange={e => setFantasia(e.target.value)} placeholder="Opcional" className={inputCls()} />
            </Field>
            <Field label="CNPJ / CPF">
              <input value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0001-00" className={inputCls() + ' font-mono'} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="E-mail">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contato@empresa.com" className={inputCls()} />
            </Field>
            <Field label="Telefone">
              <input value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="(00) 00000-0000" className={inputCls()} />
            </Field>
          </div>

          <Field label="Observações">
            <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} rows={2} className={inputCls()} placeholder="Opcional" />
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button onClick={onFechar} className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            Cancelar
          </button>
          <Button isDisabled={saving} onPress={salvar} className="bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-4 py-2 text-sm font-medium flex items-center gap-1.5">
            <Check size={14} /> {saving ? 'Salvando…' : isEdit ? 'Salvar' : 'Criar fornecedor'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      {children}
    </label>
  )
}

function inputCls() {
  return 'w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'
}
