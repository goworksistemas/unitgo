// Importa o resultado de 1-normalizar-ia.mjs para o Supabase.
//
// Idempotente: usa codigo_origem como chave para nao duplicar
// produtos e variantes em reexecucoes.
//
// Pre-requisitos:
//   1) Migration 005_origem_externa.sql aplicada no banco
//   2) temp/catalogo-ia/saida/produtos-normalizados.json gerado
//   3) .env (raiz) com VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY
//
// Rodar:
//   node temp/catalogo-ia/3-importar-supabase.mjs
// Modo simulacao (nao escreve no banco):
//   IA_DRY_RUN=true node temp/catalogo-ia/3-importar-supabase.mjs

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DRY_RUN = String(process.env.IA_DRY_RUN || '').toLowerCase() === 'true';
const PREFIXO_ORIGEM = 'goevo';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('[erro] VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios em .env (raiz).');
  process.exit(1);
}

const SAIDA = path.resolve(__dirname, 'saida');
const ENTRADA = path.join(SAIDA, 'produtos-normalizados.json');
if (!fs.existsSync(ENTRADA)) {
  console.error('[erro] Arquivo nao encontrado:', ENTRADA);
  console.error('Rode antes: node temp/catalogo-ia/1-normalizar-ia.mjs');
  process.exit(1);
}

const log = (...a) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...a);
const sb = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// -------------------------------------------------------------------
// Mapeamento de unidades CSV (GoEvo) -> sigla canonica do banco.
// Para casos triviais consolidamos com as ja existentes (un, kg, m...).
// As outras siglas batem 1:1 com a migration 005.
// -------------------------------------------------------------------
const ALIAS_UNIDADES = {
  UN: 'un', KG: 'kg', M: 'm', CX: 'cx', RL: 'rl', L: 'L',
  PR: 'par', PA: 'par', MT: 'm',
  // demais siglas (PC, PÇ, PE, M2, M3, KI, KT, BR, CT, CE, PT, JG,
  // GL, CJ, CH, SC, SA, LA, LT, BD, BB, BO, DI, GF, SR, T, CA, QT, '1')
  // saem identicas ao CSV - a migration 005 cria essas linhas.
};

function siglaCanonica(unidadeCsv) {
  if (!unidadeCsv) return 'un';
  const s = unidadeCsv.toString().trim();
  if (!s) return 'un';
  return ALIAS_UNIDADES[s.toUpperCase()] || s;
}

// -------------------------------------------------------------------
// Helpers Supabase
// -------------------------------------------------------------------
async function carregarUnidades() {
  const { data, error } = await sb.from('prd_unidades_medida').select('*');
  if (error) throw error;
  const porSigla = new Map();
  for (const u of data) porSigla.set(u.sigla, u);
  return porSigla;
}

async function carregarAtributos() {
  const { data, error } = await sb
    .from('prd_atributos')
    .select('id, nome, valores:prd_atributo_valores(id, atributo_id, valor)');
  if (error) throw error;
  const porNome = new Map();
  for (const a of data) {
    const valores = new Map();
    for (const v of (a.valores || [])) valores.set(v.valor, v.id);
    porNome.set(a.nome, { id: a.id, valores });
  }
  return porNome;
}

async function garantirAtributo(nome, mapa) {
  if (mapa.has(nome)) return mapa.get(nome);
  if (DRY_RUN) {
    const fake = { id: `dry:${nome}`, valores: new Map() };
    mapa.set(nome, fake);
    return fake;
  }
  const { data, error } = await sb
    .from('prd_atributos')
    .insert({ nome, tipo_dado: 'lista' })
    .select('id')
    .single();
  if (error) {
    // pode ter sido criado por outra rotina; tenta carregar
    const { data: existente } = await sb.from('prd_atributos').select('id').eq('nome', nome).single();
    if (!existente) throw error;
    const v = { id: existente.id, valores: new Map() };
    mapa.set(nome, v);
    return v;
  }
  const v = { id: data.id, valores: new Map() };
  mapa.set(nome, v);
  return v;
}

async function garantirValorAtributo(atributo, valor) {
  if (atributo.valores.has(valor)) return atributo.valores.get(valor);
  if (DRY_RUN) {
    const id = `dry:${atributo.id}:${valor}`;
    atributo.valores.set(valor, id);
    return id;
  }
  const { data, error } = await sb
    .from('prd_atributo_valores')
    .insert({ atributo_id: atributo.id, valor })
    .select('id')
    .single();
  if (error) {
    const { data: existente } = await sb
      .from('prd_atributo_valores')
      .select('id')
      .eq('atributo_id', atributo.id)
      .eq('valor', valor)
      .single();
    if (!existente) throw error;
    atributo.valores.set(valor, existente.id);
    return existente.id;
  }
  atributo.valores.set(valor, data.id);
  return data.id;
}

async function buscarVarianteExistente(codigoOrigem) {
  const { data, error } = await sb
    .from('prd_variantes')
    .select('id, produto_id')
    .eq('codigo_origem', codigoOrigem)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function buscarProdutoPorCanonicoIdInterno(idMap, canonicoId) {
  return idMap.get(canonicoId) || null;
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
(async () => {
  log(`Modo: ${DRY_RUN ? 'DRY RUN (nao escreve)' : 'EXECUCAO REAL'}`);
  log('Lendo:', ENTRADA);
  const data = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
  const { catalogo, variantes } = data;
  log(`Produtos canonicos: ${catalogo.produtos.length} | Variantes: ${variantes.length}`);

  // 1) Carrega unidades existentes
  log('Carregando unidades de medida...');
  let unidadesMap = await carregarUnidades();
  // Verifica se todas as siglas necessarias existem
  const siglasNecessarias = new Set();
  for (const v of variantes) siglasNecessarias.add(siglaCanonica(v.unidade_canonica || v.unidade_origem));
  const faltando = [...siglasNecessarias].filter((s) => !unidadesMap.has(s));
  if (faltando.length) {
    log('AVISO: as seguintes siglas nao existem no banco:', faltando.join(', '));
    log('Aplique a migration 005_origem_externa.sql antes de rodar a importacao real.');
    if (!DRY_RUN) process.exit(1);
  }

  // 2) Carrega/garante atributos descobertos pela IA (nivel global)
  log('Garantindo atributos e valores no banco...');
  const atributosMap = await carregarAtributos();
  const valoresPorAtributo = new Map(); // nome -> Set(valor)
  for (const p of catalogo.produtos) {
    for (const [nome, valores] of Object.entries(p.atributos || {})) {
      if (!valoresPorAtributo.has(nome)) valoresPorAtributo.set(nome, new Set());
      for (const val of valores) valoresPorAtributo.get(nome).add(val);
    }
  }
  for (const [nome, valores] of valoresPorAtributo) {
    const a = await garantirAtributo(nome, atributosMap);
    for (const v of valores) await garantirValorAtributo(a, v);
  }
  log(`Atributos: ${atributosMap.size}. Valores totais: ${[...atributosMap.values()].reduce((acc, a) => acc + a.valores.size, 0)}.`);

  // 3) Agrupa variantes por canonico (para construir codigo_origem agregado)
  const variantesPorCanonico = new Map();
  for (const v of variantes) {
    const arr = variantesPorCanonico.get(v.produto_canonico_id) || [];
    arr.push(v);
    variantesPorCanonico.set(v.produto_canonico_id, arr);
  }

  // 4) Cria produtos canonicos (idempotente via codigo_origem na primeira variante)
  log('Sincronizando produtos canonicos...');
  const idCanonicoToDbId = new Map(); // catalogo.id (p1, p2..) -> uuid no banco

  let criados = 0;
  let atualizados = 0;
  for (const canonico of catalogo.produtos) {
    const vars = variantesPorCanonico.get(canonico.id) || [];
    if (!vars.length) continue;
    // Procura por uma variante ja existente pelo codigo_origem
    let produtoExistenteId = null;
    for (const v of vars) {
      const existente = await buscarVarianteExistente(v.codigo_origem);
      if (existente) { produtoExistenteId = existente.produto_id; break; }
    }

    // unidade do produto (do primeiro item)
    const siglaUm = siglaCanonica(vars[0].unidade_canonica || vars[0].unidade_origem);
    const uId = unidadesMap.get(siglaUm)?.id || unidadesMap.get('un')?.id;
    const codigosOrigemAgregado = vars.map((v) => v.codigo_origem).join(',');

    const payload = {
      nome: canonico.nome,
      descricao: [canonico.marca, canonico.categoria].filter(Boolean).join(' · ') || null,
      unidade_medida_id: uId,
      codigo_origem: codigosOrigemAgregado,
    };

    if (produtoExistenteId) {
      idCanonicoToDbId.set(canonico.id, produtoExistenteId);
      if (!DRY_RUN) {
        const { error } = await sb.from('prd_produtos').update(payload).eq('id', produtoExistenteId);
        if (error) throw error;
      }
      atualizados += 1;
    } else {
      if (DRY_RUN) {
        idCanonicoToDbId.set(canonico.id, `dry:${canonico.id}`);
      } else {
        const { data, error } = await sb
          .from('prd_produtos')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        idCanonicoToDbId.set(canonico.id, data.id);
      }
      criados += 1;
    }
    if ((criados + atualizados) % 50 === 0) {
      log(`  produtos: ${criados} novos, ${atualizados} atualizados (${criados + atualizados}/${catalogo.produtos.length})`);
    }
  }
  log(`Produtos: ${criados} criados, ${atualizados} atualizados.`);

  // 5) Cria/atualiza variantes
  log('Sincronizando variantes...');
  let varCriadas = 0;
  let varAtualizadas = 0;
  let vinculosCriados = 0;
  for (let i = 0; i < variantes.length; i++) {
    const v = variantes[i];
    const produtoDbId = idCanonicoToDbId.get(v.produto_canonico_id);
    if (!produtoDbId) {
      log(`AVISO: variante ${v.codigo_origem} sem produto canonico vinculado, pulando.`);
      continue;
    }
    const sigla = siglaCanonica(v.unidade_canonica || v.unidade_origem);
    const uId = unidadesMap.get(sigla)?.id || null;

    const payload = {
      produto_id: produtoDbId,
      nome: v.nome_variante || null,
      unidade_medida_id: uId,
      codigo_origem: v.codigo_origem,
    };

    // Existe?
    const existente = await buscarVarianteExistente(v.codigo_origem);
    let varianteId;
    if (existente) {
      varianteId = existente.id;
      if (!DRY_RUN) {
        const { error } = await sb.from('prd_variantes').update(payload).eq('id', varianteId);
        if (error) throw error;
      }
      varAtualizadas += 1;
    } else {
      if (DRY_RUN) {
        varianteId = `dry:${v.codigo_origem}`;
      } else {
        const { data, error } = await sb
          .from('prd_variantes')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        varianteId = data.id;
      }
      varCriadas += 1;
    }

    // Vincula atributos
    if (v.atributos?.length && !DRY_RUN) {
      // Apaga vinculos existentes para garantir idempotencia
      await sb.from('prd_variante_atributos').delete().eq('variante_id', varianteId);
      const linhas = [];
      for (const a of v.atributos) {
        const at = atributosMap.get(a.nome);
        if (!at) continue;
        const valId = at.valores.get(a.valor);
        if (!valId) continue;
        linhas.push({
          variante_id: varianteId,
          atributo_id: at.id,
          atributo_valor_id: valId,
        });
      }
      if (linhas.length) {
        const { error } = await sb.from('prd_variante_atributos').insert(linhas);
        if (error && !error.message.includes('duplicate')) throw error;
        vinculosCriados += linhas.length;
      }
    }

    if ((i + 1) % 100 === 0) {
      log(`  variantes: ${i + 1}/${variantes.length}`);
    }
  }
  log(`Variantes: ${varCriadas} criadas, ${varAtualizadas} atualizadas. Vinculos atributo-valor: ${vinculosCriados}.`);

  log('=== Concluido ===');
})().catch((e) => {
  console.error('[falha]', e);
  process.exit(1);
});
