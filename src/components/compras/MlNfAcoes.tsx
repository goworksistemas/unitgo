import { useState } from 'react'
import { Download, Eye, RefreshCw } from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { MlNotaFiscal } from '@/types/database'
import { NfVisualModal } from './NfVisualModal'

type Props = {
  nf: MlNotaFiscal
  compact?: boolean
}

export function MlNfAcoes({ nf, compact }: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [baixando, setBaixando] = useState(false)

  async function baixar() {
    if (!nf.storage_path) {
      toast.error('Arquivo da NF indisponível')
      return
    }
    setBaixando(true)
    const { data, error } = await supabase.storage
      .from('mercadolivre-nf')
      .createSignedUrl(nf.storage_path, 60)
    setBaixando(false)
    if (error || !data?.signedUrl) {
      toast.error(error?.message ?? 'Erro ao gerar URL')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  const desabilitado = !nf.storage_path

  return (
    <>
      <Button
        isDisabled={desabilitado}
        onPress={() => setModalAberto(true)}
        className="bg-violet-600 text-white hover:bg-violet-700 px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1"
      >
        <Eye size={compact ? 10 : 11} />
        {compact ? 'Ver' : 'Visualizar'}
      </Button>
      <Button
        isDisabled={desabilitado || baixando}
        onPress={baixar}
        className="bg-white dark:bg-gray-800 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300 hover:bg-violet-50 dark:hover:bg-violet-950/40 px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1"
      >
        {baixando ? <RefreshCw size={10} className="animate-spin" /> : <Download size={10} />}
        Baixar
      </Button>
      <NfVisualModal nf={nf} open={modalAberto} onClose={() => setModalAberto(false)} />
    </>
  )
}
