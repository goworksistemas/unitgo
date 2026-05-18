import { ChevronDown } from 'lucide-react'
import {
  Select, SelectTrigger, SelectValue, SelectIndicator, SelectPopover,
  ListBox, ListBoxItem,
} from '@heroui/react'

export type SelectAccent = 'blue' | 'emerald'

export interface SelectOption {
  value: string
  label: string
  hint?: string
}

export interface SelectFieldProps {
  label?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  helper?: string
  required?: boolean
  disabled?: boolean
  accent?: SelectAccent
  className?: string
  size?: 'sm' | 'md'
}

const ACCENT_CLS: Record<SelectAccent, string> = {
  blue:    'focus-within:border-blue-500 focus-within:ring-blue-500/20 data-[focused]:border-blue-500 data-[focused]:ring-blue-500/20',
  emerald: 'focus-within:border-emerald-500 focus-within:ring-emerald-500/20 data-[focused]:border-emerald-500 data-[focused]:ring-emerald-500/20',
}

const ACCENT_ITEM_CLS: Record<SelectAccent, string> = {
  blue:    'hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 selected:bg-blue-50 dark:selected:bg-blue-900/30 selected:text-blue-700 dark:selected:text-blue-300 selected:font-medium',
  emerald: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-700 dark:hover:text-emerald-300 selected:bg-emerald-50 dark:selected:bg-emerald-900/30 selected:text-emerald-700 dark:selected:text-emerald-300 selected:font-medium',
}

/**
 * Select padrão do design system — wrapper sobre HeroUI v3.
 * Aceita `placeholder` (que vira uma opção implícita com value="").
 */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
  helper,
  required = false,
  disabled = false,
  accent = 'blue',
  className = '',
  size = 'md',
}: SelectFieldProps) {
  const allItems: SelectOption[] = placeholder
    ? [{ value: '', label: placeholder }, ...options]
    : options

  const triggerHeight = size === 'sm' ? 'h-8' : 'h-9'
  const triggerPad    = size === 'sm' ? 'px-2.5 text-xs' : 'px-3 text-sm'

  return (
    <Select
      selectedKey={value}
      onSelectionChange={k => onChange((k as string) ?? '')}
      isRequired={required}
      isDisabled={disabled}
      className={`flex flex-col gap-1 w-full ${className}`}
    >
      {label && (
        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 px-0.5">
          {label}{required && <span className="text-red-500 ml-0.5">*</span>}
        </span>
      )}
      <SelectTrigger
        className={`
          flex w-full ${triggerHeight} items-center justify-between rounded-xl border border-gray-300 dark:border-gray-600
          bg-white dark:bg-gray-800 ${triggerPad} text-gray-900 dark:text-gray-100 outline-none transition-colors
          hover:border-gray-400 dark:hover:border-gray-500
          disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-gray-50 dark:disabled:bg-gray-800/50
          cursor-pointer focus:ring-2 ${ACCENT_CLS[accent]}
        `}
      >
        <SelectValue className="flex-1 text-left truncate data-[placeholder]:text-gray-400" />
        <SelectIndicator>
          <ChevronDown size={14} className="text-gray-400 shrink-0" />
        </SelectIndicator>
      </SelectTrigger>
      <SelectPopover className="w-[--trigger-width] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg overflow-hidden z-50">
        <ListBox className="max-h-60 overflow-y-auto py-1 outline-none">
          {allItems.map(opt => (
            <ListBoxItem
              key={opt.value || '__empty__'}
              id={opt.value}
              textValue={opt.label}
              className={`
                px-3 py-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer outline-none transition-colors
                ${opt.value === '' ? 'italic text-gray-400 dark:text-gray-500' : ''}
                ${ACCENT_ITEM_CLS[accent]}
              `}
            >
              <div className="flex flex-col">
                <span>{opt.label}</span>
                {opt.hint && (
                  <span className="text-[11px] text-gray-400 dark:text-gray-500">{opt.hint}</span>
                )}
              </div>
            </ListBoxItem>
          ))}
        </ListBox>
      </SelectPopover>
      {helper && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 px-0.5">{helper}</p>
      )}
    </Select>
  )
}
