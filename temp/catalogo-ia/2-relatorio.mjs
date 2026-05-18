// Imprime um relatorio do resultado do 1-normalizar-ia.mjs
// para revisao antes de subir para o Supabase.
//
// Tambem gera saida/produtos-normalizados-revisao.csv para
// inspecao em Excel.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SAIDA = path.resolve(__dirname, 'saida');
const ENTRADA = path.join(SAIDA, 'produtos-normalizados.json');
const REVISAO_CSV = path.join(SAIDA, 'produtos-normalizados-revisao.csv');

if (!fs.existsSync(ENTRADA)) {
  console.error('Arquivo nao encontrado:', ENTRADA);
  console.error('Rode antes: node temp/catalogo-ia/1-normalizar-ia.mjs');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(ENTRADA, 'utf8'));
const { catalogo, variantes } = data;

console.log('===========================================================');
console.log('RELATORIO DE NORMALIZACAO');
console.log('===========================================================');
console.log('Gerado em:', data.geradoEm);
console.log('Modelo:', data.modelo);
console.log('Variantes (itens de origem):', variantes.length);
console.log('Produtos canonicos:', catalogo.produtos.length);
console.log('Razao consolidacao: 1 produto canonico para cada',
  (variantes.length / Math.max(catalogo.produtos.length, 1)).toFixed(2), 'variantes em media.');
console.log();

// Top produtos com mais variantes
const variantesPorProduto = new Map();
for (const v of variantes) {
  const arr = variantesPorProduto.get(v.produto_canonico_id) || [];
  arr.push(v);
  variantesPorProduto.set(v.produto_canonico_id, arr);
}
const ranking = catalogo.produtos
  .map((p) => ({ p, n: (variantesPorProduto.get(p.id) || []).length }))
  .sort((a, b) => b.n - a.n);

console.log('--- Top 30 produtos canonicos com mais variantes ---');
for (const { p, n } of ranking.slice(0, 30)) {
  const atribs = Object.keys(p.atributos || {}).join(', ') || '(sem atributos)';
  console.log(`${String(n).padStart(4)}  ${p.nome}  [${atribs}]`);
}
console.log();

// Atributos descobertos no global
const valoresPorAtributo = new Map();
for (const p of catalogo.produtos) {
  for (const [nome, valores] of Object.entries(p.atributos || {})) {
    if (!valoresPorAtributo.has(nome)) valoresPorAtributo.set(nome, new Set());
    for (const v of valores) valoresPorAtributo.get(nome).add(v);
  }
}
console.log('--- Atributos descobertos (agregado global) ---');
const atribsOrdenados = [...valoresPorAtributo.entries()]
  .sort((a, b) => b[1].size - a[1].size);
for (const [nome, valores] of atribsOrdenados) {
  console.log(`${String(valores.size).padStart(4)} valores  ${nome}`);
}
console.log();

// Produtos canonicos com nomes muito parecidos (alerta de duplicidade residual)
console.log('--- Possiveis duplicatas residuais (mesma 1a palavra + 1a marca) ---');
function chave(p) {
  const nome = (p.nome || '').toLowerCase();
  const primeira = nome.split(/\s+/)[0] || '';
  const marca = (p.marca || '').toLowerCase();
  return `${primeira}|${marca}`;
}
const buckets = new Map();
for (const p of catalogo.produtos) {
  const k = chave(p);
  if (!buckets.has(k)) buckets.set(k, []);
  buckets.get(k).push(p);
}
let alertas = 0;
for (const [, lista] of buckets) {
  if (lista.length < 2) continue;
  alertas += 1;
  if (alertas > 30) break;
  console.log(`  [${lista.length}] ${lista.map((p) => p.nome).join('  |  ')}`);
}
if (alertas === 0) console.log('  (nada suspeito detectado pela heuristica)');
console.log();

// Unidades canonicas usadas
const unidades = new Map();
for (const v of variantes) {
  const u = v.unidade_canonica || '(vazio)';
  unidades.set(u, (unidades.get(u) || 0) + 1);
}
console.log('--- Unidades canonicas atribuidas as variantes ---');
const unArr = [...unidades.entries()].sort((a, b) => b[1] - a[1]);
for (const [u, n] of unArr) console.log(`${String(n).padStart(5)}  ${u}`);
console.log();

// Gera CSV de revisao
console.log('Gerando CSV de revisao em', REVISAO_CSV);
const cab = ['codigo_origem', 'descricao_original', 'unidade_origem', 'produto_canonico', 'marca', 'categoria', 'nome_variante', 'unidade_canonica', 'atributos'];
const escape = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
const linhas = [cab.map(escape).join(';')];
const mapaCanonico = new Map(catalogo.produtos.map((p) => [p.id, p]));
for (const v of variantes) {
  const p = mapaCanonico.get(v.produto_canonico_id);
  const atribs = (v.atributos || []).map((a) => `${a.nome}=${a.valor}`).join(' | ');
  linhas.push([
    v.codigo_origem,
    v.descricao_original,
    v.unidade_origem,
    p?.nome || '',
    p?.marca || '',
    p?.categoria || '',
    v.nome_variante || '',
    v.unidade_canonica || '',
    atribs,
  ].map(escape).join(';'));
}
fs.writeFileSync(REVISAO_CSV, '\ufeff' + linhas.join('\r\n'), 'utf8');
console.log('Pronto.');
