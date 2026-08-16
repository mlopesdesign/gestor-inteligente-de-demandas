// src/js/telas/areas.js — lista e CRUD de areas
import { escapeHtml } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

const CORES = ['#f0a000','#03a9f4','#9c27b0','#4caf50','#e91e63','#607d8b','#ff5722','#009688','#673ab7','#795548','#2196f3','#cddc39'];

export async function renderAreas() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    ${topbar()}
    <div class="main">
      <aside class="sidebar">${menuLateral('areas')}</aside>
      <main class="conteudo">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <h2 style="flex:1; color: var(--cor-marca);">Áreas</h2>
          <button class="primary" id="btn-nova-area">+ Nova área</button>
        </div>
        <div class="card" style="padding:8px 12px; font-size:12px; color:var(--fg-3);">
          Áreas agrupam tarefas por contexto amplo (Trabalho, Pessoal, Desenvolvimento, etc).
        </div>
        <div id="lista-areas">carregando...</div>
      </main>
    </div>
  `;
  document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });
  document.getElementById('btn-nova-area').onclick = () => modalArea(null, carregar);
  carregar();
}

async function carregar() {
  const r = await window.api('areas:listar');
  const el = document.getElementById('lista-areas');
  if (!r.ok) { el.innerHTML = `<p class="vazia">Erro: ${escapeHtml(r.erro?.mensagem || '')}</p>`; return; }
  if (r.dados.length === 0) { el.innerHTML = `<p class="vazia">Nenhuma área. Crie uma para começar.</p>`; return; }
  document.getElementById('status-topo').textContent = '● ' + r.dados.length + ' áreas';
  el.innerHTML = `<div style="display:grid; gap:8px; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));">${r.dados.map(cardArea).join('')}</div>`;
  el.querySelectorAll('[data-acao]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id, ac = b.dataset.acao;
      if (ac === 'editar') {
        const t = r.dados.find(x => x.id === id);
        modalArea(t, carregar);
      } else if (ac === 'excluir') {
        if (confirm('Excluir esta área?')) { const r2 = await window.api('areas:excluir', { id }); if (!r2.ok) alert(r2.erro?.mensagem || 'erro'); carregar(); }
      }
    };
  });
}

function cardArea(a) {
  return `<div class="card" style="margin:0;">
    <div style="display:flex; align-items:center; gap:8px;">
      <span class="dot" style="background:${a.cor}; width:18px; height:18px; border-radius:4px;"></span>
      <h3 style="flex:1; margin:0; font-size:14px;">${escapeHtml(a.nome)}</h3>
      <span style="font-size:11px; color:var(--fg-3);">${a.tarefas_ativas || 0} ativas</span>
    </div>
    <div style="margin-top:8px; display:flex; gap:4px;">
      <button data-id="${a.id}" data-acao="editar">Editar</button>
      <button data-id="${a.id}" data-acao="excluir" class="danger">Excluir</button>
    </div>
  </div>`;
}

export function modalArea(a, onClose) {
  const isEdit = !!a;
  const t = a || {};
  const host = document.createElement('div'); host.className = 'modal-host';
  host.innerHTML = `<div class="modal" style="min-width:480px;">
    <h2>${isEdit ? 'Editar' : 'Nova'} área</h2>
    <form id="form-area">
      <div class="campo"><label>Nome*</label><input name="nome" required value="${escapeHtml(t.nome || '')}"></div>
      <div class="campo"><label>Cor</label>
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          ${CORES.map(c => `<label style="display:inline-block; width:32px; height:32px; border-radius:4px; background:${c}; cursor:pointer; border: 3px solid ${c === t.cor ? '#fff' : 'transparent'};"><input type="radio" name="cor" value="${c}" style="display:none;" ${c === t.cor ? 'checked' : ''}></label>`).join('')}
        </div>
      </div>
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(host);
  // Bind radio change to update visual border
  host.querySelectorAll('label input[type=radio]').forEach(r => {
    r.onchange = () => {
      host.querySelectorAll('label').forEach(l => l.style.border = '3px solid transparent');
      r.parentElement.style.border = '3px solid #fff';
    };
  });
  host.querySelector('[data-acao="cancelar"]').onclick = () => host.remove();
  host.querySelector('#form-area').onsubmit = async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    if (!dados.cor) dados.cor = CORES[0];
    let r;
    if (isEdit) { dados.id = t.id; dados.versao = t.versao; r = await window.api('areas:atualizar', dados); }
    else { r = await window.api('areas:criar', dados); }
    if (r.ok) { host.remove(); if (onClose) onClose(); }
    else { alert(r.erro?.mensagem || 'erro'); }
  };
}
