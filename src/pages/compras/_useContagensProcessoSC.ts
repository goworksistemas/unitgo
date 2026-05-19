import { useCallback, useEffect, useState } from 'react'
import type { EtapaProcessoSC } from './_fluxoEtapas'
import { carregarContagensProcessoSC } from './_processoSC'

/** Contagens globais por etapa do processo completo da SC (listagem) */
export function useContagensProcessoSC() {
  const [contagens, setContagens] = useState<Partial<Record<EtapaProcessoSC, number>>>({})

  const recarregarContagens = useCallback(async () => {
    const map = await carregarContagensProcessoSC()
    setContagens(map)
  }, [])

  useEffect(() => { recarregarContagens() }, [recarregarContagens])

  return { contagens, recarregarContagens }
}
