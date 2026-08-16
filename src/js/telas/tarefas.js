// src/js/telas/tarefas.js — lista, filtros e CRUD de tarefas
import { escapeHtml } from '../backend/ambiente.js';

let _cache = { areas: [], projetos: [], clientes: [], filtro: {} };

export async function renderTarefas() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    <div class="topbar">
      <span class="brand">Gestor</span>
      <span class="brand-sub" id="versao-app"></span>
      <span class="spacer"></span>
      <span class="status" id="status-topo">carregando...</span>
    </div>
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
  document.getElementById('versao-app').textContent = 'v' + (window.NEUTRALINO_GLOBALS?.neutralinoConfig?.version || '0.1.0');
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
  el.innerHTML = `<div class="card" style="padding:0;"><table class="tabela">
    <thead><tr><th></th><th>Título</th><th>Status</th><th>Prioridade</th><th>Área</th><th>Projeto</th><th>Vencimento</th><th></th></tr></thead>
    <tbody>${r.dados.map(t => linhaTarefa(t)).join('')}</tbody>
  </table></div>`;
  el.querySelectorAll('[data-acao]').forEach(b => {
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
      }
    };
  });
}

function linhaTarefa(t) {
  const venc = t.vencimento_em ? new Date(t.vencimento_em) : null;
  const vencida = venc && venc < new Date() && !['CONCLUIDA','CANCELADA','ARQUIVADA'].includes(t.status);
  return `<tr>
    <td><span class="dot" style="background:${t.area_cor || '#888'}"></span></td>
    <td><strong>${escapeHtml(t.titulo)}</strong>${t.descricao ? `<br><span style="color:var(--fg-3); font-size:11px;">${escapeHtml(t.descricao.slice(0,80))}</span>` : ''}</td>
    <td><span class="pill status-${t.status}">${t.status}</span></td>
    <td><span class="pill prioridade-${t.prioridade}">${t.prioridade}</span></td>
    <td>${t.area_nome ? escapeHtml(t.area_nome) : '—'}</td>
    <td>${t.projeto_titulo ? escapeHtml(t.projeto_titulo) : '—'}</td>
    <td>${vencida ? '<span style="color:var(--danger);">⚠ ' : ''}${venc ? formatarData(venc) : '—'}</td>
    <td style="text-align:right;">
      <button data-id="${t.id}" data-v="${t.versao}" data-acao="editar">Editar</button>
      ${t.status !== 'CONCLUIDA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="concluir" class="success">✓</button>` : ''}
      ${t.status !== 'CANCELADA' && t.status !== 'ARQUIVADA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="adiar">⏰</button><button data-id="${t.id}" data-v="${t.versao}" data-acao="cancelar" class="danger">✕</button>` : ''}
      ${t.status !== 'ARQUIVADA' ? `<button data-id="${t.id}" data-v="${t.versao}" data-acao="arquivar">📥</button>` : ''}
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
  const host = document.createElement('div'); host.className = 'modal-host';
  host.innerHTML = `<div class="modal" style="min-width:520px;">
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
      <div class="acoes">
        <button type="button" data-acao="cancelar">Cancelar</button>
        <button type="submit" class="primary">${isEdit ? 'Salvar' : 'Criar'}</button>
      </div>
    </form>
  </div>`;
  document.body.appendChild(host);
  host.querySelector('[data-acao="cancelar"]').onclick = () => host.remove();
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

function menuLateral(ativa) {
  const itens = [
    ['hoje','Hoje'], ['inbox','Caixa de entrada'], ['tarefas','Tarefas'],
    ['projetos','Projetos'], ['clientes','Clientes'], ['areas','Áreas'],
    ['busca','Buscar'], ['config','Configurações'],
  ];
  return '<ul class="nav">' + itens.map(([r, t]) =>
    `<li><a href="#" data-rota="${r}"${r===ativa?' class="ativa"':''}>${t}</a></li>`
  ).join('') + '</ul>';
}

function menuLateralBind(main) {
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });
}
