f (Test-Path '" + escTmp + "') { Remove-Item -Force '" + escTmp + "' -ErrorAction SilentlyContinue }",
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('; ');
    const r = await window.Neutralino.os.execCommand('powershell -NoProfile -NonInteractive -Command "' + psCmd.replace(/"/g, '\\"') + '"');
    if (r.exitCode === 0) {
      toast({ tipo: 'sucesso', titulo: 'Atualização', corpo: 'v' + info.version + ' instalada! Reiniciando...' });
      setTimeout(() => window.Neutralino?.app?.restartProcess?.(), 1500);
      return true;
    }
    throw new Error((r.stdErr || r.stdOut || 'PowerShell exit ' + r.exitCode).trim());
  } catch (e) {
    toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Falhou: ' + e.message + '. Baixe manualmente em: ' + info.resourcesURL });
    return false;
  }
}

// withTimeout local (espelha o do db.js mas sem dependencia)
function withTimeout(p, ms, label) {
  return Promise.race([
    p,
    new Promise((_, rej) => setTimeout(() => rej(new Error((label || 'op') + ' timeout ' + ms + 'ms')), ms)),
  ]);
}

export function mostrarAvisoAtualizacao(info) {
  // Toast persistente (10s) com botao "Atualizar"
  const host = document.querySelector('.toast-host') || (() => {
    const h = document.createElement('div');
    h.className = 'toast-host';
    document.body.appendChild(h);
    return h;
  })();
  const tpl = document.getElementById('tpl-toast') || (() => {
    const t = document.createElement('template');
    t.id = 'tpl-toast';
    t.innerHTML = '<div class="toast"></div>';
    document.body.appendChild(t);
    return t;
  })();
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.classList.add('info', 'atualizacao');
  el.innerHTML = `
    <div class="titulo">Nova versÃ£o disponÃ­vel: v${info.version}</div>
    <div class="corpo">${(info.notes || '').substring(0, 200)}</div>
    <div style="display:flex; gap:8px; margin-top:8px;">
      <button class="btn-atualizar" style="flex:1; padding:6px 12px; background:var(--cor-marca); color:#fff; border:none; border-radius:4px; cursor:pointer; font-weight:600;">Atualizar agora</button>
      <button class="btn-depois" style="flex:1; padding:6px 12px; background:transparent; color:var(--fg-3); border:1px solid var(--fg-3); border-radius:4px; cursor:pointer;">Depois</button>
    </div>
  `;
  host.appendChild(el);
  el.querySelector('.btn-atualizar').onclick = () => {
    el.remove();
    aplicarAtualizacao(info);
  };
  el.querySelector('.btn-depois').onclick = () => el.remove();
  // Auto-remove em 30s
  setTimeout(() => el.remove(), 30000);
}

// Checagem periodica em background
let _updateTimer = null;
function agendarVerificacaoAtualizacao() {
  if (_updateTimer) clearInterval(_updateTimer);
  _updateTimer = setInterval(async () => {
    const info = await verificarAtualizacao({ silencioso: true });
    if (info) mostrarAvisoAtualizacao(info);
  }, UPDATE_CHECK_INTERVAL_MS);
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
bootstrap().catch(e => {
  console.error('[app] bootstrap falhou:', e);
  toast({ tipo: 'erro', titulo: 'Falha', corpo: e.message });
});

// Checar atualizacao 5s depois do boot (nao atrasar o carregamento)
setTimeout(async () => {
  const info = await verificarAtualizacao({ silencioso: true });
  if (info) {
    D('[app] nova versao disponivel:', info.version);
    mostrarAvisoAtualizacao(info);
  }
  agendarVerificacaoAtualizacao();
}, 5000);

// Disponibiliza api() globalmente para facilitar testes no console
window.api = api;
window.irPara = irPara;
window.verificarAtualizacao = verificarAtualizacao;
window.aplicarAtualizacao = aplicarAtualizacao;
// src/js/backend/ambiente.js — tudo que toca o sistema operacional
// Conforme PADRAO-ML-LOPES-DESIGN.md §3.1 (arquitetura).
// (sql-wasm.js é UMD e fica em window.initSqlJs; não precisa de import aqui.)

export const sessao = {
  autenticado: false,
  usuario_id: null,
  email: null,
  nome: null,
  token: null,
  dispositivo_id: null,
};

// FIX v0.2.7: considera que esta rodando no app sempre que window.Neutralino existe.
// O vendor nao define app.isNative (vem undefined), entao NO_APP era sempre false,
// e o db caia no fallback localStorage (que e' por origin - porta muda toda execucao,
// faz perder tudo entre aberturas).
const NO_APP = typeof window.Neutralino !== 'undefined';
const APP_ID = 'app.mllopes.gestor';
const BINARY = 'GestorInteligenteDeDemandas';
const DB_FILE = 'gestor.db';
const DATA_SUBDIR = 'dados';

// Resolve APPDATA de verdade. No app, %APPDATA% e' literal, precisa expandir via
// Neutralino.os.getEnv. No browser, process.env nao existe, cai pro fallback.
// FIX v0.2.10: SEMPRE checa window.__appData primeiro (o db.js pode ter setado
// antes da gente). Sem isso, o fallback hardcoded `C:\\Users\\Public\\AppData\\Roaming`
// é retornado e o app grava em localStorage (que tem dados de sessoes antigas
// com IDs de usuarios que nao existem mais).
let _APPDATA_RESOLVIDO = null;
function resolverAppdata() {
  if (_APPDATA_RESOLVIDO) return _APPDATA_RESOLVIDO;
  // 1) Ja foi resolvido pelo app.js e gravado em window.__appData?
  if (typeof window !== 'undefined' && window.__appData) {
    _APPDATA_RESOLVIDO = window.__appData;
    return _APPDATA_RESOLVIDO;
  }
  // 2) Fallback: tenta variavel de ambiente (Node, dev)
  if (typeof process !== 'undefined' && process.env && process.env.APPDATA) {
    _APPDATA_RESOLVIDO = process.env.APPDATA;
    return _APPDATA_RESOLVIDO;
  }
  // 3) Fallback final: NAO usar `C:\\Users\\Public\\AppData\\Roaming`
  // porque esse path nao existe no Windows moderno (Public/ nao tem AppData/).
  // O resultado é o app cair pro localStorage e o seed/banco em disco
  // serem ignorados. Melhor lancar erro e o app mostrar mensagem clara.
  throw new Error('Nao foi possivel resolver APPDATA. O app precisa de Neutralino.os.getEnv("APPDATA") funcional.');
}

export async function resolverAppdataAsync() {
  if (_APPDATA_RESOLVIDO) return _APPDATA_RESOLVIDO;
  // 1) Primeiro checa window.__appData (pode ter sido setado pelo db.js)
  if (typeof window !== 'undefined' && window.__appData) {
    _APPDATA_RESOLVIDO = window.__appData;
    return _APPDATA_RESOLVIDO;
  }
  // 2) Tenta Neutralino.os.getEnv
  if (NO_APP && window.Neutralino?.os?.getEnv) {
    try {
      const v = await Promise.race([
        window.Neutralino.os.getEnv('APPDATA'),
        new Promise(res => setTimeout(() => res(null), 8000)),
      ]);
      if (v && typeof v === 'string' && v.length > 0) {
        _APPDATA_RESOLVIDO = v;
        if (typeof window !== 'undefined') window.__appData = v;
        return v;
      }
    } catch (_) {}
  }
  return resolverAppdata();
}

export const env = {
  noApp: NO_APP,
  appId: APP_ID,
  binary: BINARY,
  dataDir() {
    return `${resolverAppdata()}\\${BINARY}\\${DATA_SUBDIR}`;
  },
  caminhoBanco() {
    return `${this.dataDir()}\\${DB_FILE}`;
  },
  backupDir() {
    return `${this.dataDir()}\\backups`;
  },
  appdataRoot() {
    return `${resolverAppdata()}\\${BINARY}`;
  },
};

// ---------------------------------------------------------------------------
// UI helpers (toast, modal, navegação)
// ---------------------------------------------------------------------------

export function navegar(nome) {
  // Hook simples: o app.js escuta essa mudança e troca a view
  if (typeof window.irPara === 'function' && nome !== window.__rotaAtual) {
    window.__rotaAtual = nome;
    // O app.js implementa irPara; este é um hook para o servidor
    // que precisa atualizar a UI em resposta a evento do backend
  }
  document.dispatchEvent(new CustomEvent('rota', { detail: nome }));
}

export function toast({ tipo = 'info', titulo = '', corpo = '', duracao = 4000 }) {
  let host = document.querySelector('.toast-host');
  if (!host) {
    host = document.createElement('div');
    host.className = 'toast-host';
    document.body.appendChild(host);
  }
  const tpl = document.getElementById('tpl-toast') || (() => {
    const t = document.createElement('template');
    t.id = 'tpl-toast';
    t.innerHTML = '<div class="toast"></div>';
    document.body.appendChild(t);
    return t;
  })();
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.classList.add(tipo);
  el.innerHTML = `<div class="titulo">${escapeHtml(titulo)}</div><div class="corpo">${escapeHtml(corpo)}</div>`;
  host.appendChild(el);
  setTimeout(() => el.remove(), duracao);
}

export function modal({ titulo, corpo, campos = [], acoes = [] }) {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    host.className = 'modal-host';
    const m = document.createElement('div');
    m.className = 'modal';
    let camposHtml = '';
    for (const c of campos) {
      camposHtml += `<div class="campo"><label>${escapeHtml(c.label)}</label>`;
      if (c.tipo === 'textarea') {
        camposHtml += `<textarea name="${c.nome}" rows="3">${escapeHtml(c.valor || '')}</textarea>`;
      } else if (c.tipo === 'select') {
        camposHtml += `<select name="${c.nome}">`;
        for (const o of c.opcoes) {
          camposHtml += `<option value="${escapeAttr(o.valor)}"${o.valor === c.valor ? ' selected' : ''}>${escapeHtml(o.texto)}</option>`;
        }
        camposHtml += `</select>`;
      } else {
        camposHtml += `<input type="${c.tipo || 'text'}" name="${c.nome}" value="${escapeAttr(c.valor || '')}" placeholder="${escapeAttr(c.placeholder || '')}">`;
      }
      camposHtml += `</div>`;
    }
    let acoesHtml = '';
    for (const a of acoes) {
      acoesHtml += `<button data-acao="${escapeAttr(a.valor)}" class="${a.principal ? 'primary' : (a.perigo ? 'danger' : '')}">${escapeHtml(a.texto)}</button>`;
    }
    m.innerHTML = `
      <h2>${escapeHtml(titulo)}</h2>
      ${corpo ? `<p>${escapeHtml(corpo)}</p>` : ''}
      <form id="modal-form">${camposHtml}</form>
      <div class="acoes">${acoesHtml}</div>
    `;
    host.appendChild(m);
    document.body.appendChild(host);
    m.querySelectorAll('button[data-acao]').forEach(b => {
      b.onclick = () => {
        const dados = {};
        m.querySelectorAll('[name]').forEach(i => { dados[i.name] = i.value; });
        const acao = b.dataset.acao;
        host.remove();
        resolve({ acao, dados });
      };
    });
  });
}

export function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeAttr(s) {
  return escapeHtml(s);
}

// ---------------------------------------------------------------------------
// Atualização online (PADRAO §5)
// FIX v0.2.17: REMOVIDAS as funções verificarUpdate() e aplicarUpdate() deste módulo.
// Elas chamavam Neutralino.updater.checkForUpdates() e applyUpdate() que ABRIAM o
// navegador do usuário (Edge) com a URL do manifest do Neutralino. A v0.2.16 só
// removeu do app.js, esqueceu daqui. O fluxo oficial de update é:
//   app.js:verificarAtualizacao()   -> fetch(update.json), sem abrir navegador
//   app.js:aplicarAtualizacao()     -> Neutralino.os.execCommand(powershell)
// ---------------------------------------------------------------------------
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
    throw new Error('Falha ao aplicar s