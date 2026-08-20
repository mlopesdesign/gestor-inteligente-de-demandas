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
 if (opts.aba && ['geral','atualizacao','backup','sync'].includes(opts.aba)) {
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
 document.getElementById('versão-app').textContent = 'v' + (document.querySelector('meta[name="app-version"]')?.content || window.__appVersion || '0.2.23');
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
 <button data-aba="sync" class="${_abaAtiva==='sync'?'ativa':''}" role="tab">Sincronização</button>
 <button data-aba="backup" class="${_abaAtiva==='backup'?'ativa':''}" role="tab">Backup</button>
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

 <div class="tab-painel ${_abaAtiva==='sync'?'ativa':''}" id="tab-sync" role="tabpanel">
 <div class="card">
 <h3>Sincronização com a nuvem (plugin WordPress)</h3>
 <p style="color:var(--fg-3); font-size:12px; margin:6px 0 12px;">
 Conecte o Gestor desktop ao plugin <code>gestor-api</code> instalado em <code>tools.mlopesdesign.com.br</code> pra sincronizar tarefas, projetos, clientes e áreas entre este app, o site WP e o app Android.
 Use as mesmas credenciais do <b>admin do WordPress</b> (a partir da v0.1.4 do plugin, o login é via <code>wp_users</code> nativo).
 </p>
 <div id="sync-status-area"><div class="sync-status">carregando...</div></div>
 <div id="sync-resultado" style="margin-top:10px;"></div>
 </div>
 </div>

 <div class="tab-painel ${_abaAtiva==='atualizacao'?'ativa':''}" id="tab-atualizacao" role="tabpanel">
 <div class="tab-grid">
 <div>
 <div class="card">
 <h3>Atualização do sistema</h3>
 <p style="margin:6px 0 12px;">
 Versão instalada: <strong id="atualizacao-versão">v${escapeHtml(window.__appVersion || document.querySelector('meta[name="app-version"]')?.content || '0.2.23')}</strong>
 <span id="atualizacao-status" class="atualizacao-status ok" style="margin-left:8px;"><span class="dot"></span>—</span>
 </p>
 <p style="color:var(--fg-3); font-size:12px; margin-bottom:12px;">As atualizações são baixadas do GitHub e aplicadas automaticamente — sem reinstalar o sistema.</p>
 <button id="btn-verificar-atualizacao" class="primary">Verificar agora</button>
 <div id="atualizacao-novaversão"></div>
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

 <div class="tab-painel ${_abaAtiva==='backup'?'ativa':''}" id="tab-backup" role="tabpanel">
 <div class="tab-grid">
 <div>
 <div class="card">
 <h3>Fazer backup agora</h3>
 <p style="color:var(--fg-3); font-size:12px; margin:6px 0 12px;">
 Copia o banco SQLite atual pra <code>%APPDATA%\GestorInteligenteDeDemandas\dados\backups\</code>.
 Você pode restaurar a qualquer momento pelo histórico abaixo.
 </p>
 <button id="btn-backup-manual" class="primary">Fazer backup agora</button>
 <div id="backup-resultado" style="margin-top:10px;"></div>
 </div>

 <div class="card">
 <h3>Backup automático</h3>
 <p style="color:var(--fg-3); font-size:12px; margin:6px 0 12px;">
 Quando ligado, o app cria um backup a cada abertura (ou periodicamente, abaixo).
 Os backups antigos são apagados automaticamente conforme a retenção.
 </p>
 <form id="form-backup-auto">
 <div class="campo" style="display:flex; align-items:center; gap:8px;">
 <label style="display:flex; align-items:center; gap:6px;">
 <input type="checkbox" name="ativo" id="backup-auto-ativo"> Backup automático ligado
 </label>
 </div>
 <div class="campo"><label>Frequência</label>
 <select name="frequencia" id="backup-auto-frequencia">
 <option value="diaria">Diária (uma vez por dia)</option>
 <option value="semanal">Semanal (uma vez por semana)</option>
 <option value="a cada abertura">A cada abertura do app</option>
 </select>
 </div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Hora preferida (informativo)</label>
 <input type="number" name="hora" id="backup-auto-hora" min="0" max="23" value="18">
 </div>
 <div class="campo" style="flex:1;"><label>Manter últimos N</label>
 <input type="number" name="retencao" id="backup-auto-retencao" min="1" max="365" value="30">
 </div>
 </div>
 <p style="color:var(--fg-3); font-size:11px; margin:6px 0;">
 Último backup automático: <span id="backup-auto-ultimo">—</span>
 </p>
 <div class="acoes"><button type="submit" class="primary">Salvar configuração</button></div>
 </form>
 </div>
 </div>

 <div>
 <div class="card">
 <h3>Histórico de backups</h3>
 <p style="color:var(--fg-3); font-size:12px; margin-bottom:12px;">
 Lista de todos os backups. Clique em "Restaurar" pra substituir o banco atual por este backup.
 O app cria um backup de segurança antes de restaurar.
 </p>
 <div id="backup-lista" class="releases-lista">
 <div class="release-vazia">carregando histórico...</div>
 </div>
 </div>
 </div>
 </div>
 </div>
 `;

 // Tabs
 document.getElementById('tabs-bar').querySelectorAll('button[data-aba]').forEach(btn => {
 btn.onclick = () => {
 _abaAtiva = btn.dataset.aba;
 try { sessionStorage.setItem('gestor-ultima-aba', 'config:' + _abaAtiva); } catch (_) {}
 document.querySelectorAll('#tabs-bar button').forEach(b => b.classList.toggle('ativa', b.dataset.aba === _abaAtiva));
 document.querySelectorAll('.tab-painel').forEach(p => p.classList.toggle('ativa', p.id === 'tab-' + _abaAtiva));
 if (_abaAtiva === 'atualizacao' && !_releasesCache && !_releasesErro) {
 carregarHistoricoReleases();
 }
 if (_abaAtiva === 'backup') {
 carregarConfigBackupAuto();
 carregarHistoricoBackups();
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

 // Backup handlers (v0.2.12)
 const btnBackupManual = document.getElementById('btn-backup-manual');
 if (btnBackupManual) btnBackupManual.onclick = () => fazerBackupManual();
 salvarConfigBackupAuto();
 await carregarSyncStatus();

 // Auto-verifica ao entrar na aba se nunca checou
 if (_abaAtiva === 'atualizacao') {
 if (!_releasesCache && !_releasesErro) carregarHistoricoReleases();
 // Nao dispara verificarAtualizacao automatico pra nao incomodar — usuario clica no botao
 }
 if (_abaAtiva === 'backup') {
 carregarConfigBackupAuto();
 carregarHistoricoBackups();
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
 const slot = document.getElementById('atualizacao-novaversão');
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
 const slot = document.getElementById('atualizacao-novaversão');
 if (!slot) return;
 const sizeMB = info.size ? (info.size / (1024*1024)).toFixed(2) + ' MB' : '';
 slot.innerHTML = `
 <div class="atualizacao-novaversão">
 <div class="novaversão-titulo">Nova versão disponível: v${escapeHtml(info.version)}</div>
 ${sizeMB || info.sha256 ? `<div class="novaversão-meta">${sizeMB}${sizeMB && info.sha256 ? ' • ' : ''}${info.sha256 ? 'SHA-256 ' + escapeHtml(info.sha256.substring(0, 16)) + '...' : ''}</div>` : ''}
 <div class="novaversão-notes">${escapeHtml(info.notes || '(sem notas)')}</div>
 <div class="novaversão-acoes">
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
 <span class="release-versão">v${escapeHtml(tag)}</span>
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

// ---------------------------------------------------------------------------
// Backup (v0.2.12: manual + automatico + historico)
// ---------------------------------------------------------------------------

function fmtTamanho(bytes) {
 if (!bytes) return '0 B';
 if (bytes < 1024) return bytes + ' B';
 if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
 return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function fmtDataHoraCurta(iso) {
 if (!iso) return '—';
 try {
 const d = new Date(iso);
 const pad = (n) => String(n).padStart(2, '0');
 return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
 } catch (_) { return iso; }
}

async function carregarConfigBackupAuto() {
 const r = await window.api('backup:obterAuto');
 if (!r.ok || !r.dados) return;
 const c = r.dados;
 const ativo = document.getElementById('backup-auto-ativo');
 const freq = document.getElementById('backup-auto-frequencia');
 const hora = document.getElementById('backup-auto-hora');
 const ret = document.getElementById('backup-auto-retencao');
 const ult = document.getElementById('backup-auto-ultimo');
 if (ativo) ativo.checked = !!c.ativo;
 if (freq) freq.value = c.frequencia || 'diaria';
 if (hora) hora.value = c.hora ?? 18;
 if (ret) ret.value = c.retencao ?? 30;
 if (ult) ult.textContent = c.ultimoAuto ? fmtDataHoraCurta(c.ultimoAuto) : '— (nunca)';
}

async function carregarHistoricoBackups() {
 const host = document.getElementById('backup-lista');
 if (!host) return;
 host.innerHTML = '<div class="release-vazia">carregando histórico...</div>';
 const r = await window.api('backup:listar');
 if (!r.ok || !r.dados) {
 host.innerHTML = '<div class="release-vazia">Erro: ' + escapeHtml(r.erro?.mensagem || 'desconhecido') + '</div>';
 return;
 }
 if (r.dados.length === 0) {
 host.innerHTML = '<div class="release-vazia">Nenhum backup ainda. Use o botão "Fazer backup agora" à esquerda.</div>';
 return;
 }
 // v0.2.25: bulk bar + checkbox por item
 const bar = `<div class="bulk-bar" style="display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.08); flex-wrap:wrap; margin-bottom:6px;">
 <label style="display:flex; align-items:center; gap:4px; font-size:12px;">
 <input type="checkbox" id="bulk-todos"> <b>Selecionar todos</b>
 </label>
 <span id="bulk-contador" style="color:var(--fg-3); font-size:12px;">0 selecionados</span>
 <span style="flex:1;"></span>
 <button id="bulk-excluir" class="danger" disabled>🗑 Excluir selecionados</button>
 </div>`;
 host.innerHTML = bar + r.dados.map(b => {
 const data = fmtDataHoraCurta(b.criado_em);
 const tam = fmtTamanho(b.tamanho_real || b.tamanho_bytes);
 const origem = b.origem === 'auto' ? 'auto' : (b.origem === 'pre-update' ? 'pre-restore' : 'manual');
 const obs = b.observacao ? ' — ' + escapeHtml(b.observacao) : '';
 const status = b.status !== 'ok' ? ' <span style="color:var(--warning);">(' + b.status + ')</span>' : '';
 const faltando = b.arquivo_existe ? '' : ' <span style="color:var(--danger);">[arquivo faltando]</span>';
 return `
 <div class="release-item" data-id="${escapeHtml(b.id)}">
 <div class="release-cabecalho" style="display:flex; align-items:center; gap:8px;">
 <input type="checkbox" class="sel-item" data-id="${escapeHtml(b.id)}" style="flex:0;">
 <span class="release-versão">v${data.replace(/[/: ]/g, '').slice(0,8)}</span>
 <span class="release-titulo">${origem} · ${tam}${obs}${status}${faltando}</span>
 <span class="release-data">${escapeHtml(data.split(' ')[0])}</span>
 </div>
 <div class="release-corpo">
 <p style="margin:4px 0 8px; font-size:12px;">Caminho: <code>${escapeHtml(b.caminho)}</code></p>
 <div style="display:flex; gap:8px;">
 <button class="backup-restaurar primary" data-id="${escapeHtml(b.id)}" ${b.arquivo_existe && b.status === 'ok' ? '' : 'disabled'}>Restaurar este backup</button>
 <button class="backup-excluir" data-id="${escapeHtml(b.id)}" style="background:transparent; color:var(--danger); border:1px solid var(--danger);">Excluir</button>
 </div>
 </div>
 </div>
 `;
 }).join('');
 host.querySelectorAll('.release-item').forEach(item => {
 // Click no item nao mexe no checkbox (deixa o user marcar sem querer ativar)
 item.onclick = (ev) => {
 if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'BUTTON') return;
 const estava = item.classList.contains('ativa');
 host.querySelectorAll('.release-item').forEach(x => x.classList.remove('ativa'));
 if (!estava) item.classList.add('ativa');
 };
 });
 host.querySelectorAll('.backup-restaurar').forEach(btn => {
 btn.onclick = (e) => { e.stopPropagation(); restaurarBackup(btn.dataset.id); };
 });
 host.querySelectorAll('.backup-excluir').forEach(btn => {
 btn.onclick = (e) => { e.stopPropagation(); excluirBackup(btn.dataset.id); };
 });
 // Bulk select
 const cbs = () => Array.from(host.querySelectorAll('.sel-item'));
 const cont = () => host.querySelector('#bulk-contador');
 const btnEx = () => host.querySelector('#bulk-excluir');
 const cbTodos = host.querySelector('#bulk-todos');
 const atualizar = () => {
 const m = cbs().filter(c => c.checked);
 const total = cbs().length;
 cont().textContent = `${m.length} de ${total} selecionados`;
 btnEx().disabled = m.length === 0;
 cbTodos.checked = m.length === total && total > 0;
 cbTodos.indeterminate = m.length > 0 && m.length < total;
 };
 cbs().forEach(c => { c.onchange = atualizar; });
 cbTodos.onchange = () => { const alvo = cbTodos.checked; cbs().forEach(c => { c.checked = alvo; }); atualizar(); };
 btnEx().onclick = async () => {
 const m = cbs().filter(c => c.checked);
 if (m.length === 0) return;
 if (!confirm(`Excluir ${m.length} backup(s)? O(s) arquivo(s) sera(o) removido(s) do disco.`)) return;
 btnEx().disabled = true;
 let ok = 0, falha = 0;
 for (const c of m) {
 const r = await window.api('backup:excluir', { id: c.dataset.id });
 if (r.ok) ok++; else falha++;
 }
 toast({ tipo: falha ? 'erro' : 'sucesso', titulo: 'Exclusão em massa', corpo: `${ok} excluído(s), ${falha} falha(s)` });
 carregarHistoricoBackups();
 };
 atualizar();
}

async function fazerBackupManual() {
 const btn = document.getElementById('btn-backup-manual');
 const slot = document.getElementById('backup-resultado');
 if (btn) { btn.disabled = true; btn.textContent = 'Fazendo backup...'; }
 if (slot) slot.innerHTML = '<p style="color:var(--fg-3); font-size:12px;">Copiando banco...</p>';
 try {
 const r = await window.api('backup:criar', { origem: 'manual', observacao: 'manual via tela de Configuracoes' });
 if (r.ok) {
 if (slot) slot.innerHTML = '<p style="color:var(--success); font-size:12px;">Backup criado. ' + fmtTamanho(r.dados.tamanho_bytes) + ' em ' + fmtDataHoraCurta(r.dados.criado_em) + '</p>';
 toast({ tipo: 'sucesso', titulo: 'Backup criado', corpo: fmtTamanho(r.dados.tamanho_bytes) });
 carregarHistoricoBackups();
 } else {
 if (slot) slot.innerHTML = '<p style="color:var(--danger); font-size:12px;">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>';
 toast({ tipo: 'erro', titulo: 'Falha no backup', corpo: r.erro?.mensagem || '' });
 }
 } catch (e) {
 if (slot) slot.innerHTML = '<p style="color:var(--danger); font-size:12px;">Erro: ' + escapeHtml(e.message) + '</p>';
 } finally {
 if (btn) { btn.disabled = false; btn.textContent = 'Fazer backup agora'; }
 }
}

async function restaurarBackup(id) {
 if (!confirm('Restaurar este backup?\n\nO banco atual será substituído. Um backup de segurança será criado antes.\n\nRecomendamos fechar o app depois de restaurar.')) return;
 const r = await window.api('backup:restaurar', { id });
 if (!r.ok) { toast({ tipo: 'erro', titulo: 'Falha ao restaurar', corpo: r.erro?.mensagem || '' }); return; }
 toast({ tipo: 'sucesso', titulo: 'Banco restaurado', corpo: 'O app sera reiniciado em 3s.' });
 setTimeout(() => {
 try { window.Neutralino?.app?.exit?.(); } catch (_) {}
 setTimeout(() => location.reload(), 1500);
 }, 2500);
}

async function excluirBackup(id) {
 if (!confirm('Excluir este backup? O arquivo sera removido do disco.')) return;
 const r = await window.api('backup:excluir', { id });
 if (!r.ok) { toast({ tipo: 'erro', titulo: 'Falha ao excluir', corpo: r.erro?.mensagem || '' }); return; }
 toast({ tipo: 'sucesso', titulo: 'Backup excluido' });
 carregarHistoricoBackups();
}

function salvarConfigBackupAuto() {
 const form = document.getElementById('form-backup-auto');
 if (!form) return;
 form.onsubmit = async (e) => {
 e.preventDefault();
 const dados = {
 ativo: form.querySelector('#backup-auto-ativo').checked,
 frequencia: form.querySelector('#backup-auto-frequencia').value,
 hora: parseInt(form.querySelector('#backup-auto-hora').value, 10) || 18,
 retencao: parseInt(form.querySelector('#backup-auto-retencao').value, 10) || 30,
 };
 const r = await window.api('backup:salvarAuto', dados);
 if (r.ok) {
 toast({ tipo: 'sucesso', titulo: 'Configuracao salva', corpo: 'Backup automatico ' + (dados.ativo ? 'ligado' : 'desligado') });
 carregarConfigBackupAuto();
 } else {
 toast({ tipo: 'erro', titulo: 'Falha', corpo: r.erro?.mensagem || '' });
 }
 };
}



// ============================================================================
// Sync na nuvem (v0.2.24)
// ============================================================================

async function carregarSyncStatus() {
 const area = document.getElementById('sync-status-area');
 if (!area) return;
 area.innerHTML = '<div class="sync-status">carregando...</div>';
 const r = await window.api('sync:status');
 if (!r.ok) { area.innerHTML = '<p style="color:var(--danger);">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>'; return; }
 const d = r.dados;
 area.innerHTML = `
 <div style="display:flex; gap:16px; flex-wrap:wrap; align-items:center; margin:8px 0 14px;">
 <div><span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${d.conectado ? 'var(--success)' : 'var(--danger)'};"></span> ${d.conectado ? 'Conectado' : 'Desconectado'}</div>
 <div style="color:var(--fg-3); font-size:12px;">URL: <code>${escapeHtml(d.wp_url || '\u2014')}</code></div>
 </div>
 ${d.conectado ? `
 <div style="display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:10px; color:var(--fg-3); font-size:12px;">
 <div>Email: <strong>${escapeHtml(d.email || '\u2014')}</strong></div>
 <div>Dispositivo: <code>${escapeHtml((d.dispositivo_id || '\u2014').slice(0, 24))}</code></div>
 <div>\u00daltimo sync: ${d.ultimo_sync ? escapeHtml(fmtDataHoraCurta(d.ultimo_sync)) : '\u2014'}</div>
 <div>Mudan\u00e7as pendentes: <strong>${d.mudancas_pendentes || 0}</strong></div>
 <div>Conflitos: <strong>${d.conflitos_pendentes || 0}</strong></div>
 </div>
 <div style="display:flex; gap:8px; flex-wrap:wrap;">
 <button id="btn-sync-executar" class="primary">Sincronizar agora</button>
 <button id="btn-sync-logout">Desconectar</button>
 </div>
 ` : `
 <form id="form-sync-login" style="display:flex; flex-direction:column; gap:8px; max-width:340px;">
 <p style="color:var(--fg-3); font-size:12px; margin:0;">Use as mesmas credenciais do app Android.</p>
 <div class="campo"><label>E-mail</label><input type="email" name="email" required></div>
 <div class="campo"><label>Senha</label><input type="password" name="senha" required></div>
 <div class="acoes"><button type="submit" class="primary">Entrar</button></div>
 <div id="sync-login-erro" style="color:var(--danger); font-size:12px;"></div>
 </form>
 `}
 `;
 if (d.conectado) {
 const btnExec = document.getElementById('btn-sync-executar');
 if (btnExec) btnExec.onclick = () => executarSync();
 const btnOut = document.getElementById('btn-sync-logout');
 if (btnOut) btnOut.onclick = () => desconectarSync();
 } else {
 const form = document.getElementById('form-sync-login');
 if (form) {
 form.onsubmit = async (e) => {
 e.preventDefault();
 const dados = Object.fromEntries(new FormData(e.target).entries());
 const erroEl = document.getElementById('sync-login-erro');
 erroEl.textContent = '';
 const btn = e.target.querySelector('button[type=submit]');
 btn.disabled = true; btn.textContent = 'Entrando...';
 try {
 const r2 = await window.api('sync:login', dados);
 if (r2.ok) {
 toast({ tipo: 'sucesso', titulo: 'Conectado', corpo: 'Sincroniza\u00e7\u00e3o habilitada.' });
 await carregarSyncStatus();
 } else {
 erroEl.textContent = r2.erro?.mensagem || 'Falha no login.';
 btn.disabled = false; btn.textContent = 'Entrar';
 }
 } catch (err) {
 erroEl.textContent = err.message || 'erro';
 btn.disabled = false; btn.textContent = 'Entrar';
 }
 };
 }
 }
}

async function executarSync() {
 const slot = document.getElementById('sync-resultado');
 const btn = document.getElementById('btn-sync-executar');
 if (btn) { btn.disabled = true; btn.textContent = 'Sincronizando...'; }
 if (slot) slot.innerHTML = '<p style="color:var(--fg-3); font-size:12px;">Puxando e enviando mudan\u00e7as...</p>';
 try {
 const r = await window.api('sync:executar');
 if (r.ok) {
 const d = r.dados;
 const erros = (d.erros && d.erros.length) ? ' Erros: ' + escapeHtml(d.erros.join('; ')) : '';
 if (slot) slot.innerHTML = '<p style="color:var(--success); font-size:13px;">OK: ' + (d.aplicadas||0) + ' enviadas, ' + (d.recebidas||0) + ' recebidas, ' + (d.conflitos||0) + ' conflitos.' + erros + '</p>';
 toast({ tipo: 'sucesso', titulo: 'Sincronizado', corpo: (d.aplicadas||0) + ' enviadas, ' + (d.recebidas||0) + ' recebidas' });
 } else {
 if (slot) slot.innerHTML = '<p style="color:var(--danger); font-size:13px;">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>';
 toast({ tipo: 'erro', titulo: 'Falha no sync', corpo: r.erro?.mensagem || '' });
 }
 } catch (e) {
 if (slot) slot.innerHTML = '<p style="color:var(--danger); font-size:13px;">Erro: ' + escapeHtml(e.message) + '</p>';
 } finally {
 if (btn) { btn.disabled = false; btn.textContent = 'Sincronizar agora'; }
 await carregarSyncStatus();
 }
}

async function desconectarSync() {
 if (!confirm('Desconectar do Gestor na nuvem?\n\nSeus dados continuam no desktop. Voc\u00ea pode reconectar a qualquer momento.')) return;
 await window.api('sync:logout');
 toast({ tipo: 'aviso', titulo: 'Desconectado' });
 await carregarSyncStatus();
}
