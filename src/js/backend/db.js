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
  const linha = '[' + new Date().toISOString() + '] ' + msg + '\n';
  try { console.log(linha.trim()); } catch (_) {}
  if (typeof window !== 'undefined' && window.Neutralino?.filesystem) {
    try {
      await resolverAppdataAsync();
      const logDir = env.appdataRoot() + '\\logs';
      await window.Neutralino.filesystem.createDirectory(logDir).catch(() => {});
      const logFile = logDir + '\\db.log';
      let conteudo = '';
      try { conteudo = await window.Neutralino.filesystem.readFile(logFile); } catch (_) {}
      await window.Neutralino.filesystem.writeFile(logFile, conteudo + linha);
    } catch (e) { /* sem log, sem drama */ }
  }
}

// Carrega o WASM do sql.js. Como Neutralino serve /src/ via http,
// pedimos o .wasm explicitamente.
async function loadSqlJs() {
  if (SQL) return SQL;
  if (typeof window.initSqlJs !== 'function') {
    throw new Error('sql-wasm.js nao foi carregado. index.html precisa ter <script src="/js/vendor/sql-wasm.js"> ANTES de <script type="module" src="/js/app.js">');
  }
  const initSqlJs = window.initSqlJs;
  const wasmUrl = (typeof location !== 'undefined' ? location.origin : 'http://localhost') + '/js/vendor/sql-wasm.wasm';
  SQL = await initSqlJs({
    locateFile: () => wasmUrl,
  });
  return SQL;
}

// Carrega o conteúdo do banco do disco. No Neutralino, isso é via
// Neutralino.filesystem; no navegador puro, IndexedDB ou localStorage.
async function carregarDoDisco() {
  await resolverAppdataAsync();
  const caminho = env.caminhoBanco();
  if (env.noApp && window.Neutralino?.filesystem) {
    try {
      // Garante que o diretório existe (pode nao ter sido criado antes)
      const dir = caminho.substring(0, caminho.lastIndexOf('\\'));
      await window.Neutralino.filesystem.createDirectory(dir).catch(() => {});
      const existe = await window.Neutralino.filesystem.getStats(caminho).catch(() => null);
      if (existe && existe.size > 0) {
        const data = await window.Neutralino.filesystem.readFile(caminho);
        return new Uint8Array(data);
      }
    } catch (e) {
      console.warn('[db] nao conseguiu ler do disco, comecando vazio:', e.message);
    }
  } else {
    // Browser: usa localStorage como storage cru (dev only)
    const blob = localStorage.getItem(caminho);
    if (blob) {
      const bin = atob(blob);
      const arr = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
      return arr;
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
  await resolverAppdataAsync();
  const caminho = env.caminhoBanco();
  if (env.noApp && window.Neutralino?.filesystem) {
    const dir = caminho.substring(0, caminho.lastIndexOf('\\'));
    await window.Neutralino.filesystem.createDirectory(dir).catch(() => {});
    const tmp = caminho + '.tmp';
    const old = caminho + '.old';
    try { await window.Neutralino.filesystem.writeFile(tmp, dados); } catch (e) { console.error('[db] writeFile tmp falhou:', e); throw e; }
    try { await window.Neutralino.filesystem.move(caminho, old); } catch (_) { /* pode nao existir ainda */ }
    try { await window.Neutralino.filesystem.move(tmp, caminho); } catch (e) { console.error('[db] move tmp->principal falhou:', e); throw e; }
    try { await window.Neutralino.filesystem.removeFile(old); } catch (_) {}
  } else {
    let bin = '';
    for (let i = 0; i < dados.length; i++) bin += String.fromCharCode(dados[i]);
    localStorage.setItem(caminho, btoa(bin));
  }
}

// Migra o schema (PADRAO §4.5). O schema.sql tem CREATE TABLE, CREATE INDEX e
// CREATE TRIGGER (com BEGIN...END; interno), entao split por ';' nao funciona.
// O sql.js expoe Database.exec() que aceita o schema INTEIRO em uma so chamada
// e processa statement-por-statement corretamente.
let schemaAplicado = false;
async function migrar() {
  if (schemaAplicado) return;
  const res = await fetch('/schema.sql');
  if (!res.ok) throw new Error('schema.sql nao encontrado no /src/');
  const sql = await res.text();
  try {
    // exec() retorna array de results; se algum statement falhar ele joga
    dbInstance.exec(sql);
  } catch (e) {
    throw new Error('Falha ao aplicar schema: ' + e.message);
  }
  schemaAplicado = true;
}

// API pública do db.
export const db = {
  async abrir() {
    if (dbInstance) return dbInstance;
    await diag('db.abrir() inicio');
    // Garante que APPDATA foi resolvido antes de calcular o caminho
    await resolverAppdataAsync();
    dbPath = env.caminhoBanco();
    await diag('dbPath=' + dbPath);
    try {
      const Sql = await loadSqlJs();
      await diag('loadSqlJs OK');
      const buf = await carregarDoDisco();
      await diag('carregarDoDisco: buf=' + (buf ? buf.length + ' bytes' : 'null (banco novo)'));
      dbInstance = buf ? new Sql.Database(buf) : new Sql.Database();
      await diag('sql.js Database criado');
      await migrar();
      await diag('migrar OK');
      // Semeia dados de demo se o banco está vazio
      const r = dbInstance.exec("SELECT COUNT(*) as c FROM usuarios");
      await diag('SELECT COUNT usuarios: ' + JSON.stringify(r));
      if (!r[0] || r[0].values[0][0] === 0) {
        await diag('semeando demo');
        semearDemo();
        await diag('demo semeado');
      }
      // Forca gravacao inicial
      await salvarAgora();
      await diag('salvarAgora OK, dbPath=' + dbPath);
    } catch (e) {
      await diag('ERRO db.abrir(): ' + e.message + '\n' + (e.stack || ''));
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
