// src/js/telas/inbox.js — Caixa de entrada (captura rapida de tarefas)
import { escapeHtml, modal, toast } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

let _cache = { areas: [], projetos: [], clientes: [] };

export async function renderInbox() {
 const main = document.getElementById('app');
 if (!main) return;
 main.innerHTML = `
 ${topbar()}
 <div class="main">
 <aside class="sidebar">${menuLateral('inbox')}</aside>
 <main class="conteudo">
 <h2 style="color: var(--cor-marca);">Caixa de entrada</h2>
 <p style="color:var(--fg-3); font-size:13px; margin-bottom:12px;">Capture uma tarefa em segundos. Você organiza depois.</p>
 <div class="card">
 <form id="inbox-form" style="display: flex; gap: 8px;">
 <input type="text" id="inbox-texto" placeholder="Ex: 'Ligar para João amanhã 14h'" style="flex: 1; font-size:14px; padding:8px;" autofocus>
 <button type="submit" class="primary" style="padding:8px 16px;">Capturar</button>
 </form>
 </div>
 <div class="card" id="inbox-lista-card">
 <h2>Tarefas na caixa (últimas 50)</h2>
 <div id="inbox-lista">carregando...</div>
 </div>
 </main>
 </div>
 `;
 document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
 main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
 a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
 });
 document.getElementById('inbox-form').onsubmit = async (e) => {
 e.preventDefault();
 const texto = document.getElementById('inbox-texto').value.trim();
 if (!texto) return;
 const r = await window.api('tarefas:criar', { titulo: texto, status: 'CAIXA_ENTRADA', origem: 'INBOX' });
 if (r.ok) {
 toast({ tipo: 'sucesso', titulo: 'Capturada', corpo: 'Tarefa criada.' });
 document.getElementById('inbox-texto').value = '';
 carregar();
 } else { toast({ tipo: 'erro', titulo: 'Erro', corpo: r.erro?.mensagem || 'erro' }); }
 };
 // Carrega cache
 const [a, p, c] = await Promise.all([
 window.api('areas:listar'),
 window.api('projetos:listar', { incluir_arquivadas: true }),
 window.api('clientes:listar', { incluir_arquivadas: true }),
 ]);
 _cache = { areas: a.ok ? a.dados : [], projetos: p.ok ? p.dados : [], clientes: c.ok ? c.dados : [] };
 carregar();
}

async function carregar() {
 const r = await window.api('tarefas:listar', { status: 'CAIXA_ENTRADA', limite: 50 });
 const el = document.getElementById('inbox-lista');
 if (!r.ok) { el.innerHTML = '<p class="vazia">Erro: ' + escapeHtml(r.erro?.mensagem || '') + '</p>'; return; }
 if (r.dados.length === 0) { el.innerHTML = '<p class="vazia">Caixa vazia. Digite algo acima e clique Capturar.</p>'; return; }
 el.innerHTML = '<ul class="lista">' + r.dados.map(t => `
 <li>
 <span class="pill prioridade-${t.prioridade}">${t.prioridade}</span>
 <span class="titulo">${escapeHtml(t.titulo)}</span>
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir"> Concluir</button>
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="organizar">Organizar</button>
 <button data-id="${t.id}" data-v="${t.versao}" data-acao="excluir" class="danger"></button>
 </li>`).join('') + '</ul>';

 el.querySelectorAll('[data-acao]').forEach(btn => {
 btn.onclick = async () => {
 const id = btn.dataset.id, v = Number(btn.dataset.v), ac = btn.dataset.acao;
 if (ac === 'concluir') {
 if (confirm('Concluir?')) { await window.api('tarefas:concluir', { id, versao: v }); carregar(); }
 } else if (ac === 'organizar') {
 const m = await modal({
 titulo: 'Organizar tarefa',
 campos: [
 { nome: 'prioridade', tipo: 'select', valor: 'NORMAL', opcoes: [
 { valor: 'BAIXA', texto: 'BAIXA' }, { valor: 'NORMAL', texto: 'NORMAL' },
 { valor: 'ALTA', texto: 'ALTA' }, { valor: 'URGENTE', texto: 'URGENTE' }, { valor: 'CRITICA', texto: 'CRITICA' },
 ]},
 { nome: 'nivel_cobranca', tipo: 'select', valor: 'PERSISTENTE', opcoes: [
 { valor: 'DISCRETA', texto: 'DISCRETA' }, { valor: 'PERSISTENTE', texto: 'PERSISTENTE' },
 { valor: 'INTENSIVA', texto: 'INTENSIVA' }, { valor: 'CRITICA', texto: 'CRITICA' },
 ]},
 { nome: 'vencimento_em', tipo: 'text', placeholder: 'YYYY-MM-DD ou YYYY-MM-DDTHH:mm' },
 { nome: 'area_id', tipo: 'select', valor: '', opcoes: [{ valor: '', texto: '— (escolher depois) —' }, ..._cache.areas.map(x => ({ valor: x.id, texto: x.nome }))] },
 { nome: 'projeto_id', tipo: 'select', valor: '', opcoes: [{ valor: '', texto: '—' }, ..._cache.projetos.map(x => ({ valor: x.id, texto: x.titulo }))] },
 { nome: 'cliente_id', tipo: 'select', valor: '', opcoes: [{ valor: '', texto: '—' }, ..._cache.clientes.map(x => ({ valor: x.id, texto: x.nome }))] },
 ],
 acoes: [
 { texto: 'Cancelar', valor: 'cancelar' },
 { texto: 'Mover para Planejamento', valor: 'salvar' },
 ],
 });
 if (m.acao === 'salvar') {
 const d = m.dados;
 if (d.vencimento_em) {
 try { d.vencimento_em = new Date(d.vencimento_em).toISOString(); } catch (_) { delete d.vencimento_em; }
 }
 if (!d.area_id) delete d.area_id;
 if (!d.projeto_id) delete d.projeto_id;
 if (!d.cliente_id) delete d.cliente_id;
 if (!d.vencimento_em) delete d.vencimento_em;
 d.status = 'PLANEJADA';
 const r2 = await window.api('tarefas:atualizar', { id, versao: v, ...d });
 if (r2.ok) { toast({ tipo: 'sucesso', titulo: 'Organizada' }); carregar(); }
 else { toast({ tipo: 'erro', titulo: 'Erro', corpo: r2.erro?.mensagem || 'erro' }); }
 }
 } else if (ac === 'excluir') {
 // "excluir" aqui é arquivar (tarefa da inbox)
 if (confirm('Arquivar?')) { await window.api('tarefas:arquivar', { id, versao: v }); carregar(); }
 }
 };
 });
}
