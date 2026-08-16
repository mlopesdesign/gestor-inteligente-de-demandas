// src/js/telas/clientes.js — lista e CRUD de clientes/contatos
import { escapeHtml } from '../backend/ambiente.js';
import { topbar, menuLateral } from './_chrome.js';

export async function renderClientes() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    ${topbar()}
    <div class="main">
      <aside class="sidebar">${menuLateral('clientes')}</aside>
      <main class="conteudo">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
          <h2 style="flex:1; color: var(--cor-marca);">Clientes / Contatos</h2>
          <button class="primary" id="btn-novo-cliente">+ Novo cliente</button>
        </div>
        <div class="card" style="padding:8px 12px;">
          <div style="display:flex; gap:8px;">
            <input id="filtro-busca" placeholder="Buscar por nome, organização, email..." style="flex:1;">
            <label style="display:flex; align-items:center; gap:4px; font-size:12px;"><input type="checkbox" id="filtro-arquivados"> incluir arquivados</label>
          </div>
        </div>
        <div id="lista-clientes">carregando...</div>
      </main>
    </div>
  `;
  document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });

  document.getElementById('btn-novo-cliente').onclick = () => modalCliente(null, carregar);
  ['filtro-busca','filtro-arquivados'].forEach(id => {
    document.getElementById(id).oninput = carregar;
    document.getElementById(id).onchange = carregar;
  });
  carregar();
}

async function carregar() {
  const f = { busca: document.getElementById('filtro-busca').value || undefined };
  const r = await window.api('clientes:listar', f);
  const el = document.getElementById('lista-clientes');
  if (!r.ok) { el.innerHTML = `<p class="vazia">Erro: ${escapeHtml(r.erro?.mensagem || '')}</p>`; return; }
  const mostrar = document.getElementById('filtro-arquivados').checked ? r.dados : r.dados.filter(c => !c.arquivado_em);
  if (mostrar.length === 0) { el.innerHTML = `<p class="vazia">Nenhum cliente.</p>`; return; }
  document.getElementById('status-topo').textContent = '● ' + mostrar.length + ' clientes';
  el.innerHTML = `<div class="card" style="padding:0;"><table class="tabela">
    <thead><tr><th>Nome</th><th>Organização</th><th>Email</th><th>Telefone</th><th>Projetos</th><th>Tarefas ativas</th><th></th></tr></thead>
    <tbody>${mostrar.map(c => `<tr>
      <td><strong>${escapeHtml(c.nome)}</strong></td>
      <td>${c.organizacao ? escapeHtml(c.organizacao) : '—'}</td>
      <td>${c.email ? `<a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a>` : '—'}</td>
      <td>${c.telefone ? escapeHtml(c.telefone) : '—'}</td>
      <td>${c.projetos_ativos || 0}</td>
      <td>${c.tarefas_ativas || 0}</td>
      <td style="text-align:right;">
        <button data-id="${c.id}" data-acao="editar">Editar</button>
        ${!c.arquivado_em ? `<button data-id="${c.id}" data-acao="arquivar" class="danger">📥</button>` : '<span style="color:var(--fg-3);">arquivado</span>'}
      </td>
    </tr>`).join('')}</tbody>
  </table></div>`;
  el.querySelectorAll('[data-acao]').forEach(b => {
    b.onclick = async () => {
      const id = b.dataset.id, ac = b.dataset.acao;
      if (ac === 'editar') {
        const t = (await window.api('clientes:obter', { id })).dados;
        modalCliente(t, carregar);
      } else if (ac === 'arquivar') {
        if (confirm('Arquivar este cliente?')) { await window.api('clientes:arquivar', { id }); carregar(); }
      }
    };
  });
}

export function modalCliente(c, onClose) {
  const isEdit = !!c;
  const t = c || {};
  const host = document.createElement('div'); host.className = 'modal-host';
  host.innerHTML = `<div class="modal" style="min-width:520px;">
    <h2>${isEdit ? 'Editar' : 'Novo'} cliente</h2>
    <form id="form-cliente">
      <div class="campo"><label>Nome*</label><input name="nome" required value="${escapeHtml(t.nome || '')}"></div>
      <div class="campo"><label>Organização</label><input name="organizacao" value="${escapeHtml(t.organizacao || '')}"></div>
      <div style="display:flex; gap:8px;">
        <div class="campo" style="flex:1;"><label>Email</label><input type="email" name="email" value="${escapeHtml(t.email || '')}"></div>
        <div class="campo" style="flex:1;"><label>Telefone</label><input name="telefone" value="${escapeHtml(t.telefone || '')}"></div>
      </div>
      <div class="campo"><label>Observações</label><textarea name="observacoes" rows="3">${escapeHtml(t.observacoes || '')}</textarea></div>
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(host);
  host.querySelector('[data-acao="cancelar"]').onclick = () => host.remove();
  host.querySelector('#form-cliente').onsubmit = async (e) => {
    e.preventDefault();
    const dados = Object.fromEntries(new FormData(e.target).entries());
    if (!dados.organizacao) delete dados.organizacao;
    if (!dados.email) delete dados.email;
    if (!dados.telefone) delete dados.telefone;
    if (!dados.observacoes) delete dados.observacoes;
    let r;
    if (isEdit) { dados.id = t.id; dados.versao = t.versao; r = await window.api('clientes:atualizar', dados); }
    else { r = await window.api('clientes:criar', dados); }
    if (r.ok) { host.remove(); if (onClose) onClose(); }
    else { alert(r.erro?.mensagem || 'erro'); }
  };
}

// (menuLateral movido pra _chrome.js)
function menuLateral(ativa) { return ''; }
