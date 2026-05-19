// Extrator simples de campos da NFe brasileira a partir do XML.
//
// Usa regex porque parser XML completo é overkill aqui — o XML da NFe é
// padronizado pela SEFAZ. Não substitui validação de schema, mas é suficiente
// para popular metadados de busca.

export interface NfeMetadados {
  numero?: string
  serie?: string
  chave_acesso?: string
  cnpj_emitente?: string
  valor_total?: number
  data_emissao?: string
}

function pickTag(xml: string, tag: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`, 'i'))
  return m ? m[1].trim() : undefined
}

function pickAttr(xml: string, tag: string, attr: string): string | undefined {
  const m = xml.match(new RegExp(`<${tag}[^>]*\\s${attr}="([^"]+)"[^>]*>`, 'i'))
  return m ? m[1] : undefined
}

export function extrairNfeMetadados(xml: string): NfeMetadados {
  const md: NfeMetadados = {}

  // Chave da NF — atributo Id="NFe<chave_44_digitos>" no elemento <infNFe>
  const idAttr = pickAttr(xml, 'infNFe', 'Id')
  if (idAttr) md.chave_acesso = idAttr.replace(/^NFe/, '')

  md.numero = pickTag(xml, 'nNF')
  md.serie = pickTag(xml, 'serie')
  md.cnpj_emitente = pickTag(xml, 'CNPJ')

  const total = pickTag(xml, 'vNF')
  if (total) {
    const n = Number(total)
    if (!Number.isNaN(n)) md.valor_total = n
  }

  md.data_emissao = pickTag(xml, 'dhEmi') ?? pickTag(xml, 'dEmi')

  return md
}
