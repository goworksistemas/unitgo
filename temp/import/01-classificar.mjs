// ============================================================
// 01-classificar.mjs  — REESCRITO
// Lê o CSV legado e o transforma no modelo Produto → Variante.
//
// Pipeline interno:
//   1. parse CSV (RFC-4180)
//   2. SANEAMENTO: recupera encoding (¿ → -, entidades HTML &quot; etc),
//      colapsa espaços, normaliza pontuação
//   3. CLASSIFICAÇÃO: descarta ruído real (serviço, texto de orçamento)
//   4. EXTRAÇÃO DE ATRIBUTOS: regex ancorados, valores canonizados
//   5. NOME CANÔNICO: nome residual sem fragmentos soltos
//   6. AGRUPAMENTO: chave canônica (singular, sem abreviação, ordenada)
//   7. DEDUP de variantes idênticas + SKU global único
//
// Saídas em temp/import/saida/
// ============================================================
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = dirname(fileURLToPath(import.meta.url));
const CSV = join(DIR, '..', '1778874627568.csv');
const OUT = join(DIR, 'saida');
mkdirSync(OUT, { recursive: true });

// ============================================================
// 1. PARSER CSV  (RFC-4180: aspas + vírgulas/quebras internas)
// ============================================================
function parseCSV(text) {
  const rows = [];
  let field = '', row = [], q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// ============================================================
// 2. SANEAMENTO DE TEXTO
// ============================================================
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

// Entidades HTML que aparecem no CSV legado (origem: e-commerce).
const ENTIDADES = {
  '&quot;': '"', '&apos;': "'", '&amp;': '&', '&lt;': '<', '&gt;': '>',
  '&nbsp;': ' ', '&#39;': "'", '&#34;': '"', '&deg;': '°',
};

// Recupera o texto: o caractere ¿ no CSV é um hífen/traço corrompido na
// origem (ex.: "O¿¿¿RING" = "O-RING", "V¿RING" = "V-RING"). Não é erro
// de decode — então recuperamos em vez de descartar.
function sanear(bruto) {
  let s = bruto;
  // entidades HTML
  for (const [ent, ch] of Object.entries(ENTIDADES)) {
    s = s.replaceAll(ent, ch).replaceAll(ent.toUpperCase(), ch);
  }
  // sequências de ¿ → um único hífen
  s = s.replace(/\s*¿+\s*/g, '-');
  // aspas tipográficas → reta
  s = s.replace(/[“”″]/g, '"').replace(/[‘’′]/g, "'");
  // traços longos → hífen
  s = s.replace(/[‐-―]/g, '-');
  // colapsa espaços e apara pontuação solta nas pontas
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

// Title Case correto — sem usar \b (que quebra em acentos no JS).
// Mantém siglas curtas (até 3 letras, todas maiúsculas) em caixa alta.
const SIGLAS = new Set(['PVC', 'LED', 'PP', 'MM', 'CM', 'KG', 'PVA', 'EPI', 'AC',
  'BC', 'GMX', 'MDF', 'MDP', 'TV', 'PC', 'USB', 'RGB', 'UV', 'CPVC', '3M']);
function tituloInteligente(s) {
  return s.split(' ').map((p) => {
    if (!p) return p;
    const limpo = p.replace(/[^\p{L}\p{N}]/gu, '');
    if (limpo && SIGLAS.has(limpo.toUpperCase()) && limpo.length <= 4) {
      return p.toUpperCase();
    }
    // preserva tokens que misturam número e letra (12V, 3/4, 2,5mm)
    if (/\d/.test(p)) return p.toUpperCase();
    return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
  }).join(' ');
}

// Remove pontuação solta das pontas — exceto parênteses, tratados à parte.
const LIXO_PONTA = /^[\s\-|,.;:/\\{}\[\]"'*+&]+|[\s\-|,.;:/\\{}\[\]"'*+&]+$/g;
function balanceiaParenteses(s) {
  // Parênteses sem par (o CSV legado raramente fecha). Mantém o TEXTO,
  // só apaga o sinal órfão — varre e marca os que têm par válido.
  const chars = [...s];
  const pilha = [];
  const ok = new Set();
  chars.forEach((c, i) => {
    if (c === '(') pilha.push(i);
    else if (c === ')' && pilha.length) { ok.add(pilha.pop()); ok.add(i); }
  });
  return chars
    .filter((c, i) => (c !== '(' && c !== ')') || ok.has(i))
    .join('');
}

function limpaNome(s) {
  // 1. remove trechos entre parênteses — no CSV legado são sempre notas
  //    (embalagem, marca, observação), nunca identidade do produto.
  let n = s.replace(/\([^()]*\)/g, ' ');
  // 2. apaga qualquer parêntese órfão que tenha sobrado
  n = balanceiaParenteses(n).replace(/[()]/g, ' ');
  n = n.replace(LIXO_PONTA, '').replace(/\s+/g, ' ').trim();
  // descarta palavra-fragmento isolada no fim ("Cabo Flex Vd", "... Cor")
  const FRAG_FIM = /\b(cor|tam|ref|de|da|do|com|sem|para|p|c|s|x|vd|vm|az|pr|md|un)$/i;
  let mudou = true;
  while (mudou && n.includes(' ')) {
    mudou = false;
    if (FRAG_FIM.test(n)) { n = n.replace(/\s+\S+$/, '').trim(); mudou = true; }
  }
  return n;
}

// ============================================================
// 3. CLASSIFICAÇÃO DE RUÍDO
//   - serviço / mão de obra / texto de orçamento → descarta
//   - texto longo NÃO é mais descartado: produtos reais têm nome longo.
//     Em vez disso, o nome é truncado/limpo na etapa de nome canônico.
// ============================================================
function classificaRuido(desc) {
  const d = semAcento(desc).toUpperCase();
  if (/^\s*\(?\s*(FORNECIMENTO E INSTALAC|FORNECIMENTO DA |FORNECIMENTO DAS |FORNECIMENTO DE (MAO|GAS|CHAPA|DUTOS|INFRA|HELICE|COROA|CAIXA|CHAPAS))/.test(d))
    return 'servico';
  if (/^\s*\(?\s*(INSTALAC|REALOCAC|EXECUC|CONFECC|DESINSTALAC|RELOCAC|MANUTENC|APLICACAO DE)/.test(d))
    return 'servico';
  if (/\b(MAO DE OBRA|PRESTACAO DE SERVIC|SERVICO DE|LOCACAO DE)\b/.test(d))
    return 'servico';
  if (/\b(ELABORACAO DE LAUDO|LAUDO TECNICO|CONFORME PROPOSTA|ATENDIMENTO POR AGENDAMENTO|TREINAMENTO PARA|ANALISE DO AMBIENTE)\b/.test(d))
    return 'servico';
  if (/LEMBRANDO QUE|NECESSARI[AO]S? PARA OS|\bVAMOS\b|FORAM FEITOS/.test(d))
    return 'texto-orcamento';
  if (desc.replace(/[^A-Za-z0-9]/g, '').length < 3)
    return 'curto-demais';
  return null;
}

// ============================================================
// 4. EXTRAÇÃO DE ATRIBUTOS
// Cada regra remove seu trecho da descrição e devolve o atributo.
// Regex ancorados para evitar falsos positivos (ex.: "A" de Corrente).
// ============================================================
const CORES = {
  preto: 'Preto', preta: 'Preto', branco: 'Branco', branca: 'Branco',
  transparente: 'Transparente', incolor: 'Incolor', azul: 'Azul',
  vermelho: 'Vermelho', vermelha: 'Vermelho', amarelo: 'Amarelo',
  amarela: 'Amarelo', verde: 'Verde', cinza: 'Cinza', marrom: 'Marrom',
  bege: 'Bege', rosa: 'Rosa', laranja: 'Laranja', prata: 'Prata',
  prateado: 'Prata', prateada: 'Prata', dourado: 'Dourado', dourada: 'Dourado',
  fume: 'Fumê', natural: 'Natural', grafite: 'Grafite', champagne: 'Champagne',
  cromado: 'Cromado', cromada: 'Cromado', niquel: 'Níquel', roxo: 'Roxo',
  roxa: 'Roxo', lilas: 'Lilás', creme: 'Creme', areia: 'Areia', gelo: 'Gelo',
};

// normaliza um número textual: remove zeros à esquerda, vírgula → ponto
const normNum = (n) => {
  const v = n.replace(',', '.').replace(/^0+(?=\d)/, '');
  return v.startsWith('.') ? '0' + v : v;
};

function extraiAtributos(descSaneada) {
  let s = ' ' + descSaneada + ' ';
  const attrs = {};
  const cap = (nome, valor) => { if (!attrs[nome]) attrs[nome] = valor; };

  // Ignora R-410A / R410A / R-22 etc — código de gás refrigerante,
  // não é Corrente nem Capacidade. Remove antes de tudo.
  s = s.replace(/\bR-?\d{2,4}[A-Z]?\b/gi, ' ');

  // --- Dimensão PRIMEIRO: consome AxBxC e número+unidade de comprimento
  // antes que outras regras peguem pedaços e deixem números órfãos. ---
  s = s.replace(/\b\d+(?:[.,]\d+)?(?:\s*[xX]\s*\d+(?:[.,]\d+)?)+\s*(?:mm|cm|m|pol|polegadas?|")?\b/i,
    (m) => { cap('Dimensão', m.replace(/\s+/g, '').toUpperCase()); return ' '; });
  s = s.replace(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|polegadas?|pol)\b/i,
    (m) => { cap('Dimensão', m.replace(/\s+/g, '').toUpperCase()); return ' '; });
  // fração de polegada, com parte inteira opcional: 3/4, 1.1/2, 1 1/4
  s = s.replace(/\b(\d+\s*[.\s])?\s*\d+\/\d+\s*"?/,
    (m) => { cap('Dimensão', m.replace(/\s+/g, '').replace('"', '')); return ' '; });

  // --- Tensão: bivolt, ou número seguido de V/VOLTS isolado ---
  s = s.replace(/\b(bivolt|110\s*\/\s*220|220\s*\/\s*110)\b/i, () => {
    cap('Tensão', 'Bivolt'); return ' ';
  });
  s = s.replace(/\b(\d{2,3})\s*V(?:olts?)?(?=[\s,;)\/]|$)/i, (m, n) => {
    cap('Tensão', normNum(n) + 'V'); return ' ';
  });

  // --- Potência: número + W, exige espaço/borda depois ---
  s = s.replace(/\b(\d{1,5})\s*W(?:atts?)?(?=[\s,;)\/]|$)/i, (m, n) => {
    cap('Potência', normNum(n) + 'W'); return ' ';
  });

  // --- Corrente: número + A, só se houver outra pista elétrica
  // (Tensão/Potência já capturada) — evita capturar "A" genérico. ---
  s = s.replace(/\b(\d{1,3}(?:[.,]\d+)?)\s*A(?:mp(?:eres?)?)?(?=[\s,;)\/]|$)/i,
    (m, n) => {
      if (!attrs['Tensão'] && !attrs['Potência']) return m; // não é corrente
      cap('Corrente', normNum(n) + 'A'); return ' ';
    });

  // --- Capacidade / Volume: número + unidade física.
  // "M" sozinho (metro) é ambíguo demais — só conta com decimal explícito. ---
  s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(ML|L|KG|TB|GB|GR|GRAMAS?|G)\b/i,
    (m, n, u) => {
      const un = u.toUpperCase().replace(/^GRAMAS?$|^GR$/, 'G');
      cap('Capacidade', normNum(n) + un); return ' ';
    });

  // --- Cor: palavra inteira do dicionário ---
  const reCor = new RegExp('\\b(' + Object.keys(CORES).join('|') + ')\\b', 'i');
  const mc = s.match(reCor);
  if (mc) {
    cap('Cor', CORES[semAcento(mc[1]).toLowerCase()]);
    s = s.replace(reCor, ' ');
  }

  return { atributos: attrs, nomeResidual: s.replace(/\s+/g, ' ').trim() };
}

// ============================================================
// 5. AGRUPAMENTO — chave canônica
// Normaliza o nome residual para que variações tipográficas do MESMO
// produto colidam na mesma chave:
//   - sem acento, maiúsculas
//   - abreviações expandidas (FLEX→FLEXIVEL, VD→VERDE…)
//   - singular (remove S final de palavras > 3 letras)
//   - ordena as palavras (ordem não importa: "Cabo Flex" = "Flex Cabo")
// ============================================================
const ABREVIACOES = {
  FLEX: 'FLEXIVEL', FLEXIVEL: 'FLEXIVEL',
  VD: 'VERDE', VM: 'VERMELHO', AZ: 'AZUL', PR: 'PRETO', AM: 'AMARELO',
  ALUM: 'ALUMINIO', INOX: 'INOX',
  ELET: 'ELETRICO', ELETR: 'ELETRICO',
  HIDR: 'HIDRAULICO', GALV: 'GALVANIZADO', CROM: 'CROMADO',
  REG: 'REGISTRO', CONEX: 'CONEXAO', PARAF: 'PARAFUSO',
};
// palavras irrelevantes para identidade do produto
const STOPWORDS = new Set(['DE', 'DA', 'DO', 'DAS', 'DOS', 'E', 'COM', 'SEM',
  'PARA', 'P', 'C', 'S', 'EM', 'O', 'A', 'NO', 'NA']);

function singular(palavra) {
  if (palavra.length > 3 && palavra.endsWith('S')) return palavra.slice(0, -1);
  return palavra;
}

function chaveAgrupamento(nome) {
  const tokens = semAcento(nome).toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ABREVIACOES[t] || t)
    .filter((t) => !STOPWORDS.has(t))
    .map(singular);
  return [...new Set(tokens)].sort().join(' ');
}

// ============================================================
// PROCESSAMENTO
// ============================================================
const linhas = parseCSV(readFileSync(CSV, 'utf8'));
linhas.shift(); // header

const descartados = [];
const variantes = [];

for (const [codigo, descricaoBruta, qtd] of linhas) {
  if (!codigo) continue;
  const descSaneada = sanear((descricaoBruta || '').trim());
  if (!descSaneada) continue;

  const motivo = classificaRuido(descSaneada);
  if (motivo) {
    descartados.push({ codigo, descricao: descSaneada, motivo });
    continue;
  }

  const { atributos, nomeResidual } = extraiAtributos(descSaneada);
  const nomeLimpo = limpaNome(nomeResidual) || limpaNome(descSaneada);

  variantes.push({
    codigo,
    descOriginal: descSaneada,
    qtd: Number(qtd) || 0,
    nome: tituloInteligente(nomeLimpo),
    atributos,
  });
}

// ---------- agrupamento em produtos ----------
const grupos = new Map();
for (const v of variantes) {
  const chave = chaveAgrupamento(v.nome);
  if (!chave) continue;
  if (!grupos.has(chave)) grupos.set(chave, { nome: v.nome, variantes: [] });
  grupos.get(chave).variantes.push(v);
}

// nome do produto = o nome mais curto e limpo do grupo (mais genérico)
for (const p of grupos.values()) {
  p.nome = p.variantes
    .map((v) => v.nome)
    .sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

const produtos = [...grupos.values()]
  .sort((a, b) => b.variantes.length - a.variantes.length);

// ---------- DEDUP de variantes idênticas ----------
// Dentro de cada produto, variantes com os mesmos atributos são a mesma
// coisa. Mantém a de maior qtd (desempate: menor código). Soma o histórico.
const duplicados = [];
for (const p of produtos) {
  const porAssinatura = new Map();
  for (const v of p.variantes) {
    const assinatura = JSON.stringify(Object.entries(v.atributos).sort());
    if (!porAssinatura.has(assinatura)) porAssinatura.set(assinatura, []);
    porAssinatura.get(assinatura).push(v);
  }
  const unicas = [];
  for (const grupo of porAssinatura.values()) {
    grupo.sort((a, b) => b.qtd - a.qtd || a.codigo.localeCompare(b.codigo));
    const [mantida, ...repetidas] = grupo;
    if (repetidas.length) {
      mantida.codigosUnificados = repetidas.map((r) => r.codigo);
      mantida.qtd += repetidas.reduce((s, r) => s + r.qtd, 0);
      for (const r of repetidas) {
        duplicados.push({ produto: p.nome, mantido: mantida.codigo,
          removido: r.codigo, desc: r.descOriginal });
      }
    }
    unicas.push(mantida);
  }
  p.variantes = unicas;
}

// ---------- SKU globalmente único ----------
const skusVistos = new Map();
let skusAjustados = 0;
for (const p of produtos) {
  for (const v of p.variantes) {
    if (skusVistos.has(v.codigo)) {
      const n = skusVistos.get(v.codigo) + 1;
      skusVistos.set(v.codigo, n);
      v.sku = `${v.codigo}-${n}`;
      skusAjustados++;
    } else {
      skusVistos.set(v.codigo, 1);
      v.sku = v.codigo;
    }
  }
}

// ============================================================
// SAÍDAS
// ============================================================
writeFileSync(join(OUT, 'produtos-normalizados.json'),
  JSON.stringify(produtos, null, 2), 'utf8');

const csvEsc = (s) => `"${String(s).replace(/"/g, '""')}"`;

writeFileSync(join(OUT, 'descartados.csv'),
  ['codigo,descricao,motivo']
    .concat(descartados.map((d) =>
      `${d.codigo},${csvEsc(d.descricao)},${d.motivo}`))
    .join('\n'), 'utf8');

writeFileSync(join(OUT, 'duplicados-unificados.csv'),
  ['codigo_removido,codigo_mantido,produto,descricao']
    .concat(duplicados.map((d) =>
      `${d.removido},${d.mantido},${csvEsc(d.produto)},${csvEsc(d.desc)}`))
    .join('\n'), 'utf8');

// ---------- relatório ----------
const comVar = produtos.filter((p) => p.variantes.length > 1);
const motivos = {};
for (const d of descartados) motivos[d.motivo] = (motivos[d.motivo] || 0) + 1;
const atribCount = {};
for (const v of variantes) {
  for (const a of Object.keys(v.atributos)) {
    atribCount[a] = (atribCount[a] || 0) + 1;
  }
}
const totalVariantes = produtos.reduce((s, p) => s + p.variantes.length, 0);

const rel = [];
rel.push('# Relatório de classificação\n');
rel.push(`- Linhas no CSV: **${linhas.length}**`);
rel.push(`- Descartadas (ruído): **${descartados.length}**`);
for (const [m, n] of Object.entries(motivos)) rel.push(`  - ${m}: ${n}`);
rel.push(`- Variantes válidas: **${variantes.length}**`);
rel.push(`- Produtos distintos: **${produtos.length}**`);
rel.push(`- Produtos com >1 variante (agrupamento real): **${comVar.length}**`);
rel.push(`- Variantes duplicadas unificadas: **${duplicados.length}**`);
rel.push(`- **Variantes efetivas: ${totalVariantes}**`);
rel.push(`- SKUs com sufixo (código legado reaproveitado): **${skusAjustados}**`);
rel.push('\n## Atributos extraídos');
for (const [a, n] of Object.entries(atribCount).sort((x, y) => y[1] - x[1])) {
  rel.push(`- ${a}: ${n} variantes`);
}
rel.push('\n## Top 30 produtos por nº de variantes');
for (const p of produtos.slice(0, 30)) {
  rel.push(`\n### ${p.nome}  (${p.variantes.length} variantes)`);
  for (const v of p.variantes.slice(0, 8)) {
    const at = Object.entries(v.atributos)
      .map(([k, x]) => `${k}=${x}`).join(', ') || '—';
    rel.push(`- \`${v.codigo}\` ${v.descOriginal}  →  [${at}]`);
  }
  if (p.variantes.length > 8) rel.push(`- … +${p.variantes.length - 8}`);
}
writeFileSync(join(OUT, 'relatorio.md'), rel.join('\n'), 'utf8');

console.log('OK. Veja temp/import/saida/relatorio.md');
console.log(`CSV ${linhas.length} | descartados ${descartados.length} | `
  + `variantes ${variantes.length} | produtos ${produtos.length} | `
  + `agrupados ${comVar.length} | dedup ${duplicados.length}`);
