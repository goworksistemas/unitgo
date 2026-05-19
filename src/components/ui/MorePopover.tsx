import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * MorePopover: botão "+N mais" que abre popover com lista vertical.
 *
 * - Sem dependência externa (state local + portal + click-outside)
 * - Posicionamento via getBoundingClientRect na abertura
 * - Use para esconder meta secundária / vínculos extras
 */
export function MorePopover({
  label,
  align = 'start',
  children,
  className = '',
  title,
}: {
  label: ReactNode
  align?: 'start' | 'end'
  children: ReactNode
  className?: string
  title?: string
}) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; right?: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (popRef.current?.contains(target) || btnRef.current?.contains(target)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClickOutside)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    const rect = btnRef.current?.getBoundingClientRect()
    if (rect) {
      if (align === 'end') {
        setPos({ top: rect.bottom + 4, left: 0, right: window.innerWidth - rect.right })
      } else {
        setPos({ top: rect.bottom + 4, left: rect.left })
      }
    }
    setOpen(true)
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        title={title}
        className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors ${className}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        {label}
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            right: pos.right,
            zIndex: 100,
          }}
          className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl min-w-[200px] max-w-[min(360px,90vw)] max-h-[60vh] overflow-y-auto"
          role="dialog"
        >
          <div className="p-2 space-y-1">{children}</div>
        </div>,
        document.body,
      )}
    </>
  )
}
