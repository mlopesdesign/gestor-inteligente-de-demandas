// src/js/telas/inbox.js — Caixa de entrada (PROJETO §10.1)
// api() vem de window.api (exportado pelo app.js); não importar (evita ciclo).
import { escapeHtml, modal, toast } from '../backend/ambiente.js';

export async function renderInbox() {
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    <div class="topbar">
      <span class="brand">Gestor</span>
      <span class="brand-sub">v0.1.0</span>
      <span class="spacer"></span>
      <span class="status">● Caixa de entrada</span>
    </div>
    <div class="main">
      <aside class="sidebar">${menuLateral('inbox')}</aside>
      <main class="conteudo">
        <div class="card">
          <h2>Caixa de entrada</h2>
          <p style="color: var(--fg-3); margin-bottom: 12px;">
            Capture uma tarefa em segundos. Você organiza depois.
          </p>
          <form id="inbox-form" style="display: flex; gap: 8px;">
            <input type="text" id="inbox-texto" placeholder="Ex: 'Ligar para João amanhã 14h'" style="flex: 1;">
            <button type="submit" class="primary">Capturar</button>
          </form>
        </div>
        <div class="card" id="inbox-lista-card">
          <h2>Tarefas na caixa (últimas 20)</h2>
          <div id="inbox-lista">Carregando...</div>
        </div>
      </main>
    </div>
  `;
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });

  document.getElementById('inbox-form').onsubmit = async (e) => {
    e.preventDefault();
    const texto = document.getElementById('inbox-texto').value.trim();
    if (!texto) return;
    const r = await window.api('tarefas:criar', { titulo: texto, origem: 'MANUAL' });
    if (r.ok) {
      toast({ tipo: 'sucesso', titulo: 'Capturada', corpo: 'Tarefa criada.' });
      document.getElementById('inbox-texto').value = '';
      carregar();
    }
  };

  carregar();
  async function carregar() {
    const r = await window.api('tarefas:listar', { status: 'CAIXA_ENTRADA', limite: 20 });
    const el = document.getElementById('inbox-lista');
    if (!r.ok) { el.innerHTML = '<p class="vazia">Erro: ' + escapeHtml(JSON.stringify(r.erro)) + '</p>'; return; }
    if (r.dados.length === 0) {
      el.innerHTML = '<p class="vazia">Caixa vazia. Digite algo acima e clique Capturar.</p>';
      return;
    }
    el.innerHTML = '<ul class="lista">' + r.dados.map(t => `
      <li>
        <span class="pill prioridade-${t.prioridade}">${t.prioridade}</span>
        <span class="titulo">${escapeHtml(t.titulo)}</span>
        <button data-id="${escapeAttr(t.id)}" data-v="${t.versao}" data-acao="concluir">✓ Concluir</button>
        <button data-id="${escapeAttr(t.id)}" data-v="${t.versao}" data-acao="organizar">Organizar</button>
      </li>`).join('') + '</ul>';

    el.querySelectorAll('button[data-acao]').forEach(btn => {
      btn.onclick = async () => {
        const id = btn.dataset.id, v = Number(btn.dataset.v), ac = btn.dataset.acao;
        if (ac === 'concluir') {
          const r2 = await window.api('tarefas:concluir', { id, versao: v });
          if (r2.ok) { toast({ tipo: 'sucesso', titulo: 'Concluída' }); carregar(); }
        } else {
          const r2 = await modal({
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
              { nome: 'vencimento_em', tipo: 'text', placeholder: '2026-12-31T18:00:00Z' },
            ],
            acoes: [
              { texto: 'Cancelar', valor: 'cancelar' },
              { texto: 'Salvar', valor: 'salvar', principal: true },
            ],
          });
          if (r2.acao === 'salvar') {
            const r3 = await window.api('tarefas:atualizar', { id, versao: v, ...r2.dados });
            if (r3.ok) { toast({ tipo: 'sucesso', titulo: 'Atualizada' }); carregar(); }
          }
        }
      };
    });
  }
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

function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
