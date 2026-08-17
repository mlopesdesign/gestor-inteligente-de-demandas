// src/js/telas/configuracoes.js — perfil, export, apagar conta (LGPD), atualizacao
// v0.2.11: sistema de abas estilo Salgueiro (Geral + Atualizacao)
import { escapeHtml, modal, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';
import { verificarAtualizacao, aplicarAtualizacao } from '../app.js';

const GH_RELEASES_URL = 'https://api.github.com/repos/mlopesdesign/gestor-inteligente-de-demandas/releases?per_page=15';
const GH_RELEASES_HTML = 'https://github.com/mlopesdesign/gestor-inteligente-de-demandas/releases';

let _abaAtiva = 'geral';
let _releasesCache = null;
let _releasesErro = null;

export async function renderConfig(opts = {}) {
 // FIX v0.2.11: permite deep link via ?aba=atualizacao ou via sessionStorage
 if (opts.aba && (opts.aba === 'geral' || opts.aba === 'atualizacao')) {
 _abaAtiva = opts.aba;
 } else {
 try {
 const cached = sessionStorage.getItem('gestor-ultima-aba');
 if (cached && cached.startsWith('config:')) {
 _abaAtiva = cached.split(':')[1] || 'geral';
 }
 } catch (_) {}
 }
 const main = document.getElementById('app');
 if (!main) return;
 main.innerHTML = `
 ${topbar()}
 <div class="main">
 <aside class="sidebar">${menuLateral('config')}</aside>
 <main class="conteudo">
 <h2 style="color: var(--cor-marca);">Configurações</h2>
 <div id="config-content">carregando...</div>
 </main>
 </div>
 `;
 document.getElementById('versao-app').textContent = 'v' + (document.querySelector('meta[name="app-version"]')?.content || window.__appVersion || '0.2.11');
 main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
 a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
 });
 await carregar();
}

async function carregar() {
 const r = await window.api('config:obter');
 if (!r.ok) { document.getElementById('config-content').innerHTML = '<p class="vazia">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>'; return; }
 const { usuario, cobranca, stats } = r.dados;

 document.getElementById('config-content').innerHTML = `
 <nav class="tabs-bar" id="tabs-bar" role="tablist">
 <button data-aba="geral" class="${_abaAtiva==='geral'?'ativa':''}" role="tab">Geral</button>
 <button data-aba="atualizacao" class="${_abaAtiva==='atualizacao'?'ativa':''}" role="tab">Atualização</button>
 </nav>

 <div class="tab-painel ${_abaAtiva==='geral'?'ativa':''}" id="tab-geral" role="tabpanel">
 <div class="card">
 <h3>Perfil</h3>
 <form id="form-perfil">
 <div class="campo"><label>Nome</label><input name="nome" value="${escapeHtml(usuario.nome || '')}"></div>
 <div class="campo"><label>Email (somente leitura)</label><input value="${escapeHtml(usuario.email || '')}" disabled></div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Fuso</label>
 <select name="fuso">
 ${['America/Sao_Paulo','America/New_York','Europe/Lisbon','Europe/London','UTC'].map(f => `<option value="${f}" ${usuario.fuso===f?'selected':''}>${f}</option>`).join('')}
 </select>
 </div>
 <div class="campo" style="flex:1;"><label>Tom de cobrança</label>
 <select name="tom_cobranca">
 ${['PROFISSIONAL','FIRME','GENTIL'].map(f => `<option value="${f}" ${usuario.tom_cobranca===f?'selected':''}>${f}</option>`).join('')}
 </select>
 </div>
 </div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Horário início</label><input type="time" name="horario_trab_inicio" value="${usuario.horario_trab_inicio || '08:00'}"></div>
 <div class="campo" style="flex:1;"><label>Horário fim</label><input type="time" name="horario_trab_fim" value="${usuario.horario_trab_fim || '18:00'}"></div>
 </div>
 <div class="campo"><label>Silenciar cobrança fora do horário</label>
 <label style="display:flex; align-items:center; gap:6px;"><input type="checkbox" name="silenciar_fora_horario" ${cobranca.silenciar_fora_horario ? 'checked' : ''}> Sim</label>
 </div>
 <div class="acoes"><button type="submit" class="primary">Salvar perfil</button></div>
 </form>
 </div>

 ${stats ? `<div class="card">
 <h3>Estatísticas</h3>
 <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px;">
 <div><div style="color:var(--fg-3); font-size:11px;">Tarefas</div><div style="font-size:24px; font-weight:bold;">${stats.total_tarefas || 0}</div><div style="font-size:11px; color:var(--success);">${stats.concluidas || 0} concluídas</div></div>
 <div><div style="color:var(--fg-3); font-size:11px;">Projetos</div><div style="font-size:24px; font-weight:bold;">${stats.total_projetos || 0}</div></div>
 <div><div style="color:var(--fg-3); font-size:11px;">Clientes</div><div style="font-size:24px; font-weight:bold;">${stats.total_clientes || 0}</div></div>
 <div><div style="color:var(--fg-3); font-size:11px;">Áreas</div><div style="font-size:24px; font-weight:bold;">${stats.total_areas || 0}</div></div>
 </div>
 </div>` : ''}

 <div class="card">
 <h3>Exportar dados (LGPD)</h3>
 <p style="color:var(--fg-3); font-size:12px;">Baixa um JSON com TODOS os seus dados (tarefas, projetos, clientes, áreas, lembretes, auditoria).</p>
 <button id="btn-exportar" class="primary">Exportar tudo</button>
 </div>

 <div class="card" style="border-left: 4px solid var(--danger);">
 <h3 style="color:var(--danger);">Apagar conta (LGPD)</h3>
 <p style="color:var(--fg-3); font-size:12px;">Esta ação é IRREVERSÍVEL. Todos os seus dados serão apagados permanentemente.</p>
 <button id="btn-apagar" class="danger">Apagar minha conta</button>
 </div>

 <div class="card">
 <h3>Sessão</h3>
 <button id="btn-logout">Sair (logout)</button>
 </div>
 </div>

 <div class="tab-painel ${_abaAtiva==='atualizacao'?'ativa':''}" id="tab-atualizacao" role="tabpanel">
 <div class="tab-grid">
 <div>
 <div class="card">
 <h3>Atualização do sistema</h3>
 <p style="margin:6px 0 12px;">
 Versão instalada: <strong id="atualizacao-versao">v${escapeHtml(window.__appVersion || document.querySelector('meta[name="app-version"]')?.content || '0.2.10')}</strong>
 <span id="atualizacao-status" class="atualizacao-status ok" style="margin-left:8px;"><span class="dot"></span>—</span>
 </p>
 <p style="color:var(--fg-3); font-size:12px; margin-bottom:12px;">As atualizações são baixadas do GitHub e aplicadas automaticamente — sem reinstalar o sistema.</p>
 <button id="btn-verificar-atualizacao" class="primary">Verificar agora</button>
 <div id="atualizacao-novaversao"></div>
 </div>
 </div>

 <div>
 <div class="card">
 <h3>O que mudou</h3>
 <p style="color:var(--fg-3); font-size:12px; margin-bottom:12px;">Novidades de cada versão. Clique para abrir e ver os detalhes.</p>
 <div id="releases-lista" class="releases-lista">
 <div class="release-vazia">carregando histórico...</div>
 </div>
 <p style="margin-top:10px; font-size:11px;">
 <a href="${GH_RELEASES_HTML}" target="_blank" rel="noopener">Ver todas as versões no GitHub</a>
 </p>
 </div>
 </div>
 </div>
 </div>
 `;

 // Tabs
 document.getElementById('tabs-bar').querySelectorAll('button[data-aba]').forEach(btn => {
 btn.onclick = () => {
 _abaAtiva = btn.dataset.aba;
 document.querySelectorAll('#tabs-bar button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === _abaAtiva));
 document.querySelectorAll('.tab-painel').forEach(p => p.classList.toggle('ativa', p.id === 'tab-' + _abaAtiva));
 if (_abaAtiva === 'atualizacao' && !_releasesCache && !_releasesErro) {
 carregarHistoricoReleases();
 }
 };
 });

 // Geral handlers
 document.getElementById('form-perfil').onsubmit = async (e) => {
 e.preventDefault();
 const dados = Object.fromEntries(new FormData(e.target).entries());
 dados.silenciar_fora_horario = !!e.target.querySelector('[name=silenciar_fora_horario]').checked;
 delete dados.email;
 const r2 = await window.api('config:atualizar', dados);
 if (r2.ok) { toast({ tipo: 'sucesso', titulo: 'Salvo', corpo: 'Perfil atualizado' }); carregar(); }
 else { alert(r2.erro?.mensagem || 'erro'); }
 };

 document.getElementById('btn-exportar').onclick = async () => {
 const r2 = await window.api('config:exportar');
 if (!r2.ok) { alert(r2.erro?.mensagem || 'erro'); return; }
 const json = JSON.stringify(r2.dados, null, 2);
 const blob = new Blob([json], { type: 'application/json' });
 const url = URL.createObjectURL(blob);
 const a = document.createElement('a');
 a.href = url; a.download = 'gestor-export-' + new Date().toISOString().slice(0,10) + '.json';
 a.click();
 URL.revokeObjectURL(url);
 toast({ tipo: 'sucesso', titulo: 'Exportado', corpo: 'Download iniciado' });
 };

 document.getElementById('btn-apagar').onclick = async () => {
 if (!confirm('TEM CERTEZA? Esta ação é IRREVERSÍVEL e apaga TODOS os seus dados.')) return;
 if (!confirm('Última chance: digite OK mentalmente e clique em OK para confirmar.')) return;
 const r2 = await window.api('config:apagar', { motivo: 'usuario solicitou pela UI' });
 if (r2.ok) {
 try { localStorage.removeItem('gestor-lembrar-sessao'); } catch (_) {}
 alert('Conta apagada. O app será fechado.');
 try { window.Neutralino?.app?.exit?.(); } catch (_) {}
 setTimeout(() => { try { window.close(); } catch (_) {} }, 500);
 } else { alert(r2.erro?.mensagem || 'erro'); }
 };

 document.getElementById('btn-logout').onclick = async () => {
 await window.api('auth:logout');
 try { localStorage.removeItem('gestor-lembrar-sessao'); } catch (_) {}
 location.reload();
 };

 // Atualizacao handlers
 document.getElementById('btn-verificar-atualizacao').onclick = () => verificarAgora();

 // Auto-verifica ao entrar na aba se nunca checou
 if (_abaAtiva === 'atualizacao') {
 if (!_releasesCache && !_releasesErro) carregarHistoricoReleases();
 // Nao dispara verificarAtualizacao automatico pra nao incomodar — usuario clica no botao
 }
}

// ---------------------------------------------------------------------------
// Atualizacao
// ---------------------------------------------------------------------------

function setStatusAtualizacao(texto, classe) {
 const el = document.getElementById('atualizacao-status');
 if (!el) return;
 el.className = 'atualizacao-status ' + classe;
 el.innerHTML = '<span class="dot"></span>' + escapeHtml(texto);
}

async function verificarAgora() {
 const btn = document.getElementById('btn-verificar-atualizacao');
 if (btn) { btn.disabled = true; btn.textContent = 'Verificando...'; }
 setStatusAtualizacao('verificando...', 'aviso');
 try {
 const info = await verificarAtualizacao({ silencioso: true });
 if (info) {
 setStatusAtualizacao('nova versão ' + info.version, 'aviso');
 renderizarNovaVersao(info);
 } else {
 setStatusAtualizacao('você está na versão mais recente', 'ok');
 const slot = document.getElementById('atualizacao-novaversao');
 if (slot) slot.innerHTML = '';
 }
 } catch (e) {
 setStatusAtualizacao('erro ao verificar', 'erro');
 toast({ tipo: 'erro', titulo: 'Atualização', corpo: e?.message || String(e) });
 } finally {
 if (btn) { btn.disabled = false; btn.textContent = 'Verificar agora'; }
 }
}

function renderizarNovaVersao(info) {
 const slot = document.getElementById('atualizacao-novaversao');
 if (!slot) return;
 const sizeMB = info.size ? (info.size / (1024*1024)).toFixed(2) + ' MB' : '';
 slot.innerHTML = `
 <div class="atualizacao-novaversao">
 <div class="novaversao-titulo">Nova versão disponível: v${escapeHtml(info.version)}</div>
 ${sizeMB || info.sha256 ? `<div class="novaversao-meta">${sizeMB}${sizeMB && info.sha256 ? ' • ' : ''}${info.sha256 ? 'SHA-256 ' + escapeHtml(info.sha256.substring(0, 16)) + '...' : ''}</div>` : ''}
 <div class="novaversao-notes">${escapeHtml(info.notes || '(sem notas)')}</div>
 <div class="novaversao-acoes">
 <button id="btn-baixar-instalar" class="primary">Baixar e instalar</button>
 <button id="btn-depois">Depois</button>
 </div>
 </div>
 `;
 document.getElementById('btn-baixar-instalar').onclick = () => {
 aplicarAtualizacao(info);
 };
 document.getElementById('btn-depois').onclick = () => {
 slot.innerHTML = '';
 };
}

// ---------------------------------------------------------------------------
// Historico de releases (GitHub API)
// ---------------------------------------------------------------------------

async function carregarHistoricoReleases() {
 const host = document.getElementById('releases-lista');
 if (!host) return;
 host.innerHTML = '<div class="release-vazia">carregando histórico...</div>';
 try {
 const r = await fetch(GH_RELEASES_URL, { headers: { 'Accept': 'application/vnd.github+json' } });
 if (!r.ok) throw new Error('HTTP ' + r.status);
 const lista = await r.json();
 if (!Array.isArray(lista) || lista.length === 0) throw new Error('sem releases');
 _releasesCache = lista;
 _releasesErro = null;
 renderizarReleases(lista);
 } catch (e) {
 _releasesErro = e;
 host.innerHTML = `<div class="release-vazia">Não foi possível carregar o histórico. <a href="${GH_RELEASES_HTML}" target="_blank" rel="noopener">Ver no GitHub</a></div>`;
 }
}

function renderizarReleases(lista) {
 const host = document.getElementById('releases-lista');
 if (!host) return;
 const atual = window.__appVersion || document.querySelector('meta[name="app-version"]')?.content || '0.0.0';
 host.innerHTML = lista.map(rel => {
 const tag = (rel.tag_name || '').replace(/^v/i, '');
 const titulo = rel.name || rel.tag_name || '(sem título)';
 const corpo = (rel.body || '').trim();
 const data = rel.published_at ? rel.published_at.slice(0, 10).split('-').reverse().join('/') : '';
 const isAtual = tag === atual;
 return `
 <div class="release-item${isAtual ? ' ativa' : ''}" data-tag="${escapeHtml(tag)}">
 <div class="release-cabecalho">
 <span class="release-versao">v${escapeHtml(tag)}</span>
 <span class="release-titulo">${escapeHtml(titulo)}</span>
 ${isAtual ? '<span class="release-tag">instalada</span>' : ''}
 <span class="release-data">${escapeHtml(data)}</span>
 </div>
 ${corpo ? `<div class="release-corpo">${escapeHtml(corpo)}</div>` : ''}
 </div>
 `;
 }).join('');
 host.querySelectorAll('.release-item').forEach(item => {
 item.onclick = () => {
 const estava = item.classList.contains('ativa');
 host.querySelectorAll('.release-item').forEach(x => x.classList.remove('ativa'));
 if (!estava) item.classList.add('ativa');
 };
 });
}
