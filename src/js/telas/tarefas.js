// src/js/telas/tarefas.js — lista, filtros e CRUD de tarefas
// v0.2.25: UI de subtarefas no modal (adicionar, toggle, excluir)
import { escapeHtml, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

let _cache = { areas: [], projetos: [], clientes: [], filtro: {} };

export async function renderTarefas() {
 const main = document.getElementById('app');
 if (!main) return;
 main.innerHTML = `
 ${topbar()}
 <div class="main">
 <aside class="sidebar">${menuLateral('tarefas')}</aside>
 <main class="conteudo">
 <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
 <h2 style="flex:1; color: var(--cor-marca);">Tarefas</h2>
 <button class="primary" id="btn-nova-tarefa">+ Nova tarefa</button>
 </div>
 <div class="card" style="padding:8px 12px;">
 <div style="display:flex; gap:8px; flex-wrap:wrap;">
 <input id="filtro-busca" placeholder="Buscar..." style="flex:1; min-width:200px;">
 <select id="filtro-status">
 <option value="">Todos os status</option>
 <option value="CAIXA_ENTRADA">Caixa de entrada</option>
 <option value="PLANEJADA">Planejada</option>
 <option value="EM_ANDAMENTO">Em andamento</option>
 <option value="AGUARDANDO_TERCEIRO">Aguardando terceiro</option>
 <option value="EM_REVISAO">Em revisão</option>
 <option value="BLOQUEADA">Bloqueada</option>
 <option value="ADIADA">Adiada</option>
 <option value="CONCLUIDA">Concluída</option>
 <option value="CANCELADA">Cancelada</option>
 </select>
 <select id="filtro-area"><option value="">Todas as áreas</option></select>
 <select id="filtro-projeto"><option value="">Todos os projetos</option></select>
 <label style="display:flex; align-items:center; gap:4px; font-size:12px;"><input type="checkbox" id="filtro-vencidas"> só vencidas</label>
 <label style="display:flex; align-items:center; gap:4px; font-size:12px;"><input type="checkbox" id="filtro-arquivadas"> incluir arquivadas</label>
 </div>
 </div>
 <div id="lista-tarefas">carregando...</div>
 </main>
 </div>
 `;
 document.getElementById('versão-app').textContent = 'v' + (document.querySelector('meta[name="app-version"]')?.content || window.__appVersion || '0.2.23');
 menuLateralBind(main);

 // Carrega listas auxiliares (areas, projetos, clientes)
 const [a, p, c] = await Promise.all([
 window.api('areas:listar'),
 window.api('projetos:listar', { incluir_arquivadas: true }),
 window.api('clientes:listar', { incluir_arquivadas: true }),
 ]);
 _cache.areas = a.ok ? a.dados : [];
 _cache.projetos = p.ok ? p.dados : [];
 _cache.clientes = c.ok ? c.dados : [];
 const selA = document.getElementById('filtro-area');
 for (const x of _cache.areas) selA.innerHTML += `<option value="${x.id}">${escapeHtml(x.nome)}</option>`;
 const selP = document.getElementById('filtro-projeto');
 for (const x of _cache.projetos) selP.innerHTML += `<option value="${x.id}">${escapeHtml(x.titulo)}</option>`;

 // Bind novo + filtros
 document.getElementById('btn-nova-tarefa').onclick = () => modalTarefa(null, _cache, carregar);
 ['filtro-busca','filtro-status','filtro-area','filtro-projeto','filtro-vencidas','filtro-arquivadas'].forEach(id => {
 document.getElementById(id).oninput = carregar;
 document.getElementById(id).onchange = carregar;
 });

 carregar();
}

async function carregar() {
 const f = {
 busca: document.getElementById('filtro-busca').value.trim() || undefined,
 status: document.getElementById('filtro-status').value || undefined,
 area_id: document.getElementById('filtro-area').value || undefined,
 projeto_id: document.getElementById('filtro-projeto').value || undefined,
 vencidas: document.getElementById('filtro-vencidas').checked || undefined,
 incluir_arquivadas: document.getElementById('filtro-arquivadas').checked || undefined,
 };
 const r = await window.api('tarefas:listar', f);
 const el = document.getElementById('lista-tarefas');
 if (!r.ok) { el.innerHTML = `<p class="vazia">Erro: ${escapeHtml(r.erro?.mensagem || '')}</p>`; return; }
 if (r.dados.length === 0) { el.innerHTML = `<p class="vazia">Nenhuma tarefa.</p>`; return; }
 document.getElementById('status-topo').textContent = '● ' + r.dados.length + ' tarefas';
 el.innerHTML = `<div class="card" style="padding:0;">
 <div class="bulk-bar" style="display:flex; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid rgba(255,255,255,0.08); flex-wrap:wrap;">
 <label style="display:flex; align-items:center; gap:4px; font-size:12px;">
 <input type="checkbox" id="bulk-todos"> <b>Selecionar todos</b>
 </label>
 <span id="bulk-contador" style="color:var(--fg-3); font-size:12px;">0 selecionados</span>
 <span style="flex:1;"></span>
 <button id="bulk-arquivar" class="ghost" disabled>📦 Arquivar selecionados</button>
 <button id="bulk-excluir" class="danger" disabled>🗑 Excluir selecionados</button>
 </div>
 <table class="tabela">
 <thead><tr><th style="width:30px;"></th><th></th><th>Título</th><th>Status</th><th>Prioridade</th><th>Área</th><th>Projeto</th><th>Vencimento</th><th></th></tr></thead>
 <tbody>${r.dados.map(t => linhaTarefa(t)).join('')}</tbody>
 </table></div>`;
 // bind acoes por linha
 el.querySelectorAll('button[data-acao]').forEach(b => {
 b.onclick = async () => {
 const id = b.dataset.id, v = Number(b.dataset.v), ac = b.dataset.acao;
 if (ac === 'editar') {
 const t = (await window.api('tarefas:obter', { id })).dados;
 modalTarefa(t, _cache, carregar);
 } else if (ac === 'concluir') {
 if (confirm('Concluir esta tarefa?')) { await window.api('tarefas:concluir', { id, versao: v }); carregar(); }
 } else if (ac === 'cancelar') {
 const motivo = prompt('Motivo do cancelamento:'); if (motivo) { await window.api('tarefas:cancelar', { id, versao: v, motivo }); carregar(); }
 } else if (ac === 'adiar') {
 const nova = prompt('Nova data de vencimento (YYYY-MM-DD):'); if (nova) { await window.api('tarefas:adiar', { id, versao: v, vencimento_em: new Date(nova).toISOString(), motivo: 'adiada manualmente' }); carregar(); }
 } else if (ac === 'arquivar') {
 if (confirm('Arquivar?')) { await window.api('tarefas:arquivar', { id, versao: v }); carregar(); }
 } else if (ac === 'excluir') {
 if (confirm('Excluir esta tarefa PERMANENTEMENTE? Esta acao nao pode ser desfeita.')) {
 const r = await window.api('tarefas:excluir', { id, versao: v });
 if (!r.ok) alert('Erro ao excluir: ' + (r.erro?.mensagem || ''));
 carregar();
 }
 }
 };
 });
 bindBulk(r.dados);
}

function bindBulk(items) {
 const cbs = () => Array.from(document.querySelectorAll('.sel-item'));
 const cont = () => document.getElementById('bulk-contador');
 const btnEx = () => document.getElementById('bulk-excluir');
 const btnArq = () => document.getElementById('bulk-arquivar');
 const cbTodos = document.getElementById('bulk-todos');
 const atualizar = () => {
 const marcados = cbs().filter(c => c.checked);
 const total = cbs().length;
 cont().textContent = `${marcados.length} de ${total} selecionados`;
 btnEx().disabled = marcados.length === 0;
 btnArq().disabled = marcados.length === 0;
 // Tri-state: todos=checked, nenhum=unchecked, parcial=indeterminate
 cbTodos.checked = marcados.length === total && total > 0;
 cbTodos.indeterminate = marcados.length > 0 && marcados.length < total;
 };
 cbs().forEach(c => { c.onchange = atualizar; });
 cbTodos.onchange = () => {
 const alvo = cbTodos.checked;
 cbs().forEach(c => { c.checked = alvo; });
 atualizar();
 };
 // Botao excluir em massa
 btnEx().onclick = async () => {
 const marcados = cbs().filter(c => c.checked);
 if (marcados.length === 0) return;
 if (!confirm(`Excluir ${marcados.length} tarefa(s) PERMANENTEMENTE? Esta acao nao pode ser desfeita.`)) return;
 btnEx().disabled = true; btnArq().disabled = true;
 let ok = 0, falha = 0;
 for (const c of marcados) {
 const r = await window.api('tarefas:excluir', { id: c.dataset.id, versao: Number(c.dataset.v) });
 if (r.ok) ok++; else falha++;
 }
 toast({ tipo: falha ? 'erro' : 'sucesso', titulo: `Exclusão em massa`, corpo: `${ok} excluída(s), ${falha} falha(s)` });
 carregar();
 };
 // Botao arquivar em massa
 btnArq().onclick = async () => {
 const marcados = cbs().filter(c => c.checked);
 if (marcados.length === 0) return;
 if (!confirm(`Arquivar ${marcados.length} tarefa(s)?`)) return;
 btnEx().disabled = true; btnArq().disabled = true;
 let ok = 0, falha = 0;
 for (const c of marcados) {
 const r = await window.api('tarefas:arquivar', { id: c.dataset.id, versao: Number(c.dataset.v) });
 if (r.ok) ok++; else falha++;
 }
 toast({ tipo: falha ? 'erro' : 'sucesso', titulo: `Arquivamento em massa`, corpo: `${ok} arquivada(s), ${falha} falha(s)` });
 carregar();
 };
 atualizar();
}

function linhaTarefa(t) {
 const venc = t.vencimento_em ? new Date(t.vencimento_em) : null;
 const vencida = venc && venc < new Date() && !['CONCLUIDA','CANCELADA','ARQUIVADA'].includes(t.status);
 return `<tr>
 <td><input type="checkbox" class="sel-item" data-id="${t.id}" data-v="${t.versao}"></td>
 <td><span class="dot" style="background:${t.area_cor || '#888'}"></span></td>
 <td><strong>${escapeHtml(t.titulo)}</strong>${t.descricao ? `<br><span style="color:var(--fg-3); font-size:11px;">${escapeHtml(t.descricao.slice(0,80))}</span>` : ''}</td>
 <td><span class="pill status-${t.status}">${t.status}</span></td>
 <td><span class="pill prioridade-${t.prioridade}">${t.prioridade}</span></td>
 <td>${t.area_nome ? escapeHtml(t.area_nome) : '—'}</td>
 <td>${t.projeto_titulo ? escapeHtml(t.projeto_titulo) : '—'}</td>
 <td>${vencida ? '<span style="color:var(--danger);"> ' : ''}${venc ? formatarData(venc) : '—'}</td>
 <td style="text-align:right; white-space:nowrap;">
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="editar" title="Editar">✎</button>
 ${t.status !== 'CONCLUIDA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success" title="Marcar como concluída">✓</button>` : ''}
 ${t.status !== 'CANCELADA' && t.status !== 'ARQUIVADA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="adiar" title="Adiar vencimento">⏰</button><button data-id="${t.id}" data-v="${t.versao}" data-acao="cancelar" class="danger" title="Cancelar tarefa">✕</button>` : ''}
 ${t.status !== 'ARQUIVADA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="arquivar" title="Arquivar">📦</button>` : ''}
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="excluir" class="danger" title="Excluir permanentemente">🗑</button>
 </td>
 </tr>`;
}

function formatarData(d) {
 const hoje = new Date(); hoje.setHours(0,0,0,0);
 const dOnly = new Date(d); dOnly.setHours(0,0,0,0);
 const diff = Math.floor((dOnly - hoje) / 86400000);
 if (diff === 0) return 'hoje';
 if (diff === 1) return 'amanhã';
 if (diff === -1) return 'ontem';
 if (diff > 0 && diff < 7) return `em ${diff}d`;
 if (diff < 0 && diff > -7) return `há ${-diff}d`;
 return String(d.getDate()).padStart(2,'0') + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear();
}

export function modalTarefa(tarefa, cache, onClose) {
 const isEdit = !!tarefa;
 const t = tarefa || {};
 // Estado local das subtarefas (atualizado in-place, sem fechar modal)
 let subs = Array.isArray(t.subtarefas) ? t.subtarefas.map(s => ({ ...s })) : [];
 const host = document.createElement('div'); host.className = 'modal-host';
 host.innerHTML = `<div class="modal" style="min-width:560px; max-width: 720px;">
 <h2>${isEdit ? 'Editar' : 'Nova'} tarefa</h2>
 <form id="form-tarefa">
 <div class="campo"><label>Título*</label><input name="titulo" required value="${escapeHtml(t.titulo || '')}"></div>
 <div class="campo"><label>Descrição</label><textarea name="descricao" rows="3">${escapeHtml(t.descricao || '')}</textarea></div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Status</label>
 <select name="status">
 ${['CAIXA_ENTRADA','PLANEJADA','EM_ANDAMENTO','AGUARDANDO_TERCEIRO','EM_REVISAO','BLOQUEADA','CONCLUIDA','CANCELADA','ARQUIVADA','ADIADA'].map(s => `<option value="${s}" ${t.status===s?'selected':''}>${s}</option>`).join('')}
 </select>
 </div>
 <div class="campo" style="flex:1;"><label>Prioridade</label>
 <select name="prioridade">
 ${['BAIXA','NORMAL','ALTA','URGENTE','CRITICA'].map(s => `<option value="${s}" ${t.prioridade===s?'selected':''}>${s}</option>`).join('')}
 </select>
 </div>
 </div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Nível de cobrança</label>
 <select name="nivel_cobranca">
 ${['DISCRETA','PERSISTENTE','INTENSIVA','CRITICA'].map(s => `<option value="${s}" ${t.nivel_cobranca===s||(!t.nivel_cobranca&&s==='PERSISTENTE')?'selected':''}>${s}</option>`).join('')}
 </select>
 </div>
 <div class="campo" style="flex:1;"><label>Vencimento</label><input type="datetime-local" name="vencimento_em" value="${t.vencimento_em ? t.vencimento_em.slice(0,16) : ''}"></div>
 </div>
 <div style="display:flex; gap:8px;">
 <div class="campo" style="flex:1;"><label>Área</label>
 <select name="area_id"><option value="">—</option>${(cache?.areas||[]).map(x => `<option value="${x.id}" ${t.area_id===x.id?'selected':''}>${escapeHtml(x.nome)}</option>`).join('')}</select>
 </div>
 <div class="campo" style="flex:1;"><label>Projeto</label>
 <select name="projeto_id"><option value="">—</option>${(cache?.projetos||[]).map(x => `<option value="${x.id}" ${t.projeto_id===x.id?'selected':''}>${escapeHtml(x.titulo)}</option>`).join('')}</select>
 </div>
 <div class="campo" style="flex:1;"><label>Cliente</label>
 <select name="cliente_id"><option value="">—</option>${(cache?.clientes||[]).map(x => `<option value="${x.id}" ${t.cliente_id===x.id?'selected':''}>${escapeHtml(x.nome)}</option>`).join('')}</select>
 </div>
 </div>
 <div class="campo"><label>Recorrência</label>
 <select name="recorrencia_tipo">
 <option value="">—</option>
 ${['DIARIA','SEMANAL','MENSAL','ANUAL'].map(s => `<option value="${s}" ${t.recorrencia_tipo===s?'selected':''}>${s}</option>`).join('')}
 </select>
 </div>
 <div class="campo" id="subtarefas-section">
 ${isEdit ? '' : `<p style="color:var(--fg-3); font-size:12px; font-style:italic;">Salve a tarefa primeiro para adicionar subtarefas.</p>`}
 </div>
 <div class="acoes">
 ${isEdit ? `<button type="button" data-acao="excluir" class="danger">Excluir tarefa</button>` : ''}
 <button type="button" data-acao="cancelar">Cancelar</button>
 <button type="submit" class="primary">${isEdit ? 'Salvar' : 'Criar'}</button>
 </div>
 </form>
 </div>`;
 document.body.appendChild(host);

 // Render (ou re-render) da secao de subtarefas in-place.
 // v0.2.25 fix: nao fecha+reabre o modal; atualiza o DOM no proprio lugar.
 function renderSubtarefas() {
 const sec = host.querySelector('#subtarefas-section');
 if (!isEdit) { sec.innerHTML = `<p style="color:var(--fg-3); font-size:12px; font-style:italic;">Salve a tarefa primeiro para adicionar subtarefas.</p>`; return; }
 sec.innerHTML = `
 <label>Subtarefas (${subs.length})</label>
 <ul id="subtarefas-lista" style="list-style:none; padding:0; margin:0 0 6px;">
 ${subs.map(s => `
 <li data-id="${s.id}" style="display:flex; gap:6px; align-items:center; padding:3px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
 <input type="checkbox" data-acao="toggle-subtarefa" ${s.concluida ? 'checked' : ''} style="flex:0;">
 <span style="flex:1; ${s.concluida ? 'text-decoration:line-through; color: var(--fg-3);' : ''}">${escapeHtml(s.titulo)}</span>
 <button type="button" data-acao="excluir-subtarefa" class="danger" style="padding:2px 8px; font-size:11px;" title="Excluir subtarefa">×</button>
 </li>`).join('')}
 ${subs.length === 0 ? '<li style="color:var(--fg-3); font-size:12px; padding:4px 0;">Nenhuma subtarefa ainda.</li>' : ''}
 </ul>
 <div style="display:flex; gap:4px;">
 <input id="subtarefa-nova" placeholder="Nova subtarefa (Enter para adicionar)..." style="flex:1;">
 <button type="button" data-acao="add-subtarefa" class="primary" style="padding:4px 12px;">+</button>
 </div>
 `;
 const lista = sec.querySelector('#subtarefas-lista');
 const inputNova = sec.querySelector('#subtarefa-nova');
 const btnAdd = sec.querySelector('[data-acao="add-subtarefa"]');
 // Flag pra evitar duplo-submit rapido (Enter spam)
 let _busy = false;
 const addSubtarefa = async () => {
 if (_busy) return;
 const titulo = inputNova.value.trim();
 if (!titulo) return;
 _busy = true;
 btnAdd.disabled = true; inputNova.disabled = true;
 try {
 const r = await window.api('tarefas:adicionarSubtarefa', { tarefa_id: t.id, titulo });
 if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
 inputNova.value = '';
 subs.push({ id: r.dados.id, titulo, concluida: 0 });
 renderSubtarefas();
 inputNova.focus();
 } finally {
 _busy = false;
 btnAdd.disabled = false; inputNova.disabled = false;
 }
 };
 btnAdd.onclick = addSubtarefa;
 inputNova.onkeydown = (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); addSubtarefa(); } };
 lista.querySelectorAll('input[data-acao="toggle-subtarefa"]').forEach(cb => {
 cb.onchange = async () => {
 const li = cb.closest('li');
 const id = li.dataset.id;
 const concluida = cb.checked ? 1 : 0;
 const r = await window.api('tarefas:toggleSubtarefa', { id, concluida: !!concluida });
 if (!r.ok) { cb.checked = !cb.checked; alert(r.erro?.mensagem || 'erro'); return; }
 const s = subs.find(x => x.id === id);
 if (s) s.concluida = concluida;
 // Re-render so pra atualizar o estilo riscado
 renderSubtarefas();
 };
 });
 lista.querySelectorAll('button[data-acao="excluir-subtarefa"]').forEach(btn => {
 btn.onclick = async () => {
 const li = btn.closest('li');
 const id = li.dataset.id;
 if (!confirm('Excluir esta subtarefa?')) return;
 const r = await window.api('tarefas:excluirSubtarefa', { id });
 if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
 subs = subs.filter(x => x.id !== id);
 renderSubtarefas();
 };
 });
 }
 renderSubtarefas();

 host.querySelector('[data-acao="cancelar"]').onclick = () => host.remove();
 if (isEdit) {
 const btnExcluir = host.querySelector('[data-acao="excluir"]');
 if (btnExcluir) btnExcluir.onclick = async () => {
 if (!confirm('Excluir esta tarefa PERMANENTEMENTE? Esta acao nao pode ser desfeita.')) return;
 const r = await window.api('tarefas:excluir', { id: t.id, versao: t.versao });
 if (!r.ok) { alert(r.erro?.mensagem || 'erro'); return; }
 host.remove();
 if (onClose) onClose();
 };
 }
 host.querySelector('#form-tarefa').onsubmit = async (e) => {
 e.preventDefault();
 const fd = new FormData(e.target);
 const dados = Object.fromEntries(fd.entries());
 if (dados.vencimento_em) dados.vencimento_em = new Date(dados.vencimento_em).toISOString();
 if (!dados.area_id) delete dados.area_id;
 if (!dados.projeto_id) delete dados.projeto_id;
 if (!dados.cliente_id) delete dados.cliente_id;
 if (!dados.recorrencia_tipo) delete dados.recorrencia_tipo;
 if (!dados.vencimento_em) delete dados.vencimento_em;
 let r;
 if (isEdit) {
 dados.id = t.id; dados.versao = t.versao;
 r = await window.api('tarefas:atualizar', dados);
 } else {
 r = await window.api('tarefas:criar', dados);
 }
 if (r.ok) { host.remove(); if (onClose) onClose(); }
 else { alert(r.erro?.mensagem || 'erro'); }
 };
}
function menuLateralBind(main) {
 main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
 a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
 });
}
