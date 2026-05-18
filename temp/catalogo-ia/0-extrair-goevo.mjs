// Extrai a lista completa de produtos do GoEvo/TPrime (Tetris/SCM).
// 1. Faz login com credenciais do temp/.env
// 2. Navega até a tela de Produtos (Cadastros > Produtos)
// 3. Detecta automaticamente a chamada AJAX que alimenta a tabela DataTables
// 4. Reexecuta a chamada paginada (ou com length grande) reusando a sessao
// 5. Salva temp/catalogo-ia/saida/produtos-goevo.json e .csv
//
// Rodar:  node temp/catalogo-ia/0-extrair-goevo.mjs
// Variaveis necessarias em temp/.env:
//   GOEVO_BASE_URL, GOEVO_EMAIL, GOEVO_SENHA, GOEVO_PRODUTOS_URL

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, '..', '.env');
dotenv.config({ path: ENV_PATH });

const {
  GOEVO_BASE_URL,
  GOEVO_EMAIL,
  GOEVO_SENHA,
  GOEVO_PRODUTOS_URL,
  GOEVO_PORTAL = 'Compras',
  GOEVO_HEADLESS = 'false',
} = process.env;

const obrigatorias = { GOEVO_BASE_URL, GOEVO_EMAIL, GOEVO_SENHA, GOEVO_PRODUTOS_URL };
for (const [k, v] of Object.entries(obrigatorias)) {
  if (!v) {
    console.error(`[erro] Variavel ${k} ausente em ${ENV_PATH}`);
    process.exit(1);
  }
}

const SAIDA = path.resolve(__dirname, 'saida');
const DEBUG = path.join(SAIDA, 'debug');
fs.mkdirSync(DEBUG, { recursive: true });

const log = (...args) => console.log(`[${new Date().toISOString().slice(11, 19)}]`, ...args);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// -------------------------------------------------------------------
// Heuristicas para identificar a XHR que retorna os produtos
// -------------------------------------------------------------------
// Heuristica forte: provavelmente eh a XHR oficial dos produtos
function pareceListaDeProdutosForte(jsonText) {
  if (!jsonText || jsonText.length < 200) return false;
  const tem = (re) => re.test(jsonText);
  const sinaisDataTables = tem(/\biTotalRecords\b|\baaData\b|\brecordsTotal\b|"draw"/);
  const sinaisProduto = tem(/Produto|DESCRICAO|Descricao|CODIGO|Codigo|UNIDADE|Unidade/i);
  return sinaisDataTables && sinaisProduto;
}

// Heuristica fraca: e UMA resposta de listagem qualquer
function pareceListagemQualquer(jsonText) {
  if (!jsonText || jsonText.length < 500) return false;
  // tem array com pelo menos 2 elementos
  const matches = jsonText.match(/\{/g);
  return matches && matches.length >= 5;
}

function extrairArray(json) {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    for (const chave of ['aaData', 'data', 'Data', 'rows', 'Rows', 'items', 'Items', 'result', 'Result']) {
      if (Array.isArray(json[chave])) return json[chave];
    }
  }
  return null;
}

function totalRegistros(json) {
  if (!json || typeof json !== 'object') return null;
  for (const chave of ['iTotalRecords', 'iTotalDisplayRecords', 'recordsTotal', 'recordsFiltered', 'Total', 'total', 'TotalRecords']) {
    if (typeof json[chave] === 'number') return json[chave];
    if (typeof json[chave] === 'string' && /^\d+$/.test(json[chave])) return Number(json[chave]);
  }
  return null;
}

// -------------------------------------------------------------------
// Login
// -------------------------------------------------------------------
async function fazerLogin(page) {
  log('Abrindo pagina de login:', GOEVO_BASE_URL);
  await page.goto(GOEVO_BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(DEBUG, '01-login-antes.png'), fullPage: true });

  const seletoresEmail = [
    'input[type="email"]',
    'input[name*="Email" i]',
    'input[name*="Login" i]',
    'input[name*="Usuario" i]',
    'input[name*="User" i]',
    'input[id*="Email" i]',
    'input[id*="Login" i]',
    'input[id*="Usuario" i]',
    'input[id*="User" i]',
    'input[placeholder*="email" i]',
    'input[placeholder*="usu" i]',
    'input[type="text"]',
  ];
  const seletoresSenha = [
    'input[type="password"]',
    'input[name*="Senha" i]',
    'input[name*="Password" i]',
    'input[id*="Senha" i]',
    'input[id*="Password" i]',
  ];
  const seletoresSubmit = [
    'button[type="submit"]',
    'input[type="submit"]',
    'button:has-text("Entrar")',
    'button:has-text("Login")',
    'button:has-text("Acessar")',
    'a:has-text("Entrar")',
    'a:has-text("Login")',
    '#btnLogin',
    '[id*="Entrar" i]',
    '[id*="Login" i][type]',
  ];

  async function preencher(seletores, valor) {
    for (const sel of seletores) {
      const el = await page.$(sel);
      if (el && (await el.isVisible().catch(() => false))) {
        await el.click({ delay: 30 });
        await el.fill('');
        await el.type(valor, { delay: 25 });
        return sel;
      }
    }
    return null;
  }

  const usadoEmail = await preencher(seletoresEmail, GOEVO_EMAIL);
  const usadoSenha = await preencher(seletoresSenha, GOEVO_SENHA);
  log('Campos preenchidos:', { email: usadoEmail, senha: usadoSenha });

  if (!usadoEmail || !usadoSenha) {
    await page.screenshot({ path: path.join(DEBUG, '01-login-campos-nao-encontrados.png'), fullPage: true });
    throw new Error('Nao consegui localizar os campos de login. Verifique screenshots em saida/debug/.');
  }

  let clicou = false;
  for (const sel of seletoresSubmit) {
    const el = await page.$(sel);
    if (el && (await el.isVisible().catch(() => false))) {
      await Promise.all([
        page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {}),
        el.click(),
      ]);
      clicou = true;
      log('Clique em submit via seletor:', sel);
      break;
    }
  }
  if (!clicou) {
    await page.keyboard.press('Enter');
    log('Submit via Enter (fallback)');
    await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  }

  await sleep(2500);
  await page.screenshot({ path: path.join(DEBUG, '02-login-depois.png'), fullPage: true });

  // Etapa 2 do login: tela "Acesso Portal" com um <select> de portais.
  // Escolhe a opcao cujo texto contem GOEVO_PORTAL (default "Compras").
  const selectPortal = await page.$('select');
  if (selectPortal) {
    log('Tela "Acesso Portal" detectada. Procurando opcao contendo:', GOEVO_PORTAL);
    const opcoes = await page.$$eval('select option', (opts) =>
      opts.map((o) => ({ value: o.value, text: (o.textContent || '').trim() })),
    );
    log('Opcoes disponiveis:', opcoes.map((o) => o.text));
    const alvo = opcoes.find((o) => new RegExp(GOEVO_PORTAL, 'i').test(o.text));
    if (!alvo) {
      throw new Error(`Nenhuma opcao do select contem "${GOEVO_PORTAL}". Opcoes: ${opcoes.map((o) => o.text).join(' | ')}`);
    }
    await page.selectOption('select', alvo.value);
    log('Portal selecionado:', alvo.text);
    await sleep(500);
    await page.screenshot({ path: path.join(DEBUG, '02b-portal-selecionado.png'), fullPage: true });

    // Clica em Acessar
    const seletoresAcessar = [
      'button:has-text("Acessar")',
      'input[type="submit"][value*="Acessar" i]',
      'a:has-text("Acessar")',
      'button[type="submit"]',
      'input[type="submit"]',
    ];
    let clicouAcessar = false;
    for (const sel of seletoresAcessar) {
      const el = await page.$(sel);
      if (el && (await el.isVisible().catch(() => false))) {
        await Promise.all([
          page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {}),
          el.click(),
        ]);
        clicouAcessar = true;
        log('Clique em "Acessar" via seletor:', sel);
        break;
      }
    }
    if (!clicouAcessar) {
      await page.keyboard.press('Enter');
      log('Acessar via Enter (fallback)');
      await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
    }
    await sleep(2500);
    await page.screenshot({ path: path.join(DEBUG, '02c-pos-portal.png'), fullPage: true });
  }

  const urlAtual = page.url();
  log('URL apos login:', urlAtual);
  if (/Login\.aspx/i.test(urlAtual)) {
    throw new Error(`Apos clicar em entrar ainda estou em uma pagina de login: ${urlAtual}`);
  }
}

// -------------------------------------------------------------------
// Captura de XHR candidatas
// -------------------------------------------------------------------
function montarSnifferXHR(context, candidatas, todasXhrs) {
  context.on('response', async (response) => {
    try {
      const status = response.status();
      const ct = (response.headers()['content-type'] || '').toLowerCase();
      const url = response.url();
      // ignorar assets obvios
      if (/\.(png|jpe?g|gif|svg|css|woff2?|ttf|eot|ico)(\?|$)/i.test(url)) return;
      const req = response.request();
      const tipo = req.resourceType();
      // so xhr/fetch
      if (tipo !== 'xhr' && tipo !== 'fetch') return;

      const texto = await response.text().catch(() => '');
      const tamanho = texto.length;

      // registra TODAS para diagnostico
      todasXhrs.push({
        url, status, contentType: ct, method: req.method(), tamanho,
        preview: texto.slice(0, 300),
      });

      if (status !== 200) return;
      if (!ct.includes('json') && !ct.includes('text/plain') && !ct.includes('application/javascript')) {
        // ainda assim tenta se o body parecer json
        if (!texto.trim().startsWith('{') && !texto.trim().startsWith('[')) return;
      }

      let json = null;
      try { json = JSON.parse(texto); } catch {}
      const arr = extrairArray(json);
      const total = totalRegistros(json);

      const forte = pareceListaDeProdutosForte(texto);
      const fraca = pareceListagemQualquer(texto) && (arr && arr.length >= 5);
      if (!forte && !fraca) return;

      candidatas.push({
        url,
        method: req.method(),
        headers: req.headers(),
        postData: req.postData() || null,
        resourceType: tipo,
        totalLinhas: arr ? arr.length : null,
        totalRegistros: total,
        forte,
        sample: arr ? arr.slice(0, 2) : null,
        bodyTextPreview: texto.slice(0, 600),
      });
      log(`[candidata${forte ? '*' : ''}] ${req.method()} ${url} -> linhas=${arr?.length ?? '?'} total=${total ?? '?'} ct=${ct}`);
    } catch {}
  });
}

// -------------------------------------------------------------------
// Navegacao ate a tela de Produtos
// -------------------------------------------------------------------
async function abrirTelaProdutos(page) {
  log('Indo para SCM:', GOEVO_PRODUTOS_URL);
  await page.goto(GOEVO_PRODUTOS_URL, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('networkidle', { timeout: 90_000 }).catch(() => {});
  await sleep(3000);
  await page.screenshot({ path: path.join(DEBUG, '03-scm-home.png'), fullPage: true });

  // Caminho no menu lateral: Cadastros > Cadastros Gerais > Produtos.
  const frames = page.frames();
  log(`Frames carregados: ${frames.length}`);

  async function tentarClicar(textoMenu, opcoes = {}) {
    const { exato = true, timeout = 4000 } = opcoes;
    for (const f of [page, ...page.frames()]) {
      try {
        const loc = exato
          ? f.getByText(textoMenu, { exact: true }).first()
          : f.locator(`text=${textoMenu}`).first();
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          await loc.scrollIntoViewIfNeeded().catch(() => {});
          await loc.click({ timeout });
          log(`Cliquei em "${textoMenu}"`);
          return true;
        }
      } catch {}
    }
    return false;
  }

  await tentarClicar('Cadastros');
  await sleep(700);
  await page.screenshot({ path: path.join(DEBUG, '03b-menu-cadastros.png'), fullPage: true });

  await tentarClicar('Cadastros Gerais');
  await sleep(700);
  await page.screenshot({ path: path.join(DEBUG, '03c-menu-cadastros-gerais.png'), fullPage: true });

  const okProdutos = await tentarClicar('Produtos');
  if (!okProdutos) {
    log('Nao achei "Produtos" exato, tentando match parcial...');
    await tentarClicar('Produtos', { exato: false });
  }
  await sleep(2500);
  await page.screenshot({ path: path.join(DEBUG, '04-tela-produtos.png'), fullPage: true });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});

  // A tabela so carrega depois que escolhemos um "Tipo de Produto"
  // E clicamos no botao de busca (lupa).
  log('Aplicando filtro de "Tipo de Produto"...');
  const filtroAplicado = await aplicarFiltroTipoProduto(page);
  if (!filtroAplicado) {
    log('Aviso: nao consegui aplicar o filtro de Tipo de Produto automaticamente.');
  } else {
    log('Filtro aplicado.');
  }
  await sleep(800);
}

// Clica no botao de busca/lupa que dispara a query no servidor.
async function clicarBotaoBuscar(page) {
  const candidatos = [page, ...page.frames()];
  const seletores = [
    'button:has(i.fa-search)',
    'button:has(i.fa-magnifying-glass)',
    'button:has(svg.lucide-search)',
    'a:has(i.fa-search)',
    '.btn-primary:has(i.fa-search)',
    'button[title*="Buscar" i]',
    'button[aria-label*="Buscar" i]',
    'button[title*="Pesquisar" i]',
    'button:has-text("Buscar")',
    'button:has-text("Pesquisar")',
    'button:has-text("Filtrar")',
    'input[type="submit"][value*="Buscar" i]',
    'input[type="button"][value*="Buscar" i]',
  ];
  for (const f of candidatos) {
    for (const sel of seletores) {
      try {
        const loc = f.locator(sel).first();
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          await loc.click({ timeout: 3000 });
          log(`Clique no botao de busca via "${sel}"`);
          return true;
        }
      } catch {}
    }
  }
  log('Aviso: nao encontrei botao de busca por seletor padrao. Tentando atalho Enter...');
  await page.keyboard.press('Enter').catch(() => {});
  return false;
}

// Abre o dropdown "Tipo de Produto" (Select2-like) e seleciona a primeira opcao.
async function aplicarFiltroTipoProduto(page) {
  const candidatos = [page, ...page.frames()];
  for (const f of candidatos) {
    try {
      // 1) Acha o label e o controle visualmente abaixo dele.
      const label = f.getByText('Tipo de Produto', { exact: true }).first();
      if ((await label.count()) === 0) continue;

      // O controle do Select2 normalmente e o irmao seguinte do label,
      // ou um descendente do mesmo container .form-group.
      // Estrategia: clicar no proximo elemento focalizavel apos o label.
      await label.scrollIntoViewIfNeeded().catch(() => {});

      // Tenta varios padroes comuns:
      const padroes = [
        // Select2 v4
        'xpath=following::span[contains(@class,"select2-selection")][1]',
        // Select2 antigo
        'xpath=following::a[contains(@class,"select2-choice")][1]',
        // Generico: input ou span clicavel logo abaixo
        'xpath=following::*[self::input or self::span or self::div][contains(@class,"select") or @role="combobox"][1]',
        // Fallback: primeiro input/select irmao
        'xpath=following::input[1]',
      ];
      let abriu = false;
      for (const xp of padroes) {
        try {
          const ctrl = label.locator(xp).first();
          if ((await ctrl.count()) > 0 && (await ctrl.isVisible().catch(() => false))) {
            await ctrl.click({ timeout: 3000 });
            abriu = true;
            break;
          }
        } catch {}
      }
      if (!abriu) continue;
      await sleep(600);
      await page.screenshot({ path: path.join(DEBUG, '04b-dropdown-aberto.png'), fullPage: true });

      // 2) Clica na opcao "MERCADORIA" (qualquer item da lista que abriu).
      const opcoesSeletores = [
        'li.select2-results__option:not(.select2-results__message)',
        'li[role="option"]',
        '.select2-result-label',
        '[role="option"]',
      ];
      for (const sel of opcoesSeletores) {
        const opc = f.locator(sel).first();
        if ((await opc.count()) > 0 && (await opc.isVisible().catch(() => false))) {
          await opc.click({ timeout: 3000 });
          log(`Tipo de Produto selecionado via "${sel}"`);
          return true;
        }
      }

      // 3) Fallback: digitar e dar Enter
      await page.keyboard.type('MERCADORIA', { delay: 30 });
      await sleep(400);
      await page.keyboard.press('Enter');
      log('Tipo de Produto selecionado via teclado (MERCADORIA + Enter)');
      return true;
    } catch (e) {
      log('Tentativa de filtro falhou:', e.message);
    }
  }
  return false;
}

// -------------------------------------------------------------------
// Forcar paginacao para garantir que a XHR foi disparada
// -------------------------------------------------------------------
async function forcarRefreshTabela(page) {
  // tenta clicar no Next e voltar, e tambem trocar o Show entries
  const tentativas = [
    'a.paginate_button.next',
    'li.next > a',
    'a:has-text("Next")',
    'a:has-text("Proximo")',
  ];
  for (const f of [page, ...page.frames()]) {
    for (const sel of tentativas) {
      try {
        const loc = f.locator(sel).first();
        if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
          await loc.click({ timeout: 3000 }).catch(() => {});
          await sleep(1500);
          break;
        }
      } catch {}
    }
  }
}

// -------------------------------------------------------------------
// Replay da chamada com paginacao completa (reusando cookies da sessao)
// -------------------------------------------------------------------
async function baixarTudo(context, candidata) {
  const apiContext = context.request;
  const headersBase = { ...candidata.headers };
  // remove headers que o playwright recalcula
  for (const h of ['host', 'content-length', 'connection', 'accept-encoding']) {
    delete headersBase[h];
  }

  const ehDataTables = candidata.postData && /sEcho|iDisplayStart|iDisplayLength/.test(candidata.postData)
    || /sEcho|iDisplayStart|iDisplayLength/.test(new URL(candidata.url).search);
  const ehDraw = candidata.postData && /\bdraw\b|\bstart\b|\blength\b/.test(candidata.postData)
    || /\bdraw\b|\bstart\b|\blength\b/.test(new URL(candidata.url).search);

  log('Padrao detectado:', { ehDataTables, ehDraw, method: candidata.method });

  function ajustarPagina(start, length) {
    if (candidata.method === 'POST' && candidata.postData) {
      const ct = (headersBase['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try {
          const obj = JSON.parse(candidata.postData);
          if (ehDataTables) {
            obj.iDisplayStart = start;
            obj.iDisplayLength = length;
            if ('sEcho' in obj) obj.sEcho = String(Number(obj.sEcho || 1) + 1);
          }
          if (ehDraw) {
            obj.start = start;
            obj.length = length;
            obj.draw = (obj.draw || 1) + 1;
          }
          return { url: candidata.url, body: JSON.stringify(obj) };
        } catch {}
      }
      // form-urlencoded
      const params = new URLSearchParams(candidata.postData);
      if (ehDataTables) {
        params.set('iDisplayStart', String(start));
        params.set('iDisplayLength', String(length));
        if (params.has('sEcho')) params.set('sEcho', String(Number(params.get('sEcho') || 1) + 1));
      }
      if (ehDraw) {
        params.set('start', String(start));
        params.set('length', String(length));
        params.set('draw', String(Number(params.get('draw') || 1) + 1));
      }
      return { url: candidata.url, body: params.toString() };
    }

    // GET
    const u = new URL(candidata.url);
    if (ehDataTables) {
      u.searchParams.set('iDisplayStart', String(start));
      u.searchParams.set('iDisplayLength', String(length));
      if (u.searchParams.has('sEcho')) {
        u.searchParams.set('sEcho', String(Number(u.searchParams.get('sEcho') || 1) + 1));
      }
    }
    if (ehDraw) {
      u.searchParams.set('start', String(start));
      u.searchParams.set('length', String(length));
      u.searchParams.set('draw', String(Number(u.searchParams.get('draw') || 1) + 1));
    }
    return { url: u.toString(), body: null };
  }

  async function chamar(start, length) {
    const { url, body } = ajustarPagina(start, length);
    const opts = { headers: headersBase };
    if (candidata.method === 'POST') opts.data = body || '';
    const resp = candidata.method === 'POST'
      ? await apiContext.post(url, opts)
      : await apiContext.get(url, opts);
    const status = resp.status();
    const texto = await resp.text();
    if (status !== 200) {
      throw new Error(`HTTP ${status} em ${url}: ${texto.slice(0, 300)}`);
    }
    let json;
    try { json = JSON.parse(texto); } catch (e) {
      throw new Error(`Resposta nao-JSON: ${texto.slice(0, 200)}`);
    }
    return json;
  }

  // 1) Tenta puxar tudo de uma vez
  log('Tentando puxar tudo numa unica requisicao (length=20000)...');
  let primeira;
  try {
    primeira = await chamar(0, 20000);
  } catch (e) {
    log('Falhou pegar tudo de uma vez:', e.message);
    primeira = await chamar(0, 100);
  }
  const total = totalRegistros(primeira) ?? candidata.totalRegistros;
  let dados = extrairArray(primeira) || [];
  log(`Primeira chamada: ${dados.length} linhas. Total reportado: ${total}`);

  if (total && dados.length >= total) {
    return { dados, total, primeiraResposta: primeira };
  }

  // 2) Fallback: paginar de 100 em 100
  const PAGE = 100;
  const alvo = total || (dados.length || 0) + 1;
  log(`Paginando de ${PAGE} em ${PAGE} ate alcancar ${alvo}...`);
  if (dados.length < PAGE) {
    dados = [];
  }
  let start = dados.length;
  let ultimoPrimeiro = null;
  while (start < (total ?? Infinity)) {
    const json = await chamar(start, PAGE);
    const arr = extrairArray(json) || [];
    if (!arr.length) break;

    // Detecta se o servidor esta ignorando os parametros de paginacao
    // (sempre retorna o mesmo "primeiro item"). Se sim, aborta o replay.
    const primeiroAtual = JSON.stringify(arr[0]);
    if (ultimoPrimeiro && primeiroAtual === ultimoPrimeiro) {
      log('Servidor parece ignorar a paginacao (mesmo primeiro item). Abortando replay.');
      break;
    }
    ultimoPrimeiro = primeiroAtual;

    dados.push(...arr);
    log(`  start=${start} -> +${arr.length} (acumulado ${dados.length}/${total ?? '?'})`);
    start += arr.length;
    await sleep(150);
    if (arr.length < PAGE) break;
    if (dados.length > 100_000) {
      log('Limite de seguranca de 100k linhas atingido. Abortando replay.');
      break;
    }
  }

  return { dados, total, primeiraResposta: primeira };
}

// -------------------------------------------------------------------
// Fallback: scrape do DOM clicando em "Next" pagina por pagina
// -------------------------------------------------------------------
async function scrapeDomCompleto(page) {
  const todosFrames = [page, ...page.frames()];
  let frameAlvo = null;
  for (const f of todosFrames) {
    const c = await f.locator('table.dataTable, table tbody tr').count().catch(() => 0);
    if (c > 0) { frameAlvo = f; break; }
  }
  if (!frameAlvo) frameAlvo = page;

  // Cabecalhos
  const cabecalhos = await frameAlvo.$$eval(
    'table.dataTable thead th, table thead th',
    (ths) => ths.map((th) => (th.textContent || '').trim() || '_'),
  ).catch(() => []);
  log('Cabecalhos detectados:', cabecalhos);

  // Tenta setar "Show 100 entries" para reduzir o numero de paginas
  try {
    const seletoresLen = [
      'select[name$="_length"]',
      '.dataTables_length select',
      'select[aria-controls]',
    ];
    for (const sel of seletoresLen) {
      const loc = frameAlvo.locator(sel).first();
      if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
        const opcoes = await loc.locator('option').allTextContents();
        log('Opcoes de paginacao detectadas:', opcoes);
        // tenta selecionar a maior opcao numerica disponivel
        const numerica = opcoes
          .map((t) => Number((t || '').trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
        const escolhido = numerica.length ? Math.max(...numerica) : 100;
        await loc.selectOption(String(escolhido));
        log(`"Show entries" setado para ${escolhido}.`);
        await sleep(1500);
        break;
      }
    }
  } catch (e) {
    log('Nao consegui ajustar "Show entries":', e.message);
  }

  const linhas = [];
  const vistos = new Set();
  let pagina = 0;
  while (true) {
    pagina += 1;
    // espera processing sumir
    for (let i = 0; i < 60; i++) {
      const proc = frameAlvo.locator('.dataTables_processing').first();
      const visivel = await proc.isVisible().catch(() => false);
      if (!visivel) break;
      await sleep(250);
    }
    const novas = await frameAlvo.$$eval(
      'table.dataTable tbody tr, table tbody tr',
      (trs) => trs.map((tr) => Array.from(tr.querySelectorAll('td')).map((td) => (td.innerText || '').trim().replace(/\s+/g, ' '))),
    );
    let adicionadas = 0;
    for (const linha of novas) {
      if (linha.length < 2) continue;
      const chave = linha.find((c) => /^\d{4,}$/.test(c)) || linha.join('|');
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      linhas.push(linha);
      adicionadas += 1;
    }
    log(`pagina ${pagina}: +${adicionadas} (acumulado ${linhas.length})`);

    // Acha botao Next ativo
    const seletoresNext = [
      'a.paginate_button.next:not(.disabled)',
      'li.next:not(.disabled) > a',
      'a:has-text("Next"):not(.disabled)',
      'a.next:not(.disabled)',
    ];
    let next = null;
    for (const sel of seletoresNext) {
      const loc = frameAlvo.locator(sel).first();
      if ((await loc.count()) > 0) {
        const liPai = await loc.evaluate((el) => {
          const li = el.closest('li');
          return li ? li.classList.contains('disabled') : false;
        }).catch(() => false);
        const cls = await loc.getAttribute('class').catch(() => '') || '';
        if (!liPai && !/disabled/.test(cls)) {
          next = loc;
          break;
        }
      }
    }
    if (!next) {
      log('Botao Next nao encontrado / desabilitado. Fim da paginacao.');
      break;
    }
    await next.click({ timeout: 3000 }).catch(() => {});
    await sleep(700);
    if (pagina > 500) {
      log('Limite de seguranca de 500 paginas atingido.');
      break;
    }
  }

  // Remove colunas "auxiliares" (cabecalho vazio ou "_") que sao controles
  // do DataTables (ex.: checkboxes, botoes).
  const colunasManter = cabecalhos
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c && c !== '_')
    .map(({ i }) => i);
  const cabecalhosLimpos = colunasManter.map((i) => cabecalhos[i]);
  const linhasLimpas = linhas.map((l) => colunasManter.map((i) => l[i] ?? ''));

  return { cabecalhos: cabecalhosLimpos, linhas: linhasLimpas };
}

// -------------------------------------------------------------------
// Conversao para CSV (com cabecalhos explicitos)
// -------------------------------------------------------------------
function jsonParaCsvComCabecalhos(linhas, cabecalhos) {
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const cabUsar = (cabecalhos && cabecalhos.length)
    ? cabecalhos
    : Array.from({ length: linhas[0]?.length || 0 }, (_, i) => `col${i + 1}`);
  const out = [cabUsar.map(escape).join(';')];
  for (const l of linhas) {
    out.push(cabUsar.map((_, i) => escape(l[i])).join(';'));
  }
  return '\ufeff' + out.join('\r\n');
}

// -------------------------------------------------------------------
// Conversao para CSV
// -------------------------------------------------------------------
function jsonParaCsv(linhas) {
  if (!linhas.length) return '';
  // Detecta colunas a partir das chaves do primeiro objeto.
  // Se as linhas forem arrays (DataTables aaData), gera col1..colN.
  const ehArray = Array.isArray(linhas[0]);
  let cabecalhos;
  if (ehArray) {
    const max = linhas.reduce((m, l) => Math.max(m, l.length), 0);
    cabecalhos = Array.from({ length: max }, (_, i) => `col${i + 1}`);
  } else {
    const set = new Set();
    for (const l of linhas) Object.keys(l).forEach((k) => set.add(k));
    cabecalhos = [...set];
  }
  const escape = (v) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return '"' + s.replace(/"/g, '""') + '"';
  };
  const linhasCsv = [cabecalhos.map(escape).join(';')];
  for (const l of linhas) {
    if (ehArray) {
      linhasCsv.push(cabecalhos.map((_, i) => escape(l[i])).join(';'));
    } else {
      linhasCsv.push(cabecalhos.map((c) => escape(l[c])).join(';'));
    }
  }
  return '\ufeff' + linhasCsv.join('\r\n');
}

// -------------------------------------------------------------------
// Main
// -------------------------------------------------------------------
(async () => {
  const headless = String(GOEVO_HEADLESS).toLowerCase() === 'true';
  log('Iniciando Chromium (headless=' + headless + ')');
  const browser = await chromium.launch({ headless, slowMo: headless ? 0 : 30 });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'pt-BR',
  });
  const page = await context.newPage();

  const candidatas = [];
  const todasXhrs = [];
  montarSnifferXHR(context, candidatas, todasXhrs);

  try {
    await fazerLogin(page);
    await abrirTelaProdutos(page);

    // *** Importante ***
    // Ate aqui, varias XHRs do framework Tetris ja rodaram (carregamento de menu,
    // configs, etc.) e poluem o array `candidatas`. So nos importa o que vier
    // APOS o clique em "Buscar". Entao zeramos o buffer agora.
    log('Limpando buffer de XHRs e clicando no botao de busca...');
    candidatas.length = 0;
    todasXhrs.length = 0;

    await clicarBotaoBuscar(page);
    await sleep(800);
    await page.screenshot({ path: path.join(DEBUG, '05-tela-produtos-filtrada.png'), fullPage: true });

    // Espera ate ter uma candidata GRANDE (>= 200 linhas) ou ate timeout (45s).
    log('Aguardando XHR de produtos (>= 200 linhas) aparecer...');
    const tEspera = Date.now() + 45_000;
    while (Date.now() < tEspera) {
      const grande = candidatas.find((c) => (c.totalLinhas || 0) >= 200);
      if (grande) break;
      await sleep(500);
    }

    // Sempre salva o diagnostico de TODAS as XHRs para inspecao
    fs.writeFileSync(path.join(DEBUG, 'todas-xhrs.json'), JSON.stringify(todasXhrs, null, 2), 'utf8');
    fs.writeFileSync(path.join(DEBUG, 'candidatas.json'), JSON.stringify(candidatas, null, 2), 'utf8');
    log(`Apos o clique em Buscar: XHRs=${todasXhrs.length}, candidatas=${candidatas.length}.`);

    if (!candidatas.length) {
      log('=== Nenhuma candidata. Caindo para scrape do DOM via paginacao na UI ===');
      const dadosScrape = await scrapeDomCompleto(page);
      log(`Scrape concluido. Linhas: ${dadosScrape.linhas.length}.`);
      fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.json'), JSON.stringify({
        capturadoEm: new Date().toISOString(),
        origem: { metodo: 'scrape-dom', url: page.url() },
        total: dadosScrape.linhas.length,
        quantidade: dadosScrape.linhas.length,
        cabecalhos: dadosScrape.cabecalhos,
        dados: dadosScrape.linhas,
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.csv'), jsonParaCsvComCabecalhos(dadosScrape.linhas, dadosScrape.cabecalhos), 'utf8');
      log('Arquivos salvos em', SAIDA);
      return;
    }

    // Pega a candidata com maior totalLinhas (mais provavel ser a real)
    candidatas.sort((a, b) => {
      // prioriza forte
      if (a.forte !== b.forte) return a.forte ? -1 : 1;
      // depois prioriza a com mais linhas
      return (b.totalLinhas || 0) - (a.totalLinhas || 0);
    });
    const escolhida = candidatas[0];

    // Sanity check: se a maior candidata tem poucas linhas (< 200), nao vale
    // a pena replay; cai pro scrape do DOM.
    if ((escolhida.totalLinhas || 0) < 200) {
      log(`Maior candidata so tem ${escolhida.totalLinhas} linhas. Caindo para scrape do DOM.`);
      const dadosScrape = await scrapeDomCompleto(page);
      log(`Scrape concluido. Linhas: ${dadosScrape.linhas.length}.`);
      fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.json'), JSON.stringify({
        capturadoEm: new Date().toISOString(),
        origem: { metodo: 'scrape-dom', url: page.url() },
        total: dadosScrape.linhas.length,
        quantidade: dadosScrape.linhas.length,
        cabecalhos: dadosScrape.cabecalhos,
        dados: dadosScrape.linhas,
      }, null, 2), 'utf8');
      fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.csv'), jsonParaCsvComCabecalhos(dadosScrape.linhas, dadosScrape.cabecalhos), 'utf8');
      log('Arquivos salvos em', SAIDA);
      return;
    }
    log('Candidata escolhida:', { url: escolhida.url, method: escolhida.method, totalLinhas: escolhida.totalLinhas, totalRegistros: escolhida.totalRegistros });

    const { dados, total, primeiraResposta } = await baixarTudo(context, escolhida);
    log(`Concluido. Linhas baixadas: ${dados.length}. Total reportado: ${total}`);

    fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.json'), JSON.stringify({
      capturadoEm: new Date().toISOString(),
      origem: { url: escolhida.url, method: escolhida.method },
      total,
      quantidade: dados.length,
      amostraResposta: primeiraResposta,
      dados,
    }, null, 2), 'utf8');

    fs.writeFileSync(path.join(SAIDA, 'produtos-goevo.csv'), jsonParaCsv(dados), 'utf8');
    log('Arquivos salvos em', SAIDA);
  } catch (e) {
    console.error('[falha]', e);
    await page.screenshot({ path: path.join(DEBUG, '99-erro.png'), fullPage: true }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await sleep(1000);
    await browser.close();
  }
})();
