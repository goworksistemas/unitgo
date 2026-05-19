import { Button } from '@heroui/react'

export function MotivoModal({
  titulo,
  descricao,
  obrigatorio,
  confirmLabel,
  confirmTone,
  loading,
  motivo,
  onMotivoChange,
  onCancelar,
  onConfirmar,
}: {
  titulo: string
  descricao: string
  obrigatorio: boolean
  confirmLabel: string
  confirmTone: 'red' | 'gray'
  loading: boolean
  motivo: string
  onMotivoChange: (v: string) => void
  onCancelar: () => void
  onConfirmar: () => void
}) {
  const toneCls = confirmTone === 'red'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-gray-700 hover:bg-gray-800 text-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancelar} />
      <section className="relative w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl flex flex-col">
        <header className="border-b border-gray-100 dark:border-gray-800 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{titulo}</h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{descricao}</p>
        </header>
        <div className="px-5 py-4">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            Motivo {obrigatorio && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={motivo}
            onChange={e => onMotivoChange(e.target.value)}
            rows={4}
            autoFocus
            className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 px-3 py-2 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
            placeholder={obrigatorio ? 'Obrigatório' : 'Opcional'}
          />
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-gray-100 dark:border-gray-800 px-5 py-3">
          <button
            type="button"
            onClick={onCancelar}
            className="rounded-lg px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            Voltar
          </button>
          <Button
            isDisabled={loading || (obrigatorio && !motivo.trim())}
            onPress={onConfirmar}
            className={`${toneCls} aria-disabled:opacity-60 px-4 py-2 text-sm font-medium`}
          >
            {loading ? 'Processando…' : confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  )
}
