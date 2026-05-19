/** Interpretação legível de XML de NFe (layout SEFAZ 3.x/4.x) para exibição na UI. */

export type NfeParte = {
  nome?: string
  fantasia?: string
  documento?: string
  ie?: string
  municipio?: string
  uf?: string
}

export type NfeItemLinha = {
  numero: number
  codigo?: string
  descricao?: string
  ncm?: string
  unidade?: string
  quantidade?: string
  valorUnitario?: number
  valorTotal?: number
}

export type NfeVisual = {
  numero?: string
  serie?: string
  chaveAcesso?: string
  dataEmissao?: string
  naturezaOperacao?: string
  emitente: NfeParte
  destinatario: NfeParte
  itens: NfeItemLinha[]
  totais: {
    produtos?: number
    desconto?: number
    frete?: number
    nf?: number
  }
}

function pickTag(block: string, tag: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
  return m ? m[1].trim() : undefined
}

function pickAttr(block: string, tag: string, attr: string): string | undefined {
  const m = block.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"`, 'i'))
  return m?.[1]
}

function blockXml(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'))
  return m?.[1]
}

function parseNumero(s?: string): number | undefined {
  if (!s) return undefined
  const n = Number(s.replace(',', '.'))
  return Number.isFinite(n) ? n : undefined
}

function formatDoc(cnpj?: string, cpf?: string): string | undefined {
  const raw = (cnpj ?? cpf ?? '').replace(/\D/g, '')
  if (raw.length === 14) {
    return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
  }
  if (raw.length === 11) {
    return raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4')
  }
  return cnpj ?? cpf
}

function parseParte(bloco: string | undefined): NfeParte {
  if (!bloco) return {}
  const ender = blockXml(bloco, 'enderEmit') ?? blockXml(bloco, 'enderDest')
  return {
    nome: pickTag(bloco, 'xNome'),
    fantasia: pickTag(bloco, 'xFant'),
    documento: formatDoc(pickTag(bloco, 'CNPJ'), pickTag(bloco, 'CPF')),
    ie: pickTag(bloco, 'IE'),
    municipio: ender ? pickTag(ender, 'xMun') : undefined,
    uf: ender ? pickTag(ender, 'UF') : undefined,
  }
}

function parseItens(xml: string): NfeItemLinha[] {
  const itens: NfeItemLinha[] = []
  const re = /<det[\s>][\s\S]*?<\/det>/gi
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = re.exec(xml))) {
    idx++
    const b = m[0]
    const prod = blockXml(b, 'prod') ?? b
    itens.push({
      numero: Number(pickAttr(b, 'det', 'nItem')) || idx,
      codigo: pickTag(prod, 'cProd'),
      descricao: pickTag(prod, 'xProd'),
      ncm: pickTag(prod, 'NCM'),
      unidade: pickTag(prod, 'uCom'),
      quantidade: pickTag(prod, 'qCom'),
      valorUnitario: parseNumero(pickTag(prod, 'vUnCom')),
      valorTotal: parseNumero(pickTag(prod, 'vProd')),
    })
  }
  return itens
}

export function parseNfeXml(xml: string): NfeVisual {
  const inf = blockXml(xml, 'infNFe') ?? xml
  const ide = blockXml(inf, 'ide')
  const emit = blockXml(inf, 'emit')
  const dest = blockXml(inf, 'dest')
  const totalBloco = blockXml(inf, 'total')
  const icms = totalBloco ? blockXml(totalBloco, 'ICMSTot') : undefined

  const idAttr = pickAttr(inf, 'infNFe', 'Id')

  return {
    numero: pickTag(ide ?? inf, 'nNF'),
    serie: pickTag(ide ?? inf, 'serie'),
    chaveAcesso: idAttr?.replace(/^NFe/i, ''),
    dataEmissao: pickTag(ide ?? inf, 'dhEmi') ?? pickTag(ide ?? inf, 'dEmi'),
    naturezaOperacao: pickTag(ide ?? inf, 'natOp'),
    emitente: parseParte(emit),
    destinatario: parseParte(dest),
    itens: parseItens(xml),
    totais: {
      produtos: parseNumero(pickTag(icms ?? '', 'vProd')),
      desconto: parseNumero(pickTag(icms ?? '', 'vDesc')),
      frete: parseNumero(pickTag(icms ?? '', 'vFrete')),
      nf: parseNumero(pickTag(icms ?? '', 'vNF')),
    },
  }
}

export function isNfeXmlContent(text: string): boolean {
  return /<nfeProc|<NFe|<infNFe/i.test(text)
}

export function inferirTipoArquivo(
  fileType: string | null | undefined,
  filename: string | null | undefined,
): 'pdf' | 'xml' | null {
  const ft = (fileType ?? '').toLowerCase()
  if (ft.includes('pdf')) return 'pdf'
  if (ft.includes('xml')) return 'xml'
  const fn = (filename ?? '').toLowerCase()
  if (fn.endsWith('.pdf')) return 'pdf'
  if (fn.endsWith('.xml')) return 'xml'
  return null
}
