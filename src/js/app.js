// src/js/app.js â€” gateway api() e bootstrap da UI
// Conforme PADRAO-ML-LOPES-DESIGN.md Â§3.3 (a porta Ãºnica).
// A tela nÃ£o sabe se estÃ¡ rodando no app Neutralino ou num terminal em rede.

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
// api() â€” porta Ãºnica entre tela e regra (PADRAO Â§3.3)
// ---------------------------------------------------------------------------
export async function api(canal, payload = {}) {
  if (!sessao.token) {
    // Pega a sessÃ£o atual (se o servidor tem)
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
  if (!versao) versao = '0.2.10';
  try { localStorage.setItem('__app_version', versao); } catch (_) {}
  const versaoSpan = document.getElementById('versao-app');
  if (versaoSpan) versaoSpan.textContent = 'v' + versao;
  document.querySelectorAll('.brand-sub').forEach(el => { el.textContent = 'v' + versao; });
  window.__appVersion = versao;

  // 2.5. FIX v0.2.9: auto-atualiza neutralino.config.json no disco se a versao do .neu for maior
  // que a versao do disco. O auto-update do Neutralino NAO atualiza o config (so o .neu), entao
  // sem isso o cliente fica preso com o config antigo. Faz com timeout pq as chamadas
  // Neutralino.filesystem penduram por causa do bug do init().
  if (NO_APP && window.Neutralino?.filesystem && versao) {
    try {
      const discoPath = (window.__appData ? window.__appData + '\\GestorInteligenteDeDemandas\\neutralino.config.json' : null);
      let discoVersao = null;
      if (discoPath) {
        try {
          const r = await Promise.race([
            window.Neutralino.filesystem.readFile(discoPath),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
          ]);
          if (r) {
            const txt = (typeof r === 'object' && r.data) ? r.data : (typeof r === 'string' ? r : '');
            if (txt) {
              const cfg = JSON.parse(txt);
              discoVersao = cfg?.version || null;
            }
          }
        } catch (_) {}
      }
      D('[app] config disco:', discoVersao, 'config .neu:', versao);
      if (discoVersao && compararVersao(versao, discoVersao) > 0) {
        D('[app] config do disco esta atrasado, atualizando...');
        // Busca o config novo do .neu
        try {
          const r = await Promise.race([
            fetch('/neutralino.config.json', { cache: 'no-store' }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 2000)),
          ]);
          if (r.ok) {
            const novoCfg = await r.text();
            // Escreve no disco (com timeout, com backup)
            if (discoPath) {
              try {
                const backupPath = discoPath + '.bak';
                await Promise.race([
                  window.Neutralino.filesystem.writeFile(backupPath, novoCfg),
                  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
                ]).catch(() => {});
                await Promise.race([
                  window.Neutralino.filesystem.writeFile(discoPath, novoCfg),
                  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 3000)),
                ]);
                D('[app] config do disco atualizado pra v' + versao);
                toast({ tipo: 'sucesso', titulo: 'Atualizacao', corpo: 'Configuracao atualizada. O app vai reiniciar.' });
                setTimeout(() => {
                  try { window.Neutralino?.app?.exit?.(); } catch (_) {}
                  setTimeout(() => { try { window.Neutralino?.app?.restartProcess?.(); } catch (_) {} }, 500);
                }, 1500);
                return; // nao continua o bootstrap
              } catch (e) {
                D('[app] falhou ao gravar config no disco:', e.message);
              }
            }
          }
        } catch (_) {}
      }
    } catch (e) {
      D('[app] erro na auto-att do config:', e.message);
    }
  }

  // 3. Tenta restaurar sessÃ£o (com timeout: o WebSocket pode nao estar pronto ainda)
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
    D('[app] sessao autenticada, verificando ?rota=');
    // FIX v0.2.10: permite ?rota=projetos pra deep link
    const params = new URLSearchParams(location.search);
    const rotaInicial = params.get('rota') || 'hoje';
    const abaInicial = params.get('aba') || null;
    D('[app] chamando irPara(' + rotaInicial + (abaInicial ? '/' + abaInicial : '') + ')');
    irPara(rotaInicial, abaInicial ? { aba: abaInicial } : undefined);
    // v0.2.12: hook de auto-backup no boot (fire-and-forget)
    servidor.processar('backup:aplicarAuto', {}).then(r => {
      D('[app] auto-backup resultado:', JSON.stringify(r?.dados || r?.erro || r));
    }).catch(e => D('[app] ERRO auto-backup:', e.message));
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
      D('[app] tentando auto-demo. Neutralino?', typeof window.Neutralino);
      const listaUsers = await servidor.processar('sessao:listarUsuarios', {});
      D('[app] listaUsers=', JSON.stringify(listaUsers));
      if (listaUsers.ok && listaUsers.dados && listaUsers.dados.length === 1 && listaUsers.dados[0].email === 'demo@gestor.local') {
        D('[app] auto-login com demo (unico usuario)');
        autoDemoResult = await servidor.processar('auth:login', { email: 'demo@gestor.local', senha: '' });
        if (autoDemoResult.ok) {
          Object.assign(sessao, autoDemoResult.dados);
        }
      }
    } catch (e) {
      D('[app] ERRO auto-demo:', e.message, e.stack);
    }
    if (autoDemoResult && autoDemoResult.ok) {
      D('[app] auto-demo OK, chamando irPara(hoje)');
      // FIX v0.2.10: permite ?rota=projetos pra deep link
      const params = new URLSearchParams(location.search);
      const rotaInicial = params.get('rota') || 'hoje';
      const abaInicial = params.get('aba') || null;
      irPara(rotaInicial, abaInicial ? { aba: abaInicial } : undefined);
      // v0.2.12: hook de auto-backup no boot (fire-and-forget)
      servidor.processar('backup:aplicarAuto', {}).then(r => {
        D('[app] auto-backup resultado:', JSON.stringify(r?.dados || r?.erro || r));
      }).catch(e => D('[app] ERRO auto-backup:', e.message));
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
  areas:    { titulo: 'Ãreas',             render: () => import('./telas/areas.js').then(m => m.renderAreas()) },
  busca:    { titulo: 'Buscar',            render: () => import('./telas/busca.js').then(m => m.renderBusca()) },
  config:   { titulo: 'ConfiguraÃ§Ãµes',     render: () => import('./telas/configuracoes.js').then(m => m.renderConfig()) },
};

export function irPara(nome, opts = {}) {
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
  // FIX v0.2.11: permite deep link de aba (ex: ?rota=config&aba=atualizacao)
  if (opts.aba) {
    try { sessionStorage.setItem('gestor-ultima-aba', nome + ':' + opts.aba); } catch (_) {}
  }
  rota.render(opts);
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
          <img src="/src/resources/images/logo-login.png" alt="mlopes dev" class="login-logo">
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

        <div class="login-rodape">v${window.__appVersion || '0.2.10'}</div>
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
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
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
      if (!silencioso) toast({ tipo: 'erro', titulo: 'AtualizaÃ§Ã£o', corpo: 'NÃ£o consegui verificar (' + r.status + ')' });
      return null;
    }
    const info = await r.json();
    if (!info.version) return null;
    // FIX v0.2.9: pega a versao instalada de varias fontes. NEUTRALINO_GLOBALS
    // nao tem .neutralinoConfig populado (vendor nao popula), entao o fallback
    // era 0.0.0 e SEMPRE mostrava "tem versao nova" mesmo ja estando na ultima.
    let atual = window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version;
    if (!atual) atual = window.__appVersion;
    if (!atual) {
      try { atual = document.querySelector('meta[name="app-version"]')?.content; } catch (_) {}
    }
    if (!atual) {
      try { atual = localStorage.getItem('__app_version'); } catch (_) {}
    }
    if (!atual) atual = '0.0.0';
    const cmp = compararVersao(info.version, atual);
    D('[update] info.version=' + info.version + ' atual=' + atual + ' cmp=' + cmp);
    if (cmp <= 0) {
      D('[update] mesma versao, NAO mostra toast');
      if (!silencioso) toast({ tipo: 'info', titulo: 'AtualizaÃ§Ã£o', corpo: 'VocÃª jÃ¡ estÃ¡ na versÃ£o mais recente (' + atual + ')' });
      return null;
    }
    // Nova versao disponivel!
    D('[update] NOVA VERSAO, mostra toast');
    return info;
  } catch (e) {
    if (!silencioso) toast({ tipo: 'erro', titulo: 'AtualizaÃ§Ã£o', corpo: 'Erro: ' + e.message });
    return null;
  }
}

export async function aplicarAtualizacao(info) {
  if (!info || !info.resourcesURL) return false;
  try {
    // FIX v0.2.17: REESCRITO COMPLETAMENTE. O bug da v0.2.16 era o fallback
    // final que chamava Neutralino.os.open(info.resourcesURL) ou window.open()
    // — isso ABRE o navegador padrão (Edge) com a URL do .neu no GitHub,
    // redirecionando o user pra fora do app. NUNCA MAIS.
    // AGORA: usa SOMENTE Neutralino.os.execCommand com PowerShell pra baixar
    // o .neu via Invoke-WebRequest (nativo do Windows 10/11), validar tamanho,
    // e mover pra lugar do resources.neu atual. Em caso de falha, mostra erro
    // claro e pede download manual — SEM abrir navegador, SEM fallback externo.
    if (!window.Neutralino?.os?.execCommand) {
      toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Auto-update indisponível. Baixe manualmente em: ' + info.resourcesURL });
      return false;
    }
    const appPath = (window.__appData ? window.__appData + '\\GestorInteligenteDeDemandas' : null);
    if (!appPath) {
      toast({ tipo: 'erro', titulo: 'Atualização', corpo: 'Caminho do app não resolvido. Baixe manualmente em: ' + info.resourcesURL });
      return false;
    }
    toast({ tipo: 'info', titulo: 'Atualização', corpo: 'Baixando versão ' + info.version + '...' });
    const tmpPath = appPath + '\\resources.neu.tmp';
    const dstPath = appPath + '\\resources.neu';
    const oldPath = appPath + '\\resources.neu.old';
    const escUrl = info.resourcesURL.replace(/'/g, "''");
    const escTmp = tmpPath.replace(/'/g, "''");
    const escDst = dstPath.replace(/'/g, "''");
    const escOld = oldPath.replace(/'/g, "''");
    const psCmd = [
      "$ErrorActionPreference='Stop'",
      '[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12',
      'try {',
      "  if (Test-Path '" + escOld + "') { Remove-Item -Force '" + escOld + "' }",
      "  Invoke-WebRequest -Uri '" + escUrl + "' -OutFile '" + escTmp + "' -UseBasicParsing",
      "  $sz = (Get-Item '" + escTmp + "').Length",
      "  if ($sz -lt 100000) { throw ('arquivo muito pequeno: ' + $sz + ' bytes') }",
      "  if (Test-Path '" + escDst + "') { Move-Item -Force '" + escDst + "' '" + escOld + "' }",
      "  Move-Item -Force '" + escTmp + "' '" + escDst + "'",
      "  Write-Output ('OK ' + $sz)",
      '} catch {',
      "  if (Test-Path '" + escTmp + "') { Remove-Item -Force '" + escTmp + "' -ErrorAction SilentlyContinue }",
      '  Write-Error $_.Exception.Message',
      '  exit 1',
      '}',
    ].join('; ');
    const r = await window.Neutralino.os.execCommand('powershell -NoProfile -NonInteractive -Command "' + psCmd.replace(/"/g, '\\"') + '"');
    if (r.exitCode === 0) {
      toast({ tipo: 'sucesso', titulo: 'Atualização', corpo: 'v' + info.version + ' instalada! Reiniciando...' });
      setTimeout(() => window.Neutralino?.app?.exit?.(), 1500);
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
