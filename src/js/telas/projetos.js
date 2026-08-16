// src/js/telas/projetos.js — lista e CRUD de projetos
import { escapeHtml } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

let _cache = { areas: [], clientes: [] };

export async function renderProjetos() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    ${topbar()}
    <div class="main">
      <aside class="sidebar">${menuLateral('projetos')}</aside>
      <main class="conteudo">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <h2 style="flex:1; color: var(--cor-marca);">Projetos</h2>
          <button class="primary" id="btn-novo-projeto">+ Novo projeto</button>
        </div>
        <div class="card" style="padding:8px 12px;">
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <input id="filtro-busca" placeholder="Buscar..." style="flex:1; min-width:200px;">
            <select id="filtro-status">
              <option value="">Todos os status</option>
              <option value="PLANEJADO">Planejado</option>
              <option value="EM_ANDAMENTO">Em andamento</option>
              <option value="PAUSADO">Pausado</option>
              <option value="CONCLUIDO">Concluído</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
            <select id="filtro-cliente"><option value="">Todos os clientes</option></select>
            <label style="display:flex; align-items:center; gap:4px; font-size:12px;"><input type="checkbox" id="filtro-arquivados"> incluir arquivados</label>
          </div>
        </div>
        <div id="lista-projetos">carregando...</div>
      </main>
    </div>
  `;
  document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });

  const [a, c] = await Promise.all([
    window.api('areas:listar'),
    window.api('clientes:listar', { incluir_arquivadas: true }),
  ]);
  _cache.areas = a.ok ? a.dados : [];
  _cache.clientes = c.ok ? c.dados : [];
  const selC = document.getElementById('filtro-cliente');
  for (const x of _cache.clientes) selC.innerHTML += `<option value="${x.id}">${escapeHtml(x.nome)}</option>`;

  document.getElementById('btn-novo-projeto').onclick = () => modalProjeto(null, _cache, carregar);
  ['filtro-busca','filtro-status','filtro-cliente','filtro-arquivados'].forEach(id => {
    document.getElementById(id).oninput = carregar;
    document.getElementById(id).onchange = carregar;
  });

  carregar();
}

async function carregar() {
  const f = {
    status: document.getElementById('filtro-status').value || undefined,
    cliente_id: document.getElementById('filtro-cliente').value || undefined,
  };
  const r = await window.api('projetos:listar', f);
  const el = document.getElementById('lista-projetos');
  if (!r.ok) { el.innerHTML = `<p class="vazia">Erro: ${escapeHtml(r.erro?.mensagem || '')}</p>`; return; }
  const mostrar = document.getElementById('filtro-arquivados').checked ? r.dados : r.dados.filter(p => !p.arquivado_em);
  const busca = document.getElementById('filtro-busca').value.toLowerCase().trim();
  const lista = busca ? mostrar.filter(p => (p.titulo || '').toLowerCase().includes(busca)) : mostrar;
  if (lista.length === 0) { el.innerHTML = `<p class="vazia">Nenhum projeto.</p>`; return; }
  document.getElementById('status-topo').textContent = '● ' + lista.length + ' projetos';
  el.innerHTML = `<div style="display:grid; gap:12px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));">${lista.map(cardProjeto).join('')}</div>`;
  el.querySelectorAll('[data-acao]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id, v = Number(b.dataset.v), ac = b.dataset.acao;
      if (ac === 'editar') {
        const t = (await window.api('projetos:obter', { id })).dados;
        modalProjeto(t, _cache, carregar);
      } else if (ac === 'concluir') {
        if (confirm('Concluir este projeto?')) { await window.api('projetos:concluir', { id }); carregar(); }
      } else if (ac === 'arquivar') {
        if (confirm('Arquivar?')) { await window.api('projetos:arquivar', { id }); carregar(); }
      } else if (ac === 'tarefas') {
        window.irPara('tarefas');
      }
    };
  });
}

function cardProjeto(p) {
  const ini = p.inicio_em ? new Date(p.inicio_em).toLocaleDateString('pt-BR') : '';
  const fim = p.termino_previsto_em ? new Date(p.termino_previsto_em).toLocaleDateString('pt-BR') : '—';
  return `<div class="card" style="margin:0;">
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="dot" style="background:${p.area_cor || '#888'}"></span>
      <h3 style="flex:1; margin:0; font-size:14px;">${escapeHtml(p.titulo)}</h3>
      <span class="pill status-${p.status}">${p.status}</span>
    </div>
    ${p.descricao ? `<p style="color:var(--fg-2); font-size:12px; margin:6px 0;">${escapeHtml(p.descricao.slice(0, 120))}</p>` : ''}
    <div style="font-size:11px; color:var(--fg-3); margin-top:8px;">
      ${p.cliente_nome ? '👤 ' + escapeHtml(p.cliente_nome) : ''}
      ${p.area_nome ? ' &middot; 🏷 ' + escapeHtml(p.area_nome) : ''}
      ${ini ? ' &middot; ' + ini : ''} → ${fim}
    </div>
    <div style="font-size:11px; color:var(--fg-2); margin-top:4px;">
      ${p.tarefas_ativas || 0} tarefa(s) ativa(s) / ${p.tarefas_total || 0} total
    </div>
    <div style="margin-top:8px; display:flex; gap:4px; flex-wrap:wrap;">
      <button data-id="${p.id}" data-v="${p.versao}" data-acao="editar">Editar</button>
      ${!p.arquivado_em && p.status !== 'CONCLUIDO' ? `<button data-id="${p.id}" data-v="${p.versao}" data-acao="concluir" class="success">✓ Concluir</button>` : ''}
      ${!p.arquivado_em ? `<button data-id="${p.id}" data-v="${p.versao}" data-acao="arquivar">📥</button>` : ''}
      <button data-id="${p.id}" data-acao="tarefas">Ver tarefas</button>
    </div>
  </div>`;
}

export function modalProjeto(p, cache, onClose) {
  const isEdit = !!p;
  const t = p || {};
  const host = document.createElement('div'); host.className = 'modal-host';
  host.innerHTML = `<div class="modal" style="min-width:520px;">
    <h2>${isEdit ? 'Editar' : 'Novo'} projeto</h2>
    <form id="form-projeto">
      <div class="campo"><label>Título*</label><input name="titulo" required value="${escapeHtml(t.titulo || '')}"></div>
      <div class="campo"><label>Descrição</label><textarea name="descricao" rows="3">${escapeHtml(t.descricao || '')}</textarea></div>
      <div style="display:flex; gap:8px;">
        <div class="campo" style="flex:1;"><label>Cliente</label>
          <select name="cliente_id"><option value="">—</option>${(cache?.clientes||[]).map(x => `<option value="${x.id}" ${t.cliente_id===x.id?'selected':''}>${escapeHtml(x.nome)}</option>`).join('')}</select>
        </div>
        <div class="campo" style="flex:1;"><label>Área</label>
          <select name="area_id"><option value="">—</option>${(cache?.areas||[]).map(x => `<option value="${x.id}" ${t.area_id===x.id?'selected':''}>${escapeHtml(x.nome)}</option>`).join('')}</select>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <div class="campo" style="flex:1;"><label>Status</label>
          <select name="status">
            ${['PLANEJADO','EM_ANDAMENTO','PAUSADO','CONCLUIDO','CANCELADO'].map(s => `<option value="${s}" ${t.status===s||(!t.status&&s==='PLANEJADO')?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
        <div class="campo" style="flex:1;"><label>Prioridade</label>
          <select name="prioridade">
            ${['BAIXA','NORMAL','ALTA','URGENTE','CRITICA'].map(s => `<option value="${s}" ${t.prioridade===s||(!t.prioridade&&s==='NORMAL')?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="display:flex; gap:8px;">
        <div class="campo" style="flex:1;"><label>Início</label><input type="date" name="inicio_em" value="${t.inicio_em ? t.inicio_em.slice(0,10) : ''}"></div>
        <div class="campo" style="flex:1;"><label>Término previsto</label><input type="date" name="termino_previsto_em" value="${t.termino_previsto_em ? t.termino_previsto_em.slice(0,10) : ''}"></div>
      </div>
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(host);
  host.querySelector('[data-acao="cancelar"]').onclick = () => host.remove();
  host.querySelector('#form-projeto').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const dados = Object.fromEntries(fd.entries());
    if (dados.inicio_em) dados.inicio_em = new Date(dados.inicio_em).toISOString();
    if (dados.termino_previsto_em) dados.termino_previsto_em = new Date(dados.termino_previsto_em).toISOString();
    if (!dados.cliente_id) delete dados.cliente_id;
    if (!dados.area_id) delete dados.area_id;
    if (!dados.inicio_em) delete dados.inicio_em;
    if (!dados.termino_previsto_em) delete dados.termino_previsto_em;
    let r;
    if (isEdit) { dados.id = t.id; dados.versao = t.versao; r = await window.api('projetos:atualizar', dados); }
    else { r = await window.api('projetos:criar', dados); }
    if (r.ok) { host.remove(); if (onClose) onClose(); }
    else { alert(r.erro?.mensagem || 'erro'); }
  };
}

// (menuLateral movido pra _chrome.js)
function menuLateral(ativa) { return ''; }
