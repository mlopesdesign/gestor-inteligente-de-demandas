// src/js/backend/db.js — wrapper do sql.js + migrações + gravação atômica
// Conforme PADRAO-ML-LOPES-DESIGN.md §4 (dados, gravação atômica) + §11 (ordem).
//
// Identidade imutável: %APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db

// sql-wasm.js é UMD (CommonJS + browser global). Carregado por <script> clássico
// em index.html, fica em window.initSqlJs. NÃO usar `import` — o módulo é UMD,
// não ES module, e o import quebra o grafo de módulos do app.
import { env, resolverAppdataAsync } from './ambiente.js';
import { enfileirarMudanca } from './core/sync.js';

let SQL = null;
let dbInstance = null;
let dbPath = null;
let saveTimer = null;

// Diagnostico persistente: tudo que o db faz e' logado em %APPDATA%\GestorInteligenteDeDemandas\logs\db.log
async function diag(msg) {
  const linha = '[' + new Date().toISOString() + '] ' + msg;
  try { console.log(linha); } catch (_) {}
  // TAMBEM escreve no localStorage __dbg_db (chave separada, evita race com __dbg do app.js)
  try {
    const arr = JSON.parse(localStorage.getItem('__dbg_db') || '[]');
    arr.push(linha);
    if (arr.length > 200) arr.shift();
    localStorage.setItem('__dbg_db', JSON.stringify(arr));
  } catch (_) {}
  // FIX v0.2.10: escreve TAMBEM em arquivo de log via Neutralino.os.execCommand
  // (persiste mesmo se o localStorage do WebView2 perder)
  try {
    if (typeof window !== 'undefined' && window.Neutralino?.os?.execCommand) {
      const logPath = (window.__appData || 'C:\\Users\\mlope\\AppData\\Roaming') + '\\GestorInteligenteDeDemandas\\logs\\db.log';
      const escaped = linha.replace(/'/g, "''");
      window.Neutralino.os.execCommand(`echo ${escaped} >> "${logPath}"`, { stdIn: '', stdOut: '', stdErr: '' }).catch(() => {});
    }
  } catch (_) {}
}

// Carrega o WASM do sql.js. Como Neutralino serve /src/ via http,
// pedimos o .wasm explicitamente. Tem fallback de 10s pra evitar travamento.
async function loadSqlJs() {
  if (SQL) return SQL;
  console.log('DB.LOADS: 1 - entrando na funcao');
  diag('loadSqlJs: window.initSqlJs = ' + typeof window.initSqlJs);
  if (typeof window.initSqlJs !== 'function') {
    throw new Error('sql-wasm.js nao foi carregado. index.html precisa ter <script src="/js/vendor/sql-wasm.js"> ANTES de <script type="module" src="/js/app.js">');
  }
  console.log('DB.LOADS: 2 - initSqlJs OK');
  const initSqlJs = window.initSqlJs;
  const wasmUrl = (typeof location !== 'undefined' ? location.origin : 'http://localhost') + '/src/js/vendor/sql-wasm.wasm';
  console.log('DB.LOADS: 3 - wasmUrl =', wasmUrl);
  diag('loadSqlJs: wasmUrl = ' + wasmUrl);
  // Testa se o .wasm é alcançável
  try {
    console.log('DB.LOADS: 4 - vai fazer fetch');
    const r = await fetch(wasmUrl);
    console.log('DB.LOADS: 5 - fetch retornou', r.status, r.headers.get('content-length'));
    diag('loadSqlJs: fetch .wasm status=' + r.status + ' content-length=' + r.headers.get('content-length'));
  } catch (e) {
    console.log('DB.LOADS: 5 - fetch FALHOU:', e.message);
    diag('loadSqlJs: fetch .wasm FALHOU: ' + e.message);
    throw e;
  }
  console.log('DB.LOADS: 6 - vai chamar initSqlJs');
  SQL = await Promise.race([
    initSqlJs({ locateFile: () => wasmUrl }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('loadSqlJs timeout 10s')), 10000)),
  ]);
  console.log('DB.LOADS: 7 - initSqlJs retornou');
  diag('loadSqlJs: SQL inicializado OK');
  return SQL;
}

// Carrega o conteúdo do banco do disco. No Neutralino, isso é via
// Neutralino.filesystem; no navegador puro, IndexedDB ou localStorage.
//
// FIX v0.2.7: usa localStorage se filesystem nao estiver pronto (WebSocket
// nao conecta por causa do bug do neu build). Helper `withTimeout` evita
// pendurar a Promise.
const withTimeout = (p, ms = 1000, label = 'op') =>
  Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label + ' timeout ' + ms + 'ms')), ms)),
  ]);

async function carregarDoDisco() {
  await resolverAppdataAsync();
  const caminho = env.caminhoBanco();
  // Tenta Neutralino.filesystem primeiro (mais robusto, escreve em disco real)
  if (env.noApp && window.Neutralino?.filesystem && typeof window.Neutralino.filesystem.readFile === 'function') {
    try {
      const dir = caminho.substring(0, caminho.lastIndexOf('\\'));
      await withTimeout(window.Neutralino.filesystem.createDirectory(dir).catch(() => {}), 1500, 'createDir');
      // FIX v0.2.10: tenta SEMPRE ler o arquivo. NAO pre-checar stats.size > 0
      // (o stats pode retornar 0 transitoriamente durante gravacao, ou o path
      // pode resolver pra um .tmp stale - e ai o app cria DB novo em memoria
      // e sobreescreve o banco real). Se o readFile falhar, caimos pro localStorage.
      try {
        // FIX v0.2.10: usar readBinaryFile em vez de readFile.
        // readFile decodifica o arquivo como UTF-8, o que CORROMPE arquivos binarios
        // (cada byte > 0x7F vira 2-3 chars UTF-8 multi-byte, e o banco fica "malformed").
        // readBinaryFile retorna os bytes RAW como Uint8Array.
        const data = await withTimeout(
          (window.Neutralino.filesystem.readBinaryFile
            ? window.Neutralino.filesystem.readBinaryFile(caminho)
            : window.Neutralino.filesystem.readFile(caminho)),
          3000, 'readBinaryFile'
        );
        diag('carregarDoDisco: readBinaryFile retornou tipo=' + (data ? typeof data : 'null') + ' ctor=' + (data ? data.constructor.name : 'null') + ' len=' + (data && data.length !== undefined ? data.length : 'null') + ' byteLength=' + (data && data.byteLength !== undefined ? data.byteLength : 'null'));
        if (data) {
          // Converte para Uint8Array
          let arr = null;
          if (data instanceof ArrayBuffer) {
            arr = new Uint8Array(data);
          } else if (data instanceof Uint8Array) {
            arr = new Uint8Array(data.buffer || data, data.byteOffset || 0, data.byteLength || data.length);
          } else if (data.length !== undefined && data.length > 0) {
            arr = Uint8Array.from(data);
          }
          if (arr && arr.length > 0) {
            diag('carregarDoDisco: readBinaryFile OK, ' + arr.length + ' bytes');
            return arr;
          }
          diag('carregarDoDisco: readBinaryFile retornou dados vazios, tentando via certutil');
        }
        diag('carregarDoDisco: readBinaryFile retornou null/vazio, tentando via certutil');
      } catch (eRead) {
        diag('carregarDoDisco: readBinaryFile falhou: ' + eRead.message);
      }
      // FIX v0.2.10: se readFile retornou 0 bytes (bug do Neutralino readFile
      // para arquivos binarios), tenta via certutil -encode que e' confiavel.
      try {
        const b64Tmp = caminho + '.load.b64';
        // Limpa o .load.b64 anterior
        await withTimeout(window.Neutralino.filesystem.remove(b64Tmp).catch(() => {}), 1000, 'rmOldB64');
        const cmd = `certutil -encode "${caminho}" "${b64Tmp}"`;
        const r = await withTimeout(window.Neutralino.os.execCommand(cmd, { stdIn: '', stdOut: '', stdErr: '' }), 10000, 'certutil-encode');
        if (r && (r.exitCode === 0 || (r.stdOut && (r.stdOut.includes('successfully') || r.stdOut.includes('êxito') || r.stdOut.includes('concluído'))))) {
          const b64Content = await withTimeout(window.Neutralino.filesystem.readFile(b64Tmp), 3000, 'readB64');
          await withTimeout(window.Neutralino.filesystem.remove(b64Tmp).catch(() => {}), 1000, 'rmB64Tmp');
          if (b64Content && b64Content.length > 0) {
            // Converte para string e remove header/footer do certutil
            let b64 = '';
            for (let i = 0; i < b64Content.length; i++) b64 += String.fromCharCode(b64Content[i]);
            // Remove header "-----BEGIN CERTIFICATE-----" e footer
            const lines = b64.split(/\r?\n/);
            const filtered = lines.filter(l => !l.startsWith('-----') && !l.startsWith('CertUtil') && l.trim().length > 0);
            b64 = filtered.join('');
            const bin = atob(b64);
            const arr = new Uint8Array(bin.length);
            for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
            if (arr.length > 100) {  // tem que ser > header (16 bytes)
              diag('carregarDoDisco: certutil OK, ' + arr.length + ' bytes');
              return arr;
            }
            diag('carregarDoDisco: certutil retornou poucos bytes: ' + arr.length);
          }
        } else {
          diag('carregarDoDisco: certutil falhou: ' + (r && r.stdErr ? r.stdErr.substring(0, 100) : 'sem retorno'));
        }
      } catch (eCert) {
        diag('carregarDoDisco: certutil erro: ' + eCert.message);
      }
    } catch (e) {
      console.warn('[db] filesystem indisponivel, usando localStorage:', e.message);
    }
  }
  // Fallback: localStorage (com porta fixa, persiste entre execucoes)
  const blob = localStorage.getItem(caminho);
  if (blob && blob.length > 100) {  // precisa ser maior que 100 bytes (header do sqlite)
    try {
      const bin = atob(blob);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      diag('carregarDoDisco: localStorage OK, ' + arr.length + ' bytes');
      return arr;
    } catch (e) {
      console.warn('[db] erro ao decodificar localStorage:', e.message);
    }
  }
  diag('carregarDoDisco: banco nao encontrado, criando novo');
  return null;
}

// Grava o banco no disco. Estrategia simples e confiavel (PADRAO §4.3):
//   1. Escreve os bytes como base64 num .tmp.b64 (string normal, sem problema UTF-8)
//   2. certutil -decode converte pra .tmp binario
//   3. Tenta mover .tmp -> main. Se falhar (main locked), tenta moveOld fallback
// FIX v0.2.10: writeFile e writeBinaryFile do Neutralino as vezes gravam 0 bytes
// para Uint8Array. certutil -encode (no read) e -decode (no write) sao confiaveis.
async function gravarNoDisco(dados) {
  console.log('[db.gravar] noApp=', env.noApp, 'filesystem=', typeof (window.Neutralino && window.Neutralino.filesystem), 'dados.length=', dados.length);
  await resolverAppdataAsync();
  const caminho = env.caminhoBanco();
  if (env.noApp && window.Neutralino?.filesystem && typeof window.Neutralino.filesystem.writeFile === 'function') {
    try {
      const dir = caminho.substring(0, caminho.lastIndexOf('\\'));
      await withTimeout(window.Neutralino.filesystem.createDirectory(dir).catch(() => {}), 1500, 'createDir');
      const tmp = caminho + '.tmp';
      const b64File = caminho + '.tmp.b64';
      // Limpa arquivos stale primeiro
      await withTimeout(window.Neutralino.filesystem.remove(tmp).catch(() => {}), 500, 'rmTmp');
      await withTimeout(window.Neutralino.filesystem.remove(b64File).catch(() => {}), 500, 'rmB64');
      await withTimeout(window.Neutralino.filesystem.remove(caminho + '.old').catch(() => {}), 500, 'rmOld');
      // Converte os bytes pra base64 (Latin-1 safe)
      let bin = '';
      for (let i = 0; i < dados.length; i++) bin += String.fromCharCode(dados[i]);
      const b64 = btoa(bin);
      // Escreve base64
      await withTimeout(window.Neutralino.filesystem.writeFile(b64File, b64), 5000, 'writeB64');
      // certutil -decode b64 -> binario
      const cmd = `certutil -decode "${b64File}" "${tmp}"`;
      const r = await withTimeout(window.Neutralino.os.execCommand(cmd, { stdIn: '', stdOut: '', stdErr: '' }), 10000, 'certutil-decode');
      if (r && (r.exitCode === 0 || (r.stdOut && (r.stdOut.includes('successfully') || r.stdOut.includes('êxito') || r.stdOut.includes('concluído'))))) {
        const check2 = await withTimeout(window.Neutralino.filesystem.getStats(tmp).catch(() => null), 1500, 'check2');
        if (check2 && check2.size > 0) {
          // Substitui main. Tenta move direto, se falhar tenta moveOld fallback
          try { await withTimeout(window.Neutralino.filesystem.remove(caminho).catch(() => {}), 1000, 'rmMain'); } catch (_) {}
          try {
            await withTimeout(window.Neutralino.filesystem.move(tmp, caminho), 3000, 'moveNew');
            await withTimeout(window.Neutralino.filesystem.remove(b64File).catch(() => {}), 500, 'rmB64');
            console.log('[db.gravar] SUCESSO via certutil+move, size=', check2.size);
            diag('gravarNoDisco: SUCESSO via certutil+move, size=' + check2.size);
            return;
          } catch (eMove) {
            // Fallback: move main -> .old, move .tmp -> main
            try {
              await withTimeout(window.Neutralino.filesystem.move(caminho, caminho + '.old').catch(() => {}), 1000, 'moveOld');
              await withTimeout(window.Neutralino.filesystem.move(tmp, caminho), 1000, 'moveNew');
              await withTimeout(window.Neutralino.filesystem.remove(caminho + '.old').catch(() => {}), 500, 'rmOld');
              await withTimeout(window.Neutralino.filesystem.remove(b64File).catch(() => {}), 500, 'rmB64');
              console.log('[db.gravar] SUCESSO via certutil+moveOld, size=', check2.size);
              diag('gravarNoDisco: SUCESSO via certutil+moveOld, size=' + check2.size);
              return;
            } catch (e2) {
              console.warn('[db.gravar] move falhou:', eMove.message, '| retry:', e2.message);
              diag('gravarNoDisco: move falhou: ' + eMove.message);
            }
          }
        } else {
          diag('gravarNoDisco: check2.size=' + (check2 ? check2.size : 'null'));
        }
      } else {
        console.warn('[db.gravar] certutil falhou:', r && r.stdErr ? r.stdErr.substring(0, 200) : 'sem retorno');
        diag('gravarNoDisco: certutil falhou: ' + (r && r.stdErr ? r.stdErr.substring(0, 100) : 'sem retorno'));
      }
      throw new Error('todos os fallbacks falharam');
    } catch (e) {
      console.warn('[db.gravar] filesystem falhou, caindo no localStorage:', e.message);
      diag('gravarNoDisco: filesystem falhou: ' + e.message);
    }
  }
  // Fallback: localStorage
  console.log('[db.gravar] usando localStorage');
  let bin = '';
  for (let i = 0; i < dados.length; i++) bin += String.fromCharCode(dados[i]);
  try {
    localStorage.setItem(caminho, btoa(bin));
    console.log('[db.gravar] SUCESSO via localStorage,', dados.length, 'bytes');
  } catch (e) {
    console.error('[db.gravar] localStorage tambem falhou:', e.message);
  }
}

// Migra o schema (PADRAO §4.5). O schema.sql tem CREATE TABLE, CREATE INDEX e
// CREATE TRIGGER (com BEGIN...END; interno), entao split por ';' nao funciona.
// O sql.js expoe Database.exec() que aceita o schema INTEIRO em uma so chamada
// e processa statement-por-statement corretamente.
let schemaAplicado = false;
async function migrar() {
  if (schemaAplicado) return;
  const res = await Promise.race([
    fetch('/src/schema.sql'),
    new Promise((_, rej) => setTimeout(() => rej(new Error('fetch schema.sql timeout 5s')), 5000)),
  ]);
  if (!res.ok) throw new Error('schema.sql nao encontrado no /src/');
  const sql = await res.text();
  try {
    // exec() retorna array de results; se algum statement falhar ele joga
    dbInstance.exec(sql);
  } catch (e) {
    throw new Error('Falha ao aplicar schema: ' + e.message);
  }
  // FIX v0.2.8: migra banco existente adicionando as 6 colunas novas da tabela tarefas
  // (cancelada_em, cancelada_motivo, adiada_ate, adiada_motivo, recorrencia_tipo,
  // recorrencia_data_base) que o schema.sql passou a referenciar mas a migracao
  // CREATE TABLE IF NOT EXISTS nao adiciona coluna em tabela ja existente.
  // Idempotente: se a coluna ja existe, da erro e ignoramos.
  const colunasNovas = [
    ['cancelada_em',          'TEXT'],
    ['cancelada_motivo',      'TEXT'],
    ['adiada_ate',            'TEXT'],
    ['adiada_motivo',         'TEXT'],
    ['recorrencia_tipo',      'TEXT'],
    ['recorrencia_data_base', 'TEXT'],
  ];
  for (const [col, tipo] of colunasNovas) {
    try {
      dbInstance.exec(`ALTER TABLE tarefas ADD COLUMN ${col} ${tipo}`);
      console.log('[db.migrar] coluna tarefas.' + col + ' adicionada');
    } catch (_) {
      // coluna ja existe - ignora
    }
  }
  // FIX v0.2.47: a migration one-shot foi MOVIDA para a funcao
  // exportada `enfileirarDadosLegados(usuarioId)` abaixo. E' chamada
  // pelo app.js DEPOIS do login (e pelo botao "Lembrar de mim" e pelo
  // auto-demo). Dentro do migrar() ainda tentamos rodar com o que
  // tivermos em maos (sessionStorage), mas a sessao de verdade so e'
  // hidratada depois de `sessao:atual`.
  await enfileirarDadosLegados();
  schemaAplicado = true;
}

/**
 * FIX v0.2.47: enfileira TODAS as areas/projetos/clientes/tarefas locais
 * que ainda nao foram enfileiradas no PUSH. Idempotente por tabela.
 *
 * E' chamada:
 *   - DEPOIS do login (em app.js), tanto no caminho "Lembrar de mim"
 *     quanto no auto-demo.
 *   - Aqui dentro de migrar() (com a sessao ainda nao hidratada, entao
 *     normalmente cai no early-return).
 *
 * Bugs do v0.2.40 (que o verifier achou):
 *  (a) `dbInstance.exec()` raw retornava `Query Results[]` em vez de
 *      `{ok, dados}` — todas as checagens de r.ok davam undefined => skip.
 *  (b) `enfileirarMudanca(dbInstance, ...)` passava o cru, mas a funcao
 *      chama `db.exec()` que tem `_agendarGravacao`. Sem o wrapper, a
 *      sync_mudancas nao era persistida no .db.
 *  (c) Canal `db:enfileirarDadosLegados` nao estava no PERM_ROTA, entao
 *      `servidor.processar()` retornava SEM_PERMISSAO antes mesmo de
 *      chamar a funcao.
 *
 * v0.2.47: usa o WRAPPER `db` (com `{ok, dados}`) + enfileirarMudanca(db, ...)
 * e recebe o usuarioId explicitamente. Servidor registra o canal em
 * `permissoes.js` (`'db:enfileirarDadosLegados': 'SYNC'`).
 */
export async function enfileirarDadosLegados(usuarioId) {
  if (!dbInstance) return { ok: false, erro: { codigo: 'DB_NAO_INICIALIZADO' } };
  // Se nao recebeu usuarioId, tenta pegar de varios lugares
  if (!usuarioId) {
    try {
      if (window.__sessao?.usuario_id) usuarioId = window.__sessao.usuario_id;
      else if (window.sessao?.usuario_id) usuarioId = window.sessao.usuario_id;
      else {
        const raw = sessionStorage.getItem('gestor.sessao') || localStorage.getItem('gestor.sessao');
        if (raw) {
          const parsed = JSON.parse(raw);
          usuarioId = parsed?.usuario_id || parsed?.dados?.usuario_id || null;
        }
      }
    } catch (_) {}
  }
  if (!usuarioId) {
    diag('[db.enfileirarDadosLegados] sem usuarioId, nada a fazer (rodara depois do login)');
    return { ok: false, erro: { codigo: 'USUARIO_NAO_INFORMADO' } };
  }
  const tabelas = ['areas', 'projetos', 'clientes', 'tarefas'];
  const log = (...a) => { try { console.log('[db.enfileirarDadosLegados]', ...a); diag('[db.enfileirarDadosLegados] ' + a.join(' ')); } catch (_) {} };
  log('rodando para usuario', usuarioId);
  let total = 0;
  for (const tabela of tabelas) {
    // idempotencia: ja tem mudanca enfileirada pra essa tabela?
    const countR = db.exec(
      `SELECT COUNT(*) AS n FROM sync_mudancas WHERE usuario_id = ? AND tabela = ?`,
      [usuarioId, tabela]
    );
    const jaEnfileiradas = countR.ok && ((countR.dados[0]?.n ?? 0) > 0);
    if (jaEnfileiradas) {
      log(`tabela ${tabela} ja tem mudancas enfileiradas, pulando`);
      continue;
    }
    // existe coluna deleted_at?
    let temDeletedAt = false;
    try {
      const pragma = db.exec(`PRAGMA table_info(${tabela})`);
      if (pragma.ok && Array.isArray(pragma.dados)) {
        for (const c of pragma.dados) {
          // c pode ser {cid, name, type, ...} (objeto) ou [cid, name, ...] (array)
          const nome = c && (c.name || (Array.isArray(c) ? c[1] : null));
          if (nome === 'deleted_at') { temDeletedAt = true; break; }
        }
      }
    } catch (_) { temDeletedAt = false; }
    const where = temDeletedAt
      ? `SELECT * FROM ${tabela} WHERE usuario_id = ? AND deleted_at IS NULL`
      : `SELECT * FROM ${tabela} WHERE usuario_id = ?`;
    const r = db.exec(where, [usuarioId]);
    if (!r.ok) { log(`SELECT ${tabela} falhou: ${r.erro}`); continue; }
    if (r.dados.length === 0) { log(`tabela ${tabela} sem dados locais, pulando`); continue; }
    let count = 0;
    for (const row of r.dados) {
      // row ja vem como OBJETO (getAsObject no wrapper)
      const ret = enfileirarMudanca(db, { usuario_id: usuarioId }, tabela, 'UPSERT', row.id, row.versao || 1, row);
      if (ret?.ok) count++; else log(`enfileirar ${tabela}/${row.id} falhou: ${JSON.stringify(ret)}`);
    }
    total += count;
    log(`enfileiradas ${count} mudancas de ${tabela}`);
  }
  // forca gravacao pra sync_mudancas nao se perder no debounce
  try { await db.salvarAgora(); } catch (e) { log('salvarAgora falhou: ' + e.message); }
  log('fim totalEnfileiradas=' + total);
  return { ok: true, dados: { enfileiradas: total } };
}

// API pública do db.
export const db = {
  async abrir() {
    if (dbInstance) return dbInstance;
    // SEM await no primeiro diag pra evitar qualquer travamento
    diag('db.abrir() inicio [sem await]');
    console.log('DB: abrir() chamado');

    // FIX v0.2.7: define __appData como mlope/AppData pra que tanto o sync
    // quanto o async vejam o mesmo caminho. Antes o fallback era
    // C:\Users\Public\AppData\Roaming que nao funciona (sem permissao).
    window.__appData = 'C:\\Users\\mlope\\AppData\\Roaming';
    console.log('DB: __appData =', window.__appData);

    dbPath = env.caminhoBanco();
    console.log('DB: dbPath =', dbPath);
    diag('dbPath=' + dbPath);

    try {
      diag('VAI chamar loadSqlJs');
      const Sql = await loadSqlJs();
      diag('loadSqlJs OK');
      const buf = await carregarDoDisco();
      diag('carregarDoDisco: buf=' + (buf ? buf.length + ' bytes' : 'null (banco novo)'));
      dbInstance = buf ? new Sql.Database(buf) : new Sql.Database();
      diag('sql.js Database criado');
      await migrar();
      diag('migrar OK');
      const r = dbInstance.exec("SELECT COUNT(*) as c FROM usuarios");
      diag('SELECT COUNT usuarios: ' + JSON.stringify(r));
      if (!r[0] || r[0].values[0][0] === 0) {
        diag('semeando demo');
        semearDemo();
        diag('demo semeado');
      }
      await db.salvarAgora();
      diag('salvarAgora OK, dbPath=' + dbPath);
    } catch (e) {
      diag('ERRO db.abrir(): ' + e.message + '\n' + (e.stack || ''));
      throw e;
    }
    return dbInstance;
  },

  get instance() { return dbInstance; },
  get caminho() { return dbPath; },

  // Executa uma query e devolve { ok, dados, erro }
  // Para SELECT: dados = rows. Para INSERT/UPDATE/DELETE: dados = { changes, lastInsertRowid }.
  exec(sql, params = []) {
    if (!dbInstance) throw new Error('db nao aberto');
    try {
      if (/^\s*select/i.test(sql)) {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return { ok: true, dados: rows };
      } else {
        const stmt = dbInstance.prepare(sql);
        stmt.bind(params);
        stmt.step();
        stmt.free();
        // Persiste (com debounce de 300ms, PADRAO §4.1)
        this._agendarGravacao();
        return { ok: true, dados: { changes: dbInstance.getRowsModified() } };
      }
    } catch (e) {
      return { ok: false, erro: e.message };
    }
  },

  // Executa várias ops em transação
  transacao(ops) {
    if (!dbInstance) throw new Error('db nao aberto');
    dbInstance.exec('BEGIN');
    try {
      const r = ops.map(op => this.exec(op.sql, op.params));
      if (r.some(x => !x.ok)) throw new Error('transacao: uma das ops falhou');
      dbInstance.exec('COMMIT');
      this._agendarGravacao();
      return { ok: true, dados: r };
    } catch (e) {
      dbInstance.exec('ROLLBACK');
      return { ok: false, erro: e.message };
    }
  },

  _agendarGravacao() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => this.salvarAgora(), 300);
  },

  async salvarAgora() {
    if (!dbInstance) return;
    const data = dbInstance.export();
    await gravarNoDisco(data);
  },

  // Recupera de .old ou .tmp se o principal sumiu (PADRAO §4.3)
  async recuperar() {
    if (env.noApp && window.Neutralino?.filesystem) {
      for (const ext of ['.old', '.tmp']) {
        const alt = env.caminhoBanco() + ext;
        try {
          const existe = await window.Neutralino.filesystem.getStats(alt);
          if (existe && existe.size > 0) {
            console.warn('[db] banco principal faltando, restaurando de', ext);
            await window.Neutralino.filesystem.move(alt, env.caminhoBanco());
            return true;
          }
        } catch (_) {}
      }
    }
    return false;
  },

  async fechar() {
    if (saveTimer) clearTimeout(saveTimer);
    if (dbInstance) {
      await this.salvarAgora();
      dbInstance.close();
      dbInstance = null;
    }
  },
};

// Semeia dados de demonstração (só se banco vazio)
function semearDemo() {
  const agora = new Date().toISOString();
  const uid = '01DEMO' + Math.random().toString(36).slice(2, 12).toUpperCase();
  dbInstance.exec("INSERT INTO usuarios(id, email, senha_hash, nome, criado_em, atualizado_em, versao, dono_id) VALUES(?,?,?,?,?,?,1,?)", [
    uid, 'demo@gestor.local', 'd75c96ac1f418d460d6da30f679a17ae9899cca27c154c43893ae112af74c7f5', 'Demo', agora, agora, uid
  ]);
  const areas = [
    { id: '01AREAT1', nome: 'Trabalho',   cor: '#f0a000' },
    { id: '01AREAP1', nome: 'Pessoal',    cor: '#03a9f4' },
    { id: '01AREAD1', nome: 'Desenvolvimento', cor: '#9c27b0' },
  ];
  for (const a of areas) {
    dbInstance.exec("INSERT INTO areas(id, usuario_id, dono_id, nome, cor, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,1)", [a.id, uid, uid, a.nome, a.cor, agora, agora]);
    // FIX v0.2.40/47: enfileirar mudanca pro sync enviar pro WP.
    // BUG historico: passava `dbInstance` (cru), mas enfileirarMudanca() chama
    // db.exec() que precisa do WRAPPER `db` (tem _agendarGravacao no INSERT).
    // Resultado: sync_mudancas nao persistia no .db e PUSH nao tinha o que enviar.
    enfileirarMudanca(db, { usuario_id: uid }, 'areas', 'UPSERT', a.id, 1, {
      id: a.id, nome: a.nome, cor: a.cor, criado_em: agora, atualizado_em: agora, versao: 1
    });
  }
  const tarefas = [
    { titulo: 'Revisar proposta do cliente Cenário Alagoas',  status: 'CAIXA_ENTRADA', prioridade: 'ALTA',     nivel: 'PERSISTENTE', area: '01AREAT1', venc: null },
    { titulo: 'Atualizar tema do portal cenárioalagoas.com.br', status: 'EM_ANDAMENTO',  prioridade: 'URGENTE',  nivel: 'INTENSIVA',   area: '01AREAT1', venc: '2026-08-10T12:00:00Z' },
    { titulo: 'Pagar boleto MLopes Finance',                   status: 'PLANEJADA',     prioridade: 'NORMAL',   nivel: 'PERSISTENTE', area: '01AREAP1', venc: '2026-08-20T12:00:00Z' },
    { titulo: 'Ligar para contador',                            status: 'AGUARDANDO_TERCEIRO', prioridade: 'NORMAL', nivel: 'PERSISTENTE', area: '01AREAP1', venc: null },
    { titulo: 'Estudar ADR 0002 (sincronização)',               status: 'CAIXA_ENTRADA', prioridade: 'BAIXA',    nivel: 'DISCRETA',    area: '01AREAD1', venc: null },
  ];
  for (const t of tarefas) {
    const id = '01TASK' + Math.random().toString(36).slice(2, 12).toUpperCase();
    dbInstance.exec(
      `INSERT INTO tarefas(id, usuario_id, dono_id, titulo, status, prioridade, nivel_cobranca, area_id, vencimento_em, criado_em, atualizado_em, versao)
       VALUES(?,?,?,?,?,?,?,?,?,?,?,1)`,
      [id, uid, uid, t.titulo, t.status, t.prioridade, t.nivel, t.area, t.venc, agora, agora]
    );
    // FIX v0.2.40/47: enfileirar mudanca pro sync enviar pro WP.
    // (v0.2.40 passava dbInstance cru — mesmo bug que areas acima)
    enfileirarMudanca(db, { usuario_id: uid }, 'tarefas', 'UPSERT', id, 1, {
      id, titulo: t.titulo, status: t.status, prioridade: t.prioridade,
      nivel_cobranca: t.nivel, area_id: t.area, vencimento_em: t.venc,
      criado_em: agora, atualizado_em: agora, versao: 1
    });
  }
  console.log('[db] dados de demo semeados para', uid);
  // Salva imediatamente pra que o demo persista
  setTimeout(() => db.salvarAgora(), 100);
}
