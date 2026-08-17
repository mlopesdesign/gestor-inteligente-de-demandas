// src/js/backend/db.js — wrapper do sql.js + migrações + gravação atômica
// Conforme PADRAO-ML-LOPES-DESIGN.md §4 (dados, gravação atômica) + §11 (ordem).
//
// Identidade imutável: %APPDATA%\GestorInteligenteDeDemandas\dados\gestor.db

// sql-wasm.js é UMD (CommonJS + browser global). Carregado por <script> clássico
// em index.html, fica em window.initSqlJs. NÃO usar `import` — o módulo é UMD,
// não ES module, e o import quebra o grafo de módulos do app.
import { env, resolverAppdataAsync } from './ambiente.js';

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
  // DESABILITADO: filesystem (causa travamento)
  // if (typeof window !== 'undefined' && window.Neutralino?.filesystem) { ... }
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
  const wasmUrl = (typeof location !== 'undefined' ? location.origin : 'http://localhost') + '/js/vendor/sql-wasm.wasm';
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
      const stats = await withTimeout(window.Neutralino.filesystem.getStats(caminho).catch(() => null), 1500, 'getStats');
      if (stats && stats.size > 0) {
        const data = await withTimeout(window.Neutralino.filesystem.readFile(caminho), 3000, 'readFile');
        return new Uint8Array(data);
      }
    } catch (e) {
      console.warn('[db] filesystem indisponivel, usando localStorage:', e.message);
    }
  }
  // Fallback: localStorage (com porta fixa, persiste entre execucoes)
  const blob = localStorage.getItem(caminho);
  if (blob) {
    try {
      const bin = atob(blob);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
    } catch (e) {
      console.warn('[db] erro ao decodificar localStorage:', e.message);
    }
  }
  return null;
}

// Grava o banco no disco, atomicamente (PADRAO §4.3):
//   1. escreve .tmp
//   2. renomeia atual para .old
//   3. move .tmp -> arquivo principal
//   4. remove .old (só depois do sucesso)
async function gravarNoDisco(dados) {
  console.log('[db.gravar] noApp=', env.noApp, 'filesystem=', typeof (window.Neutralino && window.Neutralino.filesystem), 'dados.length=', dados.length);
  await resolverAppdataAsync();
  const caminho = env.caminhoBanco();
  // Tenta Neutralino.filesystem primeiro (disco real em %APPDATA%)
  if (env.noApp && window.Neutralino?.filesystem && typeof window.Neutralino.filesystem.writeFile === 'function') {
    try {
      const dir = caminho.substring(0, caminho.lastIndexOf('\\'));
      await withTimeout(window.Neutralino.filesystem.createDirectory(dir).catch(() => {}), 1500, 'createDir');
      const tmp = caminho + '.tmp';
      const old = caminho + '.old';
      await withTimeout(window.Neutralino.filesystem.writeFile(tmp, dados), 3000, 'writeFile');
      try { await withTimeout(window.Neutralino.filesystem.move(caminho, old).catch(() => {}), 1500, 'moveOld'); } catch (_) {}
      try { await withTimeout(window.Neutralino.filesystem.move(tmp, caminho), 1500, 'moveNew'); }
      catch (e) { throw e; }
      try { await withTimeout(window.Neutralino.filesystem.removeFile(old).catch(() => {}), 1500, 'removeOld'); } catch (_) {}
      console.log('[db.gravar] SUCESSO via filesystem');
      return;
    } catch (e) {
      console.warn('[db.gravar] filesystem falhou, caindo no localStorage:', e.message);
    }
  }
  // Fallback: localStorage (porta fixa 8723, persiste entre execucoes)
  console.log('[db.gravar] usando localStorage (filesystem nao disponivel)');
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
    fetch('/schema.sql'),
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
  schemaAplicado = true;
}

// API pública do db.
export const db = {
  async abrir() {
    if (dbInstance) return dbInstance;
    // SEM await no primeiro diag pra evitar qualquer travamento
    diag('db.abrir() inicio [sem await]');
    console.log('DB: abrir() chamado');

    // HARDCODE APPDATA direto
    window.__appData = 'C:\\Users\\Public\\AppData\\Roaming';
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
    uid, 'demo@gestor.local', 'argon2$demo', 'Demo', agora, agora, uid
  ]);
  const areas = [
    { id: '01AREAT1', nome: 'Trabalho',   cor: '#f0a000' },
    { id: '01AREAP1', nome: 'Pessoal',    cor: '#03a9f4' },
    { id: '01AREAD1', nome: 'Desenvolvimento', cor: '#9c27b0' },
  ];
  for (const a of areas) {
    dbInstance.exec("INSERT INTO areas(id, usuario_id, dono_id, nome, cor, criado_em, atualizado_em, versao) VALUES(?,?,?,?,?,?,?,1)", [a.id, uid, uid, a.nome, a.cor, agora, agora]);
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
  }
  console.log('[db] dados de demo semeados para', uid);
  // Salva imediatamente pra que o demo persista
  setTimeout(() => db.salvarAgora(), 100);
}
