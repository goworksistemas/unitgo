// Normaliza a lista bruta de produtos do GoEvo usando IA (Claude).
//
// Entrada:
//   temp/catalogo-ia/saida/produtos-goevo.csv
// Saida:
//   temp/catalogo-ia/saida/produtos-normalizados.json
//   temp/catalogo-ia/saida/produtos-normalizados.checkpoint.json
//
// O objetivo e agrupar produtos semelhantes em um produto canonico
// (template) e transformar cada item original em uma variante desse
// produto, extraindo atributos quando possivel.
//
// Estrategia (evita duplicatas globais):
//   - Processa em batches de N=20 produtos
//   - Mantem um "catalogo canonico" em memoria (id, nome, marca, categoria,
//     atributos descobertos)
//   - A cada batch, envia o catalogo canonico atual + os 20 itens novos para
//     o Claude
//   - O Claude decide, para cada item: existe um produto canonico que casa?
//     Se sim, devolve o id; se nao, propoe um novo
//   - Salva checkpoint a cada batch (resilient a falhas)

import { Anthropic } from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('[erro] ANTHROPIC_API_KEY ausente. Configure em .env (raiz do projeto).');
  process.exit(1);
}

const SAIDA = path.resolve(__dirname, 'saida');
const ENTRADA = path.join(SAIDA, 'produtos-goevo.csv');
const SAIDA_FINAL = path.join(SAIDA, 'produtos-normalizados.json');
const CHECKPOINT = path.join(SAIDA, 'produtos-normalizados.checkpoint.json');

const TAMANHO_BATCH = Number(process.env.IA_BATCH_SIZE || 20);
const MODELO = process.env.IA_MODELO || 'claude-sonnet-4-5';
const LIMITE = process.env.IA_LIMITE ? Number(process.env.IA_LIMITE) : null;
// Quantos produtos canonicos enviamos no contexto a cada batch (cap pra
// nao explodir token). Se ultrapassar, envia os mais recentes + relevantes
// por palavra-chave do batch atual.
const MAX_CANONICOS_NO_CONTEXTO = Number(process.env.IA_MAX_CANONICOS_CTX || 200);

const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// -------------------------------------------------------------------
// Parse do CSV (formato gerado pelo 0-extrair-goevo.mjs):
//   "Codigo";"Descricao";"Unid.";"Tipo.";"Grupo";"Imagens";"Integ. Omie"
// -------------------------------------------------------------------
function lerCsv(caminho) {
  const raw = fs.readFileSync(caminho, 'utf8').replace(/^\ufeff/, '');
  const linhas = raw.split(/\r?\n/).filter(Boolean);
  if (linhas.length < 2) throw new Error('CSV vazio');
  const cab = parseLinhaCsv(linhas[0]);
  const itens = [];
  for (let i = 1; i < linhas.length; i++) {
    const cols = parseLinhaCsv(linhas[i]);
    if (cols.length < 5) continue;
    const obj = {};
    for (let j = 0; j < cab.length; j++) obj[cab[j]] = cols[j] ?? '';
    itens.push({
      codigo: obj['Código'] || obj['Codigo'] || '',
      descricao: obj['Descrição'] || obj['Descricao'] || '',
      unidade: (obj['Unid.'] || '').trim(),
      tipo: obj['Tipo.'] || '',
      grupo: obj['Grupo'] || '',
    });
  }
  return itens;
}

function parseLinhaCsv(linha) {
  const out = [];
  let buf = '';
  let i = 0;
  let aspas = false;
  while (i < linha.length) {
    const c = linha[i];
    if (aspas) {
      if (c === '"') {
        if (linha[i + 1] === '"') { buf += '"'; i += 2; continue; }
        aspas = false; i++; continue;
      }
      buf += c; i++;
    } else {
      if (c === '"') { aspas = true; i++; continue; }
      if (c === ';') { out.push(buf); buf = ''; i++; continue; }
      buf += c; i++;
    }
  }
  out.push(buf);
  return out;
}

// -------------------------------------------------------------------
// Catalogo canonico em memoria
// -------------------------------------------------------------------
function novoCatalogo() {
  return {
    produtos: new Map(), // id -> { id, nome, marca, categoria, atributos: { nome -> Set(valores) }, variantes: [] }
    proximoId: 1,
  };
}

function selecionarCanonicosParaContexto(catalogo, batch) {
  const todos = [...catalogo.produtos.values()];
  if (todos.length <= MAX_CANONICOS_NO_CONTEXTO) return todos;
  // Score por presenca de palavras do batch nos nomes canonicos
  const palavras = new Set();
  for (const it of batch) {
    for (const w of (it.descricao || '').toLowerCase().split(/[^a-z0-9çáéíóúâêôãõ]+/i)) {
      if (w && w.length >= 3) palavras.add(w);
    }
  }
  const com = todos.map((p) => {
    const nome = (p.nome || '').toLowerCase();
    let score = 0;
    for (const w of palavras) if (nome.includes(w)) score++;
    return { p, score };
  });
  com.sort((a, b) => b.score - a.score);
  const topN = com.slice(0, MAX_CANONICOS_NO_CONTEXTO).map((x) => x.p);
  return topN;
}

function compactarCanonicosParaPrompt(produtos) {
  // Estrutura mais compacta possivel pra economizar tokens
  return produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    marca: p.marca || null,
    categoria: p.categoria || null,
    atributos: Object.fromEntries(
      Object.entries(p.atributos).map(([k, set]) => [k, [...set]]),
    ),
  }));
}

// -------------------------------------------------------------------
// Prompt
// -------------------------------------------------------------------
const SYSTEM_PROMPT = `Voce e um especialista em catalogo de materiais de construcao, escritorio e MRO.
Seu trabalho: normalizar uma lista bruta de produtos importada de um ERP, agrupando itens equivalentes em um "produto canonico" (template) e tratando as diferencas como variantes.

Regras de normalizacao:
1. Produto canonico = familia generica que faz sentido como SKU "pai". Ex.: "Tubo PVC Soldavel Tigre" e o produto canonico; "60 mm 3 m", "75 mm 6 m" sao variantes.
2. Variante = item especifico com atributos concretos (cor, dimensao, voltagem, capacidade, etc.).
3. NAO suponha equivalencias arriscadas. Se nao tem certeza que dois itens sao a mesma familia, crie produtos canonicos separados.
4. Marcas (Tigre, Tramontina, 3M, etc.) FAZEM PARTE do produto canonico. "Tubo PVC Tigre" != "Tubo PVC Amanco".
5. Use nomes de produto canonico em portugues, capitalizacao titulo (ex.: "Lampada LED Filamento G45").
6. Atributos comuns: Cor, Tamanho, Comprimento, Diametro, Voltagem, Potencia, Capacidade, Material, Modelo, Espessura, Acabamento. Use o que fizer sentido para a categoria.
7. Se o item ja casa com um produto canonico EXISTENTE no contexto, devolva produto_canonico_id_existente. Senao, deixe esse campo null e proponha produto_canonico_novo.
8. NUNCA invente: se a descricao e generica ou imprecisa, crie um produto canonico unico para ela e nao tente forcar agrupamento.
9. nome_variante: descricao curta e diferenciadora dos atributos da variante. Se for produto unico sem atributos relevantes, use "Padrao".

Saida: APENAS um JSON valido, sem texto antes ou depois, no formato exato:
{
  "itens": [
    {
      "codigo_origem": "000002",
      "produto_canonico_id_existente": "p17"  // ou null se for novo
      ,
      "produto_canonico_novo": null  // ou objeto { "nome": "...", "marca": "...|null", "categoria": "..." } se for novo
      ,
      "atributos": [ { "nome": "Cor", "valor": "Branco" }, { "nome": "Comprimento", "valor": "2,40 m" } ],
      "nome_variante": "Branco 2,40 m",
      "unidade_canonica": "PC"
    }
  ]
}

Sobre unidade_canonica: mantenha a unidade exata vinda do ERP (PC, M2, UN, BR, KG, M, etc). Apenas normalize obvio: "MT" -> "M", "PA"/"PR" -> "PR", "PÇ"/"PE" -> "PC".`;

function montarUserPrompt(canonicosCtx, batch) {
  return [
    'CATALOGO CANONICO ATUAL (produtos ja criados nesta execucao). Use os ids para referenciar quando aplicavel:',
    '```json',
    JSON.stringify(compactarCanonicosParaPrompt(canonicosCtx), null, 0),
    '```',
    '',
    'NOVO BATCH DE ITENS DO ERP. Para cada item, decida se casa com um canonico existente ou cria um novo.',
    '```json',
    JSON.stringify(batch.map((it) => ({
      codigo_origem: it.codigo,
      descricao_original: it.descricao,
      unidade_origem: it.unidade,
      grupo_origem: it.grupo || null,
    })), null, 0),
    '```',
    '',
    'Devolva o JSON conforme o schema, com EXATAMENTE um item de saida por item de entrada e na MESMA ORDEM.',
  ].join('\n');
}

// -------------------------------------------------------------------
// Chamada Claude com retry
// -------------------------------------------------------------------
async function chamarClaude(client, canonicosCtx, batch) {
  const userPrompt = montarUserPrompt(canonicosCtx, batch);
  let ultimoErro = null;
  for (let tentativa = 1; tentativa <= 4; tentativa++) {
    try {
      const resposta = await client.messages.create({
        model: MODELO,
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
      const txt = resposta.content
        .map((c) => (c.type === 'text' ? c.text : ''))
        .join('\n')
        .trim();
      const json = extrairJson(txt);
      if (!json || !Array.isArray(json.itens)) {
        throw new Error('Resposta sem campo "itens": ' + txt.slice(0, 300));
      }
      if (json.itens.length !== batch.length) {
        throw new Error(`Tamanho da resposta ${json.itens.length} != batch ${batch.length}.`);
      }
      return { json, usage: resposta.usage };
    } catch (e) {
      ultimoErro = e;
      log(`tentativa ${tentativa} falhou: ${e.message}`);
      if (tentativa < 4) await sleep(1500 * tentativa);
    }
  }
  throw ultimoErro;
}

function extrairJson(txt) {
  // tenta achar o primeiro objeto JSON balanceado
  let inicio = txt.indexOf('{');
  if (inicio < 0) return null;
  let nivel = 0;
  let aspas = false;
  let escape = false;
  for (let i = inicio; i < txt.length; i++) {
    const c = txt[i];
    if (aspas) {
      if (escape) { escape = false; continue; }
      if (c === '\\') { escape = true; continue; }
      if (c === '"') aspas = false;
      continue;
    } else {
      if (c === '"') aspas = true;
      else if (c === '{') nivel++;
      else if (c === '}') {
        nivel--;
        if (nivel === 0) {
          const trecho = txt.slice(inicio, i + 1);
          try { return JSON.parse(trecho); } catch { return null; }
        }
      }
    }
  }
  return null;
}

// -------------------------------------------------------------------
// Aplica resposta da IA no catalogo canonico
// -------------------------------------------------------------------
function aplicarResposta(catalogo, batch, respostaItens) {
  const variantes = [];
  for (let i = 0; i < batch.length; i++) {
    const item = batch[i];
    const res = respostaItens[i] || {};
    let canonicoId = res.produto_canonico_id_existente || null;
    if (!canonicoId || !catalogo.produtos.has(canonicoId)) {
      canonicoId = null;
    }
    if (!canonicoId) {
      const novo = res.produto_canonico_novo || {
        nome: item.descricao,
        marca: null,
        categoria: null,
      };
      canonicoId = `p${catalogo.proximoId++}`;
      catalogo.produtos.set(canonicoId, {
        id: canonicoId,
        nome: (novo.nome || item.descricao).trim(),
        marca: novo.marca || null,
        categoria: novo.categoria || null,
        atributos: {}, // nome -> Set(valores)
      });
    }

    const canonico = catalogo.produtos.get(canonicoId);
    const atribsLimpos = [];
    for (const a of (res.atributos || [])) {
      if (!a || !a.nome || !a.valor) continue;
      const nome = String(a.nome).trim();
      const valor = String(a.valor).trim();
      if (!nome || !valor) continue;
      atribsLimpos.push({ nome, valor });
      if (!canonico.atributos[nome]) canonico.atributos[nome] = new Set();
      canonico.atributos[nome].add(valor);
    }

    variantes.push({
      codigo_origem: `goevo:${item.codigo}`,
      produto_canonico_id: canonicoId,
      descricao_original: item.descricao,
      unidade_origem: item.unidade,
      grupo_origem: item.grupo || null,
      nome_variante: (res.nome_variante || '').trim() || null,
      unidade_canonica: (res.unidade_canonica || item.unidade || '').trim() || null,
      atributos: atribsLimpos,
    });
  }
  return variantes;
}

// -------------------------------------------------------------------
// Persistencia
// -------------------------------------------------------------------
function snapshotCatalogo(catalogo) {
  return {
    produtos: [...catalogo.produtos.values()].map((p) => ({
      id: p.id,
      nome: p.nome,
      marca: p.marca,
      categoria: p.categoria,
      atributos: Object.fromEntries(
        Object.entries(p.atributos).map(([k, set]) => [k, [...set]]),
      ),
    })),
    proximoId: catalogo.proximoId,
  };
}

function carregarCheckpoint() {
  if (!fs.existsSync(CHECKPOINT)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(CHECKPOINT, 'utf8'));
    const catalogo = novoCatalogo();
    for (const p of data.catalogo.produtos) {
      catalogo.produtos.set(p.id, {
        id: p.id,
        nome: p.nome,
        marca: p.marca,
        categoria: p.categoria,
        atributos: Object.fromEntries(
          Object.entries(p.atributos).map(([k, vs]) => [k, new Set(vs)]),
        ),
      });
    }
    catalogo.proximoId = data.catalogo.proximoId;
    return { catalogo, variantes: data.variantes, proximoIndice: data.proximoIndice };
  } catch (e) {
    log('Checkpoint corrompido, ignorando:', e.message);
    return null;
  }
}

function salvarCheckpoint(catalogo, variantes, proximoIndice) {
  fs.writeFileSync(CHECKPOINT, JSON.stringify({
    salvoEm: new Date().toISOString(),
    proximoIndice,
    catalogo: snapshotCatalogo(catalogo),
    variantes,
  }, null, 2), 'utf8');
}

function salvarFinal(catalogo, variantes) {
  fs.writeFileSync(SAIDA_FINAL, JSON.stringify({
    geradoEm: new Date().toISOString(),
    modelo: MODELO,
    quantidadeProdutos: catalogo.produtos.size,
    quantidadeVariantes: variantes.length,
    catalogo: snapshotCatalogo(catalogo),
    variantes,
  }, null, 2), 'utf8');
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
(async () => {
  log('Lendo CSV de entrada:', ENTRADA);
  const todos = lerCsv(ENTRADA);
  const itens = LIMITE ? todos.slice(0, LIMITE) : todos;
  log(`Total de itens: ${itens.length}${LIMITE ? ` (limitado a ${LIMITE})` : ''}`);

  const ckp = carregarCheckpoint();
  let catalogo, variantes, proximoIndice;
  if (ckp) {
    log(`Retomando do checkpoint: ${ckp.proximoIndice}/${itens.length} itens ja processados, ${ckp.catalogo.produtos.size} canonicos.`);
    catalogo = ckp.catalogo;
    variantes = ckp.variantes;
    proximoIndice = ckp.proximoIndice;
  } else {
    catalogo = novoCatalogo();
    variantes = [];
    proximoIndice = 0;
  }

  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const inicio = Date.now();

  while (proximoIndice < itens.length) {
    const batch = itens.slice(proximoIndice, proximoIndice + TAMANHO_BATCH);
    const ctx = selecionarCanonicosParaContexto(catalogo, batch);
    log(`batch ${Math.floor(proximoIndice / TAMANHO_BATCH) + 1}: itens ${proximoIndice}-${proximoIndice + batch.length - 1}, canonicos no contexto=${ctx.length}/${catalogo.produtos.size}`);

    const t0 = Date.now();
    let resultado;
    try {
      resultado = await chamarClaude(client, ctx, batch);
    } catch (e) {
      log('Falha definitiva no batch:', e.message);
      log('Salvando checkpoint para retomar depois...');
      salvarCheckpoint(catalogo, variantes, proximoIndice);
      process.exit(1);
    }
    totalInputTokens += resultado.usage?.input_tokens || 0;
    totalOutputTokens += resultado.usage?.output_tokens || 0;

    const novasVar = aplicarResposta(catalogo, batch, resultado.json.itens);
    variantes.push(...novasVar);
    proximoIndice += batch.length;

    log(`  -> ${(Date.now() - t0)} ms | canonicos=${catalogo.produtos.size} | variantes=${variantes.length} | tokens=${resultado.usage?.input_tokens}/${resultado.usage?.output_tokens}`);

    salvarCheckpoint(catalogo, variantes, proximoIndice);
  }

  salvarFinal(catalogo, variantes);
  fs.rmSync(CHECKPOINT, { force: true });

  const durSeg = Math.round((Date.now() - inicio) / 1000);
  log('=== Concluido ===');
  log(`Itens processados: ${variantes.length}`);
  log(`Produtos canonicos criados: ${catalogo.produtos.size}`);
  log(`Tokens consumidos: ${totalInputTokens} input + ${totalOutputTokens} output`);
  log(`Tempo total: ${durSeg}s`);
  log(`Saida: ${SAIDA_FINAL}`);
})();
