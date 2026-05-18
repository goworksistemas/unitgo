import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { SelectAccent, SelectOption } from './SelectField'

export interface MultiSelectFieldProps {
  label?: string
  values: string[]
  onChange: (values: string[]) => void
  options: SelectOption[]
  placeholder?: string
  helper?: string
  required?: boolean
  disabled?: boolean
  accent?: SelectAccent
  className?: string
  /** Texto quando nada está selecionado. Ex: "Selecione fornecedores…" */
  emptyLabel?: string
  /** Texto para o input de busca dentro do dropdown */
  searchPlaceholder?: string
}

const ACCENT_FOCUS: Record<SelectAccent, string> = {
  blue:    'focus-within:border-blue-500 focus-within:ring-blue-500/20',
  emerald: 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20',
}

const ACCENT_CHIP: Record<SelectAccent, string> = {
  blue:    'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800',
  emerald: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
}

const ACCENT_ITEM_SELECTED: Record<SelectAccent, string> = {
  blue:    'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  emerald: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300',
}

export function MultiSelectField({
  label,
  values,
  onChange,
  options,
  helper,
  required = false,
  disabled = false,
  accent = 'blue',
  className = '',
  emptyLabel = '— selecione —',
  searchPlaceholder = 'Buscar…',
}: MultiSelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Fecha ao clicar fora
  useEffect(() => {
    function onClickFora(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', onClickFora)
      return () => document.removeEventListener('mousedown', onClickFora)
    }
  }, [open])

  // Foca o input ao abrir
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return options
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.hint?.toLowerCase().includes(q)
    )
  }, [options, busca])

  const selecionadas = useMemo(
    () => options.filter(o => values.includes(o.value)),
    [options, values]
  )

  function toggle(value: string) {
    if (values.includes(value)) {
      onChange(values.filter(v => v !== value))
    } else {
      onChange([...values, value])
    }
  }

  function remover(value: string) {
    onChange(values.filter(v => v !== value))
  }

  function limparTudo() {
    onChange([])
  }

  function selecionarTodos() {
    onChange(filtradas.map(o => o.value))
  }

  return (
    <div ref={wrapperRef} className={`flex flex-col gap-1 w-full relative ${className}`}>
      {label && (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}

      {/* Trigger */}
      <button
        type="button"
        onClick={() => !disabled && setOpen(v => !v)}
        disabled={disabled}
        className={`
          flex w-full min-h-9 items-start justify-between rounded-xl border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 outline-none transition-colors
          hover:border-gray-400 dark:hover:border-gray-500
          disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50
          cursor-pointer focus:ring-2 text-left
          ${ACCENT_FOCUS[accent]}
        `}
      >
        <div className="flex-1 min-w-0 flex flex-wrap gap-1 items-center">
          {selecionadas.length === 0 ? (
            <span className="text-gray-400 dark:text-gray-500 px-1 py-0.5">{emptyLabel}</span>
          ) : (
            selecionadas.map(opt => (
              <span
                key={opt.value}
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${ACCENT_CHIP[accent]}`}
              >
                <span className="truncate max-w-[150px]">{opt.label}</span>
                <span
                  role="button"
                  aria-label={`Remover ${opt.label}`}
                  tabIndex={0}
                  onClick={e => { e.stopPropagation(); remover(opt.value) }}
                  className="hover:opacity-70 cursor-pointer"
                >
                  <X size={11} />
                </span>
              </span>
            ))
          )}
        </div>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform mt-1 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg z-50 overflow-hidden">
          {/* Busca */}
          <div className="flex items-center gap-2 border-b border-gray-100 dark:border-gray-800 px-3 py-2">
            <Search size={13} className="text-gray-400 shrink-0" />
            <input
              ref={inputRef}
              type="search"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={searchPlaceholder}
              className="flex-1 bg-transparent text-sm outline-none placeholder-gray-400 text-gray-900 dark:text-gray-100"
            />
            {values.length > 0 && (
              <button
                onClick={limparTudo}
                className="text-[11px] text-red-600 dark:text-red-400 hover:underline whitespace-nowrap"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Atalho: selecionar todos os filtrados */}
          {filtradas.length > 1 && (
            <div className="px-3 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-800/40">
              <button
                onClick={selecionarTodos}
                className="text-[11px] text-gray-600 dark:text-gray-300 hover:underline"
              >
                Selecionar todos {busca ? `(${filtradas.length} filtrados)` : `(${filtradas.length})`}
              </button>
            </div>
          )}

          {/* Lista */}
          <ul className="max-h-64 overflow-y-auto py-1">
            {filtradas.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">Nada encontrado.</li>
            ) : (
              filtradas.map(opt => {
                const checked = values.includes(opt.value)
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => toggle(opt.value)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                        checked
                          ? ACCENT_ITEM_SELECTED[accent]
                          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${
                        checked
                          ? accent === 'emerald' ? 'border-emerald-600 bg-emerald-600' : 'border-blue-600 bg-blue-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {checked && <Check size={11} className="text-white" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{opt.label}</p>
                        {opt.hint && (
                          <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{opt.hint}</p>
                        )}
                      </div>
                    </button>
                  </li>
                )
              })
            )}
          </ul>

          {/* Footer com contagem */}
          {values.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-1.5 bg-gray-50/40 dark:bg-gray-800/40">
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                {values.length} {values.length === 1 ? 'selecionado' : 'selecionados'}
              </span>
            </div>
          )}
        </div>
      )}

      {helper && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 px-0.5">{helper}</p>
      )}
    </div>
  )
}
