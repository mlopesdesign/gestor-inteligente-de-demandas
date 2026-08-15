// src/js/app.js — gateway api() e bootstrap da UI
// Conforme PADRAO-ML-LOPES-DESIGN.md §3.3 (a porta única).
// A tela não sabe se está rodando no app Neutralino ou num terminal em rede.

import { db } from './backend/db.js';
import { servidor } from './backend/servidor.js';
import { sessao, navegar, toast, modal } from './backend/ambiente.js';
import { renderHoje } from './telas/hoje.js';

// ---------------------------------------------------------------------------
// Constante NO_APP: estamos rodando dentro do Neutralino (WebView2 local)?
// ---------------------------------------------------------------------------
const NO_APP = typeof window.Neutralino !== 'undefined' && !!window.Neutralino?.app?.isNative;

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
      if (logPath) {
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
  // Resolve o path do log UMA vez: %APPDATA% no JS é literal, precisa expandir.
  if (!window.__logPath && NO_APP) {
    try {
      const appdata = await window.Neutralino.os.getEnv('APPDATA');
      const logDir = `${appdata}\\GestorInteligenteDeDemandas\\logs`;
      await window.Neutralino.filesystem.createDirectory(logDir).catch(() => {});
      window.__logPath = `${logDir}\\app-debug.log`;
    } catch (e) {
      console.warn('[app] nao conseguiu resolver logPath:', e.message);
    }
  }

  D('[app] bootstrap. NO_APP=', NO_APP, 'location=', location.href);
  D('[app] Neutralino?', typeof window.Neutralino, window.Neutralino?.app?.isNative);
  D('[app] logPath=', window.__logPath);

  // 1. Abre o banco (sql.js, sql-wasm.wasm)
  try {
    D('[app] abrindo banco...');
    await db.abrir();
    D('[app] banco aberto em', db.caminho);
  } catch (e) {
    D('[app] ERRO abrir banco:', e.message, e.stack);
    mostrarErroBootstrap('Falha ao abrir banco local: ' + (e.message || e));
    return;
  }

  // 2. Carrega identidade.
  // Pega versao direto do NEUTRALINO_GLOBALS (injetado pelo runtime) - evita getConfig() que pode travar o WebSocket.
  const versao = window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0';
  const versaoSpan = document.getElementById('versao-app');
  if (versaoSpan) versaoSpan.textContent = 'v' + versao;
  document.querySelectorAll('.brand-sub').forEach(el => { el.textContent = 'v' + versao; });

  // 3. Tenta restaurar sessão (com timeout: o WebSocket pode nao estar pronto ainda)
  // Primeiro: checa sessao gravada em localStorage ("Lembrar senha")
  const lembrar = (() => { try { return JSON.parse(localStorage.getItem('gestor-lembrar-sessao') || 'null'); } catch (_) { return null; } })();
  let sessaoResult;
  if (lembrar && lembrar.token) {
    Object.assign(sessao, { autenticado: true, email: lembrar.email, token: lembrar.token });
    D('[app] restaurou sessao do localStorage:', lembrar.email);
    sessaoResult = { ok: true, dados: { autenticado: true, ...lembrar } };
  } else {
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
  }
  if (sessaoResult.ok && sessaoResult.dados?.autenticado) {
    Object.assign(sessao, sessaoResult.dados);
    D('[app] chamando irPara(hoje)');
    irPara('hoje');
  } else {
    D('[app] chamando irPara(login)');
    irPara('login');
  }

  // 4. Esconde a tela de loading
  document.getElementById('loading-screen')?.remove();
  D('[app] bootstrap OK, loading removido');
}

function mostrarErroBootstrap(msg) {
  D('[app] mostrarErroBootstrap: ' + msg);
  const tela = document.getElementById('app');
  if (!tela) { D('[app] ERRO: #app nao existe!'); return; }
  tela.innerHTML = `<div style="padding:40px; color:#f44336; font-family:monospace; background:#1e1e1e; color:#ff6b6b; min-height:100vh;">
    <h2 style="color:#ff6b6b;">Falha ao iniciar</h2>
    <pre style="white-space:pre-wrap; color:#ffaaaa;">${String(msg).replace(/</g, '&lt;')}</pre>
    <p style="color:#888;">Veja o console do WebView2 (Ctrl+Shift+I) ou %APPDATA%\\GestorInteligenteDeDemandas\\logs\\app-debug.log</p>
  </div>`;
}

// ---------------------------------------------------------------------------
// Roteamento interno (entre telas)
// ---------------------------------------------------------------------------
// Telas em construcao usam renderStub(rota) do stubs.js (NÃO renderTarefas/renderProjetos/etc
// que nao existem - isso causava crash ao clicar no menu).
const STUB = (rota) => () => import('./telas/stubs.js').then(m => m.renderStub(rota));

const ROTAS = {
  login: { titulo: 'Entrar',        render: renderLogin  },
  hoje:   { titulo: 'Hoje',           render: renderHoje   },
  tarefas:{ titulo: 'Tarefas',         render: STUB('tarefas')  },
  inbox:  { titulo: 'Caixa de entrada', render: () => import('./telas/inbox.js').then(m => m.renderInbox()) },
  projetos:{ titulo: 'Projetos',       render: STUB('projetos') },
  clientes:{ titulo: 'Clientes',       render: STUB('clientes') },
  areas:  { titulo: 'Áreas',            render: STUB('areas')    },
  busca:  { titulo: 'Buscar',           render: STUB('busca')    },
  config: { titulo: 'Configurações',    render: STUB('config')   },
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
    <div style="display:flex; flex-direction:column; height:100vh; align-items:center; justify-content:center; gap:16px; padding:40px;">
      <h1 style="color: var(--cor-marca); font-size:28px;">Gestor Inteligente de Demandas</h1>
      <p style="color: var(--fg-3);">Entre com sua conta ou crie uma nova</p>
      <div id="login-form" style="display:flex; flex-direction:column; gap:8px; min-width:300px;">
        <input type="email" id="login-email" placeholder="Email" value="${salvo?.email ? escapeAttr(salvo.email) : ''}" autocomplete="username">
        <input type="password" id="login-senha" placeholder="Senha (opcional, só dígitos)" inputmode="numeric" pattern="[0-9]*" autocomplete="current-password">
        <label style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--fg-3);">
          <input type="checkbox" id="login-lembrar" ${salvo ? 'checked' : ''} style="width:auto;">
          Lembrar senha (não pedir login da próxima vez)
        </label>
        <div style="display:flex; gap:8px;">
          <button id="btn-login" class="primary" style="flex:1;">Entrar</button>
          <button id="btn-cadastro" style="flex:1;">Criar conta</button>
        </div>
        ${salvo ? '<button id="btn-sair-gravado" style="font-size:11px; color:var(--fg-3); background:none; border:none; text-decoration:underline; cursor:pointer;">Sair da conta gravada (' + escapeHtml(salvo.email) + ')</button>' : ''}
      </div>
      <div style="color: var(--fg-3); font-size:12px;">v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0')</div>
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
// Boot
// ---------------------------------------------------------------------------
bootstrap().catch(e => {
  console.error('[app] bootstrap falhou:', e);
  toast({ tipo: 'erro', titulo: 'Falha', corpo: e.message });
});

// Disponibiliza api() globalmente para facilitar testes no console
window.api = api;
window.irPara = irPara;
