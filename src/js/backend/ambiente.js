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
  // 3) Fallback final: valor hardcoded razoavel (dev / browser)
  _APPDATA_RESOLVIDO = 'C:\\Users\\Public\\AppData\\Roaming';
  return _APPDATA_RESOLVIDO;
}

export async function resolverAppdataAsync() {
  if (_APPDATA_RESOLVIDO) return _APPDATA_RESOLVIDO;
  if (NO_APP && window.Neutralino?.os?.getEnv) {
    try {
      const v = await Promise.race([
        window.Neutralino.os.getEnv('APPDATA'),
        new Promise(res => setTimeout(() => res(null), 5000)),
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
// ---------------------------------------------------------------------------

export async function verificarUpdate() {
  if (!NO_APP || !window.Neutralino?.updater) {
    return { ok: false, motivo: 'fora do app' };
  }
  try {
    const info = await window.Neutralino.updater.checkForUpdates();
    return { ok: true, dados: info };
  } catch (e) {
    return { ok: false, erro: e.message };
  }
}

export async function aplicarUpdate() {
  if (!NO_APP || !window.Neutralino?.updater) return false;
  try {
    // 1. Backup do banco antes (PADRAO §5.2)
    await db.salvarAgora();
    // 2. Aplica update
    await window.Neutralino.updater.applyUpdate();
    // 3. Reinicia
    setTimeout(() => window.Neutralino?.app?.restart?.(), 1000);
    return true;
  } catch (e) {
    toast({ tipo: 'erro', titulo: 'Update', corpo: e.message });
    return false;
  }
}
