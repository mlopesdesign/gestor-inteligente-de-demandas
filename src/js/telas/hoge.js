// src/js/telas/hoge.js — tela principal (Hoje)
// Lista tarefas agrupadas por buckets (PROJETO §11.1).
import { api } from '../app.js';
import { escapeHtml } from '../backend/ambiente.js';

export async function renderHoje() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    <div class="topbar">
      <span class="brand">Gestor</span>
      <span class="brand-sub" id="versao-app">v0.1.0</span>
      <span class="spacer"></span>
      <span class="status" id="status-topo">● carregando...</span>
    </div>
    <div class="main">
      <aside class="sidebar">
        <ul class="nav">
          <li><a href="#" data-rota="hoje" class="ativa">Hoje</a></li>
          <li><a href="#" data-rota="inbox">Caixa de entrada</a></li>
          <li><a href="#" data-rota="tarefas">Tarefas</a></li>
          <li><a href="#" data-rota="projetos">Projetos</a></li>
          <li><a href="#" data-rota="clientes">Clientes</a></li>
          <li><a href="#" data-rota="areas">Áreas</a></li>
          <li><a href="#" data-rota="busca">Buscar</a></li>
          <li><a href="#" data-rota="config">Configurações</a></li>
        </ul>
      </aside>
      <main class="conteudo" id="conteudo-principal">
        <div class="card">
          <h2>Hoje, ${formatarHoje()}</h2>
          <div id="hoje-buckets">Carregando...</div>
        </div>
      </main>
    </div>
  `;

  // Liga cliques do menu
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });

  // Carrega dados
  const r = await api('tarefas:listar', { limite: 200 });
  if (!r.ok) {
    document.getElementById('hoje-buckets').innerHTML = '<p class="vazia">Não foi possível carregar tarefas: ' + escapeHtml(JSON.stringify(r.erro)) + '</p>';
    return;
  }
  const tarefas = r.dados;
  document.getElementById('status-topo').textContent = '● ' + tarefas.length + ' tarefas';
  document.getElementById('hoje-buckets').innerHTML = renderBuckets(tarefas);
}

function renderBuckets(tarefas) {
  const agora = new Date();
  const buckets = {
    atrasadas: [],
    criticas:  [],
    hoje:     [],
    andamento:[],
    bloqueadas:[],
    aguardando:[],
  };
  for (const t of tarefas) {
    if (t.status === 'CONCLUIDA' || t.status === 'CANCELADA' || t.status === 'ARQUIVADA') continue;
    if (t.prioridade === 'CRITICA' || t.nivel_cobranca === 'CRITICA') buckets.criticas.push(t);
    if (t.status === 'BLOQUEADA') { buckets.bloqueadas.push(t); continue; }
    if (t.status === 'AGUARDANDO_TERCEIRO') { buckets.aguardando.push(t); continue; }
    if (t.vencimento_em) {
      const venc = new Date(t.vencimento_em);
      const diffMs = venc - agora;
      if (diffMs < 0) buckets.atrasadas.push(t);
      else if (diffMs < 24*3600*1000) buckets.hoje.push(t);
    }
    if (t.status === 'EM_ANDAMENTO') buckets.andamento.push(t);
  }

  let html = '';
  const secao = (titulo, lista, vazia) => {
    if (lista.length === 0) return '';
    return `<h3 style="margin:16px 0 8px; color: var(--cor-marca);">${titulo} (${lista.length})</h3>
            <ul class="lista">${lista.map(renderLinha).join('')}</ul>`;
  };
  html += secao('🔴 Atrasadas', buckets.atrasadas);
  html += secao('⚠️  Críticas',  buckets.criticas);
  html += secao('📅 Vencendo hoje', buckets.hoje);
  html += secao('▶ Em andamento', buckets.andamento);
  html += secao('⏸ Bloqueadas',  buckets.bloqueadas);
  html += secao('⌛ Aguardando terceiros', buckets.aguardando);
  if (tarefas.length === 0) {
    html = '<p class="vazia">Nenhuma tarefa ainda. Crie uma pela Caixa de entrada.</p>';
  } else if (html === '') {
    html = '<p class="vazia">Nada urgente agora. Bom momento para revisar pendências antigas.</p>';
  }
  return html;
}

function renderLinha(t) {
  const venc = t.vencimento_em ? formatarVencimento(t.vencimento_em) : '—';
  return `
    <li>
      <span class="pill prioridade-${t.prioridade}">${t.prioridade}</span>
      <span class="pill status-${t.status}">${t.status}</span>
      <span class="titulo">${escapeHtml(t.titulo)}</span>
      <span style="color: var(--fg-3); font-size: 12px;">${venc}</span>
    </li>
  `;
}

function formatarHoje() {
  const d = new Date();
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
}

function formatarVencimento(iso) {
  const d = new Date(iso);
  const agora = new Date();
  const diffMs = d - agora;
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 0) {
    const atrasadoH = -diffH;
    if (atrasadoH < 1) return 'há ' + Math.floor(-diffMs/60000) + 'min';
    if (atrasadoH < 24) return 'há ' + atrasadoH + 'h';
    return 'há ' + Math.floor(atrasadoH/24) + 'd';
  }
  if (diffH < 1) return 'em ' + Math.floor(diffMs/60000) + 'min';
  if (diffH < 24) return 'em ' + diffH + 'h';
  return 'em ' + Math.floor(diffH/24) + 'd';
}
