#!/usr/bin/env node
/**
 * scripts/importar-cubano.mjs
 *
 * Le `temp/cubano.json` (lista bruta de produtos da Cubano) e produz:
 *
 *   1) supabase/migrations/013_seed_itens_cubano.sql
 *      Migration pronta com INSERTs idempotentes (NOT EXISTS por nome).
 *      Resolve categoria_id / unidade_medida_id via subselect pelo nome/codigo
 *      do seed atual em 001_schema_completo.sql.
 *
 *   2) temp/itens_processados.json
 *      Auditoria: cada item final com nome normalizado, categoria inferida,
 *      flags detectadas e a(s) descricao(oes) original(is) que o originaram.
 *
 *   3) temp/itens_descartados.json
 *      Lista de descartes (lixo / fragmento / servico) com motivo.
 *
 * Pipeline:
 *   normalizar -> filtrar lixo/servico -> chave dedup -> agrupar ->
 *   inferir categoria -> inferir unidade -> detectar movel/emprestavel ->
 *   gerar SQL.
 *
 * Sem dependencias externas (apenas built-ins do Node 18+).
 *
 * Uso:
 *   node scripts/importar-cubano.mjs
 *
 * Depois:
 *   Supabase Studio > SQL Editor > New query > colar 013_seed_itens_cubano.sql > Run
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const INPUT = join(ROOT, 'temp', 'cubano.json');
const OUT_SQL = join(ROOT, 'supabase', 'migrations', '013_seed_itens_cubano.sql');
const OUT_AUDIT = join(ROOT, 'temp', 'itens_processados.json');
const OUT_DISCARDED = join(ROOT, 'temp', 'itens_descartados.json');

// ============================================================================
// 1. Normalizacao de nomes
// ============================================================================

const HTML_ENTITIES = {
  '&quot;': '"',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
};

const PREFIXOS_LIXO = [
  /^\s*\*\*+\s*/, // **, ***
  /^\s*\(\*+\)\s*/, // (**), (***)
  /^\s*\[[A-Za-z0-9]{1,4}\]\s*/, // [SK], [XX], [PN1]
  /^\s*\(SKU\s+\d+\)\s*/i, // (SKU 019)
  /^\s*¿+\s*/,
  /^\s*\?\?+\s*/,
  /^\s*-+\s*/, // - inicial
  /^\s*\.+\s*/, // . inicial
];

function decodeHtml(s) {
  return s.replace(/&[a-z#0-9]+;/gi, (m) => HTML_ENTITIES[m.toLowerCase()] ?? m);
}

function removerPrefixos(s) {
  let prev;
  do {
    prev = s;
    for (const re of PREFIXOS_LIXO) s = s.replace(re, '');
  } while (prev !== s && s.length > 0);
  return s;
}

function removerAcentos(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Normaliza o nome para forma canonica de exibicao:
 *  - decode HTML entities
 *  - remove prefixos lixo (**, (**), [SK], (SKU NNN), ?)
 *  - colapsa espacos
 *  - remove acentos
 *  - UPPERCASE
 *  - mantem so caracteres imprimiveis ASCII + ° ² ³
 */
function normalizarNome(s) {
  let n = String(s ?? '').trim();
  n = decodeHtml(n);
  n = removerPrefixos(n);
  n = removerAcentos(n);
  n = n.toUpperCase();
  n = n.replace(/[^\x20-\x7E°²³]/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

/**
 * Chave de deduplicacao: nome normalizado com mais ajustes para
 * juntar variantes que sao o mesmo produto:
 *  - remove pontuacao no final
 *  - remove espacos ao redor de hifen e barra
 *  - normaliza fracoes "1.1/2" e "1 1/2"
 */
function chaveDedup(nome) {
  let k = nome;
  k = k.replace(/[.,;:!?]+$/g, '');
  k = k.replace(/\s*-\s*/g, '-');
  k = k.replace(/\s*\/\s*/g, '/');
  k = k.replace(/\s+/g, ' ').trim();
  return k;
}

// ============================================================================
// 2. Filtros de descarte (lixo, servicos, fragmentos)
// ============================================================================

const PADROES_SERVICO = [
  /^FORNECIMENTO E INSTALA/,
  /^INSTALACAO DE/,
  /^MAO DE OBRA/,
  /^VISITA TECNICA/,
  /^MANUTENCAO DE/,
  /^MANUTENCAO PREVENT/,
  /^REPARO /,
  /^SERVICO DE/,
  /^CONSULTORIA/,
  /^PROJETO /,
  /^ESPECIALISTAS EM/,
  /^PRESTACAO DE/,
  /^TREINAMENTO /,
  /^TRANSPORTE /,
  /^FRETE/,
  /^TAXA DE/,
  /^LOCACAO DE/,
];

function ehServico(n) {
  return PADROES_SERVICO.some((re) => re.test(n));
}

function ehFragmentoOuLixo(n) {
  if (n.length < 3) return true;
  if (!/[A-Z]/.test(n)) return true;

  const abre = (n.match(/\(/g) ?? []).length;
  const fecha = (n.match(/\)/g) ?? []).length;
  if (abre !== fecha) return true;

  if (n.length > 180) return true;

  if (/^[A-Z]{1,3}\d{2,}$/.test(n)) return true;
  if (/^[A-Z]\s+[A-Z]\s+[A-Z]\s+[A-Z]/.test(n) && n.length < 20) return true;

  return false;
}

// ============================================================================
// 3. Inferencia de categoria por palavras-chave
//
// Categorias-alvo (devem existir no seed do banco):
//   Mobiliario | Eletronicos | Material de Escritorio | Limpeza e Higiene
//   Cafe e Copa | Material de Construcao | Equipamentos Tecnicos
//
// Ordem importa: primeira regra a casar vence.
// ============================================================================

const CATEGORIAS = [
  {
    nome: 'Mobiliario',
    keywords: [
      'MESA', 'CADEIRA', 'POLTRONA', 'SOFA', 'BISTRO', 'BANCO', 'BANQUETA',
      'PRATELEIRA', 'GAVETEIRO', 'ESTANTE', 'ARMARIO', 'MOVEL', 'MOVEIS',
      'PAINEL', 'BANDEJA', 'VIDRO FIXO', 'NICHO', 'PUFF', 'COMODA',
      'GUARDA ROUPA', 'GUARDA-ROUPA', 'MESINHA', 'BANCADA', 'BIOMBO',
      'DIVISORIA', 'CRIADO MUDO', 'CABIDEIRO', 'APARADOR', 'RACK TV',
      'ESCRIVANINHA', 'BERCO',
    ],
  },
  {
    nome: 'Eletronicos',
    keywords: [
      'NOTEBOOK', 'MONITOR', 'WEBCAM', 'MOUSE', 'TECLADO', 'SWITCH',
      'ROTEADOR', 'NO-BREAK', 'NOBREAK', 'PROJETOR', 'CAMERA', 'CFTV',
      'FONE', 'SENSOR', 'CABO HDMI', 'CABO USB', 'CABO REDE', 'CABO DE REDE',
      'CABO PATCH', 'CABO UTP', 'CABO P2', 'CABO P10', 'SSD', 'HD',
      'VOLTIMETRO', 'WATTIMETRO', 'BIVOLT', 'CONVERSOR', 'CAIXA DE SOM',
      'MICROFONE', 'PEN DRIVE', 'PENDRIVE', 'MEMORIA RAM', 'PROCESSADOR',
      'PLACA MAE', 'PLACA DE VIDEO', 'IMPRESSORA', 'SCANNER', 'TONNER',
      'TONER', 'CARTUCHO', 'TELEFONE', 'RACK ', 'GRAVADOR', 'DVR',
      'NVR', 'CONTROLE REMOTO', 'CONTROLADORA', 'INVERSOR', 'FONTE ATX',
      'COOLER ', 'NOTEBOK',
    ],
  },
  {
    nome: 'Material de Escritorio',
    keywords: [
      'CANETA', 'LAPIS', 'PAPEL A4', 'PAPEL OFICIO', 'PAPEL SULFITE',
      'ETIQUETA', 'PASTA AZ', 'PASTA SUSPENSA', 'PASTA SANFONADA',
      'POST-IT', 'POST IT', 'CLIPS', 'GRAMPEADOR', 'GRAMPO ', 'AGENDA',
      'CALCULADORA', 'BORRACHA APAGADORA', 'APONTADOR', 'MARCADOR',
      'REGUA', 'CARTOLINA', 'ENVELOPE', 'CADERNO', 'BLOCO ',
      'FITA ADESIVA', 'COLA BASTAO', 'PRENDEDOR DE PAPEL', 'FURADOR',
      'TESOURA ESCOLAR', 'PINCEL ATOMICO', 'PINCEL MARCA TEXTO',
      'PLASTIFICADORA', 'PERFURADOR', 'DUREX', 'CALENDARIO', 'CARIMBO',
    ],
  },
  {
    nome: 'Limpeza e Higiene',
    keywords: [
      'DETERGENTE', 'SABAO', 'SABONETE', 'ALCOOL', 'DESINFETANTE',
      'VASSOURA', 'RODO', 'PANO', 'ESPONJA', 'PAPEL TOALHA',
      'PAPEL HIGIENICO', 'LIXEIRA', 'SACO DE LIXO', 'SACO LIXO',
      'AGUA SANITARIA', 'ESPUMA FLORAL', 'AMACIANTE', 'MULTIUSO',
      'LIMPA VIDRO', 'LUSTRA MOVEIS', 'DESENGORDURANTE', 'LIMPADOR',
      'CLORO', 'AROMATIZANTE', 'BACTERICIDA', 'INSETICIDA', 'BRALIMPIA',
      'LIMPEZA', 'TOALHA UMEDECIDA', 'LENCO UMEDECIDO', 'LUVA DE LATEX',
      'LUVA NITRILICA', 'MASCARA DESCARTAVEL', 'TOUCA DESCARTAVEL',
      'RASPADOR DE SEGURANCA', 'BALDE', 'PA DE LIXO', 'COLETOR',
      'FRAGRANCIA', 'ODORIZADOR', 'AROMATIZADOR', 'VINAGRE BRANCO',
      'NAFTALINA',
    ],
  },
  {
    nome: 'Cafe e Copa',
    keywords: [
      'CAFE', 'ACUCAR', 'ADOCANTE', 'COPO DESCARTAVEL', 'COPO ALTO',
      'XICARA', 'PRATO', 'TALHER', 'GARFO', 'COLHER', 'JARRA',
      'VINAGRE', 'LEITE', 'AGUA MINERAL', 'BISCOITO', 'BOLACHA',
      'CAFETEIRA', 'TERMOLAR', 'GARRAFA TERMICA', 'BULE', 'COADOR DE CAFE',
      'FILTRO DE CAFE', 'SUCO', 'REFRIGERANTE', 'CHOCOLATE', 'TAPETE COPA',
      'CHA ', 'GUARDANAPO', 'PALITO DE DENTE', 'CANUDO',
    ],
  },
  {
    nome: 'Equipamentos Tecnicos',
    keywords: [
      'BROCA', 'SERRA COPO', 'SERRA TICO TICO', 'ALICATE',
      'CHAVE DE FENDA', 'CHAVE ALLEN', 'CHAVE TORX', 'CHAVE COMBINADA',
      'CHAVE FIXA', 'CHAVE INGLESA', 'CHAVE PHILLIPS', 'PARAFUSADEIRA',
      'FURADEIRA', 'MARTELO', 'MARRETA', 'JOGO DE CHAVE',
      'JOGO DE FERRAMENTA', 'KIT FERRAMENTA', 'SOQUETE', 'CATRACA',
      'ESMERILHADEIRA', 'LIXADEIRA', 'PISTOLA DE PINTURA',
      'PISTOLA DE COLA', 'TRENA', 'ESQUADRO', 'PRUMO', 'NIVEL DE BOLHA',
      'ESTILETE', 'SERROTE', 'MULTIMETRO', 'PINCEL', 'ROLO DE PINTURA',
      'ABAFADOR', 'EPI', 'OCULOS DE PROTECAO', 'CAPACETE',
      'CINTO DE SEGURANCA', 'BOTA DE SEGURANCA', 'EXTENSAO ELETRICA',
      'BOMBA DE VACUO', 'COMPRESSOR', 'SOLDADOR', 'MAQUITA',
      'TRENA LASER', 'GARFO LEVANTE', 'CARRINHO PLATAFORMA',
      'CARRINHO HIDRAULICO', 'ESCADA', 'JOGO DE BROCA', 'KIT BROCA',
    ],
  },
  {
    nome: 'Material de Construcao',
    keywords: [
      'CIMENTO', 'AREIA', 'TIJOLO', 'GESSO', 'MASSA CORRIDA',
      'MASSA ACRILICA', 'TINTA', 'VERNIZ', 'LIXA', 'REJUNTE', 'VIGA',
      'VERGALHAO', 'JOELHO', 'JUNCAO', 'ABRACADEIRA', 'SIKA', 'VIAPLUS',
      'SPARLACK', 'BELLACOR', 'TUBO', 'CONEXAO', 'REGISTRO',
      'FITA VEDA ROSCA', 'VENTOKIT', 'PARAFUSO', 'CHUMBADOR', 'BUCHA',
      'DOBRADICA', 'FECHADURA', 'MANCAL', 'PONTEIRA', 'TRINCO',
      'CONTRA FECHADURA', 'SOLDA', 'COLA EPOXI', 'COLA INSTANTANEA',
      'IMPERMEABILIZANTE', 'ARGAMASSA', 'PLACA DE GESSO', 'DRYWALL',
      'PERFIL DE ALUMINIO', 'PERFIL DE FERRO', 'CHAPA', 'BARRA REDONDA',
      'BARRA QUADRADA', 'TELA SOLDADA', 'ARAME', 'PREGO', 'TARUGO',
      'CANO', 'PVC', 'CPVC', 'COTOVELO', 'LUVA DE REDUCAO',
      'TE PVC', 'FLANGE', 'NIPLE', 'CURVA PVC', 'BUCHA DE REDUCAO',
      'TORNEIRA', 'MISTURADOR', 'DUCHA', 'CHUVEIRO', 'SIFAO',
      'CAIXA SIFONADA', 'RALO', 'VASO SANITARIO', 'CAIXA DESCARGA',
      'CAIXA D AGUA', 'TUBO ESGOTO', 'TUBO SOLDAVEL', 'FILTRO DE LINHA',
      'DISJUNTOR', 'INTERRUPTOR', 'TOMADA', 'LAMPADA', 'LUMINARIA',
      'REATOR', 'SOQUETE LAMPADA', 'PLAFON', 'SPOT',
      'FITA LED', 'CABO FLEXIVEL', 'CABO PARALELO', 'CABO RIGIDO',
      'ELETRODUTO', 'CONDUITE', 'CANALETA', 'PERFILADO',
      'BORRACHA DE VEDACAO', 'SILICONE', 'ESPUMA EXPANSIVA',
      'COMPENSADO', 'MDF', 'TABUA', 'SARRAFO', 'PINUS', 'VIDRO TEMPERADO',
      'VIDRO COMUM', 'ESPELHO', 'BLOCO DE CONCRETO', 'PLACA CIMENTICIA',
      'BORRACHA EPDM',
    ],
  },
];

const CATEGORIA_DEFAULT = 'Material de Construcao';

function escaparRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inferirCategoria(nome) {
  for (const cat of CATEGORIAS) {
    for (const kw of cat.keywords) {
      const pattern = new RegExp(`\\b${escaparRegex(kw)}\\b`);
      if (pattern.test(nome)) return cat.nome;
    }
  }
  return CATEGORIA_DEFAULT;
}

// ============================================================================
// 4. Inferencia de unidade de medida
//
// Unidades-alvo (codigo no seed):
//   un | kg | g | m | m2 | m3 | l | cx | par | conjunto | dz | pct
//
// Regras conservadoras: na duvida, default = 'un'.
// ============================================================================

const UNIDADES_PADRAO = [
  { codigo: 'kg', regex: /\b\d+(?:[.,]\d+)?\s*KG\b/ },
  { codigo: 'l', regex: /\b\d+(?:[.,]\d+)?\s*L\b/ },
  { codigo: 'l', regex: /\b\d+(?:[.,]\d+)?\s*ML\b/ },
  { codigo: 'm2', regex: /\bM[2²]\b/ },
  { codigo: 'm3', regex: /\bM[3³]\b/ },
  { codigo: 'cx', regex: /\bCAIXA\b/ },
  { codigo: 'dz', regex: /\bDUZIA\b/ },
  { codigo: 'pct', regex: /\bPACOTE\b/ },
  { codigo: 'par', regex: /\bPAR\b/ },
  { codigo: 'conjunto', regex: /\bJOGO\b|\bKIT\b|\bCONJUNTO\b/ },
];

function inferirUnidadeMedida(nome) {
  for (const u of UNIDADES_PADRAO) {
    if (u.regex.test(nome)) return u.codigo;
  }
  return 'un';
}

// ============================================================================
// 5. Flags: eh_movel / eh_consumivel / permite_emprestimo
//
// Regra: eh_consumivel = !eh_movel (constraint chk_itens_consumivel_movel).
// permite_emprestimo = true para ferramentas e equipamentos compartilhaveis.
// ============================================================================

const KEYWORDS_MOVEL = [
  'MESA', 'CADEIRA', 'POLTRONA', 'SOFA', 'BANCO', 'BANQUETA',
  'PRATELEIRA', 'GAVETEIRO', 'ESTANTE', 'ARMARIO', 'BIOMBO',
  'BANCADA', 'PUFF', 'COMODA', 'PAINEL', 'NICHO', 'BISTRO',
  'DIVISORIA', 'CRIADO MUDO', 'CABIDEIRO', 'APARADOR', 'ESCRIVANINHA',
  'BERCO', 'GUARDA ROUPA', 'GUARDA-ROUPA',
];

const KEYWORDS_EMPRESTAVEL = [
  'PARAFUSADEIRA', 'FURADEIRA', 'MARTELO', 'MARRETA', 'ESMERILHADEIRA',
  'LIXADEIRA', 'SERRA COPO', 'SERRA TICO TICO', 'KIT FERRAMENTA',
  'JOGO DE CHAVE', 'JOGO DE FERRAMENTA', 'PISTOLA DE PINTURA',
  'MULTIMETRO', 'COMPRESSOR', 'BOMBA DE VACUO', 'NOTEBOOK',
  'PROJETOR', 'CAMERA', 'WEBCAM', 'TRENA LASER', 'ESCADA',
  'CARRINHO PLATAFORMA', 'CARRINHO HIDRAULICO', 'SOLDADOR', 'MAQUITA',
];

function casaPalavra(nome, kw) {
  return new RegExp(`\\b${escaparRegex(kw)}\\b`).test(nome);
}

function detectarMovel(nome) {
  return KEYWORDS_MOVEL.some((kw) => casaPalavra(nome, kw));
}

function detectarEmprestavel(nome) {
  return KEYWORDS_EMPRESTAVEL.some((kw) => casaPalavra(nome, kw));
}

// ============================================================================
// 6. Helpers SQL
// ============================================================================

function escapeSql(s) {
  return String(s ?? '').replace(/'/g, "''");
}

// ============================================================================
// 7. Pipeline principal
// ============================================================================

function main() {
  if (!existsSync(INPUT)) {
    console.error(`[erro] Arquivo nao encontrado: ${INPUT}`);
    process.exit(1);
  }

  const raw = readFileSync(INPUT, 'utf8');
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[erro] JSON invalido:', e.message);
    process.exit(1);
  }
  if (!Array.isArray(data)) {
    console.error('[erro] Esperado um array no JSON raiz');
    process.exit(1);
  }

  const descartados = [];
  const mapaDedup = new Map();
  let totalEntradas = 0;

  for (const reg of data) {
    totalEntradas++;
    const original = reg?.descricao_produto;
    const codigoOriginal = reg?.codigo_produto ?? '';
    const qtdOcorrencias = Number(reg?.qtd_ocorrencias ?? 0);

    if (!original || typeof original !== 'string') {
      descartados.push({
        codigo: codigoOriginal,
        descricao: original ?? '',
        motivo: 'descricao vazia ou invalida',
      });
      continue;
    }

    const nomeNormalizado = normalizarNome(original);

    if (ehFragmentoOuLixo(nomeNormalizado)) {
      descartados.push({
        codigo: codigoOriginal,
        descricao: original,
        normalizado: nomeNormalizado,
        motivo: 'fragmento ou lixo (muito curto, parenteses desbalanceados, descricao livre)',
      });
      continue;
    }

    if (ehServico(nomeNormalizado)) {
      descartados.push({
        codigo: codigoOriginal,
        descricao: original,
        normalizado: nomeNormalizado,
        motivo: 'servico (nao e item de catalogo)',
      });
      continue;
    }

    const chave = chaveDedup(nomeNormalizado);
    const existente = mapaDedup.get(chave);
    if (existente) {
      existente.ocorrenciasTotais += qtdOcorrencias;
      if (!existente.codigosOrigem.includes(codigoOriginal)) {
        existente.codigosOrigem.push(codigoOriginal);
      }
      existente.descricoesOriginais.add(original);
      continue;
    }

    const eh_movel = detectarMovel(nomeNormalizado);
    const eh_consumivel = !eh_movel;
    const permite_emprestimo = !eh_movel && detectarEmprestavel(nomeNormalizado);
    const dias_emprestimo = permite_emprestimo ? 7 : null;

    mapaDedup.set(chave, {
      nome: nomeNormalizado,
      descricoesOriginais: new Set([original]),
      codigosOrigem: [codigoOriginal],
      ocorrenciasTotais: qtdOcorrencias,
      categoria: inferirCategoria(nomeNormalizado),
      unidadeCodigo: inferirUnidadeMedida(nomeNormalizado),
      eh_movel,
      eh_consumivel,
      permite_emprestimo,
      dias_emprestimo,
    });
  }

  const itens = [...mapaDedup.values()].sort((a, b) => a.nome.localeCompare(b.nome));

  gerarSql(itens, totalEntradas, descartados.length);
  gerarAuditoria(itens);
  gerarDescartados(descartados);
  imprimirRelatorio(itens, totalEntradas, descartados);
}

// ============================================================================
// 8. Geracao do SQL
// ============================================================================

function gerarSql(itens, totalEntradas, totalDescartados) {
  const linhas = [];
  linhas.push(
    '-- ============================================================================',
  );
  linhas.push('-- 013_seed_itens_cubano.sql');
  linhas.push('-- SupplyGo — Seed do catalogo de itens (importacao Cubano)');
  linhas.push(
    '-- ============================================================================',
  );
  linhas.push('-- Origem:  temp/cubano.json');
  linhas.push('-- Gerador: scripts/importar-cubano.mjs  (rode antes para regerar)');
  linhas.push('--');
  linhas.push(`-- Entradas no JSON original:           ${totalEntradas}`);
  linhas.push(`-- Descartados (lixo + servico):        ${totalDescartados}`);
  linhas.push(`-- Itens unicos apos dedup/normalizacao: ${itens.length}`);
  linhas.push('--');
  linhas.push('-- Caracteristicas desta migration:');
  linhas.push('--   * Idempotente (NOT EXISTS por nome): pode rodar varias vezes');
  linhas.push('--   * Resolve categoria_id / unidade_medida_id via subselect');
  linhas.push('--   * Infere eh_movel / eh_consumivel / permite_emprestimo');
  linhas.push('--   * Default ativo = true');
  linhas.push('--');
  linhas.push('-- Como rodar:');
  linhas.push('--   1) Supabase Studio > SQL Editor > New Query');
  linhas.push('--   2) Cole este arquivo inteiro');
  linhas.push('--   3) Run');
  linhas.push(
    '-- ============================================================================',
  );
  linhas.push('');
  linhas.push('BEGIN;');
  linhas.push('');
  linhas.push('WITH novos_itens (');
  linhas.push('  nome,');
  linhas.push('  eh_movel,');
  linhas.push('  eh_consumivel,');
  linhas.push('  permite_emprestimo,');
  linhas.push('  dias_emprestimo,');
  linhas.push('  categoria_nome,');
  linhas.push('  unidade_codigo,');
  linhas.push('  descricao_origem');
  linhas.push(') AS (');
  linhas.push('  VALUES');

  const valoresLinhas = itens.map((it, idx) => {
    const ehMovel = it.eh_movel ? 'true' : 'false';
    const ehCons = it.eh_consumivel ? 'true' : 'false';
    const ehEmpr = it.permite_emprestimo ? 'true' : 'false';
    const dias = it.dias_emprestimo === null ? 'NULL::int' : `${it.dias_emprestimo}::int`;
    const codigosResumo = it.codigosOrigem.slice(0, 5).join(', ');
    const sufixoCods = it.codigosOrigem.length > 5 ? '...' : '';
    const descOrigem =
      `Origem: Cubano | Cod(s): ${codigosResumo}${sufixoCods} | Ocorr.: ${it.ocorrenciasTotais}`;
    const virgula = idx === itens.length - 1 ? '' : ',';
    return (
      `    ('${escapeSql(it.nome)}'::text, ` +
      `${ehMovel}, ${ehCons}, ${ehEmpr}, ${dias}, ` +
      `'${escapeSql(it.categoria)}'::text, ` +
      `'${it.unidadeCodigo}'::text, ` +
      `'${escapeSql(descOrigem)}'::text)${virgula}`
    );
  });

  linhas.push(...valoresLinhas);
  linhas.push(')');
  linhas.push('INSERT INTO itens (');
  linhas.push('  nome,');
  linhas.push('  descricao,');
  linhas.push('  categoria_id,');
  linhas.push('  unidade_medida_id,');
  linhas.push('  eh_movel,');
  linhas.push('  eh_consumivel,');
  linhas.push('  permite_emprestimo,');
  linhas.push('  dias_emprestimo_padrao,');
  linhas.push('  ativo');
  linhas.push(')');
  linhas.push('SELECT');
  linhas.push('  ni.nome,');
  linhas.push('  ni.descricao_origem,');
  linhas.push('  (SELECT id FROM categorias      WHERE nome   = ni.categoria_nome LIMIT 1),');
  linhas.push('  (SELECT id FROM unidades_medida WHERE codigo = ni.unidade_codigo LIMIT 1),');
  linhas.push('  ni.eh_movel,');
  linhas.push('  ni.eh_consumivel,');
  linhas.push('  ni.permite_emprestimo,');
  linhas.push('  ni.dias_emprestimo,');
  linhas.push('  true');
  linhas.push('FROM novos_itens ni');
  linhas.push('WHERE NOT EXISTS (');
  linhas.push('  SELECT 1 FROM itens i WHERE i.nome = ni.nome');
  linhas.push(');');
  linhas.push('');
  linhas.push('COMMIT;');
  linhas.push('');
  linhas.push('-- Verificacao pos-import:');
  linhas.push('-- SELECT c.nome AS categoria, COUNT(*) AS qtd');
  linhas.push('--   FROM itens i');
  linhas.push('--   LEFT JOIN categorias c ON c.id = i.categoria_id');
  linhas.push('--  GROUP BY c.nome ORDER BY qtd DESC;');
  linhas.push('');

  const dir = dirname(OUT_SQL);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT_SQL, linhas.join('\n'), 'utf8');
}

// ============================================================================
// 9. Auditoria + Descartados
// ============================================================================

function gerarAuditoria(itens) {
  const dump = itens.map((it) => ({
    nome: it.nome,
    categoria: it.categoria,
    unidade_medida: it.unidadeCodigo,
    eh_movel: it.eh_movel,
    eh_consumivel: it.eh_consumivel,
    permite_emprestimo: it.permite_emprestimo,
    dias_emprestimo_padrao: it.dias_emprestimo,
    ocorrencias_totais: it.ocorrenciasTotais,
    codigos_origem: it.codigosOrigem,
    descricoes_originais: [...it.descricoesOriginais],
  }));
  const dir = dirname(OUT_AUDIT);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT_AUDIT, JSON.stringify(dump, null, 2), 'utf8');
}

function gerarDescartados(descartados) {
  const dir = dirname(OUT_DISCARDED);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(OUT_DISCARDED, JSON.stringify(descartados, null, 2), 'utf8');
}

// ============================================================================
// 10. Relatorio em tela
// ============================================================================

function imprimirRelatorio(itens, totalEntradas, descartados) {
  const sep = '='.repeat(70);
  console.log('');
  console.log(sep);
  console.log(' Importacao Cubano -> SupplyGo');
  console.log(sep);
  console.log(` Entradas no JSON ............... ${totalEntradas}`);
  console.log(` Descartados (lixo / servico) ... ${descartados.length}`);
  console.log(` Itens unicos apos dedup ........ ${itens.length}`);
  console.log('-'.repeat(70));
  console.log(' Distribuicao por categoria:');
  const porCategoria = new Map();
  for (const it of itens) {
    porCategoria.set(it.categoria, (porCategoria.get(it.categoria) ?? 0) + 1);
  }
  const ordenado = [...porCategoria.entries()].sort((a, b) => b[1] - a[1]);
  for (const [cat, qtd] of ordenado) {
    console.log(`   ${cat.padEnd(30)} ${qtd}`);
  }
  console.log('-'.repeat(70));
  console.log(' Flags:');
  const moveis = itens.filter((i) => i.eh_movel).length;
  const consumiveis = itens.filter((i) => i.eh_consumivel).length;
  const emprestaveis = itens.filter((i) => i.permite_emprestimo).length;
  console.log(`   eh_movel ............ ${moveis}`);
  console.log(`   eh_consumivel ....... ${consumiveis}`);
  console.log(`   permite_emprestimo .. ${emprestaveis}`);
  console.log('-'.repeat(70));
  console.log(' Distribuicao por unidade de medida:');
  const porUnidade = new Map();
  for (const it of itens) {
    porUnidade.set(it.unidadeCodigo, (porUnidade.get(it.unidadeCodigo) ?? 0) + 1);
  }
  for (const [u, qtd] of [...porUnidade.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`   ${u.padEnd(10)} ${qtd}`);
  }
  console.log('-'.repeat(70));
  console.log(' Saidas geradas:');
  console.log(`   ${OUT_SQL}`);
  console.log(`   ${OUT_AUDIT}`);
  console.log(`   ${OUT_DISCARDED}`);
  console.log(sep);
  console.log(' Proximo passo:');
  console.log('   1) Inspecione temp/itens_processados.json (auditoria)');
  console.log('   2) Inspecione temp/itens_descartados.json (motivos)');
  console.log('   3) Supabase Studio > SQL Editor > cole 013_seed_itens_cubano.sql');
  console.log(sep);
  console.log('');
}

main();
