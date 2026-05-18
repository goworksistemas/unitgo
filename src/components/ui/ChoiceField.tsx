import { Check } from 'lucide-react'
import type { SelectAccent } from './SelectField'

export type ChoiceTone = 'gray' | 'blue' | 'emerald' | 'amber' | 'red' | 'violet' | 'indigo'

export interface ChoiceOption {
  value: string
  label: string
  hint?: string
  /** Cor própria desta opção (sobrescreve o accent do componente). Útil para semânticas como prioridade. */
  tone?: ChoiceTone
}

export interface ChoiceFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: ChoiceOption[]
  helper?: string
  required?: boolean
  disabled?: boolean
  accent?: SelectAccent
  className?: string
  size?: 'sm' | 'md'
  /** Se true, ocupa 100% da largura distribuindo as opções; se false, fica do tamanho do conteúdo. */
  fullWidth?: boolean
  /** segmented = botões grudados (default). chips = pílulas individuais (use com tone). */
  variant?: 'segmented' | 'chips'
}

const SELECTED_CLS_BY_ACCENT: Record<SelectAccent, string> = {
  blue:    'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500',
  emerald: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
}

const UNSELECTED_CLS =
  'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60'

// Mapa de classes por tone — borda + texto coloridos quando não selecionado; bg quando selecionado.
const TONE_UNSELECTED: Record<ChoiceTone, string> = {
  gray:    'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/60',
  blue:    'bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/70 hover:bg-blue-50 dark:hover:bg-blue-950/40',
  emerald: 'bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/70 hover:bg-emerald-50 dark:hover:bg-emerald-950/40',
  amber:   'bg-white dark:bg-gray-800 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700/70 hover:bg-amber-50 dark:hover:bg-amber-950/40',
  red:     'bg-white dark:bg-gray-800 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700/70 hover:bg-red-50 dark:hover:bg-red-950/40',
  violet:  'bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-300 border-violet-300 dark:border-violet-700/70 hover:bg-violet-50 dark:hover:bg-violet-950/40',
  indigo:  'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700/70 hover:bg-indigo-50 dark:hover:bg-indigo-950/40',
}

const TONE_SELECTED: Record<ChoiceTone, string> = {
  gray:    'bg-gray-600 text-white border-gray-600 hover:bg-gray-700 dark:bg-gray-500 dark:border-gray-500',
  blue:    'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500',
  emerald: 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500',
  amber:   'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-400',
  red:     'bg-red-600 text-white border-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500',
  violet:  'bg-violet-600 text-white border-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500',
  indigo:  'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500',
}

/**
 * Segmented control / choice — alternativa ao SelectField quando há poucas opções.
 * Visual: botões lado a lado, fácil de bater o olho e clicar.
 */
export function ChoiceField({
  label,
  value,
  onChange,
  options,
  helper,
  required = false,
  disabled = false,
  accent = 'blue',
  className = '',
  size = 'md',
  fullWidth = true,
  variant = 'segmented',
}: ChoiceFieldProps) {
  const height = size === 'sm' ? 'h-8 text-xs' : 'h-9 text-sm'
  const pad    = size === 'sm' ? 'px-2.5' : 'px-3'
  // Se qualquer opção tiver `tone`, força modo chips (cores individuais).
  const usesTones = options.some(o => o.tone)
  const effectiveVariant = usesTones ? 'chips' : variant

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        className={`
          ${effectiveVariant === 'segmented' ? 'inline-flex flex-wrap rounded-xl overflow-hidden' : 'flex flex-wrap gap-2'}
          ${fullWidth ? 'w-full' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}
        `}
      >
        {options.map((opt, idx) => {
          const selected = value === opt.value
          const tone = opt.tone

          const colorCls = tone
            ? (selected ? TONE_SELECTED[tone] : TONE_UNSELECTED[tone])
            : (selected ? SELECTED_CLS_BY_ACCENT[accent] : UNSELECTED_CLS)

          const shapeCls = effectiveVariant === 'segmented'
            ? `${idx === 0 ? 'rounded-l-xl' : '-ml-px'} ${idx === options.length - 1 ? 'rounded-r-xl' : ''}`
            : 'rounded-full'

          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              title={opt.hint}
              className={`
                ${fullWidth && effectiveVariant === 'segmented' ? 'flex-1' : ''}
                flex items-center justify-center gap-1.5 ${pad} ${height}
                font-medium border transition-all whitespace-nowrap
                ${shapeCls}
                ${colorCls}
                ${selected ? 'relative z-10' : ''}
              `}
            >
              {selected && <Check size={13} className="shrink-0" />}
              <span className="truncate">{opt.label}</span>
              {opt.hint && (
                <span className={`text-[10px] opacity-70 ${selected ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                  {opt.hint}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {helper && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 px-0.5">{helper}</p>
      )}
    </div>
  )
}
