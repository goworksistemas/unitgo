import { useState } from 'react'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import type { Profile } from '@/types/database'
import { MotivoModal } from './_MotivoModal'

const btnAprovar =
  'bg-emerald-600 text-white hover:bg-emerald-700 aria-disabled:opacity-60 px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 rounded-md'
const btnReprovar =
  'bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 px-2 py-1 text-[11px] font-medium inline-flex items-center gap-1 rounded-md'

export function podeAprovarSolicitacao(
  sc: { status: string; departamento?: { gestor_id?: string | null } | null },
  profile: Profile | null | undefined,
): boolean {
  if (!profile || sc.status !== 'aguardando_aprovacao') return false
  if (profile.role === 'admin') return true
  return !!sc.departamento?.gestor_id && sc.departamento.gestor_id === profile.id
}

export function podeAprovarPedidoLista(
  pedido: { status: string; aprovador_id: string | null },
  profile: Profile | null | undefined,
): boolean {
  if (!profile || pedido.status !== 'aguardando_aprovacao') return false
  return profile.role === 'admin' || pedido.aprovador_id === profile.id
}

export function AcoesAprovacaoSC({
  sc,
  onAtualizado,
}: {
  sc: {
    id: string
    numero: string
    status: string
    departamento?: { gestor_id?: string | null } | null
  }
  onAtualizado: () => void
}) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState<'aprovar' | 'reprovar' | null>(null)
  const [modalReprovar, setModalReprovar] = useState(false)
  const [motivo, setMotivo] = useState('')

  if (!podeAprovarSolicitacao(sc, profile)) return null

  const eu = profile!.id

  async function aprovar() {
    setLoading('aprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'aprovada',
        aprovador_id: eu,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: null,
      })
      .eq('id', sc.id)
    if (error) {
      toast.error('Erro ao aprovar solicitação.')
      setLoading(null)
      return
    }
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'solicitacao',
      documento_id: sc.id,
      aprovador_id: eu,
      acao: 'aprovou',
    })
    toast.success(`${sc.numero} aprovada`)
    onAtualizado()
    setLoading(null)
  }

  async function reprovar() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da reprovação.')
      return
    }
    setLoading('reprovar')
    const { error } = await supabase
      .from('cmp_solicitacoes_compra')
      .update({
        status: 'reprovada',
        aprovador_id: eu,
        aprovado_em: new Date().toISOString(),
        motivo_reprovacao: motivo.trim(),
      })
      .eq('id', sc.id)
    if (error) {
      toast.error('Erro ao reprovar solicitação.')
      setLoading(null)
      return
    }
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'solicitacao',
      documento_id: sc.id,
      aprovador_id: eu,
      acao: 'reprovou',
      comentario: motivo.trim(),
    })
    toast.success(`${sc.numero} reprovada`)
    setModalReprovar(false)
    setMotivo('')
    onAtualizado()
    setLoading(null)
  }

  return (
    <>
      <span className="inline-flex" title="Aprovar solicitação">
        <Button
          isDisabled={loading != null}
          onPress={aprovar}
          className={btnAprovar}
        >
          <CheckCircle2 size={12} />
          {loading === 'aprovar' ? '…' : 'Aprovar'}
        </Button>
      </span>
      <span className="inline-flex" title="Reprovar solicitação">
        <Button
          isDisabled={loading != null}
          onPress={() => { setModalReprovar(true); setMotivo('') }}
          className={btnReprovar}
        >
          <XCircle size={12} /> Reprovar
        </Button>
      </span>
      {modalReprovar && (
        <MotivoModal
          titulo="Reprovar solicitação"
          descricao={`Informe o motivo da reprovação de ${sc.numero}. Ele ficará visível ao solicitante.`}
          obrigatorio
          confirmLabel="Reprovar"
          confirmTone="red"
          loading={loading === 'reprovar'}
          motivo={motivo}
          onMotivoChange={setMotivo}
          onCancelar={() => { setModalReprovar(false); setMotivo('') }}
          onConfirmar={reprovar}
        />
      )}
    </>
  )
}

export function AcoesAprovacaoPedido({
  pedido,
  onAtualizado,
}: {
  pedido: { id: string; numero: string; status: string; aprovador_id: string | null }
  onAtualizado: () => void
}) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState<'aprovar' | 'reprovar' | null>(null)
  const [modalReprovar, setModalReprovar] = useState(false)
  const [motivo, setMotivo] = useState('')

  if (!podeAprovarPedidoLista(pedido, profile)) return null

  const eu = profile!.id

  async function aprovar() {
    setLoading('aprovar')
    const { error } = await supabase
      .from('cmp_pedidos_compra')
      .update({
        status: 'aprovado',
        aprovador_id: eu,
        aprovado_em: new Date().toISOString(),
      })
      .eq('id', pedido.id)
    if (error) {
      toast.error('Erro ao aprovar pedido.')
      setLoading(null)
      return
    }
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'pedido',
      documento_id: pedido.id,
      aprovador_id: eu,
      acao: 'aprovou',
    })
    toast.success(`${pedido.numero} aprovado`)
    onAtualizado()
    setLoading(null)
  }

  async function reprovar() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo da reprovação.')
      return
    }
    setLoading('reprovar')
    const { error } = await supabase
      .from('cmp_pedidos_compra')
      .update({
        status: 'cancelado',
        cancelada_em: new Date().toISOString(),
        motivo_cancelamento: motivo.trim(),
      })
      .eq('id', pedido.id)
    if (error) {
      toast.error('Erro ao reprovar pedido.')
      setLoading(null)
      return
    }
    await supabase.from('cmp_aprovacoes').insert({
      documento_tipo: 'pedido',
      documento_id: pedido.id,
      aprovador_id: eu,
      acao: 'reprovou',
      comentario: motivo.trim(),
    })
    toast.success(`${pedido.numero} reprovado`)
    setModalReprovar(false)
    setMotivo('')
    onAtualizado()
    setLoading(null)
  }

  return (
    <>
      <span className="inline-flex" title="Aprovar pedido">
        <Button
          isDisabled={loading != null}
          onPress={aprovar}
          className={btnAprovar}
        >
          <CheckCircle2 size={12} />
          {loading === 'aprovar' ? '…' : 'Aprovar'}
        </Button>
      </span>
      <span className="inline-flex" title="Reprovar pedido">
        <Button
          isDisabled={loading != null}
          onPress={() => { setModalReprovar(true); setMotivo('') }}
          className={btnReprovar}
        >
          <XCircle size={12} /> Reprovar
        </Button>
      </span>
      {modalReprovar && (
        <MotivoModal
          titulo="Reprovar pedido"
          descricao={`Informe o motivo da reprovação de ${pedido.numero}. O pedido será cancelado.`}
          obrigatorio
          confirmLabel="Reprovar"
          confirmTone="red"
          loading={loading === 'reprovar'}
          motivo={motivo}
          onMotivoChange={setMotivo}
          onCancelar={() => { setModalReprovar(false); setMotivo('') }}
          onConfirmar={reprovar}
        />
      )}
    </>
  )
}
