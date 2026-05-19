import { useEffect, useState } from 'react'

export type Densidade = 'compact' | 'cozy'

const STORAGE_KEY = 'compras:densidade'

function readStorage(): Densidade {
  if (typeof window === 'undefined') return 'cozy'
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    if (v === 'compact' || v === 'cozy') return v
  } catch { /* ignore */ }
  return 'cozy'
}

/**
 * Densidade de tabela / listagem (cozy | compact).
 * Persistido em localStorage. Default: cozy.
 */
export function useDensidade(): [Densidade, (d: Densidade) => void, () => void] {
  const [densidade, setDensidadeState] = useState<Densidade>(() => readStorage())

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, densidade) } catch { /* ignore */ }
  }, [densidade])

  const setDensidade = (d: Densidade) => setDensidadeState(d)
  const toggle = () => setDensidadeState(d => (d === 'cozy' ? 'compact' : 'cozy'))
  return [densidade, setDensidade, toggle]
}
