// src/js/app.js — gateway api() e bootstrap da UI
// Conforme PADRAO-ML-LOPES-DESIGN.md §3.3 (a porta única).
// A tela não sabe se está rodando no app Neutralino ou num terminal em rede.

import { db } from './backend/db.js';
import { servidor } from './backend/servidor.js';
import { sessao, navegar, toast, modal, resolverAppdataAsync } from './backend/ambiente.js';
import { renderHoje } from './telas/hoje.js';

// ---------------------------------------------------------------------------
// Constante NO_APP: estamos rodando dentro do Neutralino (WebView2 local)?
// FIX v0.2.7: vendor nao define app.isNative, entao confiamos em window.Neutralino
// ---------------------------------------------------------------------------
const NO_APP = typeof window.Neutralino !== 'undefined';

// Logs sempre aparecem no console (que vai pro DevTools quando aberto)
// E tbem ficam no localStorage pra inspecao posterior
// E escrevem em arquivo via Neutralino.filesystem pra ler do lado de fora
function D(...args) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ` + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  console.log(line);
  try {
    const arr = JSON.parse(localStorage.getItem('__dbg') || '[]');
    arr.push(line);
    if (arr.length > 100) arr.shift();
    localStorage.setItem('__dbg', JSON.stringify(arr));
  } catch (_) {}
  // Tambem escreve em arquivo (se Neutralino estiver disponivel).
  if (typeof window.Neutralino !== 'undefined' && window.Neutralino?.filesystem) {
    try {
      const logPath = window.__logPath; // resolvido no boot
      if (logPath && logPath !== 'localstorage:__app_log') {
        window.Neutralino.filesystem.readFile(logPath).then((conteudo) => {
          window.Neutralino.filesystem.writeFile(logPath, conteudo + line + '\n');
        }).catch(() => {
          window.Neutralino.filesystem.writeFile(logPath, line + '\n');
        });
      }
    } catch (_) {}
  }
}

// ---------------------------------------------------------------------------
// api() — porta única entre tela e regra (PADRAO §3.3)
// ---------------------------------------------------------------------------
export async function api(canal, payload = {}) {
  if (!sessao.token) {
    // Pega a sessão atual (se o servidor tem)
    try {
      const s = await servidor.processar('sessao:atual', {});
      if (s.ok) Object.assign(sessao, s.dados);
    } catch (_) {}
  }
  try {
    return await servidor.processar(canal, payload, sessao);
  } catch (e) {
    console.error('[api]', canal, e);
    toast({ tipo: 'erro', titulo: 'Erro', corpo: e.message || String(e) });
    return { ok: false, erro: e.message || String(e) };
  }
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
async function bootstrap() {
  // Resolve o APPDATA de verdade (no Windows, %APPDATA% e' literal, precisa
  // expandir via Neutralino.os.getEnv). E' necessario ANTES do db.abrir()
  // porque o caminho do banco depende disso. Se passar APPDATA literal pro
  // Neutralino.filesystem, falha silenciosa e o banco nunca persiste.
  try {
    await resolverAppdataAsync();
    D('[app] APPDATA resolvido:', window.__appData);
  } catch (e) {
    D('[app] ERRO resolver APPDATA:', e.message);
  }

  // Resolve o path do log UMA vez. Tenta no app; se nao der, usa localStorage.
  if (!window.__logPath) {
    if (NO_APP && window.__appData) {
      try {
        const logDir = `${window.__appData}\\GestorInteligenteDeDemandas\\logs`;
        await window.Neutralino.filesystem.createDirectory(logDir).catch(() => {});
        window.__logPath = `${logDir}\\app-debug.log`;
        D('[app] logPath (Neutralino):', window.__logPath);
      } catch (e) {
        D('[app] nao conseguiu resolver logPath no Neutralino:', e.message);
      }
    }
    if (!window.__logPath) {
      // Fallback dev: log em localStorage (so pra debug)
      window.__logPath = 'localstorage:__app_log';
      D('[app] logPath fallback: localStorage');
    }
  }

  D('[app] bootstrap. NO_APP=', NO_APP, 'location=', location.href);
  D('[app] Neutralino?', typeof window.Neutralino, window.Neutralino?.app?.isNative);
  D('[app] logPath=', window.__logPath);

  // 1. Abre o banco (sql.js, sql-wasm.wasm) - com timeout de 60s pra debug
  try {
    D('[app] abrindo banco...');
    await Promise.race([
      db.abrir(),
      new Promise((_, rej) => setTimeout(() => rej(new Error('db.abrir() timeout 60s')), 60000)),
    ]);
    D('[app] banco aberto em', db.caminho);
  } catch (e) {
    D('[app] ERRO abrir banco:', e.message, e.stack);
    mostrarErroBootstrap('Falha ao abrir banco local: ' + (e.message || e));
    return;
  }

  // 2. Carrega identidade.
  // FIX v0.2.9: meta tag app-version no index.html e' a fonte da verdade. Mais confiavel
  // que NEUTRALINO_GLOBALS (pode estar com cache do runtime) ou localStorage (desatualizado).
  let versao = null;
  try {
    const meta = document.querySelector('meta[name="app-version"]');
    if (meta && meta.content) versao = meta.content;
  } catch (_) {}
  if (!versao) versao = window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version;
  if (!versao) {
    try {
      const cached = localStorage.getItem('__app_version');
      if (cached) versao = cached;
    } catch (_) {}
  }
  if (!versao) versao = '0.2.9';
  try { localStorage.setItem('__app_version', versao); } catch (_) {}
  const versaoSpan = document.getElementById('versao-app');
  if (versaoSpan) versaoSpan.textContent = 'v' + versao;
  document.querySelectorAll('.brand-sub').forEach(el => { el.textContent = 'v' + versao; });
  window.__appVersion = versao;

  // 3. Tenta restaurar sessão (com timeout: o WebSocket pode nao estar pronto ainda)
  // Primeiro: checa sessao gravada em localStorage ("Lembrar senha").
  // FIX v0.2.8: mesmo que tenha token no localStorage, valida via sessao:atual
  // (o token pode estar expirado ou a conta pode ter sido recadastrada depois).
  const lembrar = (() => { try { return JSON.parse(localStorage.getItem('gestor-lembrar-sessao') || 'null'); } catch (_) { return null; } })();
  if (lembrar && lembrar.token) {
    // Poe o token no objeto sessao pra que sessao:atual valide contra o banco
    Object.assign(sessao, { token: lembrar.token, email: lembrar.email });
    D('[app] token restaurado do localStorage, validando via sessao:atual...');
  }
  let sessaoResult;
  try {
    sessaoResult = await Promise.race([
      servidor.processar('sessao:atual', {}),
      new Promise(res => setTimeout(() => res({ ok: false, erro: 'timeout 3s' }), 3000)),
    ]);
    D('[app] sessaoResult=', sessaoResult.ok, JSON.stringify(sessaoResult.dados));
  } catch (e) {
    D('[app] ERRO sessao:atual:', e.message, e.stack);
    sessaoResult = { ok: false };
  }
  if (sessaoResult.ok && sessaoResult.dados?.autenticado) {
    Object.assign(sessao, sessaoResult.dados);
    D('[app] chamando irPara(hoje)');
    irPara('hoje');
  } else {
    // Token do localStorage era invalido (ou nao tinha). Limpa pra nao tentar de novo.
    if (lembrar && lembrar.token) {
      D('[app] token do localStorage INVALIDO, limpando');
      try { localStorage.removeItem(LEMBRAR_KEY); } catch (_) {}
    }
    // FIX v0.2.7: se existe o usuario demo no banco e nenhum outro usuario,
    // faz auto-login com o demo pra nao obrigar o usuario a digitar
    // (util para primeira instalacao / teste automatico).
    let autoDemoResult = null;
    try {
      const listaUsers = await servidor.processar('sessao:listarUsuarios', {});
      if (listaUsers.ok && listaUsers.dados && listaUsers.dados.length === 1 && listaUsers.dados[0].email === 'demo@gestor.local') {
        D('[app] auto-login com demo (unico usuario)');
        autoDemoResult = await servidor.processar('auth:login', { email: 'demo@gestor.local', senha: '' });
        if (autoDemoResult.ok) {
          Object.assign(sessao, autoDemoResult.dados);
        }
      }
    } catch (e) {
      D('[app] ERRO auto-demo:', e.message);
    }
    if (autoDemoResult && autoDemoResult.ok) {
      D('[app] auto-demo OK, chamando irPara(hoje)');
      irPara('hoje');
    } else {
      D('[app] chamando irPara(login)');
      irPara('login');
    }
  }

  // 4. Esconde a tela de loading
  document.getElementById('loading-screen')?.remove();
  D('[app] bootstrap OK, loading removido');
}

function mostrarErroBootstrap(msg) {
  D('[app] mostrarErroBootstrap: ' + msg);
  const tela = document.getElementById('app');
  if (!tela) { D('[app] ERRO: #app nao existe!'); return; }
  // Coleta o log de localStorage (mais confiavel que arquivo)
  let logs = '';
  try { logs = JSON.parse(localStorage.getItem('__dbg') || '[]').join('\n'); } catch (_) {}
  let dbLogs = '';
  try { dbLogs = JSON.parse(localStorage.getItem('__dbg_db') || '[]').join('\n'); } catch (_) {}
  tela.innerHTML = `<div style="padding:40px; color:#f44336; font-family:monospace; background:#1e1e1e; color:#ff6b6b; min-height:100vh; overflow:auto;">
    <h2 style="color:#ff6b6b;">Falha ao iniciar</h2>
    <pre style="white-space:pre-wrap; color:#ffaaaa;">${String(msg).replace(/</g, '&lt;')}</pre>
    <h3 style="color:#ffaaaa; margin-top:24px;">Log do app.js:</h3>
    <pre style="white-space:pre-wrap; color:#888; max-height:300px; overflow:auto; font-size:11px;">${logs.replace(/</g, '&lt;')}</pre>
    <h3 style="color:#ffaaaa; margin-top:24px;">Log do db.js:</h3>
    <pre style="white-space:pre-wrap; color:#888; max-height:300px; overflow:auto; font-size:11px;">${dbLogs.replace(/</g, '&lt;')}</pre>
    <p style="color:#888;">Veja tambem %APPDATA%\\GestorInteligenteDeDemandas\\logs\\app-debug.log</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Roteamento interno (entre telas)
// ---------------------------------------------------------------------------
// Cada rota aponta para o modulo real. Carregamento dinamico (lazy) evita
// carregar tudo no boot.
const ROTAS = {
  login:    { titulo: 'Entrar',          render: renderLogin },
  hoje:     { titulo: 'Hoje',            render: () => import('./telas/hoje.js').then(m => m.renderHoje()) },
  inbox:    { titulo: 'Caixa de entrada', render: () => import('./telas/inbox.js').then(m => m.renderInbox()) },
  tarefas:  { titulo: 'Tarefas',          render: () => import('./telas/tarefas.js').then(m => m.renderTarefas()) },
  projetos: { titulo: 'Projetos',         render: () => import('./telas/projetos.js').then(m => m.renderProjetos()) },
  clientes: { titulo: 'Clientes',         render: () => import('./telas/clientes.js').then(m => m.renderClientes()) },
  areas:    { titulo: 'Áreas',             render: () => import('./telas/areas.js').then(m => m.renderAreas()) },
  busca:    { titulo: 'Buscar',            render: () => import('./telas/busca.js').then(m => m.renderBusca()) },
  config:   { titulo: 'Configurações',     render: () => import('./telas/configuracoes.js').then(m => m.renderConfig()) },
};

export function irPara(nome) {
  if (!ROTAS[nome]) {
    console.error('[app] rota desconhecida:', nome);
    return;
  }
  navegar(nome);
  const rota = ROTAS[nome];
  document.querySelectorAll('.sidebar .nav a').forEach(a => {
    a.classList.toggle('ativa', a.dataset.rota === nome);
  });
  const titulo = document.querySelector('.topbar .titulo-tela');
  if (titulo) titulo.textContent = rota.titulo;
  rota.render();
}

// ---------------------------------------------------------------------------
// Telas (placeholders enquanto as outras nao existem)
// ---------------------------------------------------------------------------
// Constante da chave do localStorage pra "Lembrar senha"
const LEMBRAR_KEY = 'gestor-lembrar-sessao';

function renderLogin() {
  const app = document.getElementById('app');
  if (!app) return;

  // Pre-preenche email se tiver gravado
  const salvo = (() => { try { return JSON.parse(localStorage.getItem(LEMBRAR_KEY) || 'null'); } catch (_) { return null; } })();

  app.innerHTML = `
    <div class="login-page">
      <div class="login-card">
        <div class="login-brand">
          <img src="/resources/images/logo-icon.png" alt="Gestor" class="login-logo">
          <div class="login-brand-text">
            <div class="login-titulo">Gestor</div>
            <div class="login-subtitulo">Inteligente de Demandas</div>
          </div>
        </div>

        <div class="login-separador"></div>

        <div class="login-boasvindas">
          <h2>Sua conta</h2>
          <p>Entre com seu email ou crie uma conta nova. A senha e' opcional e fica salva so no seu computador.</p>
        </div>

        <div class="login-form">
          <label>
            <span>Email</span>
            <input type="email" id="login-email" placeholder="seu@email.com" value="${salvo?.email ? escapeAttr(salvo.email) : ''}" autocomplete="username">
          </label>
          <label>
            <span>Senha <em>(opcional)</em></span>
            <input type="password" id="login-senha" placeholder="deixe vazio se cadastrou sem senha" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password">
          </label>

          <label class="login-lembrar">
            <input type="checkbox" id="login-lembrar" ${salvo ? 'checked' : ''}>
            <span>Manter conectado</span>
          </label>

          <div class="login-botoes">
            <button id="btn-login" class="primary">Entrar</button>
            <button id="btn-cadastro">Criar conta</button>
          </div>

          ${salvo ? '<button id="btn-sair-gravado" class="login-sair">Sair da conta gravada (' + escapeHtml(salvo.email) + ')</button>' : ''}
        </div>

        <div class="login-rodape">v${window.__appVersion || '0.2.9'}</div>
      </div>
    </div>
  `;


  const lembrarChecked = () => document.getElementById('login-lembrar').checked;

  const onSuccess = (dados) => {
    Object.assign(sessao, dados);
    if (lembrarChecked()) {
      try { localStorage.setItem(LEMBRAR_KEY, JSON.stringify({ email: dados.email, token: dados.token, expira_em: dados.expira_em })); } catch (_) {}
    } else {
      try { localStorage.removeItem(LEMBRAR_KEY); } catch (_) {}
    }
    irPara('hoje');
  };

  document.getElementById('btn-login').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const r = await window.api('auth:login', { email, senha });
    if (r.ok) onSuccess(r.dados);
    else toast({ tipo: 'erro', titulo: 'Login', corpo: r.erro?.mensagem || 'erro' });
  };
  document.getElementById('btn-cadastro').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const senha = document.getElementById('login-senha').value;
    const nome = email.split('@')[0];
    const r = await window.api('auth:cadastro', { email, senha, nome });
    if (r.ok) onSuccess(r.dados);
    else toast({ tipo: 'erro', titulo: 'Cadastro', corpo: r.erro?.mensagem || 'erro' });
  };
  const btnSair = document.getElementById('btn-sair-gravado');
  if (btnSair) {
    btnSair.onclick = () => {
      try { localStorage.removeItem(LEMBRAR_KEY); } catch (_) {}
      renderLogin();
    };
  }
}

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// ---------------------------------------------------------------------------
// Auto-update via GitHub Releases
// ---------------------------------------------------------------------------
// O `update.json` mora no GitHub Pages ou no release:
// https://mlopesdesign.github.io/gestor-inteligente-de-demandas/update.json
// Formato: { "version": "0.2.7", "notes": "...", "resourcesURL": "https://.../resources.neu" }
const UPDATE_URL = 'https://mlopesdesign.github.io/gestor-inteligente-de-demandas/update.json';
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6h

function compararVersao(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const x = pa[i] || 0, y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

export async function verificarAtualizacao({ silencioso = true } = {}) {
  try {
    const r = await fetch(UPDATE_URL, { cache: 'no-store' });
    if (!r.ok) {
      if (!silencioso) toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Não consegui verificar (' + r.status + ')' });
      return null;
    }
    const info = await r.json();
    const atual = window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.0.0';
    if (!info.version) return null;
    if (compararVersao(info.version, atual) <= 0) {
      if (!silencioso) toast({ tipo: 'info', titulo: 'Atualização', corpo: 'Você já está na versão mais recente (' + atual + ')' });
      return null;
    }
    // Nova versao disponivel!
    return info;
  } catch (e) {
    if (!silencioso) toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Erro: ' + e.message });
    return null;
  }
}

export async function aplicarAtualizacao(info) {
  if (!info || !info.resourcesURL) return false;
  try {
    // 1. Fala pro Neutralino trocar a URL de atualizacao
    if (window.Neutralino?.updater?.setUpdateUrl) {
      await withTimeout(window.Neutralino.updater.setUpdateUrl(info.resourcesURL), 2000, 'setUpdateUrl');
    }
    // 2. Tenta usar o updater nativo do Neutralino
    if (window.Neutralino?.updater?.install) {
      const r = await withTimeout(window.Neutralino.updater.install(), 3000, 'updater.install');
      if (r && r.success !== false) {
        toast({ tipo: 'sucesso', titulo: 'Atualização', corpo: 'Baixando... vai reiniciar.' });
        setTimeout(() => window.Neutralino?.app?.exit?.(), 2000);
        return true;
      }
    }
    // 3. Fallback: abre o link de download no browser
    toast({ tipo: 'info', titulo: 'Atualização', corpo: 'Abrindo download da versão ' + info.version });
    if (window.Neutralino?.os?.open) {
      await withTimeout(window.Neutralino.os.open(info.resourcesURL), 2000, 'os.open');
    } else {
      window.open(info.resourcesURL, '_blank');
    }
    return true;
  } catch (e) {
    toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Falhou: ' + e.message });
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
    <div class="titulo">Nova versão disponível: v${info.version}</div>
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
