import { useEffect, useState } from 'react'
import { Download, FileText, RefreshCw, X } from 'lucide-react'
import { Button } from '@heroui/react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import type { MlNotaFiscal } from '@/types/database'
import { formatDateTime, formatMoney } from '@/pages/compras/_shared'
import { inferirTipoArquivo, isNfeXmlContent, parseNfeXml, type NfeVisual } from '@/utils/nfeParse'

type Props = {
  nf: MlNotaFiscal
  open: boolean
  onClose: () => void
}

export function NfVisualModal({ nf, open, onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [tipo, setTipo] = useState<'pdf' | 'xml' | null>(null)
  const [nfe, setNfe] = useState<NfeVisual | null>(null)
  const [xmlBruto, setXmlBruto] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      setSignedUrl(null)
      setNfe(null)
      setXmlBruto(null)
      setTipo(null)
      return
    }
    if (!nf.storage_path) {
      toast.error('Arquivo da NF indisponível')
      onClose()
      return
    }

    let cancel = false
    async function carregar() {
      setLoading(true)
      setNfe(null)
      setXmlBruto(null)
      const tipoArq = inferirTipoArquivo(nf.file_type, nf.filename)
      setTipo(tipoArq)

      const { data, error } = await supabase.storage
        .from('mercadolivre-nf')
        .createSignedUrl(nf.storage_path!, 300)

      if (cancel) return
      if (error || !data?.signedUrl) {
        setLoading(false)
        toast.error(error?.message ?? 'Não foi possível abrir o arquivo')
        onClose()
        return
      }

      setSignedUrl(data.signedUrl)

      if (tipoArq === 'xml') {
        try {
          const resp = await fetch(data.signedUrl)
          const text = await resp.text()
          if (cancel) return
          setXmlBruto(text)
          if (isNfeXmlContent(text)) {
            setNfe(parseNfeXml(text))
          }
        } catch {
          if (!cancel) toast.error('Falha ao ler o XML da NF')
        }
      }

      setLoading(false)
    }

    void carregar()
    return () => { cancel = true }
  }, [open, nf.id, nf.storage_path, nf.file_type, nf.filename, onClose])

  function baixar() {
    if (signedUrl) window.open(signedUrl, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  const titulo = nf.numero_nf
    ? `NF nº ${nf.numero_nf}${nf.serie ? ` · série ${nf.serie}` : ''}`
    : (nf.filename ?? 'Nota fiscal')

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 px-5 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FileText size={18} className="text-violet-600 shrink-0" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">{titulo}</h2>
              {nf.chave_acesso && (
                <p className="text-[10px] font-mono text-gray-500 truncate">{nf.chave_acesso}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              isDisabled={!signedUrl}
              onPress={baixar}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-2.5 py-1 text-xs font-medium inline-flex items-center gap-1"
            >
              <Download size={12} /> Baixar
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Fechar"
            >
              <X size={16} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-16">
              <RefreshCw size={24} className="animate-spin text-violet-600" />
            </div>
          ) : tipo === 'pdf' && signedUrl ? (
            <iframe
              title="Visualização PDF da NF"
              src={signedUrl}
              className="w-full h-[70vh] rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50"
            />
          ) : nfe ? (
            <ResumoNfeVisual nfe={nfe} />
          ) : xmlBruto ? (
            <div className="space-y-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Não foi possível interpretar o XML como NFe padrão. Exibindo o conteúdo bruto.
              </p>
              <pre className="max-h-[60vh] overflow-auto rounded-lg bg-gray-950 text-gray-100 p-4 text-[11px] leading-relaxed">
                {xmlBruto}
              </pre>
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">Nenhum conteúdo para exibir.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ResumoNfeVisual({ nfe }: { nfe: NfeVisual }) {
  return (
    <div className="space-y-4 text-sm">
      <div className="rounded-xl border border-violet-200/80 dark:border-violet-800/50 bg-violet-50/50 dark:bg-violet-950/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400">
              Nota fiscal eletrônica
            </p>
            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100 mt-1">
              NF-e nº {nfe.numero ?? '—'}
              {nfe.serie ? <span className="text-gray-500 font-normal"> · série {nfe.serie}</span> : null}
            </p>
            {nfe.naturezaOperacao && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{nfe.naturezaOperacao}</p>
            )}
          </div>
          <div className="text-right text-xs text-gray-600 dark:text-gray-400">
            {nfe.dataEmissao && (
              <p>Emissão: {formatDateTime(nfe.dataEmissao)}</p>
            )}
            {nfe.totais.nf != null && (
              <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1 tabular-nums">
                {formatMoney(nfe.totais.nf)}
              </p>
            )}
          </div>
        </div>
        {nfe.chaveAcesso && (
          <p className="mt-3 text-[10px] font-mono text-gray-500 break-all">
            Chave: {nfe.chaveAcesso}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ParteCard titulo="Emitente" parte={nfe.emitente} />
        <ParteCard titulo="Destinatário" parte={nfe.destinatario} />
      </div>

      {nfe.itens.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
            Itens ({nfe.itens.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">#</th>
                  <th className="px-3 py-2 text-left font-semibold">Descrição</th>
                  <th className="px-3 py-2 text-right font-semibold">Qtd</th>
                  <th className="px-3 py-2 text-right font-semibold">V. unit.</th>
                  <th className="px-3 py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {nfe.itens.map(it => (
                  <tr key={it.numero} className="bg-white dark:bg-gray-900">
                    <td className="px-3 py-2 text-gray-500">{it.numero}</td>
                    <td className="px-3 py-2 text-gray-800 dark:text-gray-200 max-w-[240px]">
                      <p className="line-clamp-2">{it.descricao ?? '—'}</p>
                      {it.codigo && (
                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{it.codigo}</p>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums whitespace-nowrap">
                      {it.quantidade ?? '—'} {it.unidade ?? ''}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {it.valorUnitario != null ? formatMoney(it.valorUnitario) : '—'}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">
                      {it.valorTotal != null ? formatMoney(it.valorTotal) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/40 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">Totais</h3>
        <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <TotalLinha label="Produtos" valor={nfe.totais.produtos} />
          <TotalLinha label="Desconto" valor={nfe.totais.desconto} />
          <TotalLinha label="Frete" valor={nfe.totais.frete} />
          <TotalLinha label="Valor NF" valor={nfe.totais.nf} destaque />
        </dl>
      </div>
    </div>
  )
}

function ParteCard({ titulo, parte }: { titulo: string; parte: { nome?: string; fantasia?: string; documento?: string; ie?: string; municipio?: string; uf?: string } }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/80 p-3">
      <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1.5">{titulo}</h3>
      <p className="font-medium text-gray-900 dark:text-gray-100">{parte.nome ?? '—'}</p>
      {parte.fantasia && parte.fantasia !== parte.nome && (
        <p className="text-xs text-gray-500 mt-0.5">{parte.fantasia}</p>
      )}
      {parte.documento && (
        <p className="text-xs font-mono text-gray-600 dark:text-gray-400 mt-1">{parte.documento}</p>
      )}
      {(parte.municipio || parte.uf) && (
        <p className="text-xs text-gray-500 mt-1">
          {[parte.municipio, parte.uf].filter(Boolean).join(' / ')}
        </p>
      )}
    </div>
  )
}

function TotalLinha({ label, valor, destaque }: { label: string; valor?: number; destaque?: boolean }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className={`tabular-nums mt-0.5 ${destaque ? 'font-semibold text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
        {valor != null ? formatMoney(valor) : '—'}
      </dd>
    </div>
  )
}
