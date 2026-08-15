// src/js/telas/stubs.js — placeholders das telas ainda em construção
import { escapeHtml } from '../backend/ambiente.js';

const EM_CONSTRUCAO = [
  { rota: 'tarefas',  titulo: 'Tarefas',         msg: 'A lista completa de tarefas está em construção. Por enquanto use a Caixa de entrada + Hoje.' },
  { rota: 'projetos', titulo: 'Projetos',        msg: 'Cadastro de projetos será a próxima sprint.' },
  { rota: 'clientes', titulo: 'Clientes',        msg: 'Cadastro de clientes está em construção.' },
  { rota: 'areas',    titulo: 'Áreas',           msg: 'CRUD de áreas: em construção.' },
  { rota: 'busca',    titulo: 'Buscar',          msg: 'Busca global: em construção.' },
  { rota: 'config',   titulo: 'Configurações',   msg: 'Tela de configurações em construção.' },
];

export async function renderStub(rota) {
  const def = EM_CONSTRUCAO.find(x => x.rota === rota);
  if (!def) return;
  const main = document.getElementById('app');
  if (!main) return;
  main.innerHTML = `
    <div class="topbar">
      <span class="brand">Gestor</span>
      <span class="brand-sub">v0.1.0</span>
      <span class="spacer"></span>
      <span class="status">● ${escapeHtml(def.titulo)}</span>
    </div>
    <div class="main">
      <aside class="sidebar">${menuLateral(rota)}</aside>
      <main class="conteudo">
        <div class="card">
          <h2>${escapeHtml(def.titulo)}</h2>
          <p class="vazia">${escapeHtml(def.msg)}</p>
          <p class="vazia" style="margin-top: 12px;">O fluxo crítico (Hoje + Caixa de entrada + Auth) está funcional.</p>
        </div>
      </main>
    </div>
  `;
  main.querySelectorAll('.sidebar a[data-rota]').forEach(a => {
    a.onclick = (e) => { e.preventDefault(); window.irPara(a.dataset.rota); };
  });
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
