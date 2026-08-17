// src/js/telas/hoje.js — tela principal (Hoje) com buckets de urgencia
import { escapeHtml, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

let _cacheTarefas = [];

export async function renderHoje() {
 const main = document.getElementById('app');
 if (!main) return;
 main.innerHTML = `
 ${topbar()}
 <div class="main">
 <aside class="sidebar">${menuLateral('hoje')}</aside>
 <main class="conteudo">
 <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
 <h2 style="flex:1; color: var(--cor-marca);">Hoje, <span id="data-hoje"></span></h2>
 <button class="primary" id="btn-nova">+ Nova tarefa</button>
 <button id="btn-cobranca" title="Cobrar tarefas atrasadas agora">Cobrar agora</button>
 </div>
 <div id="hoje-buckets">carregando...</div>
 </main>
 </div>
 `;
 document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.2.8');
 document.getElementById('data-hoje').textContent = formatarHoje();
 main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
 a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
 });
 document.getElementById('btn-nova').onclick = async () => {
 const m = await import('./tarefas.js');
 m.modalTarefa(null, await getCache(), carregar);
 };
 document.getElementById('btn-cobranca').onclick = async () => {
 const r = await window.api('cobranca:tick');
 if (r.ok) {
 const d = r.dados;
 toast({ tipo: 'sucesso', titulo: 'Cobrança', corpo: `${d.lembretes_gerados || 0} lembrete(s) gerado(s), ${d.tarefas_bloqueadas || 0} bloqueada(s)` });
 carregar();
 } else { toast({ tipo: 'erro', titulo: 'Cobrança', corpo: r.erro?.mensagem || 'erro' }); }
 };
 carregar();
}

async function getCache() {
 const [a, p, c] = await Promise.all([
 window.api('areas:listar'),
 window.api('projetos:listar', { incluir_arquivadas: true }),
 window.api('clientes:listar', { incluir_arquivadas: true }),
 ]);
 return { areas: a.ok ? a.dados : [], projetos: p.ok ? p.dados : [], clientes: c.ok ? c.dados : [] };
}

async function carregar() {
 const r = await window.api('tarefas:listar', { limite: 200 });
 if (!r.ok) {
 const msg = r.erro?.mensagem || r.erro?.codigo || JSON.stringify(r.erro || {});
 const codigo = r.erro?.codigo || '?';
 document.getElementById('hoje-buckets').innerHTML = `
 <div class="card" style="border-left: 4px solid var(--danger); padding: 16px;">
 <h3 style="margin:0 0 8px; color: var(--danger);">Erro ao carregar tarefas</h3>
 <p style="margin:0 0 8px;"><b>Código:</b> ${escapeHtml(codigo)}</p>
 <p style="margin:0 0 8px; font-family: monospace; background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px;">${escapeHtml(msg)}</p>
 <p style="margin:0; color: var(--fg-3); font-size: 12px;">Tente recarregar o app. Se persistir, veja %APPDATA%\\GestorInteligenteDeDemandas\\logs\\app-debug.log</p>
 </div>`;
 document.getElementById('status-topo').textContent = 'erro: ' + codigo;
 return;
 }
 _cacheTarefas = r.dados;
 document.getElementById('status-topo').textContent = '● ' + r.dados.length + ' tarefas ativas';
 renderBuckets(r.dados);
}

function renderBuckets(tarefas) {
 const agora = new Date();
 const buckets = {
 criticas: [], atrasadas: [], hoje: [], amanha: [], semana: [], andamento: [], bloqueadas: [], aguardando: [], sem_data: [],
 };
 for (const t of tarefas) {
 if (['CONCLUIDA','CANCELADA','ARQUIVADA'].includes(t.status)) continue;
 if (t.status === 'BLOQUEADA') { buckets.bloqueadas.push(t); continue; }
 if (t.status === 'AGUARDANDO_TERCEIRO') { buckets.aguardando.push(t); continue; }
 if (t.prioridade === 'CRITICA' || t.nivel_cobranca === 'CRITICA') { buckets.criticas.push(t); continue; }
 if (t.vencimento_em) {
 const v = new Date(t.vencimento_em);
 const diffMs = v - agora;
 const diffD = Math.floor(diffMs / 86400000);
 if (diffMs < 0) buckets.atrasadas.push(t);
 else if (diffD === 0) buckets.hoje.push(t);
 else if (diffD === 1) buckets.amanha.push(t);
 else if (diffD <= 7) buckets.semana.push(t);
 else buckets.sem_data.push(t);
 } else {
 buckets.sem_data.push(t);
 }
 if (t.status === 'EM_ANDAMENTO') buckets.andamento.push(t);
 }
 const el = document.getElementById('hoje-buckets');
 let html = '';
 const sec = (titulo, lista, cor) => {
 if (lista.length === 0) return '';
 return `<div class="card" style="border-left: 4px solid ${cor};">
 <h3 style="margin:0 0 8px; color:${cor};">${titulo} <span style="color:var(--fg-3); font-weight:normal; font-size:12px;">(${lista.length})</span></h3>
 <ul class="lista">${lista.map(renderLinha).join('')}</ul>
 </div>`;
 };
 html += sec('Criticas', buckets.criticas, 'var(--danger)');
 html += sec('Atrasadas', buckets.atrasadas, 'var(--danger)');
 html += sec('Vencendo hoje', buckets.hoje, 'var(--warning)');
 html += sec('Amanha', buckets.amanha, 'var(--warning)');
 html += sec('Esta semana', buckets.semana, 'var(--info)');
 html += sec('Em andamento', buckets.andamento, 'var(--info)');
 html += sec('Bloqueadas', buckets.bloqueadas, 'var(--fg-3)');
 html += sec('Aguardando terceiros', buckets.aguardando, 'var(--fg-3)');
 html += sec('Sem data', buckets.sem_data, 'var(--fg-3)');
 if (html === '') html = '<p class="vazia">Nada urgente agora. Bom momento para revisar pendências antigas.</p>';
 el.innerHTML = html;

 el.querySelectorAll('[data-acao]').forEach(b => {
 b.onclick = async () => {
 const id = b.dataset.id, v = Number(b.dataset.v), ac = b.dataset.acao;
 if (ac === 'concluir') { if (confirm('Concluir esta tarefa?')) { await window.api('tarefas:concluir', { id, versao: v }); carregar(); } }
 else if (ac === 'editar') {
 const t = _cacheTarefas.find(x => x.id === id);
 const m = await import('./tarefas.js');
 const full = (await window.api('tarefas:obter', { id })).dados;
 m.modalTarefa(full, await getCache(), carregar);
 }
 };
 });
}

function renderLinha(t) {
 const venc = t.vencimento_em ? new Date(t.vencimento_em) : null;
 const vencida = venc && venc < new Date() && !['CONCLUIDA','CANCELADA','ARQUIVADA'].includes(t.status);
 return `<li>
 <span class="dot" style="background:${t.area_cor || '#888'}"></span>
 <span class="pill prioridade-${t.prioridade}">${t.prioridade}</span>
 <span class="pill status-${t.status}">${t.status}</span>
 <span class="titulo">${escapeHtml(t.titulo)}</span>
 <span style="color:var(--fg-3); font-size:11px;">${t.area_nome ? escapeHtml(t.area_nome) : ''}</span>
 <span style="color:var(--fg-3); font-size:11px;">${vencida ? '<span style="color:var(--danger);">atrasada: </span>' : ''}${venc ? formatarVenc(venc) : 'sem data'}</span>
 <span style="display:flex; gap:4px;">
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="editar">Editar</button>
 ${t.status !== 'CONCLUIDA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">Concluir</button>` : ''}
 </span>
 </li>`;
}

function formatarHoje() {
 const d = new Date();
 return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

function formatarVenc(d) {
 const agora = new Date();
 const diffMs = d - agora;
 const diffH = Math.floor(diffMs / 3600000);
 if (diffH < 0) {
 const ah = -diffH;
 if (ah < 1) return 'há ' + Math.floor(-diffMs/60000) + 'min';
 if (ah < 24) return 'há ' + ah + 'h';
 return 'há ' + Math.floor(ah/24) + 'd';
 }
 if (diffH < 1) return 'em ' + Math.floor(diffMs/60000) + 'min';
 if (diffH < 24) return 'em ' + diffH + 'h';
 return 'em ' + Math.floor(diffH/24) + 'd';
}
