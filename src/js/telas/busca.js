// src/js/telas/busca.js — busca global em tarefas, projetos, clientes, areas
// v0.2.25: botoes de excluir em cada resultado (Marcio pediu varias vezes)
import { escapeHtml, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

let _timer = null;

export async function renderBusca() {
 const main = document.getElementById('app');
 if (!main) return;
 main.innerHTML = `
 ${topbar()}
 <div class="main">
 <aside class="sidebar">${menuLateral('busca')}</aside>
 <main class="conteudo">
 <h2 style="color: var(--cor-marca);">Busca global</h2>
 <div class="card" style="padding:8px 12px;">
 <input id="busca-q" placeholder="Digite para buscar (mínimo 2 caracteres)..." style="width:100%; font-size:14px; padding:8px;" autofocus>
 </div>
 <div id="resultados-busca"><p class="vazia">Comece a digitar para ver resultados.</p></div>
 </main>
 </div>
 `;
 document.getElementById('versao-app').textContent = 'v' + (document.querySelector('meta[name="app-version"]')?.content || window.__appVersion || '0.2.25');
 main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
 a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
 });
 const input = document.getElementById('busca-q');
 input.oninput = () => {
 clearTimeout(_timer);
 _timer = setTimeout(buscar, 200);
 };
 input.focus();
}

async function buscar() {
 const q = document.getElementById('busca-q').value.trim();
 const el = document.getElementById('resultados-busca');
 if (q.length < 2) { el.innerHTML = `<p class="vazia">Digite pelo menos 2 caracteres.</p>`; return; }
 const r = await window.api('busca:global', { q });
 if (!r.ok) { el.innerHTML = `<p class="vazia">Erro: ${escapeHtml(r.erro?.mensagem || '')}</p>`; return; }
 const { tarefas, projetos, clientes, areas } = r.dados;
 const total = tarefas.length + projetos.length + clientes.length + areas.length;
 if (total === 0) { el.innerHTML = `<p class="vazia">Nenhum resultado para "${escapeHtml(q)}".</p>`; return; }
 el.innerHTML = `
 ${tarefas.length ? `<div class="card"><h3> Tarefas (${tarefas.length})</h3><ul class="lista">${tarefas.map(t => `
 <li>
 <span class="pill prioridade-${t.prioridade}">${t.prioridade}</span>
 <span class="pill status-${t.status}">${t.status}</span>
 <span class="titulo">${escapeHtml(t.titulo)}</span>
 <button data-tipo="tarefa" data-id="${t.id}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>
 </li>`).join('')}</ul></div>` : ''}
 ${projetos.length ? `<div class="card"><h3> Projetos (${projetos.length})</h3><ul class="lista">${projetos.map(p => `
 <li>
 <span class="pill status-${p.status}">${p.status}</span>
 <span class="titulo">${escapeHtml(p.titulo)}</span>
 <button data-tipo="projeto" data-id="${p.id}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>
 </li>`).join('')}</ul></div>` : ''}
 ${clientes.length ? `<div class="card"><h3> Clientes (${clientes.length})</h3><ul class="lista">${clientes.map(c => `
 <li>
 <strong>${escapeHtml(c.titulo)}</strong>${c.organizacao ? ' <span style="color:var(--fg-3);">— ' + escapeHtml(c.organizacao) + '</span>' : ''}
 <button data-tipo="cliente" data-id="${c.id}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>
 </li>`).join('')}</ul></div>` : ''}
 ${areas.length ? `<div class="card"><h3> Áreas (${areas.length})</h3><ul class="lista">${areas.map(a => `
 <li>
 <span class="dot" style="background:${a.cor}"></span>
 <span class="titulo">${escapeHtml(a.titulo)}</span>
 <button data-tipo="area" data-id="${a.id}" data-acao="excluir" class="danger" title="Excluir permanentemente">Excluir</button>
 </li>`).join('')}</ul></div>` : ''}
 `;

 // Botoes de excluir
 el.querySelectorAll('button[data-acao="excluir"]').forEach(btn => {
 btn.onclick = async () => {
 const tipo = btn.dataset.tipo;
 const id = btn.dataset.id;
 const mapa = {
 tarefa: { canal: 'tarefas:excluir', label: 'tarefa' },
 projeto: { canal: 'projetos:excluir', label: 'projeto' },
 cliente: { canal: 'clientes:excluir', label: 'cliente' },
 area: { canal: 'areas:excluir', label: 'area' },
 };
 const info = mapa[tipo];
 if (!info) return;
 if (!confirm(`Excluir este(a) ${info.label} PERMANENTEMENTE? Esta acao nao pode ser desfeita.`)) return;
 const r = await window.api(info.canal, { id });
 if (!r.ok) {
 toast({ tipo: 'erro', titulo: 'Erro ao excluir', corpo: r.erro?.mensagem || 'erro' });
 return;
 }
 toast({ tipo: 'sucesso', titulo: 'Excluído' });
 // Recarrega resultados
 buscar();
 };
 });
}
